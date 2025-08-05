import type { NextRequest } from "next/server"
import { redirect } from "next/navigation"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentReference = searchParams.get("paymentReference")
    const status = searchParams.get("status")

    if (!paymentReference) {
      return redirect("/payment/failed?error=missing-reference")
    }

    // Verify payment status
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentReference }),
    })

    const verifyResult = await verifyResponse.json()

    if (verifyResult.success && verifyResult.paymentStatus === "PAID") {
      // Payment successful, redirect to success page
      return redirect(`/payment/success?paymentReference=${paymentReference}`)
    } else {
      // Payment failed or pending
      return redirect(`/payment/failed?paymentReference=${paymentReference}&status=${verifyResult.paymentStatus}`)
    }
  } catch (error) {
    console.error("Payment callback error:", error)
    return redirect("/payment/failed?error=callback-error")
  }
}
