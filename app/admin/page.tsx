"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Settings,
  Users,
  TrendingUp,
  Shield,
  Activity,
  Sparkles,
  BarChart3,
  Monitor,
  Building,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Search,
  RefreshCw,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall"

// Define types for events fetched from the database
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string
  event_time: string
  hall_id: string
  status: "active" | "draft" | "cancelled"
  image_url?: string
  description?: string
  duration: string
  total_seats: number
  pricing: {
    vipSofaSeats?: { price: number; count: number; available?: number }
    vipRegularSeats?: { price: number; count: number; available?: number }
    vipSingle?: { price: number; count: number; available?: number }
    vipCouple?: { price: number; count: number; available?: number }
    vipFamily?: { price: number; count: number; available?: number }
    standardSingle?: { price: number; count: number; available?: number }
    standardCouple?: { price: number; count: number; available?: number }
    standardFamily?: { price: number; count: number; available?: number }
    standardMatchSeats?: { price: number; count: number; available?: number }
  }
  bookedSeats?: string[]
  createdAt?: string
  updatedAt?: string
}

interface Seat {
  id: string
  row?: string
  number?: number
  type: string
  isBooked: boolean
  price: number
}

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

type EventType = "movie" | "match"
type EventCategory =
  | "Premium Match"
  | "Big Match"
  | "Blockbuster"
  | "Drama"
  | "Action"
  | "Champions League"
  | "Derby Match"

interface NewEventData {
  _id?: string
  title: string
  event_type: EventType
  category: EventCategory
  event_date: string
  event_time: string
  hall_id: string
  description: string
  duration: string
  total_seats: number
  pricing: {
    vipSofaSeats?: { price: number; count: number }
    vipRegularSeats?: { price: number; count: number }
    vipSingle?: { price: number; count: number }
    vipCouple?: { price: number; count: number }
    vipFamily?: { price: number; count: number }
    standardSingle?: { price: number; count: number }
    standardCouple?: { price: number; count: number }
    standardFamily?: { price: number; count: number }
    standardMatchSeats?: { price: number; count: number }
  }
  status: "active" | "draft" | "cancelled"
  image_url?: string
}

interface CreateBookingData {
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
}

interface NewHallData {
  _id?: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

const hallMappingArray: Hall[] = [
  { _id: "hallA", name: "Hall A", capacity: 48, type: "standard" },
  { _id: "hallB", name: "Hall B", capacity: 60, type: "standard" },
  { _id: "vip_hall", name: "VIP Hall", capacity: 22, type: "vip" },
]

const getHallDetails = (halls: Hall[], hallId: string) => {
  const foundInFetched = halls.find((hall) => hall._id === hallId)
  if (foundInFetched) return foundInFetched
  return hallMappingArray.find((hall) => hall._id === hallId)
}

const getHallDisplayName = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.name || hallId
const getHallTotalSeats = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.capacity || 0
const getHallType = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.type || "standard"

const defaultVipMoviePricing = {
  vipSingle: { price: 7500, count: 20 },
  vipCouple: { price: 15000, count: 14 },
  vipFamily: { price: 30000, count: 14 },
}

const defaultStandardMoviePricingHallA = {
  standardSingle: { price: 2500, count: 48 },
}

const initialNewEventState: NewEventData = {
  title: "",
  event_type: "movie",
  category: "Blockbuster",
  event_date: "",
  event_time: "",
  hall_id: "",
  description: "",
  duration: "120 minutes",
  pricing: {},
  total_seats: 0,
  status: "active",
  image_url: "",
}

const initialNewBookingState: CreateBookingData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  eventId: "",
  eventTitle: "",
  eventType: "movie" | "match",
  seats: [],
  seatType: "",
  amount: 0,
  processingFee: 500,
  totalAmount: 0,
  status: "confirmed",
  bookingDate: new Date().toISOString().split("T")[0],
  bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
  paymentMethod: "Cash",
}

const initialNewHallState: NewHallData = {
  name: "",
  capacity: 0,
  type: "standard",
}

