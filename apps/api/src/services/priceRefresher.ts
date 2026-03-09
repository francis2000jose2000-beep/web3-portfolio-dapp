import { Alchemy, Network } from "alchemy-sdk";
import { parseEther } from "viem";
import { NFTModel } from "../models/NFTModel";

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstFiniteNumber(...values: unknown[]): number | null {
  for (const v of values) {
    const n = toFiniteNumber(v);
    if (typeof n === "number") return n;
  }
  return null;
}

function extractFloorPriceEth(meta: unknown): number | null {
  const anyMeta = meta as Record<string, unknown>;
  const contractMetadata = (anyMeta.contractMetadata as Record<string, unknown> | undefined) ?? {};
  const openSea =
    (contractMetadata.openSeaMetadata as Record<string, unknown> | undefined) ??
    (contractMetadata.openSea as Record<string, unknown> | undefined) ??
    (anyMeta.openSeaMetadata as Record<string, unknown> | undefined) ??
    (anyMeta.openSea as Record<string, unknown> | undefined) ??
    {};
  const os = openSea as Record<string, unknown>;
  return firstFiniteNumber(os.floorPrice, os.floor_price, (os.floorPrice as Record<string, unknown> | undefined)?.price);
}

export type RefreshPricesResult = {
  scanned: number;
  updated: number;
  contractsUpdated: number;
  fetchedAt: string;
};

export async function refreshTopViewedExternalNftPrices(params: { limit?: number } = {}): Promise<RefreshPricesResult> {
  const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ? Math.min(200, Math.max(1, Math.floor(params.limit))) : 50;

  const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
  if (!apiKey) throw new Error("Missing ALCHEMY_API_KEY");

  const alchemy = new Alchemy({ apiKey, network: Network.ETH_MAINNET });

  const docs = await NFTModel.find({
    isExternal: true,
    contractAddress: { $type: "string" },
    viewCount: { $gt: 0 }
  })
    .sort({ viewCount: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  const contracts = new Set<string>();
  for (const doc of docs) {
    const addr = normalizeAddress((doc as unknown as { contractAddress?: string }).contractAddress);
    if (addr && isEvmAddress(addr)) contracts.add(addr);
  }

  const floorWeiByContract = new Map<string, string>();
  for (const address of contracts) {
    try {
      const meta = await alchemy.nft.getContractMetadata(address);
      const floorEth = extractFloorPriceEth(meta);
      if (typeof floorEth !== "number" || !Number.isFinite(floorEth) || floorEth <= 0) continue;
      const wei = parseEther(String(floorEth));
      floorWeiByContract.set(address, wei.toString());
    } catch {
      continue;
    }
  }

  const updates: Array<{ updateOne: { filter: { _id: unknown }; update: Record<string, unknown> } }> = [];
  for (const doc of docs) {
    const contractAddress = normalizeAddress((doc as unknown as { contractAddress?: string }).contractAddress);
    const floorWei = floorWeiByContract.get(contractAddress);
    if (!floorWei) continue;
    updates.push({
      updateOne: {
        filter: { _id: (doc as unknown as { _id: unknown })._id },
        update: { $set: { price: floorWei } }
      }
    });
  }

  const fetchedAt = new Date().toISOString();
  if (updates.length === 0) {
    return {
      scanned: docs.length,
      updated: 0,
      contractsUpdated: floorWeiByContract.size,
      fetchedAt
    };
  }

  const res = await NFTModel.bulkWrite(updates, { ordered: false });

  return {
    scanned: docs.length,
    updated: res.modifiedCount ?? 0,
    contractsUpdated: floorWeiByContract.size,
    fetchedAt
  };
}

export function startPriceRefresherService(): void {
  const enabled = (process.env.PRICE_REFRESH_ENABLED ?? "true").trim().toLowerCase() !== "false";
  if (!enabled) return;

  const intervalMsRaw = Number(process.env.PRICE_REFRESH_INTERVAL_MS ?? "300000");
  const intervalMs = Number.isFinite(intervalMsRaw) ? Math.max(60_000, Math.floor(intervalMsRaw)) : 300_000;

  const run = async () => {
    try {
      const result = await refreshTopViewedExternalNftPrices({ limit: 50 });
      console.log(
        `Price refresh complete: scanned=${result.scanned}, updated=${result.updated}, contracts=${result.contractsUpdated} (${result.fetchedAt})`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(`Price refresh failed: ${message}`);
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, intervalMs);
}

