"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

interface AdminAuthProviderProps {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>
}
