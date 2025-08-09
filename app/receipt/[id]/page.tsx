"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, CalendarIcon, Clock, MapPin, Film, Trophy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

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

// Helper to get hall details from fetched halls array, with fallback to local mapping
const hallMappingArray: Hall[] = [
  { _id: "hallA", name: "Hall A", capacity: 48, type: "standard" },
  { _id: "hallB", name: "Hall B", capacity: 60, type: "standard" },
  { _id: "vip_hall", name: "VIP Hall", capacity: 22, type: "vip" },
]

const getHallDisplayName = (halls: Hall[], hallId: string) => {
  const foundInFetched = halls.find((hall) => hall._id === hallId)
  if (foundInFetched) return foundInFetched.name
  return hallMappingArray.find((hall) => hall._id === hallId)?.name || hallId
}

export default function ReceiptPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [hallName, setHallName] = useState<string>("Loading...")
  const { toast } = useToast()

  const fetchBookingDetails = useCallback(async () => {
    if (!id) return

    try {
      const res = await fetch(`/api/bookings/${id}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Booking = await res.json()
      setBooking(data)

      // Fetch hall details using eventId from booking
      const eventRes = await fetch(`/api/events/${data.eventId}`)
      if (!eventRes.ok) {
        throw new Error(`HTTP error! status: ${eventRes.status}`)
      }
      const eventData = await eventRes.json()
      const hallDisplayName = getHallDisplayName([], eventData.hall_id) // Pass empty array for halls, will use fallback
      setHallName(hallDisplayName)
    } catch (error) {
      console.error("Failed to fetch booking or event details:", error)
      toast({
        title: "Error",
        description: "Could not load booking details.",
        variant: "destructive",
      })
    }
  }, [id, toast])

  useEffect(() => {
    fetchBookingDetails()
  }, [fetchBookingDetails])

  const handlePrint = () => {
    window.print()
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card p-8 text-center">
          <CardTitle className="text-2xl font-bold text-brand-red-300">Loading Booking...</CardTitle>
          <CardDescription className="text-cyber-slate-300 mt-2">
            Please wait while we fetch your booking details.
          </CardDescription>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4 sm:p-8">
      <Card className="w-full max-w-3xl bg-glass-dark-strong backdrop-blur-xl border border-white/20 shadow-cyber-hover rounded-4xl print:shadow-none print:border-none print:bg-transparent print:text-inherit">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-white text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent print:text-black print:bg-none print:text-inherit">
            Booking Receipt
          </CardTitle>
          <CardDescription className="text-cyber-slate-300 text-lg print:text-gray-600">
            Your premium entertainment experience awaits!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <div className="receipt-content bg-white text-black p-6 sm:p-8 rounded-lg shadow-md" id="receipt">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6">
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
                <p className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-brand-red-500" />
                  <strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-red-500" />
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
              <p className="flex items-center gap-2">
                {booking.eventType === "match" ? (
                  <Trophy className="w-4 h-4 text-brand-red-500" />
                ) : (
                  <Film className="w-4 h-4 text-brand-red-500" />
                )}
                <strong>Type:</strong> {booking.eventType === "match" ? "Sports Match" : "Movie"}
              </p>
              <p>
                <strong>Seats:</strong>{" "}
                {booking.seats.map((seat, index) => (
                  <Badge
                    key={seat}
                    variant="outline"
                    className="text-xs bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30 rounded-2xl mr-1 print:bg-gray-100 print:text-gray-800 print:border-gray-300"
                  >
                    {seat}
                  </Badge>
                ))}
              </p>
              <p>
                <strong>Seat Type:</strong> {booking.seatType}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-red-500" />
                <strong>Venue:</strong> {hallName}
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
              <p>For support, visit us at support@dexviewcinema.com or call 08139614950</p>
              <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
            </div>
          </div>
        </CardContent>
        <div className="flex justify-center p-4 sm:p-6 print:hidden">
          <Button
            onClick={handlePrint}
            className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-glow-green"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
            color: inherit;
            background-color: inherit;
            background-image: none;
            box-shadow: none;
            border-color: #ccc;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
          }
          /* Ensure text colors are readable on print */
          #receipt .text-black,
          #receipt .text-gray-600,
          #receipt .text-gray-500,
          #receipt .text-brand-red-600 {
            color: #000 !important;
          }
          /* Specific overrides for elements within the receipt content */
          #receipt .bg-brand-red-500\/20,
          #receipt .text-brand-red-300,
          #receipt .border-brand-red-500\/30 {
            background-color: #f0f0f0 !important;
            color: #333333 !important;
            border-color: #cccccc !important;
          }
          /* Hide buttons and interactive elements in print */
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
