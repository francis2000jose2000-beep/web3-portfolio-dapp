import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { ContactMessageModel } from "../models/ContactMessage";
import { asyncHandler } from "../utils/asyncHandler";

export const contactRouter: Router = Router();

type ContactBody = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

contactRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as ContactBody;
    const name = asTrimmedString(body.name);
    const email = asTrimmedString(body.email);
    const subject = asTrimmedString(body.subject);
    const message = asTrimmedString(body.message);

    if (!name) throw new AppError("Missing name", 400);
    if (!email) throw new AppError("Missing email", 400);
    if (!isValidEmail(email)) throw new AppError("Invalid email", 400);
    if (!message) throw new AppError("Missing message", 400);

    const doc = await ContactMessageModel.create({
      name,
      email,
      subject: subject ?? undefined,
      message,
      source: "web"
    });

    res.status(201).json({ ok: true, id: doc._id.toString() });
  })
);

