import { type NextRequest, NextResponse } from "next/server"
import { createAdmin } from "@/lib/admin-auth"
import { z } from "zod"

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["admin", "super-admin"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = signupSchema.parse(body)

    // Create the admin user
    const newAdmin = await createAdmin({
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
      role: validatedData.role,
    })

    return NextResponse.json(
      {
        message: "Admin account created successfully",
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)

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
