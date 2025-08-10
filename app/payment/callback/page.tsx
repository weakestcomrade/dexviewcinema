"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function PaymentCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("")
  const [bookingId, setBookingId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const reference = searchParams.get("reference")
    const trxref = searchParams.get("trxref")
    const paymentRef = reference || trxref

    if (!paymentRef) {
      setStatus("failed")
      setMessage("Payment reference not found")
      return
    }

    // Verify payment
    const verifyPayment = async () => {
      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference: paymentRef }),
        })

        const data = await response.json()

        if (response.ok && data.status) {
          setStatus("success")
          setMessage("Payment successful! Your booking has been confirmed.")
          setBookingId(data.data.bookingId)

          // Redirect to receipt after 3 seconds
          setTimeout(() => {
            router.push(`/receipt/${data.data.bookingId}`)
          }, 3000)
        } else {
          setStatus("failed")
          setMessage(data.message || "Payment verification failed")
        }
      } catch (error) {
        setStatus("failed")
        setMessage("An error occurred while verifying your payment")
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <CardHeader className="text-center">
          <CardTitle className="text-white flex items-center justify-center gap-3 text-xl font-bold">
            {status === "loading" && <Loader2 className="w-6 h-6 text-brand-red-400 animate-spin" />}
            {status === "success" && <CheckCircle className="w-6 h-6 text-green-400" />}
            {status === "failed" && <XCircle className="w-6 h-6 text-red-400" />}

            {status === "loading" && "Processing Payment"}
            {status === "success" && "Payment Successful"}
            {status === "failed" && "Payment Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-cyber-slate-300 text-lg">{message}</p>

          {status === "success" && bookingId && (
            <div className="space-y-4">
              <div className="bg-glass-white p-4 rounded-2xl border border-green-500/30">
                <p className="text-green-300 font-semibold">Booking ID: {bookingId}</p>
                <p className="text-cyber-slate-300 text-sm mt-2">Redirecting to your receipt in 3 seconds...</p>
              </div>
              <Link href={`/receipt/${bookingId}`}>
                <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                  View Receipt
                </Button>
              </Link>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-4">
              <div className="bg-glass-white p-4 rounded-2xl border border-red-500/30">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 font-semibold">What to do next:</p>
                <ul className="text-cyber-slate-300 text-sm mt-2 space-y-1">
                  <li>• Check your bank statement</li>
                  <li>• Contact support if charged</li>
                  <li>• Try booking again</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full bg-glass-white border-white/20 text-cyber-slate-300">
                    Go Home
                  </Button>
                </Link>
                <Button
                  onClick={() => router.back()}
                  className="flex-1 bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="bg-glass-white p-4 rounded-2xl border border-white/10">
              <p className="text-cyber-slate-300 text-sm">Please wait while we verify your payment...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
