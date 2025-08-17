"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Activity,
  Ticket,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Event {
  _id: string
  title: string
  type: "movie" | "match"
  category: string
  date: string
  time: string
  hall_id: string
  total_seats: number
  bookedSeats?: string[]
  status: string
}

interface Booking {
  _id: string
  bookingCode: string
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
}

interface Hall {
  _id: string
  name: string
  capacity: number
  type: string
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<Event[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showAllBookings, setShowAllBookings] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "authenticated") {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [eventsRes, bookingsRes, hallsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/bookings"),
        fetch("/api/halls"),
      ])

      const [eventsData, bookingsData, hallsData] = await Promise.all([
        eventsRes.json(),
        bookingsRes.json(),
        hallsRes.json(),
      ])

      setEvents(eventsData)
      setBookings(bookingsData)
      setHalls(hallsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFilteredData = () => {
    let filteredBookings = bookings.filter((booking) => booking.status === "confirmed")

    if (selectedEventId !== "all") {
      filteredBookings = filteredBookings.filter((booking) => booking.eventId === selectedEventId)
    }

    if (dateRange !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      switch (dateRange) {
        case "today":
          filteredBookings = filteredBookings.filter((booking) => {
            const bookingDate = new Date(booking.createdAt)
            return bookingDate >= today
          })
          break
        case "yesterday":
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          filteredBookings = filteredBookings.filter((booking) => {
            const bookingDate = new Date(booking.createdAt)
            return bookingDate >= yesterday && bookingDate < today
          })
          break
        case "week":
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          filteredBookings = filteredBookings.filter((booking) => {
            const bookingDate = new Date(booking.createdAt)
            return bookingDate >= weekAgo
          })
          break
        case "month":
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          filteredBookings = filteredBookings.filter((booking) => {
            const bookingDate = new Date(booking.createdAt)
            return bookingDate >= monthAgo
          })
          break
        case "custom":
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate)
            const endDate = new Date(customEndDate)
            endDate.setHours(23, 59, 59, 999) // Include the entire end date
            filteredBookings = filteredBookings.filter((booking) => {
              const bookingDate = new Date(booking.createdAt)
              return bookingDate >= startDate && bookingDate <= endDate
            })
          }
          break
      }
    }

    return filteredBookings
  }

  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Use html2canvas and jsPDF for PDF generation
      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).default

      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        })

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const imgWidth = 210
        const pageHeight = 295
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight

        let position = 0

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        const selectedEvent = events.find((e) => e._id === selectedEventId)
        const fileName =
          selectedEventId === "all"
            ? `All_Events_Summary_Report_${new Date().toISOString().split("T")[0]}.pdf`
            : `${selectedEvent?.title.replace(/[^a-zA-Z0-9]/g, "_")}_Summary_Report_${new Date().toISOString().split("T")[0]}.pdf`

        pdf.save(fileName)
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Access Denied</div>
      </div>
    )
  }

  const filteredBookings = getFilteredData()
  const selectedEvent = events.find((e) => e._id === selectedEventId)
  const selectedHall = selectedEvent ? halls.find((h) => h._id === selectedEvent.hall_id) : null

  const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totalBookings = filteredBookings.length
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
  const occupancyRate = selectedEvent
    ? selectedEvent.total_seats > 0
      ? ((selectedEvent.bookedSeats?.length || 0) / selectedEvent.total_seats) * 100
      : 0
    : 0

  const uniqueCustomers = new Set(filteredBookings.map((booking) => booking.customerEmail)).size
  const customerEmails = filteredBookings.map((booking) => booking.customerEmail)
  const customerBookingCounts = customerEmails.reduce(
    (acc, email) => {
      acc[email] = (acc[email] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const repeatCustomers = Object.values(customerBookingCounts).filter((count) => count > 1).length
  const totalSeatsBooked = filteredBookings.reduce((sum, booking) => sum + booking.seats.length, 0)

  const reportDate = new Date().toLocaleDateString()
  const reportTime = new Date().toLocaleTimeString()

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
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-cyber-slate-300 hover:bg-glass-white group">
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                  Summary Reports
                </h1>
                <p className="text-sm text-brand-red-400 font-medium">Generate detailed booking reports</p>
              </div>
            </div>
            <Button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl shadow-cyber-card"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Controls */}
        <Card className="mb-8 bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyber-slate-300">Select Event</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="bg-glass-white/20 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-dark-800 border-white/20">
                    <SelectItem value="all" className="text-white hover:bg-white/10">
                      All Events Summary
                    </SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event._id} value={event._id} className="text-white hover:bg-white/10">
                        {event.title} ({event.type === "match" ? "Sports" : "Movie"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-cyber-slate-300">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-glass-white/20 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-dark-800 border-white/20">
                    <SelectItem value="all" className="text-white hover:bg-white/10">
                      All Time
                    </SelectItem>
                    <SelectItem value="today" className="text-white hover:bg-white/10">
                      Today
                    </SelectItem>
                    <SelectItem value="yesterday" className="text-white hover:bg-white/10">
                      Yesterday
                    </SelectItem>
                    <SelectItem value="week" className="text-white hover:bg-white/10">
                      Last 7 Days
                    </SelectItem>
                    <SelectItem value="month" className="text-white hover:bg-white/10">
                      Last 30 Days
                    </SelectItem>
                    <SelectItem value="custom" className="text-white hover:bg-white/10">
                      Custom Range
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyber-slate-300">Custom Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="flex-1 bg-glass-white/20 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="flex-1 bg-glass-white/20 border border-white/20 text-white rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-cyber-slate-400">
              Report generated on: {reportDate} at {reportTime}
              {dateRange !== "all" && (
                <span className="ml-4 text-brand-red-400 font-medium">
                  Filtered by: {dateRange === "custom" ? `${customStartDate} to ${customEndDate}` : dateRange}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div ref={reportRef} className="bg-white text-black p-8 rounded-lg shadow-lg">
          {/* Report Header */}
          <div className="text-center mb-8 border-b-2 border-brand-red-600 pb-6">
            <Image
              src="/dexcinema-logo.jpeg"
              alt="Dex View Cinema Logo"
              width={120}
              height={120}
              className="mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {selectedEventId === "all" ? "All Events Summary Report" : `${selectedEvent?.title} - Event Report`}
            </h2>
            <p className="text-gray-600">
              Generated on {reportDate} at {reportTime}
            </p>
          </div>

          {/* Executive Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-brand-red-600 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Executive Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-700">Total Revenue</span>
                </div>
                <div className="text-2xl font-bold text-green-600">₦{totalRevenue.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">Total Bookings</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-700">Unique Customers</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{uniqueCustomers}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-gray-700">Avg. Booking Value</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  ₦{Math.round(averageBookingValue).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Repeat Customers</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{repeatCustomers}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-700">Total Seats Sold</span>
                </div>
                <div className="text-2xl font-bold text-indigo-600">{totalSeatsBooked}</div>
              </div>
            </div>
          </div>

          {/* Event Details */}
          {selectedEvent && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-brand-red-600 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Event Details
              </h3>
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Event Title:</span>
                        <span className="font-medium">{selectedEvent.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{selectedEvent.type === "match" ? "Sports Match" : "Movie"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{selectedEvent.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{new Date(selectedEvent.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{selectedEvent.time}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Venue & Capacity</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hall:</span>
                        <span className="font-medium">{selectedHall?.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Seats:</span>
                        <span className="font-medium">{selectedEvent.total_seats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Booked Seats:</span>
                        <span className="font-medium">{selectedEvent.bookedSeats?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Seats:</span>
                        <span className="font-medium">
                          {selectedEvent.total_seats - (selectedEvent.bookedSeats?.length || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`font-medium ${selectedEvent.status === "active" ? "text-green-600" : "text-gray-600"}`}
                        >
                          {selectedEvent.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Analysis */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-brand-red-600 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Booking Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-4">Payment Methods</h4>
                <div className="space-y-3">
                  {Object.entries(
                    filteredBookings.reduce(
                      (acc, booking) => {
                        acc[booking.paymentMethod] = (acc[booking.paymentMethod] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([method, count]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-gray-600 capitalize">{method}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-sm text-gray-500">({((count / totalBookings) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seat Types */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-4">Seat Type Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(
                    filteredBookings.reduce(
                      (acc, booking) => {
                        acc[booking.seatType] = (acc[booking.seatType] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-gray-600">{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-sm text-gray-500">({((count / totalBookings) * 100).toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          {filteredBookings.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-brand-red-600 flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Recent Bookings
                </h3>
                {filteredBookings.length > 10 && (
                  <button
                    onClick={() => setShowAllBookings(!showAllBookings)}
                    className="px-4 py-2 bg-brand-red-600 text-white rounded-lg hover:bg-brand-red-700 transition-colors text-sm font-medium"
                  >
                    {showAllBookings ? "Show Summary (10)" : `Show All (${filteredBookings.length})`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Booking Code</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Customer</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Event</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Seats</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllBookings ? filteredBookings : filteredBookings.slice(0, 10)).map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{booking.bookingCode}</td>
                        <td className="border border-gray-300 px-4 py-2">{booking.customerName}</td>
                        <td className="border border-gray-300 px-4 py-2">{booking.eventTitle}</td>
                        <td className="border border-gray-300 px-4 py-2">{booking.seats.join(", ")}</td>
                        <td className="border border-gray-300 px-4 py-2 font-semibold">
                          ₦{booking.totalAmount.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-sm text-gray-500 mt-2">
                  {showAllBookings
                    ? `Showing all ${filteredBookings.length} bookings.`
                    : `Showing ${Math.min(10, filteredBookings.length)} of ${filteredBookings.length} bookings. ${filteredBookings.length > 10 ? 'Click "Show All" to view complete list.' : ""}`}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-300 pt-6 text-center text-sm text-gray-500">
            <p className="mb-2">This report was generated automatically by the Dex View Cinema management system.</p>
            <p>For questions or support, contact: support@dexviewcinema.com | 08139614950</p>
            <p className="mt-2">
              Developed by <strong>SydaTech</strong> - www.sydatech.com.ng
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
