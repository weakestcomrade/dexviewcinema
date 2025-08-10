import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import crypto from "crypto"
import { ObjectId } from "mongodb"
import { sendBookingReceiptEmail } from "@/lib/emailService" // Import the new email service

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-paystack-signature")

    if (!signature) {
      console.error("Webhook: No signature provided.")
      return NextResponse.json({ message: "No signature provided" }, { status: 400 })
    }

    // Verify webhook signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY!
    const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex")

    if (hash !== signature) {
      console.error("Webhook: Invalid signature.")
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
        console.log(`Webhook: Unhandled transfer.success event for reference: ${event.data.reference}`)
        break

      case "transfer.failed":
        console.log(`Webhook: Unhandled transfer.failed event for reference: ${event.data.reference}`)
        break

      default:
        console.log(`Webhook: Unhandled event type: ${event.event}`)
    }

    return NextResponse.json({ message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ message: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const { reference, amount, customer } = data
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
        eventTitle: "", // Will be populated from eventDoc
        eventType: "", // Will be populated from eventDoc
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

      // Get event details to populate eventTitle and eventType for the booking and email
      const eventDoc = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
      if (eventDoc) {
        bookingData.eventTitle = eventDoc.title
        bookingData.eventType = eventDoc.event_type
      } else {
        console.warn(`Webhook: Event not found for ID ${paymentRecord.eventId}.`)
      }

      // Insert booking
      const bookingResult = await db.collection("bookings").insertOne(bookingData)

      // Create the complete booking object for email
      const createdBooking = {
        ...bookingData,
        _id: bookingResult.insertedId.toString(),
        eventId: paymentRecord.eventId, // Ensure eventId is string for email service
      }

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
        { _id: new ObjectId(paymentRecord.eventId) },
        {
          $addToSet: {
            bookedSeats: { $each: paymentRecord.seats },
          },
        },
      )

      // --- Send email automatically after successful booking using the new service ---
      await sendBookingReceiptEmail(createdBooking)
      // --- End email sending logic ---
    } else {
      console.log(
        `Webhook: Payment record for reference ${reference} already confirmed or not found. Skipping booking creation/email.`,
      )
    }

    // Log successful payment
    console.log(`Webhook: Payment successful: ${reference} - ₦${amount / 100}`)
  } catch (error) {
    console.error("Webhook: Error handling charge success:", error)
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
    console.log(`Webhook: Payment failed: ${reference} - ₦${amount / 100}`)
  } catch (error) {
    console.error("Webhook: Error handling charge failed:", error)
  }
}
