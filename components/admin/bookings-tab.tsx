"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Printer, Search, Plus } from "lucide-react"

interface Booking {
  _id: string
  event_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  seats: string[]
  total_amount: number | null
  payment_method: string
  status: "confirmed" | "pending" | "cancelled"
  booking_date: string | null
}

interface Event {
  _id: string
  title: string
  type: "movie" | "match"
  date: string
  time: string
  hall_id: string
}

interface Hall {
  _id: string
  name: string
  type: "VIP" | "Standard"
}

interface BookingsTabProps {
  bookings: Booking[]
  events: Event[]
  halls: Hall[]
  selectedEventIdForBookings: string | "all"
  setSelectedEventIdForBookings: (value: string | "all") => void
  customerSearchQuery: string
  setCustomerSearchQuery: (value: string) => void
  onPrintReceipt: (booking: Booking) => void
  onCreateBooking: () => void
  getHallDisplayName: (halls: Hall[], hallId: string) => string
  filteredBookings: Booking[]
}

export function BookingsTab({
  bookings,
  events,
  halls,
  selectedEventIdForBookings,
  setSelectedEventIdForBookings,
  customerSearchQuery,
  setCustomerSearchQuery,
  onPrintReceipt,
  onCreateBooking,
  getHallDisplayName,
  filteredBookings,
}: BookingsTabProps) {
  return (
    <Tabs defaultValue="bookings">
      <TabsContent value="bookings">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white text-xl font-bold">Customer Bookings</CardTitle>
              <CardDescription className="text-cyber-slate-300">
                View and manage customer bookings with receipt printing capability
              </CardDescription>
            </div>
            <Button
              onClick={onCreateBooking}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 shadow-glow-green text-white group rounded-2xl"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
              Create Booking
            </Button>
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
                    placeholder="Search by name, email, or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-glass-white">
                    <TableHead className="text-cyber-slate-200 font-semibold">Customer</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Event</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Seats</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Amount</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Payment</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Status</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Date</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const event = events.find((e) => e._id === booking.event_id)
                    return (
                      <TableRow key={booking._id} className="border-white/20 hover:bg-glass-white">
                        <TableCell>
                          <div className="text-white font-semibold">{booking.customer_name}</div>
                          <div className="text-cyber-slate-400 text-sm">{booking.customer_email}</div>
                          <div className="text-cyber-slate-400 text-sm">{booking.customer_phone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div className="font-semibold">{event?.title}</div>
                            <div className="text-sm text-cyber-slate-400">
                              {event && new Date(event.date).toLocaleDateString()} at {event?.time}
                            </div>
                            <div className="text-sm text-cyber-slate-400">
                              {event && getHallDisplayName(halls, event.hall_id)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200 text-sm">{booking.seats.join(", ")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white font-semibold">
                            ₦{booking.total_amount ? booking.total_amount.toLocaleString() : "0"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-cyber-slate-200 capitalize">{booking.payment_method}</span>
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
                                ? "bg-cyber-green-500/20 text-cyber-green-300 border-cyber-green-500/30"
                                : booking.status === "pending"
                                  ? "bg-cyber-blue-500/20 text-cyber-blue-300 border-cyber-blue-500/30"
                                  : "bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-cyber-slate-200 text-sm">
                            {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPrintReceipt(booking)}
                            className="border-cyber-purple-500/50 text-cyber-purple-300 hover:bg-cyber-purple-500/20 bg-glass-white backdrop-blur-sm rounded-2xl"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
