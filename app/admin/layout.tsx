"use client"

import type React from "react"

import { SessionProvider } from "next-auth/react"
import AdminAuthWrapper from "@/components/admin-auth-wrapper"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <AdminAuthWrapper>{children}</AdminAuthWrapper>
    </SessionProvider>
  )
}
