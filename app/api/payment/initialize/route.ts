import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const { email, amount, eventId, seats, seatType, customerName, customerPhone } = await request.json()

    // Validate required fields
    if (
      !email ||
      typeof amount !== "number" ||
      amount <= 0 ||
      !eventId ||
      !seats ||
      seats.length === 0 ||
      !customerName
    ) {
      return NextResponse.json({ status: false, message: "Missing or invalid required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Fetch event details (for metadata completeness)
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ status: false, message: "Event not found" }, { status: 404 })
    }

    const paystack = new PaystackService()
    const reference = paystack.generateReference()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/payment/callback?reference=${reference}`

    // Metadata for verification and booking creation (no processing fee)
    const metadata = {
      eventId,
      eventTitle: event.title,
      eventType: event.event_type || event.type || "movie",
      customerName,
      customerPhone,
      seats,
      seatType,
      amount, // exact ticket total
      processingFee: 0, // always zero now
      totalAmount: amount, // kept for backward compatibility
      bookingDate: event.date || new Date().toISOString().split("T")[0],
      bookingTime: event.time || new Date().toLocaleTimeString(),
      reference,
    }

    // Store payment record
    await db.collection("payments").insertOne({
      reference,
      email,
      amount, // exact amount without fee
      status: "pending",
      metadata,
      createdAt: new Date(),
    })

    // Initialize payment with Paystack for the exact amount
    const paymentData = {
      email,
      amount, // PaystackService should handle conversion to kobo internally
      reference,
      callback_url: callbackUrl,
      metadata,
    }

    const result = await paystack.initializePayment(paymentData)

    if (!result.status) {
      throw new Error(result.message || "Payment initialization failed")
    }

    return NextResponse.json({
      status: true,
      message: "Payment initialized successfully",
      data: result.data,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      { status: false, message: "Payment initialization failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}
