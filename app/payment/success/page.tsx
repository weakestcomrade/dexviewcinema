"use client"

import { useEffect } from "react"

import { useState } from "react"
import { toast } from "react-toastify"
import { useRouter } from "next/router"

const PaymentSuccessPage = () => {
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { paymentReference } = router.query

  const verifyPayment = async () => {
    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentReference }),
      })

      if (!response.ok) {
        throw new Error("Payment verification failed")
      }

      const result = await response.json()

      if (result.success && result.paymentStatus === "PAID") {
        setPaymentDetails(result)

        // Get booking data from localStorage
        const bookingDataStr = localStorage.getItem(`booking_${paymentReference}`)
        if (bookingDataStr) {
          const bookingData = JSON.parse(bookingDataStr)

          // Complete the booking
          const bookingResponse = await fetch("/api/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...bookingData,
              status: "confirmed",
              paymentReference: paymentReference,
            }),
          })

          if (bookingResponse.ok) {
            // Update event's booked seats
            await fetch(`/api/events/${bookingData.eventId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ newBookedSeats: bookingData.seats }),
            })

            // Clear localStorage
            localStorage.removeItem(`booking_${paymentReference}`)
          }
        }

        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed.",
        })
      } else {
        setError("Payment was not successful")
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Call verifyPayment on component mount
  useEffect(() => {
    verifyPayment()
  }, [])

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {paymentDetails && (
        <div>
          <h1>Payment Successful</h1>
          <p>Your booking has been confirmed.</p>
          {/* Display payment details here */}
        </div>
      )}
    </div>
  )
}

export default PaymentSuccessPage
