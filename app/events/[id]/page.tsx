"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Film,
  Trophy,
  Star,
  Sparkles,
  Loader2,
  XCircle,
  Info,
  Edit,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import type { Hall } from "@/types/hall"

// Define types for event fetched from the database
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
    standardMatchSeats?: { price: number; count: number; available?: number }
  }
  bookedSeats?: string[]
}

// Helper to get hall details from fetched halls array
const getHallDetails = (halls: Hall[], hallId: string) => {
  return halls.find((hall) => hall._id === hallId)
}

const getHallDisplayName = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.name || hallId
const getHallType = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.type || "standard"
const getHallTotalSeats = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.capacity || 0

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const eventId = params.id

  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const res = await fetch("/api/halls")
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data: Hall[] = await res.json()
        setHalls(data)
      } catch (err) {
        console.error("Failed to fetch halls:", err)
        setError((err as Error).message)
      }
    }

    fetchHalls()
  }, [])

  useEffect(() => {
    if (halls.length === 0) return

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data: Event = await res.json()
        setEvent(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, halls])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red-500 mr-2" />
        Loading event details...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900">
        <XCircle className="h-8 w-8 text-red-500 mr-2" />
        Error: {error}
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900">
        <Info className="h-8 w-8 text-cyber-slate-400 mr-2" />
        Event not found
      </div>
    )
  }

  const hallType = getHallType(halls, event.hall_id)
  const bookedSeatsCount = event.bookedSeats?.length || 0
  const availableSeatsCount = (event.total_seats || 0) - bookedSeatsCount

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
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Event Details
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">{event.title}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl overflow-hidden">
              <div className="relative">
                <img
                  src={
                    event.image_url || `/placeholder.svg?height=400&width=800&text=${encodeURIComponent(event.title)}`
                  }
                  alt={event.title}
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.event_type === "match"
                        ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50"
                        : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50"
                    }`}
                  >
                    {event.event_type === "match" ? (
                      <Trophy className="w-3 h-3 mr-1" />
                    ) : (
                      <Film className="w-3 h-3 mr-1" />
                    )}
                    {event.event_type}
                  </Badge>
                </div>
                <div className="absolute top-4 left-4">
                  <Badge
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.status === "active"
                        ? "bg-cyber-green-500/30 text-cyber-green-300 border-cyber-green-500/50"
                        : event.status === "draft"
                          ? "bg-cyber-yellow-500/30 text-cyber-yellow-300 border-cyber-yellow-500/50"
                          : "bg-red-500/30 text-red-300 border-red-500/50"
                    }`}
                  >
                    {event.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <CardTitle className="text-2xl font-bold text-white mb-2">{event.title}</CardTitle>
                <CardDescription className="text-cyber-slate-300 text-lg mb-4">{event.category}</CardDescription>
                <p className="text-cyber-slate-200 leading-relaxed mb-6">{event.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-cyber-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-red-400" />
                    <div>
                      <p className="text-cyber-slate-500">Date</p>
                      <p className="text-white font-semibold">{new Date(event.event_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-red-400" />
                    <div>
                      <p className="text-cyber-slate-500">Time</p>
                      <p className="text-white font-semibold">{event.event_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-red-400" />
                    <div>
                      <p className="text-cyber-slate-500">Venue</p>
                      <p className="text-white font-semibold">{getHallDisplayName(halls, event.hall_id)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-red-400" />
                    <div>
                      <p className="text-cyber-slate-500">Duration</p>
                      <p className="text-white font-semibold">{event.duration}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Details */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-brand-red-400" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.event_type === "match" ? (
                  hallType === "vip" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.pricing?.vipSofaSeats?.price && (
                        <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-brand-red-400" />
                            <span className="text-cyber-slate-300">VIP Sofa Seats</span>
                          </div>
                          <span className="text-white font-bold text-lg">
                            ₦{event.pricing.vipSofaSeats.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {event.pricing?.vipRegularSeats?.price && (
                        <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-cyber-blue-400" />
                            <span className="text-cyber-slate-300">VIP Regular Seats</span>
                          </div>
                          <span className="text-white font-bold text-lg">
                            ₦{event.pricing.vipRegularSeats.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    event.pricing?.standardMatchSeats?.price && (
                      <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-cyber-green-400" />
                          <span className="text-cyber-slate-300">Standard Match Seats</span>
                        </div>
                        <span className="text-white font-bold text-lg">
                          ₦{event.pricing.standardMatchSeats.price.toLocaleString()}
                        </span>
                      </div>
                    )
                  )
                ) : hallType === "vip" ? (
                  <div className="grid grid-cols-1 gap-4">
                    {event.pricing?.vipSingle?.price && (
                      <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-cyber-green-400" />
                          <span className="text-cyber-slate-300">VIP Single</span>
                        </div>
                        <span className="text-white font-bold text-lg">
                          ₦{event.pricing.vipSingle.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {event.pricing?.vipCouple?.price && (
                      <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-cyber-purple-400" />
                          <span className="text-cyber-slate-300">VIP Couple</span>
                        </div>
                        <span className="text-white font-bold text-lg">
                          ₦{event.pricing.vipCouple.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {event.pricing?.vipFamily?.price && (
                      <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-brand-red-400" />
                          <span className="text-cyber-slate-300">VIP Family</span>
                        </div>
                        <span className="text-white font-bold text-lg">
                          ₦{event.pricing.vipFamily.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  event.pricing?.standardSingle?.price && (
                    <div className="flex justify-between items-center p-4 bg-glass-white rounded-2xl border border-white/10">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyber-green-400" />
                        <span className="text-cyber-slate-300">Standard Single</span>
                      </div>
                      <span className="text-white font-bold text-lg">
                        ₦{event.pricing.standardSingle.price.toLocaleString()}
                      </span>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <Info className="w-5 h-5 text-brand-red-400" />
                  Event Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-cyber-slate-300">Total Seats:</span>
                  <span className="text-white font-bold">{event.total_seats}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-cyber-slate-300">Booked Seats:</span>
                  <span className="text-brand-red-300 font-bold">{bookedSeatsCount}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-cyber-slate-300">Available Seats:</span>
                  <span className="text-cyber-green-300 font-bold">{availableSeatsCount}</span>
                </div>
                <Separator className="bg-white/20" />
                <div className="flex justify-between text-lg">
                  <span className="text-cyber-slate-300">Hall Type:</span>
                  <span className="text-white font-bold capitalize">{hallType}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <Link href={`/book/${event._id}`}>
                  <Button className="w-full bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white font-bold py-3 rounded-2xl shadow-glow-red transform hover:scale-105 transition-all duration-300">
                    <Ticket className="w-4 h-4 mr-2" />
                    Book Now
                  </Button>
                </Link>
                <Link href={`/admin/seats/${event._id}`}>
                  <Button
                    variant="outline"
                    className="w-full border-cyber-blue-500 text-cyber-blue-300 hover:bg-cyber-blue-900/20 hover:text-cyber-blue-200 font-bold py-3 rounded-2xl bg-transparent"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Seat Map
                  </Button>
                </Link>
                <Link href={`/admin?editEvent=${event._id}`}>
                  <Button
                    variant="outline"
                    className="w-full border-cyber-green-500 text-cyber-green-300 hover:bg-cyber-green-900/20 hover:text-cyber-green-200 font-bold py-3 rounded-2xl bg-transparent"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-20">
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
    </div>
  )
}
