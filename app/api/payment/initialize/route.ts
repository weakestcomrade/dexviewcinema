import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, customerName, customerEmail, customerPhone, paymentReference, paymentDescription, redirectUrl } =
      body

    console.log("Payment initialization request:", { amount, customerName, customerEmail, paymentReference })

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !paymentReference) {
      console.error("Missing required fields:", { amount, customerName, customerEmail, paymentReference })
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Check if environment variables are set
    const monnifyApiKey = process.env.MONNIFY_PUBLIC_KEY
    const monnifySecretKey = process.env.MONNIFY_SECRET_KEY

    if (!monnifyApiKey || !monnifySecretKey) {
      console.error("Monnify credentials not configured")
      return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 })
    }

    console.log("Using Monnify credentials:", { apiKey: monnifyApiKey?.substring(0, 10) + "..." })

    // Monnify API configuration
    const monnifyBaseUrl = "https://sandbox.monnify.com" // Use production URL for live

    // Get access token from Monnify
    const authString = Buffer.from(`${monnifyApiKey}:${monnifySecretKey}`).toString("base64")

    console.log("Requesting access token from Monnify...")

    const tokenResponse = await fetch(`${monnifyBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Failed to get access token:", errorText)
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log("Token response:", tokenData)

    if (!tokenData.requestSuccessful || !tokenData.responseBody?.accessToken) {
      console.error("Invalid token response:", tokenData)
      throw new Error("Failed to get valid access token")
    }

    const accessToken = tokenData.responseBody.accessToken

    // Initialize payment with Monnify
    // Note: For sandbox, we'll use a default contract code. In production, you need your actual contract code
    const contractCode = process.env.MONNIFY_CONTRACT_CODE || monnifyApiKey // Fallback to API key if contract code not set

    const paymentData = {
      amount: Number(amount),
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhoneNumber: customerPhone || "",
      paymentReference: paymentReference,
      paymentDescription: paymentDescription || `Payment for ${customerName}`,
      currencyCode: "NGN",
      contractCode: contractCode,
      redirectUrl: redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
      incomeSplitConfig: [], // Required field for some Monnify accounts
    }

    console.log("Initializing payment with data:", {
      ...paymentData,
      contractCode: contractCode?.substring(0, 10) + "...",
    })

    const paymentResponse = await fetch(`${monnifyBaseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    })

    console.log("Payment response status:", paymentResponse.status)

    const paymentResult = await paymentResponse.json()
    console.log("Payment result:", paymentResult)

    if (!paymentResponse.ok) {
      console.error("Failed to initialize payment:", paymentResult)

      // Handle specific Monnify errors
      if (paymentResult.responseMessage === "Could not find specified contract") {
        return NextResponse.json(
          {
            success: false,
            error: "Payment gateway configuration error. Please contact support.",
            details: "Invalid contract code",
          },
          { status: 422 },
        )
      }

      throw new Error(`Failed to initialize payment: ${paymentResponse.status} ${JSON.stringify(paymentResult)}`)
    }

    if (paymentResult.requestSuccessful && paymentResult.responseBody?.checkoutUrl) {
      return NextResponse.json({
        success: true,
        checkoutUrl: paymentResult.responseBody.checkoutUrl,
        paymentReference: paymentReference,
        transactionReference: paymentResult.responseBody.transactionReference,
      })
    } else {
      console.error("Payment initialization failed:", paymentResult)
      throw new Error(paymentResult.responseMessage || "Payment initialization failed")
    }
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize payment",
      },
      { status: 500 },
    )
  }
}
