import "dotenv/config";
import mongoose from "mongoose";
import { Network, Alchemy } from "alchemy-sdk";
import { connectToDatabase } from "../config/db";
import { NFTModel } from "../models/NFTModel";

type AlchemyNft = {
  tokenId?: string;
  name?: string;
  description?: string;
  contract?: { address?: string };
  image?: {
    cachedUrl?: string;
    pngUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
    contentType?: string;
  };
  raw?: unknown;
};

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function toDecimalTokenId(tokenId: unknown): string {
  if (typeof tokenId !== "string") return "";
  const trimmed = tokenId.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    try {
      return BigInt(trimmed).toString();
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function openseaAssetUrlPolygon(contractAddress: string, tokenId: string): string {
  const contract = normalizeAddress(contractAddress);
  const id = encodeURIComponent(tokenId);
  return `https://opensea.io/assets/matic/${contract}/${id}`;
}

function inferTypeFromContentType(contentType: unknown): "image" | "video" | "audio" {
  const ct = typeof contentType === "string" ? contentType.toLowerCase() : "";
  if (ct.includes("video")) return "video";
  if (ct.includes("audio")) return "audio";
  return "image";
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === flag);
  if (idx === -1) return undefined;
  const next = process.argv[idx + 1];
  return typeof next === "string" ? next : undefined;
}

async function seedPolygonNFTs(): Promise<void> {
  await connectToDatabase();

  const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
  if (!apiKey) throw new Error("Missing ALCHEMY_API_KEY");

  const contractRaw = getArgValue("--contract") ?? process.env.POLYGON_COLLECTION_ADDRESS;
  const contractAddress = normalizeAddress(contractRaw);
  if (!contractAddress) {
    console.log("Skipping seed: missing --contract (or POLYGON_COLLECTION_ADDRESS)");
    return;
  }

  const pageSizeRaw = getArgValue("--limit") ?? process.env.POLYGON_SEED_LIMIT;
  const pageSize = pageSizeRaw && Number.isFinite(Number(pageSizeRaw)) ? Math.min(100, Math.max(1, Number(pageSizeRaw))) : 40;

  const alchemy = new Alchemy({
    apiKey,
    network: Network.MATIC_MAINNET
  });

  await NFTModel.syncIndexes();

  console.log(`Fetching Polygon NFTs for contract: ${contractAddress}`);
  const res = await alchemy.nft.getNftsForContract(contractAddress, { pageSize });
  const nfts = (res?.nfts ?? []) as AlchemyNft[];

  let inserted = 0;
  let updated = 0;

  for (const item of nfts) {
    const tokenId = toDecimalTokenId(item.tokenId);
    if (!tokenId) continue;

    const name = (typeof item.name === "string" && item.name.trim()) || `Token #${tokenId}`;
    const description = typeof item.description === "string" && item.description.trim() ? item.description.trim() : undefined;

    const type = inferTypeFromContentType(item.image?.contentType);
    const assetUrlRaw =
      (typeof item.image?.cachedUrl === "string" && item.image.cachedUrl.trim()) ||
      (typeof item.image?.originalUrl === "string" && item.image.originalUrl.trim()) ||
      undefined;

    const image = type === "image" ? assetUrlRaw : undefined;
    const media = type === "video" || type === "audio" ? assetUrlRaw : undefined;

    const externalUrl = openseaAssetUrlPolygon(contractAddress, tokenId);

    const result = await NFTModel.updateOne(
      { tokenId, owner: contractAddress, isExternal: true },
      {
        $setOnInsert: {
          tokenId,
          owner: contractAddress,
          isExternal: true
        },
        $set: {
          seller: contractAddress,
          creator: contractAddress,
          price: "0",
          sold: false,
          name,
          ...(description ? { description } : {}),
          ...(image ? { image } : {}),
          ...(media ? { media } : {}),
          type,
          mediaType: type,
          category: "Collectibles",
          contractAddress,
          chainId: 137,
          externalUrl
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) inserted += 1;
    else updated += 1;
  }

  console.log(`Seed complete: ${inserted} inserted, ${updated} updated`);
  console.log("Polygon Seed Complete!");
}

seedPolygonNFTs()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Seed polygon NFTs failed:", error);
    try {
      await mongoose.disconnect();
    } finally {
      process.exitCode = 1;
    }
  });
