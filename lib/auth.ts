import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db(process.env.MONGODB_DB!)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          await client.connect()
          const adminsCollection = db.collection("admins")

          const admin = await adminsCollection.findOne({
            username: credentials.username,
          })

          if (!admin) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, admin.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: admin._id.toString(),
            username: admin.username,
            email: admin.email,
            role: "admin",
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        } finally {
          await client.close()
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.username = token.username as string
      }
      return session
    },
  },
}
