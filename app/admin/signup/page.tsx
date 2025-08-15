"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, UserPlus, Lock, Mail, User, Shield, ArrowRight, Film, Crown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  role?: string
  general?: string
}

export default function AdminSignup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin" as "admin" | "super-admin",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const router = useRouter()
  const { toast } = useToast()

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match"
    }

    if (!formData.role) {
      newErrors.role = "Please select a role"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch("/api/admin/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors from server
          const serverErrors: FormErrors = {}
          data.errors.forEach((error: any) => {
            if (error.path && error.path.length > 0) {
              serverErrors[error.path[0] as keyof FormErrors] = error.message
            }
          })
          setErrors(serverErrors)
        } else {
          setErrors({ general: data.message || "Signup failed" })
        }

        toast({
          title: "Signup Failed",
          description: data.message || "Failed to create admin account",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Account Created Successfully!",
        description: "Your admin account has been created. You can now sign in.",
      })

      // Redirect to login page
      router.push("/admin/login")
    } catch (error) {
      console.error("Signup error:", error)
      setErrors({ general: "An unexpected error occurred. Please try again." })
      toast({
        title: "Signup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden flex items-center justify-center py-8">
      {/* Cyber-Glassmorphism background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-brand-red-500/20 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 border border-cyber-blue-500/30 rotate-12 animate-bounce-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-16 h-16 border border-cyber-purple-500/20 rounded-full animate-pulse-slow"></div>
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
            <div className="flex items-center space-x-4">
              <Link href="/admin/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl"
                >
                  <Shield className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Sign In
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl"
                >
                  <Film className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Signup Form */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 mt-20">
        <Card className="bg-glass-white-strong backdrop-blur-xl shadow-cyber-card border border-white/20 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/10 to-transparent opacity-50 rounded-3xl"></div>

          <CardHeader className="relative z-10 text-center pb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-red-500/20 to-brand-red-600/20 rounded-full flex items-center justify-center border border-brand-red-500/30 mb-6 mx-auto group">
              <UserPlus className="w-10 h-10 text-brand-red-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">Create Admin Account</CardTitle>
            <CardDescription className="text-cyber-slate-300 text-lg">
              Set up your admin account to manage the cinema system
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-6">
            {errors.general && (
              <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
                <Lock className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isLoading}
                    className={`pl-12 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500/50 focus:ring-brand-red-500/20 rounded-2xl h-12 ${
                      errors.name ? "border-red-500/50" : ""
                    }`}
                  />
                </div>
                {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="admin@dexviewcinema.com"
                    required
                    disabled={isLoading}
                    className={`pl-12 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500/50 focus:ring-brand-red-500/20 rounded-2xl h-12 ${
                      errors.email ? "border-red-500/50" : ""
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-white font-medium">
                  Admin Role
                </Label>
                <div className="relative">
                  <Crown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-5 h-5 z-10" />
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "super-admin") => handleInputChange("role", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      className={`pl-12 bg-glass-white border-white/20 text-white focus:border-brand-red-500/50 focus:ring-brand-red-500/20 rounded-2xl h-12 ${
                        errors.role ? "border-red-500/50" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select admin role" />
                    </SelectTrigger>
                    <SelectContent className="bg-glass-white-strong backdrop-blur-xl border-white/20 rounded-2xl">
                      <SelectItem value="admin" className="text-white hover:bg-brand-red-500/20">
                        Admin - Standard Access
                      </SelectItem>
                      <SelectItem value="super-admin" className="text-white hover:bg-brand-red-500/20">
                        Super Admin - Full Access
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.role && <p className="text-red-400 text-sm">{errors.role}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Create a strong password"
                    required
                    disabled={isLoading}
                    className={`pl-12 pr-12 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500/50 focus:ring-brand-red-500/20 rounded-2xl h-12 ${
                      errors.password ? "border-red-500/50" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    className={`pl-12 pr-12 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500/50 focus:ring-brand-red-500/20 rounded-2xl h-12 ${
                      errors.confirmPassword ? "border-red-500/50" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 text-white shadow-glow-red rounded-2xl h-12 font-semibold text-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-red-400/20 to-brand-red-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-cyber-slate-400 text-sm">
                Already have an admin account?{" "}
                <Link
                  href="/admin/login"
                  className="text-brand-red-400 hover:text-brand-red-300 transition-colors font-medium hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-cyber-slate-400 text-sm">
            Admin accounts require approval and are monitored for security.
          </p>
        </div>
      </div>
    </div>
  )
}
