"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { generateVipMatchSeats, generateStandardMatchSeats, generateMovieSeats, getSeatTypeName } from "@/utils/seating"

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

type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

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

  const [filteredReportsBookings, setFilteredReportsBookings] = useState<Booking[]>([])

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
      setFilteredReportsBookings(data) // Initialize filteredReportsBookings with all bookings
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
              halls, // Pass halls here
              fullEventData.bookedSeats,
            )
          }
        } else {
          // Movie event
          if (getHallType(halls, fullEventData.hall_id) === "vip") {
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
      input.style.display = ""
    }
  }
}
