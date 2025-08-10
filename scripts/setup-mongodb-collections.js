const { MongoClient } = require("mongodb")

async function setupCollections() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(dbName)

    // Create collections if they don't exist
    const collections = ["events", "halls", "bookings", "payments"]

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
    await db.collection("events").createIndex({ date: 1, time: 1 })
    await db.collection("events").createIndex({ event_type: 1 })
    await db.collection("events").createIndex({ hall_id: 1 })
    console.log("Created indexes for events collection")

    // Halls collection indexes
    await db.collection("halls").createIndex({ name: 1 }, { unique: true })
    console.log("Created indexes for halls collection")

    // Bookings collection indexes
    await db.collection("bookings").createIndex({ customerEmail: 1 })
    await db.collection("bookings").createIndex({ eventId: 1 })
    await db.collection("bookings").createIndex({ paymentReference: 1 }, { unique: true })
    await db.collection("bookings").createIndex({ createdAt: -1 })
    console.log("Created indexes for bookings collection")

    // Payments collection indexes
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ email: 1 })
    await db.collection("payments").createIndex({ eventId: 1 })
    await db.collection("payments").createIndex({ status: 1 })
    await db.collection("payments").createIndex({ createdAt: -1 })
    console.log("Created indexes for payments collection")

    console.log("MongoDB collections and indexes setup completed successfully!")
  } catch (error) {
    console.error("Error setting up MongoDB collections:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupCollections()
