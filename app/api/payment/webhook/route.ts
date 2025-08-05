import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Webhook received:", body)

    // Verify webhook signature if needed (recommended for production)
    // const signature = request.headers.get('monnify-signature')

    const {
      eventType,
      eventData: {
        transactionReference,
        paymentReference,
        amountPaid,
        totalPayable,
        settlementAmount,
        paidOn,
        paymentStatus,
        paymentDescription,
        currency,
        paymentMethod,
        customer,
      },
    } = body

    if (eventType === "SUCCESSFUL_TRANSACTION" && paymentStatus === "PAID") {
      // Connect to MongoDB
      await client.connect()
      const db = client.db(process.env.MONGODB_DB)

      // Update booking status in database
      const bookingsCollection = db.collection("bookings")

      const updateResult = await bookingsCollection.updateOne(
        { paymentReference: paymentReference },
        {
          $set: {
            paymentStatus: "completed",
            transactionReference: transactionReference,
            amountPaid: amountPaid,
            paidOn: paidOn,
            paymentMethod: paymentMethod,
            updatedAt: new Date(),
          },
        },
      )

      console.log("Booking updated:", updateResult)

      // You can also update the event's booked seats here
      if (updateResult.matchedCount > 0) {
        // Get the booking details
        const booking = await bookingsCollection.findOne({ paymentReference: paymentReference })

        if (booking) {
          // Update the event's booked seats
          const eventsCollection = db.collection("events")
          await eventsCollection.updateOne(
            { _id: booking.eventId },
            {
              $addToSet: {
                bookedSeats: { $each: booking.seats },
              },
            },
          )
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 },
    )
  } finally {
    await client.close()
  }
}
