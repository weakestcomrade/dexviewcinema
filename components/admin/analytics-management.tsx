"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Booking {
  _id: string
  eventType: "movie" | "match"
  totalAmount: number
  bookingDate: string
  status: "confirmed" | "pending" | "cancelled"
}

type RevenueTimeFrame = "all" | "day" | "week" | "month" | "custom"

interface AnalyticsManagementProps {
  bookings: Booking[]
  revenueTimeFrame: RevenueTimeFrame
  setRevenueTimeFrame: (timeFrame: RevenueTimeFrame) => void
  customRevenueStartDate: string
  setCustomRevenueStartDate: (date: string) => void
  customRevenueEndDate: string
  setCustomRevenueEndDate: (date: string) => void
}

export function AnalyticsManagement({
  bookings,
  revenueTimeFrame,
  setRevenueTimeFrame,
  customRevenueStartDate,
  setCustomRevenueStartDate,
  customRevenueEndDate,
  setCustomRevenueEndDate,
}: AnalyticsManagementProps) {
  const getFilteredBookings = () => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (revenueTimeFrame) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case "week":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate())
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        break
      case "custom":
        if (customRevenueStartDate) startDate = new Date(customRevenueStartDate)
        if (customRevenueEndDate) endDate = new Date(customRevenueEndDate)
        break
      default:
        return bookings.filter((booking) => booking.status === "confirmed")
    }

    return bookings.filter((booking) => {
      if (booking.status !== "confirmed") return false
      const bookingDate = new Date(booking.bookingDate)
      return (!startDate || bookingDate >= startDate) && (!endDate || bookingDate < endDate)
    })
  }

  const filteredBookings = getFilteredBookings()
  const movieRevenue = filteredBookings
    .filter((booking) => booking.eventType === "movie")
    .reduce((sum, booking) => sum + booking.totalAmount, 0)
  const matchRevenue = filteredBookings
    .filter((booking) => booking.eventType === "match")
    .reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totalRevenue = movieRevenue + matchRevenue

  return (
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
            <Select value={revenueTimeFrame} onValueChange={(value: RevenueTimeFrame) => setRevenueTimeFrame(value)}>
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

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-glass-dark border-white/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-brand-red-400">₦{totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-cyber-slate-300">Total Revenue</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-glass-dark border-white/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">₦{movieRevenue.toLocaleString()}</div>
                    <div className="text-sm text-cyber-slate-300">Movie Revenue</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-glass-dark border-white/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">₦{matchRevenue.toLocaleString()}</div>
                    <div className="text-sm text-cyber-slate-300">Sports Revenue</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <CardHeader>
          <CardTitle className="text-white text-xl font-bold">Booking Statistics</CardTitle>
          <CardDescription className="text-cyber-slate-300">Overview of booking performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-glass-dark border-white/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-brand-red-400">{filteredBookings.length}</div>
                    <div className="text-sm text-cyber-slate-300">Total Bookings</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-glass-dark border-white/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-400">
                      ₦
                      {filteredBookings.length > 0
                        ? Math.round(totalRevenue / filteredBookings.length).toLocaleString()
                        : 0}
                    </div>
                    <div className="text-sm text-cyber-slate-300">Avg. Booking Value</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
