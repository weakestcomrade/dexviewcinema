// Script to create and configure the admins collection in MongoDB
const { MongoClient } = require("mongodb")

async function setupAdminCollection() {
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

    // Check if admins collection already exists
    const collections = await db.listCollections({ name: "admins" }).toArray()

    if (collections.length > 0) {
      console.log("ℹ️ Admins collection already exists")

      // Ensure indexes exist
      const existingIndexes = await db.collection("admins").indexes()
      const hasEmailIndex = existingIndexes.some((index) => index.key && index.key.email === 1)

      if (!hasEmailIndex) {
        await db.collection("admins").createIndex({ email: 1 }, { unique: true })
        console.log("✅ Created unique email index on existing admins collection")
      }

      return
    }

    // Create admins collection with validation schema
    await db.createCollection("admins", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "email", "password", "role", "createdAt", "updatedAt"],
          properties: {
            name: {
              bsonType: "string",
              minLength: 2,
              maxLength: 100,
              description: "Admin full name (2-100 characters)",
            },
            email: {
              bsonType: "string",
              pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              description: "Valid email address",
            },
            password: {
              bsonType: "string",
              minLength: 60,
              maxLength: 60,
              description: "Bcrypt hashed password (60 characters)",
            },
            role: {
              bsonType: "string",
              enum: ["admin", "super_admin"],
              description: "Admin role: admin or super_admin",
            },
            createdAt: {
              bsonType: "date",
              description: "Account creation timestamp",
            },
            updatedAt: {
              bsonType: "date",
              description: "Last update timestamp",
            },
            lastLogin: {
              bsonType: ["date", "null"],
              description: "Last login timestamp (optional)",
            },
            isActive: {
              bsonType: "bool",
              description: "Account status (optional, defaults to true)",
            },
          },
        },
      },
    })

    console.log("✅ Created admins collection with validation schema")

    // Create indexes
    await db.collection("admins").createIndex({ email: 1 }, { unique: true })
    console.log("✅ Created unique index on email field")

    await db.collection("admins").createIndex({ role: 1 })
    console.log("✅ Created index on role field")

    await db.collection("admins").createIndex({ createdAt: 1 })
    console.log("✅ Created index on createdAt field")

    await db.collection("admins").createIndex({ isActive: 1 })
    console.log("✅ Created index on isActive field")

    console.log("🎉 Admin collection setup completed successfully!")
  } catch (error) {
    console.error("❌ Error setting up admin collection:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("🔌 Database connection closed")
  }
}

// Run the setup
setupAdminCollection()
