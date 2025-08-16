"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  hall_id: string
}

type EventType = "movie" | "match"

interface ReportsManagementProps {
  bookings: Booking[]
  events: Event[]
  reportStartDate: string
  setReportStartDate: (date: string) => void
  reportEndDate: string
  setReportEndDate: (date: string) => void
  reportEventType: EventType | "all"
  setReportEventType: (type: EventType | "all") => void
  reportStatus: Booking["status"] | "all"
  setReportStatus: (status: Booking["status"] | "all") => void
  selectedEventIdForReports: string | "all"
  setSelectedEventIdForReports: (id: string | "all") => void
}

export function ReportsManagement({
  bookings,
  events,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportEventType,
  setReportEventType,
  reportStatus,
  setReportStatus,
  selectedEventIdForReports,
  setSelectedEventIdForReports,
}: ReportsManagementProps) {
  const filteredReportBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.bookingDate)
    const startDate = reportStartDate ? new Date(reportStartDate) : null
    const endDate = reportEndDate ? new Date(reportEndDate) : null

    const matchesDateRange = (!startDate || bookingDate >= startDate) && (!endDate || bookingDate <= endDate)
    const matchesEventType = reportEventType === "all" || booking.eventType === reportEventType
    const matchesStatus = reportStatus === "all" || booking.status === reportStatus
    const matchesEvent = selectedEventIdForReports === "all" || booking.eventId === selectedEventIdForReports

    return matchesDateRange && matchesEventType && matchesStatus && matchesEvent
  })

  const totalRevenue = filteredReportBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totalBookings = filteredReportBookings.length

  return (
    <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
      <CardHeader>
        <CardTitle className="text-white text-xl font-bold">Booking Reports</CardTitle>
        <CardDescription className="text-cyber-slate-300">
          Generate and view reports on customer bookings with various filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="grid gap-2">
            <Label htmlFor="report-start-date" className="text-cyber-slate-200">
              Start Date
            </Label>
            <Input
              id="report-start-date"
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-end-date" className="text-cyber-slate-200">
              End Date
            </Label>
            <Input
              id="report-end-date"
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-event-type" className="text-cyber-slate-200">
              Event Type
            </Label>
            <Select value={reportEventType} onValueChange={(value: EventType | "all") => setReportEventType(value)}>
              <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="match">Sports Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-status" className="text-cyber-slate-200">
              Booking Status
            </Label>
            <Select value={reportStatus} onValueChange={(value: Booking["status"] | "all") => setReportStatus(value)}>
              <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="grid gap-2">
            <Label htmlFor="report-event" className="text-cyber-slate-200">
              Specific Event
            </Label>
            <Select
              value={selectedEventIdForReports}
              onValueChange={(value: string | "all") => setSelectedEventIdForReports(value)}
            >
              <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event._id} value={event._id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-glass-dark border-white/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-red-400">₦{totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-cyber-slate-300">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-glass-dark border-white/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-red-400">{totalBookings}</div>
                <div className="text-sm text-cyber-slate-300">Total Bookings</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                <TableHead className="text-cyber-slate-200 font-semibold">Booking ID</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Customer</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Event</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Amount</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Status</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReportBookings.length > 0 ? (
                filteredReportBookings.map((booking) => (
                  <TableRow key={booking._id} className="border-white/20 hover:bg-glass-white transition-colors">
                    <TableCell className="font-medium text-white font-mono">{booking._id}</TableCell>
                    <TableCell className="text-cyber-slate-200">{booking.customerName}</TableCell>
                    <TableCell className="text-cyber-slate-200">{booking.eventTitle}</TableCell>
                    <TableCell className="text-cyber-slate-200">₦{booking.totalAmount.toLocaleString()}</TableCell>
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
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-cyber-slate-400 py-8">
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
