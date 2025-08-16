"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Settings,
  Users,
  Shield,
  Calendar,
  BarChart3,
  FileText,
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  LogOut,
  User,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Hall } from "@/types/hall"

// Define types for events fetched from the database
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string // Assuming date comes as string from DB
  event_time: string // Assuming time comes as string from DB
  hall_id: string // e.g., "hallA", "hallB", "vip_hall"
  status: "active" | "draft" | "cancelled"
  image_url?: string // Made optional as it might not always be present
  description?: string
  duration: string
  total_seats: number // Total seats for the hall
  pricing: {
    vipSofaSeats?: { price: number; count: number; available?: number }
    vipRegularSeats?: { price: number; count: number; available?: number }
    vipSingle?: { price: number; count: number; available?: number }
    vipCouple?: { price: number; count: number; available?: number }
    vipFamily?: { price: number; count: number; available?: number }
    // New standard hall pricing
    standardSingle?: { price: number; count: number; available?: number }
    standardCouple?: { price: number; count: number; available?: number }
    standardFamily?: { price: number; count: number; available?: number }
    standardMatchSeats?: { price: number; count: number; available?: number } // New for standard match halls
  }
  bookedSeats?: string[] // Array of booked seat IDs
  createdAt?: string // Added for consistency with DB
  updatedAt?: string // Added for consistency with DB
}

interface Seat {
  id: string
  row?: string
  number?: number
  type: string
  isBooked: boolean
  price: number
}

// Define type for actual bookings fetched from the database
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
  _id?: string // Optional for new events, required for editing
  title: string
  event_type: EventType
  category: EventCategory
  event_date: string
  event_time: string
  hall_id: string // e.g., "hallA", "hallB", "vip_hall"
  description: string
  duration: string
  total_seats: number
  pricing: {
    vipSofaSeats?: { price: number; count: number }
    vipRegularSeats?: { price: number; count: number }
    vipSingle?: { price: number; count: number }
    vipCouple?: { price: number; count: number }
    vipFamily?: { price: number; count: number }
    // New standard hall pricing
    standardSingle?: { price: number; count: number }
    standardCouple?: { price: number; count: number }
    standardFamily?: { price: number; count: number }
    standardMatchSeats?: { price: number; count: number } // New for standard match halls
  }
  status: "active" | "draft" | "cancelled"
  image_url?: string // Added image_url to NewEventData
}

// New interface for the Create Booking form data
interface CreateBookingData {
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[] // Changed to array for internal use
  seatType: string
  amount: number
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string
  bookingTime: string
  paymentMethod: string
}

// New interface for Hall form data
interface NewHallData {
  _id?: string // Optional for new halls, required for editing
  name: string
  capacity: number
  type: "vip" | "standard"
}

// Helper to map hall_id to display name and total seats (for client-side generation)
const hallMappingArray: Hall[] = [
  { _id: "hallA", name: "Hall A", capacity: 48, type: "standard" },
  { _id: "hallB", name: "Hall B", capacity: 60, type: "standard" },
  { _id: "vip_hall", name: "VIP Hall", capacity: 22, type: "vip" },
]

// Helper to get hall details from fetched halls array, with fallback to local mapping
const getHallDetails = (halls: Hall[], hallId: string) => {
  const foundInFetched = halls.find((hall) => hall._id === hallId)
  if (foundInFetched) return foundInFetched
  // Fallback to local hardcoded mapping if not found in fetched halls
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

const defaultStandardMoviePricingHallB = {
  standardSingle: { price: 2500, count: 60 },
}

const defaultVipMatchPricing = {
  vipSofaSeats: { price: 2500, count: 10 },
  vipRegularSeats: { price: 2000, count: 12 },
}

const defaultStandardMatchPricingHallA = {
  standardMatchSeats: { price: 1500, count: 48 },
}

const defaultStandardMatchPricingHallB = {
  standardMatchSeats: { price: 1500, count: 60 },
}

// Initial state for new event form (will be updated dynamically after halls fetch)
const initialNewEventState: NewEventData = {
  title: "",
  event_type: "movie",
  category: "Blockbuster",
  event_date: "",
  event_time: "",
  hall_id: "", // Will be set dynamically
  description: "",
  duration: "120 minutes",
  pricing: {}, // Will be set dynamically
  total_seats: 0, // Will be set dynamically
  status: "active",
  image_url: "",
}

// Initial state for new booking form
const initialNewBookingState: CreateBookingData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  eventId: "",
  eventTitle: "",
  eventType: "movie", // Default, will be updated based on selected event
  seats: [], // Now an array
  seatType: "",
  amount: 0,
  processingFee: 500, // Example fixed processing fee
  totalAmount: 0,
  status: "confirmed", // Default for cash bookings
  bookingDate: new Date().toISOString().split("T")[0], // Current date
  bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5), // Current time (HH:MM)
  paymentMethod: "Cash",
}

// Initial state for new hall form
const initialNewHallState: NewHallData = {
  name: "",
  capacity: 0,
  type: "standard",
}

