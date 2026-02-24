import "dotenv/config";
import http from "node:http";
import { createApp } from "./app";
import { connectToDatabase } from "./config/db";
import { getPort } from "./config/env";
import { NFTModel } from "./models/NFTModel";
import { DEFAULT_EXTERNAL_INDEX_TARGETS, DEFAULT_EXTERNAL_TOTAL_LIMIT, indexExternalNfts } from "./services/externalNftIndexer";
import { startPriceRefresherService } from "./services/priceRefresher";
import { startWatcherService } from "./services/watcher";

async function start(): Promise<void> {
  await connectToDatabase();

  try {
    const apiKey = typeof process.env.ALCHEMY_API_KEY === "string" ? process.env.ALCHEMY_API_KEY.trim() : "";
    if (apiKey) {
      const existing = await NFTModel.countDocuments({ isExternal: true, contractAddress: { $type: "string" } });
      if (existing < DEFAULT_EXTERNAL_TOTAL_LIMIT) {
        const result = await indexExternalNfts({ apiKey, targets: DEFAULT_EXTERNAL_INDEX_TARGETS });
        console.log(`Indexed external NFTs: ${result.total} (inserted=${result.inserted}, updated=${result.updated})`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`External NFT indexing failed: ${message}`);
  }

  try {
    await startWatcherService();
  } catch (err: unknown) {
    console.error("Watcher failed to start", err);
  }

  try {
    startPriceRefresherService();
  } catch (err: unknown) {
    console.error("Price refresher failed to start", err);
  }

  const app = createApp();

  const port = getPort();

  const server = http.createServer(app);

  server.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}. Shutting down...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
