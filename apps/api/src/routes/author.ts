import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { AuthorModel } from "../models/Author";
import { asyncHandler } from "../utils/asyncHandler";

export const authorRouter: Router = Router();

function isHexAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

authorRouter.get(
  "/:address",
  asyncHandler(async (req, res) => {
    const address = typeof req.params.address === "string" ? req.params.address.trim() : "";
    if (!isHexAddress(address)) throw new AppError("Invalid address", 400);

    const doc = await AuthorModel.findOne({ address: address.toLowerCase() }).lean();
    if (!doc) {
      res.status(200).json({
        author: {
          address: address.toLowerCase(),
          username: null,
          bio: null,
          twitter: null,
          avatarUrl: null,
          coverUrl: null
        }
      });
      return;
    }

    res.status(200).json({ author: doc });
  })
);

authorRouter.put(
  "/:address",
  asyncHandler(async (req, res) => {
    const address = typeof req.params.address === "string" ? req.params.address.trim() : "";
    if (!isHexAddress(address)) throw new AppError("Invalid address", 400);

    const payload = req.body as Record<string, unknown>;
    const username = typeof payload.username === "string" ? payload.username.trim() : undefined;
    const bio = typeof payload.bio === "string" ? payload.bio.trim() : undefined;
    const twitter = typeof payload.twitter === "string" ? payload.twitter.trim() : undefined;
    const avatarUrl = typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim() : undefined;
    const coverUrl = typeof payload.coverUrl === "string" ? payload.coverUrl.trim() : undefined;

    const update: Record<string, unknown> = {};
    if (username !== undefined) update.username = username;
    if (bio !== undefined) update.bio = bio;
    if (twitter !== undefined) update.twitter = twitter;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) update.coverUrl = coverUrl;

    const author = await AuthorModel.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $set: update, $setOnInsert: { address: address.toLowerCase() } },
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ author });
  })
);

