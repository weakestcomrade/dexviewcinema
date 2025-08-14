import { type NextRequest, NextResponse } from "next/server"
import { createAdmin } from "@/lib/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Validate role
    if (role && !["admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 })
    }

    // Create admin account
    const result = await createAdmin({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || "admin",
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(
      {
        message: "Admin account created successfully",
        adminId: result.adminId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Admin signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
