import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { User } from "@/types/user"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: Omit<User, "password">): string {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  )
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" }
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" }
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" }
  }

  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" }
  }

  return { isValid: true }
}
