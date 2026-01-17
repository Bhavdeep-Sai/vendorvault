import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/vendorvault';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Warn if using localhost in production
if (process.env.NODE_ENV === 'production' && MONGODB_URI.includes('localhost')) {
  console.warn('⚠️  WARNING: Using localhost MongoDB in production! Please set MONGODB_URI to a production database.');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Ensure global is properly typed for Next.js
declare const globalThis: {
  mongoose: MongooseCache | undefined;
} & typeof global;

let cached: MongooseCache = globalThis.mongoose || { conn: null, promise: null };

if (!globalThis.mongoose) {
  globalThis.mongoose = cached;
}

export async function connectDB() {
  try {
    // Return existing connection if available
    if (cached.conn) {
      return cached.conn;
    }

    // Create new connection if none exists
    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      };

      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        return mongoose;
      });
    }

    try {
      cached.conn = await cached.promise;
    } catch (e) {
      cached.promise = null;
      throw e;
    }

    return cached.conn;
  } catch (error) {
    throw error;
  }
}

// Export default for backward compatibility
export default connectDB;

// Utility function to close connection (useful for testing)
export async function disconnectDB() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

