"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hardhat } from "viem/chains";
import { formatEther, type Address } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Clock, Repeat2, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { Mounted } from "@/components/Mounted";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { ListForSaleButton } from "@/components/ListForSaleButton";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import {
  fetchActivity,
  fetchAuthorProfile,
  fetchNFTs,
  ipfsToGatewayUrl,
  type ActivityItem,
  type AuthorProfile,
  type NftApiItem
} from "@/lib/api";

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type TabKey = "created" | "owned" | "onsale" | "activity";

type AuthorClientProps = {
  addressOverride?: string;
};

export function AuthorClient({ addressOverride }: AuthorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { address: currentAddress } = useAccount();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? (CONTRACT_ADDRESS as Address) : undefined;

  const addressParam = addressOverride ?? (searchParams.get("address") ?? "");
  const [addressInput, setAddressInput] = useState<string>(addressParam);
  const author = isAddress(addressParam) ? addressParam : null;

  const [tab, setTab] = useState<TabKey>("created");

  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-52 rounded bg-white/10" />
      <div className="h-40 rounded-3xl border border-white/10 bg-white/5" />
    </div>
  );

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["author", author ?? ""],
    queryFn: () => fetchAuthorProfile(author ?? ""),
    enabled: Boolean(author),
    staleTime: 30_000
  });

  const fetchForTab = (key: TabKey, address: string): Promise<NftApiItem[]> => {
    if (key === "created") return fetchNFTs({ creator: address, sort: "newest", limit: 48 });
    if (key === "owned") return fetchNFTs({ owner: address, sort: "newest", limit: 48 });
    if (key === "onsale") return fetchNFTs({ seller: address, sold: false, sort: "newest", limit: 48 });
    return fetchNFTs({ creator: address, sort: "newest", limit: 12 });
  };

  const { data: tabItems, isLoading: isTabLoading, isError: isTabError, error: tabError } = useQuery({
    queryKey: ["author-nfts", author ?? "", tab],
    queryFn: () => fetchForTab(tab, author as string),
    enabled: Boolean(author),
    staleTime: 10_000
  });

  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: isActivityError,
    error: activityError
  } = useQuery({
    queryKey: ["author-activity", author ?? ""],
    queryFn: () => fetchActivity(author as string, { limit: 200 }),
    enabled: Boolean(author) && tab === "activity",
    staleTime: 5_000
  });

  const items = useMemo(() => {
    return Array.isArray(tabItems) ? tabItems : [];
  }, [tabItems]);

  const activityItems = useMemo(() => {
    return Array.isArray(activity) ? activity : [];
  }, [activity]);

  const banner: AuthorProfile | null = profile ?? null;
  const coverUrl = banner?.coverUrl ? ipfsToGatewayUrl(banner.coverUrl) : null;
  const avatarUrl = banner?.avatarUrl ? ipfsToGatewayUrl(banner.avatarUrl) : null;
  const displayName = banner?.username?.trim() ? banner.username.trim() : author ? truncateAddress(author) : "Author";
  const displayBio = banner?.bio?.trim() ? banner.bio.trim() : null;

  return (
    <Mounted fallback={mountedFallback}>
      <div className="space-y-10">
        <Title
          eyebrow="Creator"
          title={displayName}
          subtitle={author ? (displayBio ?? `Profile for ${truncateAddress(author)}`) : "Enter an address to view a creator profile."}
          right={
            <Link
              href="/search"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Search
            </Link>
          }
        />

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.14),transparent_55%)] blur-xl" />

          <div className="relative h-40 w-full overflow-hidden">
            {coverUrl ? <img src={coverUrl} alt="Cover" className="h-full w-full object-cover opacity-90" /> : null}
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/60 via-zinc-950/20 to-zinc-950/60" />
          </div>

          <div className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-10 flex items-end gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/40 shadow-glow">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-white/10 opacity-70" />}
              </div>
              <div className="pb-1">
                <div className="text-sm font-semibold text-zinc-100">{displayName}</div>
                {author ? <div className="mt-1 font-mono text-xs text-zinc-400">{truncateAddress(author)}</div> : null}
              </div>
            </div>

            {author ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(author);
                      toast.success("Address copied");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                >
                  Copy address
                </button>
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm text-zinc-200">
                  {isProfileLoading ? "Loading…" : "Profile"}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="text-xs font-semibold text-zinc-200">Author address</div>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 p-2">
                <input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="h-10 w-full bg-transparent px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = addressInput.trim();
                    router.push(next ? `/author/${encodeURIComponent(next)}` : "/author");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-web3-purple px-4 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
                >
                  View
                </button>
              </div>
              {!author && addressParam ? <p className="mt-2 text-xs text-red-300">Invalid address.</p> : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
              <div className="text-xs text-zinc-500">Listed items</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-50">{author ? (items.length > 0 ? items.length : 0) : "—"}</div>
              <div className="mt-2 text-xs text-zinc-400">From MongoDB sync</div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-50">NFTs</h2>
              <p className="mt-1 text-sm text-zinc-300">Created, owned, listed, and activity from MongoDB sync.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
              {tab === "activity"
                ? isActivityLoading
                  ? "Loading…"
                  : `${activityItems.length} event(s)`
                : isTabLoading
                  ? "Loading…"
                  : `${items.length} item(s)`}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(
              [
                { key: "created" as const, label: "Created" },
                { key: "owned" as const, label: "Owned" },
                { key: "onsale" as const, label: "On Sale" },
                { key: "activity" as const, label: "Activity" }
              ]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? "rounded-xl bg-web3-cyan px-4 py-2 text-sm font-semibold text-zinc-950 shadow-glow"
                    : "rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {!author ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm text-zinc-200">Enter an address to view listed NFTs.</p>
            </div>
          ) : tab === "activity" ? (
            isActivityError ? (
              <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
                {activityError instanceof Error ? activityError.message : "Failed to load activity"}
              </div>
            ) : isActivityLoading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-white/10 opacity-70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityItems.length > 0 ? (
              <ActivityList items={activityItems} />
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-sm text-zinc-200">No activity yet.</p>
                <p className="mt-1 text-xs text-zinc-400">Mint, buy, or list an NFT to generate history.</p>
              </div>
            )
          ) : isTabError ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
              {tabError instanceof Error ? tabError.message : "Failed to load author NFTs"}
            </div>
          ) : isTabLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <NFTSkeleton key={i} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.tokenId} className="space-y-3">
                  <NFTCard
                    href={`/nft-details/${item.tokenId}`}
                    title={item.name?.trim() ? item.name : `Token #${item.tokenId}`}
                    subtitle={tab === "owned" ? "Owned" : tab === "created" ? "Created" : "On sale"}
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
                    rightBadge={item.sold ? "Sold" : "Listed"}
                    marketplaceAddress={contractAddress}
                    chainId={chainId}
                    tokenId={(() => {
                      try {
                        return BigInt(item.tokenId);
                      } catch {
                        return undefined;
                      }
                    })()}
                    seller={(() => {
                      const s = typeof item.seller === "string" ? item.seller : "";
                      return isAddress(s) ? (s as Address) : undefined;
                    })()}
                    sold={item.sold}
                    priceWei={(() => {
                      try {
                        return typeof item.price === "string" && item.price ? BigInt(item.price) : undefined;
                      } catch {
                        return undefined;
                      }
                    })()}
                  />

                  {(() => {
                    if (!contractAddress) return null;
                    if (!currentAddress) return null;
                    if (item.sold !== true) return null;
                    if (!item.owner) return null;
                    if (item.owner.toLowerCase() !== currentAddress.toLowerCase()) return null;
                    let tokenIdBig: bigint;
                    try {
                      tokenIdBig = BigInt(item.tokenId);
                    } catch {
                      return null;
                    }
                    return (
                      <ListForSaleButton
                        tokenId={tokenIdBig}
                        marketplaceAddress={contractAddress}
                        chainId={chainId}
                        onListed={() => {
                          void queryClient.invalidateQueries({ queryKey: ["author-nfts", author ?? ""], exact: false });
                        }}
                      />
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm text-zinc-200">No results for this tab.</p>
              <p className="mt-1 text-xs text-zinc-400">Mint/list NFTs locally to generate activity.</p>
            </div>
          )}
        </section>
      </div>
    </Mounted>
  );
}

