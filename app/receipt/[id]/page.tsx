"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, XCircle, CalendarIcon, Clock, MapPin, Ticket, Home, Share, Printer } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface Booking {
  _id: string
  bookingCode?: string
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
  createdAt: string
  updatedAt: string
}

interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string
  event_time: string
  hall_id: string
  status: "active" | "draft" | "cancelled"
  image_url?: string
  description?: string
  duration?: string
}

interface Hall {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

export default function ReceiptPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [hall, setHall] = useState<Hall | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  const isIOS = () => {
    if (typeof window === "undefined") return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      /iPhone|iPad|iPod|Mac/.test(navigator.platform)
    )
  }

  const formatTo12Hour = (time: string) => {
    if (!time) return time

    // Handle different time formats
    const timeStr = time.trim()

    // If already in 12-hour format, return as is
    if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
      return timeStr
    }

    // Parse 24-hour format (HH:MM or H:MM)
    const timeParts = timeStr.split(":")
    if (timeParts.length !== 2) return time

    let hours = Number.parseInt(timeParts[0])
    const minutes = timeParts[1]

    if (isNaN(hours)) return time

    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12

    return `${hours}:${minutes} ${ampm}`
  }

  useEffect(() => {
    const fetchBookingAndHall = async () => {
      if (!id) return
      try {
        setLoading(true)
        setError(null)

        const bookingRes = await fetch(`/api/bookings/${id}`)
        if (!bookingRes.ok) {
          throw new Error(`Failed to fetch booking: ${bookingRes.statusText}`)
        }
        const bookingData: Booking = await bookingRes.json()
        setBooking(bookingData)

        if (bookingData.eventId) {
          const eventRes = await fetch(`/api/events/${bookingData.eventId}`)
          if (!eventRes.ok) {
            throw new Error(`Failed to fetch event for hall: ${eventRes.statusText}`)
          }
          const eventData = await eventRes.json()
          setEvent(eventData)

          const hallRes = await fetch(`/api/halls/${eventData.hall_id}`)
          if (!hallRes.ok) {
            throw new Error(`Failed to fetch hall: ${hallRes.statusText}`)
          }
          const hallData: Hall = await hallRes.json()
          setHall(hallData)
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError((err as Error).message)
        toast({
          title: "Error loading receipt",
          description: (err as Error).message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBookingAndHall()
  }, [id, toast])

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const element = document.getElementById("receipt-print-area") as HTMLElement | null
      if (!element) {
        toast({
          title: "Error",
          description: "Receipt content not found. Please refresh and try again.",
          variant: "destructive",
        })
        return
      }

      // Show loading toast
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare your receipt.",
      })

      console.log("[v0] Starting PDF generation, iOS detected:", isIOS())

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        allowTaint: true,
        foreignObjectRendering: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      })

      console.log("[v0] Canvas generated successfully")

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      const fileName = `dex-view-cinema-${booking?.bookingCode || booking?._id || "receipt"}.pdf`

      console.log("[v0] PDF created, handling download for iOS:", isIOS())

      if (isIOS()) {
        // For iOS, convert to blob and open in new tab
        const pdfBlob = pdf.output("blob")
        const pdfUrl = URL.createObjectURL(pdfBlob)

        // Open in new tab - this works reliably on iOS
        const newWindow = window.open(pdfUrl, "_blank")

        if (newWindow) {
          toast({
            title: "PDF Ready!",
            description: "Your receipt opened in a new tab. Use the share button in Safari to save or share it.",
            duration: 6000,
          })
        } else {
          // If popup blocked, show instructions
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site, then try again. Or use the Print option instead.",
            variant: "destructive",
            duration: 8000,
          })
        }

        // Clean up after 10 seconds
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl)
        }, 10000)
      } else {
        // Standard download for non-iOS devices
        try {
          pdf.save(fileName)
          console.log("[v0] Standard download completed")

          toast({
            title: "Download Complete!",
            description: "Your receipt has been downloaded successfully.",
          })
        } catch (downloadError) {
          console.error("[v0] Standard download failed:", downloadError)

          // Fallback for non-iOS devices
          const pdfBlob = pdf.output("blob")
          const pdfUrl = URL.createObjectURL(pdfBlob)
          const link = document.createElement("a")
          link.href = pdfUrl
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)

          toast({
            title: "Download Started",
            description: "Your receipt download has been initiated.",
          })
        }
      }
    } catch (err) {
      console.error("[v0] PDF generation failed:", err)
      toast({
        title: "Download Failed",
        description: "There was an error generating your receipt. Please try the print option or refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
      console.log("[v0] Download process completed")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dex View Cinema Receipt - ${booking?.bookingCode || booking?._id}`,
          text: `My booking receipt for ${booking?.eventTitle}`,
          url: window.location.href,
        })
      } catch (err) {
        console.log("Error sharing:", err)
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link Copied!",
          description: "Receipt link has been copied to your clipboard.",
        })
      } catch (err) {
        toast({
          title: "Share",
          description: "Copy this URL to share your receipt: " + window.location.href,
        })
      }
    }
  }

  const seatsFormatted = booking?.seats
    .map((seatId) => (seatId.includes("-") ? seatId.split("-")[1] : seatId))
    .join(", ")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p className="text-lg">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4">
        <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-brand-red-500 mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center">Error Loading Receipt</h1>
        <p className="text-base sm:text-lg text-cyber-slate-300 text-center mb-6 max-w-md">{error}</p>
        <Button
          onClick={() => window.history.back()}
          className="bg-brand-red-500 hover:bg-brand-red-600 text-white rounded-2xl px-6 py-3"
        >
          Go Back
        </Button>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4">
        <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-brand-red-500 mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center">Booking Not Found</h1>
        <p className="text-base sm:text-lg text-cyber-slate-300 text-center mb-6 max-w-md">
          The requested booking could not be found.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="bg-brand-red-500 hover:bg-brand-red-600 text-white rounded-2xl px-6 py-3"
        >
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-2 sm:p-4 lg:p-8">
      <Card className="w-full max-w-4xl bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-2xl sm:rounded-4xl print:shadow-none print:border-none print:bg-white print:text-black">
        <CardHeader className="text-center pb-4 sm:pb-6 print:hidden px-4 sm:px-6">
          <CardTitle className="text-white text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent mb-2">
            Booking Receipt
          </CardTitle>
          <CardDescription className="text-cyber-slate-300 text-base sm:text-lg">
            Your booking details are confirmed!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 lg:p-8">
          <div
            className="receipt-content bg-white text-black p-4 sm:p-6 lg:p-8 rounded-lg shadow-md print:shadow-none print:p-0 print:rounded-none"
            id="receipt-print-area"
          >
            <div className="text-center mb-6">
              <Image
                src="/dexcinema-logo.jpeg"
                alt="Dex View Cinema Logo"
                width={120}
                height={120}
                className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32"
                crossOrigin="anonymous"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
              <p className="text-sm sm:text-base text-gray-600">Premium Entertainment Experience</p>
              <div className="border-b-2 border-brand-red-600 mt-4"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6">
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600">Customer Information</h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <p className="break-words">
                    <strong>Name:</strong> {booking.customerName}
                  </p>
                  <p className="break-all">
                    <strong>Email:</strong> {booking.customerEmail}
                  </p>
                  <p>
                    <strong>Phone:</strong> {booking.customerPhone}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600">Booking Details</h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <p className="break-all">
                    <strong>Booking Code:</strong> {booking.bookingCode || booking._id}
                  </p>
                  <p>
                    <strong>Date:</strong> {booking.bookingDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {formatTo12Hour(booking.bookingTime)}
                  </p>
                  <p>
                    <strong>Payment:</strong> {booking.paymentMethod}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`font-semibold ${booking.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600">Event Information</h3>
              <div className="space-y-3 text-sm sm:text-base">
                <p className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    <strong>Event:</strong> {booking.eventTitle} (
                    {booking.eventType === "match" ? "Sports Match" : "Movie"})
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Venue:</strong> {hall?.name || "N/A"}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    <strong>Seats:</strong> {seatsFormatted} ({booking.seatType})
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Event Date:</strong>{" "}
                    {event?.event_date
                      ? new Date(event.event_date).toLocaleDateString()
                      : new Date(booking.bookingDate).toLocaleDateString()}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Event Time:</strong> {formatTo12Hour(event?.event_time || booking.bookingTime)}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t-2 border-gray-300 pt-4 mb-6">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-brand-red-600">Payment Summary</h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span className="font-semibold">₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs sm:text-sm text-gray-500 border-t border-gray-300 pt-4">
              <p className="mb-1">Thank you for choosing Dex View Cinema!</p>
              <p className="mb-2">For support, email us at support@dexviewcinema.com or call 08139614950</p>
              <p>Developed by SydaTech - www.sydatech.com.ng</p>
            </div>
          </div>

          {/* Mobile-first button layout */}
          <div className="mt-6 sm:mt-8 print:hidden">
            {/* Primary actions - full width on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-glow-green disabled:opacity-50 h-12 text-sm sm:text-base font-semibold"
                aria-label="Download Receipt"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isDownloading ? "Generating..." : isIOS() ? "Save PDF" : "Download PDF"}
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card h-12 text-sm sm:text-base font-semibold"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>

            {/* Secondary actions - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card h-11 text-sm font-medium"
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Link href="/bookings" className="block">
                <Button
                  variant="outline"
                  className="w-full border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card h-11 text-sm font-medium"
                >
                  My Bookings
                </Button>
              </Link>

              <Link href="/" className="block">
                <Button
                  variant="outline"
                  className="w-full border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card h-11 text-sm font-medium"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
            color: #000 !important;
            background-color: #fff !important;
            box-shadow: none !important;
            border-color: #ccc !important;
            background-image: none !important;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          #receipt-print-area img {
            display: block !important;
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        
        /* Mobile-specific improvements */
        @media (max-width: 640px) {
          .receipt-content {
            font-size: 14px;
          }
          .receipt-content h1 {
            font-size: 24px;
          }
          .receipt-content h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}
