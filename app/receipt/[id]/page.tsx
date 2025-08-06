"use client"

import { useState, useEffect, useCallback } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { format } from "date-fns"

// Define a type for booking data
interface Booking {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string // This is the event's _id
  eventTitle: string
  eventType: "match" | "movie"
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

// Define a type for hall data (needed for getHallDisplayName)
interface Hall {
  _id: string
  name: string
  type: "vip" | "standard"
  capacity: number
  // Add other hall properties if necessary
}

// Define types for event fetched from the database (minimal for receipt)
interface Event {
  _id: string
  hall_id: string // The ID of the hall where the event is held
  // Add other event properties if necessary for display, e.g., title, date, time
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [event, setEvent] = useState<Event | null>(null) // State to store event details
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bookingId = params.id

  const fetchBookingEventAndHalls = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch halls first
      const hallsRes = await fetch("/api/halls")
      if (!hallsRes.ok) {
        throw new Error(`Failed to fetch halls: ${hallsRes.statusText}`)
      }
      const allHalls: Hall[] = await hallsRes.json()
      setHalls(allHalls)

      // 2. Fetch booking details
      const bookingRes = await fetch(`/api/bookings?id=${bookingId}`)
      if (!bookingRes.ok) {
        if (bookingRes.status === 404) {
          notFound()
        }
        throw new Error(`HTTP error! status: ${bookingRes.status}`)
      }
      const bookingData: Booking[] = await bookingRes.json()
      if (bookingData.length === 0) {
        notFound() // If no booking found for the ID
      }
      const fetchedBooking = bookingData[0]
      setBooking(fetchedBooking)

      // 3. Fetch event details using eventId from the fetched booking
      const eventRes = await fetch(`/api/events/${fetchedBooking.eventId}`)
      if (!eventRes.ok) {
        throw new Error(`Failed to fetch event details: ${eventRes.statusText}`)
      }
      const eventData: Event = await eventRes.json()
      setEvent(eventData)

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchBookingEventAndHalls()
  }, [fetchBookingEventAndHalls])

  const printReceipt = () => {
    window.print()
  }

  const getHallDisplayName = (hallId: string, allHalls: Hall[]) => {
    const hall = allHalls.find(h => h._id === hallId);
    return hall ? hall.name : hallId;
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-red-500">
        Error: {error}
      </div>
    )
  }

  if (!booking || !event || halls.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white">
        Booking, Event, or Hall data not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex flex-col items-center py-8">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
      </div>

      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50 w-full">
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

      <div className="relative max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white text-black p-8 rounded-lg shadow-lg" id="receipt">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
            <p className="text-gray-600">Premium Entertainment Experience</p>
            <div className="border-b-2 border-brand-red-600 mt-4"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
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
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
            <p>
              <strong>Event:</strong> {booking.eventTitle}
            </p>
            <p>
              <strong>Type:</strong> {booking.eventType === "match" ? "Sports Match" : "Movie"}
            </p>
            <p>
              <strong>Venue:</strong> {getHallDisplayName(event.hall_id, halls)}
            </p>
            <p>
              <strong>Seats:</strong>{" "}
              {booking.seats
                .map((seatId: string) => (seatId.includes('-') ? seatId.split('-').pop() : seatId))
                .join(", ")}
            </p>
            <p>
              <strong>Seat Type:</strong> {booking.seatType}
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
              <span>₦{booking.processingFee}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
              <span>Total Amount:</span>
              <span>₦{booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
            <p>Thank you for choosing Dex View Cinema!</p>
            <p>For support, visit us at www.dexviewcinema.com or call +234-XXX-XXX-XXXX</p>
            <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8 no-print">
          <Button
            onClick={printReceipt}
            className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-cyber-card"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
          <Link href="/bookings">
            <Button
              variant="outline"
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl shadow-cyber-card"
            >
              View All My Bookings
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-20 w-full">
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
            box-shadow: none; /* Remove shadow for print */
          }
          .no-print {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
