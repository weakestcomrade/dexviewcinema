import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { EmailService } from "@/lib/emailService" // Import the new EmailService

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference")

  if (!reference) {
    return NextResponse.json({ message: "Payment reference not found" }, { status: 400 })
  }

  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    console.log(`Payment Callback: Verifying payment for reference: ${reference}`)
    const verificationResult = await paystack.verifyPayment(reference)

    if (verificationResult.data.status === "success") {
      console.log(`Payment Callback: Payment successful for reference: ${reference}`)

      // Find the pending payment record
      const paymentRecord = await db.collection("payments").findOne({ reference })

      if (!paymentRecord) {
        console.error(`Payment Callback: Payment record not found for reference: ${reference}`)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback?status=failed&message=Payment record not found`,
        )
      }

      if (paymentRecord.status === "confirmed") {
        console.log(`Payment Callback: Payment already confirmed for reference: ${reference}. Redirecting to receipt.`)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/receipt/${paymentRecord.bookingId || "unknown"}`,
        )
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
      const event = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
      if (!event) {
        console.error(`Payment Callback: Event not found for ID: ${paymentRecord.eventId}`)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback?status=failed&message=Event not found`,
        )
      }

      const bookedSeats = event.bookedSeats || []
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
        console.error("Payment Callback: Failed to send booking receipt email:", emailError)
        // Log the error but don't block the user redirect
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/receipt/${bookingResult.insertedId.toHexString()}`,
      )
    } else {
      console.log(`Payment Callback: Payment failed or not successful for reference: ${reference}`)
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback?status=failed&message=${
          verificationResult.data.gateway_response || "Payment not successful"
        }`,
      )
    }
  } catch (error) {
    console.error("Payment Callback: Error during payment verification or booking creation:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback?status=failed&message=An unexpected error occurred`,
    )
  }
}
