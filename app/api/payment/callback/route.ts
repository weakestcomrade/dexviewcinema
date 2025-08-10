import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")
    const trxref = searchParams.get("trxref")

    const paymentReference = reference || trxref

    if (!paymentReference) {
      // Redirect to booking page with error
      return NextResponse.redirect(new URL("/bookings?error=missing_reference", request.url))
    }

    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    try {
      // Verify payment
      const verificationResponse = await paystack.verifyPayment(paymentReference)

      if (verificationResponse.status && verificationResponse.data.status === "success") {
        // Find the booking created during verification
        const booking = await db.collection("bookings").findOne({
          paymentReference: paymentReference,
        })

        if (booking) {
          // Redirect to receipt page
          return NextResponse.redirect(new URL(`/receipt/${booking._id.toString()}?payment=success`, request.url))
        } else {
          // Redirect to bookings page with success but no booking found
          return NextResponse.redirect(new URL("/bookings?payment=success&error=booking_not_found", request.url))
        }
      } else {
        // Payment failed or was not successful
        return NextResponse.redirect(new URL(`/bookings?payment=failed&reference=${paymentReference}`, request.url))
      }
    } catch (error) {
      console.error("Payment callback verification error:", error)
      return NextResponse.redirect(new URL(`/bookings?payment=error&reference=${paymentReference}`, request.url))
    }
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL("/bookings?error=callback_error", request.url))
  }
}
