import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const { email, amount, eventId, seats, seatType, customerName, customerPhone, processingFee, totalAmount } =
      await request.json()

    // Validate required fields
    if (!email || !amount || !eventId || !seats || !customerName) {
      return NextResponse.json({ status: false, message: "Missing required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Fetch event details
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ status: false, message: "Event not found" }, { status: 404 })
    }

    const paystack = new PaystackService()
    const reference = paystack.generateReference()

    // Prepare callback URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/payment/callback?reference=${reference}`

    // Prepare metadata with all necessary booking information
    const metadata = {
      eventId,
      eventTitle: event.title,
      eventType: event.type || "movie",
      customerName,
      customerPhone,
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
      bookingDate: event.date || new Date().toISOString().split("T")[0],
      bookingTime: event.time || new Date().toLocaleTimeString(),
      reference,
    }

    console.log("Initializing payment with metadata:", metadata)

    // Store payment record
    await db.collection("payments").insertOne({
      reference,
      email,
      amount: totalAmount,
      status: "pending",
      metadata,
      createdAt: new Date(),
    })

    // Initialize payment with Paystack
    const paymentData = {
      email,
      amount: totalAmount,
      reference,
      callback_url: callbackUrl,
      metadata,
    }

    const result = await paystack.initializePayment(paymentData)

    if (!result.status) {
      throw new Error(result.message || "Payment initialization failed")
    }

    console.log("Payment initialized successfully:", {
      reference,
      authorizationUrl: result.data.authorization_url,
    })

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
