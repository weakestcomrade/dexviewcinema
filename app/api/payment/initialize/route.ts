import { type NextRequest, NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, amount, eventId, seats, seatType, customerName, customerPhone, processingFee, totalAmount } = body

    // Validate required fields
    if (!email || !amount || !eventId || !seats || !customerName) {
      return NextResponse.json({ status: false, message: "Missing required fields" }, { status: 400 })
    }

    const paystack = new PaystackService()
    const reference = paystack.generateReference()

    // Create callback URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/payment/callback?reference=${reference}`

    // Initialize payment with Paystack
    const paymentData = await paystack.initializePayment({
      email,
      amount: totalAmount, // Use total amount including processing fee
      reference,
      callback_url: callbackUrl,
      metadata: {
        eventId,
        seats: seats.join(","),
        seatType,
        customerName,
        customerPhone,
        processingFee,
        baseAmount: amount,
      },
    })

    // Store payment record in database
    const { db } = await connectToDatabase()
    await db.collection("payments").insertOne({
      reference,
      email,
      amount: totalAmount,
      baseAmount: amount,
      processingFee,
      eventId,
      seats,
      seatType,
      customerName,
      customerPhone,
      status: "pending",
      createdAt: new Date(),
      paystackData: paymentData.data,
    })

    return NextResponse.json({
      status: true,
      message: "Payment initialized successfully",
      data: paymentData.data,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json({ status: false, message: (error as Error).message }, { status: 500 })
  }
}
