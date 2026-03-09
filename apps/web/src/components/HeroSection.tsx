import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { getApiBaseUrl, ipfsToGatewayUrl, type CollectionMetadataApiItem, type CollectionNftsApiItem, type NftApiItem } from "@/lib/api";
import { formatEthCompactLabel, formatEthLabel } from "@/lib/price";
import { FeaturedDropGrid } from "@/components/FeaturedDropGrid";

const FEATURED_COLLECTION_ADDRESS = "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b";

function formatItems(value: string | null | undefined): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "N/A";
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber)) return raw;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(asNumber);
}

async function getFeaturedCollectionMetadata(): Promise<CollectionMetadataApiItem | null> {
  const base = getApiBaseUrl();
  const url = `${base}/api/nfts/collections/${encodeURIComponent(FEATURED_COLLECTION_ADDRESS)}/metadata`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return (await res.json()) as CollectionMetadataApiItem;
  } catch {
    return null;
  }
}

async function getFeaturedCollectionNfts(): Promise<CollectionNftsApiItem | null> {
  const base = getApiBaseUrl();
  const url = `${base}/api/nfts/collections/${encodeURIComponent(FEATURED_COLLECTION_ADDRESS)}/nfts?limit=4`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return (await res.json()) as CollectionNftsApiItem;
  } catch {
    return null;
  }
}

async function getFeaturedCollectionHeroImage(): Promise<string | null> {
  const base = getApiBaseUrl();
  const url = `${base}/api/nfts?collections=${encodeURIComponent("CloneX")}&chain=ethereum&sort=newest&limit=1`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown as { items?: NftApiItem[] };
    const first = Array.isArray(json.items) ? json.items[0] : undefined;
    const raw =
      (typeof (first as unknown as { imageUrl?: string })?.imageUrl === "string" && (first as unknown as { imageUrl: string }).imageUrl.trim()) ||
      (typeof first?.image === "string" && first.image.trim()) ||
      (typeof first?.media === "string" && first.media.trim()) ||
      "";
    if (!raw) return null;
    return ipfsToGatewayUrl(raw);
  } catch {
    return null;
  }
}

export async function HeroSection() {
  const featured = await getFeaturedCollectionMetadata();
  const collectionName = featured?.name ?? "CloneX";
  const floorLabel = formatEthLabel({ price: typeof featured?.floorPriceEth === "number" ? String(featured.floorPriceEth) : undefined });
  const volumeLabel = formatEthCompactLabel(featured?.volumeEth);
  const itemsLabel = formatItems(featured?.totalSupply);
  const featuredNfts = await getFeaturedCollectionNfts();
  const heroImage = await getFeaturedCollectionHeroImage();
  const rawCards = featuredNfts?.items ?? [];
  const nftCards = heroImage ? rawCards.map((it) => ({ ...it, image: it.image ?? heroImage })) : rawCards;

  return (
    <section className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-web3-cyan" />
          <span className="h-2 w-2 rounded-full bg-web3-cyan shadow-[0_0_20px_rgba(34,211,238,0.65)]" />
          CyberPunk Marketplace
        </div>

        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Discover, collect, and sell extraordinary NFTs
        </h1>

        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
          A neon-lit NFT marketplace experience for creators and collectors. Browse listings, mint in seconds, and
          trade directly on-chain.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-cyan-500"
          >
            Explore
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          >
            Create
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Network</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">Hardhat Local</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Payments</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">ETH / MATIC</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Style</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">Neon Cyberpunk</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(167,139,250,0.20),transparent_55%)] blur-xl" />
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-xs text-zinc-400">Featured Drop</div>
              <div className="mt-1 text-sm font-semibold text-zinc-50">{collectionName}</div>
            </div>
            <div className="rounded-full border border-white/10 bg-zinc-950/50 px-3 py-1 text-xs font-semibold text-zinc-200">
              Live
            </div>
          </div>
          <div className="p-5">
            <FeaturedDropGrid
              items={nftCards}
              collectionName={collectionName}
            />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Floor</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{floorLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Volume (Recent)</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{volumeLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Items</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{itemsLabel}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/explore?contract=${encodeURIComponent(FEATURED_COLLECTION_ADDRESS)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-cyan px-4 py-2 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
              >
                View Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="flex items-center rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-xs text-zinc-400">
                {FEATURED_COLLECTION_ADDRESS.slice(0, 8)}...{FEATURED_COLLECTION_ADDRESS.slice(-6)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
