import { createPublicClient, decodeEventLog, http, isAddress } from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, marketplaceAbi } from "../config/contracts";
import { ActivityModel } from "../models/Activity";
import { NFTModel } from "../models/NFTModel";

type WatcherOptions = {
  rpcUrl?: string;
  fromBlock?: bigint;
};

type ContractLog = {
  address: `0x${string}`;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
  blockNumber?: bigint;
  logIndex?: number;
};

type NftMetadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  type?: string;
  mediaType?: string;
  mimeType?: string;
  category?: string;
};

type MediaType = "image" | "audio" | "video";

function inferMediaType(metadata: NftMetadata): MediaType {
  const mt = typeof metadata.type === "string" && metadata.type.trim() ? metadata.type.toLowerCase() : typeof metadata.mediaType === "string" ? metadata.mediaType.toLowerCase() : "";
  if (mt === "audio") return "audio";
  if (mt === "video") return "video";
  if (mt === "image") return "image";

  const mime = typeof metadata.mimeType === "string" ? metadata.mimeType.toLowerCase() : "";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";

  const url = (typeof metadata.animation_url === "string" ? metadata.animation_url : typeof metadata.image === "string" ? metadata.image : "").toLowerCase();
  if (url.endsWith(".mp3") || url.endsWith(".wav")) return "audio";
  if (url.endsWith(".mp4") || url.endsWith(".mov")) return "video";
  return "image";
}

type ActivityType = "MINT" | "LIST" | "SELL" | "TRANSFER";

function makeEventId(blockNumber: bigint, logIndex: number, eventName: string, type: ActivityType): string {
  return `${blockNumber.toString()}-${logIndex}-${eventName}-${type}`;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function upsertAuctionCreated(params: {
  tokenId: string;
  seller: `0x${string}`;
  minBid: bigint;
  endTime: bigint;
}): Promise<void> {
  const endTimeDate = new Date(Number(params.endTime) * 1000);
  await NFTModel.updateOne(
    { tokenId: params.tokenId },
    {
      $setOnInsert: {
        tokenId: params.tokenId,
        name: `Token #${params.tokenId}`,
        sold: false,
        isExternal: false
      },
      $set: {
        seller: params.seller,
        owner: CONTRACT_ADDRESS,
        isAuction: true,
        minBid: params.minBid.toString(),
        highestBid: "0",
        highestBidder: ZERO_ADDRESS,
        auctionEndTime: endTimeDate
      }
    },
    { upsert: true }
  );
}

async function upsertBidPlaced(params: { tokenId: string; bidder: `0x${string}`; amount: bigint }): Promise<void> {
  await NFTModel.updateOne(
    { tokenId: params.tokenId },
    {
      $set: {
        isAuction: true,
        highestBid: params.amount.toString(),
        highestBidder: params.bidder
      }
    },
    { upsert: false }
  );
}

async function upsertAuctionEnded(params: {
  tokenId: string;
  seller: `0x${string}`;
  winner: `0x${string}`;
  amount: bigint;
  timestamp: Date;
}): Promise<void> {
  const winnerIsZero = params.winner.toLowerCase() === ZERO_ADDRESS;
  await NFTModel.updateOne(
    { tokenId: params.tokenId },
    {
      $set: {
        isAuction: false,
        highestBid: params.amount.toString(),
        highestBidder: params.winner,
        auctionEndTime: params.timestamp,
        owner: winnerIsZero ? params.seller : params.winner,
        seller: winnerIsZero ? params.seller : ZERO_ADDRESS,
        sold: !winnerIsZero,
        price: params.amount.toString()
      }
    },
    { upsert: false }
  );
}

async function getTimestampForBlock(
  publicClient: ReturnType<typeof createPublicClient>,
  cache: Map<bigint, Date>,
  blockNumber: bigint
): Promise<Date> {
  const cached = cache.get(blockNumber);
  if (cached) return cached;
  const block = await publicClient.getBlock({ blockNumber });
  const ts = new Date(Number(block.timestamp) * 1000);
  cache.set(blockNumber, ts);
  return ts;
}

async function writeActivity(params: {
  eventId: string;
  type: ActivityType;
  from?: string;
  to?: string;
  tokenId: string;
  price?: string;
  timestamp: Date;
}): Promise<void> {
  await ActivityModel.updateOne(
    { eventId: params.eventId },
    {
      $setOnInsert: {
        eventId: params.eventId,
        type: params.type,
        from: params.from,
        to: params.to,
        tokenId: params.tokenId,
        price: params.price,
        timestamp: params.timestamp
      }
    },
    { upsert: true }
  );
}

function getRpcUrl(options?: WatcherOptions): string {
  if (typeof options?.rpcUrl === "string" && options.rpcUrl.trim() !== "") return options.rpcUrl;
  const fromEnv = process.env.RPC_URL;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") return fromEnv;
  return "http://127.0.0.1:8545";
}

function getFromBlock(options?: WatcherOptions): bigint {
  if (typeof options?.fromBlock === "bigint") return options.fromBlock;
  const raw = process.env.WATCHER_FROM_BLOCK;
  if (typeof raw === "string" && raw.trim() !== "") {
    const asNumber = Number(raw);
    if (Number.isInteger(asNumber) && asNumber >= 0) return BigInt(asNumber);
  }
  return 0n;
}

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    const cidAndPath = uri.slice("ipfs://".length);
    return `https://gateway.pinata.cloud/ipfs/${cidAndPath}`;
  }
  return uri;
}

