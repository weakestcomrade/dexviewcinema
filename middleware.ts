import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Check if user is trying to access admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Allow access to login and signup pages without authentication
      if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin/signup") {
        return NextResponse.next()
      }

      // For other admin routes, check if user has admin role
      const token = req.nextauth.token
      if (!token || (token.role !== "admin" && token.role !== "super_admin")) {
        return NextResponse.redirect(new URL("/admin/login", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login and signup pages
        if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin/signup") {
          return true
        }

        // For admin routes, require authentication and admin role
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token && (token.role === "admin" || token.role === "super_admin")
        }

        // Allow access to all other routes
        return true
      },
    },
  },
)

export const config = {
  matcher: ["/admin/:path*"],
}
