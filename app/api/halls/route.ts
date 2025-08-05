import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import type { Hall } from "@/types/hall"

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
