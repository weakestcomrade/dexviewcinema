const { MongoClient } = require("mongodb")
const bcrypt = require("bcryptjs")

async function seedAdminUser() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db(process.env.MONGODB_DB)
    const adminsCollection = db.collection("admins")

    // Check if admin already exists
    const existingAdmin = await adminsCollection.findOne({ username: "admin" })

    if (existingAdmin) {
      console.log("Admin user already exists")
      return
    }

    // Hash the default password
    const hashedPassword = await bcrypt.hash("admin123", 12)

    // Create default admin user
    const adminUser = {
      username: "admin",
      email: "admin@dexcinema.com",
      password: hashedPassword,
      role: "admin",
      createdAt: new Date(),
      isActive: true,
    }

    await adminsCollection.insertOne(adminUser)
    console.log("Default admin user created successfully")
    console.log("Username: admin")
    console.log("Password: admin123")
    console.log("Please change the password after first login")
  } catch (error) {
    console.error("Error seeding admin user:", error)
  } finally {
    await client.close()
  }
}

seedAdminUser()
