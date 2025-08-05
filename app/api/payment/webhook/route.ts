import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log webhook for debugging
    console.log("Monnify webhook received:", body)

    // Verify webhook signature if needed
    // const signature = request.headers.get('monnify-signature')

    const { transactionReference, paymentStatus, amount } = body

    if (paymentStatus === "PAID") {
      // Update booking status in database
      const { db } = await connectToDatabase()

      await db.collection("bookings").updateOne(
        { paymentReference: transactionReference },
        {
          $set: {
            status: "confirmed",
            paymentStatus: "paid",
            paidAt: new Date(),
          },
        },
      )

      console.log(`Payment confirmed for reference: ${transactionReference}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 })
  }
}
