import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { ActivityModel } from "../models/Activity";
import { asyncHandler } from "../utils/asyncHandler";

export const activityRouter: Router = Router();

function isHexAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

activityRouter.get(
  "/token/:tokenId",
  asyncHandler(async (req, res) => {
    const tokenId = typeof req.params.tokenId === "string" ? req.params.tokenId.trim() : "";
    if (!tokenId) throw new AppError("Missing tokenId", 400);

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 100;

    const items = await ActivityModel.find({ tokenId }).sort({ timestamp: -1 }).limit(limit).lean();
    res.status(200).json({ items });
  })
);

activityRouter.get(
  "/:address",
  asyncHandler(async (req, res) => {
    const address = typeof req.params.address === "string" ? req.params.address.trim() : "";
    if (!isHexAddress(address)) throw new AppError("Invalid address", 400);

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 100;

    const addr = address.toLowerCase();
    const items = await ActivityModel.find({ $or: [{ from: addr }, { to: addr }] })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ items });
  })
);
