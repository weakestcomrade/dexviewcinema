"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Clock, Edit, Eye, Film, ImageIcon, Trash2, Trophy } from "lucide-react"
import Image from "next/image"

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
  pricing: any
  bookedSeats?: string[]
}

interface Hall {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

interface EventsManagementProps {
  events: Event[]
  halls: Hall[]
  onEditEvent: (event: Event) => void
  onDeleteEvent: (eventId: string) => void
  onViewEvent: (event: Event) => void
  getHallDisplayName: (halls: Hall[], hallId: string) => string
}

export function EventsManagement({
  events,
  halls,
  onEditEvent,
  onDeleteEvent,
  onViewEvent,
  getHallDisplayName,
}: EventsManagementProps) {
  const getOccupancyPercentage = (event: Event) => {
    const bookedCount = event.bookedSeats?.length || 0
    return Math.round((bookedCount / event.total_seats) * 100)
  }

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 80) return "text-red-400"
    if (percentage >= 50) return "text-yellow-400"
    return "text-green-400"
  }

  return (
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
                  <TableCell className="text-cyber-slate-300">{getHallDisplayName(halls, event.hall_id)}</TableCell>
                  <TableCell>
                    <div className="text-xs text-cyber-slate-300">
                      {Object.entries(event.pricing).map(([type, details]: [string, any]) => (
                        <div key={type} className="mb-1">
                          <span className="font-medium">
                            {type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
                          </span>{" "}
                          ₦{details.price?.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className={`text-sm font-bold ${getOccupancyColor(getOccupancyPercentage(event))}`}>
                        {getOccupancyPercentage(event)}%
                      </div>
                      <div className="text-xs text-cyber-slate-400">
                        {event.bookedSeats?.length || 0}/{event.total_seats}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.status === "active" ? "default" : event.status === "draft" ? "secondary" : "destructive"
                      }
                      className={
                        event.status === "active"
                          ? "bg-green-500/30 text-green-300 border-green-500/50 rounded-2xl"
                          : event.status === "draft"
                            ? "bg-yellow-500/30 text-yellow-300 border-yellow-500/50 rounded-2xl"
                            : "bg-red-500/30 text-red-300 border-red-500/50 rounded-2xl"
                      }
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewEvent(event)}
                        className="text-cyber-slate-300 hover:text-white hover:bg-glass-white rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditEvent(event)}
                        className="text-cyber-slate-300 hover:text-white hover:bg-glass-white rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteEvent(event._id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl"
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
  )
}
