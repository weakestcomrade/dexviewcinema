const { MongoClient } = require("mongodb")

async function createUsersCollection() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for users collection setup")

    const db = client.db(dbName)

    // Create users collection with validation schema
    await db.createCollection("users", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "password", "name", "role", "createdAt", "updatedAt"],
          properties: {
            email: {
              bsonType: "string",
              pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              description: "must be a valid email address",
            },
            password: {
              bsonType: "string",
              minLength: 8,
              description: "must be a string with at least 8 characters",
            },
            name: {
              bsonType: "string",
              minLength: 2,
              description: "must be a string with at least 2 characters",
            },
            phone: {
              bsonType: ["string", "null"],
              description: "must be a string or null",
            },
            role: {
              bsonType: "string",
              enum: ["admin", "customer"],
              description: "must be either 'admin' or 'customer'",
            },
            createdAt: {
              bsonType: "date",
              description: "must be a date",
            },
            updatedAt: {
              bsonType: "date",
              description: "must be a date",
            },
          },
        },
      },
    })

    // Create unique index on email
    await db.collection("users").createIndex({ email: 1 }, { unique: true })

    // Create index on role for efficient queries
    await db.collection("users").createIndex({ role: 1 })

    console.log("Users collection created successfully with validation schema and indexes!")
    console.log("- Unique index on email field")
    console.log("- Index on role field")
    console.log("- Validation schema for required fields and data types")
  } catch (error) {
    if (error.code === 48) {
      console.log("Users collection already exists, skipping creation")
    } else {
      console.error("Error creating users collection:", error)
      process.exit(1)
    }
  } finally {
    await client.close()
  }
}

createUsersCollection()
