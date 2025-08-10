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
    const secretKey = process.env.PAYSTACK_SECRET_KEY!
    const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 })
    }

    const event = JSON.parse(body)

    // Handle different webhook events
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data)
        break

      case "charge.failed":
        await handleChargeFailed(event.data)
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
    return NextResponse.json({ message: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const { reference, amount, customer, authorization } = data
    const { db } = await connectToDatabase()

    // Find payment record
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (paymentRecord && paymentRecord.status !== "confirmed") {
      // Process the payment similar to callback/verify
      const bookingData = {
        customerName: paymentRecord.customerName,
        customerEmail: paymentRecord.customerEmail,
        customerPhone: paymentRecord.customerPhone,
        eventId: paymentRecord.eventId,
        eventTitle: "",
        eventType: "",
        seats: paymentRecord.seats,
        seatType: paymentRecord.seatType,
        amount: paymentRecord.amount,
        processingFee: paymentRecord.processingFee,
        totalAmount: paymentRecord.totalAmount,
        status: "confirmed",
        bookingDate: new Date().toISOString().split("T")[0],
        bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
        paymentMethod: "paystack",
        paymentReference: reference,
        paystackData: data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Get event details
      const eventDoc = await db.collection("events").findOne({ _id: paymentRecord.eventId })
      if (eventDoc) {
        bookingData.eventTitle = eventDoc.title
        bookingData.eventType = eventDoc.event_type
      }

      // Insert booking
      const bookingResult = await db.collection("bookings").insertOne(bookingData)

      // Update payment status
      await db.collection("payments").updateOne(
        { reference },
        {
          $set: {
            status: "confirmed",
            bookingId: bookingResult.insertedId,
            updatedAt: new Date(),
          },
        },
      )

      // Update event's booked seats
      await db.collection("events").updateOne(
        { _id: paymentRecord.eventId },
        {
          $addToSet: {
            bookedSeats: { $each: paymentRecord.seats },
          },
        },
      )
    }

    // Log successful payment
    console.log(`Payment successful: ${reference} - ₦${amount / 100}`)
  } catch (error) {
    console.error("Error handling charge success:", error)
  }
}

async function handleChargeFailed(data: any) {
  try {
    const { reference, amount, customer } = data
    const { db } = await connectToDatabase()

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
