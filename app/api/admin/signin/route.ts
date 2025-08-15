import { type NextRequest, NextResponse } from "next/server"
import { authenticateAdmin, setAuthCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Authenticate admin user against database
    const adminUser = await authenticateAdmin(email, password)

    if (!adminUser) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create response and set authentication cookie with JWT token
    const response = NextResponse.json({ message: "Authentication successful", user: adminUser }, { status: 200 })

    setAuthCookie(response, adminUser)

    return response
  } catch (error) {
    console.error("Admin signin error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
