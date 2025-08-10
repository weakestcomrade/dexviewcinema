import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json({ message: "Payment reference is required" }, { status: 400 })
    }

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.json({ message: "Payment verification failed" }, { status: 400 })
    }

    // Find payment record in database
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (!paymentRecord) {
      return NextResponse.json({ message: "Payment record not found" }, { status: 404 })
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

    // Verify amount matches
    const paidAmount = paystackResponse.data.amount / 100 // Convert from kobo
    if (paidAmount !== paymentRecord.totalAmount) {
      return NextResponse.json({ message: "Payment amount mismatch" }, { status: 400 })
    }

    // Create booking record
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.customerEmail,
      customerPhone: paymentRecord.customerPhone,
      eventId: paymentRecord.eventId,
      eventTitle: "", // Will be populated from event
      eventType: "", // Will be populated from event
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

    // Get event details
    const event = await db.collection("events").findOne({ _id: paymentRecord.eventId })
    if (event) {
      bookingData.eventTitle = event.title
      bookingData.eventType = event.event_type
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

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking confirmed",
      data: {
        bookingId: bookingResult.insertedId.toString(),
        reference: reference,
        amount: paidAmount,
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
