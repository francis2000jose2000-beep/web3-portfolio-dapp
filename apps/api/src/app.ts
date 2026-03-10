import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { userRouter } from "./routes/userRoutes";
import { nftRouter } from "./routes/nft";
import { authorRouter } from "./routes/author";
import { activityRouter } from "./routes/activity";
import { contactRouter } from "./routes/contact";
import { eventsRouter } from "./routes/events";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { getCorsOrigins } from "./config/env";
import { connectToDatabase } from "./config/db";

export function createApp(options: { includeNotFound?: boolean } = {}): Express {
  const app: Express = express();

  const allowedOrigins = getCorsOrigins();
  allowedOrigins.push("https://web3-portfolio-dapp.vercel.app");

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      allowedHeaders: ["Content-Type", "Authorization", "x-chain-id"]
    })
  );

  // Database Connection Middleware
  app.use(async (_req, _res, next) => {
    try {
      await connectToDatabase();
      next();
    } catch (err) {
      console.error("Database connection failed in middleware:", err);
      next(err);
    }
  });

  // Network Access Log
  app.use((req, _res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const chainId = req.headers["x-chain-id"] || "N/A";
    console.log(`[Request] ${req.method} ${req.url} | IP: ${ip} | Chain: ${chainId}`);
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/users", userRouter);
  app.use("/api/nfts", nftRouter);
  app.use("/api/authors", authorRouter);
  app.use("/api/activity", activityRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/events", eventsRouter);

  if (options.includeNotFound !== false) {
    app.use(notFoundHandler);
    app.use(errorHandler);
  }

  return app;
}
