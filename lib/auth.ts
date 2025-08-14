import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        try {
          console.log("Attempting to authenticate user:", credentials.email)
          const { db } = await connectToDatabase()

          const admin = await db.collection("admins").findOne({
            email: credentials.email,
          })

          if (!admin) {
            console.log("Admin user not found:", credentials.email)
            return null
          }

          console.log("Admin user found, checking password...")
          const isPasswordValid = await bcrypt.compare(credentials.password, admin.password)

          if (!isPasswordValid) {
            console.log("Invalid password for user:", credentials.email)
            return null
          }

          console.log("Authentication successful for:", credentials.email)
          return {
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name || admin.email,
            role: "admin",
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}
