"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Eye, Printer, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall"

interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  hall_id: string
}

interface Booking {
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
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string
  bookingTime: string
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventIdForBookings, setSelectedEventIdForBookings] = useState<string | "all">("all")
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const { toast } = useToast()

  // Helper functions
  const getHallDisplayName = (halls: Hall[], hallId: string) => {
    const hall = halls.find((hall) => hall._id === hallId)
    return hall?.name || hallId
  }

  // Filter bookings based on selected event and search query
  const filteredCustomerBookings = bookings.filter((booking) => {
    const matchesEvent = selectedEventIdForBookings === "all" || booking._id === selectedEventIdForBookings
    const matchesSearch =
      booking.customerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(customerSearchQuery.toLowerCase())
    return matchesEvent && matchesSearch
  })

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, eventsRes, hallsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/events"),
          fetch("/api/halls"),
        ])

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json()
          setBookings(bookingsData)
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData)
        }

        if (hallsRes.ok) {
          const hallsData = await hallsRes.json()
          setHalls(hallsData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast({
          title: "Error",
          description: "Failed to load bookings data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handlePrintReceipt = (booking: Booking) => {
    // Handle print receipt logic
    console.log("Print receipt for:", booking)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading bookings...</div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Customer Bookings
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">View and manage customer bookings</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
          <CardHeader>
            <CardTitle className="text-white text-xl font-bold">Customer Bookings</CardTitle>
            <CardDescription className="text-cyber-slate-300">
              View and manage customer bookings with receipt printing capability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="booking-event-filter" className="text-cyber-slate-200">
                  Filter by Event
                </Label>
                <Select
                  value={selectedEventIdForBookings}
                  onValueChange={(value: string | "all") => setSelectedEventIdForBookings(value)}
                >
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
              <div className="grid gap-2">
                <Label htmlFor="customer-search" className="text-cyber-slate-200">
                  Search Customer
                </Label>
                <div className="relative">
                  <Input
                    id="customer-search"
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl pl-9"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-cyber-slate-200 font-semibold">Booking ID</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Customer</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Event</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Seats/Type</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Amount</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Status</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Date</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomerBookings.length > 0 ? (
                    filteredCustomerBookings.map((booking) => (
                      <TableRow key={booking._id} className="border-white/20 hover:bg-glass-white transition-colors">
                        <TableCell className="font-medium text-white font-mono">{booking._id}</TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div className="font-semibold">{booking.customerName}</div>
                            <div className="text-xs text-cyber-slate-400">{booking.customerEmail}</div>
                            <div className="text-xs text-cyber-slate-400">{booking.customerPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div className="font-semibold">{booking.eventTitle}</div>
                            <Badge
                              variant="outline"
                              className="text-xs bg-cyber-slate-500/20 text-cyber-slate-300 border-cyber-slate-500/30 rounded-xl mt-1"
                            >
                              {booking.eventType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex gap-1">
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
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div className="font-semibold">₦{booking.totalAmount.toLocaleString()}</div>
                            <div className="text-xs text-cyber-slate-400">
                              Base: ₦{booking.amount.toLocaleString()} + Fee: ₦{booking.processingFee}
                            </div>
                          </div>
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
                          <div className="text-cyber-slate-200">
                            <div>{new Date(booking.bookingDate).toLocaleDateString()}</div>
                            <div className="text-xs text-cyber-slate-400">{booking.bookingTime}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintReceipt(booking)}
                              className="border-cyber-green-500/50 text-cyber-green-400 hover:bg-cyber-green-500/20 bg-transparent backdrop-blur-sm rounded-2xl"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-cyber-slate-400 py-8">
                        No bookings found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
