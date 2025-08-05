import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Webhook received:", body)

    const { eventType, eventData } = body

    if (eventType === "SUCCESSFUL_TRANSACTION") {
      const { paymentReference, transactionReference, amountPaid, paidOn, paymentMethod } = eventData

      // Connect to database
      const { db } = await connectToDatabase()

      // Update booking with payment confirmation
      const result = await db.collection("bookings").updateOne(
        { paymentReference },
        {
          $set: {
            paymentStatus: "completed",
            transactionReference,
            amountPaid,
            paidOn,
            paymentMethod,
            updatedAt: new Date(),
          },
        },
      )

      if (result.matchedCount > 0) {
        // Get the booking to update event seats
        const booking = await db.collection("bookings").findOne({ paymentReference })

        if (booking) {
          // Update event's booked seats
          await db.collection("events").updateOne(
            { _id: new ObjectId(booking.eventId) },
            {
              $addToSet: {
                bookedSeats: { $each: booking.seats },
              },
            },
          )
        }

        console.log("Booking updated successfully via webhook")
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
