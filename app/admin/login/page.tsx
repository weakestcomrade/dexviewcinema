"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "Authentication Failed",
          description: "Invalid username or password. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard!",
        })
        router.push("/admin")
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
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
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30">
              <Shield className="w-10 h-10 text-brand-red-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                Admin Login
              </CardTitle>
              <CardDescription className="text-cyber-slate-300 mt-2">
                Access the Dex View Cinema admin dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-cyber-slate-200 font-semibold">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-cyber-slate-200 font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl pr-12"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-cyber-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white font-bold py-3 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-cyber-slate-800/50 rounded-2xl border border-white/10">
              <p className="text-xs text-cyber-slate-300 text-center">
                <strong>Demo Credentials:</strong>
                <br />
                Username: <code className="bg-cyber-slate-700/50 px-2 py-1 rounded">admin</code>
                <br />
                Password: <code className="bg-cyber-slate-700/50 px-2 py-1 rounded">admin123</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
