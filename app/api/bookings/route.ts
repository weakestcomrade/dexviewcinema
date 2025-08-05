import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)

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

    // Connect to MongoDB
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

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
    const bookingData = {
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

    const bookingsCollection = db.collection("bookings")
    const result = await bookingsCollection.insertOne(bookingData)

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
      message: "Booking created successfully",
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
  } finally {
    await client.close()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get("customerEmail")
    const paymentReference = searchParams.get("paymentReference")

    // Connect to MongoDB
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)
    const bookingsCollection = db.collection("bookings")

    let query = {}
    if (customerEmail) {
      query = { customerEmail }
    } else if (paymentReference) {
      query = { paymentReference }
    }

    const bookings = await bookingsCollection.find(query).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({
      success: true,
      bookings,
    })
  } catch (error) {
    console.error("Booking retrieval error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve bookings",
      },
      { status: 500 },
    )
  } finally {
    await client.close()
  }
}
