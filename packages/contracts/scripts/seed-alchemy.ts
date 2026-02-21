import "dotenv/config";
import mongoose from "mongoose";
import { Alchemy, Network } from "alchemy-sdk";
import { NFTModel } from "../../../apps/api/src/models/NFTModel";

const config = {
  // Use the env variable name, not the key itself here!
  apiKey: process.env.ALCHEMY_API_KEY, 
  network: Network.MATIC_MAINNET, // This is the value for Polygon Mainnet
};

const alchemy = new Alchemy(config);

async function seedPolygonNFTs() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected successfully.");

    // Example: A popular Polygon Collection (e.g., Zed Run or a Cyberpunk set)
    // Replace this with a specific contract address if you have one in mind
    const collectionAddress = "0xa5f1ea7df861952863df2e8d1312f7305dabf215"; 
    
    console.log(`Fetching NFTs from Polygon: ${collectionAddress}`);
    const nfts = await alchemy.nft.getNftsForContract(collectionAddress, {
      limit: 20,
    });

    for (const item of nfts.nfts) {
      // Logic to detect media type based on format
      const format = item.media[0]?.format;
      let detectedType: "image" | "audio" | "video" = "image";
      
      if (format === "mp4" || format === "webm") detectedType = "video";
      if (format === "mp3" || format === "wav") detectedType = "audio";

      const metadata = {
        tokenId: item.tokenId,
        name: item.title || `Cyber Asset #${item.tokenId}`,
        description: item.description || "No description provided.",
        image: item.media[0]?.gateway || "",
        seller: "0x0000000000000000000000000000000000000000",
        owner: item.contract.address,
        price: (Math.random() * (0.5 - 0.01) + 0.01).toFixed(3), // Random mock price
        sold: false,
        category: "Collectibles",
        type: detectedType,
        isExternal: true,
        externalUrl: `https://opensea.io/assets/matic/${item.contract.address}/${item.tokenId}`
      };

      // Upsert based on TokenId AND Contract to avoid collisions with other networks
      await NFTModel.updateOne({ tokenId: item.tokenId, owner: item.contract.address }, metadata, { upsert: true });
      
      console.log(`Synced: ${metadata.name} [${detectedType}]`);
    }

    console.log("Polygon Seed Complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seed Failed:", error);
    process.exit(1);
  }
}

seedPolygonNFTs();
