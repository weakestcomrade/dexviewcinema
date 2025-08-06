import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = params
    const { name, capacity, type } = await req.json()

    if (!id) {
      return NextResponse.json({ message: "Hall ID is required" }, { status: 400 })
    }
    if (!name || !capacity || !type) {
      return NextResponse.json({ message: "Missing required fields: name, capacity, type" }, { status: 400 })
    }

    const result = await db.collection("halls").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, capacity, type, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Hall not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Hall updated successfully" })
  } catch (error) {
    console.error("Failed to update hall:", error)
    return NextResponse.json({ message: "Failed to update hall", error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = params

    if (!id) {
      return NextResponse.json({ message: "Hall ID is required" }, { status: 400 })
    }

    const result = await db.collection("halls").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Hall not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Hall deleted successfully" })
  } catch (error) {
    console.error("Failed to delete hall:", error)
    return NextResponse.json({ message: "Failed to delete hall", error: (error as Error).message }, { status: 500 })
  }
}
