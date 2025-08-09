"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Printer,
  FileText,
  Search,
  CalendarDays,
  Ticket,
  DollarSign,
  Users,
  Film,
  Loader2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

interface Booking {
  _id: string
  customerName: string
  customerEmail: string
  eventId: string
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[]
  seatType: string
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string
  bookingTime: string
  createdAt: string
}

interface Event {
  _id: string
  title: string
  type: "movie" | "match"
  date: string
  time: string
  hall_id: string
  price: number
  vip_price?: number
  image: string
  description: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterEventType, setFilterEventType] = useState("all")
  const [filterDate, setFilterDate] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchBookingsAndEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const [bookingsRes, eventsRes] = await Promise.all([fetch("/api/bookings"), fetch("/api/events")])

        if (!bookingsRes.ok) {
          throw new Error(`Failed to fetch bookings: ${bookingsRes.statusText}`)
        }
        const bookingsData: Booking[] = await bookingsRes.json()
        setBookings(bookingsData)

        if (!eventsRes.ok) {
          throw new Error(`Failed to fetch events: ${eventsRes.statusText}`)
        }
        const eventsData: Event[] = await eventsRes.json()
        setEvents(eventsData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError((err as Error).message)
        toast({
          title: "Error loading bookings",
          description: (err as Error).message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBookingsAndEvents()
  }, [toast])

  const getEventTitle = (eventId: string) => {
    const event = events.find((e) => e._id === eventId)
    return event ? event.title : "N/A"
  }

  const getEventType = (eventId: string) => {
    const event = events.find((e) => e._id === eventId)
    return event ? event.type : "N/A"
  }

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEventTitle(booking.eventId).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || booking.status === filterStatus
    const matchesEventType = filterEventType === "all" || getEventType(booking.eventId) === filterEventType
    const matchesDate = filterDate === "" || booking.bookingDate === filterDate

    return matchesSearch && matchesStatus && matchesEventType && matchesDate
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading bookings...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white p-4">
        <XCircle className="w-16 h-16 text-brand-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error Loading Bookings</h1>
        <p className="text-lg text-cyber-slate-300 text-center">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 bg-brand-red-500 hover:bg-brand-red-600 text-white rounded-2xl"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 p-4 text-white sm:p-6 lg:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
          Bookings Management
        </h1>
        <Button className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-glow-green">
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-cyber-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{bookings.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-cyber-slate-300">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Ticket className="h-4 w-4 text-brand-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-cyber-slate-300">+180 since last hour</p>
          </CardContent>
        </Card>
        <Card className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Film className="h-4 w-4 text-cyber-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-cyber-slate-300">Currently running</p>
          </CardContent>
        </Card>
        <Card className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-cyber-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">75%</div>
            <p className="text-xs text-cyber-slate-300">+5% from last week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyber-slate-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-cyber-slate-800 pl-9 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 focus:ring-brand-red-500"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-cyber-slate-800 text-white focus:border-brand-red-500 focus:ring-brand-red-500 md:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-cyber-slate-800 text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger className="w-full rounded-xl border border-white/20 bg-cyber-slate-800 text-white focus:border-brand-red-500 focus:ring-brand-red-500 md:w-[180px]">
                  <SelectValue placeholder="Filter by Event Type" />
                </SelectTrigger>
                <SelectContent className="bg-cyber-slate-800 text-white">
                  <SelectItem value="all">All Event Types</SelectItem>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="match">Sports Match</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full md:w-[180px]">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyber-slate-400" />
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-cyber-slate-800 pl-9 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 focus:ring-brand-red-500"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/20">
            <Table className="w-full">
              <TableHeader className="bg-cyber-slate-700">
                <TableRow className="border-white/20">
                  <TableHead className="text-cyber-slate-200">Booking ID</TableHead>
                  <TableHead className="text-cyber-slate-200">Customer Name</TableHead>
                  <TableHead className="text-cyber-slate-200">Event</TableHead>
                  <TableHead className="text-cyber-slate-200">Seats</TableHead>
                  <TableHead className="text-cyber-slate-200">Amount</TableHead>
                  <TableHead className="text-cyber-slate-200">Status</TableHead>
                  <TableHead className="text-cyber-slate-200">Date</TableHead>
                  <TableHead className="text-cyber-slate-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking._id} className="border-white/10 hover:bg-cyber-slate-800/50">
                      <TableCell className="font-medium">{booking._id.substring(0, 8)}...</TableCell>
                      <TableCell>{booking.customerName}</TableCell>
                      <TableCell>{getEventTitle(booking.eventId)}</TableCell>
                      <TableCell>
                        {booking.seats
                          .map((seatId) => {
                            if (seatId.includes("-")) {
                              return seatId.split("-")[1]
                            }
                            return seatId
                          })
                          .join(", ")}
                      </TableCell>
                      <TableCell>₦{booking.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            booking.status === "confirmed"
                              ? "bg-cyber-green-600 hover:bg-cyber-green-700"
                              : booking.status === "pending"
                                ? "bg-yellow-600 hover:bg-yellow-700"
                                : "bg-brand-red-600 hover:bg-brand-red-700"
                          } text-white`}
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Link href={`/receipt/${booking._id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-xl shadow-cyber-card"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-cyber-slate-400">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
