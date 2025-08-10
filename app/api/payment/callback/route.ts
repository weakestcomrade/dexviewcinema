import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"

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

export async function GET(request: Request) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com"

  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")

    if (!reference) {
      return NextResponse.redirect(new URL("/payment/failed?error=missing-reference", request.url))
    }

    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.redirect(new URL(`/payment/failed?reference=${reference}`, request.url))
    }

    // Find payment record
    const paymentRecord = await db.collection("payments").findOne({ reference })

    if (!paymentRecord) {
      return NextResponse.redirect(
        new URL(`/payment/failed?reference=${reference}&error=record-not-found`, request.url),
      )
    }

    // Check if already processed
    if (paymentRecord.status === "confirmed") {
      const booking = await db.collection("bookings").findOne({ paymentReference: reference })
      if (booking) {
        return NextResponse.redirect(new URL(`/receipt/${booking._id}`, request.url))
      }
    }

    // Process the payment (similar to verify endpoint)
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.customerEmail,
      customerPhone: paymentRecord.customerPhone,
      eventId: paymentRecord.eventId,
      eventTitle: "",
      eventType: "",
      seats: paymentRecord.seats,
      seatType: paymentRecord.seatType,
      amount: paymentRecord.amount,
      processingFee: paymentRecord.processingFee,
      totalAmount: paymentRecord.totalAmount,
      status: "confirmed",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      paymentMethod: "paystack",
      paymentReference: reference,
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get event details
    const event = await db.collection("events").findOne({ _id: paymentRecord.eventId })
    if (event) {
      bookingData.eventTitle = event.title
      bookingData.eventType = event.event_type
    }

    // Insert booking
    const bookingResult = await db.collection("bookings").insertOne(bookingData)

    // Create the complete booking object for email
    const createdBooking = {
      ...bookingData,
      _id: bookingResult.insertedId.toString(),
    }

    // Update payment status
    await db.collection("payments").updateOne(
      { reference },
      {
        $set: {
          status: "confirmed",
          bookingId: bookingResult.insertedId,
          updatedAt: new Date(),
        },
      },
    )

    // Update event's booked seats
    await db.collection("events").updateOne(
      { _id: paymentRecord.eventId },
      {
        $addToSet: {
          bookedSeats: { $each: paymentRecord.seats },
        },
      },
    )

    // --- Send email automatically after successful booking ---
    if (BREVO_API_KEY) {
      try {
        // Fetch hall details if available
        let hall = null
        if (event && event.hall_id) {
          hall = await db.collection("halls").findOne({ _id: event.hall_id })
        }

        const htmlContent = generateReceiptHtml(createdBooking, event, hall)

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { email: BREVO_SENDER_EMAIL, name: "Dex View Cinema" },
            to: [{ email: createdBooking.customerEmail, name: createdBooking.customerName }],
            subject: `Your Dex View Cinema Booking Confirmation - ${createdBooking.eventTitle}`,
            htmlContent: htmlContent,
          }),
        })

        if (!brevoResponse.ok) {
          const errorData = await brevoResponse.json()
          console.error("Brevo API error sending receipt email:", errorData)
        } else {
          console.log("Receipt email sent successfully for booking:", createdBooking._id)
        }
      } catch (emailError) {
        console.error("Error sending receipt email:", emailError)
      }
    } else {
      console.warn("Brevo API key not configured. Skipping email sending.")
    }
    // --- End email sending logic ---

    // Redirect to receipt page
    return NextResponse.redirect(new URL(`/receipt/${bookingResult.insertedId}`, request.url))
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL(`/payment/failed?error=processing-failed`, request.url))
  }
}
