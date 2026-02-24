"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { type Address } from "viem";
import { hardhat } from "viem/chains";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Mounted } from "@/components/Mounted";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import { fetchIndexedCollections, fetchNFTsPage, refreshPrices, type IndexedCollectionApiItem, type NftApiItem } from "@/lib/api";
import { getChainDisplayName } from "@/lib/chain";
import { clampNumber, normalizeDecimalInput, PRICE_FILTER_MAX_ETH, PRICE_FILTER_MIN_ETH } from "@/lib/inputs";
import { getNftDisplayName } from "@/lib/nft";
import { tryParseWeiBigint } from "@/lib/price";

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

function getNftIdentity(item: NftApiItem): string {
  const rawId = typeof (item as unknown as { _id?: unknown })._id === "string" ? (item as unknown as { _id: string })._id.trim() : "";
  if (rawId) return `id:${rawId}`;

  const contractAddress = typeof item.contractAddress === "string" ? item.contractAddress.trim().toLowerCase() : "";
  const tokenId = typeof item.tokenId === "string" || typeof item.tokenId === "number" ? String(item.tokenId).trim() : "";
  const chainId = typeof item.chainId === "number" && Number.isFinite(item.chainId) ? String(item.chainId) : "";

  if (contractAddress && tokenId) return `token:${chainId}|${contractAddress}|${tokenId}`;

  const externalUrl = typeof item.externalUrl === "string" ? item.externalUrl.trim() : "";
  if (externalUrl) return `url:${externalUrl}`;

  if (tokenId) return `token:${chainId}|${tokenId}`;

  const name = typeof item.name === "string" ? item.name.trim() : "";
  const image = typeof item.image === "string" ? item.image.trim() : "";
  return `fallback:${chainId}|${name}|${image}`;
}

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

function parseMaybeNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

type ExploreSortKey = "newest" | "price_asc" | "price_desc" | "name_asc";
type ExploreChainKey = "ethereum" | "polygon" | "";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function normalizeChain(value: string): ExploreChainKey {
  const v = value.trim().toLowerCase();
  if (v === "ethereum" || v === "eth" || v === "1") return "ethereum";
  if (v === "polygon" || v === "matic" || v === "137") return "polygon";
  return "";
}

function normalizeSort(value: string): ExploreSortKey {
  const v = value.trim();
  if (v === "price_asc" || v === "price_desc" || v === "name_asc") return v;
  return "newest";
}

