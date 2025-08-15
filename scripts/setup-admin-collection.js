const { MongoClient } = require("mongodb")

async function setupAdminCollection() {
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

    // Create admin collection if it doesn't exist
    const exists = await db.listCollections({ name: "admins" }).hasNext()
    if (!exists) {
      await db.createCollection("admins")
      console.log("Created collection: admins")
    } else {
      console.log("Collection already exists: admins")
    }

    // Create indexes for admin collection
    await db.collection("admins").createIndex({ email: 1 }, { unique: true })
    await db.collection("admins").createIndex({ createdAt: -1 })
    console.log("Created indexes for admins collection")

    console.log("Admin collection setup completed successfully!")
  } catch (error) {
    console.error("Error setting up admin collection:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

setupAdminCollection()
