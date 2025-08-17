import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import jsPDF from "jspdf"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()

    // Fetch booking data
    const booking = await db.collection("bookings").findOne({ _id: params.id })
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Fetch event and hall data
    let event = null
    let hall = null

    if (booking.eventId) {
      event = await db.collection("events").findOne({ _id: booking.eventId })
      if (event?.hall_id) {
        hall = await db.collection("halls").findOne({ _id: event.hall_id })
      }
    }

    // Create PDF
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPosition = 20

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = pdf.splitTextToSize(text, maxWidth)
        pdf.text(lines, x, y)
        return y + lines.length * 7
      } else {
        pdf.text(text, x, y)
        return y + 7
      }
    }

    // Header
    pdf.setFontSize(24)
    pdf.setTextColor(220, 38, 127) // Brand red color
    yPosition = addText("Dex View Cinema", pageWidth / 2, yPosition)
    pdf.setFontSize(12)
    pdf.setTextColor(100, 100, 100)
    yPosition = addText("Premium Entertainment Experience", pageWidth / 2, yPosition) + 10

    // Booking Receipt Title
    pdf.setFontSize(18)
    pdf.setTextColor(0, 0, 0)
    yPosition = addText("BOOKING RECEIPT", pageWidth / 2, yPosition) + 15

    // Customer Information
    pdf.setFontSize(14)
    pdf.setTextColor(220, 38, 127)
    yPosition = addText("Customer Information", 20, yPosition) + 5

    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    yPosition = addText(`Name: ${booking.customerName}`, 20, yPosition)
    yPosition = addText(`Email: ${booking.customerEmail}`, 20, yPosition, pageWidth - 40)
    yPosition = addText(`Phone: ${booking.customerPhone}`, 20, yPosition) + 10

    // Booking Details
    pdf.setFontSize(14)
    pdf.setTextColor(220, 38, 127)
    yPosition = addText("Booking Details", 20, yPosition) + 5

    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    yPosition = addText(`Booking Code: ${booking.bookingCode || booking._id}`, 20, yPosition)
    yPosition = addText(`Date: ${booking.bookingDate}`, 20, yPosition)
    yPosition = addText(`Time: ${booking.bookingTime}`, 20, yPosition)
    yPosition = addText(`Payment Method: ${booking.paymentMethod}`, 20, yPosition)
    yPosition = addText(`Status: ${booking.status.toUpperCase()}`, 20, yPosition) + 10

    // Event Information
    pdf.setFontSize(14)
    pdf.setTextColor(220, 38, 127)
    yPosition = addText("Event Information", 20, yPosition) + 5

    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    yPosition = addText(
      `Event: ${booking.eventTitle} (${booking.eventType === "match" ? "Sports Match" : "Movie"})`,
      20,
      yPosition,
      pageWidth - 40,
    )
    yPosition = addText(`Venue: ${hall?.name || "N/A"}`, 20, yPosition)

    const seatsFormatted = booking.seats
      ?.map((seatId: string) => (seatId.includes("-") ? seatId.split("-")[1] : seatId))
      .join(", ")
    yPosition = addText(`Seats: ${seatsFormatted} (${booking.seatType})`, 20, yPosition, pageWidth - 40)

    if (event?.event_date) {
      yPosition = addText(`Event Date: ${new Date(event.event_date).toLocaleDateString()}`, 20, yPosition)
    }
    if (event?.event_time) {
      yPosition = addText(`Event Time: ${event.event_time}`, 20, yPosition)
    }
    yPosition += 10

    // Payment Summary
    pdf.setFontSize(14)
    pdf.setTextColor(220, 38, 127)
    yPosition = addText("Payment Summary", 20, yPosition) + 5

    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    yPosition = addText(`Base Amount: ₦${booking.amount?.toLocaleString() || "0"}`, 20, yPosition)

    pdf.setFontSize(12)
    pdf.setFont(undefined, "bold")
    yPosition = addText(`Total Amount: ₦${booking.totalAmount?.toLocaleString() || "0"}`, 20, yPosition) + 15

    // Footer
    pdf.setFontSize(8)
    pdf.setFont(undefined, "normal")
    pdf.setTextColor(100, 100, 100)
    yPosition = addText("Thank you for choosing Dex View Cinema!", pageWidth / 2, yPosition)
    yPosition = addText(
      "For support, email us at support@dexviewcinema.com or call 08139614950",
      pageWidth / 2,
      yPosition,
    )
    addText("Developed by SydaTech - www.sydatech.com.ng", pageWidth / 2, yPosition)

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dex-view-cinema-${booking.bookingCode || booking._id}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
