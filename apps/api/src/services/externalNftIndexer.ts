import { Alchemy, Network } from "alchemy-sdk";
import { NFTModel } from "../models/NFTModel";

export type ExternalIndexTarget = {
  label: string;
  chainId: number;
  network: Network;
  contractAddress: string;
  limit: number;
};

export const DEFAULT_EXTERNAL_TOTAL_LIMIT = 12_000;
const ALCHEMY_PAGE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DEFAULT_EXTERNAL_INDEX_TARGETS: ExternalIndexTarget[] = [
  {
    label: "CloneX",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b",
    limit: 4_000
  },
  {
    label: "Azuki",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0xed5af388653567af2f388e6224dc7c4b3241c544",
    limit: 4_000
  },
  {
    label: "CryptoPunks",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
    limit: 1_900
  },
  {
    label: "Zed Run",
    chainId: 137,
    network: Network.MATIC_MAINNET,
    contractAddress: "0xa5f1ea7df861952863df2e8d1312f7305dabf215",
    limit: 50
  },
  {
    label: "Lens Profiles",
    chainId: 137,
    network: Network.MATIC_MAINNET,
    contractAddress: "0xdb46d1dc155634fbc732f92e853b10b288ad5a1d",
    limit: 50
  },
  {
    label: "Doodles",
    chainId: 1,
    network: Network.ETH_MAINNET,
    contractAddress: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e",
    limit: 2_000
  }
];

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(value);
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

function toHexTokenId(decimalTokenId: string): string | null {
  const raw = decimalTokenId.trim();
  if (!raw) return null;
  try {
    return `0x${BigInt(raw).toString(16)}`;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }).map(async () => {
    for (;;) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx] as T);
    }
  });

  await Promise.all(workers);
  return results;
}

function openSeaAssetUrl(chainId: number, contractAddress: string, tokenId: string): string {
  const contract = normalizeAddress(contractAddress);
  const id = encodeURIComponent(tokenId);
  if (chainId === 137) return `https://opensea.io/assets/matic/${contract}/${id}`;
  if (chainId === 1) return `https://opensea.io/assets/ethereum/${contract}/${id}`;
  return `https://opensea.io/assets/${contract}/${id}`;
}

function inferMediaFromAlchemyNft(nft: Record<string, unknown>): {
  image?: string;
  media?: string;
  mimeType?: string;
  type: "image" | "audio" | "video";
} {
  const rawMetadata = (nft.rawMetadata as Record<string, unknown> | undefined) ?? undefined;
  const metadata = (nft.metadata as Record<string, unknown> | undefined) ?? undefined;
  const tokenUri = (nft.tokenUri as Record<string, unknown> | undefined) ?? undefined;
  const mediaArr = Array.isArray(nft.media) ? (nft.media as Array<Record<string, unknown>>) : [];
  const imageObj = (nft.image as Record<string, unknown> | undefined) ?? undefined;

  const image =
    (typeof rawMetadata?.image === "string" && rawMetadata.image.trim()) ||
    (typeof metadata?.image === "string" && metadata.image.trim()) ||
    (typeof imageObj?.cachedUrl === "string" && imageObj.cachedUrl.trim()) ||
    (typeof imageObj?.pngUrl === "string" && imageObj.pngUrl.trim()) ||
    (typeof imageObj?.thumbnailUrl === "string" && imageObj.thumbnailUrl.trim()) ||
    (typeof imageObj?.originalUrl === "string" && imageObj.originalUrl.trim()) ||
    (typeof tokenUri?.gateway === "string" && tokenUri.gateway.trim()) ||
    (typeof tokenUri?.raw === "string" && tokenUri.raw.trim()) ||
    (typeof mediaArr?.[0]?.gateway === "string" && mediaArr[0].gateway.trim()) ||
    (typeof mediaArr?.[0]?.raw === "string" && mediaArr[0].raw.trim()) ||
    undefined;

  const animationUrl =
    (typeof rawMetadata?.animation_url === "string" && rawMetadata.animation_url.trim()) ||
    (typeof metadata?.animation_url === "string" && metadata.animation_url.trim()) ||
    undefined;

  const media = animationUrl || image;
  const mimeType = typeof rawMetadata?.mimeType === "string" ? rawMetadata.mimeType.trim() : typeof metadata?.mimeType === "string" ? metadata.mimeType.trim() : undefined;

  const url = (media ?? "").toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("audio/") || url.endsWith(".mp3") || url.endsWith(".wav")) {
    return { type: "audio", ...(image ? { image } : {}), ...(media ? { media } : {}), ...(mimeType ? { mimeType } : {}) };
  }
  if (mime.startsWith("video/") || url.endsWith(".mp4") || url.endsWith(".mov")) {
    return { type: "video", ...(image ? { image } : {}), ...(media ? { media } : {}), ...(mimeType ? { mimeType } : {}) };
  }
  if (typeof animationUrl === "string" && animationUrl.trim()) {
    return { type: "video", ...(image ? { image } : {}), ...(media ? { media } : {}), ...(mimeType ? { mimeType } : {}) };
  }
  return { type: "image", ...(image ? { image } : {}), ...(media ? { media } : {}), ...(mimeType ? { mimeType } : {}) };
}

