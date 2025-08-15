import { AdminAuthProvider } from "@/components/admin-auth-provider"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import type { ReactNode } from "react"

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </AdminAuthProvider>
  )
}
