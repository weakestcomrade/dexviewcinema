const { MongoClient } = require("mongodb")
const bcrypt = require("bcryptjs")

async function createAdminUser() {
  console.log("🚀 Starting admin user creation process...")

  // Check environment variables
  const mongoUri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  console.log("📋 Environment check:")
  console.log("- MONGODB_URI:", mongoUri ? "✅ Set" : "❌ Missing")
  console.log("- MONGODB_DB:", dbName ? `✅ Set (${dbName})` : "❌ Missing")

  if (!mongoUri || !dbName) {
    console.error("❌ Missing required environment variables")
    process.exit(1)
  }

  let client

  try {
    console.log("🔌 Connecting to MongoDB...")
    client = new MongoClient(mongoUri)
    await client.connect()
    console.log("✅ Connected to MongoDB successfully")

    const db = client.db(dbName)
    const usersCollection = db.collection("users")

    // Check if admin user already exists
    console.log("🔍 Checking for existing admin user...")
    const existingAdmin = await usersCollection.findOne({
      email: "admin@dexcinema.com",
    })

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:")
      console.log("- Email:", existingAdmin.email)
      console.log("- Role:", existingAdmin.role)
      console.log("- Created:", existingAdmin.createdAt)

      // Update password anyway
      console.log("🔄 Updating admin password...")
      const hashedPassword = await bcrypt.hash("admin123", 12)
      await usersCollection.updateOne(
        { email: "admin@dexcinema.com" },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        },
      )
      console.log("✅ Admin password updated successfully")
    } else {
      console.log("👤 Creating new admin user...")
      const hashedPassword = await bcrypt.hash("admin123", 12)

      const adminUser = {
        email: "admin@dexcinema.com",
        password: hashedPassword,
        role: "admin",
        name: "Admin User",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await usersCollection.insertOne(adminUser)
      console.log("✅ Admin user created successfully")
      console.log("- User ID:", result.insertedId)
      console.log("- Email: admin@dexcinema.com")
      console.log("- Password: admin123")
    }

    // Verify the user exists and can be found
    console.log("🔍 Verifying admin user...")
    const verifyUser = await usersCollection.findOne({
      email: "admin@dexcinema.com",
    })

    if (verifyUser) {
      console.log("✅ Admin user verification successful:")
      console.log("- Email:", verifyUser.email)
      console.log("- Role:", verifyUser.role)
      console.log("- Password hash length:", verifyUser.password.length)

      // Test password verification
      const passwordMatch = await bcrypt.compare("admin123", verifyUser.password)
      console.log("- Password verification:", passwordMatch ? "✅ Valid" : "❌ Invalid")
    } else {
      console.error("❌ Admin user verification failed - user not found")
    }

    console.log("🎉 Admin user setup completed successfully!")
  } catch (error) {
    console.error("❌ Error during admin user creation:")
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log("🔌 MongoDB connection closed")
    }
  }
}

createAdminUser()
