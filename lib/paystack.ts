export class PaystackService {
  private secretKey: string
  private publicKey: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!
    this.publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!

    if (!this.secretKey) {
      console.error("[v0] ERROR: PAYSTACK_SECRET_KEY environment variable is not set")
      throw new Error("PAYSTACK_SECRET_KEY is required")
    }
    if (!this.publicKey) {
      console.error("[v0] ERROR: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variable is not set")
      throw new Error("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is required")
    }
  }

  generateReference(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `dex_${timestamp}_${random}`
  }

  async initializePayment(data: {
    email: string
    amount: number
    reference: string
    callback_url: string
    metadata?: any
  }) {
    try {
      console.log("[v0] Initializing Paystack payment:", {
        email: data.email,
        amount: data.amount,
        reference: data.reference,
        callback_url: data.callback_url,
      })

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          amount: data.amount * 100, // Convert to kobo
        }),
      })

      const result = await response.json()
      console.log("[v0] Paystack initialization response:", result)

      if (!response.ok) {
        console.error("[v0] Paystack initialization failed:", result)
        throw new Error(result.message || "Payment initialization failed")
      }

      return result
    } catch (error) {
      console.error("[v0] Paystack initialization error:", error)
      throw error
    }
  }

  async verifyPayment(reference: string) {
    try {
      console.log("[v0] Verifying Paystack payment for reference:", reference)

      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      console.log("[v0] Paystack verification response:", result)

      if (!response.ok) {
        console.error("[v0] Paystack verification failed:", result)
        throw new Error(result.message || "Payment verification failed")
      }

      return result
    } catch (error) {
      console.error("[v0] Paystack verification error:", error)
      throw error
    }
  }
}

// Client-side redirect function - no need for external scripts
export const redirectToPaystack = (authorizationUrl: string) => {
  if (typeof window !== "undefined") {
    window.location.href = authorizationUrl
  }
}
