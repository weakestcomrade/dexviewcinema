"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { Loader2, Shield } from "lucide-react"

interface AdminAuthGuardProps {
  children: ReactNode
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/admin/login")
      return
    }

    if (session.user.role !== "admin") {
      router.push("/admin/login")
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30 shadow-glow-red">
            <Shield className="w-8 h-8 text-brand-red-400" />
          </div>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-red-400" />
            <span className="text-white font-medium">Verifying admin access...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}
