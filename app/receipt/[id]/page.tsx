"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

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

export default function ReceiptPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      const fetchBooking = async () => {
        try {
          setLoading(true)
          const res = await fetch(`/api/bookings/${id}`)
          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.message || "Failed to fetch booking details")
          }
          const data = await res.json()
          setBooking(data)
        } catch (err) {
          setError((err as Error).message)
          toast({
            title: "Error",
            description: (err as Error).message,
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
      fetchBooking()
    }
  }, [id, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The booking you are looking for does not exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seatsFormatted = booking.seats
    .map((seatId) => {
      if (seatId.includes("-")) {
        return seatId.split("-")[1]
      }
      return seatId
    })
    .join(", ")

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="bg-red-600 text-white text-center py-6 rounded-t-lg">
          <CardTitle className="text-3xl font-bold">Booking Confirmed!</CardTitle>
          <p className="text-sm mt-1">Thank you for your purchase.</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-2">Dex View Cinema</h2>
            <p className="text-gray-600 dark:text-gray-400">Your Ticket to Entertainment</p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div>
              <p>
                <strong>Booking ID:</strong> {booking._id}
              </p>
              <p>
                <strong>Customer Name:</strong> {booking.customerName}
              </p>
              <p>
                <strong>Email:</strong> {booking.customerEmail}
              </p>
              <p>
                <strong>Phone:</strong> {booking.customerPhone}
              </p>
            </div>
            <div>
              <p>
                <strong>Event:</strong> {booking.eventTitle}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                <Badge variant="secondary">{booking.eventType === "movie" ? "Movie" : "Sports Match"}</Badge>
              </p>
              <p>
                <strong>Date:</strong> {booking.bookingDate}
              </p>
              <p>
                <strong>Time:</strong> {booking.bookingTime}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div>
              <p>
                <strong>Seats:</strong> {seatsFormatted}
              </p>
              <p>
                <strong>Seat Type:</strong> {booking.seatType}
              </p>
            </div>
            <div>
              <p>
                <strong>Amount:</strong> ₦{booking.amount.toLocaleString()}
              </p>
              <p>
                <strong>Processing Fee:</strong> ₦{booking.processingFee.toLocaleString()}
              </p>
              <p className="text-lg font-bold text-red-600">
                <strong>Total Amount:</strong> ₦{booking.totalAmount.toLocaleString()}
              </p>
              <p>
                <strong>Payment Method:</strong> {booking.paymentMethod}
              </p>
            </div>
          </div>

          <Separator />

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Please keep this receipt for your records.</p>
            <p className="mt-2">For support, email us at support@dexviewcinema.com or call 08139614950</p>
            <p className="mt-1">Developed by SydaTech - www.sydatech.com.ng</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
