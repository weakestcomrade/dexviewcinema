import { NextResponse } from "next/server"
import { PaystackService } from "@/lib/paystack"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const paystack = new PaystackService()

    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        {
          status: false,
          message: "Payment reference is required",
        },
        { status: 400 },
      )
    }

    console.log("Verifying payment with reference:", reference)

    // Verify payment with Paystack
    const paystackResponse = await paystack.verifyPayment(reference)
    console.log("Paystack verification response:", paystackResponse)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.json(
        {
          status: false,
          message: "Payment verification failed with Paystack",
        },
        { status: 400 },
      )
    }

    // Find payment record in database
    const paymentRecord = await db.collection("payments").findOne({ reference })
    console.log("Payment record from database:", paymentRecord)

    if (!paymentRecord) {
      return NextResponse.json(
        {
          status: false,
          message: "Payment record not found in database",
        },
        { status: 404 },
      )
    }

    // Check if payment is already processed
    if (paymentRecord.status === "confirmed") {
      const existingBooking = await db.collection("bookings").findOne({ paymentReference: reference })
      if (existingBooking) {
        return NextResponse.json({
          status: true,
          message: "Payment already processed",
          data: { bookingId: existingBooking._id.toString() },
        })
      }
    }

    // Convert Paystack amount from kobo to naira
    const paidAmountInNaira = paystackResponse.data.amount / 100
    console.log("Amount comparison:", {
      paidAmount: paidAmountInNaira,
      expectedAmount: paymentRecord.amount,
      paymentRecordAmount: paymentRecord.amount,
    })

    // Verify amount matches (use the total amount stored in payment record)
    if (Math.abs(paidAmountInNaira - paymentRecord.amount) > 0.01) {
      // Allow for small floating point differences
      console.error("Amount mismatch:", {
        paid: paidAmountInNaira,
        expected: paymentRecord.amount,
        difference: Math.abs(paidAmountInNaira - paymentRecord.amount),
      })
      return NextResponse.json(
        {
          status: false,
          message: `Payment amount mismatch. Paid: ₦${paidAmountInNaira}, Expected: ₦${paymentRecord.amount}`,
        },
        { status: 400 },
      )
    }

    // Get event details
    const event = await db.collection("events").findOne({ _id: new ObjectId(paymentRecord.eventId) })
    if (!event) {
      return NextResponse.json(
        {
          status: false,
          message: "Event not found",
        },
        { status: 404 },
      )
    }

    // Create booking record directly (not via API call to avoid circular issues)
    const bookingData = {
      customerName: paymentRecord.customerName,
      customerEmail: paymentRecord.email,
      customerPhone: paymentRecord.customerPhone || "",
      eventId: new ObjectId(paymentRecord.eventId),
      eventTitle: event.title,
      eventType: event.event_type,
      eventDate: event.date,
      eventTime: event.time,
      seats: paymentRecord.seats,
      seatType: paymentRecord.seatType,
      amount: paymentRecord.baseAmount || paymentRecord.amount,
      processingFee: paymentRecord.processingFee || 0,
      totalAmount: paymentRecord.amount,
      status: "confirmed",
      bookingDate: new Date().toISOString().split("T")[0],
      bookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
      paymentMethod: "paystack",
      paymentReference: reference,
      paystackData: paystackResponse.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("Creating booking with data:", bookingData)

    // Insert booking
    const bookingResult = await db.collection("bookings").insertOne(bookingData)

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
      { _id: new ObjectId(paymentRecord.eventId) },
      {
        $addToSet: {
          bookedSeats: { $each: paymentRecord.seats },
        },
      },
    )

    // Send booking confirmation email
    try {
      const createdBooking = {
        ...bookingData,
        _id: bookingResult.insertedId.toString(),
        eventId: paymentRecord.eventId,
      }

      // Get hall details for email
      let hall = null
      if (event && event.hall_id) {
        hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
      }

      await sendBookingConfirmationEmail(createdBooking, event, hall)
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError)
      // Don't fail the booking if email fails
    }

    console.log("Payment verification successful, booking created:", bookingResult.insertedId)

    return NextResponse.json({
      status: true,
      message: "Payment verified and booking confirmed",
      data: {
        bookingId: bookingResult.insertedId.toString(),
        reference: reference,
        amount: paidAmountInNaira,
      },
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      {
        status: false,
        message: "Payment verification failed",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

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

  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : booking.bookingDate
  const eventTime = event?.time || booking.bookingTime

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
         Header 
        <div style="background-color: #e53e3e; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Dex View Cinema</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Booking Confirmation</p>
        </div>
        
         Content 
        <div style="padding: 30px 20px;">
          <h2 style="color: #e53e3e; font-size: 24px; margin: 0 0 20px 0; font-weight: bold;">🎉 Booking Confirmed!</h2>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Dear <strong>${booking.customerName}</strong>,</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
            Thank you for choosing Dex View Cinema! Your booking for <strong>${booking.eventTitle}</strong> has been successfully confirmed. 
            Please find your booking details below:
          </p>

           Booking Details Table 
          <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background-color: #f9f9f9; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Booking ID:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">${booking._id}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Event:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee;">${booking.eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Type:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">${booking.eventType === "match" ? "Sports Match" : "Movie"}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Date & Time:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">${eventDate} at ${eventTime}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Venue:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">${hall?.name || "Main Hall"}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Seats:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">
                <span style="background-color: #e53e3e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${seatsFormatted}</span>
                <br><small style="color: #666; margin-top: 5px; display: inline-block;">${booking.seatType}</small>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px; font-weight: bold; color: #e53e3e; background-color: #fff; font-size: 18px;">Total Amount:</td>
              <td style="padding: 15px; background-color: #fff; font-size: 18px; font-weight: bold; color: #e53e3e;">₦${booking.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

           Important Notes 
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">📋 Important Notes:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li style="margin-bottom: 5px;">Please arrive at least 15 minutes before the event starts</li>
              <li style="margin-bottom: 5px;">Bring a valid ID for verification</li>
              <li style="margin-bottom: 5px;">Your seats are reserved and guaranteed</li>
              <li>Keep this email as your booking receipt</li>
            </ul>
          </div>

          <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 30px;">
            We're excited to have you join us for this amazing experience! If you have any questions or need assistance, 
            don't hesitate to contact our support team.
          </p>

          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            Thank you for choosing <strong>Dex View Cinema</strong>!
          </p>
        </div>
        
         Footer 
        <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
            📧 <strong>Support:</strong> support@dexviewcinema.com | 📞 <strong>Phone:</strong> 08139614950
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Developed by <strong>SydaTech</strong> - www.sydatech.com.ng
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Helper function to send email using Brevo
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
    console.log(`Attempting to send booking confirmation email to: ${booking.customerEmail}`)

    const htmlContent = generateReceiptHtml(booking, event, hall)

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
      htmlContent: htmlContent,
    }

    console.log("Sending email with data:", {
      to: emailData.to,
      subject: emailData.subject,
      sender: emailData.sender,
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
      console.error("Brevo API error:", {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        data: responseData,
      })
      return { success: false, error: responseData }
    }

    console.log("Email sent successfully:", {
      bookingId: booking._id,
      messageId: responseData.messageId,
      to: booking.customerEmail,
    })

    return { success: true, messageId: responseData.messageId }
  } catch (emailError) {
    console.error("Error sending booking confirmation email:", emailError)
    return { success: false, error: emailError }
  }
}
