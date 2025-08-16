import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if admin already exists
    const existingAdmin = await db.collection("admins").findOne({ email })
    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin
    const result = await db.collection("admins").insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date(),
    })

    return NextResponse.json({ message: "Admin created successfully", id: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
