"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff, UserPlus, Lock, Mail } from "lucide-react"
import Link from "next/link"

interface AdminSignupData {
  email: string
  password: string
  confirmPassword: string
}

const initialSignupState: AdminSignupData = {
  email: "",
  password: "",
  confirmPassword: "",
}

export default function AdminSignup() {
  const { toast } = useToast()
  const [signupData, setSignupData] = useState<AdminSignupData>(initialSignupState)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: keyof AdminSignupData, value: string) => {
    setSignupData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = (): boolean => {
    if (!signupData.email.trim() || !/\S+@\S+\.\S+/.test(signupData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return false
    }

    if (signupData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      })
      return false
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      // TODO: Implement actual signup API call
      // This is a placeholder for future authentication integration
      console.log("[v0] Admin signup data:", signupData)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Account Created Successfully!",
        description: "Your admin account has been created. Please wait for approval.",
        variant: "default",
      })

      // Reset form
      setSignupData(initialSignupState)

      // TODO: Redirect to login page or dashboard after successful signup
    } catch (error) {
      console.error("[v0] Signup error:", error)
      toast({
        title: "Signup Failed",
        description: "An error occurred while creating your account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-dark-900 via-cyber-dark-800 to-cyber-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-cyber-green-500/15 to-cyber-purple-500/15 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="bg-glass-dark-strong backdrop-blur-xl border border-white/20 shadow-cyber-hover rounded-4xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-4xl flex items-center justify-center shadow-glow-red transform group-hover:scale-110 transition-all duration-300">
                  <UserPlus className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent">
              Admin Registration
            </CardTitle>
            <CardDescription className="text-cyber-slate-300">
              Create your admin account for Dex View Cinema Management System
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cyber-slate-200 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 rounded-2xl"
                    placeholder="admin@dexviewcinema.com"
                    required
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-cyber-slate-200 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={signupData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10 pr-10 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 rounded-2xl"
                      placeholder="Enter secure password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-cyber-slate-200 font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyber-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10 bg-glass-white border-white/20 text-white placeholder:text-cyber-slate-400 focus:border-brand-red-500 rounded-2xl"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyber-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 shadow-glow-red text-white font-semibold rounded-2xl h-12 group"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="text-center space-y-4 pt-4 border-t border-white/10">
              <div className="flex flex-col space-y-2 text-sm">
                <Link href="/admin" className="text-cyber-slate-300 hover:text-brand-red-400 transition-colors">
                  Already have an account? Sign in
                </Link>
                <Link
                  href="/"
                  className="text-cyber-slate-400 hover:text-white transition-colors flex items-center justify-center space-x-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Back to Main Site</span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
