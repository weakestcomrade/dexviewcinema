import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hashPassword, validateEmail, validatePassword } from "@/lib/auth"
import type { CreateUserData } from "@/types/user"

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserData = await request.json()
    const { email, password, name, phone, role } = body

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json({ message: "Email, password, and name are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ message: passwordValidation.message }, { status: 400 })
    }

    // Only allow admin role for this signup endpoint
    if (role !== "admin") {
      return NextResponse.json({ message: "This signup is only for admin users" }, { status: 400 })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const newUser = {
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("users").insertOne(newUser)

    // Return success response (without password)
    return NextResponse.json(
      {
        message: "Admin account created successfully",
        user: {
          _id: result.insertedId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
