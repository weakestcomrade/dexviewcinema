"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, XCircle, Info, Loader2, Sparkles, Trophy, Star } from "lucide-react"
import Link from "next/link"

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
  total_seats?: number
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
  bookedSeats?: string[] // Array of booked seat IDs
}

interface Seat {
  id: string
  row?: string
  number?: number
  type: string
  isBooked: boolean
  price: number
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

export default function AdminSeatsPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const eventId = params.id // This is now the MongoDB ObjectId string

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`)
        if (!res.ok) {
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
          bookedSeats: data.bookedSeats || [], // Ensure bookedSeats is an array
        }
        setEvent(formattedEvent)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red-500 mr-2" />
        Loading event details...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        <XCircle className="h-8 w-8 text-red-500 mr-2" />
        Error: {error}
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Info className="h-8 w-8 text-cyber-slate-400 mr-2" />
        Event not found
      </div>
    )
  }

  const seats =
    event.event_type === "match"
      ? event.hall_id === "vip_hall"
        ? generateVipMatchSeats(event.pricing, event.bookedSeats)
        : generateStandardMatchSeats(event.pricing, event.hall_id, event.bookedSeats)
      : generateMovieSeats(event.pricing, event.hall_id, event.bookedSeats)

  const bookedSeatsCount = seats.filter((seat) => seat.isBooked).length
  const availableSeatsCount = seats.length - bookedSeatsCount

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
          <div className="flex items-center h-20">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Seat Management
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">
                Manage seats for: {event.title} ({getHallDisplayName(event.hall_id)})
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* Seat Map Section */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-2xl font-bold">
                  Seat Map - {getHallDisplayName(event.hall_id)}
                </CardTitle>
                <CardDescription className="text-cyber-slate-300 text-lg">
                  Overview of seat availability and status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Screen/Field */}
                <div className="mb-10">
                  <div className="bg-gradient-to-r from-brand-red-100/20 via-brand-red-50/20 to-brand-red-100/20 text-white text-center py-6 rounded-5xl mb-8 border-2 border-brand-red-500/30 shadow-cyber-card backdrop-blur-sm">
                    <span className="text-lg font-bold flex items-center justify-center gap-3">
                      <Sparkles className="w-6 h-6 text-brand-red-400 animate-spin-slow" />
                      {event.event_type === "match" ? "🏟️ FOOTBALL FIELD VIEW 🏟️" : "���� PREMIUM SCREEN VIEW 🎬"}
                      <Sparkles className="w-6 h-6 text-brand-400 animate-spin-slow" />
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
                                {seats
                                  .filter((seat) => seat.row === row && seat.type === "sofa")
                                  .map((seat) => (
                                    <div
                                      key={seat.id}
                                      className={`
                                        w-16 h-16 sm:w-20 sm:h-16 rounded-3xl border-3 text-sm font-bold transition-all duration-300 transform shadow-cyber-card flex items-center justify-center
                                        ${
                                          seat.isBooked
                                            ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                            : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                        }
                                      `}
                                    >
                                      🛋️
                                    </div>
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
                                {seats
                                  .filter((seat) => seat.row === row && seat.type === "regular")
                                  .map((seat) => (
                                    <div
                                      key={seat.id}
                                      className={`
                                        w-16 h-16 rounded-3xl border-3 text-lg font-bold transition-all duration-300 transform shadow-cyber-card
                                        ${
                                          seat.isBooked
                                            ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                            : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                        }
                                      `}
                                    >
                                      {seat.number}
                                    </div>
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
                          {seats
                            .filter((seat) => seat.type === "standardMatch")
                            .map((seat) => (
                              <div
                                key={seat.id}
                                className={`
                                  w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform shadow-cyber-card flex items-center justify-center
                                  ${
                                    seat.isBooked
                                      ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                      : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                  }
                                `}
                              >
                                {seat.id.split("-")[1]}
                              </div>
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
                        {seats
                          .filter((seat) => seat.type === "vipSingle")
                          .map((seat) => (
                            <div
                              key={seat.id}
                              className={`
                                w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform shadow-cyber-card
                                ${
                                  seat.isBooked
                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                    : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                }
                              `}
                            >
                              {seat.id}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* VIP Couple Seats */}
                    <div>
                      <h4 className="text-lg font-bold text-cyber-purple-300 mb-4">VIP Couple Seats</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-7 gap-4">
                        {seats
                          .filter((seat) => seat.type === "vipCouple")
                          .map((seat) => (
                            <div
                              key={seat.id}
                              className={`
                                w-16 h-12 sm:w-20 sm:h-14 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform shadow-cyber-card flex items-center justify-center
                                ${
                                  seat.isBooked
                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                    : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                }
                              `}
                            >
                              💕{seat.id.replace("C", "")}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* VIP Family Seats */}
                    <div>
                      <h4 className="text-lg font-bold text-brand-red-300 mb-4">VIP Family Seats (4+ members)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
                        {seats
                          .filter((seat) => seat.type === "vipFamily")
                          .map((seat) => (
                            <div
                              key={seat.id}
                              className={`
                                w-20 h-16 sm:w-24 sm:h-16 rounded-3xl border-2 text-xs font-bold transition-all duration-300 transform shadow-cyber-card flex items-center justify-center
                                ${
                                  seat.isBooked
                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                    : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                }
                              `}
                            >
                              👨‍👩‍👧‍👦{seat.id.replace("F", "")}
                            </div>
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
                        {seats
                          .filter((seat) => seat.type === "standardSingle")
                          .map((seat) => (
                            <div
                              key={seat.id}
                              className={`
                                w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 text-xs font-bold transition-all duration-300 transform shadow-cyber-card flex items-center justify-center
                                ${
                                  seat.isBooked
                                    ? "bg-brand-red-100/20 text-brand-red-400/60 border-brand-red-300/30 cursor-not-allowed opacity-60"
                                    : "bg-glass-white-strong text-cyber-slate-300 border-white/30"
                                }
                              `}
                            >
                              {seat.id.split("-")[1]}
                            </div>
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
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-brand-red-100/20 border-2 sm:border-3 border-brand-red-300/30 rounded-xl sm:rounded-2xl shadow-cyber-card"></div>
                    <span className="text-cyber-slate-300 font-semibold">Occupied</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary and Actions */}
          <div className="space-y-6">
            <Card className="sticky top-4 bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3 text-lg sm:text-xl font-bold">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red-400" />
                  Event & Seat Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="text-cyber-slate-300">Total Seats:</span>
                    <span className="text-white font-bold">{seats.length}</span>
                  </div>
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="text-cyber-slate-300">Booked Seats:</span>
                    <span className="text-brand-red-300 font-bold">{bookedSeatsCount}</span>
                  </div>
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="text-cyber-slate-300">Available Seats:</span>
                    <span className="text-cyber-green-300 font-bold">{availableSeatsCount}</span>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-bold mb-3 sm:mb-4 text-cyber-slate-200 text-base sm:text-lg">Pricing Details</h4>
                  {event.event_type === "match" ? (
                    event.hall_id === "vip_hall" && event.pricing?.vipSofaSeats && event.pricing?.vipRegularSeats ? (
                      <>
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">VIP Sofa:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.vipSofaSeats.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">VIP Regular:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.vipRegularSeats.price.toLocaleString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      (event.hall_id === "hallA" || event.hall_id === "hallB") &&
                      event.pricing?.standardMatchSeats && (
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">Standard Match:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.standardMatchSeats.price.toLocaleString()}
                          </span>
                        </div>
                      )
                    )
                  ) : getHallType(event.hall_id) === "vip" ? (
                    <>
                      {event.pricing?.vipSingle && (
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">VIP Single:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.vipSingle.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {event.pricing?.vipCouple && (
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">VIP Couple:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.vipCouple.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {event.pricing?.vipFamily && (
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">VIP Family:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.vipFamily.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {event.pricing?.standardSingle && (
                        <div className="flex justify-between text-base sm:text-lg">
                          <span className="text-cyber-slate-300">Standard Single:</span>
                          <span className="text-white font-bold">
                            ₦{event.pricing.standardSingle.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Separator className="bg-white/20" />

                <div className="flex flex-col gap-3">
                  <Button className="w-full bg-brand-red-500 hover:bg-brand-red-600 text-white font-bold py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105">
                    Manage Bookings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-cyber-blue-500 text-cyber-blue-300 hover:bg-cyber-blue-900/20 hover:text-cyber-blue-200 font-bold py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 bg-transparent"
                  >
                    Edit Event Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
