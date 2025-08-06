"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, Film, Trophy, ArrowLeft, Search, Ticket, Printer, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Demo booking data
const bookings = [
  {
    id: "BK001",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerPhone: "+234-801-234-5678",
    eventTitle: "El Clasico - Real Madrid vs Barcelona",
    eventType: "match",
    eventDate: "2024-03-15",
    eventTime: "20:00",
    eventHall: "VIP Hall",
    seats: ["A1", "A2"],
    seatType: "VIP Sofa",
    amount: 6000,
    processingFee: 120,
    totalAmount: 6120,
    status: "confirmed",
    bookingDate: "2024-03-10",
    bookingTime: "14:30",
    paymentMethod: "Card",
  },
  {
    id: "BK002",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    customerPhone: "+234-802-345-6789",
    eventTitle: "Dune: Part Two",
    eventType: "movie",
    eventDate: "2024-03-16",
    eventTime: "19:30",
    eventHall: "Cinema Hall 1",
    seats: ["B5"],
    seatType: "VIP Single",
    amount: 7500,
    processingFee: 150,
    totalAmount: 7650,
    status: "confirmed",
    bookingDate: "2024-03-11",
    bookingTime: "16:45",
    paymentMethod: "Bank Transfer",
  },
  {
    id: "BK003",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    customerPhone: "+234-803-456-7890",
    eventTitle: "Manchester United vs Liverpool",
    eventType: "match",
    eventDate: "2024-03-17",
    eventTime: "16:00",
    eventHall: "VIP Hall",
    seats: ["S1", "S2", "S3"],
    seatType: "VIP Regular",
    amount: 7500,
    processingFee: 150,
    totalAmount: 7650,
    status: "pending",
    bookingDate: "2024-03-12",
    bookingTime: "10:00",
    paymentMethod: "Card",
  },
]

export default function BookingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<(typeof bookings)[0] | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleViewReceipt = (booking: (typeof bookings)[0]) => {
    setSelectedBooking(booking)
    setIsReceiptOpen(true)
  }

  const printReceipt = () => {
    window.print()
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
          <div className="flex items-center h-20">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                My Bookings
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">View and manage your event tickets</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-cyber-slate-400" />
            <Input
              type="text"
              placeholder="Search by booking ID, customer name, or event title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-400 focus:ring-brand-red-400 shadow-cyber-card"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <Card
                key={booking.id}
                className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 border border-white/20 group relative overflow-hidden rounded-3xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-white leading-tight mb-1">
                        {booking.eventTitle}
                      </CardTitle>
                      <CardDescription className="text-cyber-slate-300 text-sm">
                        Booking ID: <span className="font-mono text-brand-red-300">{booking.id}</span>
                      </CardDescription>
                    </div>
                    <Badge
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        booking.eventType === "match"
                          ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50"
                          : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50"
                      }`}
                    >
                      {booking.eventType === "match" ? (
                        <Trophy className="w-3 h-3 mr-1" />
                      ) : (
                        <Film className="w-3 h-3 mr-1" />
                      )}
                      {booking.eventType}
                    </Badge>
                  </div>

                  <Separator className="my-4 bg-white/20" />

                  <div className="grid grid-cols-2 gap-3 text-sm text-cyber-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-red-400" />
                      {booking.eventDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-red-400" />
                      {booking.eventTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-red-400" />
                      {booking.eventHall}
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-brand-red-400" />
                      {booking.seats.join(", ")} ({booking.seatType})
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                      ₦{booking.totalAmount.toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <Badge
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-cyber-green-500/30 text-cyber-green-300 border-cyber-green-500/50"
                            : "bg-cyber-yellow-500/30 text-cyber-yellow-300 border-cyber-yellow-500/50"
                        }`}
                      >
                        {booking.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(booking)}
                        className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-cyber-slate-400 text-lg py-10">
              No bookings found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[600px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
              Booking Receipt
            </DialogTitle>
            <DialogDescription className="text-cyber-slate-300">
              Customer booking receipt ready for printing
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="receipt-content bg-white text-black p-8 rounded-lg mx-4" id="receipt">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-brand-red-600 mb-2">Dex View Cinema</h1>
                <p className="text-gray-600">Premium Entertainment Experience</p>
                <div className="border-b-2 border-brand-red-600 mt-4"></div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Customer Information</h3>
                  <p>
                    <strong>Name:</strong> {selectedBooking.customerName}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedBooking.customerEmail}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedBooking.customerPhone}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-3 text-brand-red-600">Booking Details</h3>
                  <p>
                    <strong>Booking ID:</strong> {selectedBooking.id}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedBooking.bookingDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedBooking.bookingTime}
                  </p>
                  <p>
                    <strong>Payment:</strong> {selectedBooking.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Event Information</h3>
                <p>
                  <strong>Event:</strong> {selectedBooking.eventTitle}
                </p>
                <p>
                  <strong>Type:</strong> {selectedBooking.eventType === "match" ? "Sports Match" : "Movie"}
                </p>
                <p>
                  <strong>Seats:</strong> {selectedBooking.seats.join(", ")}
                </p>
                <p>
                  <strong>Seat Type:</strong> {selectedBooking.seatType}
                </p>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mb-6">
                <h3 className="font-bold text-lg mb-3 text-brand-red-600">Payment Summary</h3>
                <div className="flex justify-between mb-2">
                  <span>Base Amount:</span>
                  <span>₦{selectedBooking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Processing Fee:</span>
                  <span>₦{selectedBooking.processingFee}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                  <span>Total Amount:</span>
                  <span>₦{selectedBooking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
                <p>Thank you for choosing Dex View Cinema!</p>
                <p>For support, visit us at www.dexviewcinema.com or call +234-XXX-XXX-XXXX</p>
                <p className="mt-2">Developed by SydaTech - www.sydatech.com.ng</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReceiptOpen(false)}
              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
            >
              Close
            </Button>
            <Button
              onClick={printReceipt}
              className="bg-gradient-to-r from-cyber-green-500 via-cyber-green-600 to-cyber-green-700 hover:from-cyber-green-600 hover:via-cyber-green-700 hover:to-cyber-green-800 text-white rounded-2xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-12 relative overflow-hidden border-t border-white/10 mt-20">
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

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
