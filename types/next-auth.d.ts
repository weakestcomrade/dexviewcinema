declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      email: string
      role: string
    }
  }

  interface User {
    id: string
    username: string
    email: string
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    username: string
  }
}
