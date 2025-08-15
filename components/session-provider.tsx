"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

interface ClientSessionProviderProps {
  children: React.ReactNode
  session?: Session | null
}

export function ClientSessionProvider({ children, session }: ClientSessionProviderProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{children}</>
  }

  return <SessionProvider session={session}>{children}</SessionProvider>
}
