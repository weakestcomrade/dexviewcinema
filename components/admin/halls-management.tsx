"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Edit, Plus, Trash2 } from "lucide-react"

interface Hall {
  _id: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

interface NewHallData {
  _id?: string
  name: string
  capacity: number
  type: "vip" | "standard"
}

interface HallsManagementProps {
  halls: Hall[]
  isCreateEditHallOpen: boolean
  setIsCreateEditHallOpen: (open: boolean) => void
  currentHall: NewHallData
  setCurrentHall: (hall: NewHallData) => void
  onCreateHall: () => void
  onEditHall: (hall: Hall) => void
  onDeleteHall: (hallId: string) => void
  onSaveHall: () => void
  initialNewHallState: NewHallData
}

export function HallsManagement({
  halls,
  isCreateEditHallOpen,
  setIsCreateEditHallOpen,
  currentHall,
  setCurrentHall,
  onCreateHall,
  onEditHall,
  onDeleteHall,
  onSaveHall,
  initialNewHallState,
}: HallsManagementProps) {
  return (
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
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateEditHallOpen(false)}
                className="border-white/20 text-cyber-slate-300 hover:bg-glass-white rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={onSaveHall}
                className="bg-gradient-to-r from-cyber-purple-500 to-cyber-purple-600 hover:from-cyber-purple-600 hover:to-cyber-purple-700 text-white rounded-2xl"
              >
                {currentHall._id ? "Update Hall" : "Create Hall"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                <TableHead className="text-cyber-slate-200 font-semibold">Hall Name</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Type</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Capacity</TableHead>
                <TableHead className="text-cyber-slate-200 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {halls.map((hall) => (
                <TableRow key={hall._id} className="border-white/20 hover:bg-glass-white transition-colors">
                  <TableCell className="font-medium text-white">{hall.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={hall.type === "vip" ? "default" : "secondary"}
                      className={
                        hall.type === "vip"
                          ? "bg-brand-red-500/30 text-brand-red-300 border-brand-red-500/50 rounded-2xl"
                          : "bg-cyber-slate-500/30 text-cyber-slate-300 border-cyber-slate-500/50 rounded-2xl"
                      }
                    >
                      <Building className="w-3 h-3 mr-1" />
                      {hall.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-cyber-slate-200">{hall.capacity} seats</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditHall(hall)}
                        className="text-cyber-slate-300 hover:text-white hover:bg-glass-white rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteHall(hall._id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
