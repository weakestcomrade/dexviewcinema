import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { paymentReference } = await request.json()

    if (!paymentReference) {
      return NextResponse.json({ success: false, error: "Payment reference is required" }, { status: 400 })
    }

    // Validate required environment variables
    const apiKey = process.env.MONNIFY_PUBLIC_KEY
    const secretKey = process.env.MONNIFY_SECRET_KEY

    if (!apiKey || !secretKey) {
      return NextResponse.json({ success: false, error: "Payment service configuration error" }, { status: 500 })
    }

    // Get access token
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString("base64")

    const tokenResponse = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to authenticate" }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.requestSuccessful || !tokenData.responseBody?.accessToken) {
      return NextResponse.json({ success: false, error: "Failed to get access token" }, { status: 500 })
    }

    const accessToken = tokenData.responseBody.accessToken

    // Verify payment status
    const verifyResponse = await fetch(
      `https://sandbox.monnify.com/api/v2/transactions/${encodeURIComponent(paymentReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!verifyResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to verify payment" }, { status: 500 })
    }

    const verifyResult = await verifyResponse.json()

    if (!verifyResult.requestSuccessful) {
      return NextResponse.json({ success: false, error: verifyResult.responseMessage }, { status: 400 })
    }

    const transaction = verifyResult.responseBody
    const isPaid = transaction.paymentStatus === "PAID"

    return NextResponse.json({
      success: true,
      verified: isPaid,
      paymentStatus: transaction.paymentStatus,
      transactionReference: transaction.transactionReference,
      amountPaid: transaction.amountPaid,
      paidOn: transaction.paidOn,
      paymentMethod: transaction.paymentMethod,
      paymentDescription: transaction.paymentDescription,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
