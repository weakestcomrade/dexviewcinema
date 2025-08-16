"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Edit, Eye, Trash2, Film, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Event {
  _id: string
  title: string
  type: "movie" | "match"
  category?: string
  date: string
  time: string
  hall_id: string
  image?: string
  status: "active" | "draft" | "cancelled"
  pricing: {
    vip?: number
    standard?: number
  }
}

interface Hall {
  _id: string
  name: string
  type: "VIP" | "Standard"
  capacity: number
}

interface EventsTabProps {
  events: Event[]
  halls: Hall[]
  onEditEvent: (event: Event) => void
  onDeleteEvent: (eventId: string) => void
  getHallDisplayName: (halls: Hall[], hallId: string) => string
  calculateOccupancy: (eventId: string) => { occupied: number; total: number; percentage: number }
}

export function EventsTab({
  events,
  halls,
  onEditEvent,
  onDeleteEvent,
  getHallDisplayName,
  calculateOccupancy,
}: EventsTabProps) {
  return (
    <Tabs defaultValue="events">
      <TabsContent value="events">
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
                  {events.map((event) => {
                    const occupancy = calculateOccupancy(event._id)
                    return (
                      <TableRow key={event._id} className="border-white/20 hover:bg-glass-white">
                        <TableCell>
                          <div className="w-16 h-16 relative rounded-2xl overflow-hidden bg-glass-dark">
                            {event.image ? (
                              <Image
                                src={event.image || "/placeholder.svg"}
                                alt={event.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {event.type === "movie" ? (
                                  <Film className="w-6 h-6 text-cyber-slate-400" />
                                ) : (
                                  <Trophy className="w-6 h-6 text-cyber-slate-400" />
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-white">{event.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {event.type === "movie" ? (
                              <Film className="w-4 h-4 text-cyber-blue-400" />
                            ) : (
                              <Trophy className="w-4 h-4 text-cyber-green-400" />
                            )}
                            <span className="text-cyber-slate-200 capitalize">
                              {event.type}
                              {event.category && ` - ${event.category}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200">
                            <div>{new Date(event.date).toLocaleDateString()}</div>
                            <div className="text-sm text-cyber-slate-400">{event.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-cyber-slate-200">{getHallDisplayName(halls, event.hall_id)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200 text-sm">
                            {event.pricing.vip && <div>VIP: ₦{event.pricing.vip.toLocaleString()}</div>}
                            {event.pricing.standard && <div>Standard: ₦{event.pricing.standard.toLocaleString()}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-cyber-slate-200 text-sm">
                            <div>
                              {occupancy.occupied}/{occupancy.total}
                            </div>
                            <div className="text-xs text-cyber-slate-400">{occupancy.percentage}% full</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.status === "active"
                                ? "default"
                                : event.status === "draft"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={
                              event.status === "active"
                                ? "bg-cyber-green-500/20 text-cyber-green-300 border-cyber-green-500/30"
                                : event.status === "draft"
                                  ? "bg-cyber-blue-500/20 text-cyber-blue-300 border-cyber-blue-500/30"
                                  : "bg-brand-red-500/20 text-brand-red-300 border-brand-red-500/30"
                            }
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/admin/seats/${event._id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-cyber-blue-500/50 text-cyber-blue-300 hover:bg-cyber-blue-500/20 bg-glass-white backdrop-blur-sm rounded-2xl"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditEvent(event)}
                              className="border-cyber-purple-500/50 text-cyber-purple-300 hover:bg-cyber-purple-500/20 bg-glass-white backdrop-blur-sm rounded-2xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteEvent(event._id)}
                              className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm rounded-2xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