type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [events, setEvents] = useState<Event[]>([])
  const [actualBookings, setActualBookings] = useState<Booking[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false)
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [newEvent, setNewEvent] = useState<NewEventData>(initialNewEventState)
  const [newBooking, setNewBooking] = useState<CreateBookingData>(initialNewBookingState)
  const [selectedEventForBooking, setSelectedEventForBooking] = useState<Event | null>(null)
  const [currentEventSeats, setCurrentEventSeats] = useState<Seat[]>([])
  const [selectedSeatsForAdminBooking, setSelectedSeatsForAdminBooking] = useState<string[]>([])
  const [isManageHallsOpen, setIsManageHallsOpen] = useState(false)
  const [isCreateEditHallOpen, setIsCreateEditHallOpen] = useState(false)
  const [currentHall, setCurrentHall] = useState<NewHallData>(initialNewHallState)
  const [reportStartDate, setReportStartDate] = useState<string>("")
  const [reportEndDate, setReportEndDate] = useState<string>("")
  const [reportEventType, setReportEventType] = useState<EventType | "all">("all")
  const [reportStatus, setReportStatus] = useState<Booking["status"] | "all">("all")
  const [selectedEventIdForReports, setSelectedEventIdForReports] = useState<string | "all">("all")
  const [selectedEventIdForBookings, setSelectedEventIdForBookings] = useState<string | "all">("all")
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("")
  const [revenueTimeFrame, setRevenueTimeFrame] = useState<RevenueTimeFrame>("all")
  const [customRevenueStartDate, setCustomRevenueStartDate] = useState<string>("")
  const [customRevenueEndDate, setCustomRevenueEndDate] = useState<string>("")

  const fetchHalls = useCallback(async () => {
    try {
      const res = await fetch("/api/halls")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Hall[] = await res.json()
      setHalls(data)
      if (data.length > 0 && newEvent.hall_id === "") {
        const defaultHall = data[0]
        setNewEvent((prev) => ({
          ...prev,
          hall_id: defaultHall._id,
          total_seats: defaultHall.capacity,
          pricing: defaultHall.type === "vip" ? defaultVipMoviePricing : defaultStandardMoviePricingHallA,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch halls:", error)
      toast({
        title: "Error fetching halls",
        description: "Could not load hall information from the database.",
        variant: "destructive",
      })
    }
  }, [newEvent.hall_id, toast])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Event[] = await res.json()
      const formattedEvents = data.map((event) => {
        const bookingsForEvent = actualBookings.filter((booking) => booking.eventId === event._id)
        const bookedSeatIds = bookingsForEvent.flatMap((booking) => booking.seats)
        return {
          ...event,
          bookedSeats: bookedSeatIds,
        }
      })
      setEvents(formattedEvents)
    } catch (error) {
      console.error("Failed to fetch events:", error)
      toast({
        title: "Error fetching events",
        description: "Could not load events from the database.",
        variant: "destructive",
      })
    }
  }, [actualBookings, toast])

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Booking[] = await res.json()
      setActualBookings(data)
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
      toast({
        title: "Error fetching bookings",
        description: "Could not load bookings from the database.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchHalls()
  }, [fetchHalls])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  useEffect(() => {
    if (actualBookings.length > 0 || events.length === 0) {
      fetchEvents()
    }
  }, [actualBookings, fetchEvents, events.length])

  const createEvent = useCallback(async () => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      toast({
        title: "Event created successfully",
        description: `${newEvent.title} has been added to the system.`,
      })

      setNewEvent(initialNewEventState)
      setIsCreateEventOpen(false)
      fetchEvents()
    } catch (error) {
      console.error("Failed to create event:", error)
      toast({
        title: "Error creating event",
        description: "Could not create the event. Please try again.",
        variant: "destructive",
      })
    }
  }, [newEvent, toast, fetchEvents])

  const updateEvent = useCallback(async () => {
    if (!newEvent._id) return
    try {
      const res = await fetch(`/api/events/${newEvent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      toast({
        title: "Event updated successfully",
        description: `${newEvent.title} has been updated.`,
      })

      setNewEvent(initialNewEventState)
      setIsEditEventOpen(false)
      fetchEvents()
    } catch (error) {
      console.error("Failed to update event:", error)
      toast({
        title: "Error updating event",
        description: "Could not update the event. Please try again.",
        variant: "destructive",
      })
    }
  }, [newEvent, toast, fetchEvents])

  const deleteEvent = useCallback(
    async (eventId: string) => {
      try {
        const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" })
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

        toast({
          title: "Event deleted successfully",
          description: "The event has been removed from the system.",
        })

        fetchEvents()
      } catch (error) {
        console.error("Failed to delete event:", error)
        toast({
          title: "Error deleting event",
          description: "Could not delete the event. Please try again.",
          variant: "destructive",
        })
      }
    },
    [toast, fetchEvents],
  )

  const createBooking = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBooking),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      toast({
        title: "Booking created successfully",
        description: `Booking for ${newBooking.customerName} has been created.`,
      })

      setNewBooking(initialNewBookingState)
      setIsCreateBookingOpen(false)
      fetchBookings()
    } catch (error) {
      console.error("Failed to create booking:", error)
      toast({
        title: "Error creating booking",
        description: "Could not create the booking. Please try again.",
        variant: "destructive",
      })
    }
  }, [newBooking, toast, fetchBookings])

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: Booking["status"]) => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

        toast({
          title: "Booking status updated",
          description: `Booking status changed to ${status}.`,
        })

        fetchBookings()
      } catch (error) {
        console.error("Failed to update booking status:", error)
        toast({
          title: "Error updating booking",
          description: "Could not update the booking status. Please try again.",
          variant: "destructive",
        })
      }
    },
    [toast, fetchBookings],
  )

  const createHall = useCallback(async () => {
    try {
      const res = await fetch("/api/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentHall),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      toast({
        title: "Hall created successfully",
        description: `${currentHall.name} has been added to the system.`,
      })

      setCurrentHall(initialNewHallState)
      setIsCreateEditHallOpen(false)
      fetchHalls()
    } catch (error) {
      console.error("Failed to create hall:", error)
      toast({
        title: "Error creating hall",
        description: "Could not create the hall. Please try again.",
        variant: "destructive",
      })
    }
  }, [currentHall, toast, fetchHalls])

  const filteredBookings = actualBookings.filter((booking) => {
    const matchesCustomer =
      customerSearchQuery === "" ||
      booking.customerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerPhone.includes(customerSearchQuery)

    const matchesEvent = selectedEventIdForBookings === "all" || booking.eventId === selectedEventIdForBookings
    const matchesStatus = reportStatus === "all" || booking.status === reportStatus

    return matchesCustomer && matchesEvent && matchesStatus
  })

  const filteredEvents = events.filter((event) => {
    const matchesType = reportEventType === "all" || event.event_type === reportEventType
    return matchesType
  })

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // Analytics calculations
  const totalRevenue = actualBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totalBookings = actualBookings.length
  const activeEventsCount = events.filter((e) => e.status === "active").length
  const totalBookedSeatsCount = events.reduce((sum, event) => sum + (event.bookedSeats?.length || 0), 0)
  const totalAvailableSeatsCount = events.reduce((sum, event) => sum + event.total_seats, 0)
  const overallOccupancyRate =
    totalAvailableSeatsCount > 0 ? (totalBookedSeatsCount / totalAvailableSeatsCount) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="relative group">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-4xl flex items-center justify-center shadow-glow-red transform group-hover:scale-110 transition-all duration-300">
                  <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-red-500 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-xs sm:text-sm font-medium bg-gradient-to-r from-brand-red-400 to-brand-red-300 bg-clip-text text-transparent">
                  Welcome, {session?.user?.email} | Dex View Cinema Management System
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
                >
                  <Shield className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Back to Site
                </Button>
              </Link>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-300 hover:bg-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
              >
                <LogOut className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 hover:border-cyber-green-500/50 transition-all duration-300 group shadow-cyber-card hover:shadow-cyber-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-cyber-slate-200">Total Revenue</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-cyber-green-500/20 to-cyber-green-600/20 rounded-4xl flex items-center justify-center border border-cyber-green-500/30 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-cyber-green-400 group-hover:rotate-12 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-white to-cyber-green-200 bg-clip-text text-transparent">
                ₦{totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-cyber-green-400 font-semibold">Based on confirmed bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 hover:border-cyber-blue-500/50 transition-all duration-300 group shadow-cyber-card hover:shadow-cyber-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-cyber-slate-200">Total Bookings</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-cyber-blue-500/20 to-cyber-blue-600/20 rounded-4xl flex items-center justify-center border border-cyber-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-cyber-blue-400 group-hover:bounce transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-white to-cyber-blue-200 bg-clip-text text-transparent">
                {totalBookings}
              </div>
              <p className="text-xs text-cyber-blue-400 font-semibold">All time bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 hover:border-brand-red-500/50 transition-all duration-300 group shadow-cyber-card hover:shadow-cyber-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-cyber-slate-200">Active Events</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-4xl flex items-center justify-center border border-brand-red-500/30 group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-6 h-6 text-brand-red-400 group-hover:pulse transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                {activeEventsCount}
              </div>
              <p className="text-xs text-brand-red-400 font-semibold">Currently running or upcoming</p>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 hover:border-cyber-purple-500/50 transition-all duration-300 group shadow-cyber-card hover:shadow-cyber-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-cyber-slate-200">Occupancy Rate</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-cyber-purple-500/20 to-cyber-purple-600/20 rounded-4xl flex items-center justify-center border border-cyber-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-cyber-purple-400 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-white to-cyber-purple-200 bg-clip-text text-transparent">
                {overallOccupancyRate.toFixed(0)}%
              </div>
              <p className="text-xs text-cyber-purple-400 font-semibold">Average across all halls</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-glass-white-strong backdrop-blur-xl border border-white/20 rounded-3xl h-auto sm:h-10">
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Monitor className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger
              value="halls"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Building className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Halls</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white text-xl font-bold">Events Management</CardTitle>
                    <CardDescription className="text-cyber-slate-300">
                      Manage your movies and sports events
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red rounded-2xl">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-glass-white-strong backdrop-blur-xl border border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create New Event</DialogTitle>
                        <DialogDescription className="text-cyber-slate-300">
                          Add a new movie or sports event to the system
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="title" className="text-cyber-slate-200">
                              Event Title
                            </Label>
                            <Input
                              id="title"
                              value={newEvent.title}
                              onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter event title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="event_type" className="text-cyber-slate-200">
                              Event Type
                            </Label>
                            <Select
                              value={newEvent.event_type}
                              onValueChange={(value: EventType) =>
                                setNewEvent((prev) => ({ ...prev, event_type: value }))
                              }
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                <SelectItem value="movie">Movie</SelectItem>
                                <SelectItem value="match">Sports Match</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category" className="text-cyber-slate-200">
                              Category
                            </Label>
                            <Select
                              value={newEvent.category}
                              onValueChange={(value: EventCategory) =>
                                setNewEvent((prev) => ({ ...prev, category: value }))
                              }
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                {newEvent.event_type === "movie" ? (
                                  <>
                                    <SelectItem value="Blockbuster">Blockbuster</SelectItem>
                                    <SelectItem value="Drama">Drama</SelectItem>
                                    <SelectItem value="Action">Action</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="Premium Match">Premium Match</SelectItem>
                                    <SelectItem value="Big Match">Big Match</SelectItem>
                                    <SelectItem value="Champions League">Champions League</SelectItem>
                                    <SelectItem value="Derby Match">Derby Match</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="hall_id" className="text-cyber-slate-200">
                              Hall
                            </Label>
                            <Select
                              value={newEvent.hall_id}
                              onValueChange={(value) => {
                                const selectedHall = getHallDetails(halls, value)
                                if (selectedHall) {
                                  const pricing =
                                    selectedHall.type === "vip"
                                      ? defaultVipMoviePricing
                                      : defaultStandardMoviePricingHallA
                                  setNewEvent((prev) => ({
                                    ...prev,
                                    hall_id: value,
                                    total_seats: selectedHall.capacity,
                                    pricing,
                                  }))
                                }
                              }}
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                {halls.map((hall) => (
                                  <SelectItem key={hall._id} value={hall._id}>
                                    {hall.name} ({hall.capacity} seats)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="event_date" className="text-cyber-slate-200">
                              Event Date
                            </Label>
                            <Input
                              id="event_date"
                              type="date"
                              value={newEvent.event_date}
                              onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                            />
                          </div>
                          <div>
                            <Label htmlFor="event_time" className="text-cyber-slate-200">
                              Event Time
                            </Label>
                            <Input
                              id="event_time"
                              type="time"
                              value={newEvent.event_time}
                              onChange={(e) => setNewEvent((prev) => ({ ...prev, event_time: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-cyber-slate-200">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                            className="bg-glass-white border-white/20 text-white"
                            placeholder="Enter event description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="duration" className="text-cyber-slate-200">
                              Duration
                            </Label>
                            <Input
                              id="duration"
                              value={newEvent.duration}
                              onChange={(e) => setNewEvent((prev) => ({ ...prev, duration: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="e.g., 120 minutes"
                            />
                          </div>
                          <div>
                            <Label htmlFor="image_url" className="text-cyber-slate-200">
                              Image URL
                            </Label>
                            <Input
                              id="image_url"
                              value={newEvent.image_url || ""}
                              onChange={(e) => setNewEvent((prev) => ({ ...prev, image_url: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter image URL"
                            />
                          </div>
                        </div>

                        {newEvent.hall_id && (
                          <div className="space-y-4">
                            <div className="border-t border-white/20 pt-4">
                              <Label className="text-cyber-slate-200 text-lg font-semibold">
                                Pricing Configuration
                              </Label>
                              <p className="text-cyber-slate-400 text-sm mt-1">
                                Set prices for different seat types in {getHallDisplayName(halls, newEvent.hall_id)}
                              </p>
                            </div>

                            {/* VIP Hall Pricing */}
                            {getHallType(halls, newEvent.hall_id) === "vip" && (
                              <div className="space-y-4">
                                {newEvent.event_type === "match" ? (
                                  // VIP Match Pricing
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="vip_sofa_price" className="text-cyber-slate-200">
                                        VIP Sofa Seats Price (₦)
                                      </Label>
                                      <Input
                                        id="vip_sofa_price"
                                        type="number"
                                        value={newEvent.pricing.vipSofaSeats?.price || ""}
                                        onChange={(e) =>
                                          setNewEvent((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              vipSofaSeats: {
                                                price: Number(e.target.value) || 0,
                                                count: 10,
                                              },
                                            },
                                          }))
                                        }
                                        className="bg-glass-white border-white/20 text-white"
                                        placeholder="Enter sofa seat price"
                                      />
                                      <p className="text-xs text-cyber-slate-400 mt-1">10 sofa seats available</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="vip_regular_price" className="text-cyber-slate-200">
                                        VIP Regular Seats Price (₦)
                                      </Label>
                                      <Input
                                        id="vip_regular_price"
                                        type="number"
                                        value={newEvent.pricing.vipRegularSeats?.price || ""}
                                        onChange={(e) =>
                                          setNewEvent((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              vipRegularSeats: {
                                                price: Number(e.target.value) || 0,
                                                count: 12,
                                              },
                                            },
                                          }))
                                        }
                                        className="bg-glass-white border-white/20 text-white"
                                        placeholder="Enter regular seat price"
                                      />
                                      <p className="text-xs text-cyber-slate-400 mt-1">12 regular seats available</p>
                                    </div>
                                  </div>
                                ) : (
                                  // VIP Movie Pricing
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <Label htmlFor="vip_single_price" className="text-cyber-slate-200">
                                        VIP Single Price (₦)
                                      </Label>
                                      <Input
                                        id="vip_single_price"
                                        type="number"
                                        value={newEvent.pricing.vipSingle?.price || ""}
                                        onChange={(e) =>
                                          setNewEvent((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              vipSingle: {
                                                price: Number(e.target.value) || 0,
                                                count: 20,
                                              },
                                            },
                                          }))
                                        }
                                        className="bg-glass-white border-white/20 text-white"
                                        placeholder="Single seat price"
                                      />
                                      <p className="text-xs text-cyber-slate-400 mt-1">20 single seats</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="vip_couple_price" className="text-cyber-slate-200">
                                        VIP Couple Price (₦)
                                      </Label>
                                      <Input
                                        id="vip_couple_price"
                                        type="number"
                                        value={newEvent.pricing.vipCouple?.price || ""}
                                        onChange={(e) =>
                                          setNewEvent((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              vipCouple: {
                                                price: Number(e.target.value) || 0,
                                                count: 14,
                                              },
                                            },
                                          }))
                                        }
                                        className="bg-glass-white border-white/20 text-white"
                                        placeholder="Couple seat price"
                                      />
                                      <p className="text-xs text-cyber-slate-400 mt-1">14 couple seats</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="vip_family_price" className="text-cyber-slate-200">
                                        VIP Family Price (₦)
                                      </Label>
                                      <Input
                                        id="vip_family_price"
                                        type="number"
                                        value={newEvent.pricing.vipFamily?.price || ""}
                                        onChange={(e) =>
                                          setNewEvent((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              vipFamily: {
                                                price: Number(e.target.value) || 0,
                                                count: 14,
                                              },
                                            },
                                          }))
                                        }
                                        className="bg-glass-white border-white/20 text-white"
                                        placeholder="Family seat price"
                                      />
                                      <p className="text-xs text-cyber-slate-400 mt-1">14 family seats</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Standard Hall Pricing */}
                            {getHallType(halls, newEvent.hall_id) === "standard" && (
                              <div className="space-y-4">
                                {newEvent.event_type === "match" ? (
                                  // Standard Match Pricing
                                  <div>
                                    <Label htmlFor="standard_match_price" className="text-cyber-slate-200">
                                      Standard Match Seats Price (₦)
                                    </Label>
                                    <Input
                                      id="standard_match_price"
                                      type="number"
                                      value={newEvent.pricing.standardMatchSeats?.price || ""}
                                      onChange={(e) =>
                                        setNewEvent((prev) => ({
                                          ...prev,
                                          pricing: {
                                            ...prev.pricing,
                                            standardMatchSeats: {
                                              price: Number(e.target.value) || 0,
                                              count: getHallTotalSeats(halls, newEvent.hall_id),
                                            },
                                          },
                                        }))
                                      }
                                      className="bg-glass-white border-white/20 text-white"
                                      placeholder="Enter match seat price"
                                    />
                                    <p className="text-xs text-cyber-slate-400 mt-1">
                                      {getHallTotalSeats(halls, newEvent.hall_id)} seats available
                                    </p>
                                  </div>
                                ) : (
                                  // Standard Movie Pricing
                                  <div>
                                    <Label htmlFor="standard_single_price" className="text-cyber-slate-200">
                                      Standard Single Seats Price (₦)
                                    </Label>
                                    <Input
                                      id="standard_single_price"
                                      type="number"
                                      value={newEvent.pricing.standardSingle?.price || ""}
                                      onChange={(e) =>
                                        setNewEvent((prev) => ({
                                          ...prev,
                                          pricing: {
                                            ...prev.pricing,
                                            standardSingle: {
                                              price: Number(e.target.value) || 0,
                                              count: getHallTotalSeats(halls, newEvent.hall_id),
                                            },
                                          },
                                        }))
                                      }
                                      className="bg-glass-white border-white/20 text-white"
                                      placeholder="Enter single seat price"
                                    />
                                    <p className="text-xs text-cyber-slate-400 mt-1">
                                      {getHallTotalSeats(halls, newEvent.hall_id)} seats available
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateEventOpen(false)}
                          className="border-white/20 text-cyber-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createEvent}
                          className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white"
                        >
                          Create Event
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Events Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select
                      value={reportEventType}
                      onValueChange={(value: EventType | "all") => setReportEventType(value)}
                    >
                      <SelectTrigger className="bg-glass-white border-white/20 text-white w-full sm:w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="movie">Movies</SelectItem>
                        <SelectItem value="match">Sports Matches</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={fetchEvents}
                      variant="outline"
                      className="border-white/20 text-cyber-slate-300 bg-transparent"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {/* Events Table */}
                  <div className="rounded-lg border border-white/20 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-white/5">
                          <TableHead className="text-cyber-slate-200">Event</TableHead>
                          <TableHead className="text-cyber-slate-200">Type</TableHead>
                          <TableHead className="text-cyber-slate-200">Hall</TableHead>
                          <TableHead className="text-cyber-slate-200">Date & Time</TableHead>
                          <TableHead className="text-cyber-slate-200">Status</TableHead>
                          <TableHead className="text-cyber-slate-200">Occupancy</TableHead>
                          <TableHead className="text-cyber-slate-200">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event) => {
                          const bookedSeats = event.bookedSeats?.length || 0
                          const occupancyRate = event.total_seats > 0 ? (bookedSeats / event.total_seats) * 100 : 0

                          return (
                            <TableRow key={event._id} className="border-white/20 hover:bg-white/5">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-white">{event.title}</div>
                                  <div className="text-sm text-cyber-slate-400">{event.category}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={event.event_type === "movie" ? "default" : "secondary"}
                                  className="capitalize"
                                >
                                  {event.event_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-cyber-slate-300">
                                {getHallDisplayName(halls, event.hall_id)}
                              </TableCell>
                              <TableCell>
                                <div className="text-cyber-slate-300">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(event.event_date).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.event_time}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    event.status === "active"
                                      ? "default"
                                      : event.status === "draft"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="capitalize"
                                >
                                  {event.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-cyber-slate-300">
                                  <div className="text-sm">
                                    {bookedSeats}/{event.total_seats}
                                  </div>
                                  <div className="text-xs text-cyber-slate-400">{occupancyRate.toFixed(0)}%</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setNewEvent(event)
                                      setIsEditEventOpen(true)
                                    }}
                                    className="border-white/20 text-cyber-slate-300 hover:bg-white/10"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteEvent(event._id)}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white text-xl font-bold">Customer Bookings</CardTitle>
                    <CardDescription className="text-cyber-slate-300">
                      View and manage customer bookings
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateBookingOpen} onOpenChange={setIsCreateBookingOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 hover:from-cyber-blue-600 hover:to-cyber-blue-700 text-white shadow-glow-blue rounded-2xl">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-glass-white-strong backdrop-blur-xl border border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create New Booking</DialogTitle>
                        <DialogDescription className="text-cyber-slate-300">
                          Create a booking for a customer
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="customerName" className="text-cyber-slate-200">
                              Customer Name
                            </Label>
                            <Input
                              id="customerName"
                              value={newBooking.customerName}
                              onChange={(e) => setNewBooking((prev) => ({ ...prev, customerName: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter customer name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customerEmail" className="text-cyber-slate-200">
                              Customer Email
                            </Label>
                            <Input
                              id="customerEmail"
                              type="email"
                              value={newBooking.customerEmail}
                              onChange={(e) => setNewBooking((prev) => ({ ...prev, customerEmail: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter customer email"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="customerPhone" className="text-cyber-slate-200">
                              Customer Phone
                            </Label>
                            <Input
                              id="customerPhone"
                              value={newBooking.customerPhone}
                              onChange={(e) => setNewBooking((prev) => ({ ...prev, customerPhone: e.target.value }))}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter customer phone"
                            />
                          </div>
                          <div>
                            <Label htmlFor="eventId" className="text-cyber-slate-200">
                              Event
                            </Label>
                            <Select
                              value={newBooking.eventId}
                              onValueChange={(value) => {
                                const selectedEvent = events.find((e) => e._id === value)
                                if (selectedEvent) {
                                  setNewBooking((prev) => ({
                                    ...prev,
                                    eventId: value,
                                    eventTitle: selectedEvent.title,
                                    eventType: selectedEvent.event_type,
                                  }))
                                }
                              }}
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue placeholder="Select event" />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                {events.map((event) => (
                                  <SelectItem key={event._id} value={event._id}>
                                    {event.title} - {new Date(event.event_date).toLocaleDateString()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="seatType" className="text-cyber-slate-200">
                              Seat Type
                            </Label>
                            <Select
                              value={newBooking.seatType}
                              onValueChange={(value) => setNewBooking((prev) => ({ ...prev, seatType: value }))}
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue placeholder="Select seat type" />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                <SelectItem value="vipSingle">VIP Single</SelectItem>
                                <SelectItem value="vipCouple">VIP Couple</SelectItem>
                                <SelectItem value="vipFamily">VIP Family</SelectItem>
                                <SelectItem value="standardSingle">Standard Single</SelectItem>
                                <SelectItem value="standardCouple">Standard Couple</SelectItem>
                                <SelectItem value="standardFamily">Standard Family</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="amount" className="text-cyber-slate-200">
                              Amount (₦)
                            </Label>
                            <Input
                              id="amount"
                              type="number"
                              value={newBooking.amount}
                              onChange={(e) => {
                                const amount = Number.parseInt(e.target.value) || 0
                                setNewBooking((prev) => ({
                                  ...prev,
                                  amount,
                                  totalAmount: amount + prev.processingFee,
                                }))
                              }}
                              className="bg-glass-white border-white/20 text-white"
                              placeholder="Enter amount"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="paymentMethod" className="text-cyber-slate-200">
                              Payment Method
                            </Label>
                            <Select
                              value={newBooking.paymentMethod}
                              onValueChange={(value) => setNewBooking((prev) => ({ ...prev, paymentMethod: value }))}
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                                <SelectItem value="Transfer">Transfer</SelectItem>
                                <SelectItem value="Online">Online</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="status" className="text-cyber-slate-200">
                              Status
                            </Label>
                            <Select
                              value={newBooking.status}
                              onValueChange={(value: Booking["status"]) =>
                                setNewBooking((prev) => ({ ...prev, status: value }))
                              }
                            >
                              <SelectTrigger className="bg-glass-white border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="bg-glass-white/10 p-4 rounded-lg">
                          <div className="flex justify-between text-cyber-slate-300">
                            <span>Subtotal:</span>
                            <span>₦{newBooking.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-cyber-slate-300">
                            <span>Processing Fee:</span>
                            <span>₦{newBooking.processingFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-white font-bold border-t border-white/20 pt-2 mt-2">
                            <span>Total:</span>
                            <span>₦{newBooking.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateBookingOpen(false)}
                          className="border-white/20 text-cyber-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createBooking}
                          className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 text-white"
                        >
                          Create Booking
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Bookings Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Search customers..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="bg-glass-white border-white/20 text-white pl-10"
                      />
                    </div>
                    <Select value={selectedEventIdForBookings} onValueChange={setSelectedEventIdForBookings}>
                      <SelectTrigger className="bg-glass-white border-white/20 text-white w-full sm:w-48">
                        <SelectValue placeholder="Filter by event" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                        <SelectItem value="all">All Events</SelectItem>
                        {events.map((event) => (
                          <SelectItem key={event._id} value={event._id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={reportStatus}
                      onValueChange={(value: Booking["status"] | "all") => setReportStatus(value)}
                    >
                      <SelectTrigger className="bg-glass-white border-white/20 text-white w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bookings Table */}
                  <div className="rounded-lg border border-white/20 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-white/5">
                          <TableHead className="text-cyber-slate-200">Customer</TableHead>
                          <TableHead className="text-cyber-slate-200">Event</TableHead>
                          <TableHead className="text-cyber-slate-200">Seats</TableHead>
                          <TableHead className="text-cyber-slate-200">Amount</TableHead>
                          <TableHead className="text-cyber-slate-200">Status</TableHead>
                          <TableHead className="text-cyber-slate-200">Date</TableHead>
                          <TableHead className="text-cyber-slate-200">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => (
                          <TableRow key={booking._id} className="border-white/20 hover:bg-white/5">
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">{booking.customerName}</div>
                                <div className="text-sm text-cyber-slate-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {booking.customerEmail}
                                </div>
                                <div className="text-sm text-cyber-slate-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {booking.customerPhone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-white">{booking.eventTitle}</div>
                                <div className="text-sm text-cyber-slate-400 capitalize">{booking.eventType}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyber-slate-300">
                                <div className="text-sm">{booking.seats.join(", ")}</div>
                                <div className="text-xs text-cyber-slate-400 capitalize">{booking.seatType}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyber-slate-300">
                                <div className="font-medium">₦{booking.totalAmount.toLocaleString()}</div>
                                <div className="text-xs text-cyber-slate-400 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {booking.paymentMethod}
                                </div>
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
                                className="capitalize"
                              >
                                {booking.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                                {booking.status === "pending" && <AlertCircle className="w-3 h-3 mr-1" />}
                                {booking.status === "cancelled" && <XCircle className="w-3 h-3 mr-1" />}
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyber-slate-300">
                                <div className="text-sm">{new Date(booking.bookingDate).toLocaleDateString()}</div>
                                <div className="text-xs text-cyber-slate-400">{booking.bookingTime}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking)
                                    setIsPrintReceiptOpen(true)
                                  }}
                                  className="border-white/20 text-cyber-slate-300 hover:bg-white/10"
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>
                                {booking.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateBookingStatus(booking._id, "confirmed")}
                                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                )}
                                {booking.status !== "cancelled" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateBookingStatus(booking._id, "cancelled")}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="halls">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white text-xl font-bold">Halls Management</CardTitle>
                    <CardDescription className="text-cyber-slate-300">
                      Create, update, or delete cinema halls and venues
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateEditHallOpen} onOpenChange={setIsCreateEditHallOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-cyber-purple-500 to-cyber-purple-600 hover:from-cyber-purple-600 hover:to-cyber-purple-700 text-white shadow-glow-purple rounded-2xl">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Hall
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-glass-white-strong backdrop-blur-xl border border-white/20">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          {currentHall._id ? "Edit Hall" : "Create New Hall"}
                        </DialogTitle>
                        <DialogDescription className="text-cyber-slate-300">
                          {currentHall._id ? "Update hall information" : "Add a new cinema hall to the system"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="hallName" className="text-cyber-slate-200">
                            Hall Name
                          </Label>
                          <Input
                            id="hallName"
                            value={currentHall.name}
                            onChange={(e) => setCurrentHall((prev) => ({ ...prev, name: e.target.value }))}
                            className="bg-glass-white border-white/20 text-white"
                            placeholder="Enter hall name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="capacity" className="text-cyber-slate-200">
                            Capacity
                          </Label>
                          <Input
                            id="capacity"
                            type="number"
                            value={currentHall.capacity}
                            onChange={(e) =>
                              setCurrentHall((prev) => ({ ...prev, capacity: Number.parseInt(e.target.value) || 0 }))
                            }
                            className="bg-glass-white border-white/20 text-white"
                            placeholder="Enter hall capacity"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hallType" className="text-cyber-slate-200">
                            Hall Type
                          </Label>
                          <Select
                            value={currentHall.type}
                            onValueChange={(value: "vip" | "standard") =>
                              setCurrentHall((prev) => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger className="bg-glass-white border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateEditHallOpen(false)}
                          className="border-white/20 text-cyber-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createHall}
                          className="bg-gradient-to-r from-cyber-purple-500 to-cyber-purple-600 text-white"
                        >
                          {currentHall._id ? "Update Hall" : "Create Hall"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {halls.map((hall) => (
                    <Card
                      key={hall._id}
                      className="bg-glass-white backdrop-blur-xl border border-white/20 hover:border-cyber-purple-500/50 transition-all duration-300 group"
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-lg">{hall.name}</CardTitle>
                            <CardDescription className="text-cyber-slate-300 capitalize">
                              {hall.type} Hall
                            </CardDescription>
                          </div>
                          <Badge variant={hall.type === "vip" ? "default" : "secondary"} className="capitalize">
                            {hall.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-cyber-slate-300">
                            <Users className="w-4 h-4" />
                            <span>{hall.capacity} seats</span>
                          </div>
                          <div className="flex items-center gap-2 text-cyber-slate-300">
                            <MapPin className="w-4 h-4" />
                            <span>Cinema Hall</span>
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentHall(hall)
                                setIsCreateEditHallOpen(true)
                              }}
                              className="border-white/20 text-cyber-slate-300 hover:bg-white/10 flex-1"
                            >
                              <Edit className="w-3 h-3 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20 bg-transparent"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Analytics Dashboard</CardTitle>
                <CardDescription className="text-cyber-slate-300">View detailed analytics and reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Revenue Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-glass-white backdrop-blur-xl border border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Revenue Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Total Revenue</span>
                            <span className="text-2xl font-bold text-cyber-green-400">
                              ₦{totalRevenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Average per Booking</span>
                            <span className="text-lg font-semibold text-white">
                              ₦{totalBookings > 0 ? Math.round(totalRevenue / totalBookings).toLocaleString() : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Total Bookings</span>
                            <span className="text-lg font-semibold text-cyber-blue-400">{totalBookings}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-glass-white backdrop-blur-xl border border-white/20">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Occupancy Statistics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Overall Occupancy</span>
                            <span className="text-2xl font-bold text-cyber-purple-400">
                              {overallOccupancyRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Total Seats Booked</span>
                            <span className="text-lg font-semibold text-white">{totalBookedSeatsCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-cyber-slate-300">Total Available Seats</span>
                            <span className="text-lg font-semibold text-cyber-slate-400">
                              {totalAvailableSeatsCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Event Performance */}
                  <Card className="bg-glass-white backdrop-blur-xl border border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Event Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {events.slice(0, 5).map((event) => {
                          const eventBookings = actualBookings.filter((b) => b.eventId === event._id)
                          const eventRevenue = eventBookings.reduce((sum, b) => sum + b.totalAmount, 0)
                          const occupancyRate =
                            event.total_seats > 0 ? ((event.bookedSeats?.length || 0) / event.total_seats) * 100 : 0

                          return (
                            <div
                              key={event._id}
                              className="flex justify-between items-center p-4 bg-glass-white/10 rounded-lg"
                            >
                              <div>
                                <div className="font-medium text-white">{event.title}</div>
                                <div className="text-sm text-cyber-slate-400">
                                  {event.category} • {getHallDisplayName(halls, event.hall_id)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-cyber-green-400 font-semibold">
                                  ₦{eventRevenue.toLocaleString()}
                                </div>
                                <div className="text-sm text-cyber-slate-400">{occupancyRate.toFixed(0)}% occupied</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Receipt Print Dialog */}
        <Dialog open={isPrintReceiptOpen} onOpenChange={setIsPrintReceiptOpen}>
          <DialogContent className="bg-glass-white-strong backdrop-blur-xl border border-white/20 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Booking Receipt</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4 py-4">
                <div className="text-center border-b border-white/20 pb-4">
                  <h3 className="text-lg font-bold text-white">Dex View Cinema</h3>
                  <p className="text-sm text-cyber-slate-400">Booking Confirmation</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Booking ID:</span>
                    <span className="text-white font-mono text-sm">{selectedBooking._id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Customer:</span>
                    <span className="text-white">{selectedBooking.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Event:</span>
                    <span className="text-white">{selectedBooking.eventTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Seats:</span>
                    <span className="text-white">{selectedBooking.seats.join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Date:</span>
                    <span className="text-white">{new Date(selectedBooking.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Time:</span>
                    <span className="text-white">{selectedBooking.bookingTime}</span>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Subtotal:</span>
                    <span className="text-white">₦{selectedBooking.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-slate-300">Processing Fee:</span>
                    <span className="text-white">₦{selectedBooking.processingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-white/20 pt-2 mt-2">
                    <span className="text-white">Total:</span>
                    <span className="text-cyber-green-400">₦{selectedBooking.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-center text-xs text-cyber-slate-400 border-t border-white/20 pt-4">
                  <p>Thank you for choosing Dex View Cinema!</p>
                  <p>Please arrive 15 minutes before showtime.</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPrintReceiptOpen(false)}
                className="border-white/20 text-cyber-slate-300"
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
          <DialogContent className="bg-glass-white-strong backdrop-blur-xl border border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Event</DialogTitle>
              <DialogDescription className="text-cyber-slate-300">Update event information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Same form fields as create event */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-title" className="text-cyber-slate-200">
                    Event Title
                  </Label>
                  <Input
                    id="edit-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                    className="bg-glass-white border-white/20 text-white"
                    placeholder="Enter event title"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-event_type" className="text-cyber-slate-200">
                    Event Type
                  </Label>
                  <Select
                    value={newEvent.event_type}
                    onValueChange={(value: EventType) => setNewEvent((prev) => ({ ...prev, event_type: value }))}
                  >
                    <SelectTrigger className="bg-glass-white border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20">
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="match">Sports Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Add other form fields similar to create event */}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditEventOpen(false)}
                className="border-white/20 text-cyber-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={updateEvent} className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                Update Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
