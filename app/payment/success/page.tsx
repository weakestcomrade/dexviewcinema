"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Home, Calendar, Clock, MapPin, CreditCard, User, Mail, Phone } from "lucide-react"
import Link from "next/link"

// Make this page dynamic
export const dynamic = "force-dynamic"

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
  transactionReference?: string
  paymentMethod: string
  paymentStatus: string
  bookingDate: string
  bookingTime: string
  amountPaid?: number
  paidOn?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentReference = searchParams.get("paymentReference")

  useEffect(() => {
    if (!paymentReference) {
      setError("Payment reference not found")
      setLoading(false)
      return
    }

    const verifyPaymentAndGetBooking = async () => {
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

        if (verifyResult.paymentStatus !== "PAID") {
          throw new Error("Payment not confirmed")
        }

        // Get booking details
        const bookingResponse = await fetch(`/api/bookings?paymentReference=${paymentReference}`)
        const bookingResult = await bookingResponse.json()

        if (!bookingResult.success || !bookingResult.bookings || bookingResult.bookings.length === 0) {
          throw new Error("Booking not found")
        }

        const booking = bookingResult.bookings[0]

        // Merge payment verification data with booking data
        const completeBookingDetails: BookingDetails = {
          ...booking,
          transactionReference: verifyResult.transactionReference,
          amountPaid: verifyResult.amountPaid,
          paidOn: verifyResult.paidOn,
          paymentStatus: verifyResult.paymentStatus,
        }

        setBookingDetails(completeBookingDetails)
      } catch (err) {
        console.error("Error verifying payment or getting booking:", err)
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    verifyPaymentAndGetBooking()
  }, [paymentReference])

  const downloadReceipt = () => {
    if (!bookingDetails) return

    const receiptContent = `
DEXVIEW CINEMA - BOOKING RECEIPT
================================

Booking ID: ${bookingDetails._id}
Payment Reference: ${bookingDetails.paymentReference}
Transaction Reference: ${bookingDetails.transactionReference || "N/A"}

CUSTOMER INFORMATION
--------------------
Name: ${bookingDetails.customerName}
Email: ${bookingDetails.customerEmail}
Phone: ${bookingDetails.customerPhone}

EVENT DETAILS
-------------
Event: ${bookingDetails.eventTitle}
Type: ${bookingDetails.eventType === "match" ? "Sports Match" : "Movie"}
Seats: ${bookingDetails.seats.join(", ")}
Seat Type: ${bookingDetails.seatType}

PAYMENT SUMMARY
---------------
Base Amount: ₦${bookingDetails.amount.toLocaleString()}
Processing Fee: ₦${bookingDetails.processingFee.toLocaleString()}
Total Amount: ₦${bookingDetails.totalAmount.toLocaleString()}
Amount Paid: ₦${bookingDetails.amountPaid?.toLocaleString() || bookingDetails.totalAmount.toLocaleString()}

Payment Method: ${bookingDetails.paymentMethod}
Payment Status: ${bookingDetails.paymentStatus}
Booking Date: ${bookingDetails.bookingDate}
Booking Time: ${bookingDetails.bookingTime}
${bookingDetails.paidOn ? `Paid On: ${new Date(bookingDetails.paidOn).toLocaleString()}` : ""}

Thank you for choosing DexView Cinema!
For support: support@dexviewcinema.com
Developed by SydaTech - www.sydatech.com.ng
    `

    const blob = new Blob([receiptContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `DexView-Receipt-${bookingDetails.paymentReference}.txt`
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
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Payment Verification Failed</h2>
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

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20">
          <CardContent className="p-6 text-center">
            <p className="text-white text-lg">Booking details not found</p>
            <Link href="/">
              <Button className="mt-4 bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-glow-green">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-300 to-white bg-clip-text text-transparent mb-2">
            Payment Successful!
          </h1>
          <p className="text-cyber-slate-300 text-lg">Your booking has been confirmed</p>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Customer Information */}
          <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <User className="w-5 h-5 text-brand-red-400" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-cyber-slate-400" />
                <span className="text-cyber-slate-300">{bookingDetails.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-cyber-slate-400" />
                <span className="text-cyber-slate-300">{bookingDetails.customerEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-cyber-slate-400" />
                <span className="text-cyber-slate-300">{bookingDetails.customerPhone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Event Information */}
          <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Calendar className="w-5 h-5 text-brand-red-400" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{bookingDetails.eventTitle}</h3>
                <Badge className="mt-1 bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                  {bookingDetails.eventType === "match" ? "Sports Match" : "Movie"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-cyber-slate-400" />
                <span className="text-cyber-slate-300">{bookingDetails.bookingDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-cyber-slate-400" />
                <span className="text-cyber-slate-300">{bookingDetails.bookingTime}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seat Information */}
        <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <MapPin className="w-5 h-5 text-brand-red-400" />
              Seat Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-cyber-slate-400 text-sm mb-2">Selected Seats</p>
                <div className="flex flex-wrap gap-2">
                  {bookingDetails.seats.map((seat) => (
                    <Badge
                      key={seat}
                      variant="outline"
                      className="bg-brand-red-500/20 text-brand-red-300 border-brand-red-300/50"
                    >
                      {seat}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-cyber-slate-400 text-sm mb-2">Seat Type</p>
                <p className="text-white font-semibold">{bookingDetails.seatType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-brand-red-400" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Base Amount:</span>
                  <span className="text-white">₦{bookingDetails.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Processing Fee:</span>
                  <span className="text-white">₦{bookingDetails.processingFee.toLocaleString()}</span>
                </div>
                <Separator className="bg-white/20" />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-green-400">₦{bookingDetails.totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Payment Reference:</span>
                  <span className="text-white text-sm">{bookingDetails.paymentReference}</span>
                </div>
                {bookingDetails.transactionReference && (
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-400">Transaction Reference:</span>
                    <span className="text-white text-sm">{bookingDetails.transactionReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Payment Method:</span>
                  <span className="text-white capitalize">{bookingDetails.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Status:</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                    {bookingDetails.paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={downloadReceipt}
            className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 hover:from-cyber-blue-600 hover:to-cyber-blue-700 text-white shadow-glow-blue"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
          <Link href="/">
            <Button className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
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
