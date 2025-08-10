const { MongoClient } = require("mongodb")

async function setupPaymentsCollection() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(process.env.MONGODB_DB)

    // Create payments collection if it doesn't exist
    const collections = await db.listCollections({ name: "payments" }).toArray()
    if (collections.length === 0) {
      await db.createCollection("payments")
      console.log("Created payments collection")
    }

    // Create indexes for payments collection
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ eventId: 1 })
    await db.collection("payments").createIndex({ customerEmail: 1 })
    await db.collection("payments").createIndex({ status: 1 })
    await db.collection("payments").createIndex({ createdAt: 1 })

    console.log("Created indexes for payments collection")

    // Ensure bookings collection has payment reference index
    await db.collection("bookings").createIndex({ paymentReference: 1 })
    console.log("Created payment reference index for bookings collection")

    console.log("Payments collection setup completed successfully")
  } catch (error) {
    console.error("Error setting up payments collection:", error)
    throw error
  } finally {
    await client.close()
  }
}

// Run the setup
setupPaymentsCollection().catch(console.error)
