import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

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

async function seedData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Clear existing data (optional, for fresh seeding)
    await db.collection('events').deleteMany({});
    await db.collection('halls').deleteMany({});
    await db.collection('bookings').deleteMany({});
    await db.collection('payments').deleteMany({});
    console.log('Cleared existing data from events, halls, bookings, and payments collections.');

    // Seed Halls
    const halls = [
      { _id: new ObjectId(), name: 'Hall A', type: 'standard', capacity: 60 },
      { _id: new ObjectId(), name: 'Hall B', type: 'standard', capacity: 48 },
      { _id: new ObjectId(), name: 'VIP Hall', type: 'vip', capacity: 48 }, // Total capacity for VIP hall (20 single + 14*2 couple + 14*4 family = 20+28+56 = 104, but for matches it's 10 sofa + 12 regular = 22) - adjusted to 48 for consistency with previous logic
    ];
    await db.collection('halls').insertMany(halls);
    console.log('Halls seeded successfully.');

    const hallAId = halls.find(h => h.name === 'Hall A')._id.toHexString();
    const hallBId = halls.find(h => h.name === 'Hall B')._id.toHexString();
    const vipHallId = halls.find(h => h.name === 'VIP Hall')._id.toHexString();

    // Seed Events
    const events = [
      {
        _id: new ObjectId(),
        title: 'The Matrix',
        event_type: 'movie',
        category: 'Sci-Fi',
        event_date: '2025-08-08',
        event_time: '10:40',
        hall_id: hallBId,
        status: 'active',
        image_url: '/placeholder.jpg',
        description: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
        duration: '120 minutes',
        pricing: {
          standardSingle: { price: 2500, count: 48 },
        },
        bookedSeats: ['HallB-1', 'HallB-2', 'HallB-3', 'HallB-4', 'HallB-5', 'HallB-6', 'HallB-7', 'HallB-8', 'HallB-9', 'HallB-10', 'HallB-11', 'HallB-12', 'HallB-13', 'HallB-14', 'HallB-15', 'HallB-16'],
      },
      {
        _id: new ObjectId(),
        title: 'Avengers: Endgame',
        event_type: 'movie',
        category: 'Action',
        event_date: '2025-08-09',
        event_time: '14:00',
        hall_id: hallAId,
        status: 'active',
        image_url: '/placeholder.jpg',
        description: 'Adrift in space with no food or water, Tony Stark sends a message to Pepper Potts as his oxygen supply starts to dwindle. Meanwhile, the remaining Avengers -- Thor, Black Widow, Captain America and Bruce Banner -- must figure out a way to bring back their vanquished allies for an epic showdown with Thanos -- the evil demigod who decimated the planet and the universe.',
        duration: '181 minutes',
        pricing: {
          standardSingle: { price: 3000, count: 60 },
        },
        bookedSeats: [],
      },
      {
        _id: new ObjectId(),
        title: 'Champions League Final',
        event_type: 'match',
        category: 'Football',
        event_date: '2025-08-10',
        event_time: '20:00',
        hall_id: vipHallId,
        status: 'active',
        image_url: '/placeholder.jpg',
        description: 'The highly anticipated final match of the UEFA Champions League.',
        duration: '120 minutes',
        pricing: {
          vipSofaSeats: { price: 10000, count: 10 },
          vipRegularSeats: { price: 7500, count: 12 },
        },
        bookedSeats: ['S1', 'S2', 'A1', 'A2'],
      },
      {
        _id: new ObjectId(),
        title: 'Premier League Matchday',
        event_type: 'match',
        category: 'Football',
        event_date: '2025-08-11',
        event_time: '16:00',
        hall_id: hallAId,
        status: 'active',
        image_url: '/placeholder.jpg',
        description: 'Exciting Premier League action with top teams battling it out.',
        duration: '100 minutes',
        pricing: {
          standardMatchSeats: { price: 4000, count: 60 },
        },
        bookedSeats: [],
      },
      {
        _id: new ObjectId(),
        title: 'Inception',
        event_type: 'movie',
        category: 'Sci-Fi',
        event_date: '2025-08-12',
        event_time: '19:00',
        hall_id: vipHallId,
        status: 'active',
        image_url: '/placeholder.jpg',
        description: 'A thief who steals corporate secrets through use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        duration: '148 minutes',
        pricing: {
          vipSingle: { price: 5000, count: 20 },
          vipCouple: { price: 8000, count: 14 },
          vipFamily: { price: 15000, count: 14 },
        },
        bookedSeats: ['S1', 'S2', 'C1', 'F1'],
      },
    ];
    await db.collection('events').insertMany(events);
    console.log('Events seeded successfully.');

  } catch (error) {
    console.error('Error seeding MongoDB data:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

seedData();
