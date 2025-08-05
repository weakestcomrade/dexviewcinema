import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentReference } = body

    if (!paymentReference) {
      return NextResponse.json({ success: false, error: "Payment reference is required" }, { status: 400 })
    }

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

    // Verify payment
    const verifyUrl = `https://sandbox.monnify.com/api/v2/transactions/${encodeURIComponent(paymentReference)}`

    const response = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to verify payment")
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      paymentStatus: result.responseBody.paymentStatus,
      transactionReference: result.responseBody.transactionReference,
      amount: result.responseBody.amount,
      customerEmail: result.responseBody.customer.email,
      customerName: result.responseBody.customer.name,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ success: false, error: "Failed to verify payment" }, { status: 500 })
  }
}
