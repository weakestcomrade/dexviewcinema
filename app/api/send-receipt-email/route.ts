import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Helper function to generate HTML content for the email
function generateReceiptHtml(booking: any, hall: any) {
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

export async function POST(request: Request) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY

  if (!BREVO_API_KEY) {
    return NextResponse.json({ message: "Brevo API key not configured." }, { status: 500 })
  }

  try {
    const { bookingId, customerEmail } = await request.json()

    if (!bookingId || !customerEmail) {
      return NextResponse.json({ message: "Booking ID and customer email are required." }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Fetch booking details
    const booking = await db.collection("bookings").findOne({ _id: new ObjectId(bookingId) })
    if (!booking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 })
    }

    // Fetch event details to get hall_id
    const event = await db.collection("events").findOne({ _id: new ObjectId(booking.eventId) })
    if (!event) {
      return NextResponse.json({ message: "Associated event not found." }, { status: 404 })
    }

    // Fetch hall details
    const hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })

    const htmlContent = generateReceiptHtml(booking, hall)

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "no-reply@dexviewcinema.com", name: "Dex View Cinema" }, // [^1]
        to: [{ email: customerEmail, name: booking.customerName }],
        subject: `Your Dex View Cinema Booking Confirmation - ${booking.eventTitle}`,
        htmlContent: htmlContent,
      }),
    })

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json()
      console.error("Brevo API error:", errorData)
      throw new Error(`Failed to send email via Brevo: ${JSON.stringify(errorData)}`)
    }

    return NextResponse.json({ message: "Receipt email sent successfully!" }, { status: 200 })
  } catch (error) {
    console.error("Error sending receipt email:", error)
    return NextResponse.json(
      { message: "Failed to send receipt email", error: (error as Error).message },
      { status: 500 },
    )
  }
}
