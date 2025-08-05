import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase()
    const {
      eventId,
      userId,
      selectedSeats,
      totalPrice,
      paymentStatus,
      transactionReference, // Added transactionReference
      processingFee, // Made optional
    } = await req.json()

    if (!eventId || !userId || !selectedSeats || !totalPrice || !paymentStatus || !transactionReference) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const newBooking = {
      eventId: new ObjectId(eventId),
      userId: new ObjectId(userId),
      selectedSeats,
      totalPrice,
      paymentStatus,
      transactionReference,
      processingFee: processingFee || 0, // Default to 0 if not provided
      bookingDate: new Date(),
    }

    const result = await db.collection("bookings").insertOne(newBooking)

    return NextResponse.json({ message: "Booking created successfully", bookingId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ message: "Error creating booking" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { db } = await connectToDatabase()
    const bookings = await db.collection("bookings").find({}).toArray()
    return NextResponse.json(bookings, { status: 200 })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ message: "Error fetching bookings" }, { status: 500 })
  }
}
