import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with uppercase, lowercase, and number" },
        { status: 400 },
      )
    }

    const { db } = await connectToDatabase()

    // Check if admin already exists
    const existingAdmin = await db.collection("admins").findOne({ email })
    if (existingAdmin) {
      return NextResponse.json({ error: "An admin account with this email already exists" }, { status: 409 })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create admin user
    const adminUser = {
      email,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("admins").insertOne(adminUser)

    if (result.insertedId) {
      return NextResponse.json(
        {
          message: "Admin account created successfully",
          adminId: result.insertedId,
        },
        { status: 201 },
      )
    } else {
      return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 })
    }
  } catch (error) {
    console.error("Admin signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