function normalizeAttributes(input: unknown): unknown[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const attrs = input.filter((x) => x && typeof x === "object");
  return attrs.length ? attrs : undefined;
}

function sanitizeEnglishText(input: string): string {
  const asciiOnly = input.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ");
  return asciiOnly.replace(/\s+/g, " ").trim();
}

function buildBulkUpdate(params: {
  chainId: number;
  label: string;
  contractAddress: string;
  tokenId: string;
  nft: Record<string, unknown>;
}): { updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: true } } {
  const { chainId, label, contractAddress, tokenId, nft } = params;

  const nameRaw =
    (typeof nft.name === "string" && nft.name.trim()) ||
    (typeof (nft.rawMetadata as Record<string, unknown> | undefined)?.name === "string" && ((nft.rawMetadata as Record<string, unknown>).name as string).trim()) ||
    (typeof (nft.metadata as Record<string, unknown> | undefined)?.name === "string" && ((nft.metadata as Record<string, unknown>).name as string).trim()) ||
    "";
  const nameCandidate = nameRaw || `${label} #${tokenId}`;
  const name = sanitizeEnglishText(nameCandidate) || `${label} #${tokenId}`;

  const descriptionRaw =
    (typeof (nft.rawMetadata as Record<string, unknown> | undefined)?.description === "string" && ((nft.rawMetadata as Record<string, unknown>).description as string).trim()) ||
    (typeof (nft.metadata as Record<string, unknown> | undefined)?.description === "string" && ((nft.metadata as Record<string, unknown>).description as string).trim()) ||
    (typeof nft.description === "string" && nft.description.trim()) ||
    "";
  const descriptionClean = descriptionRaw ? sanitizeEnglishText(descriptionRaw) : "";
  const description = descriptionClean ? descriptionClean : undefined;

  const attrsRaw = (nft.rawMetadata as Record<string, unknown> | undefined)?.attributes ?? (nft.metadata as Record<string, unknown> | undefined)?.attributes ?? undefined;
  const attributes = normalizeAttributes(attrsRaw);

  const { image, media, mimeType, type } = inferMediaFromAlchemyNft(nft);
  const externalUrl = openSeaAssetUrl(chainId, contractAddress, tokenId);

  const filter: Record<string, unknown> = {
    isExternal: true,
    contractAddress,
    tokenId
  };

  const updateDoc: Record<string, unknown> = {
    $setOnInsert: {
      isExternal: true,
      contractAddress,
      tokenId
    },
    $set: {
      name,
      ...(description ? { description } : {}),
      ...(attributes ? { attributes } : {}),
      ...(image ? { image } : {}),
      ...(media ? { media } : {}),
      ...(mimeType ? { mimeType } : {}),
      mediaType: type,
      type,
      category: label,
      chainId,
      externalUrl,
      price: "0",
      sold: false
    }
  };

  return {
    updateOne: {
      filter,
      update: updateDoc,
      upsert: true
    }
  };
}

