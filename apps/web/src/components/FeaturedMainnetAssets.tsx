"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNFTsPage } from "@/lib/api";
import { NFTCard } from "@/components/NFTCard";
import { DEMO_MAINNET_NFTS } from "@/lib/constants/mock-nfts";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { getChainDisplayName } from "@/lib/chain";
import { getNftDisplayName } from "@/lib/nft";
import { tryParseWeiBigint } from "@/lib/price";
import { type Address } from "viem";

const FEATURED_COLLECTIONS = [
  "Doodles",
  "Bored Ape Yacht Club",
  "Azuki",
  "CryptoPunks",
  "Pudgy Penguins",
  "Milady Maker"
];

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sellerLabel(seller: Address): string {
  return `Seller: ${truncateAddress(seller)}`;
}

export function FeaturedMainnetAssets() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-mainnet-assets"],
    queryFn: () => fetchNFTsPage({
      collections: FEATURED_COLLECTIONS.join(","),
      limit: 8,
      sort: "price_desc"
    }),
    staleTime: 60000,
  });

  // Use API data if available, otherwise fallback to demo data
  // We check if data.items exists and has length > 0
  const hasApiData = data?.items && data.items.length > 0;
  const items = hasApiData ? data.items : DEMO_MAINNET_NFTS;
  
  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8">
         <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Featured Mainnet Assets</h2>
            <p className="mt-2 text-sm text-zinc-300">Loading live assets...</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <NFTSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Featured Mainnet Assets</h2>
          <p className="mt-2 text-sm text-zinc-300">
            {hasApiData 
              ? "Live assets indexed from Ethereum Mainnet." 
              : "View-only demo NFTs to keep your portfolio UI fully populated."}
          </p>
        </div>
        <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 sm:block">
          {items.length} items
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          // If it's a demo item (has 'id' like 'demo-...') or API item (has '_id')
          const rawId = typeof (item as any).id === "string" ? (item as any).id : (item._id ?? "");
          
          // Helper to get chain display name
          const chainLabel = getChainDisplayName({
            chainId: typeof item.chainId === "number" ? item.chainId : undefined,
            contractAddress: item.contractAddress,
            externalUrl: item.externalUrl
          });

          // Helper for seller address
          const sellerAddr = item && 'seller' in item && typeof item.seller === "string" && isAddress(item.seller) ? (item.seller as Address) : undefined;
          
          // Helper for price
          const priceWeiBig = tryParseWeiBigint(item.priceWei ?? item.price);
          const tokenIdBig = tryParseWeiBigint(item.tokenId);

          const collectionName = item.category || (item as any).collection || "Unknown Collection";

          return (
            <NFTCard
              key={rawId}
              href={`/nft/${rawId}`}
              title={item.name || `${collectionName} #${item.tokenId}`}
              subtitle={
                sellerAddr
                  ? `${chainLabel}${chainLabel ? " | " : ""}${sellerLabel(sellerAddr)}`
                  : collectionName
                    ? `${chainLabel}${chainLabel ? " | " : ""}Collection: ${collectionName}`
                    : chainLabel || undefined
              }
              rightBadge={item.isExternal ? "Mainnet Asset" : item.sold ? "Sold" : "Listed"}
              imageUrl={item.image}
              mediaUrl={item.media}
              type={item.type}
              mediaType={item.mediaType}
              mimeType={item.mimeType}
              isExternal={item.isExternal}
              externalUrl={item.externalUrl}
              chainId={item.chainId}
              // Only pass purchase-related props if not external/demo (though demo items set isExternal=true)
              tokenId={item.isExternal ? undefined : (typeof tokenIdBig === "bigint" ? tokenIdBig : undefined)}
              seller={item.isExternal ? undefined : sellerAddr}
              sold={item.sold}
              priceWei={typeof priceWeiBig === "bigint" ? priceWeiBig : undefined}
              priceLabel={typeof item.price === "string" ? item.price : item.priceEth}
            />
          );
        })}
      </div>
    </section>
  );
}
