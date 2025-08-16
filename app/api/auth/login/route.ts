import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyPassword, generateToken, validateEmail } from "@/lib/auth"
import type { LoginData } from "@/types/user"

export async function POST(request: NextRequest) {
  try {
    const body: LoginData = await request.json()
    const { email, password } = body

    console.log("[v0] Login attempt for email:", email)

    // Validation
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Find user
    const user = await db.collection("users").findOne({ email })
    if (!user) {
      console.log("[v0] User not found for email:", email)
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    console.log("[v0] User found, verifying password...")

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      console.log("[v0] Invalid password for user:", email)
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    if (user.role !== "admin") {
      console.log("[v0] User is not admin:", email, "Role:", user.role)
      return NextResponse.json({ message: "Access denied. Admin privileges required." }, { status: 403 })
    }

    console.log("[v0] Password verified, generating token...")

    // Generate token
    const userWithoutPassword = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    const token = generateToken(userWithoutPassword)
    console.log("[v0] Token generated, creating redirect response...")

    const response = NextResponse.redirect(new URL("/admin", request.url))

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    console.log("[v0] Cookie set with redirect response")

    return response
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
