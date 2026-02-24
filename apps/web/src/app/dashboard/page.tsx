"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address } from "viem";
import { hardhat } from "viem/chains";
import { NFTCard } from "@/components/NFTCard";
import { ListForSaleButton } from "@/components/ListForSaleButton";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";
import { formatEthForDisplay } from "@/lib/price";

type MarketItem = {
  itemId: bigint;
  tokenId: bigint;
  seller: Address;
  owner: Address;
  price: bigint;
  sold: boolean;
};

type TabKey = "collection" | "listings";

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as Record<string, unknown>;
  const message = anyErr.message;
  if (typeof message === "string") return message;
  return "Unknown error";
}

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="aspect-square bg-white/10" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isConnected, address } = useAccount();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? CONTRACT_ADDRESS : undefined;

  const [tab, setTab] = useState<TabKey>("collection");

  const queryEnabled = mounted && Boolean(contractAddress) && isConnected;

  const {
    data: myNftsData,
    isLoading: isLoadingMy,
    isError: isErrorMy,
    error: errorMy,
    refetch: refetchMy
  } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "fetchMyNFTs",
    chainId,
    query: {
      enabled: queryEnabled
    }
  });

  const {
    data: listedData,
    isLoading: isLoadingListed,
    isError: isErrorListed,
    error: errorListed,
    refetch: refetchListed
  } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "fetchItemsListed",
    chainId,
    query: {
      enabled: queryEnabled
    }
  });

  const myNfts = useMemo(() => {
    if (!myNftsData) return [];
    return myNftsData as readonly MarketItem[];
  }, [myNftsData]);

  const myListings = useMemo(() => {
    if (!listedData) return [];
    return listedData as readonly MarketItem[];
  }, [listedData]);

  const normalizedCollection = useMemo(() => {
    return myNfts.map((item) => ({
      key: `collection-${item.itemId.toString()}-${item.tokenId.toString()}`,
      tokenId: item.tokenId,
      seller: item.seller,
      owner: item.owner,
      sold: item.sold,
      priceWei: item.price,
      priceDisplay: formatEthForDisplay({ priceWei: item.price, isExternal: false })
    }));
  }, [myNfts]);

  const normalizedListings = useMemo(() => {
    return myListings.map((item) => ({
      key: `listings-${item.itemId.toString()}-${item.tokenId.toString()}`,
      tokenId: item.tokenId,
      seller: item.seller,
      sold: item.sold,
      priceWei: item.price,
      priceDisplay: formatEthForDisplay({ priceWei: item.price, isExternal: false })
    }));
  }, [myListings]);

  const activeItems = tab === "collection" ? normalizedCollection : normalizedListings;
  const isLoadingActive = tab === "collection" ? isLoadingMy : isLoadingListed;
  const isErrorActive = tab === "collection" ? isErrorMy : isErrorListed;
  const errorActive = tab === "collection" ? errorMy : errorListed;

  const handleRefresh = (): void => {
    void refetchMy();
    void refetchListed();
  };

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-300">Your collection and your active listings.</p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          disabled={!queryEnabled}
        >
          Refresh
        </button>
      </div>

      {!isConnected ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
          Connect your wallet to view your dashboard.
        </div>
      ) : null}

      {!contractAddress ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
          Missing/invalid `CONTRACT_ADDRESS` in `src/config/contracts.ts`.
        </div>
      ) : null}

      <div className="mt-8 inline-flex w-full rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab("collection")}
          className={
            tab === "collection"
              ? "flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-50"
              : "flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-zinc-50"
          }
        >
          My Collection
        </button>
        <button
          type="button"
          onClick={() => setTab("listings")}
          className={
            tab === "listings"
              ? "flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-50"
              : "flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-zinc-50"
          }
        >
          My Listings
        </button>
      </div>

      {isErrorActive ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          Error loading dashboard: {getErrorMessage(errorActive)}
        </div>
      ) : null}

      {queryEnabled && isLoadingActive ? <SkeletonGrid /> : null}

      {queryEnabled && !isLoadingActive && !isErrorActive ? (
        activeItems.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeItems.map((item) => (
              <div key={item.key} className="space-y-3">
                <NFTCard
                  title={`Token #${item.tokenId.toString()}`}
                  subtitle={
                    tab === "collection"
                      ? `Owned | ${item.priceDisplay.value}${item.priceDisplay.showUnit ? " ETH" : ""}`
                      : `Listed | ${item.priceDisplay.value}${item.priceDisplay.showUnit ? " ETH" : ""}`
                  }
                  rightBadge={tab === "collection" ? "Owned" : "Listed"}
                  marketplaceAddress={contractAddress}
                  chainId={chainId}
                  tokenId={item.tokenId}
                  seller={item.seller}
                  sold={item.sold}
                  priceWei={item.priceWei}
                />

                {tab === "collection" && item.sold === true && contractAddress && address ? (
                  <ListForSaleButton
                    tokenId={item.tokenId}
                    marketplaceAddress={contractAddress}
                    chainId={chainId}
                    disabled={!queryEnabled}
                    onListed={() => {
                      handleRefresh();
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-zinc-200">
              {tab === "collection" ? "You don't own any NFTs yet." : "You don't have any active listings."}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {tab === "collection" ? "Buy one from Explore." : "Mint and list one from Create."}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
