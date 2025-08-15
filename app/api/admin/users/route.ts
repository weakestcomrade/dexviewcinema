import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { createAdmin } from "@/lib/admin-auth"
import { z } from "zod"

const createAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "super-admin"]),
})

// GET - List all admin users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super-admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const admins = await db
      .collection("admins")
      .find({}, { projection: { password: 0 } }) // Exclude password from results
      .sort({ createdAt: -1 })
      .toArray()

    const formattedAdmins = admins.map((admin) => ({
      ...admin,
      _id: admin._id.toString(),
    }))

    return NextResponse.json(formattedAdmins)
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new admin user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only super-admins can create new admin users
    if (!session?.user || session.user.role !== "super-admin") {
      return NextResponse.json({ message: "Unauthorized. Super admin access required." }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createAdminSchema.parse(body)

    const newAdmin = await createAdmin(validatedData)

    return NextResponse.json(
      {
        message: "Admin user created successfully",
        admin: newAdmin,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating admin user:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      )
    }

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({ message: "An admin with this email already exists" }, { status: 409 })
      }
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
