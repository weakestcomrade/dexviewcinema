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

    // Create indexes
    await db.collection("events").createIndex({ date: 1 })
    await db.collection("events").createIndex({ hallId: 1 })
    await db.collection("bookings").createIndex({ eventId: 1 })
    await db.collection("bookings").createIndex({ customerEmail: 1 })
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ status: 1 })

    console.log("Indexes created successfully")
    console.log("MongoDB collections setup completed!")
  } catch (error) {
    console.error("Error setting up collections:", error)
  } finally {
    await client.close()
  }
}

setupCollections()
