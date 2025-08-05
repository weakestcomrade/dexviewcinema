import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentReference, bookingData } = body

    // Verify payment first
    const verifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/payment/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentReference }),
      },
    )

    const verifyResult = await verifyResponse.json()

    if (!verifyResult.success || verifyResult.paymentStatus !== "PAID") {
      return NextResponse.json({ success: false, error: "Payment not verified" }, { status: 400 })
    }

    // Create confirmed booking
    const { db } = await connectToDatabase()

    const booking = {
      ...bookingData,
      status: "confirmed",
      paymentReference,
      paymentStatus: "paid",
      paidAt: new Date(),
      createdAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    // Update event's booked seats
    await db
      .collection("events")
      .updateOne({ _id: bookingData.eventId }, { $addToSet: { bookedSeats: { $each: bookingData.seats } } })

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
    })
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.json({ success: false, error: "Failed to process payment callback" }, { status: 500 })
  }
}
