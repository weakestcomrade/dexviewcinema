// types/monnify.d.ts

export interface MonnifyAuthResponse {
  requestSuccessful: boolean
  responseMessage: string
  responseCode: string
  responseBody: {
    accessToken: string
    expiresIn: number
  }
}

export interface MonnifyInitiatePaymentRequest {
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  paymentReference: string
  transactionReference: string
  currencyCode: string
  contractCode: string
  redirectUrl: string
  paymentDescription: string
  metaData?: Record<string, any>
}

export interface MonnifyInitiatePaymentResponse {
  requestSuccessful: boolean
  responseMessage: string
  responseCode: string
  responseBody: {
    transactionReference: string
    paymentReference: string
    merchantName: string
    apiKey: string
    redirectUrl: string
    status: string
    amount: number
    currencyCode: string
    checkoutUrl: string
    invoiceUrl: string
    transactionHash: string
    paymentStatus: string
    paymentDescription: string
    customerName: string
    customerEmail: string
    customerPhone: string
    metaData: Record<string, any>
    createdOn: string
    incomeSplit: any[] // Adjust based on actual response
    product: {
      type: string
      reference: string
    }
  }
}

export interface MonnifyWebhookPayload {
  eventType: string
  eventData: {
    transactionReference: string
    paymentReference: string
    amountPaid: number
    totalPayable: number
    settlementAmount: number
    paidOn: string
    paymentStatus: string // e.g., "PAID", "FAILED", "CANCELLED"
    paymentDescription: string
    currency: string
    customer: {
      email: string
      name: string
    }
    product: {
      type: string
      reference: string
    }
    cardDetails?: {
      firstSix: string
      lastFour: string
      bin: string
      bankCode: string
      bankName: string
      cardType: string
      signature: string
      country: string
      expiryMonth: string
      expiryYear: string
    }
    accountDetails?: {
      accountNumber: string
      bankCode: string
      bankName: string
    }
    metaData?: Record<string, any>
  }
}

export interface MonnifyQueryTransactionResponse {
  requestSuccessful: boolean
  responseMessage: string
  responseCode: string
  responseBody: {
    transactionReference: string
    paymentReference: string
    amount: number
    currencyCode: string
    customerName: string
    customerEmail: string
    paymentStatus: string // e.g., "PAID", "PENDING", "FAILED"
    paymentDescription: string
    transactionHash: string
    paymentMethod: string
    createdOn: string
    amountPaid: number
    amountPayable: number
    settlementAmount: number
    merchantName: string
    merchantFee: number
    contractCode: string
    customerPhoneNumber: string
    metaData: Record<string, any>
    product: {
      type: string
      reference: string
    }
    cardDetails?: {
      firstSix: string
      lastFour: string
      bin: string
      bankCode: string
      bankName: string
      cardType: string
      signature: string
      country: string
      expiryMonth: string
      expiryYear: string
    }
    accountDetails?: {
      accountNumber: string
      bankCode: string
      bankName: string
    }
  }
}
