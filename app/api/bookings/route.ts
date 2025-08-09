import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get("email")

    const { db } = await connectToDatabase()

    const query: any = {}
    if (customerEmail) {
      query.customerEmail = customerEmail
    }

    const bookingsCollection = db.collection("bookings")
    const eventsCollection = db.collection("events")
    const hallsCollection = db.collection("halls")

    const bookings = await bookingsCollection.find(query).toArray()

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        // Fetch event details
        const event = await eventsCollection.findOne({ _id: new ObjectId(booking.eventId) })

        let eventHallName = "N/A"
        if (event && event.hallId) {
          // Fetch hall details if hallId exists
          const hall = await hallsCollection.findOne({ _id: new ObjectId(event.hallId) })
          eventHallName = hall ? hall.name : "N/A"
        }

        return {
          id: booking._id.toString(),
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          eventTitle: event ? event.title : "Unknown Event",
          eventType: event ? event.type : "movie", // Default to movie if type is missing
          eventDate: event ? event.date : "Invalid Date",
          eventTime: event ? event.time : "N/A",
          eventHall: eventHallName,
          seats: booking.seats,
          seatType: booking.seatType,
          amount: booking.amount,
          processingFee: booking.processingFee,
          totalAmount: booking.totalAmount,
          status: booking.status,
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          paymentMethod: booking.paymentMethod,
        }
      }),
    )

    return NextResponse.json(enrichedBookings)
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    return NextResponse.json({ message: "Failed to fetch bookings", error: error.message }, { status: 500 })
  }
}
