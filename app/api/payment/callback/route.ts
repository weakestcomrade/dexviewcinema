import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { sendBookingReceiptEmail } from "@/lib/emailService" // Import the new email service

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")

    if (!reference) {
      console.error("Payment callback: Missing reference in URL.")
      return NextResponse.redirect(new URL("/payment/failed?error=missing-reference", request.url))
    }

    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      console.error(`Payment callback: Paystack verification failed for reference ${reference}.`)
      return NextResponse.redirect(new URL(`/payment/failed?reference=${reference}`, request.url))
    }

    // Find payment record
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (!paymentRecord) {
      console.error(`Payment callback: Payment record not found for reference ${reference}.`)
      return NextResponse.redirect(
        new URL(`/payment/failed?reference=${reference}&error=record-not-found`, request.url),
      )
    }

    // Check if already processed
    if (paymentRecord.status === "confirmed") {
      const booking = await db.collection("bookings").findOne({ paymentReference: reference })
      if (booking) {
        console.log(`Payment callback: Booking already confirmed for reference ${reference}. Redirecting to receipt.`)
        return NextResponse.redirect(new URL(`/receipt/${booking._id}`, request.url))
      }
    }

    // Process the payment (similar to verify endpoint)
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
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get event details to populate eventTitle and eventType for the booking and email
    const event = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
    if (event) {
      bookingData.eventTitle = event.title
      bookingData.eventType = event.event_type
    } else {
      console.warn(`Payment callback: Event not found for ID ${paymentRecord.eventId}.`)
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

    // Redirect to receipt page
    return NextResponse.redirect(new URL(`/receipt/${bookingResult.insertedId}`, request.url))
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL(`/payment/failed?error=processing-failed`, request.url))
  }
}
