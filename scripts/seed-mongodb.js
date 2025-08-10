const { MongoClient, ObjectId } = require("mongodb")

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

    // Clear existing data (optional - remove if you want to keep existing data)
    await db.collection("events").deleteMany({})
    await db.collection("halls").deleteMany({})
    console.log("Cleared existing data")

    // Seed halls
    const halls = [
      {
        _id: new ObjectId(),
        name: "Hall A",
        capacity: 100,
        rows: 10,
        seatsPerRow: 10,
        seatTypes: {
          standard: { price: 2500, rows: [1, 2, 3, 4, 5, 6, 7, 8] },
          vip: { price: 5000, rows: [9, 10] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "Hall B",
        capacity: 150,
        rows: 15,
        seatsPerRow: 10,
        seatTypes: {
          standard: { price: 2000, rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
          vip: { price: 4000, rows: [13, 14, 15] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "Hall C",
        capacity: 80,
        rows: 8,
        seatsPerRow: 10,
        seatTypes: {
          standard: { price: 3000, rows: [1, 2, 3, 4, 5, 6] },
          vip: { price: 6000, rows: [7, 8] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const hallsResult = await db.collection("halls").insertMany(halls)
    console.log(`Inserted ${hallsResult.insertedCount} halls`)

    // Seed events
    const events = [
      {
        _id: new ObjectId(),
        title: "The Matrix",
        description:
          "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        event_type: "movie",
        date: "2025-01-15",
        time: "19:00",
        duration: "136 minutes",
        hall_id: halls[0]._id.toString(),
        hall_name: halls[0].name,
        capacity: halls[0].capacity,
        seatTypes: halls[0].seatTypes,
        bookedSeats: [],
        poster: "/placeholder.jpg",
        genre: "Sci-Fi, Action",
        rating: "R",
        director: "The Wachowskis",
        cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: "Inception",
        description:
          "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        event_type: "movie",
        date: "2025-01-16",
        time: "20:30",
        duration: "148 minutes",
        hall_id: halls[1]._id.toString(),
        hall_name: halls[1].name,
        capacity: halls[1].capacity,
        seatTypes: halls[1].seatTypes,
        bookedSeats: [],
        poster: "/placeholder.jpg",
        genre: "Sci-Fi, Thriller",
        rating: "PG-13",
        director: "Christopher Nolan",
        cast: ["Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: "Interstellar",
        description:
          "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        event_type: "movie",
        date: "2025-01-17",
        time: "18:00",
        duration: "169 minutes",
        hall_id: halls[2]._id.toString(),
        hall_name: halls[2].name,
        capacity: halls[2].capacity,
        seatTypes: halls[2].seatTypes,
        bookedSeats: [],
        poster: "/placeholder.jpg",
        genre: "Sci-Fi, Drama",
        rating: "PG-13",
        director: "Christopher Nolan",
        cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: "Black Panther",
        description:
          "T'Challa, heir to the hidden but advanced kingdom of Wakanda, must step forward to lead his people into a new future.",
        event_type: "movie",
        date: "2025-01-18",
        time: "21:00",
        duration: "134 minutes",
        hall_id: halls[0]._id.toString(),
        hall_name: halls[0].name,
        capacity: halls[0].capacity,
        seatTypes: halls[0].seatTypes,
        bookedSeats: [],
        poster: "/placeholder.jpg",
        genre: "Action, Adventure",
        rating: "PG-13",
        director: "Ryan Coogler",
        cast: ["Chadwick Boseman", "Michael B. Jordan", "Lupita Nyong'o"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: "Avengers: Endgame",
        description:
          "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions and restore balance to the universe.",
        event_type: "movie",
        date: "2025-01-19",
        time: "19:30",
        duration: "181 minutes",
        hall_id: halls[1]._id.toString(),
        hall_name: halls[1].name,
        capacity: halls[1].capacity,
        seatTypes: halls[1].seatTypes,
        bookedSeats: [],
        poster: "/placeholder.jpg",
        genre: "Action, Adventure",
        rating: "PG-13",
        director: "Anthony Russo, Joe Russo",
        cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const eventsResult = await db.collection("events").insertMany(events)
    console.log(`Inserted ${eventsResult.insertedCount} events`)

    console.log("Database seeding completed successfully!")
    console.log("Sample data:")
    console.log(`- ${halls.length} halls created`)
    console.log(`- ${events.length} events created`)
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seedDatabase()