function truncateMiddle(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWhen(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatEthFromWei(wei?: string): string | null {
  if (!wei) return null;
  try {
    return formatEther(BigInt(wei));
  } catch {
    return null;
  }
}

function activityLabel(item: ActivityItem): string {
  if (item.type === "MINT") return "Minted";
  if (item.type === "LIST") return "Listed";
  if (item.type === "SELL") return "Sold";
  return "Transfer";
}

function activityIcon(item: ActivityItem) {
  if (item.type === "MINT") return <Sparkles className="h-5 w-5 text-web3-cyan" />;
  if (item.type === "LIST") return <Tag className="h-5 w-5 text-web3-purple" />;
  if (item.type === "SELL") return <ShoppingCart className="h-5 w-5 text-web3-cyan" />;
  return <Repeat2 className="h-5 w-5 text-web3-purple" />;
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="mt-6 space-y-3">
      {items.map((it) => {
        const eth = formatEthFromWei(it.price);
        return (
          <div
            key={it.eventId}
            className="flex items-start gap-4 rounded-2xl border border-white/10 bg-zinc-950/30 p-4 shadow-glow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              {activityIcon(it)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="text-sm font-semibold text-zinc-100">{activityLabel(it)}</div>
                <div className="text-xs text-zinc-400">Token #{it.tokenId}</div>
                {eth ? <div className="text-xs font-semibold text-web3-cyan">{eth} ETH</div> : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                {it.from ? <span>From {truncateMiddle(it.from)}</span> : null}
                {it.to ? <span>To {truncateMiddle(it.to)}</span> : null}
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="h-4 w-4" />
                <span>{formatWhen(it.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
