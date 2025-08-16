"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Printer, Search } from "lucide-react"

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
  hall_id: string
}

interface Hall {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

interface BookingsManagementProps {
  bookings: Booking[]
  events: Event[]
  halls: Hall[]
  selectedEventIdForBookings: string | "all"
  setSelectedEventIdForBookings: (value: string | "all") => void
  customerSearchQuery: string
  setCustomerSearchQuery: (value: string) => void
  onViewBooking: (booking: Booking) => void
  onPrintReceipt: (booking: Booking) => void
  getHallDisplayName: (halls: Hall[], hallId: string) => string
}

export function BookingsManagement({
  bookings,
  events,
  halls,
  selectedEventIdForBookings,
  setSelectedEventIdForBookings,
  customerSearchQuery,
  setCustomerSearchQuery,
  onViewBooking,
  onPrintReceipt,
  getHallDisplayName,
}: BookingsManagementProps) {
  const filteredCustomerBookings = bookings.filter((booking) => {
    const matchesEvent = selectedEventIdForBookings === "all" || booking.eventId === selectedEventIdForBookings
    const matchesSearch =
      customerSearchQuery === "" ||
      booking.customerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(customerSearchQuery.toLowerCase())
    return matchesEvent && matchesSearch
  })

  return (
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
                      <div className="text-cyber-slate-200">
                        <div className="font-semibold">{booking.seats.join(", ")}</div>
                        <div className="text-xs text-cyber-slate-400">{booking.seatType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-cyber-slate-200">
                      <div className="font-semibold">₦{booking.totalAmount.toLocaleString()}</div>
                      <div className="text-xs text-cyber-slate-400">
                        Base: ₦{booking.amount.toLocaleString()} + Fee: ₦{booking.processingFee.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "confirmed"
                            ? "default"
                            : booking.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          booking.status === "confirmed"
                            ? "bg-green-500/30 text-green-300 border-green-500/50 rounded-2xl"
                            : booking.status === "pending"
                              ? "bg-yellow-500/30 text-yellow-300 border-yellow-500/50 rounded-2xl"
                              : "bg-red-500/30 text-red-300 border-red-500/50 rounded-2xl"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-cyber-slate-200">
                      <div className="text-sm">{new Date(booking.bookingDate).toLocaleDateString()}</div>
                      <div className="text-xs text-cyber-slate-400">{booking.bookingTime}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBooking(booking)}
                          className="text-cyber-slate-300 hover:text-white hover:bg-glass-white rounded-xl"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPrintReceipt(booking)}
                          className="text-cyber-slate-300 hover:text-white hover:bg-glass-white rounded-xl"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-cyber-slate-400 py-8">
                    No bookings found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
