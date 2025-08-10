"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, Shield, Loader2, Lock } from "lucide-react"
import { loadPaystackScript, initializePaystackPopup } from "@/lib/paystack"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingId: string) => void
  paymentData: {
    customerName: string
    customerEmail: string
    customerPhone: string
    eventId: string
    eventTitle: string
    seats: string[]
    seatType: string
    amount: number
    processingFee: number
    totalAmount: number
  }
}

export function PaymentModal({ isOpen, onClose, onSuccess, paymentData }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStep, setPaymentStep] = useState<"confirm" | "processing" | "verifying">("confirm")
  const [paystackLoaded, setPaystackLoaded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadPaystackScript()
        .then(() => setPaystackLoaded(true))
        .catch((error) => {
          console.error("Failed to load Paystack:", error)
          toast({
            title: "Payment System Error",
            description: "Failed to load payment system. Please try again.",
            variant: "destructive",
          })
        })
    }
  }, [isOpen, toast])

  const handlePayment = async () => {
    if (!paystackLoaded) {
      toast({
        title: "Payment System Loading",
        description: "Please wait for the payment system to load.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setPaymentStep("processing")

    try {
      // Prepare complete payment data
      const paymentRequestData = {
        email: paymentData.customerEmail,
        amount: paymentData.amount, // Base amount without processing fee
        eventId: paymentData.eventId,
        seats: paymentData.seats,
        seatType: paymentData.seatType,
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        processingFee: paymentData.processingFee,
        totalAmount: paymentData.totalAmount, // Total amount including processing fee
      }

      // Initialize payment with backend
      const initResponse = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRequestData),
      })

      const initData = await initResponse.json()

      if (!initResponse.ok || !initData.status) {
        throw new Error(initData.message || "Failed to initialize payment")
      }

      // Initialize Paystack popup
      initializePaystackPopup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: paymentData.customerEmail,
        amount: paymentData.totalAmount, // This will be converted to kobo in the function
        ref: initData.data.reference,
        metadata: {
          customer_name: paymentData.customerName,
          customer_phone: paymentData.customerPhone,
          event_title: paymentData.eventTitle,
          seats: paymentData.seats.join(", "),
          seat_type: paymentData.seatType,
        },
        callback: async (response) => {
          setPaymentStep("verifying")
          await handlePaymentCallback(response)
        },
        onClose: () => {
          if (paymentStep === "processing") {
            setIsProcessing(false)
            setPaymentStep("confirm")
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment process.",
              variant: "destructive",
            })
          }
        },
      })
    } catch (error) {
      console.error("Payment initialization error:", error)
      setIsProcessing(false)
      setPaymentStep("confirm")
      toast({
        title: "Payment Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handlePaymentCallback = async (response: any) => {
    try {
      // Verify payment with backend
      const verifyResponse = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference: response.reference }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.status) {
        throw new Error(verifyData.message || "Payment verification failed")
      }

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed.",
      })

      onSuccess(verifyData.data.bookingId)
    } catch (error) {
      console.error("Payment verification error:", error)
      toast({
        title: "Payment Verification Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setPaymentStep("confirm")
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      onClose()
      setPaymentStep("confirm")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3 text-xl font-bold">
            <CreditCard className="w-6 h-6 text-brand-red-400" />
            {paymentStep === "confirm" && "Confirm Payment"}
            {paymentStep === "processing" && "Processing Payment"}
            {paymentStep === "verifying" && "Verifying Payment"}
          </DialogTitle>
          <DialogDescription className="text-cyber-slate-300">
            {paymentStep === "confirm" && "Review your booking details and proceed with payment"}
            {paymentStep === "processing" && "Please complete your payment in the popup window"}
            {paymentStep === "verifying" && "Verifying your payment, please wait..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="bg-glass-white border border-white/10">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-lg">{paymentData.eventTitle}</h4>
                  <p className="text-cyber-slate-300 text-sm">{paymentData.customerName}</p>
                  <p className="text-cyber-slate-300 text-sm">{paymentData.customerEmail}</p>
                </div>
                <Badge className="bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30">
                  {paymentData.seatType}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {paymentData.seats.map((seat) => (
                    <Badge key={seat} variant="outline" className="bg-glass-white text-cyber-slate-200 border-white/20">
                      {seat}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Seats ({paymentData.seats.length})</span>
                  <span className="text-white font-semibold">₦{paymentData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Processing Fee</span>
                  <span className="text-white font-semibold">₦{paymentData.processingFee.toLocaleString()}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total Amount</span>
                  <span className="text-brand-red-300">₦{paymentData.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="bg-glass-white p-4 rounded-2xl border border-cyber-blue-500/30">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-cyber-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-white text-sm">Secure Payment</h5>
                <p className="text-cyber-slate-300 text-xs">
                  Your payment is secured by Paystack with 256-bit SSL encryption. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStep !== "confirm" && (
            <div className="bg-glass-white p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                {paymentStep === "processing" && (
                  <>
                    <Loader2 className="w-5 h-5 text-brand-red-400 animate-spin" />
                    <div>
                      <p className="font-semibold text-white text-sm">Processing Payment</p>
                      <p className="text-cyber-slate-300 text-xs">Complete payment in the popup window</p>
                    </div>
                  </>
                )}
                {paymentStep === "verifying" && (
                  <>
                    <Loader2 className="w-5 h-5 text-cyber-green-400 animate-spin" />
                    <div>
                      <p className="font-semibold text-white text-sm">Verifying Payment</p>
                      <p className="text-cyber-slate-300 text-xs">Please wait while we confirm your payment</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 bg-glass-white border-white/20 text-cyber-slate-300 hover:bg-white/10"
            >
              {isProcessing ? "Processing..." : "Cancel"}
            </Button>
            {paymentStep === "confirm" && (
              <Button
                onClick={handlePayment}
                disabled={isProcessing || !paystackLoaded}
                className="flex-1 bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red"
              >
                {!paystackLoaded ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay ₦{paymentData.totalAmount.toLocaleString()}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Payment Methods */}
          <div className="text-center">
            <p className="text-xs text-cyber-slate-400 mb-2">Accepted Payment Methods</p>
            <div className="flex justify-center gap-2 text-xs text-cyber-slate-300">
              <span>💳 Cards</span>
              <span>•</span>
              <span>🏦 Bank Transfer</span>
              <span>•</span>
              <span>📱 USSD</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
