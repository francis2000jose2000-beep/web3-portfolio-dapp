import mongoose, { type InferSchemaType, type Model } from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 128
    },
    type: {
      type: String,
      required: true,
      enum: ["MINT", "LIST", "SELL", "TRANSFER"]
    },
    from: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    to: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true
    },
    tokenId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    price: {
      type: String,
      required: false,
      trim: true
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ tokenId: 1, timestamp: -1 });
activitySchema.index({ from: 1, timestamp: -1 });
activitySchema.index({ to: 1, timestamp: -1 });

export type ActivityDocument = InferSchemaType<typeof activitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ActivityModel: Model<ActivityDocument> =
  (mongoose.models.Activity as Model<ActivityDocument> | undefined) ?? mongoose.model<ActivityDocument>("Activity", activitySchema);

