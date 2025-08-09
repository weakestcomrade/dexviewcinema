export interface Hall {
  _id: string // e.g., "hallA", "hallB", "vip_hall" - assuming these are string IDs in DB
  name: string // e.g., "Hall A", "Hall B", "VIP Hall"
  type: "vip" | "standard" // or "standard"
  total_seats: number
  capacity: number // Assuming capacity is related to total_seats, keeping it for now
  // Add any other properties that your hall documents might have
}
