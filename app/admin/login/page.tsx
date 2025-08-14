"use client"

import type React from "react"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, Eye, EyeOff, Film } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        // Check if user is authenticated and redirect
        const session = await getSession()
        if (session) {
          router.push("/admin")
          router.refresh()
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex items-center justify-center">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="relative group">
              <Image
                src="/dexcinema-logo.jpeg"
                alt="Dex View Cinema Logo"
                width={64}
                height={64}
                className="w-16 h-16 rounded-4xl shadow-glow-red transform group-hover:scale-110 transition-all duration-300"
                priority
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                <div className="w-2.5 h-2.5 bg-brand-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent mb-2">
            Admin Portal
          </h1>
          <p className="text-cyber-slate-300">Sign in to access the admin dashboard</p>
        </div>

        {/* Login Card */}
        <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-brand-red-400" />
              Admin Login
            </CardTitle>
            <CardDescription className="text-cyber-slate-300">
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyber-slate-200 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@dexcinema.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 focus:ring-brand-red-500/20 rounded-2xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-cyber-slate-200 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 focus:ring-brand-red-500/20 rounded-2xl h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-cyber-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-2xl h-12 font-bold text-lg transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-sm text-cyber-slate-400 mb-2">Default credentials for testing:</p>
                <p className="text-xs text-cyber-slate-500 font-mono bg-glass-dark rounded-lg p-2">
                  Email: admin@dexcinema.com
                  <br />
                  Password: admin123
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-cyber-slate-300 hover:text-white hover:bg-glass-white transition-all duration-300"
            >
              <Film className="w-4 h-4 mr-2" />
              Back to Cinema
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
