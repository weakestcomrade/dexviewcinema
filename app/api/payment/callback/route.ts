import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function POST(request: Request) {
  try {
    const { paymentReference, eventId, seats, seatType } = await request.json()

    if (!paymentReference) {
      return NextResponse.json({ message: "Payment reference is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Verify payment status
    const paymentRecord = await db.collection("payment_references").findOne({
      paymentReference: paymentReference,
    })

    if (!paymentRecord || paymentRecord.status !== "paid") {
      return NextResponse.json({ message: "Payment not verified" }, { status: 400 })
    }

    // Check if booking already exists for this payment reference
    const existingBooking = await db.collection("bookings").findOne({
      paymentReference: paymentReference,
    })

    if (existingBooking) {
      return NextResponse.json({
        success: true,
        booking: {
          ...existingBooking,
          _id: existingBooking._id.toString(),
          eventId: existingBooking.eventId.toString(),
        },
      })
    }

    // Get booking data from payment record or request
    const bookingData = {
      customerName: paymentRecord.customerName || "Unknown",
      customerEmail: paymentRecord.customerEmail,
      customerPhone: paymentRecord.customerPhone || "Unknown",
      eventId: eventId,
      eventTitle: "Event", // You might want to fetch this from the event
      eventType: "movie", // You might want to fetch this from the event
      seats: seats,
      seatType: seatType,
      amount: paymentRecord.amount - Math.round(paymentRecord.amount * 0.02),
      processingFee: Math.round(paymentRecord.amount * 0.02),
      totalAmount: paymentRecord.amount,
      status: "confirmed",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      paymentMethod: "monnify",
      paymentReference: paymentReference,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create the booking
    const result = await db.collection("bookings").insertOne({
      ...bookingData,
      eventId: new ObjectId(eventId),
    })

    if (!result.acknowledged) {
      throw new Error("Failed to create booking")
    }

    // Update event's booked seats
    await db
      .collection("events")
      .updateOne({ _id: new ObjectId(eventId) }, { $addToSet: { bookedSeats: { $each: seats } } })

    const createdBooking = {
      ...bookingData,
      _id: result.insertedId.toString(),
    }

    // Revalidate admin page
    revalidatePath("/admin")

    return NextResponse.json({
      success: true,
      booking: createdBooking,
    })
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.json({ message: "Payment callback failed", error: (error as Error).message }, { status: 500 })
  }
}
