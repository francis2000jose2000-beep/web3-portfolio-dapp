import type { Metadata } from "next";
import { UploadNftClient } from "@/app/upload-nft/upload-client";

export const metadata: Metadata = {
  title: "Upload NFT",
  description: "Mint and list your NFT."
};

export default function UploadNftPage() {
  return <UploadNftClient />;
}

