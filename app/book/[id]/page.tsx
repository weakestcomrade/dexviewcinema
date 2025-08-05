"use client"

import { useState, useEffect, useCallback } from "react"
import { notFound, useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CreditCard,
  Shield,
  Sparkles,
  Star,
  Trophy,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getMonnifyKeys } from "@/app/actions/get-monnify-public-key" // Import the server action
import { Skeleton } from "@/components/ui/skeleton"

// Define types for event fetched from the database
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string // Assuming date comes as string from DB
  event_time: string // Assuming time comes as string from DB
  hall_id: string // e.g., "hallA", "hallB", "vip_hall"
  status: "active" | "draft" | "cancelled"
  image_url?: string
  description?: string
  duration?: string
  pricing?: {
    vipSofaSeats?: { price: number; count: number; available?: number }
    vipRegularSeats?: { price: number; count: number; available?: number }
    vipSingle?: { price: number; count: number; available?: number }
    vipCouple?: { price: number; count: number; available?: number }
    vipFamily?: { price: number; count: number; available?: number }
    standardSingle?: { price: number; count: number; available?: number }
    standardCouple?: { price: number; count: number; available?: number }
    standardFamily?: { price: number; count: number; available?: number }
    standardMatchSeats?: { price: number; count: number; available?: number } // New for standard match halls
  }
  bookedSeats?: string[] // Added to store booked seat IDs
  date: string
  time: string
  hall: {
    name: string
    seats: { row: string; number: number; status: string }[]
  }
  price: number
}

interface Seat {
  id: string
  row?: string
  number?: number
  type: string
  isBooked: boolean
  price: number
}

interface MonnifyInitializeOptions {
  amount: number
  currency: string
  reference: string
  customerName: string
  customerEmail: string
  apiKey: string
  contractCode: string
  paymentDescription: string
  onComplete: (response: any) => void
  onClose: () => void
}

// Extend Window interface to include MonnifySDK
declare global {
  interface Window {
    MonnifySDK: any
  }
}

// Helper to map hall_id to display name and total seats
const hallMapping: { [key: string]: { name: string; seats: number; type: "vip" | "standard" } } = {
  hallA: { name: "Hall A", seats: 48, type: "standard" },
  hallB: { name: "Hall B", seats: 60, type: "standard" },
  vip_hall: { name: "VIP Hall", seats: 22, type: "vip" },
}

const getHallDisplayName = (hallId: string) => hallMapping[hallId]?.name || hallId
const getHallType = (hallId: string) => hallMapping[hallId]?.type || "standard"
const getHallTotalSeats = (hallId: string) => hallMapping[hallId]?.seats || 0

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
  const totalSeats = getHallTotalSeats(hallId)
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
  const hallType = getHallType(hallId)
  const totalSeats = getHallTotalSeats(hallId)

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

