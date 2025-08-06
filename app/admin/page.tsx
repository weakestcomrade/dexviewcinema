"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
import { CalendarIcon, Clock, Edit, Eye, Film, Plus, Settings, Trash2, Trophy, Users, TrendingUp, Shield, Activity, Sparkles, BarChart3, Monitor, MapPin, Star, Printer, Filter, Search, ImageIcon, ShoppingCart, Building } from 'lucide-react'
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { addDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval } from "date-fns"
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
const generateStandardMatchSeats = (eventPricing: Event["pricing"], hallId: string, bookedSeats: string[] = []) => {
  const seats: Seat[] = []
  const totalSeats = getHallTotalSeats(hallMappingArray, hallId) // Use hallMappingArray
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
const generateMovieSeats = (eventPricing: Event["pricing"], hallId: string, bookedSeats: string[] = []) => {
  const seats: Seat[] = []
  const hallType = getHallType(hallMappingArray, hallId) // Use hallMappingArray
  const totalSeats = getHallTotalSeats(hallMappingArray, hallId) // Use hallMappingArray

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

  const fetchHalls = useCallback(async () => {
    try {
      const res = await fetch("/api/halls")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Hall[] = await res.json()
      setHalls(data)
      // Set initial new event state based on fetched halls
      if (data.length > 0 && newEvent.hall_id === "") {
        const defaultHall = data[0] // Use the first hall as default
        setNewEvent((prev) => ({
          ...prev,
          hall_id: defaultHall._id,
          total_seats: defaultHall.capacity,
          pricing: defaultHall.type === "vip" ? defaultVipMoviePricing : defaultStandardMoviePricingHallA, // Default pricing based on hall type
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
      // Placeholder for bookedSeats - in a real app, these would be calculated or fetched
      // For now, let's simulate booked seats based on actual bookings if available
      const formattedEvents = data.map((event) => {
        const bookingsForEvent = actualBookings.filter((booking) => booking.eventId === event._id)
        const bookedSeatIds = bookingsForEvent.flatMap((booking) => booking.seats)
        return {
          ...event,
          bookedSeats: bookedSeatIds, // Store actual booked seat IDs
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
  }, [actualBookings, toast]) // Depend on actualBookings to update bookedSeats

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
    fetchHalls() // Fetch halls first
  }, [fetchHalls])

  useEffect(() => {
    fetchBookings() // Fetch bookings first
  }, [fetchBookings])

  useEffect(() => {
    if (actualBookings.length > 0 || events.length === 0) {
      // Only fetch events after bookings are loaded, or if events are empty
      fetchEvents()
    }
  }, [actualBookings, fetchEvents, events.length])

  const handleEventTypeChange = (type: EventType) => {
    let newHallId: string
    let newCategory: EventCategory
    let newDuration: string
    let newPricing: NewEventData["pricing"]

    if (type === "match") {
      newHallId = halls.find((h) => h.type === "vip")?._id || (halls.length > 0 ? halls[0]._id : "") // Default to VIP Hall for matches
      newCategory = "Premium Match"
      newDuration = "90 minutes + extra time"
      newPricing = defaultVipMatchPricing
    } else {
      // movie
      newHallId = halls.find((h) => h._id === "hallA")?._id || (halls.length > 0 ? halls[0]._id : "") // Default to Hall A for movies
      newCategory = "Blockbuster"
      newDuration = "120 minutes"
      newPricing = defaultStandardMoviePricingHallA // Default to standard pricing for Hall A
    }

    setNewEvent({
      ...newEvent,
      event_type: type,
      category: newCategory,
      hall_id: newHallId,
      total_seats: getHallTotalSeats(halls, newHallId),
      duration: newDuration,
      pricing: newPricing,
    })
  }

  const handleCategoryChange = (category: EventCategory) => {
    let updatedPricing = { ...newEvent.pricing }

    if (newEvent.event_type === "match") {
      if (getHallType(halls, newEvent.hall_id) === "vip") {
        if (category === "Big Match") {
          updatedPricing = {
            vipSofaSeats: { price: 3000, count: 10 },
            vipRegularSeats: { price: 2500, count: 12 },
          }
        } else {
          updatedPricing = defaultVipMatchPricing
        }
      } else if (newEvent.hall_id === "hallA") {
        updatedPricing = defaultStandardMatchPricingHallA
      } else if (newEvent.hall_id === "hallB") {
        updatedPricing = defaultStandardMatchPricingHallB
      }
    }
    // For movie categories, pricing is determined by hall_id, not category, so no change here.

    setNewEvent({ ...newEvent, category, pricing: updatedPricing })
  }

  const handleCreateEvent = async () => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEvent),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Event created successfully!",
        description: `${newEvent.title} has been added.`,
      })
      setIsCreateEventOpen(false)
      setNewEvent(initialNewEventState) // Reset form to initial state
      fetchEvents() // Refresh the list
    } catch (error) {
      console.error("Failed to create event:", error)
      toast({
        title: "Error creating event",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (event: Event) => {
    // Map fetched event data to NewEventData for the form
    setNewEvent({
      _id: event._id,
      title: event.title,
      event_type: event.event_type,
      category: event.category as EventCategory,
      event_date: event.event_date,
      event_time: event.event_time,
      hall_id: event.hall_id,
      description: event.description || "",
      duration: event.duration || "",
      pricing: event.pricing, // Use the existing pricing from the event
      total_seats: event.total_seats,
      status: event.status,
      image_url: event.image_url || "", // Set image_url for editing
    })
    setIsEditEventOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!newEvent._id) {
      toast({
        title: "Error updating event",
        description: "Event ID is missing.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`/api/events/${newEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEvent),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Event updated successfully!",
        description: `${newEvent.title} has been updated.`,
      })
      setIsEditEventOpen(false)
      setNewEvent(initialNewEventState) // Reset form after update
      fetchEvents() // Refresh the list
    } catch (error) {
      console.error("Failed to update event:", error)
      toast({
        title: "Error updating event",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Event deleted successfully!",
        description: `${title} has been removed.`,
      })
      fetchEvents() // Refresh the list
    } catch (error) {
      console.error("Failed to delete event:", error)
      toast({
        title: "Error deleting event",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handlePrintReceipt = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsPrintReceiptOpen(true)
  }

  const printReceipt = () => {
    window.print()
  }

  // Handle change for new booking event selection
  const handleNewBookingEventChange = async (eventId: string) => {
    const event = events.find((e) => e._id === eventId)
    setSelectedEventForBooking(event || null)
    setSelectedSeatsForAdminBooking([]) // Clear selected seats when event changes
    setCurrentEventSeats([]) // Clear current event seats

    if (event) {
      // Fetch the full event details including bookedSeats from the API
      try {
        const res = await fetch(`/api/events/${eventId}`)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const fullEventData: Event = await res.json()

        // Generate seat map based on event type and hall
        let generatedSeats: Seat[] = []
        if (fullEventData.event_type === "match") {
          if (getHallType(halls, fullEventData.hall_id) === "vip") {
            generatedSeats = generateVipMatchSeats(fullEventData.pricing, fullEventData.bookedSeats)
          } else {
            generatedSeats = generateStandardMatchSeats(
              fullEventData.pricing,
              fullEventData.hall_id,
              fullEventData.bookedSeats,
            )
          }
        } else {
          // Movie event
          if (getHallType(halls, fullEventData.hall_id) === "vip") {
            generatedSeats = generateMovieSeats(fullEventData.pricing, fullEventData.hall_id, fullEventData.bookedSeats)
          } else {
            generatedSeats = generateMovieSeats(fullEventData.pricing, fullEventData.hall_id, fullEventData.bookedSeats)
          }
        }
        setCurrentEventSeats(generatedSeats)

        setNewBooking((prev) => ({
          ...prev,
          eventId: eventId,
          eventTitle: fullEventData.title,
          eventType: fullEventData.event_type,
          seats: [], // Ensure seats array is empty
          seatType: "", // Reset seat type
          amount: 0,
          totalAmount: newBooking.processingFee, // Only processing fee initially
        }))
      } catch (err) {
        console.error("Failed to fetch full event details for booking:", err)
        toast({
          title: "Error loading event seats",
          description: "Could not load seat map for the selected event.",
          variant: "destructive",
        })
      }
    } else {
      setNewBooking(initialNewBookingState)
    }
  }

  const handleAdminSeatClick = (seatId: string, seatType: string, isBooked: boolean, seatPrice: number) => {
    if (isBooked) return // Cannot select already booked seats

    const hallType = getHallType(halls, selectedEventForBooking?.hall_id || "")

    let newSelectedSeats: string[]
    let newSelectedSeatType: string

    if (selectedEventForBooking?.event_type === "movie" && hallType === "vip") {
      // For VIP movie halls, only allow one selection per type (single, couple, family unit)
      if (selectedSeatsForAdminBooking.length > 0 && newBooking.seatType !== seatType) {
        toast({
          title: "Seat Selection Conflict",
          description: `Please select only ${getSeatTypeName(newBooking.seatType)} seats for consistency.`,
          variant: "destructive",
        })
        return
      }
      if (selectedSeatsForAdminBooking.includes(seatId)) {
        newSelectedSeats = []
        newSelectedSeatType = ""
      } else {
        newSelectedSeats = [seatId]
        newSelectedSeatType = seatType
      }
    } else {
      // For football matches (both VIP and Standard) and standard movie halls, allow multiple selections of same type
      if (selectedSeatsForAdminBooking.length > 0 && newBooking.seatType !== seatType) {
        toast({
          title: "Seat Selection Conflict",
          description: `Please select only ${getSeatTypeName(newBooking.seatType)} seats for consistency.`,
          variant: "destructive",
        })
        return
      }

      if (selectedSeatsForAdminBooking.includes(seatId)) {
        newSelectedSeats = selectedSeatsForAdminBooking.filter((id) => id !== seatId)
        newSelectedSeatType = newSelectedSeats.length > 0 ? seatType : ""
      } else {
        newSelectedSeats = [...selectedSeatsForAdminBooking, seatId]
        newSelectedSeatType = seatType
      }
    }

    setSelectedSeatsForAdminBooking(newSelectedSeats)

    // Recalculate amount based on newSelectedSeats
    let calculatedAmount = 0
    newSelectedSeats.forEach((sId) => {
      const seat = currentEventSeats.find((s) => s.id === sId)
      if (seat) {
        calculatedAmount += seat.price
      }
    })

    setNewBooking((prev) => ({
      ...prev,
      seats: newSelectedSeats,
      seatType: newSelectedSeatType,
      amount: calculatedAmount,
      totalAmount: calculatedAmount + prev.processingFee,
    }))
  }

  const handleCreateBooking = async () => {
    if (!selectedEventForBooking) {
      toast({
        title: "Error creating booking",
        description: "Please select an event.",
        variant: "destructive",
      })
      return
    }

    if (selectedSeatsForAdminBooking.length === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select at least one seat.",
        variant: "destructive",
      })
      return
    }

    if (!newBooking.customerName || !newBooking.customerEmail || !newBooking.customerPhone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all customer information.",
        variant: "destructive",
      })
      return
    }

    const bookingPayload = {
      ...newBooking,
      seats: selectedSeatsForAdminBooking, // Use the array of selected seats
      eventId: selectedEventForBooking._id,
      eventTitle: selectedEventForBooking.title,
      eventType: selectedEventForBooking.event_type,
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Booking created successfully!",
        description: `Booking for ${newBooking.customerName} has been added.`,
      })
      setIsCreateBookingOpen(false)
      setNewBooking(initialNewBookingState) // Reset form
      setSelectedEventForBooking(null) // Reset selected event
      setSelectedSeatsForAdminBooking([]) // Clear selected seats
      setCurrentEventSeats([]) // Clear seat map
      fetchBookings() // Refresh bookings list
      fetchEvents() // Refresh events to update booked seats count
    } catch (error) {
      console.error("Failed to create booking:", error)
      toast({
        title: "Error creating booking",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const getSeatTypeBreakdown = (event: Event, halls: Hall[], specificBookedSeats: string[]) => {
    const breakdown: Record<string, number> = {}
    if (!event || specificBookedSeats.length === 0) {
      return breakdown
    }

    const hallType = getHallType(halls, event.hall_id)

    specificBookedSeats.forEach((seatId) => {
      let seatTypeKey = "Unknown"
      if (event.event_type === "match") {
        if (hallType === "vip") {
          if (seatId.startsWith("S")) seatTypeKey = "VIP Sofa"
          else if (seatId.match(/^[A-Z]\d+$/)) seatTypeKey = "VIP Regular"
        } else {
          seatTypeKey = "Standard Match"
        }
      } else {
        // Movie event
        if (hallType === "vip") {
          if (seatId.startsWith("S")) seatTypeKey = "VIP Single"
          else if (seatId.startsWith("C")) seatTypeKey = "VIP Couple"
          else if (seatId.startsWith("F")) seatTypeKey = "VIP Family"
        } else {
          seatTypeKey = "Standard Single"
        }
      }
      breakdown[seatTypeKey] = (breakdown[seatTypeKey] || 0) + 1
    })
    return breakdown
  }

  const handleExportPdf = async () => {
    const input = document.getElementById("full-report-content")
    if (!input) {
      toast({
        title: "Export Failed",
        description: "Could not find report content to export.",
        variant: "destructive",
      })
      return
    }

    // Calculate summary analytics based on filteredReportsBookings
    const summaryTotalRevenue = filteredReportsBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const summaryTotalBookings = filteredReportsBookings.length
    const summaryTotalSeatsBooked = filteredReportsBookings.reduce((sum, booking) => sum + booking.seats.length, 0)

    let summaryOverallOccupancyRate = 0
    let summaryRevenueByCategoryHtml = ""
    let summaryHallPerformanceHtml = ""
    let specificEventDetailsHtml = ""

    const currentEventForReport =
      selectedEventIdForReports !== "all" ? events.find((e) => e._id === selectedEventIdForReports) : null

    if (currentEventForReport) {
      const eventBookingsForReport = filteredReportsBookings.filter((b) => b.eventId === currentEventForReport._id)
      const eventBookedSeatsCount = eventBookingsForReport.reduce((sum, b) => sum + b.seats.length, 0)
      summaryOverallOccupancyRate =
        currentEventForReport.total_seats > 0 ? (eventBookedSeatsCount / currentEventForReport.total_seats) * 100 : 0

      const filteredBookedSeatsForCurrentEvent = eventBookingsForReport.flatMap((b) => b.seats)
      const seatBreakdown = getSeatTypeBreakdown(currentEventForReport, halls, filteredBookedSeatsForCurrentEvent)
      const seatBreakdownList = Object.entries(seatBreakdown)
        .map(([type, count]) => `<li>${type}: ${count}</li>`)
        .join("")

      specificEventDetailsHtml = `
        <h2 class="text-2xl font-bold mb-6">Event Specific Details</h2>
        <div class="mb-10 p-4 border border-gray-300 rounded-lg">
          <h3 class="text-xl font-semibold mb-4">${currentEventForReport.title} (${getHallDisplayName(halls, currentEventForReport.hall_id)})</h3>
          <p><strong>Date:</strong> ${currentEventForReport.event_date}</p>
          <p><strong>Time:</strong> ${currentEventForReport.event_time}</p>
          <p><strong>Total Seats:</strong> ${currentEventForReport.total_seats}</p>
          <p><strong>Booked Seats (Filtered):</strong> ${eventBookedSeatsCount}</p>
          <p><strong>Occupancy:</strong> ${summaryOverallOccupancyRate.toFixed(0)}%</p>
          <h4 class="text-lg font-semibold mt-4 mb-2">Booked Seats Breakdown:</h4>
          <ul>${seatBreakdownList}</ul>
        </div>
      `
    } else {
      // Calculate for all filtered events
      const relevantEventIds = new Set(filteredReportsBookings.map((b) => b.eventId))
      const relevantEvents = events.filter((e) => relevantEventIds.has(e._id))

      const totalBookedSeatsFiltered = filteredReportsBookings.reduce((sum, booking) => sum + booking.seats.length, 0)
      const totalAvailableSeatsRelevant = relevantEvents.reduce((sum, event) => sum + event.total_seats, 0)
      summaryOverallOccupancyRate =
        totalAvailableSeatsRelevant > 0 ? (totalBookedSeatsFiltered / totalAvailableSeatsRelevant) * 100 : 0

      const currentRevenueByCategory = filteredReportsBookings.reduce(
        (acc, booking) => {
          const category = events.find((e) => e._id === booking.eventId)?.category || "Unknown"
          acc[category] = (acc[category] || 0) + booking.totalAmount
          return acc
        },
        {} as Record<string, number>,
      )

      summaryRevenueByCategoryHtml =
        Object.entries(currentRevenueByCategory).length > 0
          ? Object.entries(currentRevenueByCategory)
              .map(
                ([category, revenue]) => `
          <div class="flex justify-between items-center text-lg border-b border-gray-200 pb-2">
            <span>${category}:</span>
            <span class="font-bold">₦${revenue.toLocaleString()}</span>
          </div>
        `,
              )
              .join("")
          : `<p>No revenue data available for these filters.</p>`

      const currentHallPerformance = relevantEvents.reduce(
        (acc, event) => {
          const hallName = getHallDisplayName(halls, event.hall_id)
          if (!acc[hallName]) {
            acc[hallName] = { booked: 0, total: 0 }
          }
          // Sum booked seats for this hall from the filtered bookings
          const bookedSeatsForHall = filteredReportsBookings
            .filter((b) => b.eventId === event._id)
            .reduce((sum, b) => sum + b.seats.length, 0)

          acc[hallName].booked += bookedSeatsForHall
          acc[hallName].total += event.total_seats
          return acc
        },
        {} as Record<string, { booked: number; total: number }>,
      )

      summaryHallPerformanceHtml =
        Object.entries(currentHallPerformance).length > 0
          ? Object.entries(currentHallPerformance)
              .map(([hallName, data]) => {
                const occupancy = data.total > 0 ? (data.booked / data.total) * 100 : 0
                return `
          <div class="mb-4">
            <div class="flex justify-between text-lg mb-2">
              <span>${hallName}:</span>
              <span class="font-bold">${occupancy.toFixed(0)}% Occupancy</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div class="bg-blue-500 h-4 rounded-full" style="width: ${occupancy}%"></div>
            </div>
          </div>
        `
              })
              .join("")
          : `<p>No hall performance data available for these filters.</p>`
    }

    const summaryReportHtml = `
      <div class="p-8 bg-white text-black">
        <h1 class="text-3xl font-bold text-center mb-8">Event Booking Summary Report</h1>

        <div class="mb-8 p-4 border border-gray-300 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Filters Applied:</h2>
          <div class="grid grid-cols-2 gap-4 text-lg">
            <div><strong>Date Range:</strong> ${reportStartDate || "All"} to ${reportEndDate || "All"}</div>
            <div><strong>Event Type:</strong> ${reportEventType === "all" ? "All" : reportEventType}</div>
            <div><strong>Booking Status:</strong> ${reportStatus === "all" ? "All" : reportStatus}</div>
            <div><strong>Selected Event:</strong> ${currentEventForReport ? `${currentEventForReport.title} (${getHallDisplayName(halls, currentEventForReport.hall_id)})` : "All Events"}</div>
          </div>
        </div>

        <h2 class="text-2xl font-bold mb-6">Summary Statistics</h2>
        <div class="grid grid-cols-2 gap-6 mb-10">
          <div class="p-4 border border-gray-300 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">Total Revenue (Filtered)</h3>
            <p class="text-3xl font-bold">₦${summaryTotalRevenue.toLocaleString()}</p>
          </div>
          <div class="p-4 border border-gray-300 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">Total Bookings (Filtered)</h3>
            <p class="text-3xl font-bold">${summaryTotalBookings}</p>
          </div>
          <div class="p-4 border border-gray-300 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">Total Seats Booked (Filtered)</h3>
            <p class="text-3xl font-bold">${summaryTotalSeatsBooked}</p>
          </div>
          <div class="p-4 border border-gray-300 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">Overall Occupancy Rate (Filtered)</h3>
            <p class="text-3xl font-bold">${summaryOverallOccupancyRate.toFixed(0)}%</p>
          </div>
        </div>
        ${specificEventDetailsHtml}
        ${
          selectedEventIdForReports === "all"
            ? `
          <h2 class="text-2xl font-bold mb-6">Revenue by Category</h2>
          <div class="space-y-4 mb-10">${summaryRevenueByCategoryHtml}</div>
          <h2 class="text-2xl font-bold mb-6">Hall Performance</h2>
          <div class="space-y-4 mb-10">${summaryHallPerformanceHtml}</div>
        `
            : ""
        }
      </div>
    `

    // Set the content of the hidden div
    input.innerHTML = summaryReportHtml

    // Temporarily apply styles for PDF rendering
    input.style.backgroundColor = "#ffffff"
    input.style.padding = "20px"
    input.style.color = "#000000"
    input.style.boxShadow = "none"
    input.style.borderRadius = "0"
    input.style.display = "block" // Make sure it's visible for html2canvas

    // Temporarily change text color for all elements within the report content
    const textElements = input.querySelectorAll("*")
    textElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const computedColor = window.getComputedStyle(el).color
        // Only override if the color is not already black or a very dark color
        if (computedColor !== "rgb(0, 0, 0)" && computedColor !== "rgb(255, 255, 255)") {
          el.style.color = "#000000"
        }
        // Remove background gradients/shadows from cards
        if (el.classList.contains("bg-glass-white-strong") || el.classList.contains("shadow-cyber-card")) {
          el.style.backgroundColor = "#ffffff"
          el.style.boxShadow = "none"
          el.style.border = "1px solid #e0e0e0"
        }
        // Remove text gradients
        if (el.classList.contains("bg-clip-text")) {
          el.style.color = "#000000"
          el.style.backgroundImage = "none"
        }
        // Remove badge backgrounds
        if (el.classList.contains("badge")) {
          el.style.backgroundColor = "#f0f0f0"
          el.style.color = "#333333"
          el.style.border = "1px solid #cccccc"
        }
      }
    })

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // Important for images if any
        logging: true, // Enable logging for debugging
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("l", "mm", "a4") // 'l' for landscape, 'mm' for units, 'a4' for page size
      const imgWidth = 297 // A4 landscape width in mm
      const pageHeight = 210 // A4 landscape height in mm
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

      pdf.save("booking_report.pdf")

      toast({
        title: "PDF Exported",
        description: "Booking report has been exported as PDF.",
      })
    } catch (error) {
      console.error("Failed to export PDF:", error)
      toast({
        title: "Export Failed",
        description: "Could not export report as PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      // Revert temporary styles and clear content
      input.style.backgroundColor = ""
      input.style.padding = ""
      input.style.color = ""
      input.style.boxShadow = ""
      input.style.borderRadius = ""
      input.style.display = "none" // Hide it again
      input.innerHTML = "" // Clear the content

      textElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.color = "" // Revert to original computed style
          el.style.backgroundColor = ""
          el.style.boxShadow = ""
          el.style.border = ""
          el.style.backgroundImage = ""
        }
      })
    }
  }

  // --- Hall Management Functions ---
  const handleCreateHall = async () => {
    try {
      const res = await fetch("/api/halls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentHall),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Hall created successfully!",
        description: `${currentHall.name} has been added.`,
      })
      setIsCreateEditHallOpen(false)
      setCurrentHall(initialNewHallState) // Reset form
      fetchHalls() // Refresh the list
    } catch (error) {
      console.error("Failed to create hall:", error)
      toast({
        title: "Error creating hall",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleEditHallClick = (hall: Hall) => {
    setCurrentHall({
      _id: hall._id,
      name: hall.name,
      capacity: hall.capacity,
      type: hall.type,
    })
    setIsCreateEditHallOpen(true)
  }

  const handleUpdateHall = async () => {
    if (!currentHall._id) {
      toast({
        title: "Error updating hall",
        description: "Hall ID is missing.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`/api/halls/${currentHall._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentHall),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Hall updated successfully!",
        description: `${currentHall.name} has been updated.`,
      })
      setIsCreateEditHallOpen(false)
      setCurrentHall(initialNewHallState) // Reset form
      fetchHalls() // Refresh the list
    } catch (error) {
      console.error("Failed to update hall:", error)
      toast({
        title: "Error updating hall",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteHall = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete hall "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/halls/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Hall deleted successfully!",
        description: `${name} has been removed.`,
      })
      fetchHalls() // Refresh the list
    } catch (error) {
      console.error("Failed to delete hall:", error)
      toast({
        title: "Error deleting hall",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  // --- Analytics Calculations ---
  const filteredBookingsForRevenue = actualBookings.filter((booking) => {
    const bookingDate = new Date(booking.bookingDate)

    if (revenueTimeFrame === "day") {
      return bookingDate.toDateString() === new Date().toDateString()
    }

    if (revenueTimeFrame === "week") {
      const start = startOfWeek(new Date())
      const end = endOfWeek(new Date())
      return isWithinInterval(bookingDate, { start, end })
    }

    if (revenueTimeFrame === "month") {
      const start = startOfMonth(new Date())
      const end = endOfMonth(new Date())
      return isWithinInterval(bookingDate, { start, end })
    }

    if (revenueTimeFrame === "custom") {
      const start = customRevenueStartDate ? new Date(customRevenueStartDate) : null
      const end = customRevenueEndDate ? new Date(customRevenueEndDate) : null

      if (start && end) {
        return isWithinInterval(bookingDate, { start, end: addDays(new Date(end), 1) }) // Adding one day to include the end date
      }
      return true // If start or end date is missing, include all bookings
    }

    return true // "all" timeframe
  })

  const totalRevenue = filteredBookingsForRevenue.reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totalBookings = actualBookings.length
  const activeEventsCount = events.filter((e) => e.status === "active").length

  const totalBookedSeatsCount = events.reduce((sum, event) => sum + (event.bookedSeats?.length || 0), 0)
  const totalAvailableSeatsCount = events.reduce((sum, event) => sum + event.total_seats, 0)
  const overallOccupancyRate =
    totalAvailableSeatsCount > 0 ? (totalBookedSeatsCount / totalAvailableSeatsCount) * 100 : 0

  const revenueByCategory = actualBookings.reduce(
    (acc, booking) => {
      const category = events.find((e) => e._id === booking.eventId)?.category || "Unknown"
      acc[category] = (acc[category] || 0) + booking.totalAmount
      return acc
    },
    {} as Record<string, number>,
  )

  const hallPerformance = events.reduce(
    (acc, event) => {
      const hallName = getHallDisplayName(halls, event.hall_id)
      if (!acc[hallName]) {
        acc[hallName] = { booked: 0, total: 0 }
      }
      acc[hallName].booked += event.bookedSeats?.length || 0
      acc[hallName].total += event.total_seats
      return acc
    },
    {} as Record<string, { booked: number; total: number }>,
  )

  // --- Reports Filtering ---
  const filteredReportsBookings = actualBookings.filter((booking) => {
    const bookingDate = new Date(booking.bookingDate)
    const start = reportStartDate ? new Date(reportStartDate) : null
    const end = reportEndDate ? new Date(reportEndDate) : null

    const matchesDate =
      (!start || bookingDate >= start) && (!end || bookingDate <= new Date(end.setDate(end.getDate() + 1))) // +1 day to include end date

    const matchesEventType = reportEventType === "all" || booking.eventType === reportEventType
    const matchesStatus = reportStatus === "all" || booking.status === reportStatus
    const matchesEvent = selectedEventIdForReports === "all" || booking.eventId === selectedEventIdForReports // New filter

    return matchesDate && matchesEventType && matchesStatus && matchesEvent
  })

  // --- Bookings Tab Filtering and Search ---
  const filteredCustomerBookings = actualBookings.filter((booking) => {
    const matchesEvent = selectedEventIdForBookings === "all" || booking.eventId === selectedEventIdForBookings
    const matchesSearch =
      customerSearchQuery === "" ||
      booking.customerName.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(customerSearchQuery.toLowerCase())

    return matchesEvent && matchesSearch
  })

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
              <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 shadow-glow-red text-white group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      Create New Event
                    </DialogTitle>
                    <DialogDescription className="text-cyber-slate-300">
                      Add a new movie or sports event with detailed seating arrangements and pricing.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* Basic Event Information */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Event Information
                      </h3>
                      <div className="grid gap-3">
                        <Label htmlFor="title" className="text-cyber-slate-200 font-semibold">
                          Event Title
                        </Label>
                        <Input
                          id="title"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          placeholder="e.g., El Clasico or Avengers: Endgame"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="type" className="text-cyber-slate-200 font-semibold">
                            Event Type
                          </Label>
                          <Select
                            value={newEvent.event_type}
                            onValueChange={(value: EventType) => handleEventTypeChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              <SelectItem value="movie">Movie</SelectItem>
                              <SelectItem value="match">Sports Match</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="category" className="text-cyber-slate-200 font-semibold">
                            Event Category
                          </Label>
                          <Select
                            value={newEvent.category}
                            onValueChange={(value: EventCategory) => handleCategoryChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              {newEvent.event_type === "match" ? (
                                <>
                                  <SelectItem value="Premium Match">Premium Match</SelectItem>
                                  <SelectItem value="Big Match">Big Match</SelectItem>
                                  <SelectItem value="Champions League">Champions League</SelectItem>
                                  <SelectItem value="Derby Match">Derby Match</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Blockbuster">Blockbuster</SelectItem>
                                  <SelectItem value="Drama">Drama</SelectItem>
                                  <SelectItem value="Action">Action</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="date" className="text-cyber-slate-200 font-semibold">
                            Date
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={newEvent.event_date}
                            onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="time" className="text-cyber-slate-200 font-semibold">
                            Time
                          </Label>
                          <Input
                            id="time"
                            type="time"
                            value={newEvent.event_time}
                            onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="duration" className="text-cyber-slate-200 font-semibold">
                            Duration
                          </Label>
                          <Input
                            id="duration"
                            value={newEvent.duration}
                            onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                            placeholder="e.g., 120 minutes"
                            className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="hall" className="text-cyber-slate-200 font-semibold">
                          Hall/Venue
                        </Label>
                        <Select
                          value={newEvent.hall_id}
                          onValueChange={(value) => {
                            const newTotalSeats = getHallTotalSeats(halls, value)
                            let updatedPricing = { ...newEvent.pricing }

                            if (newEvent.event_type === "movie") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMoviePricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMoviePricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMoviePricingHallB
                              }
                            } else if (newEvent.event_type === "match") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMatchPricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMatchPricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMatchPricingHallB
                              }
                            }

                            setNewEvent({
                              ...newEvent,
                              hall_id: value,
                              total_seats: newTotalSeats,
                              pricing: updatedPricing,
                            })
                          }}
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue placeholder="Select a hall" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            {halls.map((hall) => (
                              <SelectItem key={hall._id} value={hall._id}>
                                {hall.name} ({hall.capacity} seats)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="description" className="text-cyber-slate-200 font-semibold">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          placeholder="Brief description of the event..."
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="image_url" className="text-cyber-slate-200 font-semibold">
                          Image URL
                        </Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={newEvent.image_url}
                          onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                          placeholder="e.g., https://example.com/event-poster.jpg"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="status" className="text-cyber-slate-200 font-semibold">
                          Status
                        </Label>
                        <Select
                          value={newEvent.status}
                          onValueChange={(value: "active" | "draft" | "cancelled") =>
                            setNewEvent({ ...newEvent, status: value })
                          }
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pricing Structure */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Seating & Pricing Structure
                      </h3>

                      {newEvent.event_type === "match" ? (
                        getHallType(halls, newEvent.hall_id) === "vip" ? (
                          <>
                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-brand-red-400" />
                                VIP Sofa Seats (Premium Comfort)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Star className="w-4 h-4 text-brand-red-400" />
                                VIP Regular Seats
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Standard Match pricing (Hall A or Hall B)
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Match Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      ) : getHallType(halls, newEvent.hall_id) === "vip" ? (
                        // VIP Movie pricing
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Couple Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per couple ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Family Tickets (4+ members)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per family ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Standard Movie pricing (for hallA, hallB)
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateEventOpen(false)
                        setNewEvent(initialNewEventState) // Reset form on cancel
                      }}
                      className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl"
                    >
                      Create Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Event Dialog */}
              <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      Edit Event
                    </DialogTitle>
                    <DialogDescription className="text-cyber-slate-300">
                      Modify details for the selected event.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* Basic Event Information */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Event Information
                      </h3>
                      <div className="grid gap-3">
                        <Label htmlFor="title" className="text-cyber-slate-200 font-semibold">
                          Event Title
                        </Label>
                        <Input
                          id="title"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          placeholder="e.g., El Clasico or Avengers: Endgame"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="type" className="text-cyber-slate-200 font-semibold">
                            Event Type
                          </Label>
                          <Select
                            value={newEvent.event_type}
                            onValueChange={(value: EventType) => handleEventTypeChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              <SelectItem value="movie">Movie</SelectItem>
                              <SelectItem value="match">Sports Match</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="category" className="text-cyber-slate-200 font-semibold">
                            Event Category
                          </Label>
                          <Select
                            value={newEvent.category}
                            onValueChange={(value: EventCategory) => handleCategoryChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              {newEvent.event_type === "match" ? (
                                <>
                                  <SelectItem value="Premium Match">Premium Match</SelectItem>
                                  <SelectItem value="Big Match">Big Match</SelectItem>
                                  <SelectItem value="Champions League">Champions League</SelectItem>
                                  <SelectItem value="Derby Match">Derby Match</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Blockbuster">Blockbuster</SelectItem>
                                  <SelectItem value="Drama">Drama</SelectItem>
                                  <SelectItem value="Action">Action</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="date" className="text-cyber-slate-200 font-semibold">
                            Date
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={newEvent.event_date}
                            onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="time" className="text-cyber-slate-200 font-semibold">
                            Time
                          </Label>
                          <Input
                            id="time"
                            type="time"
                            value={newEvent.event_time}
                            onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="duration" className="text-cyber-slate-200 font-semibold">
                            Duration
                          </Label>
                          <Input
                            id="duration"
                            value={newEvent.duration}
                            onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                            placeholder="e.g., 120 minutes"
                            className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="hall" className="text-cyber-slate-200 font-semibold">
                          Hall/Venue
                        </Label>
                        <Select
                          value={newEvent.hall_id}
                          onValueChange={(value) => {
                            const newTotalSeats = getHallTotalSeats(halls, value)
                            let updatedPricing = { ...newEvent.pricing }

                            if (newEvent.event_type === "movie") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMoviePricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMoviePricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMoviePricingHallB
                              }
                            } else if (newEvent.event_type === "match") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMatchPricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMatchPricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMatchPricingHallB
                              }
                            }
                            setNewEvent({
                              ...newEvent,
                              hall_id: value,
                              total_seats: newTotalSeats,
                              pricing: updatedPricing,
                            })
                          }}
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue placeholder="Select a hall" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            {halls.map((hall) => (
                              <SelectItem key={hall._id} value={hall._id}>
                                {hall.name} ({hall.capacity} seats)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="description" className="text-cyber-slate-200 font-semibold">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          placeholder="Brief description of the event..."
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="image_url" className="text-cyber-slate-200 font-semibold">
                          Image URL
                        </Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={newEvent.image_url}
                          onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                          placeholder="e.g., https://example.com/event-poster.jpg"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="status" className="text-cyber-slate-200 font-semibold">
                          Status
                        </Label>
                        <Select
                          value={newEvent.status}
                          onValueChange={(value: "active" | "draft" | "cancelled") =>
                            setNewEvent({ ...newEvent, status: value })
                          }
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pricing Structure */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Seating & Pricing Structure
                      </h3>

                      {newEvent.event_type === "match" ? (
                        getHallType(halls, newEvent.hall_id) === "vip" ? (
                          <>
                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-brand-red-400" />
                                VIP Sofa Seats (Premium Comfort)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Star className="w-4 h-4 text-brand-red-400" />
                                VIP Regular Seats
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Standard Match pricing (Hall A or Hall B)
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Match Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      ) : getHallType(halls, newEvent.hall_id) === "vip" ? (
                        // VIP Movie pricing
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Couple Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per couple ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Family Tickets (4+ members)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per family ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Standard Movie pricing (for hallA, hallB)
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateEventOpen(false)
                        setNewEvent(initialNewEventState) // Reset form on cancel
                      }}
                      className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl"
                    >
                      Create Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Event Dialog */}
              <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      Edit Event
                    </DialogTitle>
                    <DialogDescription className="text-cyber-slate-300">
                      Modify details for the selected event.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* Basic Event Information */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Event Information
                      </h3>
                      <div className="grid gap-3">
                        <Label htmlFor="title" className="text-cyber-slate-200 font-semibold">
                          Event Title
                        </Label>
                        <Input
                          id="title"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          placeholder="e.g., El Clasico or Avengers: Endgame"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="type" className="text-cyber-slate-200 font-semibold">
                            Event Type
                          </Label>
                          <Select
                            value={newEvent.event_type}
                            onValueChange={(value: EventType) => handleEventTypeChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              <SelectItem value="movie">Movie</SelectItem>
                              <SelectItem value="match">Sports Match</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="category" className="text-cyber-slate-200 font-semibold">
                            Event Category
                          </Label>
                          <Select
                            value={newEvent.category}
                            onValueChange={(value: EventCategory) => handleCategoryChange(value)}
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              {newEvent.event_type === "match" ? (
                                <>
                                  <SelectItem value="Premium Match">Premium Match</SelectItem>
                                  <SelectItem value="Big Match">Big Match</SelectItem>
                                  <SelectItem value="Champions League">Champions League</SelectItem>
                                  <SelectItem value="Derby Match">Derby Match</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Blockbuster">Blockbuster</SelectItem>
                                  <SelectItem value="Drama">Drama</SelectItem>
                                  <SelectItem value="Action">Action</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="date" className="text-cyber-slate-200 font-semibold">
                            Date
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={newEvent.event_date}
                            onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="time" className="text-cyber-slate-200 font-semibold">
                            Time
                          </Label>
                          <Input
                            id="time"
                            type="time"
                            value={newEvent.event_time}
                            onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                            className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="duration" className="text-cyber-slate-200 font-semibold">
                            Duration
                          </Label>
                          <Input
                            id="duration"
                            value={newEvent.duration}
                            onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                            placeholder="e.g., 120 minutes"
                            className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="hall" className="text-cyber-slate-200 font-semibold">
                          Hall/Venue
                        </Label>
                        <Select
                          value={newEvent.hall_id}
                          onValueChange={(value) => {
                            const newTotalSeats = getHallTotalSeats(halls, value)
                            let updatedPricing = { ...newEvent.pricing }

                            if (newEvent.event_type === "movie") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMoviePricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMoviePricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMoviePricingHallB
                              }
                            } else if (newEvent.event_type === "match") {
                              if (getHallType(halls, value) === "vip") {
                                updatedPricing = defaultVipMatchPricing
                              } else if (value === "hallA") {
                                updatedPricing = defaultStandardMatchPricingHallA
                              } else if (value === "hallB") {
                                updatedPricing = defaultStandardMatchPricingHallB
                              }
                            }
                            setNewEvent({
                              ...newEvent,
                              hall_id: value,
                              total_seats: newTotalSeats,
                              pricing: updatedPricing,
                            })
                          }}
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue placeholder="Select a hall" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            {halls.map((hall) => (
                              <SelectItem key={hall._id} value={hall._id}>
                                {hall.name} ({hall.capacity} seats)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="description" className="text-cyber-slate-200 font-semibold">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          placeholder="Brief description of the event..."
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="image_url" className="text-cyber-slate-200 font-semibold">
                          Image URL
                        </Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={newEvent.image_url}
                          onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                          placeholder="e.g., https://example.com/event-poster.jpg"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="status" className="text-cyber-slate-200 font-semibold">
                          Status
                        </Label>
                        <Select
                          value={newEvent.status}
                          onValueChange={(value: "active" | "draft" | "cancelled") =>
                            setNewEvent({ ...newEvent, status: value })
                          }
                        >
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pricing Structure */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-brand-red-300 border-b border-white/20 pb-2">
                        Seating & Pricing Structure
                      </h3>

                      {newEvent.event_type === "match" ? (
                        getHallType(halls, newEvent.hall_id) === "vip" ? (
                          <>
                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-brand-red-400" />
                                VIP Sofa Seats (Premium Comfort)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipSofaSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipSofaSeats: {
                                            ...newEvent.pricing.vipSofaSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                              <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                                <Star className="w-4 h-4 text-brand-red-400" />
                                VIP Regular Seats
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Price per seat (₦)</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.price || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            price: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label className="text-cyber-slate-300">Total seats</Label>
                                  <Input
                                    type="number"
                                    value={newEvent.pricing.vipRegularSeats?.count || 0}
                                    onChange={(e) =>
                                      setNewEvent({
                                        ...newEvent,
                                        pricing: {
                                          ...newEvent.pricing,
                                          vipRegularSeats: {
                                            ...newEvent.pricing.vipRegularSeats!,
                                            count: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                    className="bg-glass-dark border-white/20 text-white rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Standard Match pricing (Hall A or Hall B)
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Match Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardMatchSeats?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardMatchSeats: {
                                          ...newEvent.pricing.standardMatchSeats!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      ) : getHallType(halls, newEvent.hall_id) === "vip" ? (
                        // VIP Movie pricing
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipSingle: { ...newEvent.pricing.vipSingle!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Couple Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per couple ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipCouple?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipCouple: { ...newEvent.pricing.vipCouple!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              VIP Family Tickets (4+ members)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per family ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, price: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Available tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.vipFamily?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        vipFamily: { ...newEvent.pricing.vipFamily!, count: Number(e.target.value) },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Standard Movie pricing (for hallA, hallB)
                        <>
                          <div className="bg-glass-white-strong p-4 rounded-3xl border border-white/10">
                            <h4 className="text-cyber-slate-200 font-semibold mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-red-400" />
                              Standard Single Tickets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Price per ticket (₦)</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.price || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          price: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-cyber-slate-300">Total tickets</Label>
                                <Input
                                  type="number"
                                  value={newEvent.pricing.standardSingle?.count || 0}
                                  onChange={(e) =>
                                    setNewEvent({
                                      ...newEvent,
                                      pricing: {
                                        ...newEvent.pricing,
                                        standardSingle: {
                                          ...newEvent.pricing.standardSingle!,
                                          count: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="bg-glass-dark border-white/20 text-white rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditEventOpen(false)
                        setNewEvent(initialNewEventState) // Reset form on cancel
                      }}
                      className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateEvent}
                      className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-600 hover:via-brand-700 hover:to-brand-800 text-white rounded-2xl"
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* New Create Booking Dialog Trigger */}
              <Dialog open={isCreateBookingOpen} onOpenChange={setIsCreateBookingOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-cyber-blue-500 via-cyber-blue-600 to-cyber-blue-700 hover:from-cyber-blue-600 hover:via-cyber-blue-700 hover:to-cyber-blue-800 shadow-glow-blue text-white group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
                    onClick={() => {
                      setNewBooking(initialNewBookingState) // Reset form when opening
                      setSelectedEventForBooking(null) // Reset selected event
                      setSelectedSeatsForAdminBooking([]) // Clear selected seats
                      setCurrentEventSeats([]) // Clear seat map
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Create Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-cyber-blue-200 bg-clip-text text-transparent">
                      Create New Booking (Cash)
                    </DialogTitle>
                    <DialogDescription className="text-cyber-slate-300">
                      Manually create a booking for walk-in customers paying with cash.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* Customer Information */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-cyber-blue-300 border-b border-white/20 pb-2">
                        Customer Information
                      </h3>
                      <div className="grid gap-3">
                        <Label htmlFor="customerName" className="text-cyber-slate-200 font-semibold">
                          Customer Name
                        </Label>
                        <Input
                          id="customerName"
                          value={newBooking.customerName}
                          onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                          placeholder="John Doe"
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="customerEmail" className="text-cyber-slate-200 font-semibold">
                            Customer Email
                          </Label>
                          <Input
                            id="customerEmail"
                            type="email"
                            value={newBooking.customerEmail}
                            onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })}
                            placeholder="john.doe@example.com"
                            className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="customerPhone" className="text-cyber-slate-200 font-semibold">
                            Customer Phone
                          </Label>
                          <Input
                            id="customerPhone"
                            type="tel"
                            value={newBooking.customerPhone}
                            onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
                            placeholder="+2348012345678"
                            className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Event & Seat Information */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-cyber-blue-300 border-b border-white/20 pb-2">
                        Event & Seat Details
                      </h3>
                      <div className="grid gap-3">
                        <Label htmlFor="bookingEvent" className="text-cyber-slate-200 font-semibold">
                          Select Event
                        </Label>
                        <Select value={newBooking.eventId} onValueChange={handleNewBookingEventChange}>
                          <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                            {events.map((event) => (
                              <SelectItem key={event._id} value={event._id}>
                                {event.title} ({getHallDisplayName(halls, event.hall_id)}) -{" "}
                                {new Date(event.event_date).toLocaleDateString()} @ {event.event_time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedEventForBooking && (
                        <>
                          {/* Seat Map Section */}
                          <div className="space-y-6">
                            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
                              <CardHeader>
                                <CardTitle className="text-white flex items-center gap-3 text-2xl font-bold">
                                  Seat Map - {getHallDisplayName(halls, selectedEventForBooking.hall_id)}
                                </CardTitle>
                                <CardDescription className="text-cyber-slate-300 text-lg">
                                  Select seats for this booking
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-6">
                                {/* Screen/Field */}
                                <div className="mb-10">
                                  <div className="bg-gradient-to-r from-brand-red-100/20 via-brand-red-50/20 to-brand-red-100/20 text-white text-center py-6 rounded-5xl mb-8 border-2 border-brand-red-500/30 shadow-cyber-card backdrop-blur-sm">
                                    <span className="text-lg font-bold flex items-center justify-center gap-3">
                                      <Sparkles className="w-6 h-6 text-brand-red-400 animate-spin-slow" />
                                      {selectedEventForBooking.event_type === "match"
                                        ? "🏟️ FOOTBALL FIELD VIEW 🏟️"
                                        : "🎬 PREMIUM SCREEN VIEW 🎬"}
                                      <Sparkles className="w-6 h-6 text-brand-red-400 animate-spin-slow" />
                                    </span>
                                  </div>
                                </div>

                                {/* Seat Map */}
                                {selectedEventForBooking.event_type === "match" ? (
                                  getHallType(halls, selectedEventForBooking.hall_id) === "vip" ? (
                                    <div className="space-y-8">
                                      {/* VIP Sofa Seats */}
                                      <div>
                                        <h4 className="text-lg font-bold text-brand-red-300 mb-4 flex items-center gap-2">
                                          <Trophy className="w-5 h-5" />
                                          VIP Sofa Seats - Premium Comfort
                                        </h4>
                                        <div className="space-y-4">
                                          {["S1", "S2"].map((row) => (
                                            <div key={row} className="flex items-center gap-4">
                                              <div className="w-8 text-center font-bold text-brand-red-400 text-lg flex-shrink-0">
                                                {row}
                                              </div>
                                              <div className="flex gap-4 flex-wrap justify-center sm:justify-start">
                                                {currentEventSeats
                                                  .filter((seat) => seat.row === row && seat.type === "sofa")
                                                  .map((seat) => (
                                                    <button
                                                      key={seat.id}
                                                      onClick={() =>
                                                        handleAdminSeatClick(
                                                          seat.id,
                                                          seat.type,
                                                          seat.isBooked,
                                                          seat.price,
                                                        )
                                                      }
                                                      disabled={seat.isBooked}
                                                      className={`
                                                        w-16 h-16 sm:w-20 sm:h-16 rounded-3xl border-3 text-sm font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                                                        ${
                                                          seat.isBooked
                                                            ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                            : selectedSeatsForAdminBooking.includes(seat.id)
                                                              ? "bg-gradient-to-br from-brand-red-500 to-brand-red-600 text-white border-brand-red-400 shadow-glow-red scale-110"
                                                              : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-brand-red-400/50 hover:bg-brand-red-500/20 shadow-cyber-card"
                                                        }
                                                      `}
                                                    >
                                                      🛋️
                                                    </button>
                                                  ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* VIP Regular Seats */}
                                      <div>
                                        <h4 className="text-lg font-bold text-cyber-blue-300 mb-4 flex items-center gap-2">
                                          <Star className="w-5 h-5" />
                                          VIP Regular Seats
                                        </h4>
                                        <div className="space-y-4">
                                          {["A", "B"].map((row) => (
                                            <div key={row} className="flex items-center gap-4">
                                              <div className="w-8 text-center font-bold text-cyber-blue-400 text-lg flex-shrink-0">
                                                {row}
                                              </div>
                                              <div className="flex gap-4 flex-wrap justify-center sm:justify-start">
                                                {currentEventSeats
                                                  .filter((seat) => seat.row === row && seat.type === "regular")
                                                  .map((seat) => (
                                                    <button
                                                      key={seat.id}
                                                      onClick={() =>
                                                        handleAdminSeatClick(
                                                          seat.id,
                                                          seat.type,
                                                          seat.isBooked,
                                                          seat.price,
                                                        )
                                                      }
                                                      disabled={seat.isBooked}
                                                      className={`
                                                        w-16 h-16 rounded-3xl border-3 text-lg font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                        ${
                                                          seat.isBooked
                                                            ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                            : selectedSeatsForAdminBooking.includes(seat.id)
                                                              ? "bg-gradient-to-br from-cyber-blue-500 to-cyber-blue-600 text-white border-cyber-blue-400 shadow-glow-blue scale-110"
                                                              : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-cyber-blue-400/50 hover:bg-cyber-blue-500/20 shadow-cyber-card"
                                                        }
                                                      `}
                                                    >
                                                      {seat.number}
                                                    </button>
                                                  ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Standard Match Hall (Hall A or Hall B)
                                    <div className="space-y-8">
                                      <div>
                                        <h4 className="text-lg font-bold text-cyber-green-300 mb-4">
                                          Standard Match Seats
                                        </h4>
                                        <div
                                          className={`grid gap-3 ${
                                            selectedEventForBooking.hall_id === "hallA"
                                              ? "grid-cols-6 sm:grid-cols-8"
                                              : "grid-cols-6 sm:grid-cols-10"
                                          }`}
                                        >
                                          {currentEventSeats
                                            .filter((seat) => seat.type === "standardMatch")
                                            .map((seat) => (
                                              <button
                                                key={seat.id}
                                                onClick={() =>
                                                  handleAdminSeatClick(seat.id, seat.type, seat.isBooked, seat.price)
                                                }
                                                disabled={seat.isBooked}
                                                className={`
                                                  w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                  ${
                                                    seat.isBooked
                                                      ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                      : selectedSeatsForAdminBooking.includes(seat.id)
                                                        ? "bg-gradient-to-br from-cyber-green-500 to-cyber-green-600 text-white border-cyber-green-400 shadow-glow-green scale-110"
                                                        : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-cyber-green-400/50 hover:bg-cyber-green-500/20 shadow-cyber-card"
                                                  }
                                                `}
                                              >
                                                {seat.id.split("-")[1]}
                                              </button>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                ) : getHallType(halls, selectedEventForBooking.hall_id) === "vip" ? (
                                  <div className="space-y-8">
                                    {/* VIP Single Seats */}
                                    <div>
                                      <h4 className="text-lg font-bold text-cyber-green-300 mb-4">VIP Single Seats</h4>
                                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                                        {currentEventSeats
                                          .filter((seat) => seat.type === "vipSingle")
                                          .map((seat) => (
                                            <button
                                              key={seat.id}
                                              onClick={() =>
                                                handleAdminSeatClick(seat.id, seat.type, seat.isBooked, seat.price)
                                              }
                                              disabled={seat.isBooked}
                                              className={`
                                                w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                ${
                                                  seat.isBooked
                                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                    : selectedSeatsForAdminBooking.includes(seat.id)
                                                      ? "bg-gradient-to-br from-cyber-green-500 to-cyber-green-600 text-white border-cyber-green-400 shadow-glow-green scale-110"
                                                      : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-cyber-green-400/50 hover:bg-cyber-green-500/20 shadow-cyber-card"
                                                }
                                              `}
                                            >
                                              {seat.id}
                                            </button>
                                          ))}
                                      </div>
                                    </div>

                                    {/* VIP Couple Seats */}
                                    <div>
                                      <h4 className="text-lg font-bold text-cyber-purple-300 mb-4">VIP Couple Seats</h4>
                                      <div className="grid grid-cols-3 sm:grid-cols-7 gap-4">
                                        {currentEventSeats
                                          .filter((seat) => seat.type === "vipCouple")
                                          .map((seat) => (
                                            <button
                                              key={seat.id}
                                              onClick={() =>
                                                handleAdminSeatClick(seat.id, seat.type, seat.isBooked, seat.price)
                                              }
                                              disabled={seat.isBooked}
                                              className={`
                                                w-16 h-12 sm:w-20 sm:h-14 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                ${
                                                  seat.isBooked
                                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                    : selectedSeatsForAdminBooking.includes(seat.id)
                                                      ? "bg-gradient-to-br from-cyber-purple-500 to-cyber-purple-600 text-white border-cyber-purple-400 shadow-glow-purple scale-110"
                                                      : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-cyber-purple-400/50 hover:bg-cyber-purple-500/20 shadow-cyber-card"
                                                }
                                              `}
                                            >
                                              💕{seat.id.replace("C", "")}
                                            </button>
                                          ))}
                                      </div>
                                    </div>

                                    {/* VIP Family Seats */}
                                    <div>
                                      <h4 className="text-lg font-bold text-brand-red-300 mb-4">
                                        VIP Family Seats (4+ members)
                                      </h4>
                                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                                        {currentEventSeats
                                          .filter((seat) => seat.type === "vipFamily")
                                          .map((seat) => (
                                            <button
                                              key={seat.id}
                                              onClick={() =>
                                                handleAdminSeatClick(seat.id, seat.type, seat.isBooked, seat.price)
                                              }
                                              disabled={seat.isBooked}
                                              className={`
                                                w-20 h-16 sm:w-24 sm:h-16 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                ${
                                                  seat.isBooked
                                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                    : selectedSeatsForAdminBooking.includes(seat.id)
                                                      ? "bg-gradient-to-br from-brand-red-500 to-brand-red-600 text-white border-brand-red-400 shadow-glow-red scale-110"
                                                      : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-brand-red-400/50 hover:bg-brand-red-500/20 shadow-cyber-card"
                                                }
                                              `}
                                            >
                                              👨‍👩‍👧‍👦{seat.id.replace("F", "")}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Standard Movie Halls (Hall A, Hall B)
                                  <div className="space-y-8">
                                    <div>
                                      <h4 className="text-lg font-bold text-cyber-green-300 mb-4">Standard Seats</h4>
                                      <div
                                        className={`grid gap-3 ${
                                          selectedEventForBooking.hall_id === "hallA"
                                            ? "grid-cols-6 sm:grid-cols-8"
                                            : "grid-cols-6 sm:grid-cols-10"
                                        }`}
                                      >
                                        {currentEventSeats
                                          .filter((seat) => seat.type === "standardSingle")
                                          .map((seat) => (
                                            <button
                                              key={seat.id}
                                              onClick={() =>
                                                handleAdminSeatClick(seat.id, seat.type, seat.isBooked, seat.price)
                                              }
                                              disabled={seat.isBooked}
                                              className={`
                                                w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                                ${
                                                  seat.isBooked
                                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                                    : selectedSeatsForAdminBooking.includes(seat.id)
                                                      ? "bg-gradient-to-br from-cyber-green-500 to-cyber-green-600 text-white border-cyber-green-400 shadow-glow-green scale-110"
                                                      : "bg-glass-white-strong text-cyber-slate-300 border-white/30 hover:border-cyber-green-400/50 hover:bg-cyber-green-500/20 shadow-cyber-card"
                                                }
                                              `}
                                            >
                                              {seat.id.split("-")[1]}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Legend */}
                                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-10 mt-8 sm:mt-10 text-base sm:text-lg">
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-glass-white-strong border-2 sm:border-3 border-white/30 rounded-xl sm:rounded-2xl shadow-cyber-card"></div>
                                    <span className="text-cyber-slate-300 font-semibold">Available</span>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-brand-red-500 to-brand-red-600 border-2 sm:border-3 border-brand-red-400 rounded-xl sm:rounded-2xl shadow-glow-red"></div>
                                    <span className="text-cyber-slate-300 font-semibold">Selected</span>
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-brand-red-100/20 border-2 sm:border-3 border-brand-red-300/30 rounded-xl sm:rounded-2xl shadow-cyber-card"></div>
                                    <span className="text-cyber-slate-300 font-semibold">Occupied</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div className="grid gap-4">
                      <h3 className="text-lg font-semibold text-cyber-blue-300 border-b border-white/20 pb-2">
                        Payment Summary
                      </h3>
                      <div className="flex justify-between items-center text-cyber-slate-200">
                        <span>Base Amount:</span>
                        <span className="font-bold">₦{newBooking.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-cyber-slate-200">
                        <span>Processing Fee:</span>
                        <span className="font-bold">₦{newBooking.processingFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-white text-xl font-bold border-t border-white/20 pt-4 mt-2">
                        <span>Total Amount:</span>
                        <span>₦{newBooking.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="paymentMethod" className="text-cyber-slate-200 font-semibold">
                          Payment Method
                        </Label>
                        <Input
                          id="paymentMethod"
                          value={newBooking.paymentMethod}
                          readOnly
                          className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateBookingOpen(false)
                        setNewBooking(initialNewBookingState) // Reset form on cancel
                        setSelectedEventForBooking(null) // Reset selected event
                        setSelectedSeatsForAdminBooking([]) // Clear selected seats
                        setCurrentEventSeats([]) // Clear seat map
                      }}
                      className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBooking}
                      className="bg-gradient-to-r from-cyber-blue-500 via-cyber-blue-600 to-cyber-blue-700 hover:from-cyber-blue-600 hover:via-cyber-blue-700 hover:to-cyber-blue-800 text-white rounded-2xl"
                    >
                      Create Booking
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                          onValueChange={(value: "vip" | "standard") =>
                            setCurrentHall({ ...currentHall, type: value })
                          }
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
                  <CardDescription className="text-cyber-slate-300">Occupancy rates by venue type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(hallPerformance).length > 0 ? (
                      Object.entries(hallPerformance).map(([hallName, data]) => {
                        const occupancy = data.total > 0 ? (data.booked / data.total) * 100 : 0
                        return (
                          <div key={hallName}>
                            <div className="flex justify-between mb-3">
                              <span className="text-cyber-slate-200">{hallName}</span>
                              <span className="text-white font-semibold">{occupancy.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-cyber-slate-700/50 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-brand-red-500 to-brand-red-400 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${occupancy}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-cyber-slate-400">No hall performance data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden div for full report content for PDF export */}
      <div id="full-report-content" className="hidden p-8 bg-white text-black print-only">
        {/* Content will be dynamically generated by handleExportPdf */}
      </div>

      {/* Receipt Print Dialog */}
      <Dialog open={isPrintReceiptOpen} onOpenChange={setIsPrintReceiptOpen}>
        <DialogContent className="sm:max-w-[600px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
              Booking Receipt
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300">
              Customer booking receipt ready for printing
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="receipt-content bg-white text-black p-8 rounded-lg mx-4" id="receipt">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
                <p className="text-gray-600">Premium Entertainment Experience</p>
                <div className="border-b-2 border-brand-red-600 mt-4"></div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Customer Information</h3>
                  <p>
                    <strong>Name:</strong> {selectedBooking.customerName}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedBooking.customerEmail}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedBooking.customerPhone}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                  <p>
                    <strong>Booking ID:</strong> {selectedBooking._id}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedBooking.bookingDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedBooking.bookingTime}
                  </p>
                  <p>
                    <strong>Payment:</strong> {selectedBooking.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
                <p>
                  <strong>Event:</strong> {selectedBooking.eventTitle}
                </p>
                <p>
                  <strong>Type:</strong> {selectedBooking.eventType === "match" ? "Sports Match" : "Movie"}
                </p>
                <p>
                  <strong>Seats:</strong> {selectedBooking.seats.join(", ")}
                </p>
                <p>
                  <strong>Seat Type:</strong> {selectedBooking.seatType}
                </p>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>Base Amount:</span>
                  <span>₦{selectedBooking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Processing Fee:</span>
                  <span>₦{selectedBooking.processingFee}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{selectedBooking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
                <p>Thank you for choosing Dex View Cinema!</p>
                <p>For support, visit us at www.dexviewcinema.com or call +234-XXX-XXX-XXXX</p>
                <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPrintReceiptOpen(false)}
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
            >
              Close
            </Button>
            <Button
              onClick={printReceipt}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-lg mb-4 sm:mb-0">
              &copy; 2025 Dex View Cinema Admin Dashboard. All rights reserved.
            </p>
            <p className="text-cyber-slate-300 text-lg">
              Developed by{" "}
              <a
                href="https://www.sydatech.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red-400 hover:text-brand-red-300 transition-colors font-bold hover:underline"
              >
                SydaTech
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt *, #full-report-content, #full-report-content * {
            visibility: visible;
            color: #000 !important; /* Ensure text is black */
            background-color: #fff !important; /* Ensure background is white */
            box-shadow: none !important; /* Remove shadows */
            border-color: #ccc !important; /* Light border for elements */
            background-image: none !important; /* Remove gradients */
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          #full-report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            display: block !important; /* Ensure it's visible for printing */
          }
          /* Specific overrides for elements within the report content */
          #full-report-content .bg-glass-white-strong,
          #full-report-content .shadow-cyber-card,
          #full-report-content .bg-clip-text,
          #full-report-content .badge {
            background-color: #fff !important;
            box-shadow: none !important;
            border-color: #ccc !important;
            background-image: none !important;
            color: #000 !important;
          }
          #full-report-content .badge {
            background-color: #f0f0f0 !important;
            color: #333 !important;
          }
          #full-report-content .text-cyber-slate-200,
          #full-report-content .text-cyber-slate-300,
          #full-report-content .text-cyber-slate-400,
          #full-report-content .text-brand-red-200,
          #full-report-content .text-brand-red-300,
          #full-report-content .text-brand-red-400,
          #full-report-content .text-cyber-green-200,
          #full-report-content .text-cyber-green-300,
          #full-report-content .text-cyber-green-400,
          #full-report-content .text-cyber-blue-200,
          #full-report-content .text-cyber-blue-300,
          #full-report-content .text-cyber-blue-400,
          #full-report-content .text-cyber-purple-200,
          #full-report-content .text-cyber-purple-300,
          #full-report-content .text-cyber-purple-400 {
            color: #000 !important;
          }
          #full-report-content .bg-gradient-to-r,
          #full-report-content .bg-gradient-to-br {
            background-image: none !important;
          }
          #full-report-content .bg-cyber-slate-700\/50 {
            background-color: #e0e0e0 !important;
          }
          #full-report-content .bg-brand-red-500\/30,
          #full-report-content .bg-cyber-green-500\/30,
          #full-report-content .bg-cyber-yellow-500\/30 {
            background-color: #f0f0f0 !important;
          }
        }
      `}</style>
    </div>
  )
}
