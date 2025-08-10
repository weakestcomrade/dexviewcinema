import { connectToDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { EmailService } from "@/lib/emailService" // Import the new EmailService

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const body = await request.json()
    const { eventId, customerName, email, phone, seats, seatType, amount, reference } = body

    if (!eventId || !customerName || !email || !seats || !seatType || !amount || !reference) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Check if event exists and seats are available
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    const bookedSeats = event.bookedSeats || []
    const conflictingSeats = seats.filter((seat: string) => bookedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json(
        { message: `Seats ${conflictingSeats.join(", ")} are no longer available` },
        { status: 409 },
      )
    }

    // Update event with new booked seats
    const updatedBookedSeats = [...bookedSeats, ...seats]
    await db.collection("events").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          bookedSeats: updatedBookedSeats,
        },
      },
    )

    // Create booking record
    const booking = {
      eventId: new ObjectId(eventId),
      customerName,
      email,
      phone: phone || null,
      seats,
      seatType,
      amount,
      reference,
      status: "confirmed", // Assuming direct booking means confirmed
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    // Send confirmation email
    try {
      const emailService = new EmailService()
      await emailService.sendBookingReceipt(result.insertedId.toHexString())
    } catch (emailError) {
      console.error("Failed to send booking receipt email:", emailError)
      // Log the error but don't block the booking confirmation
    }

    return NextResponse.json({ message: "Booking created successfully", bookingId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ message: "Error creating booking", error: (error as Error).message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    let query = {}
    if (eventId) {
      query = { eventId: new ObjectId(eventId) }
    }

    const bookings = await db.collection("bookings").find(query).toArray()

    return NextResponse.json(bookings, { status: 200 })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ message: "Error fetching bookings", error: (error as Error).message }, { status: 500 })
  }
}
