import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { Alchemy, Network, AssetTransfersCategory } from "alchemy-sdk";
import { formatEther, parseEther } from "viem";
import { AppError } from "../middleware/errorHandler";
import { uploadFileBufferToPinata, uploadJsonToPinata } from "../services/pinata";
import { DEFAULT_EXTERNAL_INDEX_TARGETS, indexExternalNfts } from "../services/externalNftIndexer";
import { refreshTopViewedExternalNftPrices } from "../services/priceRefresher";
import { asyncHandler } from "../utils/asyncHandler";
import { NFTModel } from "../models/NFTModel";

export const nftRouter: Router = Router();

type CollectionMetadataPayload = {
  address: string;
  name: string | null;
  symbol: string | null;
  tokenType: string | null;
  floorPriceEth: number | null;
  totalSupply: string | null;
  volumeEth: number | null;
  fetchedAt: string;
};

const contractMetadataCache = new Map<string, { expiresAt: number; payload: CollectionMetadataPayload }>();

type ContractNftCardPayload = {
  tokenId: string;
  name: string;
  image: string | null;
  dbId: string | null;
};

type ContractNftsPayload = {
  address: string;
  items: ContractNftCardPayload[];
  fetchedAt: string;
};

const contractNftsCache = new Map<string, { expiresAt: number; payload: ContractNftsPayload }>();

type NftSortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "name_asc";

function normalizeSort(value: string | undefined): NftSortKey {
  if (value === "oldest") return "oldest";
  if (value === "price_asc") return "price_asc";
  if (value === "price_desc") return "price_desc";
  if (value === "name_asc") return "name_asc";
  return "newest";
}

