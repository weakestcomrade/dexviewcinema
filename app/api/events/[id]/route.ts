import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { db } = await connectToDatabase()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid Event ID" }, { status: 400 })
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    // Convert ObjectId to string for client-side
    const serializableEvent = {
      ...event,
      _id: event._id.toString(),
      // Ensure bookedSeats is an array, even if null/undefined in DB
      bookedSeats: event.bookedSeats || [],
      hall_id: event.hall_id instanceof ObjectId ? event.hall_id.toString() : event.hall_id,
    }

    return NextResponse.json(serializableEvent)
  } catch (error) {
    console.error("Failed to fetch event:", error)
    return NextResponse.json({ message: "Failed to fetch event", error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { db } = await connectToDatabase()
    const updatedEventData = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid Event ID" }, { status: 400 })
    }

    // Remove _id from updatedEventData if present, as it cannot be updated
    if (updatedEventData._id) {
      delete updatedEventData._id
    }

    const {
      title,
      event_type,
      category,
      event_date,
      event_time,
      hall_id,
      description,
      duration,
      pricing,
      total_seats,
      status,
      image_url,
    } = updatedEventData

    const missingFields = []
    if (!title || title.trim() === "") missingFields.push("title")
    if (!event_type || event_type.trim() === "") missingFields.push("event_type")
    if (!category || category.trim() === "") missingFields.push("category")
    if (!event_date || event_date.trim() === "") missingFields.push("event_date")
    if (!event_time || event_time.trim() === "") missingFields.push("event_time")
    if (!hall_id || hall_id.trim() === "") missingFields.push("hall_id")
    if (!description || description.trim() === "") missingFields.push("description")
    if (!duration || duration.trim() === "") missingFields.push("duration")
    if (!pricing) missingFields.push("pricing")
    if (typeof total_seats !== "number" || total_seats <= 0) missingFields.push("total_seats")
    if (!status || status.trim() === "") missingFields.push("status")

    if (missingFields.length > 0) {
      console.error("Missing required fields in updated event data:", missingFields.join(", "), updatedEventData)
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    const result = await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updatedEventData,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    revalidatePath("/")
    revalidatePath("/admin") // Revalidate admin page after updating an event

    return NextResponse.json({ message: "Event updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Failed to update event:", error)
    return NextResponse.json({ message: "Failed to update event", error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { db } = await connectToDatabase()
    const { newBookedSeats } = await request.json()

    if (!Array.isArray(newBookedSeats)) {
      return NextResponse.json({ message: "Invalid data: newBookedSeats must be an array" }, { status: 400 })
    }

    const result = await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { bookedSeats: { $each: newBookedSeats } } }, // Add new seats to the array without duplicates
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    // Revalidate paths that depend on event data, e.g., the admin seat management page
    revalidatePath(`/admin/seats/${id}`)
    revalidatePath(`/book/${id}`) // Revalidate the booking page itself

    return NextResponse.json({ message: "Event booked seats updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Failed to update event booked seats:", error)
    return NextResponse.json(
      { message: "Failed to update event booked seats", error: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { db } = await connectToDatabase()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid Event ID" }, { status: 400 })
    }

    const result = await db.collection("events").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    revalidatePath("/")
    revalidatePath("/admin") // Revalidate admin page after deleting an event

    return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Failed to delete event:", error)
    return NextResponse.json({ message: "Failed to delete event", error: (error as Error).message }, { status: 500 })
  }
}
