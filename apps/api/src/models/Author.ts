import mongoose, { type InferSchemaType, type Model } from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 42,
      maxlength: 42
    },
    username: {
      type: String,
      required: false,
      trim: true,
      minlength: 2,
      maxlength: 32
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 280
    },
    twitter: {
      type: String,
      required: false,
      trim: true,
      maxlength: 64
    },
    avatarUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    coverUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    }
  },
  {
    timestamps: true
  }
);

authorSchema.index({ address: 1 }, { unique: true });

export type Author = InferSchemaType<typeof authorSchema>;

export const AuthorModel: Model<Author> =
  (mongoose.models.Author as Model<Author> | undefined) ?? mongoose.model<Author>("Author", authorSchema);
