"use client"

import type React from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Monitor, Users, Building, Filter, Sparkles } from "lucide-react"

interface AdminTabsProps {
  defaultValue?: string
  children: React.ReactNode
}

export function AdminTabs({ defaultValue = "events", children }: AdminTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-6">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5 bg-glass-white-strong backdrop-blur-xl border border-white/20 rounded-3xl h-auto sm:h-10">
        <TabsTrigger
          value="events"
          className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
        >
          <Monitor className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Events Management</span>
          <span className="sm:hidden">Events</span>
        </TabsTrigger>
        <TabsTrigger
          value="bookings"
          className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
        >
          <Users className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Customer Bookings</span>
          <span className="sm:hidden">Bookings</span>
        </TabsTrigger>
        <TabsTrigger
          value="halls"
          className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
        >
          <Building className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Halls Management</span>
          <span className="sm:hidden">Halls</span>
        </TabsTrigger>
        <TabsTrigger
          value="reports"
          className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
        >
          <Filter className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Reports</span>
          <span className="sm:hidden">Reports</span>
        </TabsTrigger>
        <TabsTrigger
          value="analytics"
          className="data-[state=active]:bg-brand-red-500/30 data-[state=active]:text-white text-cyber-slate-300 font-semibold rounded-2xl h-10 sm:h-8 text-sm sm:text-base"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Analytics</span>
          <span className="sm:hidden">Stats</span>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}
