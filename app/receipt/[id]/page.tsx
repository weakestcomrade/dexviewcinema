"use client"

import { useState, useEffect, useCallback } from "react"
import { notFound, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Download,
  Printer,
  Share2,
  CheckCircle,
  Ticket,
  Home,
  Loader2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface Booking {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[]
  seatType: string
  amount: number
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string
  bookingTime: string
  paymentMethod: string
  bookingCode?: string
  createdAt: string
  updatedAt: string
}

interface EventDetails {
  _id: string
  title: string
  event_type: "movie" | "match"
  event_date: string
  event_time: string
  hall_id: string
  description?: string
  duration?: string
}

interface HallDetails {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

interface FullBookingDetails extends Booking {
  eventDetails?: EventDetails
  hallDetails?: HallDetails
}

// iOS detection function
const isIOS = () => {
  if (typeof window === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<FullBookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const bookingId = params.id

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const bookingRes = await fetch(`/api/bookings/${bookingId}`)
      if (!bookingRes.ok) {
        if (bookingRes.status === 404) {
          notFound()
        }
        throw new Error(`Failed to fetch booking: ${bookingRes.statusText}`)
      }
      const bookingData: Booking = await bookingRes.json()

      const eventRes = await fetch(`/api/events/${bookingData.eventId}`)
      if (!eventRes.ok) {
        throw new Error(`Failed to fetch event: ${eventRes.statusText}`)
      }
      const eventData: EventDetails = await eventRes.json()

      const hallRes = await fetch(`/api/halls/${eventData.hall_id}`)
      if (!hallRes.ok) {
        throw new Error(`Failed to fetch hall: ${hallRes.statusText}`)
      }
      const hallData: HallDetails = await hallRes.json()

      setBooking({
        ...bookingData,
        eventDetails: eventData,
        hallDetails: hallData,
      })
    } catch (err) {
      console.error("Error fetching booking details:", err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchBookingDetails()
  }, [fetchBookingDetails])

  const downloadReceipt = async () => {
    if (!booking) return

    setIsDownloading(true)
    try {
      const receiptElement = document.getElementById("receipt-content")
      if (!receiptElement) {
        throw new Error("Receipt content not found")
      }

      // Configure html2canvas for better compatibility
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
      })

      if (isIOS()) {
        // For iOS devices, open PDF in new tab
        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const imgWidth = 210
        const pageHeight = 295
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        // Open PDF in new tab for iOS
        const pdfBlob = pdf.output("blob")
        const pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, "_blank")

        toast({
          title: "Receipt Opened",
          description: "Receipt opened in new tab. Use Safari's share button to save or share.",
        })
      } else {
        // For other devices, download normally
        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const imgWidth = 210
        const pageHeight = 295
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        pdf.save(`receipt-${booking.bookingCode || booking._id}.pdf`)

        toast({
          title: "Receipt Downloaded",
          description: "Your receipt has been saved to your device.",
        })
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try the print option instead.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const printReceipt = () => {
    window.print()
  }

  const shareReceipt = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking Receipt - ${booking?.eventTitle}`,
          text: `My booking receipt for ${booking?.eventTitle}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link Copied",
          description: "Receipt link copied to clipboard.",
        })
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Copied",
        description: "Receipt link copied to clipboard.",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading your receipt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-4">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Receipt</h1>
            <p className="text-cyber-slate-300 mb-6">{error}</p>
            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button variant="outline" onClick={() => router.back()} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg">Booking not found</p>
        </div>
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

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-16 sm:h-20">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="mr-3 sm:mr-4 text-cyber-slate-300 hover:bg-glass-white group text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Booking Receipt
              </h1>
              <p className="text-xs sm:text-sm text-brand-red-400 font-medium">Your booking confirmation</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        {/* Success Message */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyber-green-500/20 to-cyber-green-600/20 rounded-full border border-cyber-green-500/30 mb-4">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-cyber-green-400" />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-cyber-green-200 to-white bg-clip-text text-transparent mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-cyber-slate-300 text-sm sm:text-base">
            Your tickets have been successfully booked. Save this receipt for your records.
          </p>
        </div>

        {/* Action Buttons - Mobile First */}
        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          {/* Primary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={downloadReceipt}
              disabled={isDownloading}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white shadow-glow-green rounded-2xl group h-12 text-sm sm:text-base"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2 group-hover:translate-y-1 transition-transform" />
                  {isIOS() ? "Open PDF" : "Download PDF"}
                </>
              )}
            </Button>
            <Button
              onClick={printReceipt}
              variant="outline"
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl h-12 text-sm sm:text-base"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={shareReceipt}
              variant="outline"
              className="border-cyber-blue-500/50 text-cyber-blue-300 hover:bg-cyber-blue-500/20 bg-transparent backdrop-blur-sm rounded-2xl h-10 text-sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Link href="/bookings" className="block">
              <Button
                variant="outline"
                className="w-full border-cyber-purple-500/50 text-cyber-purple-300 hover:bg-cyber-purple-500/20 bg-transparent backdrop-blur-sm rounded-2xl h-10 text-sm"
              >
                <Ticket className="w-4 h-4 mr-2" />
                My Bookings
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button
                variant="outline"
                className="w-full border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-transparent backdrop-blur-sm rounded-2xl h-10 text-sm"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Receipt Card */}
        <Card className="bg-white text-black shadow-2xl border-0 rounded-3xl overflow-hidden max-w-2xl mx-auto">
          <div id="receipt-content" className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <Image
                src="/dexcinema-logo.jpeg"
                alt="Dex View Cinema Logo"
                width={120}
                height={120}
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-3 sm:mb-4 rounded-2xl"
                crossOrigin="anonymous"
              />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
              <p className="text-gray-600 text-sm sm:text-base">Premium Entertainment Experience</p>
              <div className="border-b-2 border-brand-red-600 mt-3 sm:mt-4"></div>
            </div>

            {/* Booking Code */}
            {booking.bookingCode && (
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-block bg-gradient-to-r from-brand-red-50 to-brand-red-100 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border-2 border-brand-red-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Booking Code</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-red-600 font-mono tracking-wider">
                    {booking.bookingCode}
                  </p>
                </div>
              </div>
            )}

            {/* Customer and Booking Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600 flex items-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  Customer Information
                </h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Name:</strong>
                    <span className="break-words">{booking.customerName}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Email:</strong>
                    <span className="break-all">{booking.customerEmail}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Phone:</strong>
                    <span className="break-words">{booking.customerPhone}</span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600 flex items-center">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  Booking Details
                </h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Booking ID:</strong>
                    <span className="font-mono text-xs sm:text-sm break-all">{booking._id}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Date:</strong>
                    <span>{booking.bookingDate}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Time:</strong>
                    <span>{booking.bookingTime}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Payment:</strong>
                    <span>{booking.paymentMethod}</span>
                  </p>
                  <p className="flex items-start">
                    <strong className="min-w-0 flex-shrink-0 mr-2">Status:</strong>
                    <span
                      className={`font-semibold ${
                        booking.status === "confirmed" ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="mb-6 sm:mb-8">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600 flex items-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                Event Information
              </h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl space-y-2 text-sm sm:text-base">
                <p className="flex items-start">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <strong className="mr-2">Event:</strong>
                  <span className="break-words">
                    {booking.eventTitle} ({booking.eventType === "match" ? "Sports Match" : "Movie"})
                  </span>
                </p>
                <p className="flex items-start">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <strong className="mr-2">Venue:</strong>
                  <span>{booking.hallDetails?.name || "N/A"}</span>
                </p>
                <p className="flex items-start">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <strong className="mr-2">Seats:</strong>
                  <span className="break-words">
                    {booking.seats
                      .map((seatId) => {
                        if (seatId.includes("-")) {
                          return seatId.split("-")[1]
                        }
                        return seatId
                      })
                      .join(", ")}{" "}
                    ({booking.seatType})
                  </span>
                </p>
                <p className="flex items-start">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <strong className="mr-2">Event Date:</strong>
                  <span>
                    {booking.eventDetails?.event_date
                      ? new Date(booking.eventDetails.event_date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </p>
                <p className="flex items-start">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <strong className="mr-2">Event Time:</strong>
                  <span>{booking.eventDetails?.event_time || "N/A"}</span>
                </p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t-2 border-gray-300 pt-4 sm:pt-6 mb-6 sm:mb-8">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600">Payment Summary</h3>
              <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span>₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Fee:</span>
                  <span>₦{booking.processingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg border-t border-gray-300 pt-2 sm:pt-3">
                  <span>Total Amount:</span>
                  <span>₦{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs sm:text-sm text-gray-500 border-t border-gray-300 pt-4 space-y-2">
              <p>Thank you for choosing Dex View Cinema!</p>
              <p>For support, email us at support@dexviewcinema.com or call 08139614950</p>
              <p>Developed by SydaTech - www.sydatech.com.ng</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
            color: #000 !important;
            background-color: #fff !important;
            box-shadow: none !important;
            border-color: #ccc !important;
            background-image: none !important;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          #receipt-content img {
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  )
}
