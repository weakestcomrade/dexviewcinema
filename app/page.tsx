import { CardDescription } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Users, Film, Trophy, ArrowRight } from "lucide-react"
import { connectToDatabase } from "@/lib/mongodb" // Import the MongoDB connection utility
import type { Hall } from "@/types/hall" // Import the Hall interface

// Define the Event interface to match your MongoDB schema
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string // Assuming date is stored as a string
  event_time: string // Assuming time is stored as a string
  hall_id: string // Assuming hall_id is a string
  hall_name?: string // Add hall_name to the Event interface
  image_url?: string // Optional image URL
  description?: string
  duration?: string
  // Correctly define pricing as an object with nested price properties
  pricing: {
    ticket_price?: number // General ticket price, if applicable
    vipSingle?: { price: number }
    vipCouple?: { price: number }
    vipFamily?: { price: number }
    vipSofaSeats?: { price: number }
    vipRegularSeats?: { price: number }
    standardSingle?: { price: number }
    standardCouple?: { price: number }
    standardFamily?: { price: number }
    standardMatchSeats?: { price: number }
    [key: string]: any // Allow for other properties in pricing object
  }
  status: "active" | "draft" | "cancelled"
  total_seats?: number // Add total_seats if it's part of your schema
}

export default async function HomePage() {
  let events: Event[] = []
  let error: string | null = null
  let fetchedHalls: Hall[] = [] // Declare fetchedHalls here to be accessible

  try {
    const { db } = await connectToDatabase()
    const fetchedEvents = await db.collection("events").find({ status: "active" }).toArray() // Fetch only active events
    fetchedHalls = await db.collection("halls").find({}).toArray() // Fetch all halls

    // Create a map for quick lookup of hall names by their _id
    const hallMap = new Map<string, string>()
    fetchedHalls.forEach((hall: Hall) => {
      hallMap.set(hall._id.toString(), hall.name)
    })

    // Map MongoDB documents to the Event interface, converting _id to string
    events = fetchedEvents.map((event) => ({
      ...event,
      _id: event._id.toString(),
      // Ensure hall_id is a string if it's an ObjectId in DB, or map as needed
      hall_id: event.hall_id ? event.hall_id.toString() : "Unknown Hall ID",
      hall_name: hallMap.get(event.hall_id?.toString()) || "Unknown Venue", // Get hall name from map
      // Add a default image if image_url is missing
      image_url: event.image_url || `/placeholder.svg?height=300&width=500&text=${encodeURIComponent(event.title)}`,
      // Ensure pricing is correctly structured and defaulted
      pricing: event.pricing || {},
    })) as Event[]
  } catch (err) {
    console.error("Failed to fetch events for homepage:", err)
    error = "Failed to load events. Please try again later."
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b lg:px-6">
        <Link className="flex items-center gap-2" href="#">
          <Image
            src="/dexcinema-logo.jpeg"
            alt="Dex View Cinema Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="sr-only">Dex View Cinema</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link className="font-medium hover:underline underline-offset-4" href="/bookings">
            My Bookings
          </Link>
          <Link className="font-medium hover:underline underline-offset-4" href="/admin">
            Admin
          </Link>
        </nav>
        <Button className="md:hidden bg-transparent" variant="outline">
          Menu
        </Button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <section className="w-full max-w-4xl text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">Welcome to Dex View Cinema</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Your ultimate destination for premium movie and sports event experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events">
              <Button size="lg">View Events</Button>
            </Link>
            <Link href="/bookings">
              <Button size="lg" variant="outline">
                Manage Bookings
              </Button>
            </Link>
          </div>
        </section>

        <Separator className="my-12 w-full max-w-4xl" />

        <section className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Movies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400">Explore the latest blockbusters and timeless classics.</p>
              <Button className="mt-4" variant="secondary">
                Browse Movies
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sports Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400">Catch live sports action on the big screen.</p>
              <Button className="mt-4" variant="secondary">
                View Sports
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Upcoming Events Section */}
        <section id="upcoming-events" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-white via-cyber-blue-200 to-white bg-clip-text text-transparent">
            Upcoming Events
          </h2>
          {error ? (
            <div className="text-center text-red-500 text-lg">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center text-cyber-slate-300 text-lg">No upcoming events found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {events.map((event) => {
                const currentHall = fetchedHalls.find((hall) => hall._id.toString() === event.hall_id)
                const hallType = currentHall?.type

                return (
                  <Card
                    key={event._id}
                    className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 border border-white/20 group relative overflow-hidden rounded-3xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                    <CardContent className="p-0 relative z-10">
                      <img
                        src={event.image_url || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-3xl group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <CardTitle className="text-xl font-bold text-white leading-tight">{event.title}</CardTitle>
                          <Badge
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              event.event_type === "match"
                                ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50"
                                : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50"
                            }`}
                          >
                            {event.event_type === "match" ? (
                              <Trophy className="w-3 h-3 mr-1" />
                            ) : (
                              <Film className="w-3 h-3 mr-1" />
                            )}
                            {event.event_type}
                          </Badge>
                        </div>
                        <CardDescription className="text-cyber-slate-300 mb-4 line-clamp-2">
                          {event.description}
                        </CardDescription>
                        <div className="grid grid-cols-2 gap-3 text-sm text-cyber-slate-400 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand-red-400" />
                            {new Date(event.event_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-brand-red-400" />
                            {event.event_time}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-red-400" />
                            {event.hall_name} {/* Display hall name (venue) */}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-red-400" />
                            {event.duration}
                          </div>
                        </div>
                        <div className="flex flex-col items-start mt-6">
                          {event.event_type === "match" ? (
                            hallType === "vip" ? (
                              // VIP Match pricing
                              <>
                                {event.pricing.vipSofaSeats?.price && (
                                  <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                    <span className="text-brand-red-300 capitalize">VIP Sofa:</span>
                                    <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                      ₦{event.pricing.vipSofaSeats.price.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {event.pricing.vipRegularSeats?.price && (
                                  <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                    <span className="text-brand-red-300 capitalize">VIP Regular:</span>
                                    <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                      ₦{event.pricing.vipRegularSeats.price.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              // Standard Match pricing
                              event.pricing.standardMatchSeats?.price && (
                                <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                  <span className="text-brand-red-300 capitalize">Standard Match:</span>
                                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                    ₦{event.pricing.standardMatchSeats.price.toLocaleString()}
                                  </span>
                                </div>
                              )
                            ) // Movie event
                          ) : hallType === "vip" ? (
                            // VIP Movie pricing
                            <>
                              {event.pricing.vipSingle?.price && (
                                <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                  <span className="text-brand-red-300 capitalize">VIP Single:</span>
                                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                    ₦{event.pricing.vipSingle.price.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {event.pricing.vipCouple?.price && (
                                <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                  <span className="text-brand-red-300 capitalize">VIP Couple:</span>
                                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                    ₦{event.pricing.vipCouple.price.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {event.pricing.vipFamily?.price && (
                                <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                  <span className="text-brand-red-300 capitalize">VIP Family:</span>
                                  <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                    ₦{event.pricing.vipFamily.price.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            // Standard Movie pricing
                            event.pricing.standardSingle?.price && (
                              <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                <span className="text-brand-red-300 capitalize">Standard Single:</span>
                                <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                  ₦{event.pricing.standardSingle.price.toLocaleString()}
                                </span>
                              </div>
                            )
                          )}
                          {/* Fallback for general ticket_price if no specific hall pricing is found or applicable */}
                          {!(
                            event.event_type === "match" &&
                            hallType === "vip" &&
                            (event.pricing.vipSofaSeats?.price || event.pricing.vipRegularSeats?.price)
                          ) &&
                            !(
                              event.event_type === "match" &&
                              hallType === "standard" &&
                              event.pricing.standardMatchSeats?.price
                            ) &&
                            !(
                              event.event_type === "movie" &&
                              hallType === "vip" &&
                              (event.pricing.vipSingle?.price ||
                                event.pricing.vipCouple?.price ||
                                event.pricing.vipFamily?.price)
                            ) &&
                            !(
                              event.event_type === "movie" &&
                              hallType === "standard" &&
                              event.pricing.standardSingle?.price
                            ) &&
                            event.pricing.ticket_price !== undefined && (
                              <div className="flex items-center gap-1 text-lg font-semibold text-white">
                                <span className="text-brand-red-300 capitalize">Ticket Price:</span>
                                <span className="bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                                  ₦{event.pricing.ticket_price.toLocaleString()}
                                </span>
                              </div>
                            )}
                        </div>
                        <Link href={`/book/${event._id}`}>
                          <Button
                            className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red rounded-2xl group"
                            size="sm"
                          >
                            Book Now
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">&copy; 2025 Dex View Cinema. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
