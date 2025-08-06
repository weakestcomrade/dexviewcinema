import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getMonnifyBasicAuthHeader, MONNIFY_BASE_URL } from "@/lib/monnify"
import { MonnifyInitiatePaymentRequest, MonnifyInitiatePaymentResponse } from "@/types/monnify"

// Define the structure for a booking document (extended for Monnify)
interface BookingDocument {
  _id?: ObjectId
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: ObjectId // Reference to the event ID
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[] // Array of seat identifiers (e.g., ["A1", "A2"])
  seatType: string // e.g., "VIP Sofa", "Standard Single"
  amount: number // Base amount for seats
  processingFee: number
  totalAmount: number
  status: "pending" | "confirmed" | "cancelled" | "failed" // Added 'failed'
  bookingDate: string // Date of booking
  bookingTime: string // Time of booking
  paymentMethod: string
  transactionReference: string // Monnify transaction reference
  paymentReference: string // Monnify payment reference
  createdAt: Date
  updatedAt: Date
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const {
      customerName,
      customerEmail,
      customerPhone,
      eventId,
      eventTitle,
      eventType,
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
    } = await request.json()

    // Basic validation for required fields
    const missingFields = []
    if (!customerName) missingFields.push("customerName")
    if (!customerEmail) missingFields.push("customerEmail")
    if (!customerPhone) missingFields.push("customerPhone")
    if (!eventId) missingFields.push("eventId")
    if (!eventTitle) missingFields.push("eventTitle")
    if (!eventType) missingFields.push("eventType")
    if (!seats || seats.length === 0) missingFields.push("seats")
    if (!seatType) missingFields.push("seatType")
    if (typeof amount !== "number" || amount < 0) missingFields.push("amount")
    if (typeof processingFee !== "number" || processingFee < 0) missingFields.push("processingFee")
    if (typeof totalAmount !== "number" || totalAmount < 0) missingFields.push("totalAmount")

    if (missingFields.length > 0) {
      console.error("Missing required fields for Monnify initiation:", missingFields.join(", "))
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Generate unique references for Monnify
    const transactionReference = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Define redirect URL for Monnify after payment
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/bookings?status=monnify_callback&transactionReference=${transactionReference}`

    // Prepare Monnify initiation payload
    const monnifyPayload: MonnifyInitiatePaymentRequest = {
      amount: totalAmount,
      customerName,
      customerEmail,
      customerPhone,
      paymentReference,
      transactionReference,
      currencyCode: "NGN", // Assuming Nigerian Naira
      contractCode: process.env.MONNIFY_CONTRACT_CODE!, // Your Monnify Contract Code
      redirectUrl,
      paymentDescription: `Booking for ${eventTitle} - Seats: ${seats.join(", ")}`,
      metaData: {
        eventId: eventId,
        seats: seats,
        seatType: seatType,
        eventTitle: eventTitle,
        eventType: eventType,
      },
    }

    // Create a pending booking in the database
    const pendingBooking: BookingDocument = {
      customerName,
      customerEmail,
      customerPhone,
      eventId: new ObjectId(eventId),
      eventTitle,
      eventType,
      seats,
      seatType,
      amount,
      processingFee,
      totalAmount,
      status: "pending", // Set status to pending
      bookingDate: new Date().toISOString().split("T")[0], // Current date
      bookingTime: new Date().toTimeString().split(" ")[0], // Current time
      paymentMethod: "Monnify",
      transactionReference,
      paymentReference,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(pendingBooking)

    if (!result.acknowledged) {
      console.error("MongoDB insertOne not acknowledged for pending booking:", result)
      throw new Error("Failed to create pending booking: Acknowledgment failed.")
    }

    // Call Monnify API to initiate payment
    const monnifyRes = await fetch(`${MONNIFY_BASE_URL}/api/v1/merchant/transactions/initiate-charge`, {
      method: "POST",
      headers: {
        Authorization: getMonnifyBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(monnifyPayload),
    })

    if (!monnifyRes.ok) {
      const errorData = await monnifyRes.json()
      console.error("Monnify API initiation error:", errorData)
      // If Monnify initiation fails, mark the pending booking as failed
      await db.collection("bookings").updateOne(
        { _id: result.insertedId },
        { $set: { status: "failed", updatedAt: new Date(), monnifyError: errorData } }
      )
      throw new Error(errorData.responseMessage || `Failed to initiate payment with Monnify: ${monnifyRes.statusText}`)
    }

    const monnifyData: MonnifyInitiatePaymentResponse = await monnifyRes.json()

    if (!monnifyData.requestSuccessful) {
      console.error("Monnify initiation request not successful:", monnifyData)
      // If Monnify initiation fails, mark the pending booking as failed
      await db.collection("bookings").updateOne(
        { _id: result.insertedId },
        { $set: { status: "failed", updatedAt: new Date(), monnifyError: monnifyData } }
      )
      throw new Error(monnifyData.responseMessage || "Monnify initiation failed.")
    }

    return NextResponse.json(
      {
        checkoutUrl: monnifyData.responseBody.checkoutUrl,
        transactionReference: monnifyData.responseBody.transactionReference,
        message: "Payment initiated successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Failed to initiate Monnify payment:", error)
    return NextResponse.json({ message: "Failed to initiate payment", error: (error as Error).message }, { status: 500 })
  }
}
