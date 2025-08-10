import type { Db } from "mongodb"

/**
 * Atomically increments and returns a sequence for a given name.
 * Uses a "counters" collection: { _id: name, seq: number }
 */
export async function getNextSequence(db: Db, name: string): Promise<number> {
  const res = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      returnDocument: "after",
    },
  )
  // If value didn't exist and was upserted, seq may be undefined; set to 1
  const seq = (res.value as any)?.seq
  if (typeof seq === "number") return seq
  // Initialize to 1 on first run
  const init = await db
    .collection("counters")
    .findOneAndUpdate({ _id: name }, { $setOnInsert: { seq: 1 } }, { upsert: true, returnDocument: "after" })
  return (init.value as any)?.seq ?? 1
}

/**
 * Formats a booking code like "DEX000123".
 * You can change the prefix or padding length as desired.
 */
export function formatBookingCode(seq: number, prefix = "DEX", pad = 6): string {
  return `${prefix}${String(seq).padStart(pad, "0")}`
}
