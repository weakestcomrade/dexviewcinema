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

async function setupPaymentsCollection() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Create 'payments' collection if it doesn't exist
    await db.createCollection('payments');
    // Create unique index on 'reference' field for payments
    await db.collection('payments').createIndex({ reference: 1 }, { unique: true });
    // Create index on 'bookingId' for payments
    await db.collection('payments').createIndex({ bookingId: 1 });
    console.log('Collection "payments" created and indexed.');

  } catch (error) {
    console.error('Error setting up MongoDB payments collection:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

setupPaymentsCollection();
