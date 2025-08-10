import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface BookingDetails {
  customerName: string
  customerEmail: string
  eventName: string
  eventDate: string
  eventTime: string
  hallName: string
  seats: string[]
  seatType: string
  totalAmount: number
  bookingReference: string
}

function generateReceiptHtml(details: BookingDetails): string {
  const { customerName, eventName, eventDate, eventTime, hallName, seats, seatType, totalAmount, bookingReference } =
    details

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - DexView Cinema</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #eee;
            }
            .header h1 {
                color: #333;
                margin: 0;
            }
            .content {
                padding: 20px 0;
            }
            .content p {
                margin-bottom: 10px;
            }
            .details-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            .details-table th, .details-table td {
                border: 1px solid #eee;
                padding: 10px;
                text-align: left;
            }
            .details-table th {
                background-color: #f9f9f9;
                font-weight: bold;
            }
            .footer {
                text-align: center;
                padding-top: 20px;
                margin-top: 20px;
                border-top: 1px solid #eee;
                font-size: 0.9em;
                color: #777;
            }
            .highlight {
                font-weight: bold;
                color: #007bff; /* A nice blue color */
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Booking Confirmation</h1>
                <p>DexView Cinema</p>
            </div>
            <div class="content">
                <p>Dear ${customerName},</p>
                <p>Thank you for your booking with DexView Cinema! Your payment has been successfully processed, and your booking is confirmed.</p>
                <p>Here are your booking details:</p>
                <table class="details-table">
                    <tr>
                        <th>Booking Reference:</th>
                        <td><span class="highlight">${bookingReference}</span></td>
                    </tr>
                    <tr>
                        <th>Movie:</th>
                        <td>${eventName}</td>
                    </tr>
                    <tr>
                        <th>Date:</th>
                        <td>${eventDate}</td>
                    </tr>
                    <tr>
                        <th>Time:</th>
                        <td>${eventTime}</td>
                    </tr>
                    <tr>
                        <th>Hall:</th>
                        <td>${hallName}</td>
                    </tr>
                    <tr>
                        <th>Seats:</th>
                        <td>${seats.join(", ")} (${seatType})</td>
                    </tr>
                    <tr>
                        <th>Total Amount Paid:</th>
                        <td>₦${totalAmount.toLocaleString()}</td>
                    </tr>
                </table>
                <p>Please present this confirmation email at the cinema entrance.</p>
                <p>We look forward to seeing you!</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} DexView Cinema. All rights reserved.</p>
                <p>123 Cinema Lane, Movie City, MC 12345</p>
                <p>Contact: support@dexviewcinema.com</p>
            </div>
        </div>
    </body>
    </html>
  `
}

export class EmailService {
  private brevoApiKey: string
  private senderEmail: string

  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY!
    this.senderEmail = process.env.BREVO_SENDER_EMAIL!

    if (!this.brevoApiKey) {
      console.error("EmailService: BREVO_API_KEY is not configured.")
      throw new Error("BREVO_API_KEY is not configured.")
    }
    if (!this.senderEmail) {
      console.error("EmailService: BREVO_SENDER_EMAIL is not configured.")
      throw new Error("BREVO_SENDER_EMAIL is not configured.")
    }
  }

  async sendBookingReceipt(bookingId: string) {
    console.log(`EmailService: Attempting to send email for booking ID: ${bookingId}`)
    try {
      const { db } = await connectToDatabase()

      const booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
      if (!booking) {
        console.error(`EmailService: Booking not found for ID: ${bookingId}. Cannot send email.`)
        return
      }

      const event = await db.collection("events").findOne({ _id: new ObjectId(booking.eventId) })
      if (!event) {
        console.error(`EmailService: Event not found for booking ID: ${bookingId}. Cannot send email.`)
        return
      }

      const hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
      if (!hall) {
        console.error(`EmailService: Hall not found for event ID: ${booking.eventId}. Cannot send email.`)
        return
      }

      const bookingDetails: BookingDetails = {
        customerName: booking.customerName,
        customerEmail: booking.email,
        eventName: event.title,
        eventDate: new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        eventTime: event.time,
        hallName: hall.name,
        seats: booking.seats,
        seatType: booking.seatType,
        totalAmount: booking.amount,
        bookingReference: booking.reference,
      }

      const htmlContent = generateReceiptHtml(bookingDetails)

      const brevoApiUrl = "https://api.brevo.com/v3/smtp/email"
      const headers = {
        "api-key": this.brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      }
      const body = JSON.stringify({
        sender: { email: this.senderEmail, name: "DexView Cinema" },
        to: [{ email: bookingDetails.customerEmail, name: bookingDetails.customerName }],
        subject: `Your DexView Cinema Booking Confirmation - ${bookingDetails.eventName}`,
        htmlContent: htmlContent,
      })

      console.log(
        `EmailService: Sending email to ${bookingDetails.customerEmail} for booking reference ${bookingDetails.bookingReference}`,
      )
      const response = await fetch(brevoApiUrl, {
        method: "POST",
        headers: headers,
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("EmailService: Brevo API error sending receipt email:", {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        })
        throw new Error(`Brevo API error: ${errorData.message || response.statusText}`)
      }

      console.log(`EmailService: Receipt email sent successfully for booking: ${bookingId}`)
    } catch (error) {
      console.error("EmailService: General error sending receipt email:", error)
    }
  }
}
