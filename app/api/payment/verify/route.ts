import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

/**
 * Verify Paystack payment and create booking.
 * Now resilient to payments document shape:
 * - Reads top-level fields first, then falls back to payment.metadata.
 * - Does NOT fail if event is missing in DB; proceeds with metadata values.
 * - processingFee removed (always 0). Totals match Paystack charge exactly.
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
    const seatType: string | undefined = payment.seatType || meta.seatType
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

    // 6) Compose booking payload (fall back to metadata if event missing)
    const bookingData: any = {
      customerName,
      customerEmail,
      customerPhone,
      eventId: event?._id || (ObjectId.isValid(eventIdStr || "") ? new ObjectId(eventIdStr!) : eventIdStr || null),
      eventTitle: event?.title || eventTitle || "Event",
      eventType,
      eventDate: event?.date || bookingDate,
      eventTime: event?.time || bookingTime,
      seats,
      seatType: seatType || "Standard",
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
  const seatsFormatted = Array.isArray(booking.seats)
    ? booking.seats
        .map((seatId: string) => (typeof seatId === "string" && seatId.includes("-") ? seatId.split("-")[1] : seatId))
        .join(", ")
    : ""

  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : booking.bookingDate
  const eventTime = event?.time || booking.bookingTime
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dexviewcinema.vercel.app"
  const receiptUrl = `${baseUrl}/receipt/${booking._id}`

  // Preheader text helps in inbox preview
  const preheader = `Your booking for ${booking.eventTitle} is confirmed. Seats: ${seatsFormatted}.`

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Booking Confirmation - Dex View Cinema</title>
    <style>
      /* Some clients respect <style>; critical styles are also inlined */
      @media (max-width:600px){ .container{width:100% !important} .px{padding-left:16px !important; padding-right:16px !important} }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f4;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
             Header 
            <tr>
              <td style="background:#ef4444;padding:28px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:#ffffff;">Dex View Cinema</div>
                <div style="margin-top:6px;font-size:13px;color:#ffe4e6;">Booking Confirmation</div>
              </td>
            </tr>

             Body 
            <tr>
              <td class="px" style="padding:28px 28px 0 28px;">
                <div style="font-size:18px;font-weight:700;color:#111827;">🎉 Booking Confirmed!</div>
                <p style="margin:10px 0 0 0;font-size:14px;line-height:1.6;color:#374151;">
                  Dear <strong>${booking.customerName}</strong>,
                </p>
                <p style="margin:6px 0 18px 0;font-size:14px;line-height:1.6;color:#374151;">
                  Thank you for choosing Dex View Cinema. Your booking for <strong>${booking.eventTitle}</strong> has been confirmed.
                  Here are your booking details:
                </p>
              </td>
            </tr>

             Details table 
            <tr>
              <td class="px" style="padding:0 28px 0 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px;">
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;font-weight:600;color:#ef4444;">Booking ID</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;color:#111827;">${booking._id}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#ef4444;">Event</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${booking.eventTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;font-weight:600;color:#ef4444;">Type</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;color:#111827;">${booking.eventType === "match" ? "Sports Match" : "Movie"}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#ef4444;">Date & Time</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${eventDate} at ${eventTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;font-weight:600;color:#ef4444;">Venue</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#ffffff;color:#111827;">${hall?.name || "Main Hall"}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#ef4444;">Seats</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">
                      <span style="display:inline-block;background:#ef4444;color:#fff;padding:4px 8px;border-radius:4px;font-weight:700;">${seatsFormatted}</span>
                      <div style="font-size:12px;color:#6b7280;margin-top:6px;">${booking.seatType}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;background:#ffffff;font-weight:700;color:#ef4444;">Total Amount</td>
                    <td style="padding:12px 14px;background:#ffffff;font-size:16px;font-weight:700;color:#ef4444;">₦${Number(booking.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                </table>
              </td>
            </tr>

             CTA 
            <tr>
              <td class="px" style="padding:18px 28px 0 28px;">
                <a href="${receiptUrl}" target="_blank" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">View Receipt</a>
              </td>
            </tr>

             Notes 
            <tr>
              <td class="px" style="padding:22px 28px 0 28px;">
                <div style="background:#fff7ed;border:1px solid #fde68a;border-radius:8px;padding:16px;">
                  <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px;">Important Notes</div>
                  <ul style="margin:0;padding-left:18px;color:#92400e;font-size:13px;line-height:1.6;">
                    <li>Please arrive at least 15 minutes before the event starts</li>
                    <li>Bring a valid ID for verification</li>
                    <li>Your seats are reserved and guaranteed</li>
                    <li>Keep this email as your booking receipt</li>
                  </ul>
                </div>
              </td>
            </tr>

             Footer 
            <tr>
              <td style="padding:24px;text-align:center;color:#6b7280;font-size:12px;">
                <div>Support: support@dexviewcinema.com • Phone: 08139614950</div>
                <div style="margin-top:6px;">Developed by <strong>SydaTech</strong> - www.sydatech.com.ng</div>
              </td>
            </tr>
          </table>

          <div style="color:#6b7280;font-size:12px;margin-top:12px;">
            You received this email because you made a booking at Dex View Cinema.
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
}

async function sendBookingConfirmationEmail(booking: any, event: any, hall: any) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com"

  if (!BREVO_API_KEY) {
    console.warn("Brevo API key not configured. Skipping email sending.")
    return { success: false, error: "API key not configured" }
  }

  if (!booking.customerEmail) {
    console.error("Customer email not provided for booking:", booking._id)
    return { success: false, error: "Customer email not provided" }
  }

  try {
    const htmlContent = generateReceiptHtml(booking, event, hall)
    const textContent = `Booking Confirmed - ${booking.eventTitle}
Booking ID: ${booking._id}
Date & Time: ${event?.date || booking.bookingDate} at ${event?.time || booking.bookingTime}
Seats: ${(booking.seats || []).join(", ")}
Total: ₦${Number(booking.totalAmount || 0).toLocaleString()}`

    const emailData = {
      sender: { email: BREVO_SENDER_EMAIL, name: "Dex View Cinema" },
      to: [{ email: booking.customerEmail, name: booking.customerName }],
      subject: `🎬 Booking Confirmed - ${booking.eventTitle} | Dex View Cinema`,
      htmlContent,
      textContent,
      replyTo: { email: "support@dexviewcinema.com", name: "Dex View Cinema Support" },
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
      body: JSON.stringify(emailData),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error("Brevo API error:", { status: res.status, statusText: res.statusText, data })
      return { success: false, error: data }
    }
    return { success: true, messageId: data.messageId }
  } catch (err) {
    console.error("Error sending booking confirmation email:", err)
    return { success: false, error: err }
  }
}
