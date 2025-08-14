const { MongoClient } = require("mongodb")
const bcrypt = require("bcryptjs")

async function createAdminUser() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Check if admin collection exists
    const collections = await db.listCollections({ name: "admins" }).toArray()
    if (collections.length === 0) {
      await db.createCollection("admins")
      console.log("Created admins collection")
    }

    // Check if admin user already exists
    const existingAdmin = await db.collection("admins").findOne({ email: "admin@dexcinema.com" })
    if (existingAdmin) {
      console.log("Admin user already exists")
      return
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 12)

    const adminUser = {
      email: "admin@dexcinema.com",
      password: hashedPassword,
      name: "Admin User",
      role: "admin",
      createdAt: new Date(),
    }

    await db.collection("admins").insertOne(adminUser)
    console.log("Created default admin user:")
    console.log("Email: admin@dexcinema.com")
    console.log("Password: admin123")
    console.log("Please change the password after first login!")
  } catch (error) {
    console.error("Error creating admin user:", error)
  } finally {
    await client.close()
  }
}

createAdminUser()
