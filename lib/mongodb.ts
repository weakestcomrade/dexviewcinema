import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!uri) {
  throw new Error("Please add your MONGODB_URI to .env.local")
}

if (!dbName) {
  throw new Error("Please add your MONGODB_DB to .env.local")
}

// In production, it's best to not use a global variable.
// In development, use a global variable so that the client is not created every time.
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    // @ts-ignore
    global._mongoClientPromise = client.connect()
  }
  // @ts-ignore
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    console.log("Connecting to MongoDB...")
    const connectedClient = await clientPromise
    const db = connectedClient.db(dbName)
    console.log("Successfully connected to MongoDB database:", dbName)
    return { client: connectedClient, db }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw error
  }
}