export async function indexExternalNfts(params: {
  apiKey: string;
  targets?: ExternalIndexTarget[];
}): Promise<{
  inserted: number;
  updated: number;
  total: number;
  externalCount: number;
}> {
  const apiKey = params.apiKey.trim();
  const targets = (params.targets ?? DEFAULT_EXTERNAL_INDEX_TARGETS).slice();

  const alchemyByNetwork = new Map<Network, Alchemy>();
  const getAlchemy = (network: Network): Alchemy => {
    const cached = alchemyByNetwork.get(network);
    if (cached) return cached;
    const instance = new Alchemy({ apiKey, network });
    alchemyByNetwork.set(network, instance);
    return instance;
  };

  let inserted = 0;
  let updated = 0;

  for (const target of targets) {
    const contractAddress = normalizeAddress(target.contractAddress);
    if (!contractAddress || !isEvmAddress(contractAddress)) continue;

    const alchemy = getAlchemy(target.network);
    const allRawNfts: Array<Record<string, unknown>> = [];
    let pageKey: string | undefined = undefined;
    
    // 1. Fetch loop: collect raw NFTs until target limit is reached
    while (allRawNfts.length < target.limit) {
      const remaining = target.limit - allRawNfts.length;
      const pageSize = Math.min(100, remaining);
      
      let response;
      try {
        response = await alchemy.nft.getNftsForContract(contractAddress, {
          pageSize,
          omitMetadata: false,
          ...(pageKey ? { pageKey } : {})
        });
      } catch (err) {
        console.error(`[Indexer] Error fetching ${target.label}:`, err);
        await sleep(2500);
        continue;
      }

      const any = response as { nfts?: unknown[]; pageKey?: string };
      const nfts = Array.isArray(any?.nfts) ? (any.nfts as Array<Record<string, unknown>>) : [];
      
      if (nfts.length === 0) break;

      allRawNfts.push(...nfts);
      
      console.log("[Indexer] Fetched " + allRawNfts.length + " / " + target.limit + " for " + target.label);

      if (!any.pageKey) break;
      pageKey = any.pageKey;

      // Add a small delay between pages to be gentle on the API
      await sleep(ALCHEMY_PAGE_DELAY_MS);
    }

    // 2. Slice to exact limit to avoid over-fetching
    const nftsToProcess = allRawNfts.slice(0, target.limit);

    // 3. Process and save in safe chunks
    const BATCH_SIZE = 500;
    for (let i = 0; i < nftsToProcess.length; i += BATCH_SIZE) {
      const batch = nftsToProcess.slice(i, i + BATCH_SIZE);
      
      const hydrated = await mapWithConcurrency(batch, 10, async (nft) => {
        const hasRaw = nft.rawMetadata && typeof nft.rawMetadata === "object";
        const hasMeta = nft.metadata && typeof nft.metadata === "object";
        const hasAttrs =
          Array.isArray((nft.rawMetadata as Record<string, unknown> | undefined)?.attributes) ||
          Array.isArray((nft.metadata as Record<string, unknown> | undefined)?.attributes);
        const hasDesc =
          typeof (nft.rawMetadata as Record<string, unknown> | undefined)?.description === "string" ||
          typeof (nft.metadata as Record<string, unknown> | undefined)?.description === "string" ||
          typeof nft.description === "string";

        if ((hasRaw || hasMeta) && (hasAttrs || hasDesc)) return nft;

        const tokenId = toDecimalTokenId(nft.tokenId);
        if (!tokenId) return nft;
        const tokenIdHex = toHexTokenId(tokenId) ?? tokenId;
        try {
          const meta = await alchemy.nft.getNftMetadata(contractAddress, tokenIdHex);
          return (meta as unknown as Record<string, unknown>) ?? nft;
        } catch {
          return nft;
        }
      });

      const ops: Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: true } }> = [];
      for (const nft of hydrated) {
        const tokenId = toDecimalTokenId(nft.tokenId);
        if (!tokenId) continue;
        ops.push(
          buildBulkUpdate({
            chainId: target.chainId,
            label: target.label,
            contractAddress,
            tokenId,
            nft
          })
        );
      }

      if (ops.length > 0) {
        try {
          const res = await NFTModel.bulkWrite(ops, { ordered: false });
          const upsertedCount = typeof (res as unknown as { upsertedCount?: number }).upsertedCount === "number" ? (res as unknown as { upsertedCount: number }).upsertedCount : 0;
          inserted += upsertedCount;
          updated += Math.max(0, ops.length - upsertedCount);
        } catch (error) {
           console.error(`Error during bulk write for contract ${contractAddress} batch starting at index ${i}:`, error);
           // Continue processing other batches even if one fails
        }
      }
    }
  }

  const externalCount = await NFTModel.countDocuments({ isExternal: true, contractAddress: { $type: "string" } });

  return {
    inserted,
    updated,
    total: inserted + updated,
    externalCount
  };
}
