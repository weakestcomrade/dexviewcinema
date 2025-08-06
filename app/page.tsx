import dynamic from 'next/dynamic';
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, Film, Trophy, Sparkles, ArrowRight } from 'lucide-react'
import { connectToDatabase } from "@/lib/mongodb" // Import the MongoDB connection utility
import { Hall } from "@/types/hall" // Import the Hall interface

// Define the Event interface to match your MongoDB schema
interface Event {
  _id: string
  title: string
  event_type: "movie" | "match"
  category: string
  event_date: string // Assuming date is stored as a string
  event_time: string // Assuming time is stored as a string
  hall_id: string // Assuming hall_id is a string
  hall_name?: string // Add hall_name to the Event interface
  image_url?: string // Optional image URL
  description?: string
  duration?: string
  // Correctly define pricing as an object with nested price properties
  pricing: {
    ticket_price?: number; // General ticket price, if applicable
    vipSingle?: { price: number };
    vipCouple?: { price: number };
    vipFamily?: { price: number };
    vipSofaSeats?: { price: number };
    vipRegularSeats?: { price: number };
    standardSingle?: { price: number };
    standardCouple?: { price: number };
    standardFamily?: { price: number };
    standardMatchSeats?: { price: number };
    [key: string]: any; // Allow for other properties in pricing object
  }
  status: "active" | "draft" | "cancelled"
  total_seats?: number // Add total_seats if it's part of your schema
}

const HomePage = dynamic(() => import('./components/home-page'), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>, // Optional loading indicator
});

export default function Home() {
  return <HomePage />;
}
