import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/admin/signup") {
          return true
        }

        // Protect other admin routes
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
