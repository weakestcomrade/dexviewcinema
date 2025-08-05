import { NextResponse } from "next/server"

// Make this route dynamic
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const paymentReference = url.searchParams.get("paymentReference")
    const transactionReference = url.searchParams.get("transactionReference")

    if (!paymentReference) {
      return NextResponse.redirect(new URL("/payment/failed?error=missing-reference", url.origin))
    }

    // Verify payment status
    const verifyResponse = await fetch(`${url.origin}/api/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentReference }),
    })

    const verifyResult = await verifyResponse.json()

    if (verifyResult.success && verifyResult.verified && verifyResult.paymentStatus === "PAID") {
      // Payment successful, redirect to success page
      return NextResponse.redirect(new URL(`/payment/success?paymentReference=${paymentReference}`, url.origin))
    } else {
      // Payment failed or pending
      return NextResponse.redirect(
        new URL(
          `/payment/failed?paymentReference=${paymentReference}&status=${verifyResult.paymentStatus || "unknown"}`,
          url.origin,
        ),
      )
    }
  } catch (error) {
    console.error("Payment callback error:", error)
    const url = new URL(request.url)
    return NextResponse.redirect(new URL("/payment/failed?error=callback-error", url.origin))
  }
}
