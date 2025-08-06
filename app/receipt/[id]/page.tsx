"use client"

import { useState, useEffect, useCallback } from "react"
import { notFound, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import Link from "next/link"
import { type Hall } from "@/types/hall"

// Define a type for booking data (should match the API response)
interface Booking {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string // Reference to the event ID
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

// Define types for event fetched from the database (minimal for receipt)
interface Event {
  _id: string
  title: string
  hall_id: string
  event_date: string
  event_time: string
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [event, setEvent] = useState<Event | null>(null) // State for event details
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const bookingId = params.id

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch the specific booking
      const bookingRes = await fetch(`/api/bookings?id=${bookingId}`)
      if (!bookingRes.ok) {
        if (bookingRes.status === 404) {
          notFound()
        }
        throw new Error(`Failed to fetch booking: ${bookingRes.statusText}`)
      }
      const bookingData: Booking = await bookingRes.json()
      setBooking(bookingData)

      // Fetch the event associated with the booking
      const eventRes = await fetch(`/api/events/${bookingData.eventId}`)
      if (!eventRes.ok) {
        throw new Error(`Failed to fetch event: ${eventRes.statusText}`)
      }
      const eventData: Event = await eventRes.json()
      setEvent(eventData)

      // Fetch all halls
      const hallsRes = await fetch("/api/halls")
      if (!hallsRes.ok) {
        throw new Error(`Failed to fetch halls: ${hallsRes.statusText}`)
      }
      const allHalls: Hall[] = await hallsRes.json()
      setHalls(allHalls)

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const printReceipt = () => {
    window.print()
  }

  // Helper to get hall display name
  const getHallDisplayName = (hallId: string, allHalls: Hall[]) => {
    const hall = allHalls.find(h => h._id === hallId);
    return hall ? hall.name : hallId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center text-white">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading receipt...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    )
  }

  if (!booking || !event || halls.length === 0) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
      </div>

      {/* Header with glassmorphism */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Booking Receipt
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">Your confirmed booking details</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="receipt-container bg-white text-black p-8 md:p-12 rounded-lg shadow-lg print:shadow-none print:p-0" id="receipt">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
            <p className="text-gray-600 text-base md:text-lg">Premium Entertainment Experience</p>
            <div className="border-b-2 border-brand-red-600 mt-4 md:mt-6"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            <div>
              <h3 className="font-bold text-lg md:text-xl mb-3 text-brand-red-600">Customer Information</h3>
              <p className="text-gray-800">
                <strong>Name:</strong> {booking.customerName}
              </p>
              <p className="text-gray-800">
                <strong>Email:</strong> {booking.customerEmail}
              </p>
              <p className="text-gray-800">
                <strong>Phone:</strong> {booking.customerPhone}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg md:text-xl mb-3 text-brand-red-600">Booking Details</h3>
              <p className="text-gray-800">
                <strong>Booking ID:</strong> {booking._id}
              </p>
              <p className="text-gray-800">
                <strong>Date:</strong> {booking.bookingDate}
              </p>
              <p className="text-gray-800">
                <strong>Time:</strong> {booking.bookingTime}
              </p>
              <p className="text-gray-800">
                <strong>Payment:</strong> {booking.paymentMethod}
              </p>
            </div>
          </div>

          <div className="mb-6 md:mb-8">
            <h3 className="font-bold text-lg md:text-xl mb-3 text-brand-red-600">Event Information</h3>
            <p className="text-gray-800">
              <strong>Event:</strong> {booking.eventTitle}
            </p>
            <p className="text-gray-800">
              <strong>Type:</strong> {booking.eventType === "match" ? "Sports Match" : "Movie"}
            </p>
            <p className="text-gray-800">
              <strong>Venue:</strong> {getHallDisplayName(event.hall_id, halls)}
            </p>
            <p className="text-gray-800">
              <strong>Seats:</strong>{" "}
              {booking.seats
                .map((seatId: string) => (seatId.includes('-') ? seatId.split('-').pop() : seatId))
                .join(", ")}
            </p>
            <p className="text-gray-800">
              <strong>Seat Type:</strong> {booking.seatType}
            </p>
          </div>

          <div className="border-t-2 border-gray-300 pt-4 md:pt-6 mb-6 md:mb-8">
            <h3 className="font-bold text-lg md:text-xl mb-3 text-brand-red-600">Payment Summary</h3>
            <div className="flex justify-between mb-2 text-gray-800">
              <span>Base Amount:</span>
              <span>₦{booking.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2 text-gray-800">
              <span>Processing Fee:</span>
              <span>₦{booking.processingFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg md:text-xl border-t border-gray-300 pt-2 text-gray-900">
              <span>Total Amount:</span>
              <span>₦{booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4 md:pt-6">
            <p>Thank you for choosing Dex View Cinema!</p>
            <p>For support, visit us at www.dexviewcinema.com or call +234-XXX-XXX-XXXX</p>
            <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8 print:hidden">
          <Button
            onClick={() => router.push("/bookings")}
            className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl"
          >
            View All My Bookings
          </Button>
          <Button
            onClick={printReceipt}
            className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-20 print:hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-lg mb-4 sm:mb-0">
              &copy; 2025 Dex View Cinema. All rights reserved.
            </p>
            <p className="text-cyber-slate-300 text-lg">
              Developed by{" "}
              <a
                href="https://www.sydatech.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red-400 hover:text-brand-red-300 transition-colors font-bold hover:underline"
              >
                SydaTech
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
