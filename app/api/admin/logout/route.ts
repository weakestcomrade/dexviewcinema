import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the admin session cookie
    const cookieStore = await cookies()
    cookieStore.delete("admin-session")

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: "Logout error" }, { status: 500 })
  }
}
