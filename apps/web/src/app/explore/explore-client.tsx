"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatEther, type Address } from "viem";
import { hardhat } from "viem/chains";
import { Category, type CategoryOption } from "@/components/Category";
import { EmptyState } from "@/components/EmptyState";
import { Filter } from "@/components/Filter";
import { Mounted } from "@/components/Mounted";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import { DEMO_MAINNET_NFTS } from "@/lib/constants/mock-nfts";
import { fetchNFTs, ipfsToGatewayUrl, type NftApiItem } from "@/lib/api";

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

function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sellerLabel(seller: Address): string {
  return `Seller: ${truncateAddress(seller)}`;
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

export function ExploreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? CONTRACT_ADDRESS : undefined;

  const qFromUrl = searchParams.get("q") ?? "";
  const focusSearch = searchParams.get("focusSearch") === "1";

  const [q, setQ] = useState<string>(qFromUrl);
  const [category, setCategory] = useState<string>("all");
  const [maxPriceEth, setMaxPriceEth] = useState<string>("0.10");
  const [sort, setSort] = useState<"newest" | "oldest" | "price_asc" | "price_desc">("newest");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (!focusSearch && typeof window !== "undefined" && window.location.hash !== "#search") return;
    const el = searchInputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [focusSearch, qFromUrl]);

  const mountedFallback = (
    <div className="mx-auto max-w-6xl">
      <div className="h-8 w-48 rounded bg-white/10" />
      <div className="mt-6 h-40 rounded-3xl border border-white/10 bg-white/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <NFTSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
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
    const apiItems = Array.isArray(data) ? data : [];
    const raw = [...DEMO_MAINNET_NFTS, ...apiItems];
    return raw
      .map((it): (NftApiItem & { tokenIdBig: bigint; priceWeiBig: bigint | null; sellerAddr?: Address; priceEth?: string }) | null => {
        let tokenIdBig: bigint;
        try {
          tokenIdBig = BigInt(it.tokenId);
        } catch {
          return null;
        }

        let priceWeiBig: bigint | null = null;
        if (typeof it.price === "string" && it.price.trim() !== "") {
          try {
            priceWeiBig = BigInt(it.price);
          } catch {
            priceWeiBig = null;
          }
        }

        const sellerValue = (it as unknown as { seller?: string }).seller;
        const sellerAddr = typeof sellerValue === "string" && isAddress(sellerValue) ? (sellerValue as Address) : undefined;
        const priceEth = typeof priceWeiBig === "bigint" ? formatEther(priceWeiBig) : typeof it.price === "string" ? it.price : undefined;
        return { ...it, tokenIdBig, priceWeiBig, sellerAddr, priceEth };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [data]);

  const items = useMemo(() => {
    const query = normalizeQuery(qFromUrl);
    const maxEth = Number(maxPriceEth);
    return enriched.filter((item) => {
      const priceEth = typeof item.priceEth === "string" ? Number(item.priceEth) : Number.NaN;
      const priceOk = !Number.isFinite(maxEth) ? true : !Number.isFinite(priceEth) ? true : priceEth <= maxEth;

      const queryOk =
        query.length === 0 ||
        item.tokenId.toString().includes(query) ||
        (item.sellerAddr ? item.sellerAddr.toLowerCase().includes(query) : false) ||
        (item.owner ? item.owner.toLowerCase().includes(query) : false) ||
        (typeof (item as unknown as { collection?: string }).collection === "string"
          ? (item as unknown as { collection: string }).collection.toLowerCase().includes(query)
          : false) ||
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
    const base = "/explore";
    const url = next ? `${base}?q=${encodeURIComponent(next)}` : base;
    router.push(`${url}#search`);
  };

  return (
    <Mounted fallback={mountedFallback}>
      <div className="mx-auto max-w-6xl">
        <Title
          eyebrow="Discovery"
          title="Explore"
          subtitle="Browse the full collection and refine your search in real time."
          right={
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
              {isLoading ? "Loading…" : `${items.length} item(s)`}
            </div>
          }
        />

        <div id="search" className="mt-8">
          <Filter
            title="Search & Filters"
            right={
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCategory("all");
                  setMaxPriceEth("0.10");
                  setSort("newest");
                  router.push("/explore#search");
                }}
                className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Clear
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <form onSubmit={handleSubmit} className="lg:col-span-2">
                <div className="glass-card flex items-center gap-2 rounded-2xl p-2">
                  <input
                    ref={searchInputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by token ID, token URI, owner, or seller 0x…"
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

              <div className="glass-card rounded-2xl p-4">
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
              <div className="glass-card w-full rounded-2xl p-4 lg:w-[260px]">
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
        </div>

        {!contractAddress ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
            Missing/invalid `CONTRACT_ADDRESS` in `src/config/contracts.ts`. Buying will be disabled.
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-sm text-yellow-100">
            Marketplace listings are unavailable right now. Showing demo mainnet assets instead. ({getErrorMessage(error)})
          </div>
        ) : null}

        {isLoading && DEMO_MAINNET_NFTS.length === 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <NFTSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, idx) => (
              <motion.div
                key={`${item.isExternal ? "external" : "local"}-${item.tokenId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: idx * 0.045 }}
                className="will-change-transform"
              >
                <NFTCard
                  href={
                    item.isExternal
                      ? typeof (item as unknown as { id?: string }).id === "string"
                        ? `/nft-details/${(item as unknown as { id: string }).id}`
                        : undefined
                      : `/nft-details/${item.tokenId}`
                  }
                  title={item.name?.trim() ? item.name : `Token #${item.tokenId}`}
                  subtitle={
                    item.isExternal
                      ? typeof (item as unknown as { collection?: string }).collection === "string"
                        ? (item as unknown as { collection: string }).collection
                        : "Mainnet Asset"
                      : item.sellerAddr
                        ? sellerLabel(item.sellerAddr)
                        : item.category
                          ? `Category: ${item.category}`
                          : undefined
                  }
                  rightBadge={item.isExternal ? "Mainnet" : item.sold ? "Sold" : "Listed"}
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
                  marketplaceAddress={contractAddress}
                  chainId={chainId}
                  tokenId={item.isExternal ? undefined : item.tokenIdBig}
                  seller={item.isExternal ? undefined : item.sellerAddr}
                  sold={item.sold}
                  priceWei={item.isExternal ? undefined : (item.priceWeiBig ?? undefined)}
                  priceLabel={item.isExternal ? (item.priceEth ? `${item.priceEth} ETH` : undefined) : undefined}
                  onPurchased={() => {
                    void refetch();
                  }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState message="NO ASSETS DETECTED IN THIS SECTOR." />
          </div>
        )}
      </div>
    </Mounted>
  );
}
