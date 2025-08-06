"use client"

import { useState, useEffect } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

// Define a type for booking data
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

// Define a type for Hall data (needed for getHallDisplayName)
interface Hall {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

// Helper to map hall_id to display name and total seats (for client-side generation)
const hallMappingArray: Hall[] = [
  { _id: "hallA", name: "Hall A", capacity: 48, type: "standard" },
  { _id: "hallB", name: "Hall B", capacity: 60, type: "standard" },
  { _id: "vip_hall", name: "VIP Hall", capacity: 22, type: "vip" },
]

// Helper to get hall details from fetched halls array, with fallback to local mapping
const getHallDetails = (halls: Hall[], hallId: string) => {
  const foundInFetched = halls.find((hall) => hall._id === hallId)
  if (foundInFetched) return foundInFetched
  // Fallback to local hardcoded mapping if not found in fetched halls
  return hallMappingArray.find((hall) => hall._id === hallId)
}

const getHallDisplayName = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.name || hallId


export default function ReceiptPage({ params }: { params: { id: string } }) {
  const { id: bookingId } = params
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null)
  const [eventHallId, setEventHallId] = useState<string | null>(null); // To store the hall_id from the event
  const [halls, setHalls] = useState<Hall[]>([]); // State to store fetched halls
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch halls first
        const hallsRes = await fetch("/api/halls")
        if (!hallsRes.ok) {
          throw new Error(`Failed to fetch halls: ${hallsRes.statusText}`)
        }
        const allHalls: Hall[] = await hallsRes.json()
        setHalls(allHalls)

        // Fetch booking details
        const bookingRes = await fetch(`/api/bookings/${bookingId}`)
        if (!bookingRes.ok) {
          if (bookingRes.status === 404) {
            notFound() // Use Next.js notFound for 404
          }
          throw new Error(`HTTP error! status: ${bookingRes.status}`)
        }
        const data: Booking = await bookingRes.json()
        setBookingDetails(data)

        // Fetch event details to get hall_id
        const eventRes = await fetch(`/api/events/${data.eventId}`);
        if (!eventRes.ok) {
          throw new Error(`Failed to fetch event for hall_id: ${eventRes.statusText}`);
        }
        const eventData = await eventRes.json();
        setEventHallId(eventData.hall_id);

      } catch (err) {
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

    if (bookingId) {
      fetchReceiptData()
    }
  }, [bookingId, toast])

  const printReceipt = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Loading receipt...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-red-500">
        <p className="text-lg mb-4">Error: {error}</p>
        <Button onClick={() => router.back()} className="bg-brand-red-500 hover:bg-brand-red-600 text-white">
          Go Back
        </Button>
      </div>
    )
  }

  if (!bookingDetails || !eventHallId) {
    return notFound() // If bookingDetails is null after loading, it means not found
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex flex-col items-center justify-center py-12">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
      </div>

      <Card className="relative z-10 sm:max-w-[600px] w-full bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl p-6 sm:p-8">
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-white text-3xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent mb-2">
            Booking Receipt
          </CardTitle>
          <CardDescription className="text-cyber-slate-300 text-lg">
            Your booking is confirmed! Here are your details.
          </CardDescription>
        </CardHeader>

        <div className="receipt-content bg-white text-black p-8 rounded-lg" id="receipt">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
            <p className="text-gray-600">Premium Entertainment Experience</p>
            <div className="border-b-2 border-brand-red-600 mt-4"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-bold text-lg mb-3 text-brand-red-600">Customer Information</h3>
              <p>
                <strong>Name:</strong> {bookingDetails.customerName}
              </p>
              <p>
                <strong>Email:</strong> {bookingDetails.customerEmail}
              </p>
              <p>
                <strong>Phone:</strong> {bookingDetails.customerPhone}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
              <p>
                <strong>Booking ID:</strong> {bookingDetails._id}
              </p>
              <p>
                <strong>Date:</strong> {bookingDetails.bookingDate}
              </p>
              <p>
                <strong>Time:</strong> {bookingDetails.bookingTime}
              </p>
              <p>
                <strong>Payment:</strong> {bookingDetails.paymentMethod}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
            <p>
              <strong>Event:</strong> {bookingDetails.eventTitle}
            </p>
            <p>
              <strong>Type:</strong> {bookingDetails.eventType === "match" ? "Sports Match" : "Movie"}
            </p>
            <p>
              <strong>Venue:</strong> {getHallDisplayName(halls, eventHallId)}
            </p>
            <p>
              <strong>Seats:</strong>{" "}
              {bookingDetails.seats
                .map((seatId: string) => (seatId.includes('-') ? seatId.split('-').pop() : seatId))
                .join(", ")}
            </p>
            <p>
              <strong>Seat Type:</strong> {bookingDetails.seatType}
            </p>
          </div>

          <div className="border-t-2 border-gray-300 pt-4 mb-6">
            <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
            <div className="flex justify-between mb-2">
              <span>Base Amount:</span>
              <span>₦{bookingDetails.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Processing Fee:</span>
              <span>₦{bookingDetails.processingFee}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
              <span>Total Amount:</span>
              <span>₦{bookingDetails.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
            <p>Thank you for choosing Dex View Cinema!</p>
            <p>For support, visit us at www.dexviewcinema.com or call +234-XXX-XXX-XXXX</p>
            <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
          </div>
        </div>

        <CardContent className="flex justify-center gap-4 mt-6">
          <Link href="/">
            <Button
              variant="outline"
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Button
            onClick={printReceipt}
            className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </CardContent>
      </Card>

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
          }
        }
      `}</style>
    </div>
  )
}
