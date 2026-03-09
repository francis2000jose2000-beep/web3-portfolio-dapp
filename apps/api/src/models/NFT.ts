import mongoose, { Schema, Document } from "mongoose";

export interface INFT extends Document {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  category: string;
  type: "image" | "audio" | "video";
  isExternal: boolean;
  externalUrl?: string;
}

const NFTSchema: Schema = new Schema({
  tokenId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String, required: true },
  seller: { type: String, required: true },
  owner: { type: String, required: true }, // Contract address for external, wallet for local
  price: { type: String, required: true },
  sold: { type: Boolean, default: false },
  category: { type: String, default: "Art" },
  type: { type: String, enum: ["image", "audio", "video"], default: "image" },
  isExternal: { type: Boolean, default: false },
  externalUrl: { type: String },
});

// We index TokenId and Owner together to allow same IDs from different contracts
NFTSchema.index({ tokenId: 1, owner: 1 }, { unique: true });

export const NFT = mongoose.model<INFT>("NFT", NFTSchema);