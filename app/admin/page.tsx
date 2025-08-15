"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  eventType: "movie",
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
                <CardTitle className="text-white text-xl font-bold">Events Management</CardTitle>
                <CardDescription className="text-cyber-slate-300">Manage your movies and sports events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-cyber-slate-400 py-8">
                  Events management interface will be implemented here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Customer Bookings</CardTitle>
                <CardDescription className="text-cyber-slate-300">View and manage customer bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-cyber-slate-400 py-8">
                  Bookings management interface will be implemented here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="halls">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Halls Management</CardTitle>
                <CardDescription className="text-cyber-slate-300">
                  Create, update, or delete cinema halls and venues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-cyber-slate-400 py-8">
                  Halls management interface will be implemented here.
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
                <div className="text-center text-cyber-slate-400 py-8">
                  Analytics interface will be implemented here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
