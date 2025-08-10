"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, Home, Receipt } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function PaymentCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const reference = searchParams.get("reference")

    if (!reference) {
      setStatus("failed")
      setMessage("No payment reference found")
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
          body: JSON.stringify({ reference }),
        })

        const data = await response.json()

        if (data.status && data.data.bookingId) {
          setStatus("success")
          setBookingId(data.data.bookingId)
          setMessage("Payment successful! Your booking has been confirmed.")
          toast({
            title: "Payment Successful!",
            description: "Your booking has been confirmed.",
          })
        } else {
          setStatus("failed")
          setMessage(data.message || "Payment verification failed")
          toast({
            title: "Payment Failed",
            description: data.message || "Payment verification failed",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Payment verification error:", error)
        setStatus("failed")
        setMessage("An error occurred while verifying your payment")
        toast({
          title: "Verification Error",
          description: "An error occurred while verifying your payment",
          variant: "destructive",
        })
      }
    }

    verifyPayment()
  }, [searchParams, toast])

  const handleGoHome = () => {
    router.push("/")
  }

  const handleViewReceipt = () => {
    if (bookingId) {
      router.push(`/receipt/${bookingId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-dark via-cyber-dark-lighter to-cyber-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <CardContent className="p-8 text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-16 h-16 text-brand-red-400 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Verifying Payment</h2>
                <p className="text-cyber-slate-300">Please wait while we confirm your payment...</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-cyber-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                <p className="text-cyber-slate-300">{message}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="flex-1 bg-glass-white border-white/20 text-cyber-slate-300 hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                {bookingId && (
                  <Button
                    onClick={handleViewReceipt}
                    className="flex-1 bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                )}
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="flex justify-center">
                <XCircle className="w-16 h-16 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
                <p className="text-cyber-slate-300">{message}</p>
              </div>
              <Button
                onClick={handleGoHome}
                className="w-full bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
