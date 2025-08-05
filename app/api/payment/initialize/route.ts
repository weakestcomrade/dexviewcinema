import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, customerName, customerEmail, paymentReference, redirectUrl } = body

    // Monnify API endpoint for payment initialization
    const monnifyUrl = "https://sandbox.monnify.com/api/v1/merchant/transactions/init-transaction"

    // Get access token first
    const authResponse = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${process.env.MONNIFY_PUBLIC_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64")}`,
      },
    })

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with Monnify")
    }

    const authData = await authResponse.json()
    const accessToken = authData.responseBody.accessToken

    // Initialize payment
    const paymentData = {
      amount: Number.parseFloat(amount),
      currencyCode: "NGN",
      contractCode: process.env.MONNIFY_PUBLIC_KEY,
      customerName,
      customerEmail,
      paymentReference,
      paymentDescription: "Cinema Ticket Booking",
      redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    }

    const response = await fetch(monnifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      throw new Error("Failed to initialize payment")
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      checkoutUrl: result.responseBody.checkoutUrl,
      paymentReference: result.responseBody.transactionReference,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize payment" }, { status: 500 })
  }
}
