"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (status === "loading") {
      return // Still loading session
    }

    if (status === "unauthenticated") {
      // Not authenticated, redirect to login
      router.push("/admin/login")
      return
    }

    if (session?.user?.role !== "admin" && session?.user?.role !== "super-admin") {
      // Authenticated but not admin, show access denied
      setIsChecking(false)
      return
    }

    // Authenticated and is admin
    setIsChecking(false)
  }, [session, status, router])

  // Show loading spinner while checking authentication
  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30 mb-6 mx-auto">
            <Loader2 className="w-10 h-10 text-brand-red-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Access</h2>
          <p className="text-cyber-slate-300">Please wait while we authenticate your session...</p>
        </div>
      </div>
    )
  }

  // Show access denied if user is authenticated but not admin
  if (session && session.user?.role !== "admin" && session.user?.role !== "super-admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link href="/" className="flex items-center space-x-4 group">
                <div className="relative">
                  <Image
                    src="/dexcinema-logo.jpeg"
                    alt="Dex View Cinema Logo"
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-4xl shadow-glow-red transform group-hover:scale-110 transition-all duration-300"
                    priority
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-2.5 h-2.5 bg-brand-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent">
                    Dex View Cinema
                  </h1>
                  <p className="text-sm font-medium bg-gradient-to-r from-brand-red-400 to-brand-red-300 bg-clip-text text-transparent">
                    Admin Portal
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto px-4 mt-20">
          <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-50 rounded-3xl"></div>

            <CardHeader className="relative z-10 text-center pb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/30 mb-6 mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">Access Denied</CardTitle>
              <CardDescription className="text-cyber-slate-300 text-lg">
                You don't have permission to access the admin dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 space-y-6 text-center">
              <p className="text-cyber-slate-300">
                This area is restricted to administrators only. If you believe this is an error, please contact your
                system administrator.
              </p>

              <div className="flex flex-col space-y-3">
                <Link href="/">
                  <Button className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-2xl">
                    Return to Homepage
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button
                    variant="outline"
                    className="w-full border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm rounded-2xl"
                  >
                    Admin Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // User is authenticated and has admin role, render children
  return <>{children}</>
}
