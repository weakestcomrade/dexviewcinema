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
    const verificationResponse = await paystack.verifyPayment(reference)

    if (!verificationResponse.status) {
      return NextResponse.json({ message: "Payment verification failed" }, { status: 400 })
    }

    const paymentData = verificationResponse.data

    // Find payment record in database
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (!paymentRecord) {
      return NextResponse.json({ message: "Payment record not found" }, { status: 404 })
    }

    // Check if payment was successful
    if (paymentData.status !== "success") {
      // Update payment record with failed status
      await db.collection("payments").updateOne(
        { reference },
        {
          $set: {
            status: paymentData.status,
            paystackVerificationData: paymentData,
            updatedAt: new Date(),
          },
        },
      )

      return NextResponse.json(
        {
          message: `Payment ${paymentData.status}`,
          status: paymentData.status,
          gateway_response: paymentData.gateway_response,
        },
        { status: 400 },
      )
    }

    // Verify amount matches
    const expectedAmount = paymentRecord.totalAmount * 100 // Convert to kobo
    if (paymentData.amount !== expectedAmount) {
      return NextResponse.json({ message: "Payment amount mismatch" }, { status: 400 })
    }

    // Check if booking already exists (prevent double processing)
    const existingBooking = await db.collection("bookings").findOne({
      paymentReference: reference,
    })

    if (existingBooking) {
      return NextResponse.json({
        status: true,
        message: "Payment already processed",
        data: {
          bookingId: existingBooking._id.toString(),
          reference,
        },
      })
    }

    // Create booking record
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.customerEmail,
      customerPhone: paymentRecord.customerPhone,
      eventId: paymentRecord.eventId.toString(),
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
      paystackTransactionId: paymentData.id.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get event details to populate booking
    const event = await db.collection("events").findOne({ _id: paymentRecord.eventId })
    if (event) {
      bookingData.eventTitle = event.title
      bookingData.eventType = event.event_type
    }

    // Insert booking
    const bookingResult = await db.collection("bookings").insertOne(bookingData)

    // Update event with booked seats
    await db.collection("events").updateOne(
      { _id: paymentRecord.eventId },
      {
        $addToSet: {
          bookedSeats: { $each: paymentRecord.seats },
        },
      },
    )

    // Update payment record
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "completed",
          bookingId: bookingResult.insertedId,
          paystackVerificationData: paymentData,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking created successfully",
      data: {
        bookingId: bookingResult.insertedId.toString(),
        reference,
        transactionId: paymentData.id.toString(),
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      {
        message: "Payment verification failed",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