function normalizeChainId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === "ethereum" || v === "eth") return 1;
  if (v === "polygon" || v === "matic") return 137;
  const numeric = Number(v);
  if (!Number.isFinite(numeric)) return null;
  const chainId = Math.floor(numeric);
  if (chainId <= 0) return null;
  return chainId;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseOptionalWeiFromEth(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return parseEther(trimmed);
  } catch {
    return null;
  }
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addressQuery(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value.toLowerCase())}$`, "i");
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(value);
}

function isDigitsOnlyString(input: string): boolean {
  return /^\d+$/.test(input);
}

function normalizeEthString(raw: string): string {
  return raw.replace(/\s*eth\s*$/i, "").trim();
}

function derivePriceFields(price: unknown): { priceWei?: string; priceEth?: string } {
  const raw = typeof price === "string" ? price.trim() : "";
  if (!raw) return {};

  if (isDigitsOnlyString(raw)) {
    try {
      const wei = BigInt(raw);
      return { priceWei: raw, priceEth: formatEther(wei) };
    } catch {
      return {};
    }
  }

  const normalized = normalizeEthString(raw);
  if (!normalized) return {};

  try {
    const wei = parseEther(normalized);
    return { priceWei: wei.toString(), priceEth: formatEther(wei) };
  } catch {
    const n = Number(normalized);
    if (!Number.isFinite(n) || n <= 0) return { priceEth: normalized };
    return { priceEth: String(n) };
  }
}

function withDerivedPrice<T extends Record<string, unknown>>(doc: T): T & { priceWei?: string; priceEth?: string } {
  const fields = derivePriceFields(doc.price);
  return Object.keys(fields).length ? { ...doc, ...fields } : doc;
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

function sumSaleTotalPaidWei(sale: unknown): bigint | null {
  const s = sale as Record<string, unknown>;
  const feeFields = [s.sellerFee, s.protocolFee, s.royaltyFee] as unknown[];
  let total = 0n;
  let sawAny = false;

  for (const fee of feeFields) {
    if (!fee || typeof fee !== "object") continue;
    const f = fee as Record<string, unknown>;
    const amount = typeof f.amount === "string" ? f.amount.trim() : "";
    if (!amount) continue;

    const symbol = typeof f.symbol === "string" ? f.symbol.trim().toUpperCase() : "";
    const decimals = typeof f.decimals === "number" ? f.decimals : null;
    const isEthLike = symbol === "ETH" || symbol === "WETH";
    if (!isEthLike) return null;
    if (decimals !== null && decimals !== 18) return null;

    try {
      total += BigInt(amount);
      sawAny = true;
    } catch {
      return null;
    }
  }

  return sawAny ? total : null;
}

function categoryQuery(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function categoryAliases(category: string): string[] {
  const c = normalizeCategory(category);
  if (!c) return [];

  if (c === "art") return ["art", "image", "pfp", "profile", "profile picture", "visual", "2d", "3d"];
  if (c === "collectibles" || c === "collectible") return ["collectibles", "collectible", "pfp", "trading card", "cards", "game"];
  if (c === "audio") return ["audio", "music", "sound", "podcast"];
  if (c === "video") return ["video", "movie", "animation", "motion"];
  return [c];
}

nftRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const owner = typeof req.query.owner === "string" ? req.query.owner.trim() : "";
    const seller = typeof req.query.seller === "string" ? req.query.seller.trim() : "";
    const creator = typeof req.query.creator === "string" ? req.query.creator.trim() : "";
    const contract = typeof req.query.contract === "string" ? req.query.contract.trim() : "";
    const collectionsRaw = typeof req.query.collections === "string" ? req.query.collections.trim() : "";

    const chainProvided = typeof req.query.chain === "string" && req.query.chain.trim() !== "";
    const chainId = normalizeChainId(req.query.chain);
    if (chainProvided && chainId === null) throw new AppError("Invalid chain. Use ethereum, polygon, 1, or 137.", 400);

    const minPriceProvided = typeof req.query.minPrice === "string" && req.query.minPrice.trim() !== "";
    const maxPriceProvided = typeof req.query.maxPrice === "string" && req.query.maxPrice.trim() !== "";
    const minPriceWei = typeof req.query.minPrice === "string" ? parseOptionalWeiFromEth(req.query.minPrice) : null;
    const maxPriceWei = typeof req.query.maxPrice === "string" ? parseOptionalWeiFromEth(req.query.maxPrice) : null;
    if (minPriceProvided && minPriceWei === null) throw new AppError("Invalid minPrice. Use a number in ETH (example: 0.5).", 400);
    if (maxPriceProvided && maxPriceWei === null) throw new AppError("Invalid maxPrice. Use a number in ETH (example: 0.5).", 400);
    const soldRaw = typeof req.query.sold === "string" ? req.query.sold.trim().toLowerCase() : "";
    const sort = normalizeSort(typeof req.query.sort === "string" ? req.query.sort.trim() : undefined);
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 24;
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 24;
    const pageRaw = typeof req.query.page === "string" ? Number(req.query.page) : 1;
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const skip = (page - 1) * limit;

    if (minPriceWei !== null && maxPriceWei !== null && minPriceWei > maxPriceWei) {
      throw new AppError("Invalid price range: minPrice must be <= maxPrice", 400);
    }

    const match: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];
    if (category) {
      const aliases = categoryAliases(category);
      andClauses.push({ category: aliases.length > 1 ? { $in: aliases.map(categoryQuery) } : categoryQuery(category) });
    }

    const collections = collectionsRaw ? splitCsv(collectionsRaw) : [];
    if (collections.length > 0) {
      andClauses.push({ category: { $in: collections.map(categoryQuery) } });
    }

    if (andClauses.length > 0) match.$and = andClauses;

    if (owner) match.owner = addressQuery(owner);
    if (seller) match.seller = addressQuery(seller);
    if (creator) match.creator = addressQuery(creator);

    if (contract) {
      const contracts = splitCsv(contract).map((c) => normalizeAddress(c)).filter(isEvmAddress);
      if (contracts.length === 1) match.contractAddress = addressQuery(contracts[0]!);
      else if (contracts.length > 1) match.contractAddress = { $in: contracts.map(addressQuery) };
    }

    if (chainId !== null) match.chainId = chainId;

    if (soldRaw === "true") match.sold = true;
    if (soldRaw === "false") match.sold = false;

    if (search) {
      const safe = escapeRegex(search);
      match.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } }
      ];
    }

    const basePipeline: any[] = [{ $match: match }];

    const needsPriceDec = sort === "price_asc" || sort === "price_desc" || minPriceWei !== null || maxPriceWei !== null;
    if (needsPriceDec) {
      basePipeline.push({
        $addFields: {
          priceDec: {
            $convert: {
              input: { $ifNull: ["$price", "0"] },
              to: "decimal",
              onError: 0,
              onNull: 0
            }
          }
        }
      });
    }

    if (minPriceWei !== null || maxPriceWei !== null) {
      const priceAnd: Record<string, unknown>[] = [];
      if (minPriceWei !== null) priceAnd.push({ $gte: ["$priceDec", mongoose.Types.Decimal128.fromString(minPriceWei.toString())] });
      if (maxPriceWei !== null) priceAnd.push({ $lte: ["$priceDec", mongoose.Types.Decimal128.fromString(maxPriceWei.toString())] });
      basePipeline.push({ $match: { $expr: priceAnd.length === 1 ? priceAnd[0] : { $and: priceAnd } } });
    }

    const sortStage: Record<string, 1 | -1> = (() => {
      if (sort === "oldest") return { createdAt: 1 };
      if (sort === "price_asc") return { priceDec: 1, createdAt: -1 };
      if (sort === "price_desc") return { priceDec: -1, createdAt: -1 };
      if (sort === "name_asc") return { name: 1, createdAt: -1 };
      return { createdAt: -1 };
    })();

    const facets: Record<string, any[]> = {
      items: [...basePipeline, { $sort: sortStage }, ...(skip > 0 ? [{ $skip: skip }] : []), { $limit: limit }, ...(needsPriceDec ? [{ $project: { priceDec: 0 } }] : [])],
      total: [...basePipeline, { $count: "value" }]
    };

    const rows = await NFTModel.aggregate([{ $facet: facets }]).collation({ locale: "en", strength: 2 });
    const first = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
    const itemsRaw = Array.isArray(first?.items) ? (first?.items as Array<Record<string, unknown>>) : [];
    const totalRaw = Array.isArray(first?.total) ? (first?.total as Array<Record<string, unknown>>) : [];
    const total = typeof totalRaw?.[0]?.value === "number" ? (totalRaw[0].value as number) : 0;
    res.status(200).json({ items: itemsRaw.map((x) => withDerivedPrice(x)), total });
  })
);

nftRouter.post(
  "/prices/refresh",
  asyncHandler(async (_req, res) => {
    const result = await refreshTopViewedExternalNftPrices({ limit: 50 });
    res.status(200).json(result);
  })
);

nftRouter.post(
  "/view/id/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!id || id.trim() === "") throw new AppError("Missing id", 400);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid id", 400);

    await NFTModel.updateOne({ _id: id }, { $inc: { viewCount: 1 } });
    res.status(204).send();
  })
);

nftRouter.post(
  "/view/token/:tokenId",
  asyncHandler(async (req, res) => {
    const tokenId = req.params.tokenId;
    if (!tokenId || tokenId.trim() === "") throw new AppError("Missing tokenId", 400);

    await NFTModel.updateOne({ tokenId }, { $inc: { viewCount: 1 } });
    res.status(204).send();
  })
);

nftRouter.get(
  "/indexed-collections",
  asyncHandler(async (_req, res) => {
    // 1. Get unique contract addresses from DB to ensure we only show what's indexed
    const distinctAddresses = await NFTModel.distinct("contractAddress", { isExternal: true });
    const dbAddresses = new Set(distinctAddresses.map((a) => normalizeAddress(a)));

    // 2. Filter targets based on DB presence OR explicit Doodles inclusion
    const items = DEFAULT_EXTERNAL_INDEX_TARGETS.filter((t) => {
      const addr = normalizeAddress(t.contractAddress);
      // Explicitly include Doodles even if not yet indexed, per requirement
      if (t.label === "Doodles") return true;
      return dbAddresses.has(addr);
    }).map((t) => ({
      label: t.label,
      chainId: t.chainId,
      contractAddress: t.contractAddress
    }));

    res.status(200).json({ items });
  })
);

nftRouter.get(
  "/collections/:address/metadata",
  asyncHandler(async (req, res) => {
    const address = normalizeAddress(req.params.address);
    if (!address) throw new AppError("Missing contract address", 400);
    if (!isEvmAddress(address)) throw new AppError("Invalid contract address", 400);

    const cached = contractMetadataCache.get(address);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      res.status(200).json(cached.payload);
      return;
    }

    const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
    if (!apiKey) throw new AppError("Missing ALCHEMY_API_KEY", 500);

    const alchemy = new Alchemy({
      apiKey,
      network: Network.ETH_MAINNET
    });

    let meta: unknown;
    try {
      meta = await alchemy.nft.getContractMetadata(address);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Alchemy request failed";
      throw new AppError(message, 502);
    }

    let volumeEth: number | null = null;
    try {
      let pageKey: string | undefined = undefined;
      let totalPaidWei = 0n;

      for (let i = 0; i < 5; i += 1) {
        const sales = await alchemy.nft.getNftSales({
          contractAddress: address,
          order: "desc",
          limit: 100,
          ...(pageKey ? { pageKey } : {})
        } as never);

        const anySales = sales as unknown as { nftSales?: unknown[]; pageKey?: string };
        const rows = Array.isArray(anySales.nftSales) ? anySales.nftSales : [];

        for (const row of rows) {
          const paidWei = sumSaleTotalPaidWei(row);
          if (paidWei) totalPaidWei += paidWei;
        }

        pageKey = typeof anySales.pageKey === "string" && anySales.pageKey.trim() ? anySales.pageKey : undefined;
        if (!pageKey) break;
      }

      if (totalPaidWei > 0n) {
        const eth = Number(formatEther(totalPaidWei));
        volumeEth = Number.isFinite(eth) ? eth : null;
      }
    } catch {
      volumeEth = null;
    }

    const anyMeta = meta as Record<string, unknown>;
    const contractMetadata = (anyMeta.contractMetadata as Record<string, unknown> | undefined) ?? {};
    const openSea =
      (contractMetadata.openSeaMetadata as Record<string, unknown> | undefined) ??
      (contractMetadata.openSea as Record<string, unknown> | undefined) ??
      (anyMeta.openSeaMetadata as Record<string, unknown> | undefined) ??
      (anyMeta.openSea as Record<string, unknown> | undefined) ??
      {};

    const os = openSea as Record<string, unknown>;

    const payload: CollectionMetadataPayload = {
      address,
      name: typeof contractMetadata.name === "string" ? contractMetadata.name : typeof anyMeta.name === "string" ? anyMeta.name : null,
      symbol:
        typeof contractMetadata.symbol === "string" ? contractMetadata.symbol : typeof anyMeta.symbol === "string" ? anyMeta.symbol : null,
      tokenType:
        typeof contractMetadata.tokenType === "string"
          ? contractMetadata.tokenType
          : typeof anyMeta.tokenType === "string"
            ? anyMeta.tokenType
            : null,
      floorPriceEth: firstFiniteNumber(os.floorPrice, os.floor_price, (os.floorPrice as Record<string, unknown> | undefined)?.price),
      totalSupply:
        typeof contractMetadata.totalSupply === "string"
          ? contractMetadata.totalSupply
          : typeof anyMeta.totalSupply === "string"
            ? anyMeta.totalSupply
            : null,
      volumeEth: volumeEth ?? firstFiniteNumber(os.totalVolume, os.total_volume, os.volume, os.volumeTraded, os.totalVolumeEth),
      fetchedAt: new Date().toISOString()
    };

    contractMetadataCache.set(address, { expiresAt: now + 60_000, payload });
    res.status(200).json(payload);
  })
);

nftRouter.get(
  "/collections/:address/nfts",
  asyncHandler(async (req, res) => {
    const address = normalizeAddress(req.params.address);
    if (!address) throw new AppError("Missing contract address", 400);
    if (!isEvmAddress(address)) throw new AppError("Invalid contract address", 400);

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 4;
    const limit = Number.isFinite(limitRaw) ? Math.min(20, Math.max(1, Math.floor(limitRaw))) : 4;

    const cacheKey = `${address}:${limit}`;
    const cached = contractNftsCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      res.status(200).json(cached.payload);
      return;
    }

    const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
    if (!apiKey) throw new AppError("Missing ALCHEMY_API_KEY", 500);

    const alchemy = new Alchemy({
      apiKey,
      network: Network.ETH_MAINNET
    });

    let raw: unknown;
    try {
      raw = await alchemy.nft.getNftsForContract(address, { pageSize: limit });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Alchemy request failed";
      throw new AppError(message, 502);
    }

    const any = raw as { nfts?: unknown[] };
    const nfts = Array.isArray(any?.nfts) ? any.nfts : [];
    const trimmed = nfts.slice(0, limit) as Array<Record<string, unknown>>;

    const cardDrafts = trimmed
      .map((item): Omit<ContractNftCardPayload, "dbId"> | null => {
        const tokenId = toDecimalTokenId(item.tokenId);
        if (!tokenId) return null;

        const nameRaw = typeof item.name === "string" ? item.name.trim() : "";
        const name = nameRaw || `CloneX #${tokenId}`;

        const img = (item.image as Record<string, unknown> | undefined) ?? undefined;
        const imageCandidate =
          (typeof img?.cachedUrl === "string" && img.cachedUrl.trim()) ||
          (typeof img?.pngUrl === "string" && img.pngUrl.trim()) ||
          (typeof img?.thumbnailUrl === "string" && img.thumbnailUrl.trim()) ||
          (typeof img?.originalUrl === "string" && img.originalUrl.trim()) ||
          null;

        return { tokenId, name, image: imageCandidate };
      })
      .filter((x): x is Omit<ContractNftCardPayload, "dbId"> => x !== null);

    const tokenIds = Array.from(new Set(cardDrafts.map((x) => x.tokenId)));
    const docs = tokenIds.length
      ? await NFTModel.find({ contractAddress: addressQuery(address), tokenId: { $in: tokenIds } })
          .select({ _id: 1, tokenId: 1 })
          .lean()
      : [];

    const idByTokenId = new Map<string, string>();
    for (const doc of docs) {
      const tid = typeof doc.tokenId === "string" ? doc.tokenId : "";
      if (!tid) continue;
      if (!idByTokenId.has(tid)) idByTokenId.set(tid, String(doc._id));
    }

    const payload: ContractNftsPayload = {
      address,
      items: cardDrafts.map((x) => ({
        ...x,
        dbId: idByTokenId.get(x.tokenId) ?? null
      })),
      fetchedAt: new Date().toISOString()
    };

    contractNftsCache.set(cacheKey, { expiresAt: now + 60_000, payload });
    res.status(200).json(payload);
  })
);

