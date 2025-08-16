"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, Clock, Edit, Eye, Film, Trash2, Trophy, MapPin, ImageIcon, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Helper functions
  const getHallDetails = (halls: Hall[], hallId: string) => {
    return halls.find((hall) => hall._id === hallId)
  }

  const getHallDisplayName = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.name || hallId
  const getHallType = (halls: Hall[], hallId: string) => getHallDetails(halls, hallId)?.type || "standard"

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, hallsRes] = await Promise.all([fetch("/api/events"), fetch("/api/halls")])

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData)
        }

        if (hallsRes.ok) {
          const hallsData = await hallsRes.json()
          setHalls(hallsData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast({
          title: "Error",
          description: "Failed to load events data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleEditClick = (event: Event) => {
    // Handle edit event logic
    console.log("Edit event:", event)
  }

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          setEvents(events.filter((event) => event._id !== eventId))
          toast({
            title: "Success",
            description: "Event deleted successfully",
          })
        } else {
          throw new Error("Failed to delete event")
        }
      } catch (error) {
        console.error("Error deleting event:", error)
        toast({
          title: "Error",
          description: "Failed to delete event",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading events...</div>
      </div>
    )
  }

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
          <div className="flex items-center h-20">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Events Management
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">Manage your movies and sports events</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <TableHead className="text-cyber-slate-200 font-semibold">Image</TableHead>
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
      </div>
    </div>
  )
}
