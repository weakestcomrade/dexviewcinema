import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        {
          status: false,
          message: "Payment reference is required",
        },
        { status: 400 },
      )
    }

    console.log("Verifying payment with reference:", reference)

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)
    console.log("Paystack verification response:", paystackResponse)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.json(
        {
          status: false,
          message: "Payment verification failed with Paystack",
        },
        { status: 400 },
      )
    }

    // Find payment record in database
    const paymentRecord = await db.collection("payments").findOne({ reference })
    console.log("Payment record from database:", paymentRecord)

    if (!paymentRecord) {
      return NextResponse.json(
        {
          status: false,
          message: "Payment record not found in database",
        },
        { status: 404 },
      )
    }

    // Check if payment is already processed
    if (paymentRecord.status === "confirmed") {
      const existingBooking = await db.collection("bookings").findOne({ paymentReference: reference })
      if (existingBooking) {
        return NextResponse.json({
          status: true,
          message: "Payment already processed",
          data: { bookingId: existingBooking._id.toString() },
        })
      }
    }

    // Convert Paystack amount from kobo to naira
    const paidAmountInNaira = paystackResponse.data.amount / 100
    console.log("Amount comparison:", {
      paidAmount: paidAmountInNaira,
      expectedAmount: paymentRecord.amount,
      paymentRecordAmount: paymentRecord.amount,
    })

    // Verify amount matches (use the total amount stored in payment record)
    if (Math.abs(paidAmountInNaira - paymentRecord.amount) > 0.01) {
      // Allow for small floating point differences
      console.error("Amount mismatch:", {
        paid: paidAmountInNaira,
        expected: paymentRecord.amount,
        difference: Math.abs(paidAmountInNaira - paymentRecord.amount),
      })
      return NextResponse.json(
        {
          status: false,
          message: `Payment amount mismatch. Paid: ₦${paidAmountInNaira}, Expected: ₦${paymentRecord.amount}`,
        },
        { status: 400 },
      )
    }

    // Get event details
    const event = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
    if (!event) {
      return NextResponse.json(
        {
          status: false,
          message: "Event not found",
        },
        { status: 404 },
      )
    }

    // Create booking record
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.email,
      customerPhone: paymentRecord.customerPhone || "",
      eventId: new ObjectId(paymentRecord.eventId),
      eventTitle: event.title,
      eventType: event.event_type,
      eventDate: event.date,
      eventTime: event.time,
      seats: paymentRecord.seats,
      seatType: paymentRecord.seatType,
      amount: paymentRecord.baseAmount || paymentRecord.amount,
      processingFee: paymentRecord.processingFee || 0,
      totalAmount: paymentRecord.amount,
      status: "confirmed",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      paymentMethod: "paystack",
      paymentReference: reference,
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("Creating booking with data:", bookingData)

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
      { _id: new ObjectId(paymentRecord.eventId) },
      {
        $addToSet: {
          bookedSeats: { $each: paymentRecord.seats },
        },
      },
    )

    console.log("Payment verification successful, booking created:", bookingResult.insertedId)

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking confirmed",
      data: {
        bookingId: bookingResult.insertedId.toString(),
        reference: reference,
        amount: paidAmountInNaira,
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      {
        status: false,
        message: "Payment verification failed",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
