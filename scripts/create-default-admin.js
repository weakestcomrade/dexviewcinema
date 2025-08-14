// Script to create a default admin user
const { MongoClient } = require("mongodb")
const bcrypt = require("bcryptjs")

async function createDefaultAdmin() {
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
    const adminsCollection = db.collection("admins")

    // Check if any admin already exists
    const existingAdmin = await adminsCollection.findOne({})

    if (existingAdmin) {
      console.log("Admin user already exists. Skipping default admin creation.")
      return
    }

    // Create default admin
    const defaultEmail = "admin@dexviewcinema.com"
    const defaultPassword = "admin123" // This should be changed after first login
    const hashedPassword = await bcrypt.hash(defaultPassword, 12)

    const defaultAdmin = {
      email: defaultEmail,
      password: hashedPassword,
      name: "Default Admin",
      role: "super_admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await adminsCollection.insertOne(defaultAdmin)

    console.log("Default admin created successfully!")
    console.log("Email:", defaultEmail)
    console.log("Password:", defaultPassword)
    console.log("⚠️  IMPORTANT: Please change the default password after first login!")
  } catch (error) {
    console.error("Error creating default admin:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("Disconnected from MongoDB")
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  createDefaultAdmin()
}

module.exports = { createDefaultAdmin }
