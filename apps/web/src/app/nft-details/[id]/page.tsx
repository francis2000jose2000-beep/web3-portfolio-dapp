import type { Metadata } from "next";
import { NftDetailsClient } from "@/app/nft-details/[id]/token-client";

export const metadata: Metadata = {
  title: "NFT Details",
  description: "NFT details, pricing, and ownership."
};

export default async function NftDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <NftDetailsClient id={resolved.id} />;
}
