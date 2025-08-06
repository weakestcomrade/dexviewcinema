import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import type { Hall } from "@/types/hall"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const halls = await db.collection("halls").find({}).toArray()

    // Ensure _id is a string for consistency with frontend types
    const serializableHalls: Hall[] = halls.map((hall) => ({
      ...hall,
      _id: hall._id.toString(),
    }))

    return NextResponse.json(serializableHalls)
  } catch (error) {
    console.error("Failed to fetch halls:", error)
    return NextResponse.json({ message: "Failed to fetch halls", error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase()
    const { name, capacity, type } = await req.json()

    if (!name || !capacity || !type) {
      return NextResponse.json({ message: "Missing required fields: name, capacity, type" }, { status: 400 })
    }

    const result = await db.collection("halls").insertOne({ name, capacity, type, createdAt: new Date() })

    return NextResponse.json({ message: "Hall created successfully", hallId: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    console.error("Failed to create hall:", error)
    return NextResponse.json({ message: "Failed to create hall", error: (error as Error).message }, { status: 500 })
  }
}
