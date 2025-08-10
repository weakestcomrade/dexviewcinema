import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { EmailService } from "@/lib/emailService" // Import the new EmailService

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const event = body.event
    const data = body.data

    console.log("Paystack Webhook: Received event:", event)
    console.log("Paystack Webhook: Received data:", data)

    // Verify the webhook signature (optional but recommended for production)
    // const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    // const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
    // if (hash !== request.headers.get('x-paystack-signature')) {
    //   return NextResponse.json({ message: 'Webhook signature verification failed' }, { status: 401 });
    // }

    if (event === "charge.success") {
      const reference = data.reference
      console.log(`Paystack Webhook: Charge success for reference: ${reference}`)

      // Verify the transaction with Paystack to be sure
      const verificationResult = await paystack.verifyPayment(reference)

      if (verificationResult.data.status === "success") {
        console.log(`Paystack Webhook: Payment successfully verified for reference: ${reference}`)

        // Find the pending payment record
        const paymentRecord = await db.collection("payments").findOne({ reference })

        if (!paymentRecord) {
          console.error(`Paystack Webhook: Payment record not found for reference: ${reference}`)
          return NextResponse.json({ message: "Payment record not found" }, { status: 404 })
        }

        if (paymentRecord.status === "confirmed") {
          console.log(`Paystack Webhook: Payment already confirmed for reference: ${reference}.`)
          return NextResponse.json({ message: "Payment already confirmed" }, { status: 200 })
        }

        // Update payment record status
        await db.collection("payments").updateOne(
          { reference },
          {
            $set: {
              status: "confirmed",
              paystackData: verificationResult.data,
              updatedAt: new Date(),
            },
          },
        )

        // Update event with booked seats
        const eventDoc = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
        if (!eventDoc) {
          console.error(`Paystack Webhook: Event not found for ID: ${paymentRecord.eventId}`)
          return NextResponse.json({ message: "Event not found" }, { status: 404 })
        }

        const bookedSeats = eventDoc.bookedSeats || []
        const updatedBookedSeats = [...bookedSeats, ...paymentRecord.seats]

        await db.collection("events").updateOne(
          { _id: new ObjectId(paymentRecord.eventId) },
          {
            $set: {
              bookedSeats: updatedBookedSeats,
            },
          },
        )

        // Create booking record
        const booking = {
          eventId: new ObjectId(paymentRecord.eventId),
          customerName: paymentRecord.customerName,
          email: paymentRecord.email,
          phone: paymentRecord.customerPhone || null,
          seats: paymentRecord.seats,
          seatType: paymentRecord.seatType,
          amount: paymentRecord.amount,
          reference: paymentRecord.reference,
          status: "confirmed",
          createdAt: paymentRecord.createdAt,
          updatedAt: new Date(),
        }

        const bookingResult = await db.collection("bookings").insertOne(booking)

        // Update payment record with bookingId
        await db.collection("payments").updateOne(
          { reference },
          {
            $set: {
              bookingId: bookingResult.insertedId,
            },
          },
        )

        // Send confirmation email
        try {
          const emailService = new EmailService()
          await emailService.sendBookingReceipt(bookingResult.insertedId.toHexString())
        } catch (emailError) {
          console.error("Paystack Webhook: Failed to send booking receipt email:", emailError)
          // Log the error but don't block the webhook response
        }

        return NextResponse.json({ message: "Payment and booking confirmed successfully" }, { status: 200 })
      } else {
        console.log(`Paystack Webhook: Payment verification failed for reference: ${reference}`)
        // Update payment record status to failed if it was pending
        await db.collection("payments").updateOne(
          { reference, status: "pending" },
          {
            $set: {
              status: "failed",
              paystackData: verificationResult.data,
              updatedAt: new Date(),
            },
          },
        )
        return NextResponse.json({ message: "Payment verification failed" }, { status: 200 }) // Respond 200 to Paystack
      }
    } else {
      console.log(`Paystack Webhook: Unhandled event type: ${event}`)
      return NextResponse.json({ message: "Event received, but not handled" }, { status: 200 })
    }
  } catch (error) {
    console.error("Paystack Webhook: Error processing webhook:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
