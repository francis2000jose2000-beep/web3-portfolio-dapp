import type { Metadata } from "next";
import { NftPageClient } from "@/app/nft/[id]/token-client";

export const metadata: Metadata = {
  title: "NFT",
  description: "NFT details, metadata, and pricing."
};

export default async function NftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <NftPageClient id={resolved.id} />;
}

