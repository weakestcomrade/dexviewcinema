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
  createdAt: Date
  updatedAt: Date
}

// Helper function to generate HTML content for the email, mimicking the receipt UI
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
    <div style="min-height: 100vh; background: linear-gradient(to bottom right, #1a202c, #2d3748, #1a202c); display: flex; align-items: center; justify-content: center; padding: 16px;">
      <div style="width: 100%; max-width: 768px; background-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.2); color: white; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); border-radius: 24px; overflow: hidden;">
        <div style="text-align: center; padding-bottom: 24px; display: none;">
          <h1 style="color: white; font-size: 30px; font-weight: bold; background: linear-gradient(to right, white, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
            Booking Receipt
          </h1>
          <p style="color: #a0aec0; font-size: 18px;">
            Your booking details are confirmed!
          </p>
        </div>
        <div style="padding: 24px 32px;">
          <div style="background-color: #ffffff; color: #000000; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dexcinema-dR8urLe5QU81mcNPofCpzVS9hmluq8.jpeg" alt="Dex View Cinema Logo" width="150" height="150" style="margin: 0 auto 16px; display: block;">
              <h1 style="font-size: 30px; font-weight: bold; color: #dc2626; margin-bottom: 8px;">Dex View Cinema</h1>
              <p style="color: #4a5568;">Premium Entertainment Experience</p>
              <div style="border-bottom: 2px solid #dc2626; margin-top: 16px;"></div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="vertical-align: top; padding-right: 32px;">
                  <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #dc2626;">Customer Information</h3>
                  <p style="margin-bottom: 4px;"><strong>Name:</strong> ${booking.customerName}</p>
                  <p style="margin-bottom: 4px;"><strong>Email:</strong> ${booking.customerEmail}</p>
                  <p style="margin-bottom: 4px;"><strong>Phone:</strong> ${booking.customerPhone}</p>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #dc2626;">Booking Details</h3>
                  <p style="margin-bottom: 4px;"><strong>Booking ID:</strong> ${booking._id}</p>
                  <p style="margin-bottom: 4px;"><strong>Date:</strong> ${booking.bookingDate}</p>
                  <p style="margin-bottom: 4px;"><strong>Time:</strong> ${booking.bookingTime}</p>
                  <p style="margin-bottom: 4px;"><strong>Payment:</strong> ${booking.paymentMethod}</p>
                  <p style="margin-bottom: 4px;">
                    <strong>Status:</strong>
                    <span style="font-weight: 600; color: ${booking.status === "confirmed" ? "#22c55e" : "#eab308"};">
                      ${booking.status.toUpperCase()}
                    </span>
                  </p>
                </td>
              </tr>
            </table>

            <div style="margin-bottom: 24px;">
              <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #dc2626;">Event Information</h3>
              <p style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="width: 20px; height: 20px; color: #ef4444;">🎫</span>
                <strong>Event:</strong> ${booking.eventTitle} (${booking.eventType === "match" ? "Sports Match" : "Movie"})
              </p>
              <p style="display: flex; align-items: center; gap: 8px; margin-top: 8px; margin-bottom: 8px;">
                <span style="width: 20px; height: 20px; color: #ef4444;">📍</span>
                <strong>Venue:</strong> ${hall?.name || "N/A"}
              </p>
              <p style="display: flex; align-items: center; gap: 8px; margin-top: 8px; margin-bottom: 8px;">
                <span style="width: 20px; height: 20px; color: #ef4444;">🪑</span>
                <strong>Seats:</strong> ${seatsFormatted} (${booking.seatType})
              </p>
              <p style="display: flex; align-items: center; gap: 8px; margin-top: 8px; margin-bottom: 8px;">
                <span style="width: 20px; height: 20px; color: #ef4444;">📅</span>
                <strong>Event Date:</strong> ${new Date(booking.bookingDate).toLocaleDateString()}
              </p>
              <p style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                <span style="width: 20px; height: 20px; color: #ef4444;">⏰</span>
                <strong>Event Time:</strong> ${booking.bookingTime}
              </p>
            </div>

            <div style="border-top: 2px solid #d1d5db; padding-top: 16px; margin-bottom: 24px;">
              <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #dc2626;">Payment Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Base Amount:</span>
                <span>₦${booking.amount.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Processing Fee:</span>
                <span>₦${booking.processingFee.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #d1d5db; padding-top: 8px;">
                <span>Total Amount:</span>
                <span>₦${booking.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div style="text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #d1d5db; padding-top: 16px;">
              <p>Thank you for choosing Dex View Cinema!</p>
              <p>For support, email us at support@dexviewcinema.com or call 08139614950</p>
              <p style="margin-top: 8px;">Developed by SydaTech - www.sydatech.com.ng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
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
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@dexviewcinema.com" // Default sender email

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

    // --- Send email automatically after successful booking ---
    if (BREVO_API_KEY) {
      try {
        // Fetch event details to get hall_id
        const event = await db.collection("events").findOne({ _id: new ObjectId(createdBooking.eventId) })
        let hall = null
        if (event && event.hall_id) {
          // Fetch hall details
          hall = await db.collection("halls").findOne({ _id: new ObjectId(event.hall_id) })
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
          // Log the error but don't prevent the booking from being confirmed
        } else {
          console.log("Receipt email sent successfully for booking:", createdBooking._id)
        }
      } catch (emailError) {
        console.error("Error sending receipt email:", emailError)
        // Log the error but don't prevent the booking from being confirmed
      }
    } else {
      console.warn("Brevo API key not configured. Skipping email sending.")
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
