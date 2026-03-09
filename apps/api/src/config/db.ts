import mongoose from "mongoose";
import { getMongoUri } from "./env";
import { NFTModel } from "../models/NFTModel";

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless environments.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const mongoUri = getMongoUri();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000, // 10s timeout
      autoIndex: true,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then(async (mongoose) => {
      console.log("Successfully connected to MongoDB Atlas");
      
      try {
        await NFTModel.syncIndexes();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to sync MongoDB indexes: ${message}`);
      }
      
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
}
