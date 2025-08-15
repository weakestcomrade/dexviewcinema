import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Allow access to signin and signup pages
    if (request.nextUrl.pathname === "/admin/signin" || request.nextUrl.pathname === "/admin/signup") {
      return NextResponse.next()
    }

    // Check for authentication token in cookies
    const authToken = request.cookies.get("admin-auth-token")

    if (!authToken) {
      // Redirect to signin page if not authenticated
      return NextResponse.redirect(new URL("/admin/signin", request.url))
    }

    // TODO: Add token validation logic here
    // For now, we'll assume any token is valid
    // In production, you should validate the JWT token
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
