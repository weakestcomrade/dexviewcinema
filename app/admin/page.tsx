"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Monitor,
  Users,
  Building,
  Filter,
  Sparkles,
  TrendingUp,
  Activity,
  BarChart3,
  ArrowRight,
  Plus,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

interface DashboardStats {
  totalEvents: number
  totalBookings: number
  totalRevenue: number
  totalHalls: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalHalls: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [eventsRes, bookingsRes, hallsRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/bookings"),
          fetch("/api/halls"),
        ])

        let totalEvents = 0
        let totalBookings = 0
        let totalRevenue = 0
        let totalHalls = 0

        if (eventsRes.ok) {
          const events = await eventsRes.json()
          totalEvents = events.length
        }

        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json()
          totalBookings = bookings.length
          totalRevenue = bookings
            .filter((booking: any) => booking.status === "confirmed")
            .reduce((sum: number, booking: any) => sum + booking.totalAmount, 0)
        }

        if (hallsRes.ok) {
          const halls = await hallsRes.json()
          totalHalls = halls.length
        }

        setStats({
          totalEvents,
          totalBookings,
          totalRevenue,
          totalHalls,
        })
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  const adminPages = [
    {
      title: "Events Management",
      description: "Manage your movies and sports events with detailed seating arrangements and pricing",
      icon: Monitor,
      href: "/admin/events",
      color: "from-brand-red-500 to-brand-red-600",
      stats: `${stats.totalEvents} Events`,
    },
    {
      title: "Create Event",
      description: "Add new movies or sports events with pricing and seating configuration",
      icon: Plus,
      href: "/admin/events/create",
      color: "from-cyber-orange-500 to-cyber-orange-600",
      stats: "Quick Add",
    },
    {
      title: "Customer Bookings",
      description: "View and manage customer bookings with receipt printing capability",
      icon: Users,
      href: "/admin/bookings",
      color: "from-cyber-blue-500 to-cyber-blue-600",
      stats: `${stats.totalBookings} Bookings`,
    },
    {
      title: "Create Booking",
      description: "Manually create bookings for customers with seat selection and payment",
      icon: Calendar,
      href: "/admin/bookings/create",
      color: "from-cyber-teal-500 to-cyber-teal-600",
      stats: "Manual Entry",
    },
    {
      title: "Halls Management",
      description: "Create, update, or delete cinema halls and venues",
      icon: Building,
      href: "/admin/halls",
      color: "from-cyber-purple-500 to-cyber-purple-600",
      stats: `${stats.totalHalls} Halls`,
    },
    {
      title: "Reports",
      description: "Generate and view reports on customer bookings with various filters",
      icon: Filter,
      href: "/admin/reports",
      color: "from-cyber-green-500 to-cyber-green-600",
      stats: "Export Ready",
    },
    {
      title: "Analytics",
      description: "View system analytics and statistics including revenue and hall performance",
      icon: Sparkles,
      href: "/admin/analytics",
      color: "from-cyber-yellow-500 to-cyber-yellow-600",
      stats: `₦${stats.totalRevenue.toLocaleString()}`,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    )
  }

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
          <div className="flex items-center justify-between h-20">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">
                Manage your cinema operations from one central location
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-cyber-slate-300">
                <Activity className="w-5 h-5 text-cyber-green-400" />
                <span className="text-sm">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyber-slate-300 text-sm font-medium">Total Events</p>
                  <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-brand-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyber-slate-300 text-sm font-medium">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                </div>
                <Users className="w-8 h-8 text-cyber-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyber-slate-300 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">₦{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-cyber-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyber-slate-300 text-sm font-medium">Total Halls</p>
                  <p className="text-2xl font-bold text-white">{stats.totalHalls}</p>
                </div>
                <Building className="w-8 h-8 text-cyber-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminPages.map((page) => {
            const IconComponent = page.icon
            return (
              <Link key={page.href} href={page.href}>
                <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 transform hover:scale-105 group cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${page.color} shadow-glow`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-cyber-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-white text-xl font-bold group-hover:text-brand-red-300 transition-colors">
                      {page.title}
                    </CardTitle>
                    <CardDescription className="text-cyber-slate-300 group-hover:text-cyber-slate-200 transition-colors">
                      {page.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-cyber-slate-400">Quick Access</span>
                      <span className="text-sm font-semibold text-brand-red-400">{page.stats}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
