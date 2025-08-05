import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      eventId,
      eventTitle,
      eventType,
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
      paymentReference,
      paymentMethod = "card",
    } = body

    // Validate required fields
    if (!customerName || !customerEmail || !eventId || !seats || seats.length === 0 || !paymentReference) {
      return NextResponse.json({ success: false, error: "Missing required booking information" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if event exists
    const eventsCollection = db.collection("events")
    const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) })

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    // Check if any of the selected seats are already booked
    const bookedSeats = event.bookedSeats || []
    const conflictingSeats = seats.filter((seat: string) => bookedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Some selected seats are no longer available",
          conflictingSeats,
        },
        { status: 409 },
      )
    }

    // Create booking record
    const booking = {
      customerName,
      customerEmail,
      customerPhone,
      eventId: new ObjectId(eventId),
      eventTitle,
      eventType,
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
      paymentReference,
      paymentMethod,
      paymentStatus: "pending",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId.toString(),
      booking: {
        ...booking,
        _id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("Booking creation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentReference = searchParams.get("paymentReference")
    const customerEmail = searchParams.get("customerEmail")

    const { db } = await connectToDatabase()

    const query: any = {}
    if (paymentReference) {
      query.paymentReference = paymentReference
    } else if (customerEmail) {
      query.customerEmail = customerEmail
    }

    const bookings = await db.collection("bookings").find(query).sort({ createdAt: -1 }).toArray()

    // Convert ObjectId to string for JSON serialization
    const serializedBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
      eventId: booking.eventId.toString(),
    }))

    return NextResponse.json({
      success: true,
      bookings: serializedBookings,
    })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
