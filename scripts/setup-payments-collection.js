// MongoDB script to set up payments collection with proper indexes
// Run this script using: node scripts/setup-payments-collection.js

const { MongoClient } = require("mongodb")

async function setupPaymentsCollection() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Please set MONGODB_URI and MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(dbName)
    const paymentsCollection = db.collection("payments")

    // Create indexes for payments collection
    await paymentsCollection.createIndex({ reference: 1 }, { unique: true })
    await paymentsCollection.createIndex({ eventId: 1 })
    await paymentsCollection.createIndex({ customerEmail: 1 })
    await paymentsCollection.createIndex({ status: 1 })
    await paymentsCollection.createIndex({ createdAt: 1 })
    await paymentsCollection.createIndex({ bookingId: 1 })

    console.log("Payments collection indexes created successfully")

    // Update bookings collection to include payment reference
    const bookingsCollection = db.collection("bookings")
    await bookingsCollection.createIndex({ paymentReference: 1 })
    await bookingsCollection.createIndex({ paystackTransactionId: 1 })

    console.log("Bookings collection payment indexes created successfully")
  } catch (error) {
    console.error("Error setting up payments collection:", error)
  } finally {
    await client.close()
    console.log("MongoDB connection closed")
  }
}

setupPaymentsCollection()
