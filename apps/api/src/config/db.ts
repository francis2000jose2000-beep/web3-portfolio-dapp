import mongoose from "mongoose";
import { getMongoUri } from "./env";
import { NFTModel } from "../models/NFTModel";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = getMongoUri();

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(mongoUri, {
    autoIndex: true
  });

  try {
    await NFTModel.syncIndexes();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to sync MongoDB indexes: ${message}`);
  }

  console.log("MongoDB connected");
}
