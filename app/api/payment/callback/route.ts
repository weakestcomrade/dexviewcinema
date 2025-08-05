import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentReference, eventId, seats, seatType, customerName, customerEmail, customerPhone, totalAmount } = body

    // Verify payment first
    const verifyResponse = await fetch(`${request.url.replace("/callback", "/verify")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentReference }),
    })

    const verifyResult = await verifyResponse.json()

    if (!verifyResult.success || !verifyResult.verified) {
      return NextResponse.json({ success: false, error: "Payment not verified" }, { status: 400 })
    }

    // Create confirmed booking
    const { db } = await connectToDatabase()

    const bookingData = {
      customerName,
      customerEmail,
      customerPhone,
      eventId,
      seats,
      seatType,
      amount: totalAmount,
      status: "confirmed",
      paymentReference,
      transactionReference: verifyResult.transactionReference,
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0],
      createdAt: new Date(),
    }

    const bookingResult = await db.collection("bookings").insertOne(bookingData)

    // Update event's booked seats
    await db
      .collection("events")
      .updateOne({ _id: new ObjectId(eventId) }, { $addToSet: { bookedSeats: { $each: seats } } })

    return NextResponse.json({
      success: true,
      booking: {
        ...bookingData,
        _id: bookingResult.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
