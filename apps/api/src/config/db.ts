import mongoose from "mongoose";
import { getMongoUri } from "./env";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = getMongoUri();

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(mongoUri, {
    autoIndex: true
  });

  console.log("MongoDB connected");
}

