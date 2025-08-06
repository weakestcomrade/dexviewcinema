import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  console.error('MONGODB_URI environment variable is not set.');
  process.exit(1);
}

if (!dbName) {
  console.error('MONGODB_DB environment variable is not set.');
  process.exit(1);
}

async function seedDatabase() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    // Seed Halls
    const hallsCollection = db.collection('halls');
    const existingHalls = await hallsCollection.find({}).toArray();

    const initialHalls = [
      { _id: new ObjectId("652a7121c8291a001e7b4a1a"), name: "Hall A", capacity: 48, type: "standard", createdAt: new Date() },
      { _id: new ObjectId("652a7121c8291a001e7b4a1b"), name: "Hall B", capacity: 60, type: "standard", createdAt: new Date() },
      { _id: new ObjectId("652a7121c8291a001e7b4a1c"), name: "VIP Hall", capacity: 22, type: "vip", createdAt: new Date() },
    ];

    for (const hall of initialHalls) {
      const exists = existingHalls.some(h => h._id.equals(hall._id));
      if (!exists) {
        await hallsCollection.insertOne(hall);
        console.log(`Inserted hall: ${hall.name}`);
      } else {
        console.log(`Hall already exists: ${hall.name}`);
      }
    }

    // Seed Events (example, adjust as needed)
    const eventsCollection = db.collection('events');
    const existingEvents = await eventsCollection.find({}).toArray();

    const initialEvents = [
      {
        _id: new ObjectId("652a7121c8291a001e7b4a1d"),
        title: "Avengers: Endgame",
        event_type: "movie",
        category: "Blockbuster",
        event_date: "2025-08-15",
        event_time: "19:00",
        hall_id: "hallA",
        description: "The epic conclusion to the Infinity Saga.",
        duration: "181 minutes",
        total_seats: 48,
        pricing: { standardSingle: { price: 2500, count: 48 } },
        status: "active",
        image_url: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9slAqn9zPm.jpg",
        bookedSeats: [],
        createdAt: new Date(),
      },
      {
        _id: new ObjectId("652a7121c8291a001e7b4a1e"),
        title: "El Clasico: Real Madrid vs Barcelona",
        event_type: "match",
        category: "Premium Match",
        event_date: "2025-08-20",
        event_time: "21:00",
        hall_id: "vip_hall",
        description: "A thrilling football match between two giants.",
        duration: "90 minutes + extra time",
        total_seats: 22,
        pricing: { vipSofaSeats: { price: 2500, count: 10 }, vipRegularSeats: { price: 2000, count: 12 } },
        status: "active",
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/El_Clasico_logo.svg/1200px-El_Clasico_logo.svg.png",
        bookedSeats: [],
        createdAt: new Date(),
      },
    ];

    for (const event of initialEvents) {
      const exists = existingEvents.some(e => e._id.equals(event._id));
      if (!exists) {
        await eventsCollection.insertOne(event);
        console.log(`Inserted event: ${event.title}`);
      } else {
        console.log(`Event already exists: ${event.title}`);
      }
    }

    console.log('Database seeding complete.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase();
