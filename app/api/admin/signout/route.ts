import { type NextRequest, NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Create response and clear authentication cookie
    const response = NextResponse.json({ message: "Signed out successfully" }, { status: 200 })

    clearAuthCookie(response)

    return response
  } catch (error) {
    console.error("Admin signout error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
