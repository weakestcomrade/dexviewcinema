import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    if (!signature) {
      return NextResponse.json({ message: "No signature provided" }, { status: 400 })
    }

    // Verify webhook signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      console.error("Paystack secret key not configured")
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 })
    }

    const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

    if (hash !== signature) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)
    const { db } = await connectToDatabase()

    // Handle different webhook events
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(db, event.data)
        break

      case "charge.failed":
        await handleChargeFailed(db, event.data)
        break

      case "transfer.success":
        // Handle successful transfers if needed
        break

      case "transfer.failed":
        // Handle failed transfers if needed
        break

      default:
        console.log(`Unhandled webhook event: ${event.event}`)
    }

    return NextResponse.json({ message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ message: "Webhook processing failed", error: (error as Error).message }, { status: 500 })
  }
}

async function handleChargeSuccess(db: any, data: any) {
  try {
    const { reference, amount, customer, authorization } = data

    // Update payment record
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "completed",
          webhookData: data,
          updatedAt: new Date(),
        },
      },
    )

    // Log successful payment
    console.log(`Payment successful: ${reference} - ₦${amount / 100}`)
  } catch (error) {
    console.error("Error handling charge success:", error)
  }
}

async function handleChargeFailed(db: any, data: any) {
  try {
    const { reference, amount, customer } = data

    // Update payment record
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "failed",
          webhookData: data,
          updatedAt: new Date(),
        },
      },
    )

    // Log failed payment
    console.log(`Payment failed: ${reference} - ₦${amount / 100}`)
  } catch (error) {
    console.error("Error handling charge failed:", error)
  }
}
