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

export function createApp(options: { includeNotFound?: boolean } = {}): Express {
  const app: Express = express();

  const allowedOrigins = getCorsOrigins();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("CORS origin not allowed"));
      },
      credentials: true
    })
  );

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
