"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function PaymentCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "error">("loading")
  const [message, setMessage] = useState("")
  const [bookingId, setBookingId] = useState<string | null>(null)

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    const paymentStatus = searchParams.get("payment")
    const error = searchParams.get("error")

    if (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
      return
    }

    if (paymentStatus === "success") {
      setStatus("success")
      setMessage("Payment completed successfully!")
      return
    }

    if (paymentStatus === "failed") {
      setStatus("failed")
      setMessage("Payment was not successful. Please try again.")
      return
    }

    if (reference) {
      verifyPayment(reference)
    } else {
      setStatus("error")
      setMessage("No payment reference found.")
    }
  }, [searchParams])

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference }),
      })

      const data = await response.json()

      if (response.ok && data.status) {
        setStatus("success")
        setMessage("Payment verified successfully!")
        setBookingId(data.data.bookingId)
      } else {
        setStatus("failed")
        setMessage(data.message || "Payment verification failed.")
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      setStatus("error")
      setMessage("An error occurred while verifying your payment.")
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "missing_reference":
        return "Payment reference is missing."
      case "booking_not_found":
        return "Payment was successful but booking record was not found."
      case "callback_error":
        return "An error occurred during payment processing."
      default:
        return "An unknown error occurred."
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-brand-red-400 animate-spin" />
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case "failed":
        return <XCircle className="w-16 h-16 text-red-500" />
      case "error":
        return <AlertCircle className="w-16 h-16 text-yellow-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-400"
      case "failed":
        return "text-red-400"
      case "error":
        return "text-yellow-400"
      default:
        return "text-brand-red-400"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>
          <CardTitle className={`text-2xl font-bold ${getStatusColor()}`}>
            {status === "loading" && "Processing Payment..."}
            {status === "success" && "Payment Successful!"}
            {status === "failed" && "Payment Failed"}
            {status === "error" && "Payment Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-cyber-slate-300 text-lg">{message}</p>

          <div className="space-y-3">
            {status === "success" && bookingId && (
              <Link href={`/receipt/${bookingId}`}>
                <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                  View Receipt
                </Button>
              </Link>
            )}

            {status === "failed" && (
              <Link href="/bookings">
                <Button className="w-full bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white">
                  Try Again
                </Button>
              </Link>
            )}

            <Link href="/">
              <Button
                variant="outline"
                className="w-full bg-glass-white border-white/20 text-cyber-slate-300 hover:bg-white/10"
              >
                Back to Home
              </Button>
            </Link>
          </div>

          {status === "loading" && (
            <p className="text-sm text-cyber-slate-400">Please wait while we process your payment...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
