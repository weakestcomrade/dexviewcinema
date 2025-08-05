import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentReference } = body

    if (!paymentReference) {
      return NextResponse.json({ success: false, error: "Payment reference is required" }, { status: 400 })
    }

    // Check if environment variables are set
    const monnifyApiKey = process.env.MONNIFY_PUBLIC_KEY
    const monnifySecretKey = process.env.MONNIFY_SECRET_KEY

    if (!monnifyApiKey || !monnifySecretKey) {
      return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 })
    }

    const monnifyBaseUrl = "https://sandbox.monnify.com"

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

    // Verify payment status
    const verifyResponse = await fetch(
      `${monnifyBaseUrl}/api/v2/transactions/${encodeURIComponent(paymentReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!verifyResponse.ok) {
      throw new Error("Failed to verify payment")
    }

    const verifyResult = await verifyResponse.json()

    return NextResponse.json({
      success: true,
      paymentStatus: verifyResult.responseBody.paymentStatus,
      transactionReference: verifyResult.responseBody.transactionReference,
      paymentReference: verifyResult.responseBody.paymentReference,
      amountPaid: verifyResult.responseBody.amountPaid,
      totalPayable: verifyResult.responseBody.totalPayable,
      settlementAmount: verifyResult.responseBody.settlementAmount,
      paidOn: verifyResult.responseBody.paidOn,
      paymentMethod: verifyResult.responseBody.paymentMethod,
      currency: verifyResult.responseBody.currency,
      paymentDescription: verifyResult.responseBody.paymentDescription,
      customer: verifyResult.responseBody.customer,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify payment",
      },
      { status: 500 },
    )
  }
}
