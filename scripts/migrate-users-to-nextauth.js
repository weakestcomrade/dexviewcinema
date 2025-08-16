const { MongoClient } = require("mongodb")

async function migrateUsersToNextAuth() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    console.log("Migrating users to NextAuth format...")

    const usersCollection = db.collection("users")

    // Update all existing users to ensure they have required fields
    const users = await usersCollection.find({}).toArray()

    for (const user of users) {
      const updates = {}

      // Ensure name field exists (NextAuth expects this)
      if (!user.name && user.username) {
        updates.name = user.username
      }

      // Ensure role field exists
      if (!user.role) {
        updates.role = "admin" // Default to admin for existing users
      }

      // Add NextAuth compatible fields
      if (!user.emailVerified) {
        updates.emailVerified = null
      }

      if (!user.image) {
        updates.image = null
      }

      // Update user if there are changes
      if (Object.keys(updates).length > 0) {
        await usersCollection.updateOne({ _id: user._id }, { $set: updates })
        console.log(`Updated user: ${user.email}`)
      }
    }

    console.log("User migration completed successfully!")
  } catch (error) {
    console.error("Error migrating users:", error)
  } finally {
    await client.close()
  }
}

migrateUsersToNextAuth()
