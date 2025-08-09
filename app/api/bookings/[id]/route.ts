import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid booking ID" }, { status: 400 })
    }

    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(id) })

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    // Convert ObjectId to string for client-side serialization
    const serializableBooking = {
      ...booking,
      _id: booking._id.toString(),
      eventId: booking.eventId ? booking.eventId.toString() : undefined, // Ensure eventId is string
    }

    return NextResponse.json(serializableBooking)
  } catch (error) {
    console.error("Failed to fetch booking by ID:", error)
    return NextResponse.json({ message: "Failed to fetch booking", error: (error as Error).message }, { status: 500 })
  }
}
