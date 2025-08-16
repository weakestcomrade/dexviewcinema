const { MongoClient } = require("mongodb")

async function initializeCounters() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for counters initialization")

    const db = client.db(dbName)

    // Create counters collection if it doesn't exist
    const collections = await db.listCollections({ name: "counters" }).toArray()
    if (collections.length === 0) {
      await db.createCollection("counters")
      console.log("Created counters collection")
    }

    // Check if booking counter already exists
    const existingBookingCounter = await db.collection("counters").findOne({ _id: "booking" })

    if (!existingBookingCounter) {
      // Initialize booking counter starting from 1
      await db.collection("counters").insertOne({ _id: "booking", seq: 0 })
      console.log("Initialized booking counter starting from 0 (next will be 1)")
    } else {
      console.log(`Booking counter already exists with sequence: ${existingBookingCounter.seq}`)
    }

    // Create index for better performance
    await db.collection("counters").createIndex({ _id: 1 }, { unique: true })
    console.log("Created index for counters collection")

    console.log("Counters initialization completed successfully!")
  } catch (error) {
    console.error("Error initializing counters:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

initializeCounters()
