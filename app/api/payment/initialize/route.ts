import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

type InitBody = {
  email: string
  amount: number // exact ticket price total in naira (no fees)
  eventId: string
  seats: string[]
  seatType?: string
  customerName: string
  customerPhone?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InitBody>
    const { email, amount, eventId, seats, seatType, customerName, customerPhone } = body || {}

    if (
      !email ||
      typeof amount !== "number" ||
      amount <= 0 ||
      !eventId ||
      !Array.isArray(seats) ||
      seats.length === 0 ||
      !customerName
    ) {
      return NextResponse.json({ status: false, message: "Missing or invalid required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Fetch event for metadata completeness
    let event: any = null
    if (ObjectId.isValid(eventId)) {
      event = await db.collection("events").findOne({ _id: new ObjectId(eventId) })
    }
    if (!event) {
      // Don't block initialization if event isn't found; still proceed with provided info
      console.warn("initialize: event not found, proceeding with provided eventId only:", eventId)
    }

    const paystack = new PaystackService()
    const reference = paystack.generateReference()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const callbackUrl = `${baseUrl}/payment/callback` // Paystack will append reference

    // Build metadata (processingFee removed; always zero)
    const metadata = {
      reference,
      eventId,
      eventTitle: event?.title ?? undefined,
      eventType: event?.event_type ?? event?.type ?? "movie",
      bookingDate: event?.date ?? undefined,
      bookingTime: event?.time ?? undefined,
      seats,
      seatType: seatType ?? undefined,
      customerName,
      customerPhone: customerPhone ?? undefined,
      amount, // exact ticket total in naira
      processingFee: 0,
      totalAmount: amount,
    }

    // Persist a payment record with fields at TOP LEVEL and inside metadata for compatibility
    await db.collection("payments").insertOne({
      reference,
      email,
      amount, // exact ticket total in naira
      status: "pending",
      // top-level fields for verify compatibility
      eventId,
      eventTitle: metadata.eventTitle,
      eventType: metadata.eventType,
      seats,
      seatType: seatType ?? null,
      customerName,
      customerPhone: customerPhone ?? null,
      baseAmount: amount,
      processingFee: 0,
      totalAmount: amount,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Initialize on Paystack
    const init = await paystack.initializePayment({
      email,
      amount, // PaystackService should convert to kobo internally
      reference,
      callback_url: callbackUrl,
      metadata,
    })

    if (!init?.status) {
      return NextResponse.json(
        { status: false, message: init?.message || "Payment initialization failed" },
        { status: 400 },
      )
    }

    return NextResponse.json({
      status: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: init.data.authorization_url,
        access_code: init.data.access_code,
        reference,
      },
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      { status: false, message: "Payment initialization failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}
