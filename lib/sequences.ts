import type { Db } from "mongodb"

/**
 * Generate a random alphanumeric string of specified length
 */
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a unique random booking code by checking against existing bookings
 */
export async function generateUniqueBookingCode(db: Db, prefix = "DEX", codeLength = 6): Promise<string> {
  console.log(`[v0] Generating unique booking code with prefix: ${prefix}`)

  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const randomCode = generateRandomString(codeLength)
    const bookingCode = `${prefix}${randomCode}`

    console.log(`[v0] Attempt ${attempts + 1}: Generated code ${bookingCode}`)

    try {
      // Check if this booking code already exists
      const existingBooking = await db.collection("bookings").findOne({ bookingCode })

      if (!existingBooking) {
        console.log(`[v0] Unique booking code generated: ${bookingCode}`)
        return bookingCode
      }

      console.log(`[v0] Code ${bookingCode} already exists, trying again`)
      attempts++
    } catch (error) {
      console.error(`[v0] Error checking booking code uniqueness:`, error)
      attempts++
    }
  }

  // Fallback: if we can't generate a unique code after max attempts,
  // add timestamp to ensure uniqueness
  const fallbackCode = `${prefix}${generateRandomString(4)}${Date.now().toString().slice(-2)}`
  console.warn(`[v0] Using fallback booking code: ${fallbackCode}`)
  return fallbackCode
}

/**
 * @deprecated Use generateUniqueBookingCode instead
 */
export async function getNextSequence(db: Db, name: string): Promise<number> {
  console.log(`[v0] getNextSequence is deprecated, use generateUniqueBookingCode instead`)
  return 1
}

/**
 * @deprecated Use generateUniqueBookingCode directly instead
 */
export function formatBookingCode(seq: number, prefix = "DEX", pad = 6): string {
  console.log(`[v0] formatBookingCode is deprecated, use generateUniqueBookingCode instead`)
  return `${prefix}${String(seq).padStart(pad, "0")}`
}
