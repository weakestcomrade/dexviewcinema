// lib/monnify.ts
import { MonnifyAuthResponse } from "@/types/monnify"

const MONNIFY_BASE_URL = "https://sandbox.monnify.com" // Use sandbox for testing
const MONNIFY_API_KEY = process.env.MONNIFY_PUBLIC_KEY
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY

if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
  console.error("Monnify API keys are not set in environment variables.")
  // In a real application, you might want to throw an error or handle this more gracefully.
}

// Function to get Monnify Bearer Token
export async function getMonnifyAuthToken(): Promise<string> {
  if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
    throw new Error("Monnify API keys are not configured.")
  }

  const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64")

  try {
    const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Monnify Auth Error:", errorData)
      throw new Error(`Failed to get Monnify auth token: ${errorData.responseMessage || response.statusText}`)
    }

    const data: MonnifyAuthResponse = await response.json()
    if (!data.requestSuccessful) {
      throw new Error(`Monnify auth request failed: ${data.responseMessage}`)
    }
    return data.responseBody.accessToken
  } catch (error) {
    console.error("Error fetching Monnify auth token:", error)
    throw error
  }
}

// Function to build Monnify Basic Auth Header
export function getMonnifyBasicAuthHeader(): string {
  if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
    throw new Error("Monnify API keys are not configured.")
  }
  const credentials = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64")
  return `Basic ${credentials}`
}

export { MONNIFY_BASE_URL }
