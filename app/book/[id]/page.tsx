"use client"

import { useState, useEffect, useCallback } from "react"
import { notFound, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Users, ArrowLeft, CreditCard, Shield, Sparkles, Star, Trophy } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall"
import { PaymentModal } from "@/components/payment-modal"

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
    standardMatchSeats?: { price: number; count: number; available?: number }
  }
  bookedSeats?: string[]
}

interface Seat {
  id: string
  row?: string
  number?: number
  type: string
  isBooked: boolean
  price: number
}

const getHallDetails = (hallId: string, allHalls: Hall[]) => allHalls.find((hall) => hall._id === hallId)
const getHallDisplayName = (hallId: string, allHalls: Hall[]) => getHallDetails(hallId, allHalls)?.name || hallId
const getHallType = (hallId: string, allHalls: Hall[]) => getHallDetails(hallId, allHalls)?.type || "standard"
const getHallTotalSeats = (hallId: string, allHalls: Hall[]) => getHallDetails(hallId, allHalls)?.capacity || 0

const generateVipMatchSeats = (eventPricing: Event["pricing"], bookedSeats: string[] = []) => {
  const seats: Seat[] = []
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

const generateStandardMatchSeats = (
  eventPricing: Event["pricing"],
  hallId: string,
  allHalls: Hall[],
  bookedSeats: string[] = [],
) => {
  const seats: Seat[] = []
  const totalSeats = getHallTotalSeats(hallId, allHalls)
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

const generateMovieSeats = (
  eventPricing: Event["pricing"],
  hallId: string,
  allHalls: Hall[],
  bookedSeats: string[] = [],
) => {
  const seats: Seat[] = []
  const hallType = getHallType(hallId, allHalls)
  const totalSeats = getHallTotalSeats(hallId, allHalls)

  if (hallType === "vip") {
    for (let i = 1; i <= 20; i++) {
      const seatId = `S${i}`
      seats.push({
        id: seatId,
        type: "vipSingle",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipSingle?.price || 0,
      })
    }
    for (let i = 1; i <= 7; i++) {
      const seatId = `C${i}`
      seats.push({
        id: seatId,
        type: "vipCouple",
        isBooked: bookedSeats.includes(seatId),
        price: eventPricing?.vipCouple?.price || 0,
      })
    }
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

export default function BookingPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [selectedSeatType, setSelectedSeatType] = useState<string>("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const eventId = params.id

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const hallsRes = await fetch("/api/halls")
      if (!hallsRes.ok) {
        throw new Error(`Failed to fetch halls: ${hallsRes.statusText}`)
      }
      const allHalls: Hall[] = await hallsRes.json()
      setHalls(allHalls)

      const eventRes = await fetch(`/api/events/${eventId}`)
      if (!eventRes.ok) {
        if (eventRes.status === 404) {
          notFound()
        }
        throw new Error(`HTTP error! status: ${eventRes.status}`)
      }
      const data: Event = await eventRes.json()

      const hallDetails = allHalls.find((h) => h._id === data.hall_id)
      if (!hallDetails) {
        throw new Error(`Hall details not found for event's hall_id: ${data.hall_id}`)
      }

      let calculatedPricing = data.pricing || {}

      if (data.event_type === "match") {
        if (hallDetails.type === "vip") {
          calculatedPricing = {
            vipSofaSeats: { price: calculatedPricing.vipSofaSeats?.price || 0, count: 10 },
            vipRegularSeats: { price: calculatedPricing.vipRegularSeats?.price || 0, count: 12 },
          }
        } else {
          calculatedPricing = {
            standardMatchSeats: {
              price: calculatedPricing.standardMatchSeats?.price || 0,
              count: hallDetails.capacity,
            },
          }
        }
      } else {
        if (hallDetails.type === "vip") {
          calculatedPricing = {
            vipSingle: { price: calculatedPricing.vipSingle?.price || 0, count: 20 },
            vipCouple: { price: calculatedPricing.vipCouple?.price || 0, count: 14 },
            vipFamily: { price: calculatedPricing.vipFamily?.price || 0, count: 14 },
          }
        } else {
          calculatedPricing = {
            standardSingle: {
              price: calculatedPricing.standardSingle?.price || 0,
              count: hallDetails.capacity,
            },
          }
        }
      }

      const formattedEvent: Event = {
        ...data,
        hall_id: data.hall_id,
        pricing: calculatedPricing,
        bookedSeats: data.bookedSeats || [],
      }
      setEvent(formattedEvent)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading event details...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>
  }

  if (!event || halls.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-white">Event or Hall data not found</div>
  }

  const seats =
    event.event_type === "match"
      ? getHallType(event.hall_id, halls) === "vip"
        ? generateVipMatchSeats(event.pricing, event.bookedSeats)
        : generateStandardMatchSeats(event.pricing, event.hall_id, halls, event.bookedSeats)
      : generateMovieSeats(event.pricing, event.hall_id, halls, event.bookedSeats)

  const handleSeatClick = (seatId: string, seatType: string, isBooked: boolean) => {
    if (isBooked) return

    const hallType = getHallType(event.hall_id, halls)

    if (event.event_type === "movie" && hallType === "vip") {
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

  const getSeatPrice = () => {
    if (selectedSeats.length === 0) return 0
    let total = 0
    selectedSeats.forEach((seatId) => {
      const seat = seats.find((s) => s.id === seatId)
      if (seat) total += seat.price
    })
    return total
  }

  // No processing fee; amount equals seat total only.
  const totalAmount = getSeatPrice()

  const handleBooking = async () => {
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

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (bookingId: string) => {
    setShowPaymentModal(false)
    toast({
      title: "Payment Successful!",
      description: `Your booking has been confirmed.`,
    })
    router.push(`/receipt/${bookingId}`)
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
      </div>

      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-16 sm:h-20">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="mr-3 sm:mr-4 text-cyber-slate-300 hover:bg-glass-white group text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Book Your Experience
              </h1>
              <p className="text-xs sm:text-sm text-brand-red-400 font-medium">
                Select your seats and complete booking
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Event details card */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-hover transition-all duration-500 border border-white/20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
              <CardContent className="p-4 sm:p-6 relative z-10">
                <div className="flex flex-col gap-4">
                  <div className="relative w-full h-48 sm:h-56 lg:h-64 flex-shrink-0">
                    <img
                      src={event.image_url || "/placeholder.svg?height=240&width=380&query=event%20poster"}
                      alt={event.title}
                      className="w-full h-full object-cover rounded-3xl shadow-cyber-card group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-3xl"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                        {event.title}
                      </h2>
                      <Badge className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white shadow-glow-red px-3 sm:px-4 py-2 rounded-4xl font-semibold self-start">
                        {event.category}
                      </Badge>
                    </div>
                    <p className="text-cyber-slate-300 mb-4 text-sm sm:text-base lg:text-lg leading-relaxed">
                      {event.description}
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-xs sm:text-sm lg:text-base truncate">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-xs sm:text-sm lg:text-base truncate">
                          {event.event_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-xs sm:text-sm lg:text-base truncate">
                          {getHallDisplayName(event.hall_id, halls)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-brand-red-400 flex-shrink-0" />
                        <span className="text-cyber-slate-300 font-medium text-xs sm:text-sm lg:text-base truncate">
                          {event.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing card - responsive grid */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl font-bold">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red-400 animate-pulse" />
                  Pricing & Seat Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {event.event_type === "match" ? (
                  getHallType(event.hall_id, halls) === "vip" &&
                  event.pricing?.vipSofaSeats &&
                  event.pricing?.vipRegularSeats ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-brand-red-500/30">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-red-400" />
                          <h3 className="text-base sm:text-lg font-bold text-white">VIP Sofa Seats</h3>
                        </div>
                        <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">
                          Premium comfort with sofa-style seating
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-red-300">
                          ₦{event.pricing.vipSofaSeats.price.toLocaleString()} per seat
                        </p>
                        <p className="text-xs sm:text-sm text-cyber-slate-400">
                          Available:{" "}
                          {event.pricing.vipSofaSeats.count -
                            (event.bookedSeats?.filter((s) => s.startsWith("S")).length || 0)}
                          /{event.pricing.vipSofaSeats.count}
                        </p>
                      </div>
                      <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-cyber-blue-500/30">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyber-blue-400" />
                          <h3 className="text-base sm:text-lg font-bold text-white">VIP Regular Seats</h3>
                        </div>
                        <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">
                          Premium seating with excellent view
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-blue-300">
                          ₦{event.pricing.vipRegularSeats.price.toLocaleString()} per seat
                        </p>
                        <p className="text-xs sm:text-sm text-cyber-slate-400">
                          Available:{" "}
                          {event.pricing.vipRegularSeats.count -
                            (event.bookedSeats?.filter((s) => s.startsWith("A") || s.startsWith("B")).length || 0)}
                          /{event.pricing.vipRegularSeats.count}
                        </p>
                      </div>
                    </div>
                  ) : (
                    event.pricing?.standardMatchSeats && (
                      <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-cyber-green-500/30">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyber-green-400" />
                            <h3 className="text-base sm:text-lg font-bold text-white">Standard Match Seats</h3>
                          </div>
                          <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">
                            Individual standard match seat
                          </p>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-green-300">
                            ₦{event.pricing.standardMatchSeats.price.toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-cyber-slate-400">
                            Available:{" "}
                            {event.pricing.standardMatchSeats.count -
                              (event.bookedSeats?.filter((s) => s.startsWith(event.hall_id.toUpperCase())).length || 0)}
                            /{event.pricing.standardMatchSeats.count}
                          </p>
                        </div>
                      </div>
                    )
                  )
                ) : getHallType(event.hall_id, halls) === "vip" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-cyber-green-500/30">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyber-green-400" />
                        <h3 className="text-base sm:text-lg font-bold text-white">VIP Single</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">Individual premium seat</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-green-300">
                        ₦{event.pricing?.vipSingle?.price?.toLocaleString()}
                      </p>
                      <p className="text-xs sm:text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipSingle?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("S")).length || 0)}
                        /{event.pricing?.vipSingle?.count}
                      </p>
                    </div>
                    <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-cyber-purple-500/30">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyber-purple-400" />
                        <h3 className="text-base sm:text-lg font-bold text-white">VIP Couple</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">Intimate seating for two</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-purple-300">
                        ₦{event.pricing?.vipCouple?.price?.toLocaleString()}
                      </p>
                      <p className="text-xs sm:text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipCouple?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("C")).length || 0)}
                        /{event.pricing?.vipCouple?.count}
                      </p>
                    </div>
                    <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-brand-red-500/30">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-red-400" />
                        <h3 className="text-base sm:text-lg font-bold text-white">VIP Family</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">
                        Perfect for families (4+ members)
                      </p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-red-300">
                        ₦{event.pricing?.vipFamily?.price?.toLocaleString()}
                      </p>
                      <p className="text-xs sm:text-sm text-cyber-slate-400">
                        Available:{" "}
                        {event.pricing?.vipFamily?.count -
                          (event.bookedSeats?.filter((s) => s.startsWith("F")).length || 0)}
                        /{event.pricing?.vipFamily?.count}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="bg-glass-white p-3 sm:p-4 rounded-3xl border border-cyber-green-500/30">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-cyber-green-400" />
                        <h3 className="text-base sm:text-lg font-bold text-white">Standard Single</h3>
                      </div>
                      <p className="text-cyber-slate-300 mb-2 text-sm sm:text-base">Individual standard seat</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyber-green-300">
                        ₦{event.pricing?.standardSingle?.price?.toLocaleString()}
                      </p>
                      <p className="text-xs sm:text-sm text-cyber-slate-400">
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

            {/* Customer Information Card */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl font-bold">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red-400" />
                  Customer Information
                </CardTitle>
                <CardDescription className="text-cyber-slate-300 text-sm sm:text-base lg:text-lg">
                  Please provide your contact details for booking confirmation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Label
                      htmlFor="name"
                      className="text-cyber-slate-200 font-semibold text-sm sm:text-base lg:text-lg"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-10 sm:h-12 lg:h-14 text-sm sm:text-base rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-red-400"
                    />
                  </div>
                  <div className="grid gap-2 sm:gap-3">
                    <Label
                      htmlFor="email"
                      className="text-cyber-slate-200 font-semibold text-sm sm:text-base lg:text-lg"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="Enter your email"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-10 sm:h-12 lg:h-14 text-sm sm:text-base rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-red-400"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="phone" className="text-cyber-slate-200 font-semibold text-sm sm:text-base lg:text-lg">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 h-10 sm:h-12 lg:h-14 text-sm sm:text-base rounded-2xl shadow-cyber-card focus:border-brand-red-400 focus:ring-brand-red-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary - Responsive sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="sticky top-4 bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-white flex items-center gap-2 sm:gap-3 text-base sm:text-lg lg:text-xl font-bold">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-brand-red-400" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6 p-4 sm:p-6">
                <div>
                  <h4 className="font-bold mb-2 sm:mb-3 lg:mb-4 text-cyber-slate-200 text-sm sm:text-base lg:text-lg">
                    Selected Seats
                  </h4>
                  {selectedSeats.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-3">
                        {selectedSeats.map((seat) => (
                          <Badge
                            key={seat}
                            variant="outline"
                            className="bg-gradient-to-r from-brand-red-50/20 to-brand-red-100/20 text-brand-red-300 border-brand-red-300/50 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 text-xs sm:text-sm lg:text-base font-semibold rounded-xl sm:rounded-2xl"
                          >
                            {seat}
                          </Badge>
                        ))}
                      </div>
                      <div className="bg-glass-white p-2 sm:p-3 rounded-2xl">
                        <p className="text-cyber-slate-300 font-semibold text-xs sm:text-sm">
                          Seat Type: <span className="text-brand-red-300">{getSeatTypeName(selectedSeatType)}</span>
                        </p>
                        <p className="text-cyber-slate-300 font-semibold text-xs sm:text-sm">
                          Quantity: <span className="text-brand-red-300">{selectedSeats.length}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-cyber-slate-400 text-sm sm:text-base lg:text-lg">No seats selected</p>
                  )}
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div className="flex justify-between text-sm sm:text-base lg:text-lg">
                    <span className="text-cyber-slate-300">
                      {selectedSeatType && `${getSeatTypeName(selectedSeatType)} (${selectedSeats.length})`}
                    </span>
                    <span className="text-white font-bold">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="flex justify-between font-bold text-lg sm:text-xl lg:text-2xl">
                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                    Total Amount
                  </span>
                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                    ₦{totalAmount.toLocaleString()}
                  </span>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-3xl transform hover:scale-105 transition-all duration-300 group font-bold text-sm sm:text-base lg:text-lg py-3 sm:py-4 lg:py-6 h-auto"
                  onClick={handleBooking}
                  disabled={selectedSeats.length === 0}
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 group-hover:rotate-12 transition-transform" />
                  Proceed to Secure Payment
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-red-400/20 to-brand-red-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                </Button>

                <p className="text-xs text-cyber-slate-400 text-center leading-relaxed">
                  Secure payment processing • No additional fees • Receipt will be generated upon successful booking
                </p>
              </CardContent>
            </Card>

            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg text-cyber-slate-200 font-bold">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 text-sm sm:text-base p-4 sm:p-6">
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
                  <span className="text-cyber-slate-200 font-semibold">{getHallDisplayName(event.hall_id, halls)}</span>
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

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        paymentData={{
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          eventId: event._id,
          eventTitle: event.title,
          seats: selectedSeats,
          seatType: selectedSeatType,
          amount: totalAmount,
        }}
      />

      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-16 relative overflow-hidden border-t border-white/10 mt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-lg mb-4 sm:mb-0">
              &copy; {new Date().getFullYear()} Dex View Cinema. All rights reserved.
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
    </div>
  )
}
