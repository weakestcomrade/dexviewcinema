"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function PaymentSuccessContent() {
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const paymentReference = searchParams.get("paymentReference")

  useEffect(() => {
    if (!paymentReference) {
      setError("No payment reference found")
      setLoading(false)
      return
    }

    verifyPayment()
  }, [paymentReference])

  const verifyPayment = async () => {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentReference }),
      })

      if (!response.ok) {
        throw new Error("Payment verification failed")
      }

      const result = await response.json()

      if (result.success && result.paymentStatus === "PAID") {
        setPaymentDetails(result)

        // Get booking data from localStorage
        const bookingDataStr = localStorage.getItem(`booking_${paymentReference}`)
        if (bookingDataStr) {
          const bookingData = JSON.parse(bookingDataStr)

          // Complete the booking
          const callbackResponse = await fetch("/api/payment/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              paymentReference,
              bookingData,
            }),
          })

          if (callbackResponse.ok) {
            // Clear localStorage
            localStorage.removeItem(`booking_${paymentReference}`)
          }
        }
      } else {
        setError("Payment was not successful")
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Verifying payment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">Your booking has been confirmed successfully.</p>

            {paymentDetails && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span>₦{paymentDetails.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Reference:</span>
                  <span className="text-sm">{paymentDetails.transactionReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className="text-green-600 font-medium">PAID</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push("/bookings")} className="flex-1">
                View Bookings
              </Button>
              <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
                Return Home
              </Button>
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
