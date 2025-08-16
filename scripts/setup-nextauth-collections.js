const { MongoClient } = require("mongodb")

async function setupNextAuthCollections() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    console.log("Setting up NextAuth collections...")

    // Create accounts collection for OAuth providers (if needed later)
    await db.createCollection("accounts")
    await db.collection("accounts").createIndex({ userId: 1 })
    await db.collection("accounts").createIndex({ provider: 1, providerAccountId: 1 }, { unique: true })

    // Create sessions collection for session management
    await db.createCollection("sessions")
    await db.collection("sessions").createIndex({ sessionToken: 1 }, { unique: true })
    await db.collection("sessions").createIndex({ userId: 1 })
    await db.collection("sessions").createIndex({ expires: 1 }, { expireAfterSeconds: 0 })

    // Create verification_tokens collection for email verification
    await db.createCollection("verification_tokens")
    await db.collection("verification_tokens").createIndex({ token: 1 }, { unique: true })
    await db.collection("verification_tokens").createIndex({ identifier: 1, token: 1 }, { unique: true })

    // Update existing users collection to be compatible with NextAuth
    const usersCollection = db.collection("users")

    // Add indexes for NextAuth compatibility
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await usersCollection.createIndex({ role: 1 })

    console.log("NextAuth collections and indexes created successfully!")
  } catch (error) {
    console.error("Error setting up NextAuth collections:", error)
  } finally {
    await client.close()
  }
}

setupNextAuthCollections()
