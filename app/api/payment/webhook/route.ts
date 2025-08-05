import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("monnify-signature")

    // Verify webhook signature (optional but recommended for production)
    const secretKey = process.env.MONNIFY_SECRET_KEY
    if (secretKey && signature) {
      const expectedSignature = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature")
        return NextResponse.json({ message: "Invalid signature" }, { status: 401 })
      }
    }

    const webhookData = JSON.parse(body)
    const { paymentReference, paymentStatus, transactionReference } = webhookData

    if (!paymentReference) {
      return NextResponse.json({ message: "Invalid webhook data" }, { status: 400 })
    }

    // Update payment status in database
    const { db } = await connectToDatabase()
    await db.collection("payment_references").updateOne(
      { paymentReference: paymentReference },
      {
        $set: {
          status: paymentStatus.toLowerCase(),
          transactionReference: transactionReference,
          webhookReceivedAt: new Date(),
          webhookData: webhookData,
        },
      },
    )

    // If payment is successful, you might want to trigger additional actions here
    if (paymentStatus === "PAID") {
      console.log(`Payment confirmed for reference: ${paymentReference}`)
      // Additional logic for successful payment can be added here
    }

    return NextResponse.json({ message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ message: "Webhook processing failed" }, { status: 500 })
  }
}
