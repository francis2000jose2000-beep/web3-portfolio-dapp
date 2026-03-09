import "dotenv/config";
import { connectToDatabase } from "../config/db";
import { EventModel } from "../models/EventModel";

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function getArgValue(flagPrefix: string): string | undefined {
  const arg = process.argv.find((x) => x.startsWith(flagPrefix));
  if (!arg) return undefined;
  const [, value] = arg.split("=");
  return typeof value === "string" ? value : undefined;
}

async function seedEvents(): Promise<void> {
  await connectToDatabase();

  const fallback = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const participantRaw = getArgValue("--participant=") ?? fallback;
  const walletAddress = normalizeAddress(participantRaw);

  console.log(`Seeding events for participant: ${walletAddress}`);

  const now = Date.now();
  const mockEvents = [
    {
      title: "Neo-Tokyo Art Drop",
      date: new Date(now + 86400000 * 5),
      description: "VIP access to the new collection of holographic avatars.",
      participants: [walletAddress, "0x1234567890123456789012345678901234567890"]
    },
    {
      title: "Underground Cyber Auction",
      date: new Date(now + 86400000 * 2),
      description: "Private auction of Web2 relics. Members only.",
      participants: [walletAddress]
    },
    {
      title: "Neon Syndicate Meetup",
      date: new Date(now + 86400000 * 14),
      description: "Virtual metaverse meetup to discuss smart contract expansion.",
      participants: [walletAddress, "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]
    }
  ];

  await EventModel.deleteMany({});
  await EventModel.insertMany(mockEvents);

  console.log("Seeded events successfully.");
}

seedEvents().catch((error: unknown) => {
  console.error("Seed events failed:", error);
  process.exitCode = 1;
});
