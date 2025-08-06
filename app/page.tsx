import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, Film, Trophy, Sparkles, ArrowRight } from "lucide-react"
import { connectToDatabase } from "@/lib/mongodb" // Import the MongoDB connection utility

// Define the Event interface to match your MongoDB schema
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string // Assuming date is stored as a string
  event_time: string // Assuming time is stored as a string
  hall_id: string // Assuming hall_id is a string
  image_url?: string // Optional image URL
  description?: string
  duration?: string
  // Correctly define pricing as an object with ticket_price
  pricing: {
    ticket_price: number
    [key: string]: any // Allow for other properties in pricing object
  }
  status: "active" | "draft" | "cancelled"
  total_seats?: number // Add total_seats if it's part of your schema
}

export default async function Home() {
  let events: Event[] = []
  let error: string | null = null

  try {
    const { db } = await connectToDatabase()
    const fetchedEvents = await db.collection("events").find({ status: "active" }).toArray() // Fetch only active events

    // Map MongoDB documents to the Event interface, converting _id to string
    events = fetchedEvents.map((event) => ({
      ...event,
      _id: event._id.toString(),
      // Ensure hall_id is a string if it's an ObjectId in DB, or map as needed
      hall_id: event.hall_id ? event.hall_id.toString() : "Unknown Hall",
      // Add a default image if image_url is missing
      image_url: event.image_url || `/placeholder.svg?height=300&width=500&text=${encodeURIComponent(event.title)}`,
      // Ensure pricing and ticket_price are correctly structured and defaulted
      pricing: {
        ticket_price: typeof event.pricing?.ticket_price === "number" ? event.pricing.ticket_price : 0,
        ...(event.pricing || {}), // Copy other pricing properties if they exist
      },
    })) as Event[]
  } catch (err) {
    console.error("Failed to fetch events for homepage:", err)
    error = "Failed to load events. Please try again later."
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
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start">
              <div className="relative group">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-4xl flex items-center justify-center shadow-glow-red transform group-hover:scale-110 transition-all duration-300">
                  <Film className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-red-500 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent">
                  Dex View Cinema
                </h1>
                <p className="text-xs sm:text-sm font-medium bg-gradient-to-r from-brand-red-400 to-brand-red-300 bg-clip-text text-transparent">
                  Your Ultimate Entertainment Destination
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <Link href="/bookings" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
                >
                  <Calendar className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  My Bookings
                </Button>
              </Link>
              <Link href="/admin" className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 shadow-glow-red text-white group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
                >
                  <Users className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative text-center py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent leading-tight mb-6 animate-pulse-slow">
            Experience Entertainment Like Never Before
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-cyber-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dive into a world of cinematic blockbusters and thrilling sports events with premium comfort and
            cutting-edge technology.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="#upcoming-events">
              <Button
                size="lg"
                className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-3xl transform hover:scale-105 transition-all duration-300 group font-bold text-lg py-3 sm:py-4 h-auto"
              >
                Explore Events
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-brand-red-400/20 to-brand-red-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              </Button>
            </Link>
            <Link href="/bookings">
              <Button
                size="lg"
                variant="outline"
                className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-3xl font-bold text-lg py-3 sm:py-4 h-auto"
              >
                My Bookings
                <Calendar className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
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
            {events.map((event) => (
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
                        {event.hall_id}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-red-400" />
                        {event.duration}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                      <span className="text-2xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                        ₦{((event.pricing?.ticket_price ?? 0) as number).toLocaleString()}{" "}
                        {/* Safely access nested ticket_price */}
                      </span>
                      <Link href={`/book/${event._id}`}>
                        <Button
                          className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 hover:from-brand-red-600 hover:to-brand-red-700 text-white shadow-glow-red rounded-2xl group"
                          size="sm"
                        >
                          Book Now
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="relative bg-glass-dark-strong py-16 sm:py-24 border-t border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue-900/10 via-transparent to-cyber-blue-900/10"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 bg-gradient-to-r from-white via-cyber-green-200 to-white bg-clip-text text-transparent">
            Why Choose Dex View Cinema?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 p-6 rounded-3xl group hover:shadow-glow-green transition-all duration-300">
              <CardHeader className="flex flex-col items-center p-0 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyber-green-500/20 to-cyber-green-600/20 rounded-full flex items-center justify-center border border-cyber-green-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-8 h-8 text-cyber-green-400 group-hover:rotate-180 transition-transform duration-500" />
                </div>
                <CardTitle className="text-xl font-bold text-white">Cutting-Edge Technology</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CardDescription className="text-cyber-slate-300">
                  Immerse yourself in stunning visuals and crystal-clear audio with our state-of-the-art projection and
                  sound systems.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 p-6 rounded-3xl group hover:shadow-glow-blue transition-all duration-300">
              <CardHeader className="flex flex-col items-center p-0 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyber-blue-500/20 to-cyber-blue-600/20 rounded-full flex items-center justify-center border border-cyber-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-cyber-blue-400 group-hover:bounce transition-transform" />
                </div>
                <CardTitle className="text-xl font-bold text-white">Unmatched Comfort</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CardDescription className="text-cyber-slate-300">
                  Relax in our luxurious, ergonomic seating designed for maximum comfort, ensuring an enjoyable
                  experience from start to finish.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 p-6 rounded-3xl group hover:shadow-glow-red transition-all duration-300">
              <CardHeader className="flex flex-col items-center p-0 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-8 h-8 text-brand-red-400 group-hover:pulse transition-transform" />
                </div>
                <CardTitle className="text-xl font-bold text-white">Exclusive Events</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CardDescription className="text-cyber-slate-300">
                  From blockbuster premieres to live sports broadcasts, we offer a diverse range of exclusive events to
                  cater to every taste.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative text-center py-16 sm:py-24">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent mb-6">
            Ready to Book Your Next Adventure?
          </h2>
          <p className="text-lg sm:text-xl text-cyber-slate-300 mb-8">
            Don't miss out on the best seats! Secure your tickets now for an unforgettable experience.
          </p>
          <Link href="#upcoming-events">
            <Button
              size="lg"
              className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-3xl transform hover:scale-105 transition-all duration-300 group font-bold text-lg py-3 sm:py-4 h-auto"
            >
              View All Events
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-red-400/20 to-brand-red-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-lg mb-4 sm:mb-0">
              &copy; 2024 Dex View Cinema. All rights reserved.
            </p>
            <p className="text-cyber-slate-300 text-lg">
              Developed by{" "}
              <a
                href="https://www.sydatech.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red-400 hover:text-brand-red-300 transition-colors font-bold hover:underline"
              >
                SydaTech
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
