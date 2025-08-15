import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["admin", "super-admin"]).optional(),
})

// GET - Get specific admin user
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super-admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const admin = await db
      .collection("admins")
      .findOne({ _id: new ObjectId(params.id) }, { projection: { password: 0 } })

    if (!admin) {
      return NextResponse.json({ message: "Admin user not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...admin,
      _id: admin._id.toString(),
    })
  } catch (error) {
    console.error("Error fetching admin user:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update admin user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super-admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Only super-admins can update other users, or users can update themselves
    if (session.user.role !== "super-admin" && session.user.id !== params.id) {
      return NextResponse.json({ message: "Unauthorized. You can only update your own profile." }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateAdminSchema.parse(body)

    const { db } = await connectToDatabase()

    // Check if admin exists
    const existingAdmin = await db.collection("admins").findOne({ _id: new ObjectId(params.id) })
    if (!existingAdmin) {
      return NextResponse.json({ message: "Admin user not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.role && session.user.role === "super-admin") updateData.role = validatedData.role
    if (validatedData.password) updateData.password = await bcrypt.hash(validatedData.password, 12)

    // Check for email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingAdmin.email) {
      const emailExists = await db.collection("admins").findOne({ email: validatedData.email })
      if (emailExists) {
        return NextResponse.json({ message: "An admin with this email already exists" }, { status: 409 })
      }
    }

    const result = await db.collection("admins").updateOne({ _id: new ObjectId(params.id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Admin user not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Admin user updated successfully" })
  } catch (error) {
    console.error("Error updating admin user:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete admin user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    // Only super-admins can delete admin users
    if (!session?.user || session.user.role !== "super-admin") {
      return NextResponse.json({ message: "Unauthorized. Super admin access required." }, { status: 403 })
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const result = await db.collection("admins").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Admin user not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Admin user deleted successfully" })
  } catch (error) {
    console.error("Error deleting admin user:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
