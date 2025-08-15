import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(process.env.MONGODB_DB!)

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json({ message: "Username, email, and password are required" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 })
    }

    await client.connect()
    const adminsCollection = db.collection("admins")

    // Check if username already exists
    const existingUsername = await adminsCollection.findOne({ username })
    if (existingUsername) {
      return NextResponse.json({ message: "Username already exists" }, { status: 409 })
    }

    // Check if email already exists
    const existingEmail = await adminsCollection.findOne({ email })
    if (existingEmail) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create new admin user
    const newAdmin = {
      username,
      email,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date(),
      isActive: true,
    }

    await adminsCollection.insertOne(newAdmin)

    return NextResponse.json({ message: "Admin account created successfully" }, { status: 201 })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  } finally {
    await client.close()
  }
}
