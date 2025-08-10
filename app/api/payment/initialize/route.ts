import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const {
      email,
      amount,
      eventId,
      eventTitle,
      eventType,
      seats,
      seatType,
      customerName,
      customerPhone,
      bookingDate,
      bookingTime,
      baseAmount,
      processingFee,
    } = body

    // Validate required fields
    if (!email || !amount || !eventId || !customerName) {
      return NextResponse.json({ status: false, message: "Missing required fields" }, { status: 400 })
    }

    // Generate payment reference
    const reference = paystack.generateReference()

    // Create callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/callback`

    // Prepare metadata for Paystack
    const metadata = {
      eventId,
      eventTitle,
      eventType,
      seats,
      seatType,
      customerName,
      customerPhone,
      bookingDate,
      bookingTime,
      baseAmount,
      processingFee,
      reference,
    }

    console.log("Initializing payment with metadata:", metadata)

    // Initialize payment with Paystack
    const paymentData = await paystack.initializePayment({
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata,
    })

    // Store payment record in database
    const paymentRecord = {
      reference,
      email,
      amount,
      eventId,
      eventTitle,
      eventType,
      seats,
      seatType,
      customerName,
      customerPhone,
      bookingDate,
      bookingTime,
      baseAmount,
      processingFee,
      status: "pending",
      paystackData: paymentData.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("payments").insertOne(paymentRecord)

    console.log("Payment initialized successfully:", {
      reference,
      authorizationUrl: paymentData.data.authorization_url,
    })

    return NextResponse.json({
      status: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paymentData.data.authorization_url,
        access_code: paymentData.data.access_code,
        reference,
      },
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      {
        status: false,
        message: "Payment initialization failed",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