nftRouter.get(
  "/:tokenId",
  asyncHandler(async (req, res) => {
    const tokenId = req.params.tokenId;
    if (!tokenId || tokenId.trim() === "") throw new AppError("Missing tokenId", 400);

    const local = await NFTModel.findOne({ tokenId, isExternal: false }).lean();
    const nft = local ?? (await NFTModel.findOne({ tokenId }).lean());
    if (!nft) throw new AppError("NFT not found", 404);

    res.status(200).json({ nft: withDerivedPrice(nft as unknown as Record<string, unknown>) });
  })
);

nftRouter.post(
  "/index/external",
  asyncHandler(async (_req, res) => {
    const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
    if (!apiKey) throw new AppError("Missing ALCHEMY_API_KEY", 500);

    try {
      const result = await indexExternalNfts({ apiKey, targets: DEFAULT_EXTERNAL_INDEX_TARGETS });
      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Alchemy request failed";
      throw new AppError(message, 502);
    }
  })
);

nftRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const contractAddress = normalizeAddress(typeof req.query.contractAddress === "string" ? req.query.contractAddress : "");
    const tokenId = typeof req.query.tokenId === "string" ? req.query.tokenId.trim() : "";

    if (!contractAddress) throw new AppError("Missing contractAddress", 400);
    if (!tokenId) throw new AppError("Missing tokenId", 400);

    const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
    if (!apiKey) throw new AppError("Missing ALCHEMY_API_KEY", 500);

    const alchemy = new Alchemy({
      apiKey,
      network: Network.ETH_MAINNET // Defaults to Mainnet, but should ideally match the chain of the contract.
      // For this task, we assume the history is relevant to the configured network or Mainnet for external.
      // If we support Polygon, we might need to check the chainId passed or infer it.
      // However, the current setup defaults to ETH_MAINNET for Alchemy instance in other routes too.
    });

    try {
      // getTransfersForNft returns transfers for a specific NFT
      // const response = await alchemy.nft.getTransfersForNft(contractAddress, tokenId);
      // REPLACEMENT: Use core.getAssetTransfers and filter by tokenId
      const response = await alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        contractAddresses: [contractAddress],
        category: [AssetTransfersCategory.ERC721, AssetTransfersCategory.ERC1155],
        excludeZeroValue: true,
        withMetadata: true,
        maxCount: 1000 // Limit to avoid timeout
      });
      
      const targetTokenIdBig = BigInt(tokenId);
      const transfers = response.transfers.filter(t => {
        if (!t.tokenId) return false;
        try {
            return BigInt(t.tokenId) === targetTokenIdBig;
        } catch {
            return false;
        }
      });
      
      res.status(200).json({ transfers });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Alchemy request failed";
      throw new AppError(message, 502);
    }
  })
);

