import mongoose, { type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: false,
      trim: true,
      maxlength: 40
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 280
    },
    avatarUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2048
    },
    websiteUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2048
    },
    twitterUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2048
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ walletAddress: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel: mongoose.Model<UserDocument> =
  (mongoose.models.User as mongoose.Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>("User", userSchema);
