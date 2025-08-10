import { MongoClient } from 'mongodb';

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

async function setupCollections() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Create 'events' collection and indexes
    await db.createCollection('events');
    await db.collection('events').createIndex({ title: 1 }, { unique: true });
    await db.collection('events').createIndex({ event_date: 1, event_time: 1 });
    console.log('Collection "events" created and indexed.');

    // Create 'halls' collection and indexes
    await db.createCollection('halls');
    await db.collection('halls').createIndex({ name: 1 }, { unique: true });
    console.log('Collection "halls" created and indexed.');

    // Create 'bookings' collection and indexes
    await db.createCollection('bookings');
    await db.collection('bookings').createIndex({ eventId: 1 });
    await db.collection('bookings').createIndex({ customerEmail: 1 });
    await db.collection('bookings').createIndex({ reference: 1 }, { unique: true });
    console.log('Collection "bookings" created and indexed.');

    // Create 'payments' collection and indexes
    await db.createCollection('payments');
    await db.collection('payments').createIndex({ reference: 1 }, { unique: true });
    await db.collection('payments').createIndex({ bookingId: 1 });
    console.log('Collection "payments" created and indexed.');

  } catch (error) {
    console.error('Error setting up MongoDB collections:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

setupCollections();
