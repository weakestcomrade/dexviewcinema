"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { AdminBackground } from "@/components/admin/admin-background"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { EventsTab } from "@/components/admin/events-tab"
import { BookingsTab } from "@/components/admin/bookings-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
import { Edit, Plus, Trash2, Printer } from "lucide-react"
import Image from "next/image"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { addDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval } from "date-fns"
import type { Hall } from "@/types/hall" // Import the new Hall type

// Keep all the existing types, state, and functions from the original file
type EventType = "movie" | "match"
type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

interface Event {
  _id: string
  title: string
  description: string
  type: EventType
  category?: string
  date: string
  time: string
  duration?: number
  hall_id: string
  image?: string
  status: "active" | "draft" | "cancelled"
  pricing: {
    vip?: number
    standard?: number
  }
}

interface Booking {
  _id: string
  event_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  seats: string[]
  total_amount: number
  payment_method: string
  status: "confirmed" | "pending" | "cancelled"
  booking_date: string
}

interface Seat {
  id: string
  row: string
  number: number
  type: "VIP" | "Standard"
  price: number
  isBooked: boolean
  bookedBy?: string
}

interface NewEventData {
  title: string
  description: string
  type: EventType
  category: string
  date: string
  time: string
  duration: number
  hall_id: string
  image: string
  status: "active" | "draft"
  pricing: {
    vip: number
    standard: number
  }
}

interface CreateBookingData {
  event_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  seats: string[]
  payment_method: string
}

interface NewHallData {
  _id?: string
  name: string
  type: "VIP" | "Standard"
  capacity: number
}

const initialNewEventState: NewEventData = {
  title: "",
  description: "",
  type: "movie",
  category: "",
  date: "",
  time: "",
  duration: 120,
  hall_id: "",
  image: "",
  status: "active",
  pricing: {
    vip: 0,
    standard: 0,
  },
}

const initialNewBookingState: CreateBookingData = {
  event_id: "",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  seats: [],
  payment_method: "cash",
}

const initialNewHallState: NewHallData = {
  name: "",
  type: "Standard",
  capacity: 50,
}

