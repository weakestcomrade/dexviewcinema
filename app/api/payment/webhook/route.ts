import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Log webhook data for debugging
    console.log("Monnify Webhook received:", body)

    // Verify webhook signature if needed
    // const signature = request.headers.get('monnify-signature')
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const { eventType, eventData } = body

    if (eventType === "SUCCESSFUL_TRANSACTION") {
      const { paymentReference, transactionReference, amountPaid, paymentStatus } = eventData

      if (paymentStatus === "PAID") {
        // Update booking status in database
        const { db } = await connectToDatabase()

        await db.collection("bookings").updateOne(
          { paymentReference: paymentReference },
          {
            $set: {
              status: "confirmed",
              transactionReference: transactionReference,
              amountPaid: amountPaid,
              paymentCompletedAt: new Date(),
            },
          },
        )

        console.log(`Payment confirmed for reference: ${paymentReference}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
