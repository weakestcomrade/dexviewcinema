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

    // Ensure payments collection exists
    const exists = await db.listCollections({ name: "payments" }).hasNext()
    if (!exists) {
      await db.createCollection("payments")
      console.log("Created payments collection")
    }

    // Create specific indexes for payments
    await db.collection("payments").createIndex({ reference: 1 }, { unique: true })
    await db.collection("payments").createIndex({ status: 1 })
    await db.collection("payments").createIndex({ email: 1 })
    await db.collection("payments").createIndex({ eventId: 1 })
    await db.collection("payments").createIndex({ createdAt: 1 })

    console.log("Payment collection indexes created successfully")

    // Create sample payment statuses enum validation
    await db.runCommand({
      collMod: "payments",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["reference", "email", "amount", "status"],
          properties: {
            reference: { bsonType: "string" },
            email: { bsonType: "string" },
            amount: { bsonType: "number" },
            status: {
              enum: ["pending", "success", "failed", "abandoned"],
            },
          },
        },
      },
    })

    console.log("Payment collection validation rules applied")
    console.log("Payments collection setup completed!")
  } catch (error) {
    console.error("Error setting up payments collection:", error)
  } finally {
    await client.close()
  }
}

setupPaymentsCollection()
