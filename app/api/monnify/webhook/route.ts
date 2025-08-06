import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import { getMonnifyBasicAuthHeader, MONNIFY_BASE_URL } from "@/lib/monnify"
import { MonnifyWebhookPayload, MonnifyQueryTransactionResponse } from "@/types/monnify"

export async function POST(request: Request) {
  try {
    const payload: MonnifyWebhookPayload = await request.json()
    const { eventType, eventData } = payload

    console.log("Monnify Webhook Received:", eventType, eventData)

    // IMPORTANT: In a production environment, you should verify the webhook signature
    // Monnify sends an X-Monnify-Signature header. You would typically hash the raw payload
    // with your secret key and compare it to the signature.
    // For this example, we'll proceed without signature verification, but it's crucial for security.
    // const signature = request.headers.get("X-Monnify-Signature");
    // if (!verifyMonnifySignature(rawPayload, signature, process.env.MONNIFY_SECRET_KEY!)) {
    //   return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    // }

    if (eventType !== "TRANSACTION_STATUS_CHANGED") {
      return NextResponse.json({ message: "Event type not supported" }, { status: 200 })
    }

    const { transactionReference, paymentStatus } = eventData
    const { db } = await connectToDatabase()

    // 1. Query Monnify to verify the transaction status (recommended for security)
    const monnifyQueryRes = await fetch(
      `${MONNIFY_BASE_URL}/api/v1/merchant/transactions/query?transactionReference=${transactionReference}`,
      {
        method: "GET",
        headers: {
          Authorization: getMonnifyBasicAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    )

    if (!monnifyQueryRes.ok) {
      const errorData = await monnifyQueryRes.json()
      console.error("Monnify transaction query error:", errorData)
      return NextResponse.json({ message: "Failed to verify transaction with Monnify" }, { status: 500 })
    }

    const monnifyQueryData: MonnifyQueryTransactionResponse = await monnifyQueryRes.json()

    if (!monnifyQueryData.requestSuccessful || monnifyQueryData.responseBody.paymentStatus !== "PAID") {
      console.warn("Monnify transaction not confirmed as PAID by query:", monnifyQueryData)
      // Update booking status to failed or cancelled if Monnify doesn't confirm PAID
      await db.collection("bookings").updateOne(
        { transactionReference: transactionReference },
        { $set: { status: "failed", updatedAt: new Date(), monnifyStatus: monnifyQueryData.responseBody.paymentStatus } }
      )
      revalidatePath("/admin")
      revalidatePath("/bookings")
      return NextResponse.json({ message: "Transaction not confirmed as paid by Monnify" }, { status: 200 })
    }

    // 2. Find the pending booking in your database
    const booking = await db.collection("bookings").findOne({ transactionReference: transactionReference })

    if (!booking) {
      console.error("Booking not found for transaction reference:", transactionReference)
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    // Prevent duplicate processing for already confirmed bookings
    if (booking.status === "confirmed") {
      console.log("Booking already confirmed, skipping update:", transactionReference)
      return NextResponse.json({ message: "Booking already confirmed" }, { status: 200 })
    }

    // 3. Update booking status to confirmed
    const updateBookingResult = await db.collection("bookings").updateOne(
      { _id: booking._id },
      { $set: { status: "confirmed", updatedAt: new Date() } }
    )

    if (!updateBookingResult.acknowledged || updateBookingResult.modifiedCount === 0) {
      console.error("Failed to update booking status:", updateBookingResult)
      throw new Error("Failed to update booking status.")
    }

    // 4. Update the event's booked seats
    const eventId = booking.eventId // eventId is already ObjectId from initial pending booking
    const newBookedSeats = booking.seats // Seats from the booking

    const updateEventResult = await db.collection("events").updateOne(
      { _id: eventId },
      { $addToSet: { bookedSeats: { $each: newBookedSeats } } } // Add new seats to the array
    )

    if (!updateEventResult.acknowledged || updateEventResult.modifiedCount === 0) {
      console.error("Failed to update event booked seats:", updateEventResult)
      // Consider rolling back booking status or logging for manual review
      throw new Error("Failed to update event booked seats.")
    }

    console.log("Booking and Event updated successfully for transaction:", transactionReference)

    // Revalidate paths to reflect changes in UI
    revalidatePath("/admin")
    revalidatePath("/bookings")
    revalidatePath(`/book/${eventId.toString()}`) // Revalidate the event page to show updated seat availability

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error processing Monnify webhook:", error)
    return NextResponse.json({ message: "Failed to process webhook", error: (error as Error).message }, { status: 500 })
  }
}
