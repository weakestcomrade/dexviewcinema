import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

export function middleware(request: NextRequest) {
  console.log("[v0] Middleware running for:", request.nextUrl.pathname)

  // Check if the request is for admin routes (except login and signup)
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login") &&
    !request.nextUrl.pathname.startsWith("/admin/signup")
  ) {
    const token = request.cookies.get("auth-token")?.value
    console.log("[v0] Token found:", !!token)

    if (!token) {
      console.log("[v0] No token, redirecting to login")
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    try {
      const payload = verifyToken(token)
      console.log("[v0] Token payload:", payload)

      if (!payload || payload.role !== "admin") {
        console.log("[v0] Invalid token or not admin, redirecting to login")
        const response = NextResponse.redirect(new URL("/admin/login", request.url))
        response.cookies.delete("auth-token")
        return response
      }

      console.log("[v0] Token valid, allowing access")
    } catch (error) {
      console.log("[v0] Token verification failed:", error)
      const response = NextResponse.redirect(new URL("/admin/login", request.url))
      response.cookies.delete("auth-token")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
