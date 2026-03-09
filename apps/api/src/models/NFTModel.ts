import mongoose, { type InferSchemaType } from "mongoose";

const nftSchema = new mongoose.Schema(
  {
    tokenId: {
      type: String,
      required: true,
      trim: true
    },
    itemId: {
      type: String,
      required: false,
      trim: true,
      index: true
    },
    seller: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    creator: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    owner: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    price: {
      type: String,
      required: false,
      trim: true
    },
    sold: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    attributes: {
      type: [mongoose.Schema.Types.Mixed],
      required: false,
      default: undefined
    },
    image: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    media: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    mediaType: {
      type: String,
      required: false,
      trim: true,
      maxlength: 32,
      index: true
    },
    type: {
      type: String,
      required: false,
      trim: true,
      maxlength: 32,
      index: true
    },
    mimeType: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128
    },
    category: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128
    },
    isExternal: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    contractAddress: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      maxlength: 64,
      index: true
    },
    chainId: {
      type: Number,
      required: false,
      index: true
    },
    externalUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    viewCount: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    isAuction: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    minBid: {
      type: String,
      required: false,
      trim: true
    },
    highestBid: {
      type: String,
      required: false,
      trim: true
    },
    highestBidder: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    auctionEndTime: {
      type: Date,
      required: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

nftSchema.index({ tokenId: 1 }, { unique: true, partialFilterExpression: { isExternal: false } });
nftSchema.index(
  { contractAddress: 1, tokenId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isExternal: true,
      contractAddress: { $type: "string" }
    }
  }
);

nftSchema.index({ createdAt: -1 });
nftSchema.index({ chainId: 1, createdAt: -1 });
nftSchema.index({ contractAddress: 1, createdAt: -1 });
nftSchema.index({ isExternal: 1, viewCount: -1, updatedAt: -1 });

export type NFTDocument = InferSchemaType<typeof nftSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const NFTModel: mongoose.Model<NFTDocument> =
  (mongoose.models.NFT as mongoose.Model<NFTDocument> | undefined) ?? mongoose.model<NFTDocument>("NFT", nftSchema);
