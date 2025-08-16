"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import type { Hall } from "@/types/hall"

interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  event_date: string
  event_time: string
  hall_id: string
  total_seats: number
  bookedSeats?: string[]
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
}

interface BookingFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string
  seats: string[]
  seatType: string
  amount: number
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
}

export default function CreateBookingPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    eventId: "",
    seats: [],
    seatType: "",
    amount: 0,
    processingFee: 50,
    totalAmount: 0,
    status: "confirmed",
  })

  // Fetch events and halls
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, hallsRes] = await Promise.all([fetch("/api/events"), fetch("/api/halls")])

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData.filter((event: Event) => event.status === "active"))
        }

        if (hallsRes.ok) {
          const hallsData = await hallsRes.json()
          setHalls(hallsData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const selectedEvent = events.find((event) => event._id === formData.eventId)
  const selectedHall = selectedEvent ? halls.find((hall) => hall._id === selectedEvent.hall_id) : null

  // Calculate total amount when seats or pricing changes
  useEffect(() => {
    const total = formData.amount + formData.processingFee
    setFormData((prev) => ({ ...prev, totalAmount: total }))
  }, [formData.amount, formData.processingFee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!selectedEvent) {
        throw new Error("No event selected")
      }

      const bookingData = {
        ...formData,
        eventTitle: selectedEvent.title,
        eventType: selectedEvent.event_type,
        bookingDate: new Date().toISOString().split("T")[0],
        bookingTime: new Date().toLocaleTimeString(),
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Booking created successfully",
        })
        router.push("/admin/bookings")
      } else {
        throw new Error("Failed to create booking")
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const generateSeatOptions = () => {
    if (!selectedHall) return []

    const seats = []
    const rows = selectedHall.type === "vip" ? 10 : 15
    const seatsPerRow = Math.ceil(selectedHall.capacity / rows)

    for (let row = 1; row <= rows; row++) {
      const rowLetter = String.fromCharCode(64 + row) // A, B, C, etc.
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        seats.push(`${rowLetter}${seat}`)
      }
    }

    return seats.filter((seat) => !selectedEvent?.bookedSeats?.includes(seat))
  }

  const availableSeats = generateSeatOptions()

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-slate-900 relative overflow-hidden">
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
                Create New Booking
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">Manually create a booking for a customer</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer Information */}
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Customer Information
                </CardTitle>
                <CardDescription className="text-cyber-slate-300">Enter the customer's details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName" className="text-cyber-slate-200">
                      Full Name
                    </Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter customer name"
                      className="bg-glass-dark border-white/20 text-white rounded-2xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-cyber-slate-200">
                      Email
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="Enter customer email"
                      className="bg-glass-dark border-white/20 text-white rounded-2xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-cyber-slate-200">
                    Phone Number
                  </Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Enter customer phone"
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Event Selection */}
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Event & Seat Selection
                </CardTitle>
                <CardDescription className="text-cyber-slate-300">
                  Choose the event and seats for this booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventId" className="text-cyber-slate-200">
                    Select Event
                  </Label>
                  <Select
                    value={formData.eventId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, eventId: value, seats: [], amount: 0 }))
                    }
                  >
                    <SelectTrigger className="bg-glass-dark border-white/20 text-white rounded-2xl">
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                      {events.map((event) => {
                        const hall = halls.find((h) => h._id === event.hall_id)
                        return (
                          <SelectItem key={event._id} value={event._id}>
                            {event.title} - {new Date(event.event_date).toLocaleDateString()} at {event.event_time} (
                            {hall?.name})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedEvent && (
                  <>
                    <div className="p-4 bg-glass-dark rounded-2xl">
                      <h4 className="text-white font-semibold mb-2">Event Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-cyber-slate-400">Title:</span>
                          <span className="text-white ml-2">{selectedEvent.title}</span>
                        </div>
                        <div>
                          <span className="text-cyber-slate-400">Type:</span>
                          <Badge className="ml-2 bg-brand-red-500/30 text-brand-red-300">
                            {selectedEvent.event_type}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-cyber-slate-400">Date:</span>
                          <span className="text-white ml-2">
                            {new Date(selectedEvent.event_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-cyber-slate-400">Time:</span>
                          <span className="text-white ml-2">{selectedEvent.event_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-cyber-slate-200">Available Seats</Label>
                        <div className="max-h-40 overflow-y-auto p-2 bg-glass-dark rounded-2xl">
                          <div className="grid grid-cols-6 gap-1">
                            {availableSeats.slice(0, 30).map((seat) => (
                              <Button
                                key={seat}
                                type="button"
                                size="sm"
                                variant={formData.seats.includes(seat) ? "default" : "outline"}
                                onClick={() => {
                                  const newSeats = formData.seats.includes(seat)
                                    ? formData.seats.filter((s) => s !== seat)
                                    : [...formData.seats, seat]
                                  setFormData((prev) => ({ ...prev, seats: newSeats }))
                                }}
                                className="text-xs rounded-lg"
                              >
                                {seat}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-cyber-slate-400">{availableSeats.length} seats available</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-cyber-slate-200">Selected Seats</Label>
                          <div className="p-2 bg-glass-dark rounded-2xl min-h-[100px]">
                            {formData.seats.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {formData.seats.map((seat) => (
                                  <Badge key={seat} className="bg-brand-red-500/30 text-brand-red-300">
                                    {seat}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-cyber-slate-400 text-sm">No seats selected</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-cyber-slate-200">
                            Base Amount (₦)
                          </Label>
                          <Input
                            id="amount"
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                            placeholder="Enter amount"
                            className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="seatType" className="text-cyber-slate-200">
                            Seat Type
                          </Label>
                          <Input
                            id="seatType"
                            value={formData.seatType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, seatType: e.target.value }))}
                            placeholder="e.g., VIP Single, Standard"
                            className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processingFee" className="text-cyber-slate-200">
                      Processing Fee (₦)
                    </Label>
                    <Input
                      id="processingFee"
                      type="number"
                      value={formData.processingFee}
                      onChange={(e) => setFormData((prev) => ({ ...prev, processingFee: Number(e.target.value) }))}
                      className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-cyber-slate-200">
                      Booking Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "confirmed" | "pending" | "cancelled") =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger className="bg-glass-dark border-white/20 text-white rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-cyber-slate-200">Total Amount</Label>
                    <div className="p-3 bg-glass-dark rounded-2xl">
                      <span className="text-2xl font-bold text-white">₦{formData.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Link href="/admin/bookings">
              <Button
                variant="outline"
                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white rounded-2xl bg-transparent"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting || formData.seats.length === 0}
              className="bg-gradient-to-r from-cyber-blue-500 to-cyber-blue-600 hover:from-cyber-blue-600 hover:to-cyber-blue-700 text-white rounded-2xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
