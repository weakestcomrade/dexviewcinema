import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const events = await db.collection("events").find({}).toArray()

    const serializableEvents = events.map((event) => ({
      ...event,
      _id: event._id.toString(),
      hall_id: event.hall_id instanceof ObjectId ? event.hall_id.toString() : event.hall_id,
    }))

    return NextResponse.json(serializableEvents)
  } catch (error) {
    console.error("Failed to fetch events:", error)
    return NextResponse.json({ message: "Failed to fetch events", error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const newEventData = await request.json()

    if (newEventData._id) {
      delete newEventData._id
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
    } = newEventData

    const missingFields = []
    if (!title || title.trim() === "") missingFields.push("title")
    if (!event_type || event_type.trim() === "") missingFields.push("event_type")
    if (!category || category.trim() === "") missingFields.push("category")
    if (!event_date || event_date.trim() === "") missingFields.push("event_date")
    if (!event_time || event_time.trim() === "") missingFields.push("event_time")
    if (!hall_id || hall_id.trim() === "") missingFields.push("hall_id")
    if (!description || description.trim() === "") missingFields.push("description")
    if (!duration || duration.trim() === "") missingFields.push("duration")
    if (typeof total_seats !== "number" || total_seats <= 0) missingFields.push("total_seats")
    if (!status || status.trim() === "") missingFields.push("status")

    // Dynamic pricing validation based on event_type and hall_id
    if (!pricing) {
      missingFields.push("pricing")
    } else {
      if (event_type === "movie") {
        if (hall_id === "vip_hall") {
          if (!pricing.vipSingle?.price || pricing.vipSingle.price <= 0) missingFields.push("pricing.vipSingle.price")
          if (!pricing.vipCouple?.price || pricing.vipCouple.price <= 0) missingFields.push("pricing.vipCouple.price")
          if (!pricing.vipFamily?.price || pricing.vipFamily.price <= 0) missingFields.push("pricing.vipFamily.price")
        } else if (hall_id === "hallA" || hall_id === "hallB") {
          if (!pricing.standardSingle?.price || pricing.standardSingle.price <= 0)
            missingFields.push("pricing.standardSingle.price")
        } else {
          missingFields.push("pricing (unknown movie hall type)")
        }
      } else if (event_type === "match") {
        if (hall_id === "vip_hall") {
          if (!pricing.vipSofaSeats?.price || pricing.vipSofaSeats.price <= 0)
            missingFields.push("pricing.vipSofaSeats.price")
          if (!pricing.vipRegularSeats?.price || pricing.vipRegularSeats.price <= 0)
            missingFields.push("pricing.vipRegularSeats.price")
        } else if (hall_id === "hallA" || hall_id === "hallB") {
          if (!pricing.standardMatchSeats?.price || pricing.standardMatchSeats.price <= 0)
            missingFields.push("pricing.standardMatchSeats.price")
        } else {
          missingFields.push("pricing (unknown match hall type)")
        }
      } else {
        missingFields.push("pricing (unknown event type)")
      }
    }

    if (missingFields.length > 0) {
      console.error("Missing required fields in new event data:", missingFields.join(", "), newEventData)
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    const eventToInsert = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("Attempting to insert new event:", eventToInsert)

    const result = await db.collection("events").insertOne(eventToInsert)

    if (!result.acknowledged) {
      console.error("MongoDB insertOne not acknowledged:", result)
      throw new Error("Failed to create event: Acknowledgment failed.")
    }

    const createdEvent = {
      ...eventToInsert,
      _id: result.insertedId.toString(),
    }

    revalidatePath("/")
    revalidatePath("/admin") // Revalidate admin page after creating an event

    return NextResponse.json(createdEvent, { status: 201 })
  } catch (error) {
    console.error("Failed to create event:", error)
    return NextResponse.json({ message: "Failed to create event", error: (error as Error).message }, { status: 500 })
  }
}
