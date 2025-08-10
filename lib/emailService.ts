import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Helper function to generate HTML content for the email
function generateReceiptHtml(booking: any, event: any, hall: any) {
  const seatsFormatted = booking.seats
    .map((seatId: string) => {
      if (seatId.includes("-")) {
        return seatId.split("-")[1]
      }
      return seatId
    })
    .join(", ")

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
      <div style="background-color: #e53e3e; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Dex View Cinema</h1>
        <p style="margin: 5px 0 0; font-size: 16px;">Booking Receipt</p>
      </div>
      <div style="padding: 20px;">
        <h2 style="color: #e53e3e; font-size: 22px; margin-top: 0;">Booking Confirmed!</h2>
        <p style="font-size: 14px; color: #555;">Dear ${booking.customerName},</p>
        <p style="font-size: 14px; color: #555;">Your booking for <strong>${booking.eventTitle}</strong> has been successfully confirmed. Here are your details:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Booking ID:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${booking._id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Event:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${booking.eventTitle} (${booking.eventType === "match" ? "Sports Match" : "Movie"})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Date & Time:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${booking.bookingDate} at ${booking.bookingTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Venue:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${hall?.name || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Seats:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${seatsFormatted} (${booking.seatType})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Total Amount:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">₦${booking.totalAmount.toLocaleString()}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #555; margin-top: 20px;">
          Thank you for choosing Dex View Cinema! We look forward to seeing you.
        </p>
      </div>
      <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee;">
        <p style="margin: 0;">For support, email us at support@dexviewcinema.com or call 08139614950</p>
        <p style="margin: 5px 0 0;">Developed by SydaTech - www.sydatech.com.ng</p>
      </div>
    </div>
  `
}

interface BookingDetails {
  _id: string
  customerName: string
  customerEmail: string
  eventTitle: string
  eventType: string
  seats: string[]
  seatType: string
  totalAmount: number
  bookingDate: string
  bookingTime: string
  eventId: string
}

export async function sendBookingReceiptEmail(booking: BookingDetails) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com"

  if (!BREVO_API_KEY) {
    console.warn("EmailService: BREVO_API_KEY not configured. Skipping email sending.")
    return { success: false, message: "Brevo API key not configured." }
  }

  try {
    const { db } = await connectToDatabase()

    // Fetch event details
    const event = await db.collection("events").findOne({ _id: new ObjectId(booking.eventId) })
    if (!event) {
      console.warn(`EmailService: Event not found for ID ${booking.eventId}. Cannot send detailed receipt.`)
      // Continue without event details if not found, or throw error if critical
    }

    // Fetch hall details if available
    let hall = null
    if (event && event.hall_id) {
      hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
      if (!hall) {
        console.warn(`EmailService: Hall not found for ID ${event.hall_id} when sending email.`)
      }
    }

    const htmlContent = generateReceiptHtml(booking, event, hall)

    console.log(`EmailService: Attempting to send email to ${booking.customerEmail} for booking ${booking._id}.`)

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: "Dex View Cinema" },
        to: [{ email: booking.customerEmail, name: booking.customerName }],
        subject: `Your Dex View Cinema Booking Confirmation - ${booking.eventTitle}`,
        htmlContent: htmlContent,
      }),
    })

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json()
      console.error("EmailService: Brevo API error sending receipt email:", errorData)
      return { success: false, message: "Brevo API error", error: errorData }
    } else {
      console.log("EmailService: Receipt email sent successfully for booking:", booking._id)
      return { success: true, message: "Email sent successfully." }
    }
  } catch (emailError) {
    console.error("EmailService: General error sending receipt email:", emailError)
    return { success: false, message: "Failed to send email due to internal error.", error: emailError }
  }
}
