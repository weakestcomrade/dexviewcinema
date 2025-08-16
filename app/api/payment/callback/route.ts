import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")

    if (!reference) {
      return NextResponse.redirect(new URL("/payment/failed?error=missing-reference", request.url))
    }

    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.redirect(new URL(`/payment/failed?reference=${reference}`, request.url))
    }

    // Find payment record
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (!paymentRecord) {
      return NextResponse.redirect(
        new URL(`/payment/failed?reference=${reference}&error=record-not-found`, request.url),
      )
    }

    // Check if already processed
    if (paymentRecord.status === "confirmed") {
      const booking = await db.collection("bookings").findOne({ paymentReference: reference })
      if (booking) {
        return NextResponse.redirect(new URL(`/receipt/${booking._id}`, request.url))
      }
    }

    // Process the payment (similar to verify endpoint)
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.customerEmail,
      customerPhone: paymentRecord.customerPhone,
      eventId: paymentRecord.eventId,
      eventTitle: "",
      eventType: "",
      seats: paymentRecord.seats,
      seatType: paymentRecord.seatType,
      amount: paymentRecord.amount,
      processingFee: paymentRecord.processingFee,
      totalAmount: paymentRecord.totalAmount,
      status: "confirmed",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      paymentMethod: "paystack",
      paymentReference: reference,
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get event details
    const event = await db.collection("events").findOne({ _id: paymentRecord.eventId })
    if (event) {
      bookingData.eventTitle = event.title
      bookingData.eventType = event.event_type
    }

    // Insert booking
    const bookingResult = await db.collection("bookings").insertOne(bookingData)

    // Update payment status
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "confirmed",
          bookingId: bookingResult.insertedId,
          updatedAt: new Date(),
        },
      },
    )

    // Update event's booked seats
    await db.collection("events").updateOne(
      { _id: paymentRecord.eventId },
      {
        $addToSet: {
          bookedSeats: { $each: paymentRecord.seats },
        },
      },
    )

    // Redirect to receipt page
    return NextResponse.redirect(new URL(`/receipt/${bookingResult.insertedId}`, request.url))
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL(`/payment/failed?error=processing-failed`, request.url))
  }
}
