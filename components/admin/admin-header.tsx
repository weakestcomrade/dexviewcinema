"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Shield } from "lucide-react"
import Link from "next/link"

interface AdminHeaderProps {
  isCreateEventOpen: boolean
  setIsCreateEventOpen: (open: boolean) => void
  children: React.ReactNode // For the create event dialog content
}

export function AdminHeader({ isCreateEventOpen, setIsCreateEventOpen, children }: AdminHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-red-500 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-red-500/30 to-brand-red-600/30 rounded-4xl blur-xl animate-glow"></div>
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-brand-red-200 to-white bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm font-medium bg-gradient-to-r from-brand-red-400 to-brand-red-300 bg-clip-text text-transparent">
            Dex View Cinema Management System
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <Link href="/" className="w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="border-brand-red-500/50 text-brand-red-300 hover:bg-brand-red-500/20 bg-glass-white backdrop-blur-sm shadow-cyber-card hover:shadow-cyber-hover transition-all duration-300 group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
          >
            <Shield className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
            Back to Site
          </Button>
        </Link>
        <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-700 hover:from-brand-red-600 hover:via-brand-red-700 hover:to-brand-red-800 shadow-glow-red text-white group rounded-2xl w-full sm:w-auto h-10 sm:h-9"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-brand-red-200 bg-clip-text text-transparent">
                Create New Event
              </DialogTitle>
              <DialogDescription className="text-cyber-slate-300">
                Add a new movie or sports event with detailed seating arrangements and pricing.
              </DialogDescription>
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
