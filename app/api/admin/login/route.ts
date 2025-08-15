import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Simple credential check - in production, use proper password hashing
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Create session token
      const sessionToken = process.env.ADMIN_SESSION_TOKEN || "admin-session-token-2025"

      // Set secure cookie
      const cookieStore = await cookies()
      cookieStore.set("admin-session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ message: "Login error" }, { status: 500 })
  }
}
