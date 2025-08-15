import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    console.log("[v0] NextAuth middleware running for:", req.nextUrl.pathname)
    console.log("[v0] User token:", req.nextauth.token)

    // Check if user has admin role
    if (req.nextauth.token?.role !== "admin") {
      console.log("[v0] Access denied - not admin role")
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }

    console.log("[v0] Admin access granted")
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log("[v0] Authorization check for:", req.nextUrl.pathname)
        console.log("[v0] Token exists:", !!token)

        // Allow access to login and signup pages without authentication
        if (req.nextUrl.pathname.startsWith("/admin/login") || req.nextUrl.pathname.startsWith("/admin/signup")) {
          return true
        }

        // For other admin routes, require authentication
        return !!token
      },
    },
  },
)

export const config = {
  matcher: ["/admin/:path*"],
}
