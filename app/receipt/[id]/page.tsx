"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, XCircle, CalendarIcon, Clock, MapPin, Ticket } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Loader2 } from "lucide-react"

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
  createdAt: string
  updatedAt: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchBookingAndHall = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch booking details
        const bookingRes = await fetch(`/api/bookings/${id}`)
        if (!bookingRes.ok) {
          throw new Error(`Failed to fetch booking: ${bookingRes.statusText}`)
        }
        const bookingData: Booking = await bookingRes.json()
        setBooking(bookingData)

        // Fetch hall details using eventId from booking
        if (bookingData.eventId) {
          const eventRes = await fetch(`/api/events/${bookingData.eventId}`)
          if (!eventRes.ok) {
            throw new Error(`Failed to fetch event for hall: ${eventRes.statusText}`)
          }
          const eventData = await eventRes.json()

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

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading receipt...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4">
        <XCircle className="w-16 h-16 text-brand-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error Loading Receipt</h1>
        <p className="text-lg text-cyber-slate-300 text-center">{error}</p>
        <Button
          onClick={() => window.history.back()}
          className="mt-6 bg-brand-red-500 hover:bg-brand-red-600 text-white rounded-2xl"
        >
          Go Back
        </Button>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4">
        <XCircle className="w-16 h-16 text-brand-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-lg text-cyber-slate-300 text-center">The requested booking could not be found.</p>
        <Button
          onClick={() => window.history.back()}
          className="mt-6 bg-brand-red-500 hover:bg-brand-red-600 text-white rounded-2xl"
        >
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-3xl bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl print:shadow-none print:border-none print:bg-white print:text-black">
        <CardHeader className="text-center pb-6 print:hidden">
          <CardTitle className="text-white text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent mb-2">
            Booking Receipt
          </CardTitle>
          <CardDescription className="text-cyber-slate-300 text-lg">
            Your booking details are confirmed!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <div
            className="receipt-content bg-white text-black p-8 rounded-lg shadow-md print:shadow-none print:p-0 print:rounded-none"
            id="receipt-print-area"
          >
            <div className="text-center mb-6">
              <Image
                src="/dexcinema-logo.jpeg"
                alt="Dex View Cinema Logo"
                width={150}
                height={150}
                className="mx-auto mb-4"
              />
              <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
              <p className="text-gray-600">Premium Entertainment Experience</p>
              <div className="border-b-2 border-brand-red-600 mt-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Customer Information</h3>
                <p>
                  <strong>Name:</strong> {booking.customerName}
                </p>
                <p>
                  <strong>Email:</strong> {booking.customerEmail}
                </p>
                <p>
                  <strong>Phone:</strong> {booking.customerPhone}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                <p>
                  <strong>Booking ID:</strong> {booking._id}
                </p>
                <p>
                  <strong>Date:</strong> {booking.bookingDate}
                </p>
                <p>
                  <strong>Time:</strong> {booking.bookingTime}
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

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
              <p className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-brand-red-500" />
                <strong>Event:</strong> {booking.eventTitle} ({booking.eventType === "match" ? "Sports Match" : "Movie"}
                )
              </p>
              <p className="flex items-center gap-2 mt-2">
                <MapPin className="w-5 h-5 text-brand-red-500" />
                <strong>Venue:</strong> {hall?.name || "N/A"}
              </p>
              <p className="flex items-center gap-2 mt-2">
                <Ticket className="w-5 h-5 text-brand-red-500" />
                <strong>Seats:</strong> {booking.seats.join(", ")} ({booking.seatType})
              </p>
              <p className="flex items-center gap-2 mt-2">
                <CalendarIcon className="w-5 h-5 text-brand-red-500" />
                <strong>Event Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
              </p>
              <p className="flex items-center gap-2 mt-2">
                <Clock className="w-5 h-5 text-brand-red-500" />
                <strong>Event Time:</strong> {booking.bookingTime}
              </p>
            </div>

            <div className="border-t-2 border-gray-300 pt-4 mb-6">
              <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
              <div className="flex justify-between mb-2">
                <span>Base Amount:</span>
                <span>₦{booking.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Processing Fee:</span>
                <span>₦{booking.processingFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                <span>Total Amount:</span>
                <span>₦{booking.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
              <p>Thank you for choosing Dex View Cinema!</p>
              <p>For support, email us at support@dexviewcinema.com or call 08139614950</p>
              <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
            </div>
          </div>

          <div className="flex justify-center mt-8 gap-4 print:hidden">
            <Button
              onClick={handlePrint}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-glow-green"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Link href="/bookings">
              <Button
                variant="outline"
                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card"
              >
                Back to Bookings
              </Button>
            </Link>
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
            padding: 20px; /* Add padding for print layout */
          }
          /* Ensure images are visible */
          #receipt-print-area img {
            display: block !important;
            visibility: visible !important;
          }
          /* Hide buttons and non-receipt elements */
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
