"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hardhat } from "viem/chains";
import { type Address } from "viem";
import { motion } from "framer-motion";
import { Category, type CategoryOption } from "@/components/Category";
import { Filter } from "@/components/Filter";
import { Mounted } from "@/components/Mounted";
import { EmptyState } from "@/components/EmptyState";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import { fetchNFTs, type NftApiItem } from "@/lib/api";
import { clampNumber, normalizeDecimalInput, PRICE_FILTER_MAX_ETH, PRICE_FILTER_MIN_ETH } from "@/lib/inputs";
import { getNftDisplayName } from "@/lib/nft";
import { parseEthNumber, tryParseWeiBigint } from "@/lib/price";

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseMaybeNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
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
  const [minPriceEth, setMinPriceEth] = useState<string>("");
  const [maxPriceEth, setMaxPriceEth] = useState<string>("");
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
        (item): (NftApiItem & { tokenIdBig: bigint; priceWeiBig: bigint | null; sellerAddr?: Address; priceEthNumber: number | null }) | null => {
          let tokenIdBig: bigint;
          try {
            tokenIdBig = BigInt(item.tokenId);
          } catch {
            return null;
          }

          const candidate = (item as unknown as { priceWei?: string }).priceWei ?? item.price;
          const parsed = tryParseWeiBigint(candidate);
          const priceWeiBig: bigint | null = typeof parsed === "bigint" ? parsed : null;

          const sellerAddr = typeof item.seller === "string" && isAddress(item.seller) ? (item.seller as Address) : undefined;
          const priceEthNumber = parseEthNumber({ priceWei: priceWeiBig ?? undefined, price: typeof item.price === "string" ? item.price : undefined });
          return { ...item, tokenIdBig, priceWeiBig, sellerAddr, priceEthNumber };
        }
      )
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [data]);

  const filtered = useMemo(() => {
    const query = normalizeQuery(qFromUrl);
    const minEthRaw = parseMaybeNumber(minPriceEth);
    const maxEthRaw = parseMaybeNumber(maxPriceEth);

    const minEthBounded = Number.isFinite(minEthRaw) ? clampNumber(minEthRaw, PRICE_FILTER_MIN_ETH, PRICE_FILTER_MAX_ETH) : Number.NaN;
    const maxEthBounded = Number.isFinite(maxEthRaw) ? clampNumber(maxEthRaw, PRICE_FILTER_MIN_ETH, PRICE_FILTER_MAX_ETH) : Number.NaN;

    const minEth =
      Number.isFinite(minEthBounded) && Number.isFinite(maxEthBounded) && minEthBounded > maxEthBounded
        ? maxEthBounded
        : minEthBounded;
    const maxEth =
      Number.isFinite(minEthBounded) && Number.isFinite(maxEthBounded) && minEthBounded > maxEthBounded
        ? minEthBounded
        : maxEthBounded;

    return enriched.filter((item) => {
      const priceEth = typeof item.priceEthNumber === "number" ? item.priceEthNumber : Number.NaN;
      let priceOk = true;
      if (Number.isFinite(priceEth)) {
        if (Number.isFinite(minEth)) priceOk = priceOk && priceEth >= minEth;
        if (Number.isFinite(maxEth)) priceOk = priceOk && priceEth <= maxEth;
      }

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
  }, [enriched, qFromUrl, minPriceEth, maxPriceEth, category]);

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
              {isLoading ? "Loading..." : `${filtered.length} result(s)`}
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
                setMinPriceEth("");
                setMaxPriceEth("");
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
                  placeholder="Search by tokenId, tokenURI, or seller 0x..."
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
              <div className="text-xs font-semibold text-zinc-200">Price range (ETH)</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400">Min</div>
                  <input
                    inputMode="decimal"
                    value={minPriceEth}
                    onChange={(e) => setMinPriceEth(normalizeDecimalInput(e.target.value))}
                    placeholder="0.001"
                    className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent px-3 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400">Max</div>
                  <input
                    inputMode="decimal"
                    value={maxPriceEth}
                    onChange={(e) => setMaxPriceEth(normalizeDecimalInput(e.target.value))}
                    placeholder="99999.999"
                    className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent px-3 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>
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
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
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
                    nft={item}
                    href={typeof item._id === "string" && item._id.trim() ? `/nft/${item._id.trim()}` : `/nft/${item.tokenId.toString()}`}
                    title={getNftDisplayName({
                      name: item.name,
                      tokenId: item.tokenId,
                      collectionName:
                        typeof (item as unknown as { collection?: string }).collection === "string" && (item as unknown as { collection: string }).collection.trim()
                          ? (item as unknown as { collection: string }).collection
                          : typeof item.category === "string" && item.category.trim()
                            ? item.category
                            : null
                    })}
                    subtitle={
                      item.isExternal
                        ? typeof (item as unknown as { collection?: string }).collection === "string"
                          ? (item as unknown as { collection: string }).collection
                          : "Mainnet Asset"
                        : item.sellerAddr
                          ? `Seller: ${item.sellerAddr.slice(0, 6)}...${item.sellerAddr.slice(-4)}`
                          : item.category
                            ? `Category: ${item.category}`
                            : undefined
                    }
                    imageUrl={typeof item.image === "string" && item.image.trim() ? item.image : undefined}
                    mediaUrl={typeof item.media === "string" && item.media.trim() ? item.media : undefined}
                    type={item.type}
                    mediaType={item.mediaType}
                    mimeType={item.mimeType}
                    isExternal={item.isExternal}
                    externalUrl={item.externalUrl}
                    rightBadge={item.isExternal ? "Mainnet Asset" : item.sold ? "Sold" : "Listed"}
                    marketplaceAddress={contractAddress}
                    chainId={chainId}
                    tokenId={item.isExternal ? undefined : item.tokenIdBig}
                    seller={item.isExternal ? undefined : item.sellerAddr}
                    sold={item.sold}
                    priceWei={item.priceWeiBig ?? undefined}
                    priceLabel={typeof item.price === "string" ? item.price : undefined}
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
