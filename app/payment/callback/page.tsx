"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("")
  const [bookingId, setBookingId] = useState("")

  useEffect(() => {
    const reference = searchParams.get("reference")

    if (!reference) {
      setStatus("failed")
      setMessage("Payment reference not found")
      return
    }

    // Verify payment
    const verifyPayment = async () => {
      try {
        console.log("Verifying payment with reference:", reference)

        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        })

        const data = await response.json()
        console.log("Payment verification response:", data)

        if (data.status) {
          setStatus("success")
          setMessage("Payment successful! Your booking has been confirmed.")
          setBookingId(data.data.bookingId)

          // Redirect to receipt page after 3 seconds
          setTimeout(() => {
            router.push(`/receipt/${data.data.bookingId}`)
          }, 3000)
        } else {
          setStatus("failed")
          setMessage(data.message || "Payment verification failed")
        }
      } catch (error) {
        console.error("Payment verification error:", error)
        setStatus("failed")
        setMessage("Failed to verify payment. Please contact support.")
      }
    }

    verifyPayment()
  }, [searchParams, router])

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleViewReceipt = () => {
    if (bookingId) {
      router.push(`/receipt/${bookingId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
              <p className="text-gray-600 mb-6">Please wait while we verify your payment...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={handleViewReceipt} className="w-full bg-green-600 hover:bg-green-700">
                  View Receipt
                </Button>
                <Button onClick={handleBackToHome} variant="outline" className="w-full bg-transparent">
                  Back to Home
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-4">You will be redirected to your receipt in a few seconds...</p>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={handleBackToHome} className="w-full bg-red-600 hover:bg-red-700">
                  Back to Home
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                If you believe this is an error, please contact our support team.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
