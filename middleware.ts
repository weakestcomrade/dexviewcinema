import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can be added here if needed
    return
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Only allow access to admin routes if user has admin role
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "admin"
        }
        return true
      },
    },
  },
)

export const config = {
  matcher: ["/admin/:path*"],
}
