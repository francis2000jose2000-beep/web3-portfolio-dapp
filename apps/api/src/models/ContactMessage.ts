import mongoose, { type InferSchemaType, type Model } from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true
    },
    subject: {
      type: String,
      required: false,
      trim: true,
      maxlength: 120
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    source: {
      type: String,
      required: true,
      enum: ["web"],
      default: "web",
      index: true
    }
  },
  {
    timestamps: true
  }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });

export type ContactMessageDocument = InferSchemaType<typeof contactMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ContactMessageModel: Model<ContactMessageDocument> =
  (mongoose.models.ContactMessage as Model<ContactMessageDocument> | undefined) ??
  mongoose.model<ContactMessageDocument>("ContactMessage", contactMessageSchema);

