"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, MapPin, Calendar, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Event {
  _id: string
  title: string
  description: string
  date: string
  time: string
  venue: string
  ticketPrice: number
  bookedSeats: string[]
  hall: {
    name: string
    rows: number
    seatsPerRow: number
  }
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<any>(null)

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`)
      if (response.ok) {
        const eventData = await response.json()
        setEvent(eventData)
      }
    } catch (error) {
      console.error("Error fetching event:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSeatMap = () => {
    if (!event) return []

    const seats = []
    const { rows, seatsPerRow } = event.hall

    for (let row = 1; row <= rows; row++) {
      const rowSeats = []
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        const seatId = `${String.fromCharCode(64 + row)}${seat}`
        rowSeats.push(seatId)
      }
      seats.push(rowSeats)
    }

    return seats
  }

  const toggleSeat = (seatId: string) => {
    if (event?.bookedSeats.includes(seatId)) return

    setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]))
  }

  const getSeatStatus = (seatId: string) => {
    if (event?.bookedSeats.includes(seatId)) return "booked"
    if (selectedSeats.includes(seatId)) return "selected"
    return "available"
  }

  const getSeatColor = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-red-500 cursor-not-allowed"
      case "selected":
        return "bg-blue-500 cursor-pointer"
      default:
        return "bg-green-500 cursor-pointer hover:bg-green-600"
    }
  }

  const totalAmount = selectedSeats.length * (event?.ticketPrice || 0)

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat")
      return
    }

    if (!customerInfo.name || !customerInfo.email) {
      alert("Please fill in all required customer information")
      return
    }

    setIsProcessing(true)

    try {
      // Generate unique payment reference
      const paymentReference = `DEX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Store booking data in localStorage for later use
      const bookingData = {
        eventId,
        seats: selectedSeats,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        totalAmount,
        eventTitle: event?.title,
      }

      localStorage.setItem(`booking_${paymentReference}`, JSON.stringify(bookingData))

      // Initialize payment with Monnify
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalAmount,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          paymentReference,
          redirectUrl: `${window.location.origin}/payment/success?paymentReference=${paymentReference}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to Monnify payment page
        window.location.href = result.checkoutUrl
      } else {
        throw new Error(result.error || "Failed to initialize payment")
      }
    } catch (error) {
      console.error("Payment initialization error:", error)
      alert("Failed to initialize payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p>Event not found</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seatMap = generateSeatMap()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{event.description}</p>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>{event.time}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span>
                {event.venue} - {event.hall.name}
              </span>
            </div>

            <div className="text-lg font-semibold">Ticket Price: ₦{event.ticketPrice.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* Seat Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Seats</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Screen */}
            <div className="mb-6">
              <div className="bg-gray-800 text-white text-center py-2 rounded-t-lg">SCREEN</div>
            </div>

            {/* Seat Map */}
            <div className="space-y-2 mb-6">
              {seatMap.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {row.map((seatId) => {
                    const status = getSeatStatus(seatId)
                    return (
                      <button
                        key={seatId}
                        onClick={() => toggleSeat(seatId)}
                        disabled={status === "booked"}
                        className={`w-8 h-8 text-xs text-white rounded ${getSeatColor(status)}`}
                        title={`Seat ${seatId} - ${status}`}
                      >
                        {seatId}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-xs mb-6">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Booked</span>
              </div>
            </div>

            {/* Selected Seats */}
            {selectedSeats.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Selected Seats:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSeats.map((seat) => (
                    <Badge key={seat} variant="secondary">
                      {seat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Selected Seats:</span>
              <span>{selectedSeats.length}</span>
            </div>

            <div className="flex justify-between">
              <span>Price per ticket:</span>
              <span>₦{event.ticketPrice.toLocaleString()}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount:</span>
              <span>₦{totalAmount.toLocaleString()}</span>
            </div>

            <Button
              onClick={handleProceedToPayment}
              disabled={selectedSeats.length === 0 || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
