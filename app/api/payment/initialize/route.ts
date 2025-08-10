import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const { email, amount, eventId, seats, seatType, customerName, customerPhone, processingFee, totalAmount } = body

    // Validate required fields
    if (!email || !amount || !eventId || !seats || !customerName) {
      return NextResponse.json({ message: "Missing required payment fields" }, { status: 400 })
    }

    // Verify event exists and seats are still available
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    // Check if any of the selected seats are already booked
    const bookedSeats = event.bookedSeats || []
    const conflictingSeats = seats.filter((seat: string) => bookedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json(
        { message: `Seats ${conflictingSeats.join(", ")} are no longer available` },
        { status: 409 },
      )
    }

    // Generate payment reference
    const reference = paystack.generateReference()

    // Prepare payment data
    const paymentData = {
      email,
      amount: totalAmount, // Amount in Naira (will be converted to kobo in service)
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment/callback`,
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: customerName,
          },
          {
            display_name: "Customer Phone",
            variable_name: "customer_phone",
            value: customerPhone || "",
          },
          {
            display_name: "Event ID",
            variable_name: "event_id",
            value: eventId,
          },
          {
            display_name: "Event Title",
            variable_name: "event_title",
            value: event.title,
          },
          {
            display_name: "Seats",
            variable_name: "seats",
            value: seats.join(", "),
          },
          {
            display_name: "Seat Type",
            variable_name: "seat_type",
            value: seatType,
          },
          {
            display_name: "Base Amount",
            variable_name: "base_amount",
            value: amount.toString(),
          },
          {
            display_name: "Processing Fee",
            variable_name: "processing_fee",
            value: processingFee.toString(),
          },
        ],
      },
    }

    // Initialize payment with Paystack
    const paystackResponse = await paystack.initializePayment(paymentData)

    if (!paystackResponse.status) {
      return NextResponse.json({ message: "Failed to initialize payment with Paystack" }, { status: 500 })
    }

    // Store payment record in database
    const paymentRecord = {
      reference,
      eventId: new ObjectId(eventId),
      customerEmail: email,
      customerName,
      customerPhone: customerPhone || "",
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
      status: "pending",
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("payments").insertOne(paymentRecord)

    return NextResponse.json({
      status: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: paystackResponse.data.reference,
      },
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      {
        message: "Payment initialization failed",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
