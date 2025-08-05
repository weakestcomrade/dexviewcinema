const { MongoClient } = require("mongodb")

const uri = process.env.MONGODB_URI
const dbName = "con5" // Ensure this matches your connection string's database name

if (!uri) {
  console.error("MONGODB_URI environment variable is not set.")
  process.exit(1)
}

const eventsData = [
  {
    title: "El Clasico - Real Madrid vs Barcelona",
    event_type: "match",
    category: "Big Match",
    event_date: "2024-03-15",
    event_time: "20:00",
    hall_id: "VIP Hall", // Using string for hall name for simplicity, can be ID
    ticket_price: 3000,
    status: "active",
    image_url: "/placeholder.svg?height=300&width=500&text=El+Clasico",
    description: "The biggest match of the season between two football giants",
    duration: "90 minutes + extra time",
    total_seats: 22,
  },
  {
    title: "Dune: Part Two",
    event_type: "movie",
    category: "Blockbuster",
    event_date: "2024-03-16",
    event_time: "19:30",
    hall_id: "Cinema Hall 1", // Using string for hall name for simplicity, can be ID
    ticket_price: 7500,
    status: "active",
    image_url: "/placeholder.svg?height=300&width=500&text=Dune+Part+Two",
    description: "Epic sci-fi masterpiece continues with stunning visuals and compelling storytelling",
    duration: "165 minutes",
    total_seats: 48,
  },
  {
    title: "Manchester United vs Liverpool",
    event_type: "match",
    category: "Premium Match",
    event_date: "2024-03-17",
    event_time: "16:00",
    hall_id: "VIP Hall",
    ticket_price: 2500,
    status: "draft",
    image_url: "/placeholder.svg?height=300&width=500&text=Man+Utd+vs+Liverpool",
    description: "A classic Premier League rivalry",
    duration: "90 minutes + extra time",
    total_seats: 22,
  },
  {
    title: "The Matrix Resurrections",
    event_type: "movie",
    category: "Action",
    event_date: "2024-03-18",
    event_time: "21:00",
    hall_id: "Cinema Hall 2",
    ticket_price: 6000,
    status: "active",
    image_url: "/placeholder.svg?height=300&width=500&text=The+Matrix+Resurrections",
    description: "The fourth installment in the Matrix franchise",
    duration: "148 minutes",
    total_seats: 60,
  },
  {
    title: "Champions League Final",
    event_type: "match",
    category: "Champions League",
    event_date: "2024-06-01",
    event_time: "21:00",
    hall_id: "VIP Hall",
    ticket_price: 4000,
    status: "draft",
    image_url: "/placeholder.svg?height=300&width=500&text=Champions+League+Final",
    description: "The grand finale of Europe's premier club competition",
    duration: "90 minutes + extra time",
    total_seats: 22,
  },
]

async function seedDatabase() {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB Atlas")

    const db = client.db(dbName)
    const eventsCollection = db.collection("events")

    // Clear existing data (optional, for fresh seeding)
    await eventsCollection.deleteMany({})
    console.log("Cleared existing events data.")

    // Insert new data
    const result = await eventsCollection.insertMany(eventsData)
    console.log(`${result.insertedCount} events inserted successfully.`)
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
    console.log("MongoDB connection closed.")
  }
}

seedDatabase()
