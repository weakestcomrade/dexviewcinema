import type { Db } from "mongodb"

/**
 * Atomically increment and return the next sequence number for the given name.
 * Uses a "counters" collection with documents shaped as: { _id: name, seq: number }
 */
export async function getNextSequence(db: Db, name: string): Promise<number> {
  console.log(`[v0] Getting next sequence for: ${name}`)

  try {
    const res = await db
      .collection("counters")
      .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })

    const seq = (res.value as any)?.seq
    console.log(`[v0] Sequence result for ${name}:`, { seq, hasValue: !!res.value })

    if (typeof seq === "number" && seq > 0) {
      console.log(`[v0] Generated sequence ${seq} for ${name}`)
      return seq
    } else {
      console.warn(`[v0] Invalid sequence for ${name}, falling back to 1`)
      return 1
    }
  } catch (error) {
    console.error(`[v0] Error generating sequence for ${name}:`, error)
    return 1
  }
}

/**
 * Format a booking code with combination of strings and integers, e.g., BK12345.
 * Reverted from branded DEX000001 format to simpler string+integer combination.
 */
export function formatBookingCode(seq: number, prefix = "BK", pad = 0): string {
  const formatted = pad > 0 ? `${prefix}${String(seq).padStart(pad, "0")}` : `${prefix}${seq}`
  console.log(`[v0] Formatted booking code: ${formatted} (from sequence: ${seq})`)
  return formatted
}
