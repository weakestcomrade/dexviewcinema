export class PaystackService {
  private secretKey: string
  private publicKey: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!
    this.publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!
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

      if (!response.ok) {
        throw new Error(result.message || "Payment initialization failed")
      }

      return result
    } catch (error) {
      console.error("Paystack initialization error:", error)
      throw error
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Payment verification failed")
      }

      return result
    } catch (error) {
      console.error("Paystack verification error:", error)
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
