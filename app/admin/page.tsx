"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CalendarIcon,
  Clock,
  Edit,
  Eye,
  Film,
  Plus,
  Settings,
  Trash2,
  Trophy,
  Users,
  TrendingUp,
  Shield,
  Activity,
  Sparkles,
  BarChart3,
  Monitor,
  MapPin,
  Printer,
  Filter,
  Search,
  ImageIcon,
  Building,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall" // Import the new Hall type

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

// Seat layout for VIP Hall matches (10 sofa, 12 regular)
const generateVipMatchSeats = (eventPricing: Event["pricing"], bookedSeats: string[] = []) => {
  const seats: Seat[] = []
  // VIP Sofa Seats (10 seats) - 2 rows of 5 each
  const sofaRows = ["S1", "S2"]
  sofaRows.forEach((row) => {
    for (let i = 1; i <= 5; i++) {
      const seatId = `${row}${i}`
      seats.push({
        id: seatId,
        row: row,
        number: i,
        type: "sofa",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipSofaSeats?.price || 0,
      })
    }
  })

  // VIP Regular Seats (12 seats) - 2 rows of 6 each
  const regularRows = ["A", "B"]
  regularRows.forEach((row) => {
    for (let i = 1; i <= 6; i++) {
      const seatId = `${row}${i}`
      seats.push({
        id: seatId,
        row: row,
        number: i,
        type: "regular",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipRegularSeats?.price || 0,
      })
    }
  })
  return seats
}

// Seat layout for Standard Hall A or Hall B matches (all single seats)
const generateStandardMatchSeats = (
  eventPricing: Event["pricing"],
  hallId: string,
  halls: Hall[],
  bookedSeats: string[] = [],
) => {
  const seats: Seat[] = []
  const totalSeats = getHallTotalSeats(halls, hallId) // Use passed halls
  for (let i = 1; i <= totalSeats; i++) {
    const seatId = `${hallId.toUpperCase()}-${i}`
    seats.push({
      id: seatId,
      type: "standardMatch",
      isBooked: bookedSeats.includes(seatId),
      price: eventPricing?.standardMatchSeats?.price || 0,
    })
  }
  return seats
}

// Seat layout for movies based on hall type
const generateMovieSeats = (
  eventPricing: Event["pricing"],
  hallId: string,
  halls: Hall[],
  bookedSeats: string[] = [],
) => {
  const seats: Seat[] = []
  const hallType = getHallType(halls, hallId) // Use passed halls
  const totalSeats = getHallTotalSeats(halls, hallId) // Use passed halls

  if (hallType === "vip") {
    // VIP Movie Hall (20 single, 14 couple, 14 family)
    // VIP Single Seats (20 seats)
    for (let i = 1; i <= 20; i++) {
      const seatId = `S${i}`
      seats.push({
        id: seatId,
        type: "vipSingle",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipSingle?.price || 0,
      })
    }

    // VIP Couple Seats (14 seats - 7 couple pods)
    for (let i = 1; i <= 7; i++) {
      const seatId = `C${i}`
      seats.push({
        id: seatId,
        type: "vipCouple",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipCouple?.price || 0,
      })
    }

    // VIP Family Seats (14 seats - 14 family sections)
    for (let i = 1; i <= 14; i++) {
      const seatId = `F${i}`
      seats.push({
        id: seatId,
        type: "vipFamily",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipFamily?.price || 0,
      })
    }
  } else {
    // Standard Movie Halls (Hall A, Hall B) - all single seats
    for (let i = 1; i <= totalSeats; i++) {
      const seatId = `${hallId.toUpperCase()}-${i}`
      seats.push({
        id: seatId,
        type: "standardSingle",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.standardSingle?.price || 0,
      })
    }
  }
  return seats
}

const getSeatTypeName = (type: string) => {
  switch (type) {
    case "sofa":
      return "VIP Sofa"
    case "regular":
      return "VIP Regular"
    case "vipSingle":
      return "VIP Single"
    case "vipCouple":
      return "VIP Couple"
    case "vipFamily":
      return "VIP Family"
    case "standardSingle":
      return "Standard Single"
    case "standardMatch":
      return "Standard Match"
    default:
      return "Seat"
  }
}

