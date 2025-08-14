// Setup script for admin collection with validation and indexes
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

    // Check if admins collection exists
    const collections = await db.listCollections({ name: "admins" }).toArray()

    if (collections.length > 0) {
      console.log("Admins collection already exists")
    } else {
      // Create admins collection with validation schema
      await db.createCollection("admins", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["email", "password", "name", "role", "createdAt"],
            properties: {
              email: {
                bsonType: "string",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                description: "Must be a valid email address",
              },
              password: {
                bsonType: "string",
                minLength: 6,
                description: "Must be a string with at least 6 characters",
              },
              name: {
                bsonType: "string",
                minLength: 2,
                description: "Must be a string with at least 2 characters",
              },
              role: {
                bsonType: "string",
                enum: ["admin", "super_admin"],
                description: "Must be either admin or super_admin",
              },
              createdAt: {
                bsonType: "date",
                description: "Must be a date",
              },
              updatedAt: {
                bsonType: "date",
                description: "Must be a date",
              },
              lastLogin: {
                bsonType: "date",
                description: "Must be a date",
              },
              isActive: {
                bsonType: "bool",
                description: "Must be a boolean",
              },
            },
          },
        },
      })
      console.log("Created admins collection with validation schema")
    }

    // Create unique index on email
    await db.collection("admins").createIndex({ email: 1 }, { unique: true, name: "email_unique_index" })
    console.log("Created unique index on email field")

    // Create index on role for faster queries
    await db.collection("admins").createIndex({ role: 1 }, { name: "role_index" })
    console.log("Created index on role field")

    // Create index on createdAt for sorting
    await db.collection("admins").createIndex({ createdAt: -1 }, { name: "created_at_index" })
    console.log("Created index on createdAt field")

    console.log("Admin collection setup completed successfully")
  } catch (error) {
    console.error("Error setting up admin collection:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("Disconnected from MongoDB")
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupAdminCollection()
}

module.exports = { setupAdminCollection }
