"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, XCircle } from "lucide-react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [bookingDetails, setBookingDetails] = useState<any>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const paymentReference = searchParams.get("paymentReference")

    if (!paymentReference) {
      setStatus("error")
      setError("Payment reference not found")
      return
    }

    verifyPaymentAndCreateBooking(paymentReference)
  }, [searchParams])

  const verifyPaymentAndCreateBooking = async (paymentReference: string) => {
    try {
      // Get booking data from localStorage
      const bookingDataStr = localStorage.getItem(`booking_${paymentReference}`)
      if (!bookingDataStr) {
        throw new Error("Booking data not found")
      }

      const bookingData = JSON.parse(bookingDataStr)

      // Verify payment
      const verifyResponse = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentReference }),
      })

      const verifyResult = await verifyResponse.json()

      if (!verifyResult.success || !verifyResult.verified) {
        throw new Error("Payment verification failed")
      }

      // Create confirmed booking
      const callbackResponse = await fetch("/api/payment/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentReference,
          ...bookingData,
        }),
      })

      const callbackResult = await callbackResponse.json()

      if (!callbackResult.success) {
        throw new Error("Failed to create booking")
      }

      // Clean up localStorage
      localStorage.removeItem(`booking_${paymentReference}`)

      setBookingDetails(callbackResult.booking)
      setStatus("success")
    } catch (error) {
      console.error("Payment verification error:", error)
      setStatus("error")
      setError((error as Error).message)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {bookingDetails && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Booking ID:</p>
                  <p className="text-gray-600">{bookingDetails._id}</p>
                </div>
                <div>
                  <p className="font-medium">Customer Name:</p>
                  <p className="text-gray-600">{bookingDetails.customerName}</p>
                </div>
                <div>
                  <p className="font-medium">Email:</p>
                  <p className="text-gray-600">{bookingDetails.customerEmail}</p>
                </div>
                <div>
                  <p className="font-medium">Phone:</p>
                  <p className="text-gray-600">{bookingDetails.customerPhone}</p>
                </div>
                <div>
                  <p className="font-medium">Seats:</p>
                  <p className="text-gray-600">{bookingDetails.seats.join(", ")}</p>
                </div>
                <div>
                  <p className="font-medium">Amount Paid:</p>
                  <p className="text-gray-600">₦{bookingDetails.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium">Payment Reference:</p>
                  <p className="text-gray-600">{bookingDetails.paymentReference}</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  <p className="text-green-600 font-medium">Confirmed</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center space-y-4">
            <p className="text-gray-600">A confirmation email has been sent to your email address.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push("/bookings")} variant="outline">
                View My Bookings
              </Button>
              <Button onClick={() => router.push("/")}>Return Home</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
