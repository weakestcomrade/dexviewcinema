export interface Hall {
  _id: string // e.g., "hallA", "hallB", "vip_hall" - assuming these are string IDs in DB
  name: string // e.g., "Hall A", "Hall B", "VIP Hall"
  capacity: number
  type: "vip" | "standard"
}
