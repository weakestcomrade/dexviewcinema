"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Home, Clock, Users, CreditCard } from "lucide-react"
import Link from "next/link"

interface BookingDetails {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventTitle: string
  eventType: string
  seats: string[]
  seatType: string
  amount: number
  processingFee: number
  totalAmount: number
  paymentReference: string
  paymentMethod: string
  paymentStatus: string
  status: string
  bookingDate: string
  bookingTime: string
  transactionReference?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentReference = searchParams.get("paymentReference")

  useEffect(() => {
    if (!paymentReference) {
      setError("Payment reference not found")
      setLoading(false)
      return
    }

    const verifyPaymentAndFetchBooking = async () => {
      try {
        // First verify the payment
        const verifyResponse = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentReference }),
        })

        const verifyResult = await verifyResponse.json()

        if (!verifyResult.success) {
          throw new Error("Payment verification failed")
        }

        // Then fetch the booking details
        const bookingResponse = await fetch(`/api/bookings?paymentReference=${paymentReference}`)
        const bookingResult = await bookingResponse.json()

        if (!bookingResult.success || !bookingResult.bookings || bookingResult.bookings.length === 0) {
          throw new Error("Booking not found")
        }

        const bookingData = bookingResult.bookings[0]

        // Update booking with payment verification data
        const updatedBooking = {
          ...bookingData,
          paymentStatus: verifyResult.paymentStatus,
          transactionReference: verifyResult.transactionReference,
          status: verifyResult.paymentStatus === "PAID" ? "confirmed" : "pending",
        }

        setBooking(updatedBooking)
      } catch (err) {
        console.error("Error:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    verifyPaymentAndFetchBooking()
  }, [paymentReference])

  const downloadReceipt = () => {
    if (!booking) return

    const receiptContent = `
DEXVIEW CINEMA - BOOKING RECEIPT
================================

Booking ID: ${booking._id}
Payment Reference: ${booking.paymentReference}
Transaction Reference: ${booking.transactionReference || "N/A"}

CUSTOMER INFORMATION
-------------------
Name: ${booking.customerName}
Email: ${booking.customerEmail}
Phone: ${booking.customerPhone}

EVENT DETAILS
------------
Event: ${booking.eventTitle}
Type: ${booking.eventType === "match" ? "Sports Match" : "Movie"}
Seats: ${booking.seats.join(", ")}
Seat Type: ${booking.seatType}

PAYMENT SUMMARY
--------------
Base Amount: ₦${booking.amount.toLocaleString()}
Processing Fee: ₦${booking.processingFee.toLocaleString()}
Total Amount: ₦${booking.totalAmount.toLocaleString()}
Payment Method: ${booking.paymentMethod}
Payment Status: ${booking.paymentStatus}

Booking Date: ${booking.bookingDate}
Booking Time: ${booking.bookingTime}

Thank you for choosing DexView Cinema!
Visit us at www.dexviewcinema.com
Developed by SydaTech - www.sydatech.com.ng
    `

    const blob = new Blob([receiptContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `DexView-Receipt-${booking.paymentReference}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Verifying payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-red-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Error</h2>
            <p className="text-cyber-slate-300 mb-4">{error}</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20">
          <CardContent className="p-6 text-center">
            <p className="text-white">Booking not found</p>
            <Link href="/">
              <Button className="mt-4 bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPaymentSuccessful = booking.paymentStatus === "PAID"

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              isPaymentSuccessful
                ? "bg-gradient-to-r from-green-500 to-green-600 shadow-glow-green"
                : "bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-glow-yellow"
            }`}
          >
            {isPaymentSuccessful ? (
              <CheckCircle className="w-10 h-10 text-white" />
            ) : (
              <Clock className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isPaymentSuccessful ? "Payment Successful!" : "Payment Processing"}
          </h1>
          <p className="text-cyber-slate-300 text-lg">
            {isPaymentSuccessful
              ? "Your booking has been confirmed successfully."
              : "Your payment is being processed. Please wait for confirmation."}
          </p>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer & Event Info */}
          <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Users className="w-5 h-5 text-brand-red-400" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-cyber-slate-200 mb-2">Customer Information</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Name:</span> {booking.customerName}
                  </p>
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Email:</span> {booking.customerEmail}
                  </p>
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Phone:</span> {booking.customerPhone}
                  </p>
                </div>
              </div>

              <Separator className="bg-white/20" />

              <div>
                <h4 className="font-semibold text-cyber-slate-200 mb-2">Event Information</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Event:</span> {booking.eventTitle}
                  </p>
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Type:</span>{" "}
                    {booking.eventType === "match" ? "Sports Match" : "Movie"}
                  </p>
                  <p className="text-cyber-slate-300">
                    <span className="font-medium">Seat Type:</span> {booking.seatType}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-cyber-slate-200 mb-2">Selected Seats</h4>
                <div className="flex flex-wrap gap-2">
                  {booking.seats.map((seat) => (
                    <Badge key={seat} className="bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30">
                      {seat}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-brand-red-400" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-cyber-slate-300">Base Amount:</span>
                  <span className="text-white font-semibold">₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cyber-slate-300">Processing Fee:</span>
                  <span className="text-white font-semibold">₦{booking.processingFee.toLocaleString()}</span>
                </div>
                <Separator className="bg-white/20" />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-brand-red-300">₦{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Payment Reference:</span>
                  <span className="text-white font-mono text-xs">{booking.paymentReference}</span>
                </div>
                {booking.transactionReference && (
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Transaction Reference:</span>
                    <span className="text-white font-mono text-xs">{booking.transactionReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Payment Status:</span>
                  <Badge
                    className={`${
                      isPaymentSuccessful
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    }`}
                  >
                    {booking.paymentStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Booking Date:</span>
                  <span className="text-white">{booking.bookingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-300">Booking Time:</span>
                  <span className="text-white">{booking.bookingTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button
            onClick={downloadReceipt}
            className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 hover:from-cyber-blue-600 hover:to-cyber-blue-700 text-white rounded-2xl px-6 py-3"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>

          <Link href="/">
            <Button className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white rounded-2xl px-6 py-3">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-cyber-slate-400 text-sm">
          <p>Thank you for choosing DexView Cinema!</p>
          <p>For support, contact us at support@dexviewcinema.com</p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
