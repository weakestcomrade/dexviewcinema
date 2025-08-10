import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const dbName = process.env.MONGODB_DB || "dex_view_cinema"

if (!uri) {
  console.error("MONGODB_URI environment variable is not set.")
  process.exit(1)
}

if (!dbName) {
  console.error("MONGODB_DB environment variable is not set.")
  process.exit(1)
}

async function seedDatabase() {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for seeding")
    const db = client.db(dbName)

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await db.collection('events').deleteMany({});
    // await db.collection('halls').deleteMany({});
    // console.log('Cleared existing data');

    // Seed Halls
    const hallsCollection = db.collection("halls")
    const existingHalls = await hallsCollection.find({}).toArray()

    const initialHalls = [
      {
        _id: "hall_a",
        name: "Hall A",
        type: "standard",
        capacity: 60,
        description: "Standard cinema hall with comfortable seating",
        features: ["Digital Projection", "Surround Sound", "Air Conditioning"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "hall_b",
        name: "Hall B",
        type: "standard",
        capacity: 48,
        description: "Cozy standard hall perfect for intimate screenings",
        features: ["Digital Projection", "Surround Sound", "Air Conditioning"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "vip_hall",
        name: "VIP Hall",
        type: "vip",
        capacity: 48,
        description: "Premium VIP experience with luxury seating options",
        features: ["4K Digital Projection", "Dolby Atmos", "Premium Seating", "Concierge Service"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    for (const hall of initialHalls) {
      const exists = existingHalls.some((h) => h._id === hall._id)
      if (!exists) {
        await hallsCollection.insertOne(hall)
        console.log(`Inserted hall: ${hall.name}`)
      } else {
        console.log(`Hall already exists: ${hall.name}`)
      }
    }
    console.log("Seeded halls collection")

    // Seed Events
    const eventsCollection = db.collection("events")
    const existingEvents = await eventsCollection.find({}).toArray()

    const initialEvents = [
      {
        title: "The Matrix",
        event_type: "movie",
        category: "Action/Sci-Fi",
        event_date: "2025-01-15",
        event_time: "19:00",
        hall_id: "hall_a",
        status: "active",
        image_url: "/placeholder.jpg",
        description: "Follow Neo as he discovers the truth about reality in this groundbreaking sci-fi thriller.",
        duration: "136 minutes",
        pricing: {
          standardSingle: { price: 2500, count: 60 },
        },
        bookedSeats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Arsenal vs Chelsea",
        event_type: "match",
        category: "Premier League",
        event_date: "2025-01-16",
        event_time: "16:30",
        hall_id: "vip_hall",
        status: "active",
        image_url: "/placeholder.jpg",
        description: "Watch the London Derby live in our premium VIP hall with luxury seating.",
        duration: "120 minutes",
        pricing: {
          vipSofaSeats: { price: 5000, count: 10 },
          vipRegularSeats: { price: 3500, count: 12 },
        },
        bookedSeats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Avengers: Endgame",
        event_type: "movie",
        category: "Action/Adventure",
        event_date: "2025-01-17",
        event_time: "20:00",
        hall_id: "vip_hall",
        status: "active",
        image_url: "/placeholder.jpg",
        description: "The epic conclusion to the Infinity Saga. Experience it in our premium VIP hall.",
        duration: "181 minutes",
        pricing: {
          vipSingle: { price: 4000, count: 20 },
          vipCouple: { price: 7500, count: 14 },
          vipFamily: { price: 12000, count: 14 },
        },
        bookedSeats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Manchester United vs Liverpool",
        event_type: "match",
        category: "Premier League",
        event_date: "2025-01-18",
        event_time: "17:00",
        hall_id: "hall_b",
        status: "active",
        image_url: "/placeholder.jpg",
        description: "The biggest rivalry in English football. Don't miss this classic encounter.",
        duration: "120 minutes",
        pricing: {
          standardMatchSeats: { price: 3000, count: 48 },
        },
        bookedSeats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Spider-Man: No Way Home",
        event_type: "movie",
        category: "Action/Adventure",
        event_date: "2025-01-19",
        event_time: "18:30",
        hall_id: "hall_b",
        status: "active",
        image_url: "/placeholder.jpg",
        description: "Three generations of Spider-Man unite in this multiverse adventure.",
        duration: "148 minutes",
        pricing: {
          standardSingle: { price: 2800, count: 48 },
        },
        bookedSeats: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    for (const event of initialEvents) {
      const exists = existingEvents.some((e) => e.title === event.title)
      if (!exists) {
        await eventsCollection.insertOne(event)
        console.log(`Inserted event: ${event.title}`)
      } else {
        console.log(`Event already exists: ${event.title}`)
      }
    }

    console.log("Database seeding complete.")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
    console.log("Disconnected from MongoDB")
  }
}

seedDatabase()
