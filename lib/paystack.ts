// Paystack integration utilities
export interface PaystackResponse {
  status: boolean
  message: string
  data?: any
}

export interface PaymentData {
  email: string
  amount: number // Amount in kobo (multiply by 100)
  currency?: string
  reference?: string
  callback_url?: string
  metadata?: {
    custom_fields?: Array<{
      display_name: string
      variable_name: string
      value: string
    }>
  }
}

export interface PaymentVerificationResponse {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: "success" | "failed" | "abandoned"
    reference: string
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: any
    log: any
    fees: number
    fees_split: any
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
      account_name: string | null
    }
    customer: {
      id: number
      first_name: string | null
      last_name: string | null
      email: string
      customer_code: string
      phone: string | null
      metadata: any
      risk_action: string
      international_format_phone: string | null
    }
    plan: any
    split: any
    order_id: any
    paidAt: string
    createdAt: string
    requested_amount: number
    pos_transaction_data: any
    source: any
    fees_breakdown: any
  }
}

export class PaystackService {
  private secretKey: string
  private publicKey: string
  private baseUrl = "https://api.paystack.co"

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || ""
    this.publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ""
  }

  // Generate a unique payment reference
  generateReference(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000000)
    return `dex_${timestamp}_${random}`
  }

  // Initialize payment transaction
  async initializePayment(paymentData: PaymentData): Promise<PaystackResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...paymentData,
          amount: paymentData.amount * 100, // Convert to kobo
          currency: paymentData.currency || "NGN",
          reference: paymentData.reference || this.generateReference(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to initialize payment")
      }

      return data
    } catch (error) {
      console.error("Paystack initialization error:", error)
      throw new Error(`Payment initialization failed: ${(error as Error).message}`)
    }
  }

  // Verify payment transaction
  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to verify payment")
      }

      return data
    } catch (error) {
      console.error("Paystack verification error:", error)
      throw new Error(`Payment verification failed: ${(error as Error).message}`)
    }
  }

  // Get transaction details
  async getTransaction(transactionId: string): Promise<PaystackResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/${transactionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to get transaction")
      }

      return data
    } catch (error) {
      console.error("Paystack transaction fetch error:", error)
      throw new Error(`Failed to fetch transaction: ${(error as Error).message}`)
    }
  }

  // List transactions with filters
  async listTransactions(params?: {
    perPage?: number
    page?: number
    customer?: string
    status?: "failed" | "success" | "abandoned"
    from?: string
    to?: string
    amount?: number
  }): Promise<PaystackResponse> {
    try {
      const queryParams = new URLSearchParams()

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(`${this.baseUrl}/transaction?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to list transactions")
      }

      return data
    } catch (error) {
      console.error("Paystack list transactions error:", error)
      throw new Error(`Failed to list transactions: ${(error as Error).message}`)
    }
  }
}

// Client-side Paystack utilities
export const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).PaystackPop) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Paystack script"))
    document.head.appendChild(script)
  })
}

export interface PaystackPopupConfig {
  key: string
  email: string
  amount: number
  currency?: string
  ref?: string
  metadata?: any
  callback: (response: any) => void
  onClose: () => void
}

export const initializePaystackPopup = (config: PaystackPopupConfig) => {
  if (typeof window !== "undefined" && (window as any).PaystackPop) {
    const handler = (window as any).PaystackPop.setup({
      ...config,
      amount: config.amount * 100, // Convert to kobo
      currency: config.currency || "NGN",
    })
    handler.openIframe()
  } else {
    throw new Error("Paystack script not loaded")
  }
}
