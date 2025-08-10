import type { PaystackInitResponse, PaystackVerifyResponse } from "@/types/paystack"

export class PaystackService {
  private secretKey: string
  private publicKey: string
  private baseUrl: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!
    this.publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

    if (!this.secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not defined")
    }
    if (!this.publicKey) {
      throw new Error("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not defined")
    }
    if (!this.baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL is not defined")
    }
  }

  generateReference(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `dex_${timestamp}_${random}`
  }

  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    callbackUrl?: string,
    metadata?: any,
  ): Promise<PaystackInitResponse> {
    const url = "https://api.paystack.co/transaction/initialize"
    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    }
    const body = JSON.stringify({
      email,
      amount: amount * 100, // Paystack expects amount in kobo
      reference,
      callback_url: callbackUrl || `${this.baseUrl}/api/payment/callback`,
      metadata,
    })

    try {
      console.log("PaystackService: Initializing payment with data:", {
        email,
        amount,
        reference,
        callbackUrl,
        metadata,
      })
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("PaystackService: Paystack initialization error:", errorData)
        throw new Error(`Paystack initialization failed: ${errorData.message || response.statusText}`)
      }

      const data: PaystackInitResponse = await response.json()
      console.log("PaystackService: Payment initialization successful:", data)
      return data
    } catch (error) {
      console.error("PaystackService: Error initializing Paystack payment:", error)
      throw error
    }
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    const url = `https://api.paystack.co/transaction/verify/${reference}`
    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
    }

    try {
      console.log(`PaystackService: Verifying payment for reference: ${reference}`)
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("PaystackService: Paystack verification error:", errorData)
        throw new Error(`Paystack verification failed: ${errorData.message || response.statusText}`)
      }

      const data: PaystackVerifyResponse = await response.json()
      console.log("PaystackService: Payment verification successful:", data)
      return data
    } catch (error) {
      console.error("PaystackService: Error verifying Paystack payment:", error)
      throw error
    }
  }
}

// Client-side redirect function - now correctly exported
export const redirectToPaystack = (authorizationUrl: string) => {
  if (typeof window !== "undefined") {
    console.log("Redirecting to Paystack:", authorizationUrl)
    window.location.href = authorizationUrl
  }
}
