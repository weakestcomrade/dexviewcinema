import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const bookings = await db.collection("bookings").find({}).sort({ createdAt: -1 }).toArray()

    // Convert ObjectId to string for client-side
    const serializableBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
      eventId: booking.eventId instanceof ObjectId ? booking.eventId.toString() : booking.eventId,
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
    const bookingData = await request.json()

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
      paymentReference,
    } = bookingData

    // Validate required fields
    const missingFields = []
    if (!customerName || customerName.trim() === "") missingFields.push("customerName")
    if (!customerEmail || customerEmail.trim() === "") missingFields.push("customerEmail")
    if (!eventId || eventId.trim() === "") missingFields.push("eventId")
    if (!seats || !Array.isArray(seats) || seats.length === 0) missingFields.push("seats")
    if (!amount || typeof amount !== "number") missingFields.push("amount")

    if (missingFields.length > 0) {
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Create booking document
    const booking = {
      customerName,
      customerEmail,
      customerPhone: customerPhone || "",
      eventId,
      eventTitle: eventTitle || "",
      eventType: eventType || "",
      seats,
      seatType: seatType || "",
      amount,
      processingFee: processingFee || 0,
      totalAmount: totalAmount || amount,
      status: status || "pending",
      bookingDate: bookingDate || new Date().toISOString().split("T")[0],
      bookingTime: bookingTime || new Date().toTimeString().split(" ")[0],
      paymentMethod: paymentMethod || "card",
      paymentReference: paymentReference || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    // Return the created booking with string ID
    const createdBooking = {
      ...booking,
      _id: result.insertedId.toString(),
    }

    revalidatePath("/admin")
    revalidatePath("/bookings")

    return NextResponse.json(createdBooking, { status: 201 })
  } catch (error) {
    console.error("Failed to create booking:", error)
    return NextResponse.json({ message: "Failed to create booking", error: (error as Error).message }, { status: 500 })
  }
}
