"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit, Trash2, Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import type { Hall } from "@/types/hall"

export default function AdminHallsPage() {
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateEditHallOpen, setIsCreateEditHallOpen] = useState(false)
  const [currentHall, setCurrentHall] = useState<Hall>({
    _id: "",
    name: "",
    capacity: 0,
    type: "standard",
  })
  const { toast } = useToast()

  const initialNewHallState: Hall = {
    _id: "",
    name: "",
    capacity: 0,
    type: "standard",
  }

  // Fetch halls
  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const response = await fetch("/api/halls")
        if (response.ok) {
          const hallsData = await response.json()
          setHalls(hallsData)
        }
      } catch (error) {
        console.error("Failed to fetch halls:", error)
        toast({
          title: "Error",
          description: "Failed to load halls data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHalls()
  }, [toast])

  const handleCreateHall = async () => {
    try {
      const response = await fetch("/api/halls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: currentHall.name,
          capacity: currentHall.capacity,
          type: currentHall.type,
        }),
      })

      if (response.ok) {
        const newHall = await response.json()
        setHalls([...halls, newHall])
        setIsCreateEditHallOpen(false)
        setCurrentHall(initialNewHallState)
        toast({
          title: "Success",
          description: "Hall created successfully",
        })
      } else {
        throw new Error("Failed to create hall")
      }
    } catch (error) {
      console.error("Error creating hall:", error)
      toast({
        title: "Error",
        description: "Failed to create hall",
        variant: "destructive",
      })
    }
  }

  const handleUpdateHall = async () => {
    try {
      const response = await fetch(`/api/halls/${currentHall._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: currentHall.name,
          capacity: currentHall.capacity,
          type: currentHall.type,
        }),
      })

      if (response.ok) {
        const updatedHall = await response.json()
        setHalls(halls.map((hall) => (hall._id === updatedHall._id ? updatedHall : hall)))
        setIsCreateEditHallOpen(false)
        setCurrentHall(initialNewHallState)
        toast({
          title: "Success",
          description: "Hall updated successfully",
        })
      } else {
        throw new Error("Failed to update hall")
      }
    } catch (error) {
      console.error("Error updating hall:", error)
      toast({
        title: "Error",
        description: "Failed to update hall",
        variant: "destructive",
      })
    }
  }

  const handleEditHallClick = (hall: Hall) => {
    setCurrentHall(hall)
    setIsCreateEditHallOpen(true)
  }

  const handleDeleteHall = async (hallId: string, hallName: string) => {
    if (confirm(`Are you sure you want to delete "${hallName}"?`)) {
      try {
        const response = await fetch(`/api/halls/${hallId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          setHalls(halls.filter((hall) => hall._id !== hallId))
          toast({
            title: "Success",
            description: "Hall deleted successfully",
          })
        } else {
          throw new Error("Failed to delete hall")
        }
      } catch (error) {
        console.error("Error deleting hall:", error)
        toast({
          title: "Error",
          description: "Failed to delete hall",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center">
        <div className="text-white">Loading halls...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-red-500/20 to-cyber-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyber-blue-500/15 to-brand-red-500/15 rounded-full blur-3xl animate-float delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-glass-white border-b border-white/10 shadow-cyber-card z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mr-4 text-cyber-slate-300 hover:bg-glass-white group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-brand-red-300 to-white bg-clip-text text-transparent">
                Halls Management
              </h1>
              <p className="text-sm text-brand-red-400 font-medium">
                Create, update, or delete cinema halls and venues
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white text-xl font-bold">Hall/Venue Management</CardTitle>
              <CardDescription className="text-cyber-slate-300">
                Create, update, or delete cinema halls and venues.
              </CardDescription>
            </div>
            <Dialog open={isCreateEditHallOpen} onOpenChange={setIsCreateEditHallOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cyber-purple-500 via-cyber-purple-600 to-cyber-purple-700 hover:from-cyber-purple-600 hover:via-cyber-purple-700 hover:to-cyber-purple-800 shadow-glow-purple text-white group rounded-2xl"
                  onClick={() => setCurrentHall(initialNewHallState)}
                >
                  <Plus className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Create Hall
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-glass-dark-strong backdrop-blur-xl border border-white/20 text-white shadow-cyber-hover rounded-4xl">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl font-bold bg-gradient-to-r from-white to-cyber-purple-200 bg-clip-text text-transparent">
                    {currentHall._id ? "Edit Hall" : "Create New Hall"}
                  </DialogTitle>
                  <DialogDescription className="text-cyber-slate-300">
                    {currentHall._id ? "Modify details for this hall." : "Add a new cinema hall or venue."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-3">
                    <Label htmlFor="hall-name" className="text-cyber-slate-200 font-semibold">
                      Hall Name
                    </Label>
                    <Input
                      id="hall-name"
                      value={currentHall.name}
                      onChange={(e) => setCurrentHall({ ...currentHall, name: e.target.value })}
                      placeholder="e.g., Hall C, Deluxe Hall"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="hall-capacity" className="text-cyber-slate-200 font-semibold">
                      Capacity (Total Seats)
                    </Label>
                    <Input
                      id="hall-capacity"
                      type="number"
                      value={currentHall.capacity}
                      onChange={(e) => setCurrentHall({ ...currentHall, capacity: Number(e.target.value) })}
                      placeholder="e.g., 50"
                      className="bg-glass-dark border-white/20 text-white placeholder:text-cyber-slate-400 backdrop-blur-sm rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="hall-type" className="text-cyber-slate-200 font-semibold">
                      Hall Type
                    </Label>
                    <Select
                      value={currentHall.type}
                      onValueChange={(value: "vip" | "standard") => setCurrentHall({ ...currentHall, type: value })}
                    >
                      <SelectTrigger className="bg-glass-dark border-white/20 text-white backdrop-blur-sm rounded-2xl">
                        <SelectValue placeholder="Select hall type" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-dark-strong border-white/20 backdrop-blur-xl rounded-2xl">
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateEditHallOpen(false)}
                    className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={currentHall._id ? handleUpdateHall : handleCreateHall}
                    className="bg-gradient-to-r from-cyber-purple-500 via-cyber-purple-600 to-cyber-purple-700 hover:from-cyber-purple-600 hover:via-cyber-purple-700 hover:to-cyber-purple-800 text-white rounded-2xl"
                  >
                    {currentHall._id ? "Save Changes" : "Create Hall"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-glass-white">
                    <TableHead className="text-cyber-slate-200 font-semibold">Hall ID</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Name</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Capacity</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Type</TableHead>
                    <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {halls.length > 0 ? (
                    halls.map((hall) => (
                      <TableRow key={hall._id} className="border-white/20 hover:bg-glass-white transition-colors">
                        <TableCell className="font-medium text-white font-mono">{hall._id}</TableCell>
                        <TableCell className="text-cyber-slate-200">{hall.name}</TableCell>
                        <TableCell className="text-cyber-slate-200">{hall.capacity} seats</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              hall.type === "vip"
                                ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50 rounded-2xl"
                                : "bg-cyber-blue-500/30 text-cyber-blue-300 border-cyber-blue-500/50 rounded-2xl"
                            }
                          >
                            {hall.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditHallClick(hall)}
                              className="border-white/30 text-cyber-slate-300 hover:bg-glass-white bg-transparent backdrop-blur-sm rounded-2xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteHall(hall._id, hall.name)}
                              className="border-brand-red-500/50 text-brand-red-400 hover:bg-brand-red-500/20 bg-transparent backdrop-blur-sm rounded-2xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-cyber-slate-400 py-8">
                        No halls found. Create one to get started!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
