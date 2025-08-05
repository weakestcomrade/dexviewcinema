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
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Check if seats are still available
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    const bookedSeats = event.bookedSeats || []
    const conflictingSeats = seats.filter((seat: string) => bookedSeats.includes(seat))

    if (conflictingSeats.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Seats ${conflictingSeats.join(", ")} are no longer available`,
        },
        { status: 409 },
      )
    }

    // Create booking
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
      paymentStatus: "PENDING",
      status: "pending",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    // Reserve seats temporarily (will be confirmed after payment)
    await db.collection("events").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $addToSet: { bookedSeats: { $each: seats } },
        $inc: { totalBookings: 1 },
      },
    )

    return NextResponse.json({
      success: true,
      bookingId: result.insertedId,
      booking: { ...booking, _id: result.insertedId },
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
    const searchParams = request.nextUrl.searchParams
    const customerEmail = searchParams.get("customerEmail")
    const paymentReference = searchParams.get("paymentReference")

    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    let query = {}
    if (customerEmail) {
      query = { customerEmail }
    } else if (paymentReference) {
      query = { paymentReference }
    }

    const bookings = await db.collection("bookings").find(query).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({
      success: true,
      bookings,
    })
  } catch (error) {
    console.error("Booking fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch bookings",
      },
      { status: 500 },
    )
  } finally {
    await client.close()
  }
}
