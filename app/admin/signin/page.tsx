"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Eye, EyeOff, LogIn, Mail, Lock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Image from "next/image"

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export default function AdminSigninPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch("/api/admin/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsSuccess(true)
        // Redirect to admin dashboard after successful authentication
        setTimeout(() => {
          router.push("/admin")
        }, 2000)
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.message || "Invalid email or password. Please try again." })
      }
    } catch (error) {
      console.error("[v0] Signin error:", error)
      setErrors({ general: "Authentication failed. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        </div>

        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl relative z-10">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-cyber-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
              <p className="text-cyber-slate-300">You have successfully signed in. Redirecting to admin dashboard...</p>
            </div>
            <div className="space-y-3">
              <Link href="/admin" className="block">
                <Button className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl shadow-glow-red">
                  Go to Admin Dashboard
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button
                  variant="outline"
                  className="w-full border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
      </div>

      {/* Header with glassmorphism */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Image
                  src="/dexcinema-logo.jpeg"
                  alt="Dex View Cinema Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-4xl shadow-glow-red transform group-hover:scale-110 transition-all duration-300"
                  priority
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 bg-brand-red-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                  Admin Sign In
                </h1>
                <p className="text-sm text-brand-red-400 font-medium">Access your admin dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
        <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl relative z-10">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <LogIn className="w-8 h-8 text-brand-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Admin Sign In</CardTitle>
            <CardDescription className="text-cyber-slate-300 text-lg">
              Enter your credentials to access the cinema management system
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errors.general && (
              <Alert className="bg-brand-red-500/20 border-brand-red-500/50 text-brand-red-300">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyber-slate-200 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-red-400" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@dexviewcinema.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-400 focus:ring-brand-red-400 shadow-cyber-card rounded-2xl h-12 ${
                    errors.email ? "border-brand-red-500 focus:border-brand-red-500" : ""
                  }`}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-brand-red-400 text-sm flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-cyber-slate-200 font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-red-400" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-400 focus:ring-brand-red-400 shadow-cyber-card rounded-2xl h-12 pr-12 ${
                      errors.password ? "border-brand-red-500 focus:border-brand-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-cyber-slate-400 hover:text-white hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-brand-red-400 text-sm flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white rounded-2xl shadow-glow-red h-12 font-bold text-lg transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In to Dashboard
                  </>
                )}
              </Button>
            </form>

            {/* Additional Links */}
            <div className="text-center space-y-3 pt-4 border-t border-white/10">
              <p className="text-cyber-slate-400 text-sm">
                Don't have an admin account?{" "}
                <Link
                  href="/admin/signup"
                  className="text-brand-red-400 hover:text-brand-red-300 font-medium hover:underline transition-colors"
                >
                  Create Account
                </Link>
              </p>
              <Link href="/" className="block">
                <Button
                  variant="outline"
                  className="w-full border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 text-white py-8 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red-900/10 via-transparent to-brand-red-900/10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-500"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-cyber-slate-300 text-sm mb-2 sm:mb-0">
              &copy; 2025 Dex View Cinema. All rights reserved.
            </p>
            <p className="text-cyber-slate-300 text-sm">
              Developed by{" "}
              <a
                href="https://www.sydatech.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-red-400 hover:text-brand-red-300 transition-colors font-bold hover:underline"
              >
                SydaTech
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
