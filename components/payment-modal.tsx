"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"

type PaymentData = {
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string
  eventTitle: string
  seats: string[]
  seatType: string
  amount: number // exact ticket total, no processing fee
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  paymentData,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingId: string) => void
  paymentData: PaymentData
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleProceed = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: paymentData.customerEmail,
          amount: paymentData.amount,
          eventId: paymentData.eventId,
          seats: paymentData.seats,
          seatType: paymentData.seatType,
          customerName: paymentData.customerName,
          customerPhone: paymentData.customerPhone,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.status) {
        throw new Error(json.message || "Failed to initialize payment")
      }

      // Redirect to Paystack authorization page
      const url = json.data.authorization_url
      window.location.href = url
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            You are about to pay ₦{paymentData.amount.toLocaleString()} for {paymentData.eventTitle}. No additional fees
            will be charged.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted/30 border p-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium">{paymentData.customerName}</span>
          </p>
          <p className="text-muted-foreground">
            Seats: <span className="font-medium text-foreground">{paymentData.seats.join(", ")}</span>
          </p>
          <p className="text-muted-foreground">
            Seat Type:{" "}
            <span className="font-medium text-foreground capitalize">{paymentData.seatType || "Standard"}</span>
          </p>
          <p className="text-muted-foreground">
            Amount: <span className="font-bold text-foreground">₦{paymentData.amount.toLocaleString()}</span>
          </p>
          <div className="flex items-center gap-2 text-emerald-600 text-xs mt-2">
            <Lock className="w-4 h-4" />
            <span>Secure checkout with Paystack</span>
          </div>
        </div>

        {error && (
          <div className="text-destructive text-sm border border-destructive/30 bg-destructive/10 rounded-md p-2">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleProceed} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Proceed to Paystack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
