import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// Authentication utilities for admin users
export interface AdminUser {
  id: string
  email: string
  isAuthenticated: boolean
}

// Database-based authentication with bcrypt password verification
export const authenticateAdmin = async (email: string, password: string): Promise<AdminUser | null> => {
  try {
    const { db } = await connectToDatabase()

    // Find admin user by email
    const adminUser = await db.collection("admins").findOne({ email })

    if (!adminUser) {
      return null
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, adminUser.password)

    if (!isPasswordValid) {
      return null
    }

    // Return authenticated user data
    return {
      id: adminUser._id.toString(),
      email: adminUser.email,
      isAuthenticated: true,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

// Generate JWT token for authenticated admin
const generateJWTToken = (adminUser: AdminUser): string => {
  const secret = process.env.JWT_SECRET || "fallback-secret"
  return jwt.sign(
    {
      id: adminUser.id,
      email: adminUser.email,
      role: "admin",
    },
    secret,
    { expiresIn: "24h" },
  )
}

// Set authentication cookie with JWT token
export const setAuthCookie = (response: Response, adminUser: AdminUser) => {
  const token = generateJWTToken(adminUser)

  const cookie = `admin-token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
  response.headers.set("Set-Cookie", cookie)
}

// Clear authentication cookie
export const clearAuthCookie = (response: Response) => {
  const cookie = `admin-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  response.headers.set("Set-Cookie", cookie)
}

// Verify JWT token from cookie
export const verifyAuthToken = (token: string): AdminUser | null => {
  try {
    const secret = process.env.JWT_SECRET || "fallback-secret"
    const decoded = jwt.verify(token, secret) as any

    return {
      id: decoded.id,
      email: decoded.email,
      isAuthenticated: true,
    }
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}
