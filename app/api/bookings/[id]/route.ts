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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = params
    const updateData = await request.json()

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid booking ID" }, { status: 400 })
    }

    // Validate the status field if it's being updated
    if (updateData.status && !["confirmed", "pending", "cancelled"].includes(updateData.status)) {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 })
    }

    // Check if booking exists
    const existingBooking = await db.collection("bookings").findOne({ _id: new ObjectId(id) })
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    // Update the booking
    const result = await db.collection("bookings").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: "No changes made to booking" }, { status: 200 })
    }

    // Fetch and return the updated booking
    const updatedBooking = await db.collection("bookings").findOne({ _id: new ObjectId(id) })
    const serializableBooking = {
      ...updatedBooking,
      _id: updatedBooking._id.toString(),
      eventId: updatedBooking.eventId ? updatedBooking.eventId.toString() : undefined,
    }

    return NextResponse.json(serializableBooking)
  } catch (error) {
    console.error("Failed to update booking:", error)
    return NextResponse.json({ message: "Failed to update booking", error: (error as Error).message }, { status: 500 })
  }
}
