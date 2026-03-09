import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "NFT Details",
  description: "NFT details, pricing, and ownership."
};

export default async function NftDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  redirect(`/nft/${encodeURIComponent(resolved.id)}`);
}