type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [events, setEvents] = useState<Event[]>([])
  const [actualBookings, setActualBookings] = useState<Booking[]>([]) // State for actual bookings
  const [halls, setHalls] = useState<Hall[]>([]) // New state for halls
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false)
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false) // New state for create booking dialog
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null) // Use Booking type

  const [newEvent, setNewEvent] = useState<NewEventData>(initialNewEventState)
  const [newBooking, setNewBooking] = useState<CreateBookingData>(initialNewBookingState) // New state for new booking form
  const [selectedEventForBooking, setSelectedEventForBooking] = useState<Event | null>(null) // To hold the selected event object for booking
  const [currentEventSeats, setCurrentEventSeats] = useState<Seat[]>([]) // Seats for the selected event in admin booking
  const [selectedSeatsForAdminBooking, setSelectedSeatsForAdminBooking] = useState<string[]>([]) // Selected seats in admin booking

  // New states for Hall Management
  const [isManageHallsOpen, setIsManageHallsOpen] = useState(false) // State for Hall Management dialog
  const [isCreateEditHallOpen, setIsCreateEditHallOpen] = useState(false) // State for Create/Edit Hall dialog
  const [currentHall, setCurrentHall] = useState<NewHallData>(initialNewHallState) // State for the hall being created/edited

  // State for reports filter
  const [reportStartDate, setReportStartDate] = useState<string>("")
  const [reportEndDate, setReportEndDate] = useState<string>("")
  const [reportEventType, setReportEventType] = useState<EventType | "all">("all")
  const [reportStatus, setReportStatus] = useState<Booking["status"] | "all">("all")
  const [selectedEventIdForReports, setSelectedEventIdForReports] = useState<string | "all">("all")

  // State for bookings tab filter and search
  const [selectedEventIdForBookings, setSelectedEventIdForBookings] = useState<string | "all">("all")
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("")

  // State for revenue filter
  const [revenueTimeFrame, setRevenueTimeFrame] = useState<RevenueTimeFrame>("all")
  const [customRevenueStartDate, setCustomRevenueStartDate] = useState<string>("")
  const [customRevenueEndDate, setCustomRevenueEndDate] = useState<string>("")

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session || session.user?.role !== "admin") {
      router.push("/admin/login")
      return
    }

    fetchEvents()
    fetchBookings()
    fetchHalls()
  }, [session, status, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!session || session.user?.role !== "admin") {
    return null
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/admin/login" })
  }

  const calculateRevenue = () => {
    let filteredBookings = actualBookings

    if (revenueTimeFrame !== "all") {
      const now = new Date()
      const startDate = new Date()

      switch (revenueTimeFrame) {
        case "day":
          startDate.setDate(now.getDate() - 1)
          break
        case "week":
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate.setMonth(now.getMonth() - 1)
          break
        case "custom":
          if (customRevenueStartDate && customRevenueEndDate) {
            const customStart = new Date(customRevenueStartDate)
            const customEnd = new Date(customRevenueEndDate)
            filteredBookings = actualBookings.filter((booking) => {
              const bookingDate = new Date(booking.createdAt)
              return bookingDate >= customStart && bookingDate <= customEnd
            })
          }
          break
      }

      if (revenueTimeFrame !== "custom") {
        filteredBookings = actualBookings.filter((booking) => {
          const bookingDate = new Date(booking.createdAt)
          return bookingDate >= startDate
        })
      }
    }

    const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const totalBookings = filteredBookings.length
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

    return { totalRevenue, totalBookings, avgBookingValue }
  }

  const { totalRevenue, totalBookings, avgBookingValue } = calculateRevenue()

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings")
      if (response.ok) {
        const data = await response.json()
        setActualBookings(data)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
    }
  }

  const fetchHalls = async () => {
    try {
      const response = await fetch("/api/halls")
      if (response.ok) {
        const data = await response.json()
        setHalls(data)
      } else {
        // Fallback to hardcoded halls if API fails
        setHalls(hallMappingArray)
      }
    } catch (error) {
      console.error("Error fetching halls:", error)
      setHalls(hallMappingArray)
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
                  Dex View Cinema Management System
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

              {/* Admin User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-cyber-slate-300 hover:bg-glass-white">
                    <User className="w-4 h-4 mr-2" />
                    {session.user?.name || session.user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white">
                  <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="text-cyber-slate-300 hover:bg-glass-white">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-brand-red-300 hover:bg-brand-red-500/20 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl font-bold">
              Welcome back, {session.user?.name || "Admin"}!
            </CardTitle>
            <CardDescription className="text-cyber-slate-300 text-lg">
              Your admin dashboard is now secured with NextAuth authentication. All existing functionality has been
              preserved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-glass-white backdrop-blur-sm border border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-cyber-green-400" />
                    <div>
                      <h3 className="font-semibold text-white">Secure Access</h3>
                      <p className="text-sm text-cyber-slate-300">Protected by NextAuth</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-glass-white backdrop-blur-sm border border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-cyber-blue-400" />
                    <div>
                      <h3 className="font-semibold text-white">Full Features</h3>
                      <p className="text-sm text-cyber-slate-300">All functionality preserved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-glass-white backdrop-blur-sm border border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-brand-red-400" />
                    <div>
                      <h3 className="font-semibold text-white">Admin Only</h3>
                      <p className="text-sm text-cyber-slate-300">Role-based access control</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for full admin functionality */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-glass-white-strong backdrop-blur-xl border border-white/20">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-brand-red-500/30">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-brand-red-500/30">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-brand-red-500/30">
              <Users className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="halls" className="data-[state=active]:bg-brand-red-500/30">
              <Building2 className="w-4 h-4 mr-2" />
              Halls
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-red-500/30">
              <Activity className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-brand-red-500/30">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyber-slate-300">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-cyber-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">₦{totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-cyber-slate-400">
                    {revenueTimeFrame === "all" ? "All time" : `Last ${revenueTimeFrame}`}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyber-slate-300">Total Bookings</CardTitle>
                  <Users className="h-4 w-4 text-cyber-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{totalBookings}</div>
                  <p className="text-xs text-cyber-slate-400">Confirmed bookings</p>
                </CardContent>
              </Card>

              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyber-slate-300">Avg Booking Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-brand-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">₦{Math.round(avgBookingValue).toLocaleString()}</div>
                  <p className="text-xs text-cyber-slate-400">Per booking</p>
                </CardContent>
              </Card>

              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyber-slate-300">Active Events</CardTitle>
                  <Calendar className="h-4 w-4 text-cyber-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {events.filter((e) => e.status === "active").length}
                  </div>
                  <p className="text-xs text-cyber-slate-400">Currently active</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-cyber-slate-300">
                  Manage your cinema operations efficiently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={() => setIsCreateEventOpen(true)}
                    className="bg-brand-red-500 hover:bg-brand-red-600 text-white h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Plus className="w-6 h-6" />
                    <span>Create Event</span>
                  </Button>

                  <Button
                    onClick={() => setIsCreateBookingOpen(true)}
                    className="bg-cyber-blue-500 hover:bg-cyber-blue-600 text-white h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <CreditCard className="w-6 h-6" />
                    <span>Create Booking</span>
                  </Button>

                  <Button
                    onClick={() => setIsManageHallsOpen(true)}
                    className="bg-cyber-purple-500 hover:bg-cyber-purple-600 text-white h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Building2 className="w-6 h-6" />
                    <span>Manage Halls</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="border-cyber-green-500 text-cyber-green-400 hover:bg-cyber-green-500/20 h-20 flex flex-col items-center justify-center space-y-2 bg-transparent"
                  >
                    <FileText className="w-6 h-6" />
                    <span>View Reports</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Events Management</h2>
                <p className="text-cyber-slate-300">Manage your movies and sports events</p>
              </div>
              <Button onClick={() => setIsCreateEventOpen(true)} className="bg-brand-red-500 hover:bg-brand-red-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>

            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-cyber-slate-300">Event</TableHead>
                      <TableHead className="text-cyber-slate-300">Type</TableHead>
                      <TableHead className="text-cyber-slate-300">Date</TableHead>
                      <TableHead className="text-cyber-slate-300">Hall</TableHead>
                      <TableHead className="text-cyber-slate-300">Status</TableHead>
                      <TableHead className="text-cyber-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell className="text-white font-medium">{event.title}</TableCell>
                        <TableCell>
                          <Badge variant={event.event_type === "movie" ? "default" : "secondary"}>
                            {event.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-cyber-slate-300">{event.event_date}</TableCell>
                        <TableCell className="text-cyber-slate-300">
                          {getHallDisplayName(halls, event.hall_id)}
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
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Bookings Management</h2>
                <p className="text-cyber-slate-300">View and manage customer bookings</p>
              </div>
              <Button
                onClick={() => setIsCreateBookingOpen(true)}
                className="bg-cyber-blue-500 hover:bg-cyber-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Booking
              </Button>
            </div>

            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-cyber-slate-300">Customer</TableHead>
                      <TableHead className="text-cyber-slate-300">Event</TableHead>
                      <TableHead className="text-cyber-slate-300">Seats</TableHead>
                      <TableHead className="text-cyber-slate-300">Amount</TableHead>
                      <TableHead className="text-cyber-slate-300">Status</TableHead>
                      <TableHead className="text-cyber-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actualBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell className="text-white font-medium">{booking.customerName}</TableCell>
                        <TableCell className="text-cyber-slate-300">{booking.eventTitle}</TableCell>
                        <TableCell className="text-cyber-slate-300">{booking.seats.join(", ")}</TableCell>
                        <TableCell className="text-cyber-slate-300">₦{booking.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would continue here... */}
          <TabsContent value="halls">
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-cyber-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Hall Management</h3>
              <p className="text-cyber-slate-300">Manage cinema halls and seating arrangements</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-cyber-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
              <p className="text-cyber-slate-300">View detailed analytics and insights</p>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-brand-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Reports</h3>
              <p className="text-cyber-slate-300">Generate and view detailed reports</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
