"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Printer, CalendarIcon, Clock, MapPin } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

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

interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  event_date: string
  event_time: string
  hall_id: string
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

export default function MyBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<Event[]>([]) // To get event details for filtering
  const [halls, setHalls] = useState<Hall[]>([]) // To get hall names
  const [searchEmail, setSearchEmail] = useState<string>("")
  const [filterEventId, setFilterEventId] = useState<string>("all")
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Event[] = await res.json()
      setEvents(data)
    } catch (error) {
      console.error("Failed to fetch events:", error)
      toast({
        title: "Error fetching events",
        description: "Could not load event information.",
        variant: "destructive",
      })
    }
  }, [toast])

  const fetchHalls = useCallback(async () => {
    try {
      const res = await fetch("/api/halls")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Hall[] = await res.json()
      setHalls(data)
    } catch (error) {
      console.error("Failed to fetch halls:", error)
      toast({
        title: "Error fetching halls",
        description: "Could not load hall information.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchEvents()
    fetchHalls()
  }, [fetchEvents, fetchHalls])

  const handleSearchBookings = useCallback(async () => {
    if (!searchEmail) {
      setBookings([])
      setFilteredBookings([])
      toast({
        title: "Email Required",
        description: "Please enter your email address to find bookings.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`/api/bookings?customerEmail=${encodeURIComponent(searchEmail)}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Booking[] = await res.json()
      setBookings(data)
      setFilteredBookings(data) // Initialize filtered bookings with all fetched bookings
      if (data.length === 0) {
        toast({
          title: "No Bookings Found",
          description: "No bookings found for this email address.",
          variant: "default",
        })
      } else {
        toast({
          title: "Bookings Found",
          description: `${data.length} booking(s) found for ${searchEmail}.`,
        })
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
      toast({
        title: "Error fetching bookings",
        description: "Could not load your bookings. Please try again.",
        variant: "destructive",
      })
    }
  }, [searchEmail, toast])

  useEffect(() => {
    // Apply filters whenever bookings, searchEmail, or filterEventId changes
    let currentFiltered = bookings

    if (searchEmail) {
      currentFiltered = currentFiltered.filter((booking) =>
        booking.customerEmail.toLowerCase().includes(searchEmail.toLowerCase()),
      )
    }

    if (filterEventId !== "all") {
      currentFiltered = currentFiltered.filter((booking) => booking.eventId === filterEventId)
    }

    setFilteredBookings(currentFiltered)
  }, [bookings, searchEmail, filterEventId])

  const handleViewReceipt = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsReceiptOpen(true)
  }

  const printReceipt = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card rounded-4xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-white text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
              My Bookings
            </CardTitle>
            <CardDescription className="text-cyber-slate-300 text-lg">
              Find and manage your cinema and sports event bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="email-search" className="text-cyber-slate-200">
                  Your Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email-search"
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Enter your email to find bookings..."
                    className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl pl-9"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-filter" className="text-cyber-slate-200">
                  Filter by Event
                </Label>
                <Select value={filterEventId} onValueChange={setFilterEventId}>
                  <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.title} ({getHallDisplayName(halls, event.hall_id)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mb-6">
              <Button
                onClick={handleSearchBookings}
                className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl shadow-glow-red"
              >
                Find My Bookings
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-cyber-slate-200 font-semibold">Booking ID</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Event</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Date & Time</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Seats</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Total Amount</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Status</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking._id} className="border-white/20 hover:bg-glass-white transition-colors">
                        <TableCell className="font-medium text-white font-mono">{booking._id}</TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div className="font-semibold">{booking.eventTitle}</div>
                            <Badge
                              variant="outline"
                              className="text-xs bg-cyber-slate-500/20 text-cyber-slate-300 border-cyber-slate-500/30 rounded-xl mt-1"
                            >
                              {booking.eventType === "movie" ? "Movie" : "Sports Match"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-cyber-slate-300">
                            <CalendarIcon className="w-4 h-4 text-brand-red-400" />
                            {new Date(booking.bookingDate).toLocaleDateString()}
                            <Clock className="w-4 h-4 ml-2 text-brand-red-400" />
                            {booking.bookingTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex gap-1 flex-wrap">
                              {booking.seats.map((seat) => (
                                <Badge
                                  key={seat}
                                  variant="outline"
                                  className="text-xs bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30 rounded-2xl"
                                >
                                  {seat}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-cyber-slate-400">{booking.seatType}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          ₦{booking.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={booking.status === "confirmed" ? "default" : "secondary"}
                            className={
                              booking.status === "confirmed"
                                ? "bg-cyber-green-500/30 text-cyber-green-300 border-cyber-green-500/50 rounded-2xl"
                                : "bg-cyber-yellow-500/30 text-cyber-yellow-300 border-cyber-yellow-500/50 rounded-2xl"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReceipt(booking)}
                            className="border-cyber-green-500/50 text-cyber-green-400 hover:bg-cyber-green-500/20 bg-transparent backdrop-blur-sm rounded-2xl"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            View/Print Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-cyber-slate-400 py-8">
                        Enter your email and click "Find My Bookings" to see your reservations.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[600px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl print:shadow-none print:border-none print:bg-transparent print:text-inherit">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent print:text-black print:bg-none print:text-inherit">
              Booking Receipt
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300 print:text-gray-600">
              Your booking details for printing.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="receipt-content bg-white text-black p-8 rounded-lg mx-4" id="receipt">
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

              <div className="grid grid-cols-2 gap-8 mb-6">
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
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
                <p>
                  <strong>Event:</strong> {selectedBooking.eventTitle}
                </p>
                <p>
                  <strong>Type:</strong> {selectedBooking.eventType === "match" ? "Sports Match" : "Movie"}
                </p>
                <p>
                  <strong>Seats:</strong>{" "}
                  {selectedBooking.seats.map((seat, index) => (
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
                  <strong>Seat Type:</strong> {selectedBooking.seatType}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-red-500" />
                  <strong>Venue:</strong> {getHallDisplayName(halls, selectedBooking.eventId)}
                </p>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>Base Amount:</span>
                  <span>₦{selectedBooking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Processing Fee:</span>
                  <span>₦{selectedBooking.processingFee}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{selectedBooking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
                <p>Thank you for choosing Dex View Cinema!</p>
                <p>For support, visit us at support@dexviewcinema.com or call 08139614950</p>
                <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReceiptOpen(false)}
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl print:hidden"
            >
              Close
            </Button>
            <Button
              onClick={printReceipt}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-glow-green"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-8 print:hidden">
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
