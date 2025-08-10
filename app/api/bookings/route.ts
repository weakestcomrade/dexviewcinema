import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import { sendBookingReceiptEmail } from "@/lib/emailService" // Import the new email service

// Define the structure for a booking document
interface BookingDocument {
  _id?: ObjectId
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string // Reference to the event ID
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[] // Array of seat identifiers (e.g., ["A1", "A2"])
  seatType: string // e.g., "VIP Sofa", "Standard Single"
  amount: number // Base amount for seats
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string // Date of booking
  bookingTime: string // Time of booking
  paymentMethod: string
  createdAt: Date
  updatedAt: Date
}

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)

    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const phone = searchParams.get("phone")

    let query: any = {}
    const orConditions = []

    if (email) {
      orConditions.push({ customerEmail: email })
    }
    if (name) {
      orConditions.push({ customerName: { $regex: name, $options: "i" } }) // Case-insensitive partial match
    }
    if (phone) {
      orConditions.push({ customerPhone: phone })
    }
    if (orConditions.length > 0) {
      query = { $or: orConditions }
    }

    const bookings = await db.collection("bookings").find(query).toArray()

    const serializableBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
    }))

    return NextResponse.json(serializableBookings)
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    return NextResponse.json({ message: "Failed to fetch bookings", error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const newBookingData: BookingDocument = await request.json()

    // Basic validation for required fields
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
      status,
      bookingDate,
      bookingTime,
      paymentMethod,
    } = newBookingData

    const missingFields = []
    if (!customerName) missingFields.push("customerName")
    if (!customerEmail) missingFields.push("customerEmail")
    if (!customerPhone) missingFields.push("customerPhone")
    if (!eventId) missingFields.push("eventId")
    if (!eventTitle) missingFields.push("eventTitle")
    if (!eventType) missingFields.push("eventType")
    if (!seats || seats.length === 0) missingFields.push("seats")
    if (!seatType) missingFields.push("seatType")
    if (typeof amount !== "number" || amount < 0) missingFields.push("amount")
    if (typeof processingFee !== "number" || processingFee < 0) missingFields.push("processingFee")
    if (typeof totalAmount !== "number" || totalAmount < 0) missingFields.push("totalAmount")
    if (!status) missingFields.push("status")
    if (!bookingDate) missingFields.push("bookingDate")
    if (!bookingTime) missingFields.push("bookingTime")
    if (!paymentMethod) missingFields.push("paymentMethod")

    if (missingFields.length > 0) {
      console.error("Missing required fields for booking:", missingFields.join(", "), newBookingData)
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Check for duplicate bookings for the same event and seats
    const existingBooking = await db.collection("bookings").findOne({
      eventId: new ObjectId(eventId),
      seats: { $in: seats },
      status: { $ne: "cancelled" },
    })

    if (existingBooking) {
      console.warn("Duplicate booking attempt detected:", newBookingData)
      return NextResponse.json(
        { message: "One or more selected seats are already booked for this event." },
        { status: 409 },
      )
    }

    const bookingToInsert = {
      ...newBookingData,
      eventId: new ObjectId(eventId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(bookingToInsert)

    if (!result.acknowledged) {
      console.error("MongoDB insertOne not acknowledged for booking:", result)
      throw new Error("Failed to create booking: Acknowledgment failed.")
    }

    const createdBooking = {
      ...bookingToInsert,
      _id: result.insertedId.toString(),
      eventId: eventId, // Keep as string for email service
    }

    // --- Send email automatically after successful booking using the new service ---
    await sendBookingReceiptEmail(createdBooking)
    // --- End email sending logic ---

    // Revalidate the admin page to show the new booking
    revalidatePath("/admin")

    return NextResponse.json(createdBooking, { status: 201 })
  } catch (error) {
    console.error("Failed to create booking:", error)
    return NextResponse.json({ message: "Failed to create booking", error: (error as Error).message }, { status: 500 })
  }
}
