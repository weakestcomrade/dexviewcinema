import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json({ status: false, message: "Payment reference is required" }, { status: 400 })
    }

    const paystack = new PaystackService()
    const verification = await paystack.verifyPayment(reference)

    if (!verification.status || verification.data.status !== "success") {
      return NextResponse.json({ status: false, message: "Payment verification failed" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if payment has already been processed
    const existingPayment = await db.collection("payments").findOne({ reference })
    if (existingPayment && existingPayment.status === "success") {
      return NextResponse.json({
        status: true,
        message: "Payment already processed",
        data: { bookingId: existingPayment.bookingId },
      })
    }

    // Get payment metadata
    const metadata = verification.data.metadata
    if (!metadata) {
      return NextResponse.json({ status: false, message: "Payment metadata not found" }, { status: 400 })
    }

    // Create booking data
    const bookingData = {
      customerName: metadata.customerName,
      customerEmail: verification.data.customer.email,
      customerPhone: metadata.customerPhone,
      eventId: metadata.eventId,
      eventTitle: metadata.eventTitle || "Event",
      eventType: metadata.eventType || "movie",
      seats: metadata.seats || [],
      seatType: metadata.seatType || "Standard",
      amount: metadata.amount || 0,
      processingFee: metadata.processingFee || 0,
      totalAmount: verification.data.amount / 100, // Convert from kobo
      status: "confirmed",
      bookingDate: metadata.bookingDate || new Date().toISOString().split("T")[0],
      bookingTime: metadata.bookingTime || new Date().toLocaleTimeString(),
      paymentMethod: "paystack",
      paymentReference: reference,
    }

    console.log("Creating booking with data:", bookingData)

    // Create booking by calling the booking API
    const bookingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    })

    if (!bookingResponse.ok) {
      const errorData = await bookingResponse.json()
      console.error("Failed to create booking:", errorData)
      return NextResponse.json({ status: false, message: "Failed to create booking after payment" }, { status: 500 })
    }

    const booking = await bookingResponse.json()
    console.log("Booking created successfully:", booking._id)

    // Update payment record
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "success",
          bookingId: booking._id,
          verifiedAt: new Date(),
          paystackData: verification.data,
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking created successfully",
      data: {
        bookingId: booking._id,
        reference: reference,
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { status: false, message: "Payment verification failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}
