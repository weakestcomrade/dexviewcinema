// MongoDB Payments Collection Setup
// This script ensures the payments collection is properly configured

const { MongoClient } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const MONGODB_DB = process.env.MONGODB_DB || "dex_view_cinema"

async function setupPaymentsCollection() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(MONGODB_DB)

    // Create payments collection if it doesn't exist
    const exists = await db.listCollections({ name: "payments" }).hasNext()
    if (!exists) {
      await db.createCollection("payments")
      console.log("Created payments collection")
    } else {
      console.log("Payments collection already exists")
    }

    // Create indexes for the payments collection
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ eventId: 1 })
    await db.collection("payments").createIndex({ customerEmail: 1 })
    await db.collection("payments").createIndex({ status: 1 })
    await db.collection("payments").createIndex({ createdAt: -1 })

    console.log("Payments collection indexes created successfully")

    // Verify the collection structure
    const indexes = await db.collection("payments").indexes()
    console.log("Current indexes on payments collection:")
    indexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`)
    })
  } catch (error) {
    console.error("Error setting up payments collection:", error)
  } finally {
    await client.close()
  }
}

// Run the setup
setupPaymentsCollection()