export default function AdminDashboard() {
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

  const getHallDisplayNameOld = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.name || hallId
  const getHallTotalSeats = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.capacity || 0
  const getHallTypeOld = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.type || "standard"

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
  const initialNewEventStateOld: NewEventData = {
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
  const initialNewBookingStateOld: CreateBookingData = {
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
  const initialNewHallStateOld: NewHallData = {
    name: "",
    capacity: 0,
    type: "standard",
  }

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
    const hallType = getHallTypeOld(halls, hallId) // Use passed halls
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
    let newCategory: string
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
      type: type,
      category: newCategory,
      hall_id: newHallId,
      duration: newDuration,
      pricing: newPricing,
    })
  }

  const handleCategoryChange = (category: string) => {
    let updatedPricing = { ...newEvent.pricing }

    if (newEvent.type === "match") {
      if (getHallTypeOld(halls, newEvent.hall_id) === "vip") {
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
      type: event.type,
      category: event.category as string,
      date: event.date,
      time: event.time,
      hall_id: event.hall_id,
      description: event.description || "",
      duration: event.duration || 120,
      pricing: event.pricing, // Use the existing pricing from the event
      image: event.image || "", // Set image_url for editing
      status: event.status,
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

  const handleDeleteEventOld = async (id: string, title: string) => {
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

  const handlePrintReceiptOld = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsPrintReceiptOpen(true)
  }

  const printReceiptOld = () => {
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
        if (fullEventData.type === "match") {
          if (getHallTypeOld(halls, fullEventData.hall_id) === "vip") {
            generatedSeats = generateVipMatchSeats(fullEventData.pricing, fullEventData.bookedSeats)
          } else {
            generatedSeats = generateStandardMatchSeats(
              fullEventData.pricing,
              fullEventData.hall_id,
              halls, // Pass halls here
              fullEventData.bookedSeats,
            )
          }
        } else {
          // Movie event
          if (getHallTypeOld(halls, fullEventData.hall_id) === "vip") {
            generatedSeats = generateMovieSeats(
              fullEventData.pricing,
              fullEventData.hall_id,
              halls,
              fullEventData.bookedSeats,
            ) // Pass halls here
          } else {
            generatedSeats = generateMovieSeats(
              fullEventData.pricing,
              fullEventData.hall_id,
              halls,
              fullEventData.bookedSeats,
            ) // Pass halls here
          }
        }
        setCurrentEventSeats(generatedSeats)

        setNewBooking((prev) => ({
          ...prev,
          event_id: eventId,
          eventTitle: fullEventData.title,
          eventType: fullEventData.type,
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

    const hallType = getHallTypeOld(halls, selectedEventForBooking?.hall_id || "")

    let newSelectedSeats: string[]
    let newSelectedSeatType: string

    if (selectedEventForBooking?.type === "movie" && hallType === "vip") {
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

  const handleCreateBookingOld = async () => {
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

    if (!newBooking.customer_name || !newBooking.customer_email || !newBooking.customer_phone) {
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
      event_id: selectedEventForBooking._id,
      eventTitle: selectedEventForBooking.title,
      eventType: selectedEventForBooking.type,
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
        description: `Booking for ${newBooking.customer_name} has been added.`,
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

    const hallType = getHallTypeOld(halls, event.hall_id)

    specificBookedSeats.forEach((seatId) => {
      let seatTypeKey = "Unknown"
      if (event.type === "match") {
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
    const summaryTotalRevenue = filteredReportsBookings.reduce((sum, booking) => sum + booking.total_amount, 0)
    const summaryTotalBookings = filteredReportsBookings.length
    const summaryTotalSeatsBooked = filteredReportsBookings.reduce((sum, booking) => sum + booking.seats.length, 0)

    let summaryOverallOccupancyRate = 0
    let summaryRevenueByCategoryHtml = ""
    let summaryHallPerformanceHtml = ""
    let specificEventDetailsHtml = ""

    const currentEventForReport =
      selectedEventIdForReports !== "all" ? events.find((e) => e._id === selectedEventIdForReports) : null

    if (currentEventForReport) {
      const eventBookingsForReport = filteredReportsBookings.filter((b) => b.event_id === currentEventForReport._id)
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
          <h3 class="text-xl font-semibold mb-4">${currentEventForReport.title} (${getHallDisplayNameOld(halls, currentEventForReport.hall_id)})</h3>
          <p><strong>Date:</strong> ${currentEventForReport.date}</p>
          <p><strong>Time:</strong> ${currentEventForReport.time}</p>
          <p><strong>Total Seats:</strong> ${currentEventForReport.total_seats}</p>
          <p><strong>Booked Seats (Filtered):</strong> ${eventBookedSeatsCount}</p>
          <p><strong>Occupancy:</strong> ${summaryOverallOccupancyRate.toFixed(0)}%</p>
          <h4 class="text-lg font-semibold mt-4 mb-2">Booked Seats Breakdown:</h4>
          <ul>${seatBreakdownList}</ul>
        </div>
      `
    } else {
      // Calculate for all filtered events
      const relevantEventIds = new Set(filteredReportsBookings.map((b) => b.event_id))
      const relevantEvents = events.filter((e) => relevantEventIds.has(e._id))

      const totalBookedSeatsFiltered = filteredReportsBookings.reduce((sum, booking) => sum + booking.seats.length, 0)
      const totalAvailableSeatsRelevant = relevantEvents.reduce((sum, event) => sum + event.total_seats, 0)
      summaryOverallOccupancyRate =
        totalAvailableSeatsRelevant > 0 ? (totalBookedSeatsFiltered / totalAvailableSeatsRelevant) * 100 : 0

      const currentRevenueByCategory = filteredReportsBookings.reduce(
        (acc, booking) => {
          const category = events.find((e) => e._id === booking.event_id)?.category || "Unknown"
          acc[category] = (acc[category] || 0) + booking.total_amount
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
          const hallName = getHallDisplayNameOld(halls, event.hall_id)
          if (!acc[hallName]) {
            acc[hallName] = { booked: 0, total: 0 }
          }
          // Sum booked seats for this hall from the filtered bookings
          const bookedSeatsForHall = filteredReportsBookings
            .filter((b) => b.event_id === event._id)
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
            <div><strong>Selected Event:</strong> ${currentEventForReport ? `${currentEventForReport.title} (${getHallDisplayNameOld(halls, currentEventForReport.hall_id)})` : "All Events"}</div>
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
      input.style.display = "" // Hide it again
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

  const handleDeleteHallOld = async (id: string, name: string) => {
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
    const bookingDate = new Date(booking.booking_date)

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

  const totalRevenue = filteredBookingsForRevenue.reduce((sum, booking) => sum + booking.total_amount, 0)
  const totalBookings = actualBookings.length
  const activeEventsCount = events.filter((e) => e.status === "active").length

  const totalBookedSeatsCount = events.reduce((sum, event) => sum + (event.bookedSeats?.length || 0), 0)
  const totalAvailableSeatsCount = events.reduce((sum, event) => sum + event.total_seats, 0)
  const overallOccupancyRate =
    totalAvailableSeatsCount > 0 ? (totalBookedSeatsCount / totalAvailableSeatsCount) * 100 : 0

  const revenueByCategory = actualBookings.reduce(
    (acc, booking) => {
      const category = events.find((e) => e._id === booking.event_id)?.category || "Unknown"
      acc[category] = (acc[category] || 0) + booking.total_amount
      return acc
    },
    {} as Record<string, number>,
  )

  const hallPerformance = events.reduce(
    (acc, event) => {
      const hallName = getHallDisplayNameOld(halls, event.hall_id)
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
    const bookingDate = new Date(booking.booking_date)
    const start = reportStartDate ? new Date(reportStartDate) : null
    const end = reportEndDate ? new Date(reportEndDate) : null

    const matchesDate =
      (!start || bookingDate >= start) && (!end || bookingDate <= new Date(end.setDate(end.getDate() + 1))) // +1 day to include end date

    const matchesEventType = reportEventType === "all" || booking.eventType === reportEventType
    const matchesStatus = reportStatus === "all" || booking.status === reportStatus
    const matchesEvent = selectedEventIdForReports === "all" || booking.event_id === selectedEventIdForReports // New filter

    return matchesDate && matchesEventType && matchesStatus && matchesEvent
  })

  // --- Bookings Tab Filtering and Search ---
  const filteredCustomerBookings = actualBookings.filter((booking) => {
    const matchesEvent = selectedEventIdForBookings === "all" || booking.event_id === selectedEventIdForBookings
    const matchesSearch =
      customerSearchQuery === "" ||
      booking.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(customerSearchQuery.toLowerCase())

    return matchesEvent && matchesSearch
  })

  const getHallDisplayName = (halls: Hall[], hallId: string): string => {
    const hall = halls.find((h) => h._id === hallId)
    return hall ? `${hall.name} (${hall.type})` : "Unknown Hall"
  }

  const calculateOccupancy = (eventId: string) => {
    const eventBookings = actualBookings.filter(
      (booking) => booking.event_id === eventId && booking.status === "confirmed",
    )
    const occupiedSeats = eventBookings.reduce((total, booking) => total + booking.seats.length, 0)

    const event = events.find((e) => e._id === eventId)
    const hall = event ? halls.find((h) => h._id === event.hall_id) : null
    const totalSeats = hall ? hall.capacity : 0

    return {
      occupied: occupiedSeats,
      total: totalSeats,
      percentage: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
    }
  }

  const filteredBookings = actualBookings.filter((booking) => {
    const matchesEvent = selectedEventIdForBookings === "all" || booking.event_id === selectedEventIdForBookings
    const matchesSearch =
      customerSearchQuery === "" ||
      booking.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      booking.customer_phone.includes(customerSearchQuery)

    return matchesEvent && matchesSearch
  })

  const handleEditEvent = (event: Event) => {
    setNewEvent({
      title: event.title,
      description: event.description,
      type: event.type,
      category: event.category || "",
      date: event.date,
      time: event.time,
      duration: event.duration || 120,
      hall_id: event.hall_id,
      image: event.image || "",
      status: event.status,
      pricing: event.pricing,
    })
    setIsEditEventOpen(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm(`Are you sure you want to delete this event?`)) {
      return
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`)
      }

      toast({
        title: "Event deleted successfully!",
        description: `Event has been removed.`,
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

  const handleCreateBooking = () => {
    setIsCreateBookingOpen(true)
  }

  useEffect(() => {
    fetchHalls()
  }, [fetchHalls])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents, fetchHalls])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      <AdminBackground />

      <AdminHeader
        isCreateEventOpen={isCreateEventOpen}
        setIsCreateEventOpen={setIsCreateEventOpen}
        createEventDialog={
          // ... existing create event dialog content ...
          <div>Create Event Dialog Content</div>
        }
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs>
          <AdminTabs>
            <EventsTab
              events={events}
              halls={halls}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              getHallDisplayName={getHallDisplayName}
              calculateOccupancy={calculateOccupancy}
            />

            <BookingsTab
              bookings={actualBookings}
              events={events}
              halls={halls}
              selectedEventIdForBookings={selectedEventIdForBookings}
              setSelectedEventIdForBookings={setSelectedEventIdForBookings}
              customerSearchQuery={customerSearchQuery}
              setCustomerSearchQuery={setCustomerSearchQuery}
              onPrintReceipt={handlePrintReceipt}
              onCreateBooking={handleCreateBooking}
              getHallDisplayName={getHallDisplayName}
              filteredBookings={filteredBookings}
            />

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
                            onValueChange={(value: "VIP" | "Standard") =>
                              setCurrentHall({ ...currentHall, type: value })
                            }
                          >
                            <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                              <SelectValue placeholder="Select hall type" />
                            </SelectTrigger>
                            <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="VIP">VIP</SelectItem>
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
                                    onClick={() => handleDeleteHallOld(hall._id, hall.name)}
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
                                  <div className="font-semibold">{booking.customer_name}</div>
                                  <div className="text-xs text-cyber-slate-400">{booking.customer_email}</div>
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
                                  <div className="font-semibold">₦{(booking.total_amount || 0).toLocaleString()}</div>
                                  <div className="text-xs text-cyber-slate-400">
                                    Base: ₦{(booking.amount || 0).toLocaleString()} + Fee: ₦{booking.processingFee || 0}
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
                                  <div>{new Date(booking.booking_date).toLocaleDateString()}</div>
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
          </AdminTabs>
        </Tabs>
      </main>

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
                <Image
                  src="/dexcinema-logo.jpeg"
                  alt="Dex View Cinema Logo"
                  width={150}
                  height={150}
                  className="mx-auto mb-4"
                />
                <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
                <p className="text-gray-600">Premium Entertainment Experience</p>
                <div className="border-b-2 border-brand-red-600 mt-4"></div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Customer Information</h3>
                  <p>
                    <strong>Name:</strong> {selectedBooking.customer_name}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedBooking.customer_email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedBooking.customer_phone}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                  <p>
                    <strong>Booking ID:</strong> {selectedBooking._id}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedBooking.booking_date}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedBooking.bookingTime}
                  </p>
                  <p>
                    <strong>Payment:</strong> {selectedBooking.payment_method}
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
                  <span>₦{selectedBooking.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
                <p>Thank you for choosing Dex View Cinema!</p>
                <p>For support, visit us at support@dexviewcinema.com or call 08139614950</p>
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
              onClick={printReceiptOld}
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
