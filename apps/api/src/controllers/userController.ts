import type { Request, RequestHandler, Response } from "express";
import { UserModel, type UserDocument } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { asyncHandler } from "../utils/asyncHandler";
import { isEvmAddress } from "../utils/validate";

export interface WalletParams {
  walletAddress: string;
  [key: string]: string;
}

type UpsertUserBody = {
  username?: unknown;
  bio?: unknown;
  avatarUrl?: unknown;
  websiteUrl?: unknown;
  twitterUrl?: unknown;
};

export type UserResponse = {
  walletAddress: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type ErrorResponse = {
  message: string;
};

function requireWalletAddressParam(req: Request<WalletParams>): string {
  const walletAddress = req.params.walletAddress;
  if (!walletAddress) throw new AppError("Missing wallet address", 400);

  const normalized = walletAddress.toLowerCase();
  if (!isEvmAddress(normalized)) throw new AppError("Invalid wallet address", 400);

  return normalized;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim();
}

function toUserResponse(doc: UserDocument): UserResponse {
  const base: UserResponse = {
    walletAddress: doc.walletAddress,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };

  if (typeof doc.username === "string") base.username = doc.username;
  if (typeof doc.bio === "string") base.bio = doc.bio;
  if (typeof doc.avatarUrl === "string") base.avatarUrl = doc.avatarUrl;
  if (typeof doc.websiteUrl === "string") base.websiteUrl = doc.websiteUrl;
  if (typeof doc.twitterUrl === "string") base.twitterUrl = doc.twitterUrl;

  return base;
}

export const getUserByWallet: RequestHandler<WalletParams, UserResponse | ErrorResponse> = asyncHandler<
  WalletParams,
  UserResponse | ErrorResponse
>(async (req: Request<WalletParams>, res: Response<UserResponse | ErrorResponse>) => {
    const walletAddress = requireWalletAddressParam(req);

    const user = await UserModel.findOne({ walletAddress }).exec();
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(toUserResponse(user));
  }
);

export const upsertUserByWallet: RequestHandler<WalletParams, UserResponse | ErrorResponse, UpsertUserBody> =
  asyncHandler<WalletParams, UserResponse | ErrorResponse, UpsertUserBody>(
    async (req: Request<WalletParams>, res: Response<UserResponse | ErrorResponse>) => {
      const walletAddress = requireWalletAddressParam(req);

      const body = (req.body ?? {}) as UpsertUserBody;

      const username = toOptionalString(body.username);
      const bio = toOptionalString(body.bio);
      const avatarUrl = toOptionalString(body.avatarUrl);
      const websiteUrl = toOptionalString(body.websiteUrl);
      const twitterUrl = toOptionalString(body.twitterUrl);

      const $set: Record<string, unknown> = { walletAddress };
      if (username !== undefined) $set.username = username;
      if (bio !== undefined) $set.bio = bio;
      if (avatarUrl !== undefined) $set.avatarUrl = avatarUrl;
      if (websiteUrl !== undefined) $set.websiteUrl = websiteUrl;
      if (twitterUrl !== undefined) $set.twitterUrl = twitterUrl;

      const user = await UserModel.findOneAndUpdate(
        { walletAddress },
        { $set },
        { new: true, upsert: true, runValidators: true }
      ).exec();

      res.status(200).json(toUserResponse(user));
    }
  );
