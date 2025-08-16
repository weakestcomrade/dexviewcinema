import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes
        if (
          req.nextUrl.pathname.startsWith("/admin") &&
          !req.nextUrl.pathname.startsWith("/admin/signin") &&
          !req.nextUrl.pathname.startsWith("/admin/signup")
        ) {
          return !!token
        }
        return true
      },
    },
  },
)

export const config = {
  matcher: ["/admin/:path*"],
}
