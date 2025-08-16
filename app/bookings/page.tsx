"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  MapPin,
  Film,
  Trophy,
  ArrowLeft,
  Search,
  Ticket,
  Printer,
  Eye,
  Loader2,
  XCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image" // Import Image component

// Define a type for booking data as returned by /api/bookings
interface Booking {
  _id: string // Changed from 'id' to '_id' to match MongoDB
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string // Added eventId
  eventTitle: string
  eventType: "match" | "movie"
  seats: string[]
  seatType: string
  amount: number
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string // This is the booking creation date
  bookingTime: string // This is the booking creation time
  paymentMethod: string
  createdAt: string
  updatedAt: string
}

// Define types for event and hall details
interface EventDetails {
  _id: string
  title: string
  type: "movie" | "match"
  date: string // Event date
  time: string // Event time
  hall_id: string
  // Add other event properties if needed for display
}

interface HallDetails {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
  // Add other hall properties if needed for display
}

// Define a type for the full booking details including event and hall
interface FullBookingDetails extends Booking {
  eventDetails?: EventDetails
  hallDetails?: HallDetails
}

export default function BookingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [fetchedBookings, setFetchedBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false) // To show "No bookings found" only after a search
  const [selectedBooking, setSelectedBooking] = useState<FullBookingDetails | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isReceiptLoading, setIsReceiptLoading] = useState(false) // New state for receipt loading
  const [receiptError, setReceiptError] = useState<string | null>(null) // New state for receipt error

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setHasSearched(true) // Mark that a search has been initiated
    setFetchedBookings([]) // Clear previous results

    const params = new URLSearchParams()
    if (customerEmail) params.append("email", customerEmail)

    try {
      const response = await fetch(`/api/bookings?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Booking[] = await response.json()
      setFetchedBookings(data)
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
      // Optionally, display an error message to the user
    } finally {
      setIsLoading(false)
    }
  }, [customerEmail])

  // Filter fetched bookings based on the client-side search query
  const displayedBookings = fetchedBookings.filter(
    (booking) =>
      (booking._id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || // Use _id
      (booking.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (booking.eventTitle?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  const handleViewReceipt = useCallback(async (booking: Booking) => {
    setSelectedBooking(null) // Clear previous selection
    setIsReceiptLoading(true)
    setReceiptError(null)
    setIsReceiptOpen(true) // Open dialog immediately with loading state

    try {
      // Fetch event details
      const eventRes = await fetch(`/api/events/${booking.eventId}`)
      if (!eventRes.ok) {
        throw new Error(`Failed to fetch event: ${eventRes.statusText}`)
      }
      const eventData: EventDetails = await eventRes.json()

      // Fetch hall details
      const hallRes = await fetch(`/api/halls/${eventData.hall_id}`)
      if (!hallRes.ok) {
        throw new Error(`Failed to fetch hall: ${hallRes.statusText}`)
      }
      const hallData: HallDetails = await hallRes.json()

      setSelectedBooking({
        ...booking,
        eventDetails: eventData,
        hallDetails: hallData,
      })
    } catch (err) {
      console.error("Error fetching full booking details:", err)
      setReceiptError((err as Error).message)
    } finally {
      setIsReceiptLoading(false)
    }
  }, [])

  const printReceipt = () => {
    const printContent = document.getElementById("receipt-print-area")
    if (printContent) {
      const originalContents = document.body.innerHTML
      const printArea = printContent.innerHTML

      document.body.innerHTML = printArea
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload() // Reload to restore original page state
    }
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
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
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
                My Bookings
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">View and manage your event tickets</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section to find bookings by customer details */}
        <Card className="mb-8 bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl p-6">
          <CardTitle className="text-white text-xl font-bold mb-4">Find My Bookings</CardTitle>
          <CardDescription className="text-cyber-slate-300 mb-4">
            Enter your email to retrieve your bookings.
          </CardDescription>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <Input
              type="email"
              placeholder="Your Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-400 focus:ring-brand-red-400 shadow-cyber-card"
            />
          </div>
          <Button
            onClick={fetchBookings}
            disabled={isLoading || !customerEmail}
            className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl shadow-cyber-card"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search My Bookings"
            )}
          </Button>
          {/* Security Note: In a real application, fetching bookings by email/name/phone without authentication
              is a security risk. This implementation assumes a future authentication system where the user
              is verified before accessing their bookings. */}
        </Card>

        {/* Existing search bar for client-side filtering of fetched results */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyber-slate-400" />
            <Input
              type="text"
              placeholder="Filter results by booking ID, customer name, or event title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-400 focus:ring-brand-red-400 shadow-cyber-card"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && (
            <div className="col-span-full text-center text-cyber-slate-400 text-lg py-10 flex items-center justify-center">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading bookings...
            </div>
          )}
          {!isLoading && hasSearched && displayedBookings.length === 0 ? (
            <div className="col-span-full text-center text-cyber-slate-400 text-lg py-10">
              No bookings found matching your search criteria.
            </div>
          ) : (
            displayedBookings.map((booking) => (
              <Card
                key={booking._id} // Use _id
                className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 border border-white/20 group relative overflow-hidden rounded-3xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-white leading-tight mb-1">
                        {booking.eventTitle}
                      </CardTitle>
                      <CardDescription className="text-cyber-slate-300 text-sm">
                        Booking ID: <span className="font-mono text-brand-red-300">{booking._id}</span> {/* Use _id */}
                      </CardDescription>
                    </div>
                    <Badge
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        booking.eventType === "match"
                          ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50"
                          : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50"
                      }`}
                    >
                      {booking.eventType === "match" ? (
                        <Trophy className="w-3 h-3 mr-1" />
                      ) : (
                        <Film className="w-3 h-3 mr-1" />
                      )}
                      {booking.eventType}
                    </Badge>
                  </div>

                  <Separator className="my-4 bg-white/20" />

                  <div className="grid grid-cols-2 gap-3 text-sm text-cyber-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-red-400" />
                      {/* Display booking date, not event date here */}
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-red-400" />
                      {/* Display booking time, not event time here */}
                      {booking.bookingTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-red-400" />
                      {/* Hall name is not available in initial fetch, will be "N/A" */}
                      N/A
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-brand-red-400" />
                      {booking.seats.join(", ")} ({booking.seatType})
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      ₦{(booking.totalAmount || 0).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <Badge
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-cyber-green-500/30 text-cyber-green-300 border-cyber-green-500/50"
                            : "bg-cyber-yellow-500/30 text-cyber-yellow-300 border-cyber-yellow-500/50"
                        }`}
                      >
                        {booking.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(booking)}
                        className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[600px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl print:shadow-none print:border-none print:bg-white print:text-black">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
              Booking Receipt
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300">
              Customer booking receipt ready for printing
            </DialogDescription>
          </DialogHeader>
          {isReceiptLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-cyber-slate-300">
              <Loader2 className="mr-2 h-8 w-8 animate-spin mb-4" />
              <p>Loading receipt details...</p>
            </div>
          ) : receiptError ? (
            <div className="flex flex-col items-center justify-center py-10 text-brand-red-500">
              <XCircle className="w-16 h-16 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Error Loading Receipt</h1>
              <p className="text-lg text-center">{receiptError}</p>
            </div>
          ) : selectedBooking ? (
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
                    <strong>Name:</strong> {selectedBooking.customerName}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedBooking.customerEmail}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedBooking.customerPhone}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                  <p>
                    <strong>Booking ID:</strong> {selectedBooking._id}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedBooking.bookingDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedBooking.bookingTime}
                  </p>
                  <p>
                    <strong>Payment:</strong> {selectedBooking.paymentMethod}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`font-semibold ${selectedBooking.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {selectedBooking.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
                <p className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-brand-red-500" />
                  <strong>Event:</strong> {selectedBooking.eventTitle} (
                  {selectedBooking.eventType === "match" ? "Sports Match" : "Movie"})
                </p>
                <p className="flex items-center gap-2 mt-2">
                  <MapPin className="w-5 h-5 text-brand-red-500" />
                  <strong>Venue:</strong> {selectedBooking.hallDetails?.name || "N/A"}
                </p>
                <p className="flex items-center gap-2 mt-2">
                  <Ticket className="w-5 h-5 text-brand-red-500" />
                  <strong>Seats:</strong>{" "}
                  {selectedBooking.seats
                    .map((seatId) => {
                      // For standard seats (e.g., "HALLA-1", "HALLB-1"), extract just the number
                      if (seatId.includes("-")) {
                        return seatId.split("-")[1]
                      }
                      // For VIP movie seats (S1, C1, F1) or VIP match seats (S1, A1, B1), keep as is
                      return seatId
                    })
                    .join(", ")}{" "}
                  ({selectedBooking.seatType})
                </p>
                <p className="flex items-center gap-2 mt-2">
                  <Calendar className="w-5 h-5 text-brand-red-500" />
                  <strong>Event Date:</strong>{" "}
                  {selectedBooking.eventDetails?.date
                    ? new Date(selectedBooking.eventDetails.date).toLocaleDateString()
                    : "N/A"}
                </p>
                <p className="flex items-center gap-2 mt-2">
                  <Clock className="w-5 h-5 text-brand-red-500" />
                  <strong>Event Time:</strong> {selectedBooking.eventDetails?.time || "N/A"}
                </p>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>Base Amount:</span>
                  <span>₦{(selectedBooking.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Processing Fee:</span>
                  <span>₦{(selectedBooking.processingFee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{(selectedBooking.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
                <p>Thank you for choosing Dex View Cinema!</p>
                <p>For support, email us at support@dexviewcinema.com or call 08139614950</p>
                <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
              </div>
            </div>
          ) : null}
          <DialogFooter className="print:hidden">
            <Button
              variant="outline"
              onClick={() => setIsReceiptOpen(false)}
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
            >
              Close
            </Button>
            <Button
              onClick={printReceipt}
              disabled={isReceiptLoading || !selectedBooking}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-20">
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
