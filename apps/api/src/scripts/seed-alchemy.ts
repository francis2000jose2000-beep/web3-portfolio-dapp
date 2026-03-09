import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db";
import { NFTModel as NFT } from "../models/NFTModel";

type AlchemyNft = {
  tokenId?: string;
  contract?: {
    address?: string;
    name?: string;
  };
  title?: string;
  name?: string;
  description?: string;
  tokenUri?: {
    raw?: string;
    gateway?: string;
  };
  media?: Array<{
    raw?: string;
    gateway?: string;
  }>;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    animation_url?: string;
    mimeType?: string;
  };
};

type AlchemyGetNftsResponse = {
  ownedNfts?: AlchemyNft[];
  pageKey?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function toDecimalTokenId(tokenId: string): string {
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

function openseaAssetUrl(chainId: number, contractAddress: string, tokenId: string): string {
  const contract = normalizeAddress(contractAddress);
  const id = encodeURIComponent(tokenId);
  if (chainId === 137) return `https://opensea.io/assets/matic/${contract}/${id}`;
  if (chainId === 1) return `https://opensea.io/assets/ethereum/${contract}/${id}`;
  return `https://opensea.io/assets/${contract}/${id}`;
}

function inferMediaFromNft(nft: AlchemyNft): { image?: string; media?: string; mimeType?: string; type: "image" | "audio" | "video"; category?: string } {
  const meta = nft.metadata;

  const image =
    (typeof meta?.image === "string" && meta.image.trim()) ||
    (typeof nft.image?.originalUrl === "string" && nft.image.originalUrl.trim()) ||
    (typeof nft.image?.pngUrl === "string" && nft.image.pngUrl.trim()) ||
    (typeof nft.image?.cachedUrl === "string" && nft.image.cachedUrl.trim()) ||
    (typeof nft.media?.[0]?.raw === "string" && nft.media?.[0]?.raw.trim()) ||
    (typeof nft.media?.[0]?.gateway === "string" && nft.media?.[0]?.gateway.trim()) ||
    undefined;

  const media =
    (typeof meta?.animation_url === "string" && meta.animation_url.trim()) ||
    (typeof nft.media?.[0]?.raw === "string" && nft.media?.[0]?.raw.trim()) ||
    (typeof nft.media?.[0]?.gateway === "string" && nft.media?.[0]?.gateway.trim()) ||
    image;

  const mimeType = typeof meta?.mimeType === "string" && meta.mimeType.trim() ? meta.mimeType.trim() : undefined;

  const url = (media ?? "").toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();

  if (mime.startsWith("audio/") || url.endsWith(".mp3") || url.endsWith(".wav")) {
    return {
      type: "audio",
      category: "audio",
      ...(image ? { image } : {}),
      ...(media ? { media } : {}),
      ...(mimeType ? { mimeType } : {})
    };
  }

  if (mime.startsWith("video/") || url.endsWith(".mp4") || url.endsWith(".mov")) {
    return {
      type: "video",
      category: "video",
      ...(image ? { image } : {}),
      ...(media ? { media } : {}),
      ...(mimeType ? { mimeType } : {})
    };
  }

  const contractName = typeof nft.contract?.name === "string" ? nft.contract.name.toLowerCase() : "";
  const category = contractName.includes("collect") ? "Collectibles" : "PFP";
  return {
    type: "image",
    category,
    ...(image ? { image } : {}),
    ...(media ? { media } : {}),
    ...(mimeType ? { mimeType } : {})
  };
}

async function fetchAlchemyNfts(params: {
  baseUrl: string;
  owner: string;
  pageKey?: string;
  pageSize: number;
}): Promise<AlchemyGetNftsResponse> {
  const url = new URL(`${params.baseUrl}/getNFTsForOwner`);
  url.searchParams.set("owner", params.owner);
  url.searchParams.set("withMetadata", "true");
  url.searchParams.set("pageSize", String(params.pageSize));
  url.searchParams.append("excludeFilters[]", "SPAM");
  if (params.pageKey) url.searchParams.set("pageKey", params.pageKey);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Alchemy request failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as unknown;
  if (!isObject(json)) return {};

  return {
    ownedNfts: Array.isArray(json.ownedNfts) ? (json.ownedNfts as AlchemyNft[]) : [],
    ...(typeof json.pageKey === "string" ? { pageKey: json.pageKey } : {})
  };
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === flag);
  if (idx === -1) return undefined;
  const next = process.argv[idx + 1];
  return typeof next === "string" ? next : undefined;
}

async function main(): Promise<void> {
  await connectToDatabase();

  const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
  if (!apiKey) throw new Error("Missing ALCHEMY_API_KEY");

  const owner = normalizeAddress(getArgValue("--owner") ?? process.env.ALCHEMY_SEED_OWNER);
  if (!owner) {
    console.log("Skipping seed: missing --owner (or ALCHEMY_SEED_OWNER)");
    return;
  }

  const chainIdRaw = getArgValue("--chainId") ?? process.env.ALCHEMY_CHAIN_ID;
  const chainId = chainIdRaw && Number.isFinite(Number(chainIdRaw)) ? Number(chainIdRaw) : 137;

  const baseUrl = `https://polygon-mainnet.g.alchemy.com/nft/v3/${apiKey}`;

  await NFT.syncIndexes();

  let pageKey: string | undefined;
  let inserted = 0;
  let updated = 0;
  const pageSize = 100;

  for (;;) {
    const batch = await fetchAlchemyNfts({ baseUrl, owner, pageSize, ...(pageKey ? { pageKey } : {}) });
    const nfts = Array.isArray(batch.ownedNfts) ? batch.ownedNfts : [];

    for (const nft of nfts) {
      const contractAddress = normalizeAddress(nft.contract?.address);
      const tokenIdRaw = typeof nft.tokenId === "string" ? nft.tokenId : "";
      const tokenId = toDecimalTokenId(tokenIdRaw);
      if (!contractAddress || !tokenId) continue;

      const title = typeof nft.metadata?.name === "string" && nft.metadata.name.trim() ? nft.metadata.name.trim() : typeof nft.title === "string" && nft.title.trim() ? nft.title.trim() : "";
      const name = title || `Token #${tokenId}`;
      const description = typeof nft.metadata?.description === "string" ? nft.metadata.description : typeof nft.description === "string" ? nft.description : undefined;
      const { image, media, mimeType, type, category } = inferMediaFromNft(nft);

      const externalUrl = openseaAssetUrl(chainId, contractAddress, tokenId);
      const ownerKey = contractAddress;

      const result = await NFT.updateOne(
        { tokenId, owner: ownerKey, isExternal: true },
        {
          $setOnInsert: {
            tokenId,
            owner: ownerKey,
            isExternal: true
          },
          $set: {
            seller: owner,
            creator: owner,
            price: "0",
            sold: false,
            name,
            description,
            image,
            media,
            mediaType: type,
            type,
            mimeType,
            category,
            contractAddress,
            chainId,
            externalUrl
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) inserted += 1;
      else updated += 1;
    }

    pageKey = batch.pageKey;
    if (!pageKey) break;
  }

  console.log(`Seed complete: ${inserted} inserted, ${updated} updated`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err: unknown) => {
    console.error(err);
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(1);
    }
  });
