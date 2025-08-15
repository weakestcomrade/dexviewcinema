import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  // Check if the request is for admin routes (except login and signup)
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login") &&
    !request.nextUrl.pathname.startsWith("/admin/signup")
  ) {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    try {
      // Verify the token
      const payload = await verifyToken(token)

      if (!payload || payload.role !== "admin") {
        // Invalid token or not admin, redirect to login
        const response = NextResponse.redirect(new URL("/admin/login", request.url))
        response.cookies.delete("auth-token")
        return response
      }
    } catch (error) {
      // Token verification failed, redirect to login
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
