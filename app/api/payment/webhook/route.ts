import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Webhook received:", body)

    // Verify webhook signature if needed
    // const signature = request.headers.get('monnify-signature')

    const { eventType, eventData } = body

    if (eventType === "SUCCESSFUL_TRANSACTION") {
      const { paymentReference, transactionReference, amountPaid, paymentStatus, customerName, customerEmail } =
        eventData

      // Update booking status in database
      await client.connect()
      const db = client.db(process.env.MONGODB_DB)

      const result = await db.collection("bookings").updateOne(
        { paymentReference },
        {
          $set: {
            paymentStatus: "PAID",
            transactionReference,
            amountPaid,
            paidAt: new Date(),
            status: "confirmed",
          },
        },
      )

      console.log("Booking updated:", result)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  } finally {
    await client.close()
  }
}
