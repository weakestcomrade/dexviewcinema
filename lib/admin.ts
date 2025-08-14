import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export interface Admin {
  _id: string
  email: string
  name: string
  role: "admin" | "super_admin"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

export async function createAdmin(adminData: {
  email: string
  password: string
  name: string
  role?: "admin" | "super_admin"
}) {
  try {
    const { db } = await connectToDatabase()

    // Check if admin already exists
    const existingAdmin = await db.collection("admins").findOne({
      email: adminData.email,
    })

    if (existingAdmin) {
      throw new Error("Admin with this email already exists")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    // Create admin document
    const admin = {
      email: adminData.email,
      password: hashedPassword,
      name: adminData.name,
      role: adminData.role || "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("admins").insertOne(admin)

    return {
      success: true,
      adminId: result.insertedId.toString(),
    }
  } catch (error) {
    console.error("Error creating admin:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create admin",
    }
  }
}

export async function updateAdminPassword(adminId: string, newPassword: string) {
  try {
    const { db } = await connectToDatabase()

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    const result = await db.collection("admins").updateOne(
      { _id: adminId },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
    )

    return {
      success: result.modifiedCount > 0,
      error: result.modifiedCount === 0 ? "Admin not found" : null,
    }
  } catch (error) {
    console.error("Error updating admin password:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update password",
    }
  }
}

export async function getAdminById(adminId: string): Promise<Admin | null> {
  try {
    const { db } = await connectToDatabase()

    const admin = await db.collection("admins").findOne(
      { _id: adminId },
      { projection: { password: 0 } }, // Exclude password from result
    )

    if (!admin) return null

    return {
      ...admin,
      _id: admin._id.toString(),
    } as Admin
  } catch (error) {
    console.error("Error getting admin:", error)
    return null
  }
}
