import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import { getNextSequence, formatBookingCode } from "@/lib/sequences"

// Define the structure for a booking document
interface BookingDocument {
  _id?: ObjectId
  bookingCode?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventId: string // Reference to the event ID
  eventTitle: string
  eventType: "movie" | "match"
  seats: string[] // Array of seat identifiers (e.g., ["A1", "A2"])
  seatType: string // e.g., "VIP Sofa", "Standard Single"
  amount: number // Base amount for seats
  processingFee: number
  totalAmount: number
  status: "confirmed" | "pending" | "cancelled"
  bookingDate: string // Date of booking
  bookingTime: string // Time of booking
  paymentMethod: string
  paymentReference?: string
  createdAt: Date
  updatedAt: Date
}

// Helper function to generate HTML content for the email
function generateReceiptHtml(booking: any, event: any, hall: any) {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://dexviewcinema.vercel.app"
  const seatsFormatted = booking.seats
    .map((seatId: string) => (seatId.includes("-") ? seatId.split("-")[1] : seatId))
    .join(", ")

  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : booking.bookingDate
  const eventTime = event?.time || booking.bookingTime
  const venue = hall?.name || "Main Hall"
  const receiptUrl = `${BASE_URL}/receipt/${booking._id}`

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <title>Booking Confirmation - Dex View Cinema</title>
      <style>
        body,table,td,a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table,td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f5f7; }
        @media screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .px { padding-left: 16px !important; padding-right: 16px !important; }
        }
      </style>
    </head>
    <body style="background-color:#f4f5f7; margin:0; padding:0;">
      <div style="display:none; font-size:1px; color:#f4f5f7; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        Your booking for ${booking.eventTitle} is confirmed. Seats: ${seatsFormatted}. Total: ₦${booking.totalAmount.toLocaleString()}
      </div>

      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 24px 12px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(16,24,40,0.08);">
              <tr>
                <td align="center" style="background-color:#e53e3e; padding:28px 24px;">
                  <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">Dex View Cinema</h1>
                  <p style="margin:6px 0 0; color:#ffe8e8; font-size:14px;">Booking Confirmation</p>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding: 28px 24px 8px 24px;">
                  <h2 style="margin:0 0 12px 0; color:#101828; font-size:20px; font-weight:700;">🎉 Booking Confirmed!</h2>
                  <p style="margin:0; color:#475467; font-size:14px; line-height:1.6;">
                    Dear <strong style="color:#101828;">${booking.customerName}</strong>,<br/>
                    Thank you for choosing Dex View Cinema! Your booking for <strong>${booking.eventTitle}</strong> has been successfully confirmed.
                  </p>
                </td>
              </tr>

              <tr>
                <td class="px" align="left" style="padding: 16px 24px 8px 24px;">
                  <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" bgcolor="#e53e3e" style="border-radius:6px;">
                        <a href="${receiptUrl}" target="_blank"
                           style="display:inline-block; padding:10px 16px; font-size:14px; color:#ffffff; text-decoration:none; border-radius:6px;">
                           View Receipt
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding: 16px 24px 0 24px;">
                  <p style="margin:0; color:#98A2B3; font-size:12px; text-transform:uppercase; letter-spacing:0.6px;">
                    Booking Details
                  </p>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding: 8px 24px 24px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EAECF0; border-radius:8px; overflow:hidden;">
                    <tbody>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Booking Code</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">${booking.bookingCode || booking._id}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Event</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">${booking.eventTitle}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Type</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">${booking.eventType === "match" ? "Sports Match" : "Movie"}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Date &amp; Time</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">${eventDate} at ${eventTime}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Venue</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">${venue}</td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Seats</td>
                        <td style="padding:12px; font-size:13px; color:#475467;">
                          <span style="display:inline-block; background:#fee2e2; color:#b91c1c; padding:4px 8px; border-radius:4px; font-weight:700;">${seatsFormatted}</span>
                          <div style="margin-top:4px; color:#667085; font-size:12px;">${booking.seatType}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="40%" style="background:#F9FAFB; padding:12px; font-size:13px; color:#344054; font-weight:600;">Total Amount</td>
                        <td style="padding:12px; font-size:15px; color:#e53e3e; font-weight:700;">₦${booking.totalAmount.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding: 0 24px 24px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFAEB; border:1px solid #FDE68A; border-radius:8px;">
                    <tr>
                      <td style="padding:16px 16px 10px 16px;">
                        <p style="margin:0 0 8px 0; color:#92400E; font-size:14px; font-weight:700;">Important Notes</p>
                        <ul style="margin:0; padding-left:18px; color:#92400E; font-size:13px; line-height:1.6;">
                          <li>Please arrive at least 15 minutes before the event starts</li>
                          <li>Bring a valid ID for verification</li>
                          <li>Your seats are reserved and guaranteed</li>
                          <li>Keep this email as your booking receipt</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td class="px" style="padding: 0 24px 28px 24px;">
                  <p style="margin:0; color:#475467; font-size:14px; line-height:1.6;">
                    We're excited to have you join us! For assistance, reply to this email or contact our support team.
                  </p>
                </td>
              </tr>

              <tr>
                <td align="center" style="background:#F9FAFB; padding:16px 24px; border-top:1px solid #EAECF0;">
                  <p style="margin:0 0 6px 0; color:#667085; font-size:12px;">
                    📧 support@dexviewcinema.com &nbsp;&nbsp;|&nbsp;&nbsp; 📞 08139614950
                  </p>
                  <p style="margin:0; color:#98A2B3; font-size:11px;">
                    Developed by <strong>SydaTech</strong> &middot; sydatech.com.ng
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; margin-top:12px;">
              <tr>
                <td align="center" style="padding: 0 12px;">
                  <p style="margin:0; color:#98A2B3; font-size:11px;">
                    You received this email because you made a booking at Dex View Cinema.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
  </html>
    `
}

function generateReceiptText(booking: any, event: any, hall: any) {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://dexviewcinema.vercel.app"
  const seatsFormatted = booking.seats
    .map((seatId: string) => (seatId.includes("-") ? seatId.split("-")[1] : seatId))
    .join(", ")
  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : booking.bookingDate
  const eventTime = event?.time || booking.bookingTime
  const venue = hall?.name || "Main Hall"
  const receiptUrl = `${BASE_URL}/receipt/${booking._id}`

  return [
    "Dex View Cinema - Booking Confirmation",
    "",
    `Hello ${booking.customerName},`,
    `Your booking for "${booking.eventTitle}" is confirmed.`,
    "",
    "Booking Details:",
    `- Booking Code: ${booking.bookingCode || booking._id}`,
    `- Type: ${booking.eventType === "match" ? "Sports Match" : "Movie"}`,
    `- Date & Time: ${eventDate} at ${eventTime}`,
    `- Venue: ${venue}`,
    `- Seats: ${seatsFormatted} (${booking.seatType})`,
    `- Total Amount: ₦${booking.totalAmount.toLocaleString()}`,
    "",
    `View your receipt: ${receiptUrl}`,
    "",
    "Please arrive 15 minutes early and bring a valid ID.",
    "",
    "Thank you for choosing Dex View Cinema!",
  ].join("\n")
}

// Helper function to send email using Brevo
async function sendBookingConfirmationEmail(booking: any, event: any, hall: any) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com"

  console.log("[v0] Email sending attempt:", {
    hasApiKey: !!BREVO_API_KEY,
    senderEmail: BREVO_SENDER_EMAIL,
    customerEmail: booking.customerEmail,
    bookingId: booking._id,
  })

  if (!BREVO_API_KEY) {
    console.error("[v0] BREVO_API_KEY is not configured in environment variables")
    return { success: false, error: "API key not configured" }
  }

  if (!booking.customerEmail) {
    console.error("[v0] Customer email not provided for booking:", booking._id)
    return { success: false, error: "Customer email not provided" }
  }

  try {
    const emailData = {
      sender: {
        email: BREVO_SENDER_EMAIL,
        name: "Dex View Cinema",
      },
      to: [
        {
          email: booking.customerEmail,
          name: booking.customerName,
        },
      ],
      subject: `🎬 Booking Confirmed - ${booking.eventTitle} | Dex View Cinema`,
      htmlContent: generateReceiptHtml(booking, event, hall),
      textContent: generateReceiptText(booking, event, hall),
      replyTo: { email: "support@dexviewcinema.com", name: "Dex View Cinema Support" },
    }

    console.log("[v0] Sending email to Brevo API:", {
      to: emailData.to[0].email,
      subject: emailData.subject,
    })

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(emailData),
    })

    const responseData = await brevoResponse.json()

    if (!brevoResponse.ok) {
      console.error("[v0] Brevo API error:", {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        data: responseData,
      })
      return { success: false, error: responseData }
    }

    console.log("[v0] Email sent successfully:", {
      messageId: responseData.messageId,
      customerEmail: booking.customerEmail,
    })

    return { success: true, messageId: responseData.messageId }
  } catch (emailError) {
    console.error("[v0] Error sending booking confirmation email:", emailError)
    return { success: false, error: emailError }
  }
}

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)

    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const phone = searchParams.get("phone")

    let query: any = {}
    const orConditions = []

    if (email) {
      orConditions.push({ customerEmail: email })
    }
    if (name) {
      orConditions.push({ customerName: { $regex: name, $options: "i" } })
    }
    if (phone) {
      orConditions.push({ customerPhone: phone })
    }
    if (orConditions.length > 0) {
      query = { $or: orConditions }
    }

    const bookings = await db.collection("bookings").find(query).toArray()

    const serializableBookings = bookings.map((booking) => ({
      ...booking,
      _id: booking._id.toString(),
    }))

    return NextResponse.json(serializableBookings)
  } catch (error) {
    console.error("Failed to fetch bookings:", error)
    return NextResponse.json({ message: "Failed to fetch bookings", error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const newBookingData: BookingDocument = await request.json()

    // Basic validation for required fields
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
      status,
      bookingDate,
      bookingTime,
      paymentMethod,
    } = newBookingData

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
    if (!status) missingFields.push("status")
    if (!bookingDate) missingFields.push("bookingDate")
    if (!bookingTime) missingFields.push("bookingTime")
    if (!paymentMethod) missingFields.push("paymentMethod")

    if (missingFields.length > 0) {
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Check for duplicate bookings for the same event and seats
    const existingBooking = await db.collection("bookings").findOne({
      eventId: new ObjectId(eventId),
      seats: { $in: seats },
      status: { $ne: "cancelled" },
    })

    if (existingBooking) {
      return NextResponse.json(
        { message: "One or more selected seats are already booked for this event." },
        { status: 409 },
      )
    }

    // Generate human-friendly booking code
    const seq = await getNextSequence(db, "booking")
    const bookingCode = formatBookingCode(seq, "DEX", 6)

    const bookingToInsert = {
      ...newBookingData,
      bookingCode,
      eventId: new ObjectId(eventId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(bookingToInsert)

    if (!result.acknowledged) {
      throw new Error("Failed to create booking: Acknowledgment failed.")
    }

    const createdBooking = {
      ...bookingToInsert,
      _id: result.insertedId.toString(),
      eventId: eventId,
    }

    // Send email (non-blocking errors)
    try {
      const event = await db.collection("events").findOne({ _id: new ObjectId(createdBooking.eventId) })
      let hall = null
      if (event && event.hall_id) {
        hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
      }

      console.log("[v0] Attempting to send booking confirmation email for booking:", createdBooking._id)
      const emailResult = await sendBookingConfirmationEmail(createdBooking, event, hall)

      if (emailResult.success) {
        console.log("[v0] Booking confirmation email sent successfully:", emailResult.messageId)
      } else {
        console.error("[v0] Failed to send booking confirmation email:", emailResult.error)
      }
    } catch (emailError) {
      console.error("[v0] Exception while sending booking confirmation email:", emailError)
    }

    revalidatePath("/admin")

    return NextResponse.json(createdBooking, { status: 201 })
  } catch (error) {
    console.error("Failed to create booking:", error)
    return NextResponse.json({ message: "Failed to create booking", error: (error as Error).message }, { status: 500 })
  }
}
