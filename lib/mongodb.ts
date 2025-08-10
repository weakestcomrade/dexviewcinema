import { MongoClient } from "mongodb"

let client: MongoClient
let clientPromise: Promise<MongoClient>

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB!

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local")
}

if (!dbName) {
  throw new Error("Please add your Mongo DB Name to .env.local")
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongoClientPromise = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongoClientPromise._mongoClientPromise) {
    client = new MongoClient(uri)
    globalWithMongoClientPromise._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongoClientPromise._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export async function connectToDatabase() {
  const client = await clientPromise
  const db = client.db(dbName)
  return { client, db }
}
