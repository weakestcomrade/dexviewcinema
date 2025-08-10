// MongoDB Collection Setup Script
// This script sets up all necessary collections and indexes for the Dex View Cinema application

const { MongoClient } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const MONGODB_DB = process.env.MONGODB_DB || "dex_view_cinema"

async function setupCollections() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(MONGODB_DB)

    // Create collections if they don't exist
    const collections = ["events", "bookings", "payments", "halls"]

    for (const collectionName of collections) {
      const exists = await db.listCollections({ name: collectionName }).hasNext()
      if (!exists) {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      } else {
        console.log(`Collection already exists: ${collectionName}`)
      }
    }

    // Create indexes for better performance

    // Events collection indexes
    await db.collection("events").createIndex({ event_date: 1, event_time: 1 })
    await db.collection("events").createIndex({ status: 1 })
    await db.collection("events").createIndex({ hall_id: 1 })
    console.log("Created indexes for events collection")

    // Bookings collection indexes
    await db.collection("bookings").createIndex({ eventId: 1 })
    await db.collection("bookings").createIndex({ customerEmail: 1 })
    await db.collection("bookings").createIndex({ paymentReference: 1 }, { unique: true })
    await db.collection("bookings").createIndex({ createdAt: -1 })
    console.log("Created indexes for bookings collection")

    // Payments collection indexes
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ eventId: 1 })
    await db.collection("payments").createIndex({ customerEmail: 1 })
    await db.collection("payments").createIndex({ status: 1 })
    await db.collection("payments").createIndex({ createdAt: -1 })
    console.log("Created indexes for payments collection")

    // Halls collection indexes
    await db.collection("halls").createIndex({ name: 1 }, { unique: true })
    await db.collection("halls").createIndex({ type: 1 })
    console.log("Created indexes for halls collection")

    console.log("MongoDB collections and indexes setup completed successfully!")
  } catch (error) {
    console.error("Error setting up MongoDB collections:", error)
  } finally {
    await client.close()
  }
}

// Run the setup
setupCollections()
