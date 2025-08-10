"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, Shield, Loader2, Lock, ExternalLink } from "lucide-react"
import { redirectToPaystack } from "@/lib/paystack"

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
  const { toast } = useToast()

  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      // Prepare complete payment data
      const paymentRequestData = {
        email: paymentData.customerEmail,
        amount: paymentData.amount,
        eventId: paymentData.eventId,
        seats: paymentData.seats,
        seatType: paymentData.seatType,
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        processingFee: paymentData.processingFee,
        totalAmount: paymentData.totalAmount,
      }

      console.log("Initializing payment with data:", paymentRequestData)

      // Initialize payment with backend
      const initResponse = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRequestData),
      })

      const initData = await initResponse.json()
      console.log("Payment initialization response:", initData)

      if (!initResponse.ok || !initData.status) {
        throw new Error(initData.message || "Failed to initialize payment")
      }

      // Redirect to Paystack payment page
      if (initData.data.authorization_url) {
        console.log("Redirecting to Paystack:", initData.data.authorization_url)
        redirectToPaystack(initData.data.authorization_url)
      } else {
        throw new Error("No authorization URL received from Paystack")
      }
    } catch (error) {
      console.error("Payment initialization error:", error)
      setIsProcessing(false)
      toast({
        title: "Payment Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3 text-xl font-bold">
            <CreditCard className="w-6 h-6 text-brand-red-400" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription className="text-cyber-slate-300">
            Review your booking details and proceed with secure payment
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
                  You'll be redirected to Paystack's secure payment page. Your payment is protected with 256-bit SSL
                  encryption.
                </p>
              </div>
            </div>
          </div>

          {/* Redirect Notice */}
          <div className="bg-glass-white p-4 rounded-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-cyber-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-white text-sm">Payment Process</h5>
                <p className="text-cyber-slate-300 text-xs">
                  After clicking "Pay Now", you'll be redirected to Paystack to complete your payment. You'll return
                  here once payment is complete.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 bg-glass-white border-white/20 text-cyber-slate-300 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ₦{paymentData.totalAmount.toLocaleString()}
                </>
              )}
            </Button>
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
