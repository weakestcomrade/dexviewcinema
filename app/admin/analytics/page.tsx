"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import type { Hall } from "@/types/hall"

interface Booking {
  _id: string
  eventTitle: string
  eventType: string
  totalAmount: number
  bookingDate: string
  status: "confirmed" | "pending" | "cancelled"
  seats: string[]
}

interface Event {
  _id: string
  title: string
  hall_id: string
  total_seats: number
  bookedSeats?: string[]
}

type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

export default function AdminAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)

  // Analytics filters
  const [revenueTimeFrame, setRevenueTimeFrame] = useState<RevenueTimeFrame>("all")
  const [customRevenueStartDate, setCustomRevenueStartDate] = useState("")
  const [customRevenueEndDate, setCustomRevenueEndDate] = useState("")

  const { toast } = useToast()

  // Helper functions
  const getHallDisplayName = (halls: Hall[], hallId: string) => {
    const hall = halls.find((hall) => hall._id === hallId)
    return hall?.name || hallId
  }

  // Calculate revenue by category
  const revenueByCategory = bookings
    .filter((booking) => {
      if (booking.status !== "confirmed") return false

      const bookingDate = new Date(booking.bookingDate)
      const now = new Date()

      switch (revenueTimeFrame) {
        case "day":
          return isWithinInterval(bookingDate, { start: startOfDay(now), end: endOfDay(now) })
        case "week":
          return isWithinInterval(bookingDate, { start: startOfWeek(now), end: endOfWeek(now) })
        case "month":
          return isWithinInterval(bookingDate, { start: startOfMonth(now), end: endOfMonth(now) })
        case "custom":
          if (customRevenueStartDate && customRevenueEndDate) {
            return isWithinInterval(bookingDate, {
              start: startOfDay(new Date(customRevenueStartDate)),
              end: endOfDay(new Date(customRevenueEndDate)),
            })
          }
          return true
        default:
          return true
      }
    })
    .reduce(
      (acc, booking) => {
        const category = booking.eventType
        acc[category] = (acc[category] || 0) + booking.totalAmount
        return acc
      },
      {} as Record<string, number>,
    )

  const totalRevenue = Object.values(revenueByCategory).reduce((sum, revenue) => sum + revenue, 0)

  // Calculate hall performance
  const hallPerformance = events.reduce(
    (acc, event) => {
      const hallName = getHallDisplayName(halls, event.hall_id)
      if (!acc[hallName]) {
        acc[hallName] = { total: 0, booked: 0 }
      }
      acc[hallName].total += event.total_seats
      acc[hallName].booked += event.bookedSeats?.length || 0
      return acc
    },
    {} as Record<string, { total: number; booked: number }>,
  )

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, eventsRes, hallsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/events"),
          fetch("/api/halls"),
        ])

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json()
          setBookings(bookingsData)
        }

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
          description: "Failed to load analytics data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
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
                Analytics Dashboard
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">View system analytics and statistics</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardHeader>
              <CardTitle className="text-white text-xl font-bold">Revenue Analytics</CardTitle>
              <CardDescription className="text-cyber-slate-300">Revenue breakdown by event category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="revenue-timeframe" className="text-cyber-slate-200">
                  Revenue Timeframe
                </Label>
                <Select
                  value={revenueTimeFrame}
                  onValueChange={(value: RevenueTimeFrame) => setRevenueTimeFrame(value)}
                >
                  <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {revenueTimeFrame === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="grid gap-2">
                    <Label htmlFor="custom-revenue-start-date" className="text-cyber-slate-200">
                      Start Date
                    </Label>
                    <Input
                      id="custom-revenue-start-date"
                      type="date"
                      value={customRevenueStartDate}
                      onChange={(e) => setCustomRevenueStartDate(e.target.value)}
                      className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="custom-revenue-end-date" className="text-cyber-slate-200">
                      End Date
                    </Label>
                    <Input
                      id="custom-revenue-end-date"
                      type="date"
                      value={customRevenueEndDate}
                      onChange={(e) => setCustomRevenueEndDate(e.target.value)}
                      className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(revenueByCategory).length > 0 ? (
                  Object.entries(revenueByCategory).map(([category, revenue]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-cyber-slate-200">{category}</span>
                      <span className="font-bold text-white text-lg">₦{revenue.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-cyber-slate-400">No revenue data available.</p>
                )}
                <div className="border-t border-white/20 pt-6">
                  <div className="flex justify-between items-center font-bold text-xl">
                    <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      Total
                    </span>
                    <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      ₦{totalRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardHeader>
              <CardTitle className="text-white text-xl font-bold">Hall Performance</CardTitle>
              <CardDescription className="text-cyber-slate-300">Occupancy rates by venue type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(hallPerformance).length > 0 ? (
                  Object.entries(hallPerformance).map(([hallName, data]) => {
                    const occupancy = data.total > 0 ? (data.booked / data.total) * 100 : 0
                    return (
                      <div key={hallName}>
                        <div className="flex justify-between mb-3">
                          <span className="text-cyber-slate-200">{hallName}</span>
                          <span className="text-white font-semibold">{occupancy.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-cyber-slate-700/50 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-brand-red-500 to-brand-red-400 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${occupancy}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-cyber-slate-400">No hall performance data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
