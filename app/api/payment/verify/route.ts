import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getNextSequence, formatBookingCode } from "@/lib/sequences"

/**
 * Verify Paystack payment and create booking.
 * Now resilient to payments document shape:
 * - Reads top-level fields first, then falls back to payment.metadata.
 * - Does NOT fail if event is missing in DB; proceeds with metadata values.
 * - processingFee removed (always 0). Totals match Paystack charge exactly.
 * - Generates a human-friendly bookingCode (e.g., DEX000123).
 */
export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const { reference } = await request.json()
    if (!reference) {
      return NextResponse.json({ status: false, message: "Payment reference is required" }, { status: 400 })
    }

    // 1) Verify with Paystack
    const pstack = await paystack.verifyPayment(reference)
    if (!pstack?.status || pstack.data?.status !== "success") {
      return NextResponse.json({ status: false, message: "Payment verification failed with Paystack" }, { status: 400 })
    }
    const paidAmountInNaira = (pstack.data.amount || 0) / 100

    // 2) Load payment record
    const payment = await db.collection("payments").findOne({ reference })
    if (!payment) {
      return NextResponse.json({ status: false, message: "Payment record not found" }, { status: 404 })
    }

    // If already processed, return existing booking
    if (payment.status === "confirmed") {
      const existing = await db.collection("bookings").findOne({ paymentReference: reference })
      if (existing) {
        return NextResponse.json({
          status: true,
          message: "Payment already processed",
          data: { bookingId: String(existing._id) },
        })
      }
    }

    // 3) Extract details with metadata fallback
    const meta = payment.metadata || {}
    const eventIdStr: string | undefined = payment.eventId || meta.eventId
    const eventTitle: string | undefined = payment.eventTitle || meta.eventTitle
    const eventType: string | undefined = payment.eventType || meta.eventType || "movie"
    const seats: string[] = payment.seats || meta.seats || []
    const seatType: string | undefined = payment.seatType || meta.seatType || "Standard"
    const customerName: string = payment.customerName || meta.customerName || "Valued Customer"
    const customerEmail: string = payment.email || meta.email || ""
    const customerPhone: string = payment.customerPhone || meta.customerPhone || ""
    const baseAmount: number =
      payment.baseAmount ?? meta.baseAmount ?? meta.amount ?? payment.amount ?? paidAmountInNaira
    const totalAmount: number = payment.totalAmount ?? meta.totalAmount ?? payment.amount ?? paidAmountInNaira
    const bookingDate: string = meta.bookingDate || new Date().toISOString().split("T")[0]
    const bookingTime: string = meta.bookingTime || new Date().toTimeString().split(" ")[0].substring(0, 5)

    // 4) Amount sanity check (allow tiny diff)
    if (Math.abs(paidAmountInNaira - totalAmount) > 0.01) {
      console.warn("verify: amount mismatch; continuing with Paystack amount as source of truth", {
        paidAmountInNaira,
        totalAmount,
      })
    }

    // 5) Fetch event if possible, but don't fail if not found
    let event: any = null
    if (eventIdStr && ObjectId.isValid(eventIdStr)) {
      event = await db.collection("events").findOne({ _id: new ObjectId(eventIdStr) })
    }

    // Generate booking code
    const seq = await getNextSequence(db, "booking")
    const bookingCode = formatBookingCode(seq, "DEX", 6)

    // 6) Compose booking payload (fall back to metadata if event missing)
    const bookingData: any = {
      bookingCode,
      customerName,
      customerEmail,
      customerPhone,
      eventId: event?._id || (ObjectId.isValid(eventIdStr || "") ? new ObjectId(eventIdStr!) : eventIdStr || null),
      eventTitle: event?.title || eventTitle || "Event",
      eventType,
      eventDate: event?.date || bookingDate,
      eventTime: event?.time || bookingTime,
      seats,
      seatType,
      amount: baseAmount, // per your data shape; total is below
      processingFee: 0,
      totalAmount: paidAmountInNaira, // source of truth: Paystack
      status: "confirmed",
      bookingDate,
      bookingTime,
      paymentMethod: "paystack",
      paymentReference: reference,
      paystackData: pstack.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 7) Create booking
    const bookingResult = await db.collection("bookings").insertOne(bookingData)

    // 8) Update payment & event
    await db
      .collection("payments")
      .updateOne(
        { reference },
        { $set: { status: "confirmed", bookingId: bookingResult.insertedId, updatedAt: new Date() } },
      )

    if (event && Array.isArray(seats) && seats.length) {
      await db.collection("events").updateOne({ _id: event._id }, { $addToSet: { bookedSeats: { $each: seats } } })
    }

    // 9) Try to send confirmation email (non-blocking on failure)
    try {
      const hall =
        event && event.hall_id && ObjectId.isValid(String(event.hall_id))
          ? await db.collection("halls").findOne({ _id: new ObjectId(String(event.hall_id)) })
          : null
      const createdBooking = {
        ...bookingData,
        _id: String(bookingResult.insertedId),
        eventId: String(bookingData.eventId ?? eventIdStr ?? ""),
      }
      await sendBookingConfirmationEmail(createdBooking, event, hall)
    } catch (e) {
      console.error("verify: email send error (non-blocking):", e)
    }

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking confirmed",
      data: {
        bookingId: String(bookingResult.insertedId),
        reference,
        amount: paidAmountInNaira,
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { status: false, message: "Payment verification failed", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// ---------------- Email helpers ----------------

function generateReceiptHtml(booking: any, event: any, hall: any) {
  const seatsFormatted = (booking.seats || [])
    .map((seatId: string) =>
      seatId && typeof seatId === "string" && seatId.includes("-") ? seatId.split("-")[1] : seatId,
    )
    .join(", ")

  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : booking.bookingDate
  const eventTime = event?.time || booking.bookingTime
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dexviewcinema.vercel.app"
  const receiptUrl = `${baseUrl}/receipt/${booking._id}`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation - Dex View Cinema</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <div style="background-color: #e53e3e; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Dex View Cinema</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Booking Confirmation</p>
        </div>
        <div style="padding: 30px 20px;">
          <h2 style="color: #e53e3e; font-size: 22px; margin: 0 0 16px 0; font-weight: bold;">🎉 Booking Confirmed!</h2>
          <p style="font-size: 15px; color: #333; margin-bottom: 14px;">Dear <strong>${booking.customerName}</strong>,</p>
          <table style="width: 100%; border-collapse: collapse; margin: 10px 0; background-color: #f9f9f9; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Booking Code:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; background-color: #fff;">${booking.bookingCode || booking._id}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Event:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${booking.eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Type:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; background-color: #fff;">${booking.eventType === "match" ? "Sports Match" : "Movie"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Date & Time:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${eventDate} at ${eventTime}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Venue:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; background-color: #fff;">${hall?.name || "Main Hall"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Seats:</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <span style="background-color: #e53e3e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${seatsFormatted}</span>
                <br><small style="color: #666; margin-top: 5px; display: inline-block;">${booking.seatType}</small>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; color: #e53e3e; background-color: #fff; font-size: 16px;">Total Amount:</td>
              <td style="padding: 12px; background-color: #fff; font-size: 16px; font-weight: bold; color: #e53e3e;">₦${Number(booking.totalAmount || 0).toLocaleString()}</td>
            </tr>
          </table>
          <div style="margin-top: 14px;">
            <a href="${receiptUrl}" target="_blank" style="display:inline-block; background:#e53e3e; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px; font-weight:600;">View Receipt</a>
          </div>
          <div style="background-color:#fff3cd;border: 1px solid #ffeaa7; border-radius:8px; padding:16px; margin-top:18px;">
            <strong style="color:#856404;">📋 Important Notes:</strong>
            <ul style="margin: 8px 0 0 18px; color:#856404;">
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Your seats are reserved and guaranteed</li>
              <li>Keep this email as your booking receipt</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #f8f8f8; padding: 18px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">📧 Support: support@dexviewcinema.com | 📞 Phone: 08139614950</p>
          <p style="margin: 0; font-size: 12px; color: #999;">Developed by <strong>SydaTech</strong> - www.sydatech.com.ng</p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function sendBookingConfirmationEmail(booking: any, event: any, hall: any) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com"
  if (!BREVO_API_KEY) return { success: false, error: "API key not configured" }
  if (!booking.customerEmail) return { success: false, error: "Customer email not provided" }

  try {
    const htmlContent = generateReceiptHtml(booking, event, hall)
    const textContent = `Booking Confirmed - ${booking.eventTitle}
Booking Code: ${booking.bookingCode || booking._id}
Date & Time: ${event?.date || booking.bookingDate} at ${event?.time || booking.bookingTime}
Seats: ${(booking.seats || []).join(", ")}
Total: ₦${Number(booking.totalAmount || 0).toLocaleString()}`

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: "Dex View Cinema" },
        to: [{ email: booking.customerEmail, name: booking.customerName }],
        subject: `🎬 Booking Confirmed - ${booking.eventTitle} | Dex View Cinema`,
        htmlContent,
        textContent,
        replyTo: { email: "support@dexviewcinema.com", name: "Dex View Cinema Support" },
      }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data }
    return { success: true, messageId: data.messageId }
  } catch (err) {
    console.error("Error sending booking confirmation email:", err)
    return { success: false, error: err }
  }
}
