"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, Clock, MapPin, Users, CreditCard, Loader2 } from "lucide-react"
import Link from "next/link"

interface Event {
  _id: string
  title: string
  type: "movie" | "match"
  date: string
  time: string
  venue: string
  duration: number
  description: string
  image: string
  hall: string
  bookedSeats: string[]
  pricing: {
    standardSingle: number
    standardDouble: number
    vipSingle: number
    vipDouble: number
  }
}

interface BookingForm {
  customerName: string
  customerEmail: string
  customerPhone: string
  selectedSeats: string[]
  seatType: string
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [seatType, setSeatType] = useState<string>("standardSingle")
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    selectedSeats: [],
    seatType: "standardSingle",
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const eventId = params.id as string

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch event")
        }
        const data = await response.json()
        if (data.success) {
          setEvent(data.event)
        } else {
          throw new Error(data.error || "Event not found")
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchEvent()
    }
  }, [eventId])

  const generateSeats = (hall: string, bookedSeats: string[] = []) => {
    const seats = []
    const rows = 10
    const seatsPerRow = 20

    for (let row = 1; row <= rows; row++) {
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        const seatId = `${hall}-${row * seatsPerRow - seatsPerRow + seat}`
        const isBooked = bookedSeats.includes(seatId)
        const isSelected = selectedSeats.includes(seatId)

        seats.push({
          id: seatId,
          row,
          seat,
          isBooked,
          isSelected,
          displayName: `${seat}`,
        })
      }
    }

    return seats
  }

  const handleSeatClick = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seatId))
    } else {
      setSelectedSeats([...selectedSeats, seatId])
    }
  }

  const calculateTotal = () => {
    if (!event) return 0
    const basePrice = event.pricing[seatType as keyof typeof event.pricing] || 0
    const subtotal = basePrice * selectedSeats.length
    const processingFee = Math.round(subtotal * 0.02) // 2% processing fee
    return subtotal + processingFee
  }

  const handleBooking = async () => {
    if (!event || selectedSeats.length === 0) return

    if (!bookingForm.customerName || !bookingForm.customerEmail) {
      alert("Please fill in all required fields")
      return
    }

    setIsProcessing(true)

    try {
      const baseAmount = (event.pricing[seatType as keyof typeof event.pricing] || 0) * selectedSeats.length
      const processingFee = Math.round(baseAmount * 0.02)
      const totalAmount = baseAmount + processingFee

      // Generate payment reference
      const paymentReference = `DVC-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

      // Store booking data in localStorage for later use
      const bookingData = {
        eventId: event._id,
        eventTitle: event.title,
        eventType: event.type,
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone || "+234 801 234 5678",
        seats: selectedSeats,
        seatType,
        amount: baseAmount,
        processingFee,
        totalAmount,
        paymentReference,
        paymentMethod: "monnify",
        paymentStatus: "pending",
        bookingDate: new Date().toISOString().split("T")[0],
        bookingTime: new Date().toTimeString().split(" ")[0],
      }

      // Store in localStorage
      localStorage.setItem(`booking_${paymentReference}`, JSON.stringify(bookingData))

      // Create booking record
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      })

      if (!bookingResponse.ok) {
        throw new Error("Failed to create booking")
      }

      // Initialize payment
      const paymentResponse = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalAmount,
          customerName: bookingForm.customerName,
          customerEmail: bookingForm.customerEmail,
          customerPhone: bookingForm.customerPhone || "+234 801 234 5678",
          paymentReference,
          eventId: event._id,
          seats: selectedSeats,
          seatType,
        }),
      })

      const paymentResult = await paymentResponse.json()

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Failed to initialize payment")
      }

      // Redirect to Monnify checkout
      window.location.href = paymentResult.checkoutUrl
    } catch (err) {
      console.error("Booking error:", err)
      alert((err as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-red-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Event Not Found</h2>
            <p className="text-cyber-slate-300 mb-4">{error}</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seats = generateSeats(event.hall, event.bookedSeats)
  const availableSeats = seats.filter((seat) => !seat.isBooked)

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button
              variant="outline"
              className="bg-glass-white-strong backdrop-blur-xl border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
              Book Your Experience
            </h1>
            <p className="text-cyber-slate-300">Select your seats and complete booking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Info */}
          <div className="lg:col-span-1">
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 mb-6">
              <CardContent className="p-6">
                <div className="aspect-video bg-gradient-to-br from-cyber-slate-700 to-cyber-slate-800 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
                <Badge className="mb-4 bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white">
                  {event.type === "match" ? "Sports Match" : "Movie"}
                </Badge>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-cyber-slate-300">
                    <Calendar className="w-4 h-4" />
                    {event.date}
                  </div>
                  <div className="flex items-center gap-2 text-cyber-slate-300">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-2 text-cyber-slate-300">
                    <MapPin className="w-4 h-4" />
                    {event.venue}
                  </div>
                  <div className="flex items-center gap-2 text-cyber-slate-300">
                    <Users className="w-4 h-4" />
                    {event.duration} minutes
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-brand-red-400" />
                  Pricing & Seat Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(event.pricing).map(([type, price]) => (
                  <div
                    key={type}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      seatType === type
                        ? "border-brand-red-500 bg-brand-red-500/10"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => setSeatType(type)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">
                          {type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </p>
                        <p className="text-cyber-slate-400 text-sm">
                          Available: {availableSeats.length}/{seats.length}
                        </p>
                      </div>
                      <p className="text-brand-red-300 font-bold">₦{price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Seat Selection */}
          <div className="lg:col-span-2">
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-brand-red-400" />
                  Select Your Seats
                </CardTitle>
                <p className="text-cyber-slate-300">Choose your preferred seats from the {event.hall}</p>
              </CardHeader>
              <CardContent>
                {/* Screen */}
                <div className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white text-center py-3 rounded-lg mb-6 shadow-glow-red">
                  <span className="font-bold">🎬 PREMIUM SCREEN VIEW 🎬</span>
                </div>

                {/* Seats Grid */}
                <div className="grid grid-cols-20 gap-1 mb-6">
                  {seats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => !seat.isBooked && handleSeatClick(seat.id)}
                      disabled={seat.isBooked}
                      className={`
                        w-8 h-8 text-xs font-medium rounded transition-all
                        ${
                          seat.isBooked
                            ? "bg-red-500/50 text-red-200 cursor-not-allowed"
                            : seat.isSelected
                              ? "bg-brand-red-500 text-white shadow-glow-red"
                              : "bg-cyber-slate-600 text-cyber-slate-300 hover:bg-cyber-slate-500"
                        }
                      `}
                      title={seat.isBooked ? "Seat taken" : `Seat ${seat.displayName}`}
                    >
                      {seat.displayName}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-cyber-slate-600 rounded"></div>
                    <span className="text-cyber-slate-300">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-brand-red-500 rounded"></div>
                    <span className="text-cyber-slate-300">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500/50 rounded"></div>
                    <span className="text-cyber-slate-300">Taken</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName" className="text-cyber-slate-300">
                      Full Name *
                    </Label>
                    <Input
                      id="customerName"
                      value={bookingForm.customerName}
                      onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                      className="bg-cyber-slate-800 border-cyber-slate-600 text-white"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail" className="text-cyber-slate-300">
                      Email Address *
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={bookingForm.customerEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, customerEmail: e.target.value })}
                      className="bg-cyber-slate-800 border-cyber-slate-600 text-white"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-cyber-slate-300">
                    Phone Number
                  </Label>
                  <Input
                    id="customerPhone"
                    value={bookingForm.customerPhone}
                    onChange={(e) => setBookingForm({ ...bookingForm, customerPhone: e.target.value })}
                    className="bg-cyber-slate-800 border-cyber-slate-600 text-white"
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Booking Summary */}
                {selectedSeats.length > 0 && (
                  <div className="bg-cyber-slate-800/50 p-4 rounded-lg">
                    <h4 className="text-white font-semibold mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-cyber-slate-300">Selected Seats:</span>
                        <span className="text-white">{selectedSeats.join(", ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-slate-300">Seat Type:</span>
                        <span className="text-white">
                          {seatType.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-slate-300">Base Amount:</span>
                        <span className="text-white">
                          ₦
                          {(
                            (event.pricing[seatType as keyof typeof event.pricing] || 0) * selectedSeats.length
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-slate-300">Processing Fee:</span>
                        <span className="text-white">
                          ₦
                          {Math.round(
                            (event.pricing[seatType as keyof typeof event.pricing] || 0) * selectedSeats.length * 0.02,
                          ).toLocaleString()}
                        </span>
                      </div>
                      <Separator className="bg-white/20" />
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-white">Total Amount:</span>
                        <span className="text-brand-red-300">₦{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBooking}
                  disabled={
                    selectedSeats.length === 0 ||
                    !bookingForm.customerName ||
                    !bookingForm.customerEmail ||
                    isProcessing
                  }
                  className="w-full bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to Payment - ₦{calculateTotal().toLocaleString()}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