export default function AdminDashboard() {
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

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/admin/signout", {
        method: "POST",
      })

      if (response.ok) {
        router.push("/admin/signin")
      }
    } catch (error) {
      console.error("Signout error:", error)
    }
  }

  const handleEventTypeChange = (value: EventType) => {
    setNewEvent({ ...newEvent, event_type: value, category: value === "movie" ? "Blockbuster" : "Premium Match" })
  }

  const handleCategoryChange = (value: EventCategory) => {
    setNewEvent({ ...newEvent, category: value })
  }

  const handleCreateEvent = async () => {
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEvent),
      })

      if (response.ok) {
        toast({
          title: "Event created successfully!",
          description: "The new event has been added to the schedule.",
        })
        setIsCreateEventOpen(false) // Close the dialog
        setNewEvent(initialNewEventState) // Reset the form
        fetchEvents() // Refresh the events list
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create event.",
          description: "Please check the form data and try again.",
        })
      }
    } catch (error) {
      console.error("Create event error:", error)
      toast({
        variant: "destructive",
        title: "An error occurred.",
        description: "Could not create the event. Please try again later.",
      })
    }
  }

  const handleUpdateEvent = async () => {
    try {
      if (!newEvent._id) {
        toast({
          variant: "destructive",
          title: "Event ID missing.",
          description: "Cannot update event without an ID.",
        })
        return
      }

      const response = await fetch(`/api/events/${newEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEvent),
      })

      if (response.ok) {
        toast({
          title: "Event updated successfully!",
          description: "The event details have been updated.",
        })
        setIsEditEventOpen(false) // Close the dialog
        setNewEvent(initialNewEventState) // Reset the form
        fetchEvents() // Refresh the events list
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update event.",
          description: "Please check the form data and try again.",
        })
      }
    } catch (error) {
      console.error("Update event error:", error)
      toast({
        variant: "destructive",
        title: "An error occurred.",
        description: "Could not update the event. Please try again later.",
      })
    }
  }

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (window.confirm(`Are you sure you want to delete ${eventTitle}?`)) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          toast({
            title: "Event deleted successfully!",
            description: `The event "${eventTitle}" has been removed.`,
          })
          fetchEvents() // Refresh the events list
        } else {
          toast({
            variant: "destructive",
            title: "Failed to delete event.",
            description: "Please try again later.",
          })
        }
      } catch (error) {
        console.error("Delete event error:", error)
        toast({
          variant: "destructive",
          title: "An error occurred.",
          description: "Could not delete the event. Please try again later.",
        })
      }
    }
  }

  const handleNewBookingEventChange = useCallback(
    async (eventId: string) => {
      setNewBooking({ ...newBooking, eventId: eventId }) // Update eventId in newBooking state

      const selectedEvent = events.find((event) => event._id === eventId)
      if (selectedEvent) {
        setSelectedEventForBooking(selectedEvent) // Store the selected event object
        setNewBooking({
          ...newBooking,
          eventId: selectedEvent._id,
          eventTitle: selectedEvent.title,
          eventType: selectedEvent.event_type,
        }) // Update other fields

        // Generate seats based on event type and hall
        let seats: Seat[] = []
        if (selectedEvent.event_type === "match") {
          if (getHallType(halls, selectedEvent.hall_id) === "vip") {
            seats = generateVipMatchSeats(selectedEvent.pricing, selectedEvent.bookedSeats)
          } else {
            seats = generateStandardMatchSeats(
              selectedEvent.pricing,
              selectedEvent.hall_id,
              halls,
              selectedEvent.bookedSeats,
            )
          }
        } else {
          seats = generateMovieSeats(selectedEvent.pricing, selectedEvent.hall_id, halls, selectedEvent.bookedSeats)
        }
        setCurrentEventSeats(seats) // Update the seat map
      } else {
        setSelectedEventForBooking(null) // Clear selected event if not found
        setCurrentEventSeats([]) // Clear seat map
      }
    },
    [events, halls, newBooking, setNewBooking, setCurrentEventSeats, setSelectedEventForBooking],
  )

  const handleAdminSeatClick = (seatId: string, seatType: string, isBooked: boolean, seatPrice: number) => {
    if (isBooked) {
      toast({
        variant: "destructive",
        title: "Seat already booked.",
        description: "This seat is currently unavailable.",
      })
      return // Prevent selecting booked seats
    }

    const isSelected = selectedSeatsForAdminBooking.includes(seatId)
    let updatedSeats = [...selectedSeatsForAdminBooking]

    if (isSelected) {
      updatedSeats = updatedSeats.filter((id) => id !== seatId) // Deselect seat
    } else {
      updatedSeats.push(seatId) // Select seat
    }

    setSelectedSeatsForAdminBooking(updatedSeats) // Update selected seats

    // Calculate amount based on selected seats
    const newAmount = updatedSeats.length * seatPrice
    setNewBooking({
      ...newBooking,
      seats: updatedSeats, // Update the seats array in newBooking
      seatType: getSeatTypeName(seatType), // Update seatType in newBooking
      amount: newAmount, // Update amount in newBooking
      totalAmount: newAmount + newBooking.processingFee, // Update totalAmount in newBooking
    })
  }

  const handleCreateBooking = async () => {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newBooking,
          seats: newBooking.seats, // Ensure seats is an array of seat IDs
        }),
      })

      if (response.ok) {
        toast({
          title: "Booking created successfully!",
          description: "The new booking has been added.",
        })
        setIsCreateBookingOpen(false) // Close the dialog
        setNewBooking(initialNewBookingState) // Reset the form
        setSelectedEventForBooking(null) // Clear selected event
        setSelectedSeatsForAdminBooking([]) // Clear selected seats
        setCurrentEventSeats([]) // Clear seat map
        fetchBookings() // Refresh the bookings list
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create booking.",
          description: "Please check the form data and try again.",
        })
      }
    } catch (error) {
      console.error("Create booking error:", error)
      toast({
        variant: "destructive",
        title: "An error occurred.",
        description: "Could not create the booking. Please try again later.",
      })
    }
  }

  const handleCreateHall = async () => {
    try {
      const response = await fetch("/api/halls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentHall),
      })

      if (response.ok) {
        toast({
          title: "Hall created successfully!",
          description: "The new hall has been added.",
        })
        setIsCreateEditHallOpen(false) // Close the dialog
        setCurrentHall(initialNewHallState) // Reset the form
        fetchHalls() // Refresh the halls list
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create hall.",
          description: "Please check the form data and try again.",
        })
      }
    } catch (error) {
      console.error("Create hall error:", error)
      toast({
        variant: "destructive",
        title: "An error occurred.",
        description: "Could not create the hall. Please try again later.",
      })
    }
  }

  const handleUpdateHall = async () => {
    try {
      if (!currentHall._id) {
        toast({
          variant: "destructive",
          title: "Hall ID missing.",
          description: "Cannot update hall without an ID.",
        })
        return
      }

      const response = await fetch(`/api/halls/${currentHall._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentHall),
      })

      if (response.ok) {
        toast({
          title: "Hall updated successfully!",
          description: "The hall details have been updated.",
        })
        setIsCreateEditHallOpen(false) // Close the dialog
        setCurrentHall(initialNewHallState) // Reset the form
        fetchHalls() // Refresh the halls list
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update hall.",
          description: "Please check the form data and try again.",
        })
      }
    } catch (error) {
      console.error("Update hall error:", error)
      toast({
        variant: "destructive",
        title: "An error occurred.",
        description: "Could not update the hall. Please try again later.",
      })
    }
  }

  const handleDeleteHall = async (hallId: string, hallName: string) => {
    if (window.confirm(`Are you sure you want to delete ${hallName}?`)) {
      try {
        const response = await fetch(`/api/halls/${hallId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          toast({
            title: "Hall deleted successfully!",
            description: `The hall "${hallName}" has been removed.`,
          })
          fetchHalls() // Refresh the halls list
        } else {
          toast({
            variant: "destructive",
            title: "Failed to delete hall.",
            description: "Please try again later.",
          })
        }
      } catch (error) {
        console.error("Delete hall error:", error)
        toast({
          variant: "destructive",
          title: "An error occurred.",
          description: "Could not delete the hall. Please try again later.",
        })
      }
    }
  }

  const handleEditClick = (event: Event) => {
    setNewEvent({
      _id: event._id,
      title: event.title,
      event_type: event.event_type,
      category: event.category,
      event_date: event.event_date,
      event_time: event.event_time,
      hall_id: event.hall_id,
      description: event.description || "",
      duration: event.duration,
      total_seats: event.total_seats,
      pricing: event.pricing,
      status: event.status,
      image_url: event.image_url || "",
    })
    setIsEditEventOpen(true)
  }

  const handleEditHallClick = (hall: NewHallData) => {
    setCurrentHall({
      _id: hall._id,
      name: hall.name,
      capacity: hall.capacity,
      type: hall.type,
    })
    setIsCreateEditHallOpen(true)
  }

  const handlePrintReceipt = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsPrintReceiptOpen(true)
  }

  const printReceipt = () => {
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const handleExportPdf = () => {
    const reportTableContent = document.getElementById("report-table-content")
    const fullReportContent = document.getElementById("full-report-content")

    if (reportTableContent && fullReportContent) {
      // Clear existing content
      fullReportContent.innerHTML = ""

      // Clone the table content
      const clonedTable = reportTableContent.cloneNode(true) as HTMLElement

      // Style the cloned table for printing
      clonedTable.classList.add("table") // Add Tailwind table class
      clonedTable.querySelectorAll("th, td").forEach((cell) => {
        ;(cell as HTMLElement).classList.add("border", "border-gray-300", "p-2") // Add Tailwind border classes
      })

      // Create a header for the report
      const reportHeader = document.createElement("div")
      reportHeader.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/dexcinema-logo.jpeg" alt="Dex View Cinema Logo" style="width: 150px; margin: 0 auto;">
          <h1 style="font-size: 2em; color: #e53e3e; margin-bottom: 0.25em;">Dex View Cinema - Booking Report</h1>
          <p style="font-size: 1.2em; color: #718096;">Report Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      `

      // Append the header and the cloned table to the full report content
      fullReportContent.appendChild(reportHeader)
      fullReportContent.appendChild(clonedTable)

      // Trigger the print dialog
      setTimeout(() => {
        window.print()
      }, 500)
    } else {
      console.error("Report table content not found.")
      toast({
        variant: "destructive",
        title: "Report content not found.",
        description: "Could not generate the PDF report.",
      })
    }
  }

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error("Fetch events error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load events.",
        description: "Please check your network connection and try again.",
      })
    }
  }, [toast])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch("/api/bookings")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setActualBookings(data)
    } catch (error) {
      console.error("Fetch bookings error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load bookings.",
        description: "Please check your network connection and try again.",
      })
    }
  }, [toast])

  const fetchHalls = useCallback(async () => {
    try {
      const response = await fetch("/api/halls")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setHalls(data)
    } catch (error) {
      console.error("Fetch halls error:", error)
      toast({
        variant: "destructive",
        title: "Failed to load halls.",
        description: "Please check your network connection and try again.",
      })
    }
  }, [toast])

  useEffect(() => {
    fetchEvents()
    fetchBookings()
    fetchHalls()
  }, [fetchEvents, fetchBookings, fetchHalls])

  // Calculate total revenue
  const totalRevenue = actualBookings.reduce((sum, booking) => {
    if (booking.status === "confirmed") {
      return sum + booking.totalAmount
    }
    return sum
  }, 0)

  // Calculate total bookings
  const totalBookings = actualBookings.length

  // Calculate active events count
  const activeEventsCount = events.filter((event) => event.status === "active").length

  // Calculate overall occupancy rate
  const overallOccupancyRate =
    events.reduce((sum, event) => {
      const bookedSeats = event.bookedSeats ? event.bookedSeats.length : 0
      return sum + (bookedSeats / event.total_seats) * 100
    }, 0) / events.length || 0

  // Filter customer bookings based on selected event and search query
  const filteredCustomerBookings = actualBookings.filter((booking) => {
    const eventFilter = selectedEventIdForBookings === "all" || booking.eventId === selectedEventIdForBookings
    const searchFilter =
      customerSearchQuery === "" ||
      booking.customerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(customerSearchQuery.toLowerCase())

    return eventFilter && searchFilter
  })

  // Filter reports bookings based on selected filters
  const filteredReportsBookings = actualBookings.filter((booking) => {
    const startDateFilter = reportStartDate === "" || new Date(booking.bookingDate) >= new Date(reportStartDate)
    const endDateFilter = reportEndDate === "" || new Date(booking.bookingDate) <= new Date(reportEndDate)
    const eventTypeFilter = reportEventType === "all" || booking.eventType === reportEventType
    const statusFilter = reportStatus === "all" || booking.status === reportStatus
    const eventFilter = selectedEventIdForReports === "all" || booking.eventId === selectedEventIdForReports

    return startDateFilter && endDateFilter && eventTypeFilter && statusFilter && eventFilter
  })

  // Calculate revenue by category
  const revenueByCategory = events.reduce((acc: { [key: string]: number }, event) => {
    const category = event.category
    const categoryBookings = actualBookings.filter(
      (booking) => booking.eventId === event._id && booking.status === "confirmed",
    )
    const categoryRevenue = categoryBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)

    acc[category] = (acc[category] || 0) + categoryRevenue
    return acc
  }, {})

  // Calculate hall performance (occupancy rates)
  const hallPerformance = events.reduce((acc: { [key: string]: { booked: number; total: number } }, event) => {
    const hallName = getHallDisplayName(halls, event.hall_id)
    const bookedSeats = event.bookedSeats ? event.bookedSeats.length : 0

    acc[hallName] = {
      booked: (acc[hallName]?.booked || 0) + bookedSeats,
      total: (acc[hallName]?.total || 0) + event.total_seats,
    }
    return acc
  }, {})

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
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
              >
                <LogOut className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Welcome to Admin Dashboard</h2>
          <p className="text-cyber-slate-300">Manage your cinema events, bookings, and analytics from here.</p>
        </div>
      </div>

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

        {/* Main Content */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 bg-glass-white-strong backdrop-blur-xl border border-white/20 rounded-3xl h-auto sm:h-10">
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Monitor className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Events Management</span>
              <span className="sm:hidden">Events</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Customer Bookings</span>
              <span className="sm:hidden">Bookings</span>
            </TabsTrigger>
            <TabsTrigger
              value="halls"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Building className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Halls Management</span>
              <span className="sm:hidden">Halls</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Filter className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Reports</span>
              <span className="sm:hidden">Reports</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Upcoming Shows Management</CardTitle>
                <CardDescription className="text-cyber-slate-300">
                  Manage your movies and sports events with detailed seating arrangements and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20 hover:bg-glass-white">
                        <TableHead className="text-cyber-slate-200 font-semibold">Image</TableHead> {/* New column */}
                        <TableHead className="text-cyber-slate-200 font-semibold">Event</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Type/Category</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Date & Time</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Venue</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Pricing Info</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Occupancy</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Status</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event._id} className="border-white/20 hover:bg-glass-white transition-colors">
                          <TableCell>
                            {event.image_url ? (
                              <Image
                                src={event.image_url || "/placeholder.svg"}
                                alt={event.title}
                                width={64}
                                height={64}
                                className="rounded-md object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-cyber-slate-700/50 rounded-md flex items-center justify-center text-cyber-slate-400">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-white">{event.title}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={event.event_type === "match" ? "destructive" : "default"}
                                className={
                                  event.event_type === "match"
                                    ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50 rounded-2xl"
                                    : "bg-glass-white-strong text-white border-white/30 rounded-2xl"
                                }
                              >
                                {event.event_type === "match" ? (
                                  <Trophy className="w-3 h-3 mr-1" />
                                ) : (
                                  <Film className="w-3 h-3 mr-1" />
                                )}
                                {event.event_type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-xs bg-cyber-slate-500/20 text-cyber-slate-300 border-cyber-slate-500/30 rounded-xl"
                              >
                                {event.category}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-cyber-slate-300">
                              <CalendarIcon className="w-4 h-4 text-brand-red-400" />
                              {new Date(event.event_date).toLocaleDateString()}
                              <Clock className="w-4 h-4 ml-2 text-brand-red-400" />
                              {event.event_time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-brand-red-400" />
                              <span className="text-cyber-slate-200">{getHallDisplayName(halls, event.hall_id)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-cyber-slate-200">
                              {event.event_type === "match" ? (
                                getHallType(halls, event.hall_id) === "vip" &&
                                event.pricing?.vipSofaSeats &&
                                event.pricing?.vipRegularSeats ? (
                                  <div className="space-y-1">
                                    <div>Sofa: ₦{event.pricing.vipSofaSeats.price.toLocaleString()}</div>
                                    <div>Regular: ₦{event.pricing.vipRegularSeats.price.toLocaleString()}</div>
                                  </div>
                                ) : (
                                  (event.hall_id === "hallA" || event.hall_id === "hallB") &&
                                  event.pricing?.standardMatchSeats && (
                                    <div className="space-y-1">
                                      <div>Match: ₦{event.pricing.standardMatchSeats.price.toLocaleString()}</div>
                                    </div>
                                  )
                                )
                              ) : getHallType(halls, event.hall_id) === "vip" ? (
                                <div className="space-y-1">
                                  {event.pricing?.vipSingle && (
                                    <div>Single: ₦{event.pricing.vipSingle.price.toLocaleString()}</div>
                                  )}
                                  {event.pricing?.vipCouple && (
                                    <div>Couple: ₦{event.pricing.vipCouple.price.toLocaleString()}</div>
                                  )}
                                  {event.pricing?.vipFamily && (
                                    <div>Family: ₦{event.pricing.vipFamily.price.toLocaleString()}</div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {event.pricing?.standardSingle && (
                                    <div>Single: ₦{event.pricing.standardSingle.price.toLocaleString()}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-cyber-slate-700/50 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-brand-red-500 to-brand-red-400 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${((event.bookedSeats?.length || 0) / event.total_seats) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-cyber-slate-300 font-semibold">
                                {event.bookedSeats?.length || 0}/{event.total_seats}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={event.status === "active" ? "default" : "secondary"}
                              className={
                                event.status === "active"
                                  ? "bg-cyber-green-500/30 text-cyber-green-300 border-cyber-green-500/50 rounded-2xl"
                                  : "bg-cyber-slate-500/30 text-cyber-slate-300 border-cyber-slate-500/50 rounded-2xl"
                              }
                            >
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(event)}
                                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Link href={`/admin/seats/${event._id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteEvent(event._id, event.title)}
                                className="border-brand-red-500/50 text-brand-red-400 hover:bg-brand-red-500/20 bg-transparent backdrop-blur-sm rounded-2xl"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
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
                          <TableRow
                            key={booking._id}
                            className="border-white/20 hover:bg-glass-white transition-colors"
                          >
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
          </TabsContent>

          {/* Halls Management Tab Content */}
          <TabsContent value="halls">
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white text-xl font-bold">Hall/Venue Management</CardTitle>
                  <CardDescription className="text-cyber-slate-300">
                    Create, update, or delete cinema halls and venues.
                  </CardDescription>
                </div>
                <Dialog open={isCreateEditHallOpen} onOpenChange={setIsCreateEditHallOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-cyber-purple-500 via-cyber-purple-600 to-cyber-purple-700 hover:from-cyber-purple-600 hover:via-cyber-purple-700 hover:to-cyber-purple-800 shadow-glow-purple text-white group rounded-2xl"
                      onClick={() => setCurrentHall(initialNewHallState)} // Reset form for new hall
                    >
                      <Plus className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                      Create Hall
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-cyber-purple-200 bg-clip-text text-transparent">
                        {currentHall._id ? "Edit Hall" : "Create New Hall"}
                      </DialogTitle>
                      <DialogDescription className="text-cyber-slate-300">
                        {currentHall._id ? "Modify details for this hall." : "Add a new cinema hall or venue."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-3">
                        <Label htmlFor="hall-name" className="text-cyber-slate-200 font-semibold">
                          Hall Name
                        </Label>
                        <Input
                          id="hall-name"
                          value={currentHall.name}
                          onChange={(e) => setCurrentHall({ ...currentHall, name: e.target.value })}
                          placeholder="e.g., Hall C, Deluxe Hall"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="hall-capacity" className="text-cyber-slate-200 font-semibold">
                          Capacity (Total Seats)
                        </Label>
                        <Input
                          id="hall-capacity"
                          type="number"
                          value={currentHall.capacity}
                          onChange={(e) => setCurrentHall({ ...currentHall, capacity: Number(e.target.value) })}
                          placeholder="e.g., 50"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="hall-type" className="text-cyber-slate-200 font-semibold">
                          Hall Type
                        </Label>
                        <Select
                          value={currentHall.type}
                          onValueChange={(value: "vip" | "standard") => setCurrentHall({ ...currentHall, type: value })}
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue placeholder="Select hall type" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateEditHallOpen(false)}
                        className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={currentHall._id ? handleUpdateHall : handleCreateHall}
                        className="bg-gradient-to-r from-cyber-purple-500 via-cyber-purple-600 to-cyber-purple-700 hover:from-cyber-purple-600 hover:via-cyber-purple-700 hover:to-cyber-purple-800 text-white rounded-2xl"
                      >
                        {currentHall._id ? "Save Changes" : "Create Hall"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20 hover:bg-glass-white">
                        <TableHead className="text-cyber-slate-200 font-semibold">Hall ID</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Name</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Capacity</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Type</TableHead>
                        <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {halls.length > 0 ? (
                        halls.map((hall) => (
                          <TableRow key={hall._id} className="border-white/20 hover:bg-glass-white transition-colors">
                            <TableCell className="font-medium text-white font-mono">{hall._id}</TableCell>
                            <TableCell className="text-cyber-slate-200">{hall.name}</TableCell>
                            <TableCell className="text-cyber-slate-200">{hall.capacity} seats</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  hall.type === "vip"
                                    ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50 rounded-2xl"
                                    : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50 rounded-2xl"
                                }
                              >
                                {hall.type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditHallClick(hall)}
                                  className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteHall(hall._id, hall.name)}
                                  className="border-brand-red-500/50 text-brand-red-400 hover:bg-brand-red-500/20 bg-transparent backdrop-blur-sm rounded-2xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-cyber-slate-400 py-8">
                            No halls found. Create one to get started!
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
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
                    <Select
                      value={reportEventType}
                      onValueChange={(value: EventType | "all") => setReportEventType(value)}
                    >
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
                    <Select
                      value={reportStatus}
                      onValueChange={(value: Booking["status"] | "all") => setReportStatus(value)}
                    >
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
                  <div className="grid gap-2">
                    <Label htmlFor="report-event-filter" className="text-cyber-slate-200">
                      Filter by Event
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
                            {event.title} ({getHallDisplayName(halls, event.hall_id)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end mb-4">
                  <Button
                    onClick={handleExportPdf}
                    className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Export as PDF
                  </Button>
                </div>

                <div id="report-table-content" className="overflow-x-auto">
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReportsBookings.length > 0 ? (
                        filteredReportsBookings.map((booking) => (
                          <TableRow
                            key={booking._id}
                            className="border-white/20 hover:bg-glass-white transition-colors"
                          >
                            <TableCell className="font-medium text-white font-mono">{booking._id}</TableCell>
                            <TableCell>
                              <div className="text-cyber-slate-200">
                                <div className="font-semibold">{booking.customerName}</div>
                                <div className="text-xs text-cyber-slate-400">{booking.customerEmail}</div>
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
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-cyber-slate-400 py-8">
                            No bookings found matching the selected filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-bold">Revenue Analytics</CardTitle>
                  <CardDescription className="text-cyber-slate-300">
                    Revenue breakdown by event category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label htmlFor="revenue-timeframe" className="text-cyber-slate-200">
                      Revenue Timeframe
                    </Label>
                    <Select
                      value={revenueTimeFrame}
                      onValueChange={(value: RevenueTimeFrame) => setRevenueTimeFrame(value)}
                    >
                      <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {revenueTimeFrame === "custom" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="grid gap-2">
                        <Label htmlFor="custom-revenue-start-date" className="text-cyber-slate-200">
                          Start Date
                        </Label>
                        <Input
                          id="custom-revenue-start-date"
                          type="date"
                          value={customRevenueStartDate}
                          onChange={(e) => setCustomRevenueStartDate(e.target.value)}
                          className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="custom-revenue-end-date" className="text-cyber-slate-200">
                          End Date
                        </Label>
                        <Input
                          id="custom-revenue-end-date"
                          type="date"
                          value={customRevenueEndDate}
                          onChange={(e) => setCustomRevenueEndDate(e.target.value)}
                          className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {Object.entries(revenueByCategory).length > 0 ? (
                      Object.entries(revenueByCategory).map(([category, revenue]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-cyber-slate-200">{category}</span>
                          <span className="font-bold text-white text-lg">₦{revenue.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-cyber-slate-400">No revenue data available.</p>
                    )}
                    <div className="border-t border-white/20 pt-6">
                      <div className="flex justify-between items-center font-bold text-xl">
                        <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                          Total
                        </span>
                        <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                          ₦{totalRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-bold">Hall Performance</CardTitle>
                  <CardDescription className="text-cyber-slate-300">
                    Occupancy rates and performance metrics for each hall
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.entries(hallPerformance).length > 0 ? (
                    Object.entries(hallPerformance).map(([hallName, performance]) => (
                      <div key={hallName} className="mb-6">
                        <h3 className="text-lg font-semibold text-cyber-slate-200 mb-2">{hallName}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-cyber-slate-300">Occupancy Rate:</span>
                          <span className="font-bold text-white text-lg">
                            {((performance.booked / performance.total) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-full bg-cyber-slate-700/50 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-brand-red-500 to-brand-red-400 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${(performance.booked / performance.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-cyber-slate-300 font-semibold">
                            {performance.booked}/{performance.total}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-cyber-slate-400">No hall performance data available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Full Report Content (Hidden for printing) */}
      <div id="full-report-content" className="hidden print:block"></div>

      {/* Print Receipt Dialog */}
      <Dialog open={isPrintReceiptOpen} onOpenChange={setIsPrintReceiptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-cyber-green-200 bg-clip-text text-transparent">
              Print Receipt
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300">
              Review and print the booking receipt for the customer.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              <div className="text-center">
                <Image
                  src="/dexcinema-logo.jpeg"
                  alt="Dex View Cinema Logo"
                  width={120}
                  height={40}
                  className="mx-auto"
                />
                <h2 className="text-lg font-bold text-white">Dex View Cinema</h2>
                <p className="text-sm text-cyber-slate-300">Your Ultimate Entertainment Destination</p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h3 className="text-md font-semibold text-cyber-green-300">Booking Details</h3>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Booking ID:</span>
                  <span className="font-mono">{selectedBooking._id}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Date:</span>
                  <span>{new Date(selectedBooking.bookingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Time:</span>
                  <span>{selectedBooking.bookingTime}</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h3 className="text-md font-semibold text-cyber-green-300">Customer Information</h3>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Name:</span>
                  <span>{selectedBooking.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Email:</span>
                  <span>{selectedBooking.customerEmail}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Phone:</span>
                  <span>{selectedBooking.customerPhone}</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h3 className="text-md font-semibold text-cyber-green-300">Event Details</h3>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Event:</span>
                  <span>{selectedBooking.eventTitle}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Type:</span>
                  <span>{selectedBooking.eventType}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Seats:</span>
                  <span>
                    {selectedBooking.seats.join(", ")} ({selectedBooking.seatType})
                  </span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h3 className="text-md font-semibold text-cyber-green-300">Payment Information</h3>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Base Amount:</span>
                  <span>₦{selectedBooking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Processing Fee:</span>
                  <span>₦{selectedBooking.processingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>₦{selectedBooking.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Payment Method:</span>
                  <span>{selectedBooking.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center text-cyber-slate-200">
                  <span>Status:</span>
                  <span>{selectedBooking.status}</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4 text-center">
                <p className="text-xs text-cyber-slate-400">Thank you for choosing Dex View Cinema!</p>
                <p className="text-xs text-cyber-slate-400">We hope you enjoy the show.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPrintReceiptOpen(false)}
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={printReceipt}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
            >
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
