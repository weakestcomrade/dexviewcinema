const { MongoClient } = require("mongodb")

async function createAdminCollection() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Create admins collection with unique email index
    const adminsCollection = db.collection("admins")

    // Create unique index on email field
    await adminsCollection.createIndex({ email: 1 }, { unique: true })

    console.log("✅ Admin collection created successfully with unique email index")

    // Create indexes for better performance
    await adminsCollection.createIndex({ createdAt: 1 })
    await adminsCollection.createIndex({ role: 1 })

    console.log("✅ Admin collection indexes created successfully")
  } catch (error) {
    console.error("❌ Error creating admin collection:", error)
  } finally {
    await client.close()
  }
}

createAdminCollection()
