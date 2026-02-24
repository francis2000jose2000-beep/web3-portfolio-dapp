"use client";

import { useMemo } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { toast } from "sonner";
import { NFTCard } from "@/components/NFTCard";
import type { DemoMainnetNft } from "@/lib/constants/mock-nfts";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";

type FeaturedDemoSectionsProps = {
  nfts: DemoMainnetNft[];
};

export function FeaturedDemoSections({ nfts }: FeaturedDemoSectionsProps) {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { featuredDrop, featuredAuction } = useMemo(() => {
    const sorted = [...nfts].sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
    const auctions = sorted.filter((n) => n.isAuction === true).slice(0, 4);
    const drops = sorted.filter((n) => n.isAuction !== true).slice(0, 4);
    return { featuredDrop: drops, featuredAuction: auctions };
  }, [nfts]);

  const simulate = async (payload: { action: "Buy" | "Sell" | "Bid"; nft: DemoMainnetNft; amountEth?: string }): Promise<void> => {
    try {
      if (!isConnected) {
        toast.warning("Connect wallet to simulate transaction");
        return;
      }

      const msg =
        payload.action === "Bid"
          ? `Portfolio Demo: I want to place a bid of ${payload.amountEth ?? "0"} ETH on ${payload.nft.name} (${payload.nft.collection}).\n\nSigner: ${address ?? ""}\nTimestamp: ${new Date().toISOString()}`
          : `Portfolio Demo: I want to ${payload.action.toLowerCase()} ${payload.nft.name} (${payload.nft.collection}) for ${payload.nft.priceEth} ETH.\n\nSigner: ${address ?? ""}\nTimestamp: ${new Date().toISOString()}`;

      const toastId = toast.loading("Awaiting signature...");
      await signMessageAsync({ message: msg });
      toast.success("Portfolio Demo: Simulated transaction successful", { id: toastId });
    } catch (err: unknown) {
      if (isUserRejectedError(err)) toast.warning("Signature cancelled.");
      else toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-12 px-4 sm:px-6 lg:px-8">
      <section>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Featured Drop</h2>
            <p className="mt-2 text-sm text-zinc-300">High-ticket curated mainnet assets for a portfolio demo.</p>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 sm:block">
            Live demo
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {featuredDrop.map((nft) => {
            const canSell = typeof address === "string" && address.toLowerCase() === nft.ownerAddress.toLowerCase();
            return (
              <NFTCard
                key={nft.id}
                href={`/nft/${nft.id}`}
                title={nft.name}
                subtitle={nft.collection}
                rightBadge="Featured"
                imageUrl={nft.image}
                mediaUrl={nft.image}
                type={nft.type}
                isExternal={true}
                externalUrl={nft.externalUrl}
                priceLabel={`${nft.priceEth} ETH`}
                demoActionLabel={canSell ? "Sell" : "Buy Now"}
                onDemoAction={() => simulate({ action: canSell ? "Sell" : "Buy", nft })}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Featured Auction</h2>
            <p className="mt-2 text-sm text-zinc-300">Signature-based bidding simulation. No local contracts are called.</p>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 sm:block">
            Auctions
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredAuction.map((nft) => (
            <NFTCard
              key={nft.id}
              href={`/nft/${nft.id}`}
              title={nft.name}
              subtitle={nft.collection}
              rightBadge="Auction"
              imageUrl={nft.image}
              mediaUrl={nft.image}
              type={nft.type}
              isExternal={true}
              externalUrl={nft.externalUrl}
              priceLabel={`${nft.highestBid ?? nft.minBid ?? nft.priceEth} ETH`}
              demoActionLabel="Place Bid"
              onDemoAction={() => simulate({ action: "Bid", nft, amountEth: nft.highestBid ?? nft.minBid ?? "0" })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
