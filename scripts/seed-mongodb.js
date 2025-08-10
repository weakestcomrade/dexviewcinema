const { MongoClient } = require("mongodb")

async function seedDatabase() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB

  if (!uri || !dbName) {
    console.error("Missing MONGODB_URI or MONGODB_DB environment variables")
    process.exit(1)
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for seeding")

    const db = client.db(dbName)

    // Clear existing data
    await db.collection("events").deleteMany({})
    await db.collection("halls").deleteMany({})
    console.log("Cleared existing data")

    // Seed halls
    const halls = [
      {
        _id: "hall-1",
        name: "Hall A",
        capacity: 100,
        layout: {
          rows: 10,
          seatsPerRow: 10,
          seatTypes: {
            standard: { price: 2500, rows: [1, 2, 3, 4, 5, 6, 7, 8] },
            premium: { price: 4000, rows: [9, 10] },
          },
        },
        createdAt: new Date(),
      },
      {
        _id: "hall-2",
        name: "Hall B",
        capacity: 150,
        layout: {
          rows: 12,
          seatsPerRow: 12,
          seatTypes: {
            standard: { price: 2000, rows: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
            premium: { price: 3500, rows: [10, 11, 12] },
          },
        },
        createdAt: new Date(),
      },
    ]

    await db.collection("halls").insertMany(halls)
    console.log("Seeded halls")

    // Seed events
    const events = [
      {
        _id: "689322daa5747d0f20b207c6",
        title: "The Matrix",
        description: "A computer programmer discovers that reality as he knows it is a simulation.",
        date: new Date("2025-01-15T19:00:00Z"),
        duration: 136,
        genre: "Sci-Fi",
        rating: "R",
        hallId: "hall-1",
        image: "/placeholder.jpg",
        trailer: "https://www.youtube.com/watch?v=vKQi3bBA1y8",
        cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        director: "The Wachowskis",
        status: "active",
        createdAt: new Date(),
      },
      {
        _id: "689322daa5747d0f20b207c7",
        title: "Inception",
        description: "A thief who steals corporate secrets through dream-sharing technology.",
        date: new Date("2025-01-16T20:30:00Z"),
        duration: 148,
        genre: "Sci-Fi",
        rating: "PG-13",
        hallId: "hall-2",
        image: "/placeholder.jpg",
        trailer: "https://www.youtube.com/watch?v=YoHD9XEInc0",
        cast: ["Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy"],
        director: "Christopher Nolan",
        status: "active",
        createdAt: new Date(),
      },
      {
        _id: "689322daa5747d0f20b207c8",
        title: "Interstellar",
        description: "A team of explorers travel through a wormhole in space.",
        date: new Date("2025-01-17T18:00:00Z"),
        duration: 169,
        genre: "Sci-Fi",
        rating: "PG-13",
        hallId: "hall-1",
        image: "/placeholder.jpg",
        trailer: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
        cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        director: "Christopher Nolan",
        status: "active",
        createdAt: new Date(),
      },
    ]

    await db.collection("events").insertMany(events)
    console.log("Seeded events")

    console.log("Database seeding completed successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
  }
}

seedDatabase()
