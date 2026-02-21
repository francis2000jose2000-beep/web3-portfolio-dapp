import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { EventModel } from "../models/EventModel";
import { asyncHandler } from "../utils/asyncHandler";

export const eventsRouter: Router = Router();

function isHexAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const participantRaw = typeof req.query.participant === "string" ? req.query.participant.trim() : "";
    if (!isHexAddress(participantRaw)) throw new AppError("Invalid participant", 400);

    const participant = participantRaw.toLowerCase();

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50;

    const items = await EventModel.find({ participants: participant }).sort({ date: 1 }).limit(limit).lean();
    res.status(200).json({ items });
  })
);

