"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Film, Trophy } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import type { Hall } from "@/types/hall"

interface EventFormData {
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string
  event_time: string
  hall_id: string
  status: "active" | "draft" | "cancelled"
  image_url: string
  description: string
  duration: string
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

export default function CreateEventPage() {
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    event_type: "movie",
    category: "",
    event_date: "",
    event_time: "",
    hall_id: "",
    status: "active",
    image_url: "",
    description: "",
    duration: "",
    pricing: {},
  })

  // Fetch halls
  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const response = await fetch("/api/halls")
        if (response.ok) {
          const hallsData = await response.json()
          setHalls(hallsData)
        }
      } catch (error) {
        console.error("Failed to fetch halls:", error)
        toast({
          title: "Error",
          description: "Failed to load halls data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHalls()
  }, [toast])

  const selectedHall = halls.find((hall) => hall._id === formData.hall_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Calculate total seats based on hall capacity
      const totalSeats = selectedHall?.capacity || 0

      const eventData = {
        ...formData,
        total_seats: totalSeats,
        bookedSeats: [],
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event created successfully",
        })
        router.push("/admin/events")
      } else {
        throw new Error("Failed to create event")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const updatePricing = (key: string, price: number, count: number) => {
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [key]: { price, count },
      },
    }))
  }

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
                Create New Event
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">Add a new movie or sports event</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
            <CardHeader>
              <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                {formData.event_type === "movie" ? <Film className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                Event Details
              </CardTitle>
              <CardDescription className="text-cyber-slate-300">Fill in the details for your new event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-cyber-slate-200">
                    Event Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_type" className="text-cyber-slate-200">
                    Event Type
                  </Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value: "movie" | "match") =>
                      setFormData((prev) => ({ ...prev, event_type: value }))
                    }
                  >
                    <SelectTrigger className="bg-glass-dark border-white/20 text-white rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="match">Sports Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-cyber-slate-200">
                    Category
                  </Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Action, Comedy, Football"
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hall_id" className="text-cyber-slate-200">
                    Hall
                  </Label>
                  <Select
                    value={formData.hall_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, hall_id: value }))}
                  >
                    <SelectTrigger className="bg-glass-dark border-white/20 text-white rounded-2xl">
                      <SelectValue placeholder="Select a hall" />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                      {halls.map((hall) => (
                        <SelectItem key={hall._id} value={hall._id}>
                          {hall.name} ({hall.type.toUpperCase()}) - {hall.capacity} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="text-cyber-slate-200">
                    Event Date
                  </Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, event_date: e.target.value }))}
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_time" className="text-cyber-slate-200">
                    Event Time
                  </Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, event_time: e.target.value }))}
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-cyber-slate-200">
                    Duration
                  </Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 2h 30m"
                    className="bg-glass-dark border-white/20 text-white rounded-2xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url" className="text-cyber-slate-200">
                  Image URL (Optional)
                </Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="bg-glass-dark border-white/20 text-white rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-cyber-slate-200">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description..."
                  className="bg-glass-dark border-white/20 text-white rounded-2xl"
                  rows={3}
                />
              </div>

              {/* Pricing Section */}
              {selectedHall && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Pricing Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedHall.type === "vip" ? (
                      formData.event_type === "movie" ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-cyber-slate-200">VIP Single Seat Price</Label>
                            <Input
                              type="number"
                              placeholder="Price in Naira"
                              onChange={(e) => updatePricing("vipSingle", Number(e.target.value), 20)}
                              className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-cyber-slate-200">VIP Couple Seat Price</Label>
                            <Input
                              type="number"
                              placeholder="Price in Naira"
                              onChange={(e) => updatePricing("vipCouple", Number(e.target.value), 15)}
                              className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-cyber-slate-200">VIP Family Seat Price</Label>
                            <Input
                              type="number"
                              placeholder="Price in Naira"
                              onChange={(e) => updatePricing("vipFamily", Number(e.target.value), 15)}
                              className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-cyber-slate-200">VIP Sofa Seats Price</Label>
                            <Input
                              type="number"
                              placeholder="Price in Naira"
                              onChange={(e) => updatePricing("vipSofaSeats", Number(e.target.value), 20)}
                              className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-cyber-slate-200">VIP Regular Seats Price</Label>
                            <Input
                              type="number"
                              placeholder="Price in Naira"
                              onChange={(e) => updatePricing("vipRegularSeats", Number(e.target.value), 30)}
                              className="bg-glass-dark border-white/20 text-white rounded-2xl"
                            />
                          </div>
                        </>
                      )
                    ) : formData.event_type === "movie" ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-cyber-slate-200">Standard Single Seat Price</Label>
                          <Input
                            type="number"
                            placeholder="Price in Naira"
                            onChange={(e) =>
                              updatePricing("standardSingle", Number(e.target.value), selectedHall.capacity)
                            }
                            className="bg-glass-dark border-white/20 text-white rounded-2xl"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-cyber-slate-200">Standard Match Seats Price</Label>
                        <Input
                          type="number"
                          placeholder="Price in Naira"
                          onChange={(e) =>
                            updatePricing("standardMatchSeats", Number(e.target.value), selectedHall.capacity)
                          }
                          className="bg-glass-dark border-white/20 text-white rounded-2xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status" className="text-cyber-slate-200">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "draft" | "cancelled") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="bg-glass-dark border-white/20 text-white rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Link href="/admin/events">
              <Button
                variant="outline"
                className="border-white/30 text-cyber-slate-300 hover:bg-glass-white rounded-2xl bg-transparent"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white rounded-2xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
