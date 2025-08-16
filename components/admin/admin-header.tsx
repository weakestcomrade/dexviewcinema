"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Shield, Plus } from "lucide-react"
import Link from "next/link"

interface AdminHeaderProps {
  isCreateEventOpen: boolean
  setIsCreateEventOpen: (open: boolean) => void
  createEventDialog: React.ReactNode
}

export function AdminHeader({ isCreateEventOpen, setIsCreateEventOpen, createEventDialog }: AdminHeaderProps) {
  return (
    <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4 sm:gap-0">
          <div className="flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-start">
            <div className="relative group">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-4xl flex items-center justify-center shadow-glow-red transform group-hover:scale-110 transition-all duration-300">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:rotate-180 transition-transform duration-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
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
              {createEventDialog}
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
