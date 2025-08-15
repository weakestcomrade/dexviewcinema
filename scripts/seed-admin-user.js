// Script to create a default super admin user
const { MongoClient } = require("mongodb")
const bcrypt = require("bcryptjs")

async function seedAdminUser() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set")
    process.exit(1)
  }

  if (!process.env.MONGODB_DB) {
    console.error("❌ MONGODB_DB environment variable is not set")
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    console.log("🔗 Connecting to MongoDB...")
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Check if any admin users already exist
    const existingAdmins = await db.collection("admins").countDocuments()

    if (existingAdmins > 0) {
      console.log("ℹ️ Admin users already exist. Skipping seed.")
      return
    }

    // Create default super admin
    const defaultAdmin = {
      name: "Super Administrator",
      email: "admin@dexviewcinema.com",
      password: await bcrypt.hash("admin123", 12), // Default password - should be changed
      role: "super_admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
    }

    const result = await db.collection("admins").insertOne(defaultAdmin)

    console.log("✅ Created default super admin user:")
    console.log(`   📧 Email: ${defaultAdmin.email}`)
    console.log(`   🔑 Password: admin123 (CHANGE THIS IMMEDIATELY!)`)
    console.log(`   👤 Role: ${defaultAdmin.role}`)
    console.log(`   🆔 ID: ${result.insertedId}`)

    console.log("\n⚠️  SECURITY WARNING:")
    console.log("   Please change the default password immediately after first login!")
    console.log("   The default credentials are for initial setup only.")
  } catch (error) {
    console.error("❌ Error seeding admin user:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("🔌 Database connection closed")
  }
}

// Run the seed
seedAdminUser()
