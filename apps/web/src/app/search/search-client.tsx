"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hardhat } from "viem/chains";
import { formatEther, type Address } from "viem";
import { motion } from "framer-motion";
import { Category, type CategoryOption } from "@/components/Category";
import { Filter } from "@/components/Filter";
import { Mounted } from "@/components/Mounted";
import { EmptyState } from "@/components/EmptyState";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import { fetchNFTs, ipfsToGatewayUrl, type NftApiItem } from "@/lib/api";

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

const CATEGORIES: CategoryOption[] = [
  { label: "All", value: "all" },
  { label: "Art", value: "art" },
  { label: "Collectibles", value: "collectibles" },
  { label: "Audio", value: "audio" },
  { label: "Video", value: "video" }
];

function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function mapAlchemyCategoryToInternal(raw: unknown): "art" | "collectibles" | "audio" | "video" | "" {
  const value = normalizeCategory(raw);
  if (!value) return "";

  if (value === "art" || value === "image" || value === "pfp" || value === "profile" || value === "profile picture") return "art";
  if (value === "collectibles" || value === "collectible") return "collectibles";
  if (value === "audio" || value === "music" || value === "sound") return "audio";
  if (value === "video" || value === "movie" || value === "animation") return "video";

  return "";
}

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mountedGuard = (
    <div className="space-y-8">
      <div className="h-8 w-48 rounded bg-white/10" />
      <div className="h-40 rounded-3xl border border-white/10 bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <NFTSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? (CONTRACT_ADDRESS as Address) : undefined;

  const qFromUrl = searchParams.get("q") ?? "";
  const [q, setQ] = useState<string>(qFromUrl);
  const [category, setCategory] = useState<string>("all");
  const [maxPriceEth, setMaxPriceEth] = useState<string>("0.10");
  const [sort, setSort] = useState<"newest" | "oldest" | "price_asc" | "price_desc">("newest");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["nfts", { search: qFromUrl, category, sort }],
    queryFn: () =>
      fetchNFTs({
        search: qFromUrl.trim() ? qFromUrl.trim() : undefined,
        category: category !== "all" ? category : undefined,
        sort,
        limit: 100
      }),
    staleTime: 10_000
  });

  const enriched = useMemo(() => {
    const raw = Array.isArray(data) ? data : [];
    return raw
      .map(
        (item): (NftApiItem & { tokenIdBig: bigint; priceWeiBig: bigint | null; sellerAddr?: Address; priceEth: string }) | null => {
          let tokenIdBig: bigint;
          try {
            tokenIdBig = BigInt(item.tokenId);
          } catch {
            return null;
          }

          let priceWeiBig: bigint | null = null;
          if (typeof item.price === "string" && item.price.trim() !== "") {
            try {
              priceWeiBig = BigInt(item.price);
            } catch {
              priceWeiBig = null;
            }
          }

          const sellerAddr = typeof item.seller === "string" && isAddress(item.seller) ? (item.seller as Address) : undefined;
          const priceEth = priceWeiBig !== null ? formatEther(priceWeiBig) : "0";
          return { ...item, tokenIdBig, priceWeiBig, sellerAddr, priceEth };
        }
      )
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [data]);

  const filtered = useMemo(() => {
    const query = normalizeQuery(qFromUrl);
    const maxEth = Number(maxPriceEth);

    return enriched.filter((item) => {
      const priceOk = Number(item.priceEth) <= (Number.isFinite(maxEth) ? maxEth : Number.POSITIVE_INFINITY);

      const queryOk =
        query.length === 0 ||
        item.tokenId.toString().includes(query) ||
        (item.sellerAddr ? item.sellerAddr.toLowerCase().includes(query) : false) ||
        (item.name ? item.name.toLowerCase().includes(query) : false) ||
        (item.description ? item.description.toLowerCase().includes(query) : false);

      const internalCategory = mapAlchemyCategoryToInternal(item.category) || normalizeCategory(item.category);
      const categoryOk = category === "all" ? true : internalCategory === category;
      return priceOk && queryOk && categoryOk;
    });
  }, [enriched, qFromUrl, maxPriceEth, category]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const next = q.trim();
    const url = next ? `/search?q=${encodeURIComponent(next)}` : "/search";
    router.push(url);
  };

  return (
    <Mounted fallback={mountedGuard}>
      <div className="space-y-10">
        <Title
          eyebrow="Discovery"
          title="Search"
          subtitle="Find NFTs by token ID, token URI, or seller address."
          right={
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
              {isLoading ? "Loading…" : `${filtered.length} result(s)`}
            </div>
          }
        />

        <Filter
          title="Search & Filters"
          right={
            <button
              type="button"
              onClick={() => {
                setQ("");
                router.push("/search");
              }}
              className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Clear
            </button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="lg:col-span-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 p-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by tokenId, tokenURI, or seller 0x…"
                  className="h-10 w-full bg-transparent px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-web3-cyan px-4 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
              <div className="text-xs font-semibold text-zinc-200">Max price</div>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                <span>0.01</span>
                <span className="font-semibold text-web3-cyan">{maxPriceEth} ETH</span>
                <span>0.10</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.1}
                step={0.005}
                value={Number(maxPriceEth)}
                onChange={(e) => setMaxPriceEth(Number(e.target.value).toFixed(3))}
                className="mt-3 w-full accent-[#22D3EE]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Category options={CATEGORIES} value={category} onChange={setCategory} />
            <div className="w-full rounded-2xl border border-white/10 bg-zinc-950/30 p-4 shadow-glow lg:w-[260px]">
              <div className="text-xs font-semibold text-zinc-200">Sort by</div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-zinc-100 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>
          </div>
        </Filter>

        {!contractAddress ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
            Missing/invalid `CONTRACT_ADDRESS` in `src/config/contracts.ts`. Buying will be disabled.
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
            Error loading items: {error?.message ?? "Unknown error"}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <NFTSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {!isLoading && !isError ? (
          filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.tokenId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.045 }}
                  className="will-change-transform"
                >
                  <NFTCard
                    href={`/nft-details/${item.tokenId.toString()}`}
                    title={item.name?.trim() ? item.name : `Token #${item.tokenId}`}
                    subtitle={
                      item.sellerAddr
                        ? `Seller: ${item.sellerAddr.slice(0, 6)}...${item.sellerAddr.slice(-4)} • ${item.priceEth} ETH`
                        : `${item.priceEth} ETH`
                    }
                    mediaUrl={
                      typeof item.media === "string" && item.media.trim()
                        ? ipfsToGatewayUrl(item.media)
                        : typeof item.image === "string" && item.image.trim()
                          ? ipfsToGatewayUrl(item.image)
                          : undefined
                    }
                    type={item.type}
                    mediaType={item.mediaType}
                    mimeType={item.mimeType}
                    isExternal={item.isExternal}
                    externalUrl={item.externalUrl}
                    rightBadge={item.sold ? "Sold" : "Listed"}
                    marketplaceAddress={contractAddress}
                    chainId={chainId}
                    tokenId={item.isExternal ? undefined : item.tokenIdBig}
                    seller={item.isExternal ? undefined : item.sellerAddr}
                    sold={item.sold}
                    priceWei={item.isExternal ? undefined : (item.priceWeiBig ?? undefined)}
                    priceLabel={item.isExternal ? (item.priceEth ? `${item.priceEth} ETH` : undefined) : undefined}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState message="NO ASSETS DETECTED IN THIS SECTOR." />
          )
        ) : null}
      </div>
    </Mounted>
  );
}
