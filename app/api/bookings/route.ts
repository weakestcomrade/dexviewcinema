import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const bookings = await db.collection("bookings").find({}).toArray()

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventId,
      seats,
      customerName,
      customerEmail,
      customerPhone,
      totalAmount,
      paymentReference,
      status = "pending",
    } = body

    // Validate required fields
    if (!eventId || !seats || !customerName || !customerEmail || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if seats are still available
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check for seat conflicts
    const bookedSeats = event.bookedSeats || []
    const conflictingSeats = seats.filter((seat: string) => bookedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json({ error: "Some seats are no longer available", conflictingSeats }, { status: 409 })
    }

    // Create booking
    const booking = {
      eventId: new ObjectId(eventId),
      seats,
      customerName,
      customerEmail,
      customerPhone,
      totalAmount: Number.parseFloat(totalAmount),
      paymentReference,
      status,
      paymentStatus: status === "confirmed" ? "paid" : "pending",
      createdAt: new Date(),
      ...(status === "confirmed" && { paidAt: new Date() }),
    }

    const result = await db.collection("bookings").insertOne(booking)

    // If booking is confirmed, update event's booked seats
    if (status === "confirmed") {
      await db
        .collection("events")
        .updateOne({ _id: new ObjectId(eventId) }, { $addToSet: { bookedSeats: { $each: seats } } })
    }

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
      booking: { ...booking, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
