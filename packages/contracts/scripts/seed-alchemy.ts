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
      pageSize: 20,
    });

    for (const item of nfts.nfts) {
      // 1. 'image' is an object, not an array. We use 'contentType' instead of 'format'
      const format = item.image?.contentType?.toLowerCase() || "";
      let detectedType: "image" | "audio" | "video" = "image";
      
      // 2. Since contentType returns MIME types (e.g., 'video/mp4'), use .includes()
      if (format.includes("video") || format.includes("mp4") || format.includes("webm")) {
        detectedType = "video";
      } else if (format.includes("audio") || format.includes("mp3") || format.includes("wav")) {
        detectedType = "audio";
      }

      const metadata = {
        tokenId: item.tokenId,
        name: item.name || `Cyber Asset #${item.tokenId}`,
        description: item.description || "No description provided.",
        
        // 3. 'media' is deprecated. Extract the URL directly from the 'image' object
        image: item.image?.cachedUrl || item.image?.originalUrl || "", 
        
        seller: "0x0000000000000000000000000000000000000000",
        owner: item.contract.address,
        price: (Math.random() * (0.5 - 0.01) + 0.01).toFixed(3),
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
