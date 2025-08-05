import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

interface PaymentInitRequest {
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  paymentReference: string
  paymentDescription: string
  redirectUrl: string
}

export async function POST(request: Request) {
  try {
    const {
      amount,
      customerName,
      customerEmail,
      customerPhone,
      paymentReference,
      paymentDescription,
      redirectUrl,
    }: PaymentInitRequest = await request.json()

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !paymentReference) {
      return NextResponse.json({ message: "Missing required payment fields" }, { status: 400 })
    }

    // Get Monnify credentials from environment
    const apiKey = process.env.MONNIFY_PUBLIC_KEY
    const secretKey = process.env.MONNIFY_SECRET_KEY

    if (!apiKey || !secretKey) {
      console.error("Monnify credentials not found in environment variables")
      return NextResponse.json({ message: "Payment service configuration error" }, { status: 500 })
    }

    // First, get access token from Monnify
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString("base64")

    const tokenResponse = await fetch("https://sandbox-api.monnify.com/api/v1/auth/login", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    if (!tokenResponse.ok) {
      console.error("Failed to get Monnify access token:", await tokenResponse.text())
      return NextResponse.json({ message: "Payment service authentication failed" }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.responseBody.accessToken

    // Initialize payment with Monnify
    const paymentData = {
      amount: amount,
      currencyCode: "NGN",
      contractCode: apiKey, // Using public key as contract code for sandbox
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhoneNumber: customerPhone,
      paymentReference: paymentReference,
      paymentDescription: paymentDescription,
      redirectUrl: redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
      incomeSplitConfig: [],
    }

    const paymentResponse = await fetch(
      "https://sandbox-api.monnify.com/api/v1/merchant/transactions/init-transaction",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      },
    )

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error("Failed to initialize Monnify payment:", errorText)
      return NextResponse.json({ message: "Payment initialization failed" }, { status: 500 })
    }

    const paymentResult = await paymentResponse.json()

    if (!paymentResult.requestSuccessful) {
      console.error("Monnify payment initialization failed:", paymentResult)
      return NextResponse.json(
        { message: paymentResult.responseMessage || "Payment initialization failed" },
        { status: 400 },
      )
    }

    // Store payment reference in database for verification later
    const { db } = await connectToDatabase()
    await db.collection("payment_references").insertOne({
      paymentReference: paymentReference,
      amount: amount,
      customerEmail: customerEmail,
      status: "pending",
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: paymentResult.responseBody.checkoutUrl,
      paymentReference: paymentReference,
      transactionReference: paymentResult.responseBody.transactionReference,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      { message: "Payment initialization failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}
