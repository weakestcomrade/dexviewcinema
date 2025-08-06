import { NextResponse } from "next/server"
import { MongoClient, ObjectId } from 'mongodb';
import { revalidatePath } from "next/cache"

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your MONGODB_URI environment variable to .env.local');
}
if (!dbName) {
  throw new Error('Please add your MONGODB_DB environment variable to .env.local');
}

// In production, it's best practice to use a singleton pattern for MongoClient
// to avoid creating a new connection on every request.
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const events = await db.collection('events').find({}).toArray();

    const serializableEvents = events.map((event) => ({
      ...event,
      _id: event._id.toString(),
      hall_id: event.hall_id instanceof ObjectId ? event.hall_id.toString() : event.hall_id,
    }))

    return NextResponse.json(serializableEvents);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ message: 'Failed to fetch events', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const data = await req.json();

    // Basic validation
    const requiredFields = ['title', 'event_type', 'category', 'event_date', 'event_time', 'hall_id', 'duration', 'total_seats', 'status'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate pricing structure based on event_type and hall_id
    if (!data.pricing || Object.keys(data.pricing).length === 0) {
      return NextResponse.json({ message: 'Pricing information is required.' }, { status: 400 });
    }

    // Ensure total_seats is a positive number
    if (typeof data.total_seats !== 'number' || data.total_seats <= 0) {
      return NextResponse.json({ message: 'total_seats must be a positive number.' }, { status: 400 });
    }

    // Add default bookedSeats as an empty array if not provided
    const newEvent = {
      ...data,
      bookedSeats: data.bookedSeats || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('events').insertOne(newEvent);
    revalidatePath("/")
    revalidatePath("/admin") // Revalidate admin page after creating an event

    return NextResponse.json({ message: 'Event created successfully', eventId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ message: 'Failed to create event', error: (error as Error).message }, { status: 500 });
  }
}
