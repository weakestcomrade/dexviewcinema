import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, customerName, customerEmail, customerPhone, paymentReference, eventId, seats, seatType } = body

    console.log("Payment initialization request:", {
      amount,
      customerName,
      customerEmail,
      paymentReference,
    })

    // Validate required environment variables
    const apiKey = process.env.MONNIFY_PUBLIC_KEY
    const secretKey = process.env.MONNIFY_SECRET_KEY
    const contractCode = process.env.MONNIFY_CONTRACT_CODE

    if (!apiKey || !secretKey || !contractCode) {
      console.error("Missing Monnify credentials")
      return NextResponse.json({ success: false, error: "Payment service configuration error" }, { status: 500 })
    }

    console.log("Using Monnify credentials:", { apiKey: apiKey.substring(0, 10) + "..." })

    // Get access token from Monnify
    console.log("Requesting access token from Monnify...")
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString("base64")

    const tokenResponse = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      console.error("Failed to get access token:", tokenResponse.status, tokenResponse.statusText)
      return NextResponse.json(
        { success: false, error: "Failed to authenticate with payment service" },
        { status: 500 },
      )
    }

    const tokenData = await tokenResponse.json()
    console.log("Token response:", tokenData)

    if (!tokenData.requestSuccessful || !tokenData.responseBody?.accessToken) {
      console.error("Invalid token response:", tokenData)
      return NextResponse.json({ success: false, error: "Failed to get payment service token" }, { status: 500 })
    }

    const accessToken = tokenData.responseBody.accessToken

    // Initialize payment with Monnify
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dexviewcinema.vercel.app"
    const redirectUrl = `${baseUrl}/api/payment/callback?paymentReference=${paymentReference}`

    const paymentData = {
      amount,
      customerName,
      customerEmail,
      customerPhoneNumber: customerPhone || "+234 801 234 5678",
      paymentReference,
      paymentDescription: `Booking for ${eventId} - Seats: ${seats.join(", ")}`,
      currencyCode: "NGN",
      contractCode,
      redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    }

    console.log("Initializing payment with data:", paymentData)

    const paymentResponse = await fetch("https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    console.log("Payment response status:", paymentResponse.status)

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error("Failed to initialize payment:", paymentResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: `Failed to initialize payment: ${paymentResponse.status} ${errorText}` },
        { status: 500 },
      )
    }

    const paymentResult = await paymentResponse.json()
    console.log("Payment result:", paymentResult)

    if (!paymentResult.requestSuccessful) {
      console.error("Payment initialization failed:", paymentResult)
      return NextResponse.json(
        { success: false, error: paymentResult.responseMessage || "Payment initialization failed" },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: paymentResult.responseBody.checkoutUrl,
      paymentReference: paymentResult.responseBody.paymentReference,
      transactionReference: paymentResult.responseBody.transactionReference,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
