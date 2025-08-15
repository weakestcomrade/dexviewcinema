const { MongoClient } = require("mongodb")

async function createAdminCollection() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(process.env.MONGODB_DB)

    // Create admins collection
    const adminsCollection = db.collection("admins")

    // Create unique index on username
    await adminsCollection.createIndex({ username: 1 }, { unique: true })
    await adminsCollection.createIndex({ email: 1 }, { unique: true })

    console.log("Admin collection created with indexes")
  } catch (error) {
    console.error("Error creating admin collection:", error)
  } finally {
    await client.close()
  }
}

createAdminCollection()
