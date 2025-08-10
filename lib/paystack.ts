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

// Client-side Paystack functions
export const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).PaystackPop) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Paystack script"))
    document.head.appendChild(script)
  })
}

export const initializePaystackPopup = (config: {
  key: string
  email: string
  amount: number
  ref: string
  metadata?: any
  callback: (response: any) => void
  onClose: () => void
}) => {
  if (typeof window !== "undefined" && (window as any).PaystackPop) {
    const handler = (window as any).PaystackPop.setup({
      key: config.key,
      email: config.email,
      amount: config.amount * 100, // Convert to kobo
      ref: config.ref,
      metadata: config.metadata,
      callback: (response: any) => {
        config.callback(response)
      },
      onClose: () => {
        config.onClose()
      },
    })
    handler.openIframe()
  } else {
    throw new Error("Paystack script not loaded")
  }
}
