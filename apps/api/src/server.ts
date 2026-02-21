import "dotenv/config";
import http from "node:http";
import { createApp } from "./app";
import { connectToDatabase } from "./config/db";
import { getPort } from "./config/env";
import { startWatcherService } from "./services/watcher";

async function start(): Promise<void> {
  await connectToDatabase();

  try {
    await startWatcherService();
  } catch (err: unknown) {
    console.error("Watcher failed to start", err);
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
