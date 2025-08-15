import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Check if user is trying to access admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Allow access to login and signup pages without authentication
      if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin/signup") {
        // If user is already authenticated, redirect to admin dashboard
        if (req.nextauth.token) {
          return NextResponse.redirect(new URL("/admin", req.url))
        }
        return NextResponse.next()
      }

      // For all other admin routes, check if user has admin role
      if (!req.nextauth.token || req.nextauth.token.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to non-admin routes without authentication
        if (!req.nextUrl.pathname.startsWith("/admin")) {
          return true
        }

        // Allow access to login and signup pages
        if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin/signup") {
          return true
        }

        // For admin routes, require authentication and admin role
        return !!token && token.role === "admin"
      },
    },
  },
)

export const config = {
  matcher: ["/admin/:path*"],
}