export default function BookingPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeatType, setSelectedSeatType] = useState<string>("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<any>(null)
  const [monnifyKeys, setMonnifyKeys] = useState<{ publicKey: string; contractCode: string } | null>(null)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)

  //const eventId = params.id

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/events/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          notFound()
        }
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data: Event = await res.json()

      // Ensure pricing object exists and has correct structure based on event type and hall
      const hallType = getHallType(data.hall_id)
      let calculatedPricing = data.pricing || {}

      if (data.event_type === "match") {
        if (data.hall_id === "vip_hall") {
          calculatedPricing = {
            vipSofaSeats: { price: calculatedPricing.vipSofaSeats?.price || 0, count: 10 },
            vipRegularSeats: { price: calculatedPricing.vipRegularSeats?.price || 0, count: 12 },
          }
        } else if (data.hall_id === "hallA" || data.hall_id === "hallB") {
          calculatedPricing = {
            standardMatchSeats: {
              price: calculatedPricing.standardMatchSeats?.price || 0,
              count: getHallTotalSeats(data.hall_id),
            },
          }
        }
      } else if (hallType === "vip") {
        calculatedPricing = {
          vipSingle: { price: calculatedPricing.vipSingle?.price || 0, count: 20 },
          vipCouple: { price: calculatedPricing.vipCouple?.price || 0, count: 14 },
          vipFamily: { price: calculatedPricing.vipFamily?.price || 0, count: 14 },
        }
      } else {
        // Standard halls (Hall A, Hall B) for movies
        calculatedPricing = {
          standardSingle: {
            price: calculatedPricing.standardSingle?.price || 0,
            count: getHallTotalSeats(data.hall_id),
          },
        }
      }

      const formattedEvent: Event = {
        ...data,
        hall_id: data.hall_id, // Use the actual hall_id from DB
        pricing: calculatedPricing,
        bookedSeats: data.bookedSeats || [], // Use actual booked seats from DB
        date: data.event_date,
        time: data.event_time,
        hall: {
          name: getHallDisplayName(data.hall_id),
          seats: [],
        },
        price: 100,
      }
      setEvent(formattedEvent)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEvent()

    const fetchMonnifyKeys = async () => {
      try {
        const keysString = await getMonnifyKeys() // Call the server action
        if (keysString) {
          const keys = JSON.parse(keysString)
          setMonnifyKeys(keys)
        } else {
          toast({
            title: "Error",
            description: "Failed to load payment configuration.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching Monnify keys:", error)
        toast({
          title: "Error",
          description: "Failed to load payment configuration.",
          variant: "destructive",
        })
      }
    }

    fetchMonnifyKeys()
  }, [fetchEvent, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 50 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The event you are looking for does not exist or has been removed.</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seatsData =
    event.event_type === "match"
      ? event.hall_id === "vip_hall"
        ? generateVipMatchSeats(event.pricing, event.bookedSeats)
        : generateStandardMatchSeats(event.pricing, event.hall_id, event.bookedSeats)
      : generateMovieSeats(event.pricing, event.hall_id, event.bookedSeats)

  const seats = seatsData.map((seat) => ({
    row: seat.row || "A",
    number: Number.parseInt(seat.id.replace(/[^0-9]/g, "")),
    status: seat.isBooked ? "booked" : "available",
  }))

  const handleSeatClick = (seatId: string, seatType: string, isBooked: boolean, seatPrice: number) => {
    if (isBooked) return

    const hallType = getHallType(event.hall_id)

    if (event.event_type === "movie" && hallType === "vip") {
      // For VIP movie halls, only allow one selection per type (single, couple, family unit)
      if (selectedSeats.length > 0 && selectedSeatType !== seatType) {
        toast({
          title: "Seat Selection Conflict",
          description: `Please select only ${getSeatTypeName(selectedSeatType)} seats for consistency.`,
          variant: "destructive",
        })
        return
      }
      if (selectedSeats.includes(seatId)) {
        setSelectedSeats([])
        setSelectedSeatType("")
      } else {
        setSelectedSeats([seatId])
        setSelectedSeatType(seatType)
      }
    } else {
      // For football matches (both VIP and Standard) and standard movie halls, allow multiple selections of same type
      if (selectedSeats.length > 0 && selectedSeatType !== seatType) {
        toast({
          title: "Seat Selection Conflict",
          description: `Please select only ${getSeatTypeName(selectedSeatType)} seats for consistency.`,
          variant: "destructive",
        })
        return
      }

      if (selectedSeats.includes(seatId)) {
        const newSeats = selectedSeats.filter((id) => id !== seatId)
        setSelectedSeats(newSeats)
        if (newSeats.length === 0) setSelectedSeatType("")
      } else {
        setSelectedSeats([...selectedSeats, seatId])
        setSelectedSeatType(seatType)
      }
    }
  }

  const calculateTotalPrice = () => {
    if (!event) return 0

    let total = 0
    selectedSeats.forEach((seatId) => {
      const seat = seatsData.find((s) => s.id === seatId)
      if (seat) {
        total += seat.price
      }
    })
    return total
  }

  const getSeatPrice = () => {
    if (selectedSeats.length === 0) return 0

    let total = 0
    selectedSeats.forEach((seatId) => {
      const seat = seatsData.find((s) => s.id === seatId)
      if (seat) {
        total += seat.price
      }
    })
    return total
  }

  const totalAmount = getSeatPrice()
  const processingFee = 0 // Removed processing fee as requested
  const finalAmount = totalAmount // Final amount is just the total seat price

  const handleBooking = async (transactionReference: string) => {
    try {
      // 1. Create the booking record
      const bookingData = {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        eventId: event._id,
        eventTitle: event.title,
        eventType: event.event_type,
        seats: selectedSeats,
        seatType: selectedSeatType,
        amount: totalAmount,
        processingFee: 0, // Explicitly set to 0
        totalAmount: finalAmount,
        status: "confirmed",
        bookingDate: format(new Date(), "yyyy-MM-dd"),
        bookingTime: format(new Date(), "HH:mm"),
        paymentMethod: "Monnify", // Payment method is Monnify
        transactionReference: transactionReference, // Add Monnify transaction reference
      }

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      })

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json()
        throw new Error(errorData.message || `HTTP error! status: ${bookingRes.status}`)
      }

      const confirmedBooking = await bookingRes.json()

      // 2. Update the event's booked seats
      const updateEventRes = await fetch(`/api/events/${event._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newBookedSeats: selectedSeats }),
      })

      if (!updateEventRes.ok) {
        const errorData = await updateEventRes.json()
        throw new Error(errorData.message || `Failed to update event seats: ${updateEventRes.statusText}`)
      }

      setBookingDetails(confirmedBooking)
      setIsBookingConfirmed(true)
      setSelectedSeats([]) // Clear selected seats after booking
      setSelectedSeatType("")
      setCustomerInfo({ name: "", email: "", phone: "" })
      setPaymentMethod("card") // Reset to default
      toast({
        title: "Booking Confirmed!",
        description: `Your booking for ${event.title} is successful.`,
      })
      // Re-fetch event data to update the UI with newly booked seats
      await fetchEvent()
    } catch (error) {
      console.error("Failed to book seats:", error)
      toast({
        title: "Booking Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    }
  }

  const handleBookTickets = async () => {
    if (!event || selectedSeats.length === 0 || !monnifyKeys) {
      toast({
        title: "Validation Error",
        description: "Please select at least one seat and ensure payment configuration is loaded.",
        variant: "destructive",
      })
      return
    }

    setIsPaymentProcessing(true)

    const totalAmount = calculateTotalPrice()
    const transactionReference = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    if (window.MonnifySDK) {
      window.MonnifySDK.initialize({
        amount: totalAmount,
        currency: "NGN",
        reference: transactionReference,
        customerName: customerInfo.name, // Replace with actual user name
        customerEmail: customerInfo.email, // Replace with actual user email
        apiKey: monnifyKeys.publicKey,
        contractCode: monnifyKeys.contractCode,
        paymentDescription: `Booking for ${event.title}`,
        onComplete: async (response: any) => {
          console.log("Monnify payment complete:", response)
          if (response.status === "SUCCESS") {
            try {
              const bookingData = {
                eventId: event._id,
                userId: "652a1234567890abcdef012345", // Placeholder User ID
                selectedSeats: selectedSeats,
                totalPrice: totalAmount,
                paymentStatus: "completed",
                transactionReference: response.transactionReference,
                processingFee: response.transactionHash?.processingFees || 0,
              }

              const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(bookingData),
              })

              if (!res.ok) {
                throw new Error("Failed to save booking")
              }

              toast({
                title: "Payment Successful",
                description: "Your booking has been confirmed!",
              })
              router.push(`/bookings`) // Redirect to bookings page
            } catch (error) {
              console.error("Error saving booking:", error)
              toast({
                title: "Booking Error",
                description: "Payment was successful, but there was an error saving your booking.",
                variant: "destructive",
              })
            }
          } else {
            toast({
              title: "Payment Failed",
              description: "Your payment could not be processed.",
              variant: "destructive",
            })
          }
          setIsPaymentProcessing(false)
        },
        onClose: () => {
          console.log("Monnify payment closed.")
          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window.",
          })
          setIsPaymentProcessing(false)
        },
      })
    } else {
      toast({
        title: "Error",
        description: "Monnify SDK not loaded. Please try again.",
        variant: "destructive",
      })
      setIsPaymentProcessing(false)
    }
  }

  const handleMonnifyPayment = async () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select at least one seat.",
        variant: "destructive",
      })
      return
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all customer information.",
        variant: "destructive",
      })
      return
    }

    // Fetch Monnify keys securely from the server
    const monnifyKeysString = await getMonnifyKeys()
    if (!monnifyKeysString) {
      toast({
        title: "Payment Configuration Error",
        description: "Monnify public key or contract code could not be retrieved. Please check server configuration.",
        variant: "destructive",
      })
      return
    }
    const { publicKey, contractCode } = JSON.parse(monnifyKeysString)

    if (!publicKey || !contractCode) {
      toast({
        title: "Payment Configuration Error",
        description: "Monnify public key or contract code is missing. Please check environment variables.",
        variant: "destructive",
      })
      return
    }

    const transactionReference = `BOOKING-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    if (typeof window !== "undefined" && window.MonnifySDK) {
      window.MonnifySDK.initialize({
        amount: finalAmount, // Use finalAmount (which is totalAmount)
        currency: "NGN",
        reference: transactionReference,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        apiKey: publicKey, // Use fetched public key
        contractCode: contractCode, // Use fetched contract code
        paymentDescription: `Booking for ${event.title}`,
        onComplete: async (response: any) => {
          console.log("Monnify payment complete:", response)
          if (response.status === "SUCCESS") {
            await handleBooking(transactionReference) // Proceed with booking creation
          } else {
            toast({
              title: "Payment Failed",
              description: "Monnify payment was not successful. Please try again.",
              variant: "destructive",
            })
          }
        },
        onClose: (data: any) => {
          console.log("Monnify payment closed:", data)
          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window.",
            variant: "info",
          })
        },
      })
    } else {
      toast({
        title: "Payment Error",
        description: "Monnify SDK not loaded. Please refresh the page or check your network connection.",
        variant: "destructive",
      })
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
      </div>

      {/* Header with glassmorphism */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Book Your Experience
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">Select your seats and complete booking</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* Event Details */}
          <div className="xl:col-span-2 space-y-6">
            {/* Event Info */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-hover transition-all duration-500 border border-white/20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="relative w-full sm:w-48 md:w-56 lg:w-64 flex-shrink-0">
                    <img
                      src={event.image_url || "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-48 sm:h-32 md:h-36 lg:h-40 object-cover rounded-3xl shadow-cyber-card group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                        {event.title}
                      </h2>
                      <Badge className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white shadow-glow-red px-4 py-2 rounded-4xl font-semibold self-start">
                        {event.category}
                      </Badge>
                    </div>
                    <p className="text-cyber-slate-300 mb-4 sm:mb-6 text-base sm:text-lg leading-relaxed">
                      {event.description}
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 text-sm">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-sm sm:text-base">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-sm sm:text-base">
                          {event.event_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-sm sm:text-base">
                          {getHallDisplayName(event.hall_id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-sm sm:text-base">{event.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-2xl font-bold">
                  <Sparkles className="w-6 h-6 text-brand-red-400 animate-pulse" />
                  Pricing & Seat Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {event.event_type === "match" ? (
                  event.hall_id === "vip_hall" && event.pricing?.vipSofaSeats && event.pricing?.vipRegularSeats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-glass-white p-4 rounded-3xl border border-brand-red-500/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Trophy className="w-6 h-6 text-brand-red-400" />
                          <h3 className="text-lg font-bold text-white">VIP Sofa Seats</h3>
                        </div>
                        <p className="text-cyber-slate-300 mb-2">Premium comfort with sofa-style seating</p>
                        <p className="text-2xl font-bold text-brand-red-300">
                          ₦{event.pricing.vipSofaSeats.price.toLocaleString()} per seat
                        </p>
                        <p className="text-sm text-cyber-slate-400">
                          Available:{" "}
                          {event.pricing.vipSofaSeats.count -
                            (event.bookedSeats?.filter((s) => s.startsWith("S")).length || 0)}
                          /{event.pricing.vipSofaSeats.count}
                        </p>
                      </div>
                      <div className="bg-glass-white p-4 rounded-3xl border border-cyber-blue-500/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Star className="w-6 h-6 text-cyber-blue-400" />
                          <h3 className="text-lg font-bold text-white">VIP Regular Seats</h3>
                        </div>
                        <p className="text-cyber-slate-300 mb-2">Premium seating with excellent view</p>
                        <p className="text-2xl font-bold text-cyber-blue-300">
                          ₦{event.pricing.vipRegularSeats.price.toLocaleString()} per seat
                        </p>
                        <p className="text-sm text-cyber-slate-400">
                          Available:{" "}
                          {event.pricing.vipRegularSeats.count -
                            (event.bookedSeats?.filter((s) => s.startsWith("A") || s.startsWith("B")).length || 0)}
                          /{event.pricing.vipRegularSeats.count}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Standard Match Hall (Hall A or Hall B)
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-glass-white p-4 rounded-3xl border border-cyber-green-500/30">
                        <div className="flex items-center gap-3 mb-3">
                          <Users className="w-6 h-6 text-cyber-green-400" />
                          <h3 className="text-lg font-bold text-white">Standard Match Seats</h3>
                        </div>
                        <p className="text-cyber-slate-300 mb-2">Individual standard match seat</p>
                        <p className="text-2xl font-bold text-cyber-green-300">
                          ₦{event.pricing?.standardMatchSeats?.price?.toLocaleString()}
                        </p>
                        <p className="text-sm text-cyber-slate-400">
                          Available:{" "}
                          {event.pricing?.standardMatchSeats?.count -
                            (event.bookedSeats?.filter((s) => s.startsWith(event.hall_id.toUpperCase())).length || 0)}
                          /{event.pricing?.standardMatchSeats?.count}
                        </p>
                      </div>
                    </div>
                  )
                ) : getHallType(event.hall_id) === "vip" ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-glass-white p-4 rounded-3xl border border-cyber-green-500/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-6 h-6 text-cyber-green-400" />
                        <h3 className="text-lg font-bold text-white">VIP Single</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2">Individual premium seat</p>
                      <p className="text-2xl font-bold text-cyber-green-300">
                        ₦{event.pricing?.vipSingle?.price?.toLocaleString()}
                      </p>
                      <p className="text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipSingle?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("S")).length || 0)}
                        /{event.pricing?.vipSingle?.count}
                      </p>
                    </div>
                    <div className="bg-glass-white p-4 rounded-3xl border border-cyber-purple-500/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-6 h-6 text-cyber-purple-400" />
                        <h3 className="text-lg font-bold text-white">VIP Couple</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2">Intimate seating for two</p>
                      <p className="text-2xl font-bold text-cyber-purple-300">
                        ₦{event.pricing?.vipCouple?.price?.toLocaleString()}
                      </p>
                      <p className="text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipCouple?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("C")).length || 0)}
                        /{event.pricing?.vipCouple?.count}
                      </p>
                    </div>
                    <div className="bg-glass-white p-4 rounded-3xl border border-brand-red-500/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-6 h-6 text-brand-red-400" />
                        <h3 className="text-lg font-bold text-white">VIP Family</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2">Perfect for families (4+ members)</p>
                      <p className="text-2xl font-bold text-brand-red-300">
                        ₦{event.pricing?.vipFamily?.price?.toLocaleString()}
                      </p>
                      <p className="text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipFamily?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("F")).length || 0)}
                        /{event.pricing?.vipFamily?.count}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-glass-white p-4 rounded-3xl border border-cyber-green-500/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-6 h-6 text-cyber-green-400" />
                        <h3 className="text-lg font-bold text-white">Standard Single</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2">Individual standard seat</p>
                      <p className="text-2xl font-bold text-cyber-green-300">
                        ₦{event.pricing?.standardSingle?.price?.toLocaleString()}
                      </p>
                      <p className="text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.standardSingle?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith(event.hall_id.toUpperCase())).length || 0)}
                        /{event.pricing?.standardSingle?.count}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seat Selection */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-2xl font-bold">
                  <Sparkles className="w-6 h-6 text-brand-red-400 animate-pulse" />
                  Select Your Seats
                </CardTitle>
                <CardDescription className="text-cyber-slate-300 text-lg">
                  Choose your preferred seats from the {getHallDisplayName(event.hall_id)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Screen/Field */}
                <div className="mb-10">
                  <div className="bg-gradient-to-r from-brand-red-100/20 via-brand-red-50/20 to-brand-red-100/20 text-white text-center py-6 rounded-5xl mb-8 border-2 border-brand-red-500/30 shadow-cyber-card backdrop-blur-sm">
                    <span className="text-lg font-bold flex items-center justify-center gap-3">
                      <Sparkles className="w-6 h-6 text-brand-red-400 animate-spin-slow" />
                      {event.event_type === "match" ? "🏟️ FOOTBALL FIELD VIEW 🏟️" : "🎬 PREMIUM SCREEN VIEW 🎬"}
                      <Sparkles className="w-6 h-6 text-brand-red-400 animate-spin-slow" />
                    </span>
                  </div>
                </div>

                {/* Seat Map */}
                {event.event_type === "match" ? (
                  event.hall_id === "vip_hall" ? (
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
                                {seatsData
                                  .filter((seat) => seat.row === row && seat.type === "sofa")
                                  .map((seat) => (
                                    <button
                                      key={seat.id}
                                      onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                                      disabled={seat.isBooked}
                                      className={`
                                       w-16 h-16 sm:w-20 sm:h-16 rounded-3xl border-3 text-sm font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                                       ${
                                         seat.isBooked
                                           ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                           : selectedSeats.includes(seat.id)
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
                                {seatsData
                                  .filter((seat) => seat.row === row && seat.type === "regular")
                                  .map((seat) => (
                                    <button
                                      key={seat.id}
                                      onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                                      disabled={seat.isBooked}
                                      className={`
                                       w-16 h-16 rounded-3xl border-3 text-lg font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                                       ${
                                         seat.isBooked
                                           ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                           : selectedSeats.includes(seat.id)
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
                        <h4 className="text-lg font-bold text-cyber-green-300 mb-4">Standard Match Seats</h4>
                        <div
                          className={`grid gap-3 ${
                            event.hall_id === "hallA" ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-6 sm:grid-cols-10"
                          }`}
                        >
                          {seatsData
                            .filter((seat) => seat.type === "standardMatch")
                            .map((seat) => (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                                disabled={seat.isBooked}
                                className={`
                                 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                                 ${
                                   seat.isBooked
                                     ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                     : selectedSeats.includes(seat.id)
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
                ) : getHallType(event.hall_id) === "vip" ? (
                  <div className="space-y-8">
                    {/* VIP Single Seats */}
                    <div>
                      <h4 className="text-lg font-bold text-cyber-green-300 mb-4">VIP Single Seats</h4>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                        {seatsData
                          .filter((seat) => seat.type === "vipSingle")
                          .map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                              disabled={seat.isBooked}
                              className={`
                               w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card
                               ${
                                 seat.isBooked
                                   ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                   : selectedSeats.includes(seat.id)
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
                        {seatsData
                          .filter((seat) => seat.type === "vipCouple")
                          .map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                              disabled={seat.isBooked}
                              className={`
                               w-16 h-12 sm:w-20 sm:h-14 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                               ${
                                 seat.isBooked
                                   ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                   : selectedSeats.includes(seat.id)
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
                      <h4 className="text-lg font-bold text-brand-red-300 mb-4">VIP Family Seats (4+ members)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                        {seatsData
                          .filter((seat) => seat.type === "vipFamily")
                          .map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                              disabled={seat.isBooked}
                              className={`
                               w-20 h-16 sm:w-24 sm:h-16 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                               ${
                                 seat.isBooked
                                   ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                   : selectedSeats.includes(seat.id)
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
                          event.hall_id === "hallA" ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-6 sm:grid-cols-10"
                        }`}
                      >
                        {seatsData
                          .filter((seat) => seat.type === "standardSingle")
                          .map((seat) => (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id, seat.type, seat.isBooked, seat.price)}
                              disabled={seat.isBooked}
                              className={`
                               w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform hover:scale-110 shadow-cyber-card flex items-center justify-center
                               ${
                                 seat.isBooked
                                   ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                   : selectedSeats.includes(seat.id)
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

            {/* Customer Information */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-2xl font-bold">
                  <Shield className="w-6 h-6 text-brand-red-400" />
                  Customer Information
                </CardTitle>
                <CardDescription className="text-cyber-slate-300 text-lg">
                  Please provide your contact details for booking confirmation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-cyber-slate-200 font-semibold text-base sm:text-lg">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-12 sm:h-14 text-base sm:text-lg rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-red-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-cyber-slate-200 font-semibold text-base sm:text-lg">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="Enter your email"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-12 sm:h-14 text-base sm:text-lg rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-400"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-cyber-slate-200 font-semibold text-base sm:text-lg">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-12 sm:h-14 text-base sm:text-lg rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-red-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="space-y-6">
            <Card className="sticky top-4 bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-lg sm:text-xl font-bold">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red-400" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div>
                  <h4 className="font-bold mb-3 sm:mb-4 text-cyber-slate-200 text-base sm:text-lg">Selected Seats</h4>
                  {selectedSeats.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {selectedSeats.map((seat) => (
                          <Badge
                            key={seat}
                            variant="outline"
                            className="bg-gradient-to-r from-brand-red-50/20 to-brand-red-100/20 text-brand-red-300 border-brand-red-300/50 px-3 sm:px-4 py-1 sm:py-2 text-sm sm:text-lg font-semibold rounded-xl sm:rounded-2xl"
                          >
                            {seat}
                          </Badge>
                        ))}
                      </div>
                      <div className="bg-glass-white p-3 rounded-2xl">
                        <p className="text-cyber-slate-300 font-semibold">
                          Seat Type: <span className="text-brand-red-300">{getSeatTypeName(selectedSeatType)}</span>
                        </p>
                        <p className="text-cyber-slate-300 font-semibold">
                          Quantity: <span className="text-brand-red-300">{selectedSeats.length}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-cyber-slate-400 text-base sm:text-lg">No seats selected</p>
                  )}
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="text-cyber-slate-300">
                      {selectedSeatType && `${getSeatTypeName(selectedSeatType)} (${selectedSeats.length})`}
                    </span>
                    <span className="text-white font-bold">₦{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-cyber-slate-400">Processing Fee (0%)</span> {/* Updated text */}
                    <span className="text-cyber-slate-300 font-semibold">₦{processingFee.toLocaleString()}</span>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="flex justify-between font-bold text-xl sm:text-2xl">
                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                    Total Amount
                  </span>
                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                    ₦{finalAmount.toLocaleString()}
                  </span>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-3xl transform hover:scale-105 transition-all duration-300 group font-bold text-base sm:text-lg py-4 sm:py-6 h-auto"
                  onClick={handleBookTickets} // Call Monnify payment initiator
                  disabled={selectedSeats.length === 0 || isPaymentProcessing || !monnifyKeys}
                >
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:rotate-12 transition-transform" />
                  {isPaymentProcessing ? "Processing Payment..." : "Proceed to Payment"}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-red-400/20 to-brand-red-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                </Button>

                <p className="text-xs text-cyber-slate-400 text-center leading-relaxed">
                  Secure payment processing • Receipt will be generated upon successful booking
                </p>
              </CardContent>
            </Card>

            {/* Event Details Card */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-lg text-cyber-slate-200 font-bold">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Date</span>
                  <span className="text-cyber-slate-200 font-semibold">
                    {new Date(event.event_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Time</span>
                  <span className="text-cyber-slate-200 font-semibold">{event.event_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Venue</span>
                  <span className="text-cyber-slate-200 font-semibold">{getHallDisplayName(event.hall_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Duration</span>
                  <span className="text-cyber-slate-200 font-semibold">{event.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-slate-400">Category</span>
                  <span className="text-cyber-slate-200 font-semibold">{event.category}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-16 relative overflow-hidden border-t border-white/10 mt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-lg mb-4 sm:mb-0">
              &copy; 2025 Dex View Cinema. All rights reserved.
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

      {/* Booking Confirmation Dialog */}
      <Dialog open={isBookingConfirmed} onOpenChange={setIsBookingConfirmed}>
        <DialogContent className="sm:max-w-[425px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-cyber-green-200 bg-clip-text text-transparent flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-cyber-green-400" />
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300">
              Your seats have been successfully booked.
            </DialogDescription>
          </DialogHeader>
          {bookingDetails && (
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
                    <strong>Name:</strong> {bookingDetails.customerName}
                  </p>
                  <p>
                    <strong>Email:</strong> {bookingDetails.customerEmail}
                  </p>
                  <p>
                    <strong>Phone:</strong> {bookingDetails.customerPhone}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                  <p>
                    <strong>Booking ID:</strong> {bookingDetails._id}
                  </p>
                  <p>
                    <strong>Date:</strong> {bookingDetails.bookingDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {bookingDetails.bookingTime}
                  </p>
                  <p>
                    <strong>Payment:</strong> {bookingDetails.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
                <p>
                  <strong>Event:</strong> {bookingDetails.eventTitle}
                </p>
                <p>
                  <strong>Type:</strong> {bookingDetails.eventType === "match" ? "Sports Match" : "Movie"}
                </p>
                <p>
                  <strong>Seats:</strong> {bookingDetails.seats.join(", ")}
                </p>
                <p>
                  <strong>Seat Type:</strong> {bookingDetails.seatType}
                </p>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>Base Amount:</span>
                  <span>₦{bookingDetails.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Processing Fee:</span>
                  <span>₦{bookingDetails.processingFee}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{bookingDetails.totalAmount.toLocaleString()}</span>
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
              onClick={() => setIsBookingConfirmed(false)}
              className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