function getColumnCountForViewportWidth(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

function chainIdForKey(key: ExploreChainKey): number | null {
  if (key === "ethereum") return 1;
  if (key === "polygon") return 137;
  return null;
}

function normalizeCollectionLabel(value: string): string {
  return value.trim();
}

function filterCollectionsForChain(input: string[], indexed: IndexedCollectionApiItem[], chain: ExploreChainKey): string[] {
  const selectedChainId = chainIdForKey(chain);
  if (selectedChainId === null) return input;
  const allowed = new Set(indexed.filter((c) => c.chainId === selectedChainId).map((c) => c.label));
  return input.filter((label) => allowed.has(label));
}

export function ExploreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? CONTRACT_ADDRESS : undefined;

  const qFromUrl = searchParams.get("q") ?? "";
  const contractFromUrl = searchParams.get("contract") ?? "";
  const focusSearch = searchParams.get("focusSearch") === "1";

  const chainFromUrl = normalizeChain(searchParams.get("chain") ?? "");
  const collectionsParam = searchParams.get("collections") ?? "";
  const collectionsFromUrl = useMemo(() => {
    return splitCsv(collectionsParam).map(normalizeCollectionLabel).filter(Boolean);
  }, [collectionsParam]);
  const minPriceFromUrl = searchParams.get("minPrice") ?? "";
  const maxPriceFromUrl = searchParams.get("maxPrice") ?? "";
  const sortFromUrl = normalizeSort(searchParams.get("sort") ?? "");

  const contractFilter = contractFromUrl && isAddress(contractFromUrl) ? (contractFromUrl as Address) : undefined;

  const [q, setQ] = useState<string>(qFromUrl);
  const [chain, setChain] = useState<ExploreChainKey>(chainFromUrl);
  const [collections, setCollections] = useState<string[]>(collectionsFromUrl);
  const [minPriceEth, setMinPriceEth] = useState<string>(minPriceFromUrl);
  const [maxPriceEth, setMaxPriceEth] = useState<string>(maxPriceFromUrl);
  const [sort, setSort] = useState<ExploreSortKey>(sortFromUrl);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    setChain(chainFromUrl);
  }, [chainFromUrl]);

  useEffect(() => {
    setCollections((prev) => (arraysEqual(prev, collectionsFromUrl) ? prev : collectionsFromUrl));
  }, [collectionsFromUrl]);

  useEffect(() => {
    setMinPriceEth(minPriceFromUrl);
    setMaxPriceEth(maxPriceFromUrl);
  }, [minPriceFromUrl, maxPriceFromUrl]);

  useEffect(() => {
    setSort(sortFromUrl);
  }, [sortFromUrl]);

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

  const buildExploreUrl = (next: {
    q: string;
    contract?: Address;
    chain: ExploreChainKey;
    collections: string[];
    minPriceEth: string;
    maxPriceEth: string;
    sort: ExploreSortKey;
    preserveFocusSearch?: boolean;
  }): string => {
    const qs = new URLSearchParams();
    const qTrim = next.q.trim();
    if (qTrim) qs.set("q", qTrim);
    if (next.contract) qs.set("contract", next.contract);
    if (next.chain) qs.set("chain", next.chain);
    if (next.collections.length > 0) qs.set("collections", next.collections.join(","));

    const minNorm = normalizeDecimalInput(next.minPriceEth);
    const maxNorm = normalizeDecimalInput(next.maxPriceEth);

    if (minNorm) {
      const parsed = Number(minNorm);
      if (Number.isFinite(parsed)) qs.set("minPrice", clampNumber(parsed, PRICE_FILTER_MIN_ETH, PRICE_FILTER_MAX_ETH).toString());
    }

    if (maxNorm) {
      const parsed = Number(maxNorm);
      if (Number.isFinite(parsed)) qs.set("maxPrice", clampNumber(parsed, PRICE_FILTER_MIN_ETH, PRICE_FILTER_MAX_ETH).toString());
    }
    if (next.sort !== "newest") qs.set("sort", next.sort);
    if (next.preserveFocusSearch && focusSearch) qs.set("focusSearch", "1");

    const base = "/explore";
    return qs.toString() ? `${base}?${qs.toString()}` : base;
  };

  const applyFiltersToUrl = (options: { includeSearch?: boolean } = {}): void => {
    const collectionsForUrl = filterCollectionsForChain(collections, indexedCollections, chain);
    if (collectionsForUrl.length !== collections.length) setCollections(collectionsForUrl);
    const url = buildExploreUrl({
      q: options.includeSearch ? q : qFromUrl,
      contract: contractFilter,
      chain,
      collections: collectionsForUrl,
      minPriceEth,
      maxPriceEth,
      sort,
      preserveFocusSearch: true
    });
    router.push(url);
  };

  const { data: indexedCollections = [] } = useQuery({
    queryKey: ["indexedCollections"],
    queryFn: fetchIndexedCollections,
    staleTime: 60_000
  });

  const PAGE_SIZE = 40;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: [
      "nfts",
      {
        search: qFromUrl,
        contract: contractFilter,
        chain: chainFromUrl,
        collections: collectionsFromUrl.join(","),
        minPrice: minPriceFromUrl,
        maxPrice: maxPriceFromUrl,
        sort: sortFromUrl,
        limit: PAGE_SIZE
      }
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchNFTsPage({
        search: qFromUrl.trim() ? qFromUrl.trim() : undefined,
        contract: contractFilter,
        chain: chainFromUrl ? chainFromUrl : undefined,
        collections: collectionsFromUrl.length > 0 ? collectionsFromUrl.join(",") : undefined,
        minPrice: minPriceFromUrl.trim() ? minPriceFromUrl.trim() : undefined,
        maxPrice: maxPriceFromUrl.trim() ? maxPriceFromUrl.trim() : undefined,
        sort: sortFromUrl,
        limit: PAGE_SIZE,
        page: typeof pageParam === "number" ? pageParam : 1
      }),
    getNextPageParam: (lastPage, allPages) => {
      const seen = new Set<string>();
      for (const page of allPages) {
        const pageItems = Array.isArray(page.items) ? page.items : [];
        for (const it of pageItems) {
          seen.add(getNftIdentity(it));
        }
      }

      const loadedUnique = seen.size;
      const total = typeof lastPage.total === "number" && Number.isFinite(lastPage.total) ? lastPage.total : loadedUnique;
      if (loadedUnique >= total) return undefined;
      return allPages.length + 1;
    },
    staleTime: 10_000
  });

  const enriched = useMemo(() => {
    const seen = new Set<string>();
    const raw: NftApiItem[] = [];
    const pages = data?.pages ?? [];
    for (const page of pages) {
      const pageItems = Array.isArray(page.items) ? page.items : [];
      for (const it of pageItems) {
        const identity = getNftIdentity(it);
        if (seen.has(identity)) continue;
        seen.add(identity);
        raw.push(it);
      }
    }
    return raw
      .map((it): (NftApiItem & { tokenIdBig: bigint; priceWeiBig: bigint | null; sellerAddr?: Address }) | null => {
        let tokenIdBig: bigint;
        try {
          tokenIdBig = BigInt(it.tokenId);
        } catch {
          return null;
        }

        const candidate = (it as unknown as { priceWei?: string }).priceWei ?? it.price;
        const parsed = tryParseWeiBigint(candidate);
        const priceWeiBig: bigint | null = typeof parsed === "bigint" ? parsed : null;

        const sellerValue = (it as unknown as { seller?: string }).seller;
        const sellerAddr = typeof sellerValue === "string" && isAddress(sellerValue) ? (sellerValue as Address) : undefined;
        return { ...it, tokenIdBig, priceWeiBig, sellerAddr };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [data]);

  const totalCount = useMemo(() => {
    const pages = data?.pages ?? [];
    for (let i = pages.length - 1; i >= 0; i -= 1) {
      const t = pages[i]?.total;
      if (typeof t === "number" && Number.isFinite(t)) return t;
    }
    const loaded = pages.reduce((sum, p) => sum + (Array.isArray(p.items) ? p.items.length : 0), 0);
    return loaded;
  }, [data]);

  const handleRefreshPrices = async (): Promise<void> => {
    const id = toast.loading("Refreshing prices...");
    try {
      const result = await refreshPrices();
      toast.success(`Prices refreshed (updated ${result.updated} NFTs).`, { id });
      void refetch();
    } catch (err: unknown) {
      toast.error(`Failed to refresh prices: ${getErrorMessage(err)}`, { id });
    }
  };

  const items = enriched;

  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return getColumnCountForViewportWidth(window.innerWidth);
  });

  useEffect(() => {
    const update = (): void => {
      setColumnCount(getColumnCountForViewportWidth(window.innerWidth));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridScrollMargin, setGridScrollMargin] = useState(0);

  const safeColumns = Math.max(1, columnCount);

  useEffect(() => {
    const update = (): void => {
      const el = gridRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setGridScrollMargin(Math.max(0, Math.floor(rect.top + window.scrollY)));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGridScrollMargin(Math.max(0, Math.floor(rect.top + window.scrollY)));
  }, [items.length, safeColumns, isLoading]);
  const rowCount = Math.max(1, Math.ceil(items.length / safeColumns));
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 460,
    overscan: 6,
    scrollMargin: gridScrollMargin
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, items.length, safeColumns]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    applyFiltersToUrl({ includeSearch: true });
  };

  return (
    <Mounted fallback={mountedFallback}>
      <div className="mx-auto max-w-6xl">
        <Title
          eyebrow="Explore"
          title="Explore"
          titleAs="div"
          hideTitle
          subtitle="Browse the full collection and refine your search in real time."
          right={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRefreshPrices()}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
              >
                Refresh Prices
              </button>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                {isLoading
                  ? "Loading..."
                  : `Showing ${items.length.toLocaleString()} of ${totalCount.toLocaleString()} NFTs`}
              </div>
            </div>
          }
        />

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64 lg:self-start xl:w-72">
            <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-zinc-100">Filters</div>

              <div className="mt-5">
                <div className="text-xs font-semibold text-zinc-200">Chain</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([
                    { key: "ethereum" as const, label: "Ethereum" },
                    { key: "polygon" as const, label: "Polygon" }
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        const next = chain === opt.key ? "" : opt.key;
                        const nextCollections = filterCollectionsForChain(collections, indexedCollections, next);
                        setChain(next);
                        setCollections(nextCollections);
                        router.push(
                          buildExploreUrl({
                            q: qFromUrl,
                            contract: contractFilter,
                            chain: next,
                            collections: nextCollections,
                            minPriceEth,
                            maxPriceEth,
                            sort,
                            preserveFocusSearch: true
                          })
                        );
                      }}
                      className={
                        chain === opt.key
                          ? "rounded-xl bg-web3-cyan px-3 py-2 text-xs font-semibold text-zinc-950"
                          : "rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      }
                      aria-pressed={chain === opt.key}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold text-zinc-200">Collection</div>
                <div className="mt-3 max-h-64 space-y-2 overflow-auto rounded-2xl border border-white/10 bg-zinc-950/20 p-3">
                  {(() => {
                    const selectedChainId = chainIdForKey(chain);
                    const visible = indexedCollections
                      .slice()
                      .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
                    if (visible.length === 0) {
                      return <div className="text-xs text-zinc-400">No indexed collections available.</div>;
                    }
                    return visible.map((col: IndexedCollectionApiItem) => {
                      const disabled = selectedChainId !== null && col.chainId !== selectedChainId;
                      const checked = collections.includes(col.label);
                      return (
                        <label
                          key={col.contractAddress}
                          className={
                            disabled
                              ? "flex cursor-not-allowed items-center gap-2 text-xs text-zinc-500"
                              : "flex cursor-pointer items-center gap-2 text-xs text-zinc-200"
                          }
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...collections, col.label]))
                                : collections.filter((x) => x !== col.label);
                              setCollections(next);
                              router.push(
                                buildExploreUrl({
                                  q: qFromUrl,
                                  contract: contractFilter,
                                  chain,
                                  collections: next,
                                  minPriceEth,
                                  maxPriceEth,
                                  sort,
                                  preserveFocusSearch: true
                                })
                              );
                            }}
                            className="h-4 w-4 rounded border-white/20 bg-transparent"
                          />
                          <span className={disabled ? "line-through" : ""}>{col.label}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold text-zinc-200">Price Range (ETH)</div>
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

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => applyFiltersToUrl()}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-web3-cyan px-4 text-sm font-semibold text-zinc-950 transition hover:brightness-110"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setChain("");
                    setCollections([]);
                    setMinPriceEth("");
                    setMaxPriceEth("");
                    setSort("newest");
                    router.push("/explore");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/30 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="glass-card flex items-center gap-2 rounded-2xl p-2">
                  <input
                    ref={searchInputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or description..."
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

              <div className="glass-card w-full rounded-2xl p-4 sm:w-[260px]">
                <div className="text-xs font-semibold text-zinc-200">Sort By</div>
                <select
                  value={sort}
                  onChange={(e) => {
                    const next = normalizeSort(e.target.value);
                    setSort(next);
                    router.push(
                      buildExploreUrl({
                        q: qFromUrl,
                        contract: contractFilter,
                        chain,
                        collections,
                        minPriceEth,
                        maxPriceEth,
                        sort: next,
                        preserveFocusSearch: true
                      })
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-zinc-100 outline-none"
                >
                  <option value="newest">Recently Indexed</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A-Z</option>
                </select>
              </div>
            </div>

        {!contractAddress ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
            Missing/invalid `CONTRACT_ADDRESS` in `src/config/contracts.ts`. Buying will be disabled.
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
            Failed to load marketplace listings. ({getErrorMessage(error)})
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <NFTSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div ref={gridRef} className="mt-10">
            <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index;
                const startIndex = rowIndex * safeColumns;
                const rowItems = items.slice(startIndex, startIndex + safeColumns);
                const offsetY = virtualRow.start - gridScrollMargin;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute left-0 top-0 w-full pb-6"
                    style={{ transform: `translateY(${offsetY}px)` }}
                  >
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))` }}>
                      {rowItems.map((item) => {
                        const rawId = typeof item._id === "string" ? item._id.trim() : "";
                        const reactKey = getNftIdentity(item);
                        const chainLabel = getChainDisplayName({
                          chainId: typeof item.chainId === "number" ? item.chainId : undefined,
                          contractAddress: item.contractAddress,
                          externalUrl: item.externalUrl
                        });

                        return (
                          <div key={reactKey} className="will-change-transform">
                            <NFTCard
                              nft={item}
                              href={rawId ? `/nft/${rawId}` : undefined}
                              title={getNftDisplayName({
                                name: item.name,
                                tokenId: item.tokenId,
                                collectionName:
                                  typeof item.category === "string" && item.category.trim()
                                    ? item.category
                                    : typeof (item as unknown as { collection?: string }).collection === "string" && (item as unknown as { collection: string }).collection.trim()
                                      ? (item as unknown as { collection: string }).collection
                                      : null
                              })}
                              subtitle={
                                item.sellerAddr
                                  ? `${chainLabel}${chainLabel ? " | " : ""}${sellerLabel(item.sellerAddr)}`
                                  : item.category
                                    ? `${chainLabel}${chainLabel ? " | " : ""}Collection: ${item.category}`
                                    : chainLabel || undefined
                              }
                              rightBadge={item.isExternal ? "Mainnet Asset" : item.sold ? "Sold" : "Listed"}
                              imageUrl={typeof item.image === "string" && item.image.trim() ? item.image : undefined}
                              mediaUrl={typeof item.media === "string" && item.media.trim() ? item.media : undefined}
                              type={item.type}
                              mediaType={item.mediaType}
                              mimeType={item.mimeType}
                              isPixelArt={
                                (() => {
                                  const collection =
                                    typeof (item as unknown as { collection?: string }).collection === "string"
                                      ? (item as unknown as { collection: string }).collection
                                      : "";
                                  const hay = `${item.name ?? ""} ${collection}`.toLowerCase();
                                  return hay.includes("cryptopunk") || hay.includes("crypto punk") || hay.includes("punk");
                                })()
                              }
                              isExternal={item.isExternal}
                              externalUrl={item.externalUrl}
                              marketplaceAddress={contractAddress}
                              chainId={chainId}
                              tokenId={item.isExternal ? undefined : item.tokenIdBig}
                              seller={item.isExternal ? undefined : item.sellerAddr}
                              sold={item.sold}
                              priceWei={item.priceWeiBig ?? undefined}
                              priceLabel={typeof item.price === "string" ? item.price : undefined}
                              onPurchased={() => {
                                void refetch();
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState message="No assets match your current filters." />
          </div>
        )}

        {items.length > 0 ? (
          <div className="mt-10 flex items-center justify-center">
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!hasNextPage ? "No more results" : isFetchingNextPage ? "Loading..." : "Load More"}
            </button>
          </div>
        ) : null}
          </div>
        </div>
      </div>
    </Mounted>
  );
}