async function fetchJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }

    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeMetadata(raw: unknown): NftMetadata {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: NftMetadata = {};
  if (typeof obj.name === "string") out.name = obj.name;
  if (typeof obj.description === "string") out.description = obj.description;
  if (typeof obj.image === "string") out.image = obj.image;
  if (typeof obj.animation_url === "string") out.animation_url = obj.animation_url;
  if (typeof obj.type === "string") out.type = obj.type;
  if (typeof obj.mediaType === "string") out.mediaType = obj.mediaType;
  if (typeof obj.mimeType === "string") out.mimeType = obj.mimeType;
  if (typeof obj.category === "string") out.category = obj.category;
  return out;
}

async function fetchTokenMetadata(tokenUri: string): Promise<NftMetadata> {
  const httpUrl = ipfsToHttp(tokenUri);
  const raw = await fetchJson(httpUrl);
  const metadata = normalizeMetadata(raw);
  if (typeof metadata.image === "string") {
    return { ...metadata, image: metadata.image };
  }
  return metadata;
}

export async function syncPastEvents(options?: WatcherOptions): Promise<void> {
  if (!isAddress(CONTRACT_ADDRESS)) {
    console.warn("Watcher: invalid CONTRACT_ADDRESS; skipping syncPastEvents");
    return;
  }

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(getRpcUrl(options), {
      retryCount: 3,
      retryDelay: 750
    })
  });

  const fromBlock = getFromBlock(options);
  let toBlock: bigint;
  try {
    toBlock = await publicClient.getBlockNumber();
  } catch (err) {
    throw err;
  }

  let logs: ContractLog[];
  try {
    logs = (await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      fromBlock,
      toBlock
    })) as unknown as ContractLog[];
  } catch (err) {
    console.error("Watcher: failed to fetch logs; skipping syncPastEvents", err);
    return;
  }

  const decoded = logs
    .map((log) => {
      try {
        const result = decodeEventLog({
          abi: marketplaceAbi,
          data: log.data,
          topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
        });
        return {
          ...result,
          blockNumber: log.blockNumber ?? 0n,
          logIndex: log.logIndex ?? 0
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
      return a.blockNumber < b.blockNumber ? -1 : 1;
    });

  const timestampCache = new Map<bigint, Date>();

  for (const ev of decoded) {
    let ts: Date;
    try {
      ts = await getTimestampForBlock(publicClient, timestampCache, ev.blockNumber);
    } catch (err) {
      console.error("Watcher: failed to fetch block timestamp", err);
      continue;
    }

    if (ev.eventName === "MarketItemCreated") {
      const args = ev.args as unknown as {
        itemId: bigint;
        tokenId: bigint;
        seller: `0x${string}`;
        owner: `0x${string}`;
        price: bigint;
      };

      const tokenId = args.tokenId.toString();
      const itemId = args.itemId.toString();

      let tokenUri: string;
      try {
        tokenUri = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: marketplaceAbi,
          functionName: "tokenURI",
          args: [args.tokenId]
        })) as string;
      } catch (err) {
        console.error("Watcher: failed to read tokenURI", err);
        continue;
      }

      let metadata: NftMetadata = {};
      try {
        metadata = await fetchTokenMetadata(tokenUri);
      } catch {
        metadata = {};
      }

      const name = metadata.name?.trim() ? metadata.name.trim() : `Token #${tokenId}`;
      const image = metadata.image?.trim() ? metadata.image.trim() : undefined;
      const mediaType = inferMediaType(metadata);
      const media =
        typeof metadata.animation_url === "string" && metadata.animation_url.trim()
          ? metadata.animation_url.trim()
          : typeof image === "string"
            ? image
            : undefined;
      const mimeType = metadata.mimeType?.trim() ? metadata.mimeType.trim() : undefined;

      try {
        await NFTModel.findOneAndUpdate(
          { tokenId },
          {
            $setOnInsert: {
              tokenId,
              creator: args.seller
            },
            $set: {
              itemId,
              seller: args.seller,
              owner: args.owner,
              price: args.price.toString(),
              sold: false,
              name,
              description: metadata.description,
              image,
              media,
              mediaType,
              type: mediaType,
              mimeType,
              category: metadata.category
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("Watcher: failed to upsert NFT", err);
      }

      try {
        await writeActivity({
          eventId: makeEventId(ev.blockNumber, ev.logIndex, ev.eventName, "MINT"),
          type: "MINT",
          from: ZERO_ADDRESS,
          to: args.seller,
          tokenId,
          timestamp: ts
        });
      } catch (err) {
        console.error("Watcher: failed to write MINT activity", err);
      }

      await writeActivity({
        eventId: makeEventId(ev.blockNumber, ev.logIndex, ev.eventName, "LIST"),
        type: "LIST",
        from: args.seller,
        to: CONTRACT_ADDRESS,
        tokenId,
        price: args.price.toString(),
        timestamp: ts
      });
    }

    if (ev.eventName === "MarketItemSold") {
      const args = ev.args as unknown as {
        itemId: bigint;
        tokenId: bigint;
        buyer: `0x${string}`;
        price: bigint;
      };

      const tokenId = args.tokenId.toString();
      const itemId = args.itemId.toString();

      const existing = await NFTModel.findOne({ $or: [{ itemId }, { tokenId }] }).lean();
      const seller = typeof existing?.seller === "string" && existing.seller ? existing.seller : ZERO_ADDRESS;

      await NFTModel.findOneAndUpdate(
        { $or: [{ itemId }, { tokenId }] },
        {
          $set: {
            itemId,
            owner: args.buyer,
            seller: "0x0000000000000000000000000000000000000000",
            sold: true,
            price: args.price.toString()
          }
        },
        { upsert: false }
      );

      await writeActivity({
        eventId: makeEventId(ev.blockNumber, ev.logIndex, ev.eventName, "SELL"),
        type: "SELL",
        from: seller,
        to: args.buyer,
        tokenId,
        price: args.price.toString(),
        timestamp: ts
      });
    }

    if (ev.eventName === "MarketItemRelisted") {
      const args = ev.args as unknown as {
        itemId: bigint;
        tokenId: bigint;
        seller: `0x${string}`;
        price: bigint;
      };

      const tokenId = args.tokenId.toString();
      const itemId = args.itemId.toString();

      await NFTModel.findOneAndUpdate(
        { $or: [{ itemId }, { tokenId }] },
        {
          $set: {
            itemId,
            seller: args.seller,
            owner: CONTRACT_ADDRESS,
            sold: false,
            price: args.price.toString()
          }
        },
        { upsert: false }
      );

      try {
        await writeActivity({
          eventId: makeEventId(ev.blockNumber, ev.logIndex, ev.eventName, "LIST"),
          type: "LIST",
          from: args.seller,
          to: CONTRACT_ADDRESS,
          tokenId,
          price: args.price.toString(),
          timestamp: ts
        });
      } catch (err) {
        console.error("Watcher: failed to write LIST activity", err);
      }
    }

    if (ev.eventName === "AuctionCreated") {
      const args = ev.args as unknown as { tokenId: bigint; seller: `0x${string}`; minBid: bigint; endTime: bigint };
      const tokenId = args.tokenId.toString();

      try {
        await upsertAuctionCreated({ tokenId, seller: args.seller, minBid: args.minBid, endTime: args.endTime });
      } catch (err) {
        console.error("Watcher: failed to upsert AuctionCreated", err);
      }
    }

    if (ev.eventName === "BidPlaced") {
      const args = ev.args as unknown as { tokenId: bigint; bidder: `0x${string}`; amount: bigint };
      const tokenId = args.tokenId.toString();

      try {
        await upsertBidPlaced({ tokenId, bidder: args.bidder, amount: args.amount });
      } catch (err) {
        console.error("Watcher: failed to upsert BidPlaced", err);
      }
    }

    if (ev.eventName === "AuctionEnded") {
      const args = ev.args as unknown as { tokenId: bigint; seller: `0x${string}`; winner: `0x${string}`; amount: bigint };
      const tokenId = args.tokenId.toString();

      try {
        await upsertAuctionEnded({ tokenId, seller: args.seller, winner: args.winner, amount: args.amount, timestamp: ts });
      } catch (err) {
        console.error("Watcher: failed to upsert AuctionEnded", err);
      }
    }
  }
}

export async function startWatcherService(options?: WatcherOptions): Promise<() => void> {
  if (!isAddress(CONTRACT_ADDRESS)) {
    throw new Error("Invalid CONTRACT_ADDRESS");
  }

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(getRpcUrl(options), {
      retryCount: 3,
      retryDelay: 750
    })
  });

  const timestampCache = new Map<bigint, Date>();

  let stopped = false;
  let unwatchCreated: (() => void) | null = null;
  let unwatchSold: (() => void) | null = null;
  let unwatchRelisted: (() => void) | null = null;
  let unwatchAuctionCreated: (() => void) | null = null;
  let unwatchBidPlaced: (() => void) | null = null;
  let unwatchAuctionEnded: (() => void) | null = null;
  let restartTimer: NodeJS.Timeout | null = null;
  let restartAttempts = 0;

  const stop = (): void => {
    stopped = true;
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
    unwatchCreated?.();
    unwatchCreated = null;
    unwatchSold?.();
    unwatchSold = null;
    unwatchRelisted?.();
    unwatchRelisted = null;
    unwatchAuctionCreated?.();
    unwatchAuctionCreated = null;
    unwatchBidPlaced?.();
    unwatchBidPlaced = null;
    unwatchAuctionEnded?.();
    unwatchAuctionEnded = null;
  };

  const scheduleRestart = (reason: unknown): void => {
    if (stopped) return;
    if (restartTimer) return;

    restartAttempts += 1;
    const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(5, restartAttempts));
    console.error("Watcher error; restarting", reason);

    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (stopped) return;
      unwatchCreated?.();
      unwatchCreated = null;
      unwatchSold?.();
      unwatchSold = null;
      unwatchRelisted?.();
      unwatchRelisted = null;
      unwatchAuctionCreated?.();
      unwatchAuctionCreated = null;
      unwatchBidPlaced?.();
      unwatchBidPlaced = null;
      unwatchAuctionEnded?.();
      unwatchAuctionEnded = null;
      void startInternal();
    }, delayMs);
  };

  const startInternal = async (): Promise<void> => {
    try {
      await syncPastEvents(options);

      unwatchCreated = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "MarketItemCreated",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
            const ts = await getTimestampForBlock(publicClient, timestampCache, log.blockNumber ?? 0n);
            const decoded = decodeEventLog({
              abi: marketplaceAbi,
              data: log.data,
              topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
            });

            const args = decoded.args as unknown as {
              itemId: bigint;
              tokenId: bigint;
              seller: `0x${string}`;
              owner: `0x${string}`;
              price: bigint;
            };

            const tokenId = args.tokenId.toString();
            const itemId = args.itemId.toString();

            const tokenUri = (await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: marketplaceAbi,
              functionName: "tokenURI",
              args: [args.tokenId]
            })) as string;

            let metadata: NftMetadata = {};
            try {
              metadata = await fetchTokenMetadata(tokenUri);
            } catch {
              metadata = {};
            }

            const name = metadata.name?.trim() ? metadata.name.trim() : `Token #${tokenId}`;
            const image = metadata.image?.trim() ? metadata.image.trim() : undefined;
            const mediaType = inferMediaType(metadata);
            const media =
              typeof metadata.animation_url === "string" && metadata.animation_url.trim()
                ? metadata.animation_url.trim()
                : typeof image === "string"
                  ? image
                  : undefined;
            const mimeType = metadata.mimeType?.trim() ? metadata.mimeType.trim() : undefined;

            await NFTModel.findOneAndUpdate(
              { tokenId },
              {
                $setOnInsert: {
                  tokenId,
                  creator: args.seller
                },
                $set: {
                  itemId,
                  seller: args.seller,
                  owner: args.owner,
                  price: args.price.toString(),
                  sold: false,
                  name,
                  description: metadata.description,
                  image,
                  media,
                  mediaType,
                  type: mediaType,
                  mimeType,
                  category: metadata.category
                }
              },
              { upsert: true, new: true }
            );

            const blockNumber = log.blockNumber ?? 0n;
            const logIndex = typeof log.logIndex === "number" ? log.logIndex : 0;

            await writeActivity({
              eventId: makeEventId(blockNumber, logIndex, "MarketItemCreated", "MINT"),
              type: "MINT",
              from: ZERO_ADDRESS,
              to: args.seller,
              tokenId,
              timestamp: ts
            });

            await writeActivity({
              eventId: makeEventId(blockNumber, logIndex, "MarketItemCreated", "LIST"),
              type: "LIST",
              from: args.seller,
              to: CONTRACT_ADDRESS,
              tokenId,
              price: args.price.toString(),
              timestamp: ts
            });
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      unwatchSold = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "MarketItemSold",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
            const ts = await getTimestampForBlock(publicClient, timestampCache, log.blockNumber ?? 0n);
            const decoded = decodeEventLog({
              abi: marketplaceAbi,
              data: log.data,
              topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
            });

            const args = decoded.args as unknown as {
              itemId: bigint;
              tokenId: bigint;
              buyer: `0x${string}`;
              price: bigint;
            };

            const tokenId = args.tokenId.toString();
            const itemId = args.itemId.toString();

            const existing = await NFTModel.findOne({ $or: [{ itemId }, { tokenId }] }).lean();
            const seller = typeof existing?.seller === "string" && existing.seller ? existing.seller : ZERO_ADDRESS;

            await NFTModel.findOneAndUpdate(
              { $or: [{ itemId }, { tokenId }] },
              {
                $set: {
                  itemId,
                  owner: args.buyer,
                  seller: "0x0000000000000000000000000000000000000000",
                  sold: true,
                  price: args.price.toString()
                }
              },
              { upsert: false }
            );

            const blockNumber = log.blockNumber ?? 0n;
            const logIndex = typeof log.logIndex === "number" ? log.logIndex : 0;

            await writeActivity({
              eventId: makeEventId(blockNumber, logIndex, "MarketItemSold", "SELL"),
              type: "SELL",
              from: seller,
              to: args.buyer,
              tokenId,
              price: args.price.toString(),
              timestamp: ts
            });
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      unwatchRelisted = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "MarketItemRelisted",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
            const ts = await getTimestampForBlock(publicClient, timestampCache, log.blockNumber ?? 0n);
            const decoded = decodeEventLog({
              abi: marketplaceAbi,
              data: log.data,
              topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
            });

            const args = decoded.args as unknown as {
              itemId: bigint;
              tokenId: bigint;
              seller: `0x${string}`;
              price: bigint;
            };

            const tokenId = args.tokenId.toString();
            const itemId = args.itemId.toString();

            await NFTModel.findOneAndUpdate(
              { $or: [{ itemId }, { tokenId }] },
              {
                $set: {
                  itemId,
                  seller: args.seller,
                  owner: CONTRACT_ADDRESS,
                  sold: false,
                  price: args.price.toString()
                }
              },
              { upsert: false }
            );

            const blockNumber = log.blockNumber ?? 0n;
            const logIndex = typeof log.logIndex === "number" ? log.logIndex : 0;

            await writeActivity({
              eventId: makeEventId(blockNumber, logIndex, "MarketItemRelisted", "LIST"),
              type: "LIST",
              from: args.seller,
              to: CONTRACT_ADDRESS,
              tokenId,
              price: args.price.toString(),
              timestamp: ts
            });
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      unwatchAuctionCreated = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "AuctionCreated",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
              const decoded = decodeEventLog({
                abi: marketplaceAbi,
                data: log.data,
                topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
              });

              const args = decoded.args as unknown as {
                tokenId: bigint;
                seller: `0x${string}`;
                minBid: bigint;
                endTime: bigint;
              };

              const tokenId = args.tokenId.toString();

              try {
                await upsertAuctionCreated({ tokenId, seller: args.seller, minBid: args.minBid, endTime: args.endTime });
              } catch (err) {
                console.error("Watcher: failed to upsert AuctionCreated", err);
              }
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      unwatchBidPlaced = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "BidPlaced",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
              const decoded = decodeEventLog({
                abi: marketplaceAbi,
                data: log.data,
                topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
              });

              const args = decoded.args as unknown as { tokenId: bigint; bidder: `0x${string}`; amount: bigint };
              const tokenId = args.tokenId.toString();

              try {
                await upsertBidPlaced({ tokenId, bidder: args.bidder, amount: args.amount });
              } catch (err) {
                console.error("Watcher: failed to upsert BidPlaced", err);
              }
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      unwatchAuctionEnded = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: marketplaceAbi,
        eventName: "AuctionEnded",
        pollingInterval: 2_000,
        onLogs: async (logs) => {
          try {
            for (const log of logs) {
              const ts = await getTimestampForBlock(publicClient, timestampCache, log.blockNumber ?? 0n);
              const decoded = decodeEventLog({
                abi: marketplaceAbi,
                data: log.data,
                topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]]
              });

              const args = decoded.args as unknown as {
                tokenId: bigint;
                seller: `0x${string}`;
                winner: `0x${string}`;
                amount: bigint;
              };

              const tokenId = args.tokenId.toString();

              try {
                await upsertAuctionEnded({ tokenId, seller: args.seller, winner: args.winner, amount: args.amount, timestamp: ts });
              } catch (err) {
                console.error("Watcher: failed to upsert AuctionEnded", err);
              }
            }
          } catch (err) {
            scheduleRestart(err);
          }
        },
        onError: scheduleRestart
      });

      restartAttempts = 0;
    } catch (err) {
      scheduleRestart(err);
    }
  };

  void startInternal();
  return stop;
}
