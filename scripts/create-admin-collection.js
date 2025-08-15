// Script to create the admins collection in MongoDB
const { MongoClient } = require("mongodb")

async function createAdminCollection() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(process.env.MONGODB_DB)

    // Create admins collection with validation
    await db.createCollection("admins", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: {
              bsonType: "string",
              description: "Admin name is required",
            },
            email: {
              bsonType: "string",
              pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              description: "Valid email is required",
            },
            password: {
              bsonType: "string",
              description: "Hashed password is required",
            },
            role: {
              bsonType: "string",
              enum: ["admin", "super_admin"],
              description: "Role must be admin or super_admin",
            },
            createdAt: {
              bsonType: "date",
              description: "Creation timestamp",
            },
            updatedAt: {
              bsonType: "date",
              description: "Last update timestamp",
            },
          },
        },
      },
    })

    // Create unique index on email
    await db.collection("admins").createIndex({ email: 1 }, { unique: true })

    console.log("✅ Admins collection created successfully with validation and unique email index")
  } catch (error) {
    if (error.code === 48) {
      console.log("ℹ️ Admins collection already exists")
    } else {
      console.error("❌ Error creating admins collection:", error)
    }
  } finally {
    await client.close()
  }
}

createAdminCollection()
