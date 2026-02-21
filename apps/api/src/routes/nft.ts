import { Router } from "express";
import multer from "multer";
import { AppError } from "../middleware/errorHandler";
import { uploadFileBufferToPinata, uploadJsonToPinata } from "../services/pinata";
import { asyncHandler } from "../utils/asyncHandler";
import { NFTModel } from "../models/NFTModel";

export const nftRouter: Router = Router();

function toSort(sort: string | undefined): Record<string, 1 | -1> {
  if (sort === "newest") return { createdAt: -1 };
  if (sort === "oldest") return { createdAt: 1 };
  if (sort === "price_asc") return { price: 1 };
  if (sort === "price_desc") return { price: -1 };
  return { createdAt: -1 };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addressQuery(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value.toLowerCase())}$`, "i");
}

function categoryQuery(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function categoryAliases(category: string): string[] {
  const c = normalizeCategory(category);
  if (!c) return [];

  if (c === "art") return ["art", "image", "pfp", "profile", "profile picture", "visual", "2d", "3d"];
  if (c === "collectibles" || c === "collectible") return ["collectibles", "collectible", "pfp", "trading card", "cards", "game"];
  if (c === "audio") return ["audio", "music", "sound", "podcast"];
  if (c === "video") return ["video", "movie", "animation", "motion"];
  return [c];
}

nftRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const owner = typeof req.query.owner === "string" ? req.query.owner.trim() : "";
    const seller = typeof req.query.seller === "string" ? req.query.seller.trim() : "";
    const creator = typeof req.query.creator === "string" ? req.query.creator.trim() : "";
    const soldRaw = typeof req.query.sold === "string" ? req.query.sold.trim().toLowerCase() : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort.trim() : "newest";
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 24;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 24;

    const query: Record<string, unknown> = {};
    if (category) {
      const aliases = categoryAliases(category);
      query.category = aliases.length > 1 ? { $in: aliases.map(categoryQuery) } : categoryQuery(category);
    }

    if (owner) query.owner = addressQuery(owner);
    if (seller) query.seller = addressQuery(seller);
    if (creator) query.creator = addressQuery(creator);

    if (soldRaw === "true") query.sold = true;
    if (soldRaw === "false") query.sold = false;

    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } }
      ];
    }

    const items = await NFTModel.find(query).sort(toSort(sort)).limit(limit).lean();
    res.status(200).json({ items });
  })
);

nftRouter.get(
  "/:tokenId",
  asyncHandler(async (req, res) => {
    const tokenId = req.params.tokenId;
    if (!tokenId || tokenId.trim() === "") throw new AppError("Missing tokenId", 400);

    const nft = await NFTModel.findOne({ tokenId }).lean();
    if (!nft) throw new AppError("NFT not found", 404);

    res.status(200).json({ nft });
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const mime = typeof file.mimetype === "string" ? file.mimetype : "";
    const lowerName = typeof file.originalname === "string" ? file.originalname.toLowerCase() : "";

    const allowedMime = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "video/quicktime"
    ]);

    const allowedExt = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".mp4", ".mov"];
    const hasAllowedExt = allowedExt.some((ext) => lowerName.endsWith(ext));

    if (allowedMime.has(mime) || hasAllowedExt) {
      cb(null, true);
      return;
    }

    cb(new AppError("Unsupported file type. Use png/jpg/webp/gif/mp3/wav/mp4/mov", 400));
  }
});

nftRouter.post(
  "/upload",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.file?.[0] ?? files?.image?.[0] ?? null;
    if (!file) throw new AppError("Missing file", 400);

    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : undefined;
    const category = typeof req.body.category === "string" ? req.body.category.trim() : undefined;

    if (name.length === 0) throw new AppError("Missing name", 400);

    const mediaUpload = await uploadFileBufferToPinata({
      buffer: file.buffer,
      filename: file.originalname,
      displayName: `${name}-media`
    });

    const mime = typeof file.mimetype === "string" ? file.mimetype : "";
    const mediaType = mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "image";

    const metadata: Record<string, unknown> = {
      name,
      ...(description ? { description } : {}),
      ...(category ? { category } : {}),
      type: mediaType,
      mediaType,
      mimeType: mime
    };

    if (mediaType === "image") {
      metadata.image = mediaUpload.ipfsUri;
    } else {
      metadata.animation_url = mediaUpload.ipfsUri;
    }

    const metadataUpload = await uploadJsonToPinata(metadata, {
      displayName: `${name}-metadata`
    });

    res.status(201).json({
      tokenURI: metadataUpload.ipfsUri,
      tokenURIGateway: metadataUpload.gatewayUrl,
      type: mediaType,
      mediaType,
      mimeType: mime,
      media: mediaUpload.ipfsUri,
      mediaGateway: mediaUpload.gatewayUrl,
      image: mediaType === "image" ? mediaUpload.ipfsUri : undefined,
      imageGateway: mediaType === "image" ? mediaUpload.gatewayUrl : undefined
    });
  })
);
