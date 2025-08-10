import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

// Define the structure for a booking document
interface BookingDocument {
  _id?: ObjectId
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
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Date & Time:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee;">${eventDate} at ${eventTime}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e; background-color: #fff;">Venue:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee; background-color: #fff;">${hall?.name || "Main Hall"}</td>
            </tr>
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #eee; font-weight: bold; color: #e53e3e;">Seats:</td>
              <td style="padding: 15px; border-bottom: 1px solid #eee;">
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
      orConditions.push({ customerName: { $regex: name, $options: "i" } }) // Case-insensitive partial match
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

    console.log("Creating new booking with data:", newBookingData)

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
      console.error("Missing required fields for booking:", missingFields.join(", "), newBookingData)
      return NextResponse.json({ message: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Check for duplicate bookings for the same event and seats
    const existingBooking = await db.collection("bookings").findOne({
      eventId: new ObjectId(eventId),
      seats: { $in: seats },
      status: { $ne: "cancelled" },
    })

    if (existingBooking) {
      console.warn("Duplicate booking attempt detected:", newBookingData)
      return NextResponse.json(
        { message: "One or more selected seats are already booked for this event." },
        { status: 409 },
      )
    }

    const bookingToInsert = {
      ...newBookingData,
      eventId: new ObjectId(eventId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(bookingToInsert)

    if (!result.acknowledged) {
      console.error("MongoDB insertOne not acknowledged for booking:", result)
      throw new Error("Failed to create booking: Acknowledgment failed.")
    }

    const createdBooking = {
      ...bookingToInsert,
      _id: result.insertedId.toString(),
      eventId: eventId,
    }

    console.log("Booking created successfully:", createdBooking._id)

    // --- Send email automatically after successful booking ---
    try {
      // Fetch event details to get hall_id
      const event = await db.collection("events").findOne({ _id: new ObjectId(createdBooking.eventId) })
      let hall = null
      if (event && event.hall_id) {
        // Fetch hall details
        hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
      }

      console.log("Fetched event and hall data for email:", {
        eventFound: !!event,
        hallFound: !!hall,
        eventTitle: event?.title,
        hallName: hall?.name,
      })

      const emailResult = await sendBookingConfirmationEmail(createdBooking, event, hall)

      if (emailResult.success) {
        console.log("✅ Booking confirmation email sent successfully:", {
          bookingId: createdBooking._id,
          email: createdBooking.customerEmail,
          messageId: emailResult.messageId,
        })
      } else {
        console.error("❌ Failed to send booking confirmation email:", {
          bookingId: createdBooking._id,
          email: createdBooking.customerEmail,
          error: emailResult.error,
        })
      }
    } catch (emailError) {
      console.error("❌ Exception while sending booking confirmation email:", emailError)
    }
    // --- End email sending logic ---

    // Revalidate the admin page to show the new booking
    revalidatePath("/admin")

    return NextResponse.json(createdBooking, { status: 201 })
  } catch (error) {
    console.error("Failed to create booking:", error)
    return NextResponse.json({ message: "Failed to create booking", error: (error as Error).message }, { status: 500 })
  }
}