nftRouter.get(
  "/id/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!id || id.trim() === "") throw new AppError("Missing id", 400);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid id", 400);

    const nft = await NFTModel.findById(id).lean();
    if (!nft) throw new AppError("NFT not found", 404);

    res.status(200).json({ nft: withDerivedPrice(nft as unknown as Record<string, unknown>) });
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const mime = typeof file.mimetype === "string" ? file.mimetype : "";
    const lowerName = typeof file.originalname === "string" ? file.originalname.toLowerCase() : "";

    const allowedMime = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "video/quicktime"
    ]);

    const allowedExt = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".mp4", ".mov"];
    const hasAllowedExt = allowedExt.some((ext) => lowerName.endsWith(ext));

    if (allowedMime.has(mime) || hasAllowedExt) {
      cb(null, true);
      return;
    }

    cb(new AppError("Unsupported file type. Use png/jpg/webp/gif/mp3/wav/mp4/mov", 400));
  }
});

nftRouter.post(
  "/upload",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.file?.[0] ?? files?.image?.[0] ?? null;
    if (!file) throw new AppError("Missing file", 400);

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : undefined;
    const category = typeof req.body.category === "string" ? req.body.category.trim() : undefined;

    if (name.length === 0) throw new AppError("Missing name", 400);

    const mediaUpload = await uploadFileBufferToPinata({
      buffer: file.buffer,
      filename: file.originalname,
      displayName: `${name}-media`
    });

    const mime = typeof file.mimetype === "string" ? file.mimetype : "";
    const mediaType = mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "image";

    const metadata: Record<string, unknown> = {
      name,
      ...(description ? { description } : {}),
      ...(category ? { category } : {}),
      type: mediaType,
      mediaType,
      mimeType: mime
    };

    if (mediaType === "image") {
      metadata.image = mediaUpload.ipfsUri;
    } else {
      metadata.animation_url = mediaUpload.ipfsUri;
    }

    const metadataUpload = await uploadJsonToPinata(metadata, {
      displayName: `${name}-metadata`
    });

    res.status(201).json({
      tokenURI: metadataUpload.ipfsUri,
      tokenURIGateway: metadataUpload.gatewayUrl,
      type: mediaType,
      mediaType,
      mimeType: mime,
      media: mediaUpload.ipfsUri,
      mediaGateway: mediaUpload.gatewayUrl,
      image: mediaType === "image" ? mediaUpload.ipfsUri : undefined,
      imageGateway: mediaType === "image" ? mediaUpload.gatewayUrl : undefined
    });
  })
);
