import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "admin") {
    redirect("/admin/login")
  }

  return session
}

export async function getAuthSession() {
  return await getServerSession(authOptions)
}
