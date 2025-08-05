import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, customerName, customerEmail, customerPhone, paymentReference, paymentDescription, redirectUrl } =
      body

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !paymentReference) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Monnify API configuration
    const monnifyApiKey = process.env.MONNIFY_PUBLIC_KEY
    const monnifySecretKey = process.env.MONNIFY_SECRET_KEY
    const monnifyBaseUrl = "https://sandbox.monnify.com" // Use production URL for live

    if (!monnifyApiKey || !monnifySecretKey) {
      return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 })
    }

    // Get access token from Monnify
    const authString = Buffer.from(`${monnifyApiKey}:${monnifySecretKey}`).toString("base64")

    const tokenResponse = await fetch(`${monnifyBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token")
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.responseBody.accessToken

    // Initialize payment with Monnify
    const paymentData = {
      amount: amount,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhoneNumber: customerPhone || "",
      paymentReference: paymentReference,
      paymentDescription: paymentDescription || `Payment for ${customerName}`,
      currencyCode: "NGN",
      contractCode: monnifyApiKey, // Use your contract code
      redirectUrl: redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    }

    const paymentResponse = await fetch(`${monnifyBaseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    if (!paymentResponse.ok) {
      throw new Error("Failed to initialize payment")
    }

    const paymentResult = await paymentResponse.json()

    if (paymentResult.requestSuccessful) {
      return NextResponse.json({
        success: true,
        checkoutUrl: paymentResult.responseBody.checkoutUrl,
        paymentReference: paymentReference,
      })
    } else {
      throw new Error(paymentResult.responseMessage || "Payment initialization failed")
    }
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
