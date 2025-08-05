import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const { paymentReference } = await request.json()

    if (!paymentReference) {
      return NextResponse.json({ message: "Payment reference is required" }, { status: 400 })
    }

    // Get Monnify credentials
    const apiKey = process.env.MONNIFY_PUBLIC_KEY
    const secretKey = process.env.MONNIFY_SECRET_KEY

    if (!apiKey || !secretKey) {
      return NextResponse.json({ message: "Payment service configuration error" }, { status: 500 })
    }

    // Get access token
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString("base64")

    const tokenResponse = await fetch("https://sandbox-api.monnify.com/api/v1/auth/login", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({ message: "Payment verification failed" }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.responseBody.accessToken

    // Verify payment status
    const verifyResponse = await fetch(
      `https://sandbox-api.monnify.com/api/v2/transactions/${encodeURIComponent(paymentReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!verifyResponse.ok) {
      return NextResponse.json({ message: "Payment verification failed" }, { status: 500 })
    }

    const verifyResult = await verifyResponse.json()

    if (!verifyResult.requestSuccessful) {
      return NextResponse.json({ message: "Payment verification failed" }, { status: 400 })
    }

    const paymentStatus = verifyResult.responseBody.paymentStatus
    const transactionReference = verifyResult.responseBody.transactionReference

    // Update payment reference status in database
    const { db } = await connectToDatabase()
    await db.collection("payment_references").updateOne(
      { paymentReference: paymentReference },
      {
        $set: {
          status: paymentStatus.toLowerCase(),
          transactionReference: transactionReference,
          verifiedAt: new Date(),
          paymentData: verifyResult.responseBody,
        },
      },
    )

    return NextResponse.json({
      success: true,
      paymentStatus: paymentStatus,
      transactionReference: transactionReference,
      amount: verifyResult.responseBody.amountPaid,
      paidOn: verifyResult.responseBody.paidOn,
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { message: "Payment verification failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}
