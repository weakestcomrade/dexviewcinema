import type { Db } from "mongodb"

/**
 * Atomically increment and return the next sequence number for the given name.
 * Uses a "counters" collection with documents shaped as: { _id: name, seq: number }
 */
export async function getNextSequence(db: Db, name: string): Promise<number> {
  const res = await db
    .collection("counters")
    .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
  const seq = (res.value as any)?.seq
  return typeof seq === "number" ? seq : 1
}

/**
 * Format a human-friendly booking code, e.g., DEX000123.
 * Adjust prefix or padding length to your preference.
 */
export function formatBookingCode(seq: number, prefix = "DEX", pad = 6): string {
  return `${prefix}${String(seq).padStart(pad, "0")}`
}
