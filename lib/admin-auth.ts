import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export interface AdminUser {
  _id?: string
  name: string
  email: string
  password: string
  role: "admin" | "super-admin"
  createdAt: Date
  updatedAt: Date
}

export async function createAdmin(userData: Omit<AdminUser, "_id" | "createdAt" | "updatedAt">) {
  try {
    const { db } = await connectToDatabase()

    // Check if admin already exists
    const existingAdmin = await db.collection("admins").findOne({
      email: userData.email,
    })

    if (existingAdmin) {
      throw new Error("Admin with this email already exists")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Create admin user
    const newAdmin = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("admins").insertOne(newAdmin)

    return {
      id: result.insertedId.toString(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
    }
  } catch (error) {
    console.error("Error creating admin:", error)
    throw error
  }
}

export async function getAdminByEmail(email: string) {
  try {
    const { db } = await connectToDatabase()
    const admin = await db.collection("admins").findOne({ email })
    return admin
  } catch (error) {
    console.error("Error getting admin by email:", error)
    throw error
  }
}
