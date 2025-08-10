const { MongoClient } = require("mongodb")

async function setupPaymentsCollection() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for payments setup")

    const db = client.db(dbName)

    // Create payments collection if it doesn't exist
    const exists = await db.listCollections({ name: "payments" }).hasNext()
    if (!exists) {
      await db.createCollection("payments")
      console.log("Created payments collection")
    } else {
      console.log("Payments collection already exists")
    }

    // Create comprehensive indexes for payments collection
    const indexes = [
      { key: { reference: 1 }, options: { unique: true, name: "reference_unique" } },
      { key: { email: 1 }, options: { name: "email_index" } },
      { key: { eventId: 1 }, options: { name: "eventId_index" } },
      { key: { status: 1 }, options: { name: "status_index" } },
      { key: { createdAt: -1 }, options: { name: "createdAt_desc" } },
      { key: { customerName: 1 }, options: { name: "customerName_index" } },
      { key: { customerPhone: 1 }, options: { name: "customerPhone_index" } },
      { key: { bookingId: 1 }, options: { sparse: true, name: "bookingId_sparse" } },
    ]

    for (const index of indexes) {
      try {
        await db.collection("payments").createIndex(index.key, index.options)
        console.log(`Created index: ${index.options.name}`)
      } catch (error) {
        if (error.code === 85) {
          // Index already exists
          console.log(`Index already exists: ${index.options.name}`)
        } else {
          console.error(`Error creating index ${index.options.name}:`, error.message)
        }
      }
    }

    // Create a compound index for efficient queries
    try {
      await db.collection("payments").createIndex({ status: 1, createdAt: -1 }, { name: "status_createdAt_compound" })
      console.log("Created compound index: status_createdAt_compound")
    } catch (error) {
      if (error.code === 85) {
        console.log("Compound index already exists: status_createdAt_compound")
      } else {
        console.error("Error creating compound index:", error.message)
      }
    }

    // Verify collection structure
    const stats = await db.collection("payments").stats()
    console.log(`Payments collection stats:`)
    console.log(`- Documents: ${stats.count || 0}`)
    console.log(`- Indexes: ${stats.nindexes || 0}`)

    console.log("Payments collection setup completed successfully!")
  } catch (error) {
    console.error("Error setting up payments collection:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupPaymentsCollection()
