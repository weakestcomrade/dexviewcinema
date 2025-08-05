import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentReference } = body

    if (!paymentReference) {
      return NextResponse.json({ success: false, error: "Payment reference is required" }, { status: 400 })
    }

    const monnifyApiKey = process.env.MONNIFY_PUBLIC_KEY
    const monnifySecretKey = process.env.MONNIFY_SECRET_KEY

    if (!monnifyApiKey || !monnifySecretKey) {
      return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 })
    }

    const monnifyBaseUrl = "https://sandbox.monnify.com"

    // Get access token
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

    // Verify payment
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

    if (verifyResult.requestSuccessful) {
      const paymentStatus = verifyResult.responseBody.paymentStatus
      const transactionReference = verifyResult.responseBody.transactionReference
      const amountPaid = verifyResult.responseBody.amountPaid

      return NextResponse.json({
        success: true,
        paymentStatus,
        transactionReference,
        amountPaid,
        paymentData: verifyResult.responseBody,
      })
    } else {
      throw new Error(verifyResult.responseMessage || "Payment verification failed")
    }
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
