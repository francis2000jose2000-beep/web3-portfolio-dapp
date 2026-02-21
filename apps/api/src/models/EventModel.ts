import mongoose, { type InferSchemaType } from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096
    },
    participants: {
      type: [String],
      required: true,
      default: [],
      set: (vals: unknown) => {
        if (!Array.isArray(vals)) return [];
        const normalized = vals
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim().toLowerCase())
          .filter((x) => x !== "");
        return Array.from(new Set(normalized));
      },
      index: true
    }
  },
  {
    timestamps: true
  }
);

export type EventDocument = InferSchemaType<typeof eventSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const EventModel: mongoose.Model<EventDocument> =
  (mongoose.models.Event as mongoose.Model<EventDocument> | undefined) ?? mongoose.model<EventDocument>("Event", eventSchema);

