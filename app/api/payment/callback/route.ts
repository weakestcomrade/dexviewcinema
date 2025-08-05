import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentReference = searchParams.get("paymentReference")
    const transactionReference = searchParams.get("transactionReference")

    if (!paymentReference) {
      return NextResponse.redirect(new URL("/payment/failed?error=missing-reference", request.url))
    }

    // Verify payment with Monnify
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentReference }),
    })

    const verifyResult = await verifyResponse.json()

    if (!verifyResult.success || verifyResult.paymentStatus !== "PAID") {
      return NextResponse.redirect(new URL("/payment/failed?error=payment-not-confirmed", request.url))
    }

    // Connect to MongoDB
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Get booking data from localStorage (this would be handled differently in production)
    // For now, we'll create the booking record here
    const bookingsCollection = db.collection("bookings")

    // Check if booking already exists
    const existingBooking = await bookingsCollection.findOne({ paymentReference })

    if (!existingBooking) {
      // This shouldn't happen in normal flow, but handle it gracefully
      return NextResponse.redirect(new URL("/payment/failed?error=booking-not-found", request.url))
    }

    // Update booking with payment confirmation
    await bookingsCollection.updateOne(
      { paymentReference },
      {
        $set: {
          paymentStatus: "completed",
          transactionReference: verifyResult.transactionReference,
          amountPaid: verifyResult.amountPaid,
          paidOn: verifyResult.paidOn,
          paymentMethod: verifyResult.paymentMethod,
          updatedAt: new Date(),
        },
      },
    )

    // Update event's booked seats
    const eventsCollection = db.collection("events")
    await eventsCollection.updateOne(
      { _id: new ObjectId(existingBooking.eventId) },
      {
        $addToSet: {
          bookedSeats: { $each: existingBooking.seats },
        },
      },
    )

    // Redirect to success page
    return NextResponse.redirect(new URL(`/payment/success?paymentReference=${paymentReference}`, request.url))
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL("/payment/failed?error=processing-error", request.url))
  } finally {
    await client.close()
  }
}
