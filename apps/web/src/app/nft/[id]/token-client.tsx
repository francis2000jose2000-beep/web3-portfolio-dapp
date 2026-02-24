"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { hardhat } from "viem/chains";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount
} from "wagmi";
import { formatEther, erc721Abi } from "viem";
import { toast } from "sonner";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";
import {
  ipfsToGatewayUrl,
  ipfsToGatewayUrls,
  swapToIpfsFallbackGateway,
  fetchNFTById,
  fetchNFTByTokenId,
  fetchNftHistory,
  trackNftViewById,
  trackNftViewByTokenId,
  type NftApiItem
} from "@/lib/api";
import { getNftDisplayName } from "@/lib/nft";
import { formatEthForDisplay, getSmartValuation } from "@/lib/price";
import { getDemoMainnetNftById } from "@/lib/constants/mock-nfts";
import { getChainDisplayName } from "@/lib/chain";
import { Mounted } from "@/components/Mounted";
import { Title } from "@/components/Title";

type NftPageClientProps = {
  id: string;
};

type Trait = {
  trait_type?: string;
  value?: unknown;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='800'%20viewBox='0%200%20800%20800'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='30%25'%20cy='20%25'%20r='85%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.22'/%3E%3Cstop%20offset='45%25'%20stop-color='%23A78BFA'%20stop-opacity='0.16'/%3E%3Cstop%20offset='100%25'%20stop-color='%2307070A'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3ClinearGradient%20id='l'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.8'/%3E%3Cstop%20offset='100%25'%20stop-color='%23A78BFA'%20stop-opacity='0.8'/%3E%3C/linearGradient%3E%3Cfilter%20id='n'%20x='-20%25'%20y='-20%25'%20width='140%25'%20height='140%25'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.8'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='matrix'%20values='0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200.12%200'/%3E%3C/filter%3E%3C/defs%3E%3Crect%20width='800'%20height='800'%20fill='url(%23g)'/%3E%3Crect%20width='800'%20height='800'%20filter='url(%23n)'%20opacity='0.9'/%3E%3Crect%20x='56'%20y='56'%20width='688'%20height='688'%20rx='48'%20fill='rgba(255,255,255,0.03)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M112%20224H688'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.35'/%3E%3Cpath%20d='M112%20592H688'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.25'/%3E%3Ctext%20x='400'%20y='412'%20text-anchor='middle'%20font-family='ui-sans-serif,system-ui,-apple-system,Segoe%20UI,Roboto'%20font-size='26'%20fill='rgba(255,255,255,0.85)'%20font-weight='700'%3ENo%20Image%20Available%3C/text%3E%3Ctext%20x='400'%20y='452'%20text-anchor='middle'%20font-family='ui-sans-serif,system-ui,-apple-system,Segoe%20UI,Roboto'%20font-size='14'%20fill='rgba(255,255,255,0.55)'%3ECheck%20back%20later%20or%20open%20details%3C/text%3E%3C/svg%3E";

function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function getUrlCandidates(raw: string | undefined): string[] {
  const input = typeof raw === "string" ? raw.trim() : "";
  if (!input) return [];
  const base = ipfsToGatewayUrls(input);
  const set = new Set<string>(base);
  for (const url of base) {
    const swapped = swapToIpfsFallbackGateway(url);
    if (swapped) set.add(swapped);
  }
  return Array.from(set);
}

function shortenAddress(address: string | undefined): string {
  if (!address) return "N/A";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function NftPageClient({ id }: NftPageClientProps) {
  const { address: myAddress } = useAccount();
  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-64 rounded bg-white/10" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-3xl border border-white/10 bg-white/5" />
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6" />
      </div>
    </div>
  );

  const demo = useMemo(() => getDemoMainnetNftById(id), [id]);
  const isDemo = demo !== null;

  const shouldFetchMongo = useMemo(() => !isDemo && isMongoObjectId(id), [id, isDemo]);
  const shouldFetchTokenId = useMemo(() => {
    if (isDemo) return false;
    if (shouldFetchMongo) return false;
    return /^\d+$/.test(id);
  }, [id, isDemo, shouldFetchMongo]);

  const { data: nftDoc, isLoading, isError, error } = useQuery({
    queryKey: ["nft", { id }],
    queryFn: async (): Promise<NftApiItem> => {
      if (isDemo) throw new Error("Demo item");
      if (shouldFetchMongo) return fetchNFTById(id);
      if (shouldFetchTokenId) return fetchNFTByTokenId(id);
      throw new Error("Invalid NFT id");
    },
    enabled: !isDemo,
    staleTime: 15_000
  });

  const viewMongoId = typeof nftDoc?._id === "string" ? nftDoc._id.trim() : "";
  const viewTokenId = typeof nftDoc?.tokenId === "string" ? nftDoc.tokenId.trim() : "";

  useEffect(() => {
    if (isDemo) return;
    if (viewMongoId) {
      void trackNftViewById(viewMongoId);
      return;
    }
    if (viewTokenId) {
      void trackNftViewByTokenId(viewTokenId);
    }
  }, [isDemo, viewMongoId, viewTokenId]);


  const resolved = useMemo(() => {
    if (isDemo) {
      return {
        name: demo.name,
        description: demo.description,
        collection: demo.collection,
        attributes: undefined as unknown[] | undefined,
        isExternal: true,
        tokenId: demo.tokenId,
        chainId: demo.chainId,
        contractAddress: demo.contractAddress,
        externalUrl: demo.externalUrl,
        mimeType: undefined as string | undefined,
        mediaType: "image" as "image" | "audio" | "video",
        image: demo.image,
        media: demo.image,
        price: demo.isAuction === true ? demo.highestBid ?? demo.minBid ?? demo.priceEth : demo.priceEth
      };
    }

    const doc = nftDoc;
    const isExternal = doc?.isExternal === true;
    const contractAddress = typeof doc?.contractAddress === "string" ? doc.contractAddress : (!isExternal ? CONTRACT_ADDRESS : undefined);
    const externalUrl = typeof doc?.externalUrl === "string" ? doc.externalUrl : undefined;
    const owner = typeof doc?.owner === "string" && doc.owner.trim() ? doc.owner.trim() : undefined;
    const seller = typeof doc?.seller === "string" && doc.seller.trim() ? doc.seller.trim() : undefined;
    const inferredChainId = (() => {
      if (typeof doc?.chainId === "number") return doc.chainId;
      const ca = typeof contractAddress === "string" ? contractAddress.trim().toLowerCase() : "";
      const url = typeof externalUrl === "string" ? externalUrl.trim().toLowerCase() : "";
      if (ca === "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb") return 1;
      if (url.includes("/matic/") || url.includes("polygonscan.com")) return 137;
      return hardhat.id;
    })();
    const chainId = inferredChainId;
    const collection = typeof doc?.category === "string" && doc.category.trim() ? doc.category.trim() : contractAddress ?? "Collection";
    const name = getNftDisplayName({ name: doc?.name ?? null, tokenId: doc?.tokenId ?? id, collectionName: collection });
    const description = typeof doc?.description === "string" && doc.description.trim() ? doc.description.trim() : undefined;
    const attributes = Array.isArray(doc?.attributes) ? doc.attributes : undefined;
    const imageRaw = typeof doc?.image === "string" && doc.image.trim() ? doc.image.trim() : undefined;
    const mediaRaw = typeof doc?.media === "string" && doc.media.trim() ? doc.media.trim() : imageRaw;
    const mimeType = typeof doc?.mimeType === "string" ? doc.mimeType : undefined;
    const mt = typeof doc?.mediaType === "string" ? doc.mediaType : typeof doc?.type === "string" ? doc.type : undefined;
    const mediaType = mt === "audio" || mt === "video" || mt === "image" ? mt : mimeType?.startsWith("audio/") ? "audio" : mimeType?.startsWith("video/") ? "video" : "image";

    return {
      name,
      description,
      collection,
      attributes,
      isExternal,
      tokenId: doc?.tokenId ?? id,
      chainId,
      contractAddress,
      externalUrl,
      owner,
      seller,
      mimeType,
      mediaType,
      image: imageRaw,
      media: mediaRaw,
      price: typeof doc?.price === "string" ? doc.price : undefined,
      isAuction: doc?.isAuction === true,
      minBid: typeof doc?.minBid === "string" ? doc.minBid : undefined,
      highestBid: typeof doc?.highestBid === "string" ? doc.highestBid : undefined,
      auctionEndTime: typeof doc?.auctionEndTime === "string" ? doc.auctionEndTime : undefined
    };
  }, [demo, id, isDemo, nftDoc]);

  // Safe BigInt conversion for tokenId
  const safeTokenId = useMemo(() => {
    try {
      if (!resolved.tokenId || !/^\d+$/.test(resolved.tokenId)) return undefined;
      return BigInt(resolved.tokenId);
    } catch {
      return undefined;
    }
  }, [resolved.tokenId]);

  // Wagmi Hooks for Live Data
  const { data: onChainOwner } = useReadContract({
    address: resolved.contractAddress as `0x${string}`,
    abi: erc721Abi, // Use standard ERC721 ABI for ownerOf to support external contracts
    functionName: "ownerOf",
    args: safeTokenId !== undefined ? [safeTokenId] : undefined,
    query: {
      enabled: !!resolved.contractAddress && safeTokenId !== undefined
    }
  });

  const { data: marketItems } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: marketplaceAbi,
    functionName: "fetchMarketItems",
    query: {
      enabled: !!resolved.contractAddress && !resolved.isExternal // Only check local market items for non-external
    }
  });

  // Determine listing status and price
  const listingData = useMemo(() => {
    if (!marketItems || resolved.isExternal || safeTokenId === undefined) return null;
    const item = marketItems.find(
      (m) => m.tokenId === safeTokenId && m.sold === false
    );
    if (!item) return null;
    return {
      price: item.price,
      seller: item.seller,
      owner: item.owner
    };
  }, [marketItems, safeTokenId, resolved.isExternal]);

  const displayOwner = onChainOwner ?? resolved.owner;

  const displayPrice = useMemo(() => {
    if (resolved.isExternal) return resolved.price;
    // If marketItems is loaded (non-null), we rely on it.
    // If listingData is found, return its price.
    // Otherwise, return null to indicate "Unlisted" (or let formatEthForDisplay handle it).
    if (marketItems) {
      return listingData ? formatEther(listingData.price) : null;
    }
    // Fallback to DB price if marketItems not yet loaded
    return resolved.price;
  }, [listingData, marketItems, resolved.isExternal, resolved.price]);

  // History Query
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["nft-history", resolved.contractAddress, resolved.tokenId],
    queryFn: () => fetchNftHistory(resolved.contractAddress!, resolved.tokenId),
    enabled: !!resolved.contractAddress && !!resolved.tokenId && /^\d+$/.test(resolved.tokenId)
  });

  // Purchase Flow
  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  });

  useEffect(() => {
    if (isConfirmed) {
      toast.success("NFT purchased successfully!");
    }
    if (writeError) {
      toast.error(`Purchase failed: ${writeError.message}`);
    }
  }, [isConfirmed, writeError]);

  const handleBuy = () => {
    if (resolved.chainId === 1) {
      toast.warning("Mainnet asset purchases must be routed through external DEXs");
      return;
    }
    if (!listingData || safeTokenId === undefined) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: marketplaceAbi,
      functionName: "createMarketSale",
      args: [safeTokenId],
      value: listingData.price
    });
  };

  const isBuyable = !!listingData && listingData.seller !== myAddress;

  const traits = useMemo((): Array<{ traitType: string; value: string }> => {
    const attrs = resolved.attributes;
    if (!Array.isArray(attrs)) return [];
    const items: Array<{ traitType: string; value: string }> = [];
    for (const raw of attrs) {
      if (!raw || typeof raw !== "object") continue;
      const t = raw as Trait;
      const traitType = typeof t.trait_type === "string" ? t.trait_type.trim() : "";
      const value =
        typeof t.value === "string"
          ? t.value.trim()
          : typeof t.value === "number"
            ? String(t.value)
            : t.value === null || typeof t.value === "undefined"
              ? ""
              : typeof t.value === "boolean"
                ? t.value
                  ? "true"
                  : "false"
                : "";
      if (!traitType || !value) continue;
      items.push({ traitType, value });
    }
    items.sort((a, b) => a.traitType.localeCompare(b.traitType));
    return items;
  }, [resolved.attributes]);

  const chainLabel = useMemo(() => {
    return getChainDisplayName({
      chainId: resolved.chainId,
      contractAddress: resolved.contractAddress,
      externalUrl: resolved.externalUrl
    });
  }, [resolved.chainId, resolved.contractAddress, resolved.externalUrl]);

  const price = useMemo(() => {
    const source = displayPrice ?? resolved.highestBid ?? resolved.minBid;
    
    const valuationInput = {
      price: source,
      priceWei: listingData?.price,
      floorPrice: nftDoc?.floorPrice,
      lastSale: nftDoc?.lastSale,
      tokenId: resolved.tokenId
    };

    const result = getSmartValuation(valuationInput, true);
    return { 
      value: result.value, 
      showUnit: true,
      isEstimate: result.isEstimate,
      label: result.label
    };
  }, [displayPrice, resolved.highestBid, resolved.minBid, listingData?.price, nftDoc?.floorPrice, nftDoc?.lastSale, resolved.tokenId]);

  const priceLabel = useMemo(() => {
    if (resolved.isAuction) return "Current Bid";
    return price.label;
  }, [resolved.isAuction, price.label]);

  const mediaCandidates = useMemo(() => {
    const raw = resolved.mediaType === "image" ? resolved.image ?? resolved.media : resolved.media ?? resolved.image;
    return getUrlCandidates(raw);
  }, [resolved.image, resolved.media, resolved.mediaType]);

  const initialMediaSrc = mediaCandidates[0] ?? FALLBACK_IMAGE;
  const [mediaSrc, setMediaSrc] = useState<string>(initialMediaSrc);
  const [mediaSrcIndex, setMediaSrcIndex] = useState<number>(0);

  useEffect(() => {
    setMediaSrcIndex(0);
    setMediaSrc(initialMediaSrc);
  }, [initialMediaSrc]);

  const handleMediaError = (): void => {
    if (mediaCandidates.length === 0) {
      setMediaSrc(FALLBACK_IMAGE);
      return;
    }
    const next = mediaSrcIndex + 1;
    if (next < mediaCandidates.length) {
      setMediaSrcIndex(next);
      setMediaSrc(mediaCandidates[next] ?? FALLBACK_IMAGE);
      return;
    }
    setMediaSrc(FALLBACK_IMAGE);
  };

  const explorerUrl = useMemo(() => {
    if (resolved.isExternal && typeof resolved.externalUrl === "string" && resolved.externalUrl.trim()) return resolved.externalUrl.trim();
    if (resolved.isExternal && typeof resolved.contractAddress === "string" && resolved.contractAddress.trim()) {
      const base = resolved.chainId === 137 ? "https://polygonscan.com" : resolved.chainId === 1 ? "https://etherscan.io" : "https://polygonscan.com";
      return `${base}/token/${resolved.contractAddress}`;
    }
    return null;
  }, [resolved.chainId, resolved.contractAddress, resolved.externalUrl, resolved.isExternal]);

  if (isError) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
        Failed to load NFT. ({error instanceof Error ? error.message : "Unknown error"})
      </div>
    );
  }

  return (
    <Mounted fallback={mountedFallback}>
      <div className="space-y-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          {explorerUrl ? (
            <Link
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              View on explorer
            </Link>
          ) : null}
        </div>

        <Title eyebrow={chainLabel} title={resolved.name} subtitle={resolved.collection} />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl glass-card shadow-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.14),transparent_55%)] blur-xl" />
            <div className="aspect-square">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-white/10" />
              ) : resolved.mediaType === "video" ? (
                <video
                  src={mediaSrc}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  onError={handleMediaError}
                />
              ) : resolved.mediaType === "audio" ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
                  <div className="h-52 w-52 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
                    <img
                      src={resolved.image ? ipfsToGatewayUrl(resolved.image) : FALLBACK_IMAGE}
                      alt={resolved.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                  <audio controls src={mediaSrc} className="w-full" preload="metadata" onError={handleMediaError} />
                </div>
              ) : (
                <img
                  src={mediaSrc}
                  alt={resolved.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={handleMediaError}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl glass-card p-6 shadow-glow">
              <div className="mb-4 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-xs text-zinc-500">Description</div>
                <div className="mt-2 text-sm text-zinc-200">{resolved.description ? resolved.description : "No description provided"}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Token</div>
                  <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-100">{String(resolved.tokenId)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Chain</div>
                  <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{chainLabel}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 sm:col-span-2">
                  <div className="text-xs text-zinc-500">Collection</div>
                  <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-100">{resolved.collection}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Owner</div>
                  <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-100">{shortenAddress(displayOwner)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Contract</div>
                  <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-100">{shortenAddress(resolved.contractAddress ?? undefined)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">{priceLabel}</div>
                  <div className="mt-1 inline-flex items-baseline gap-1 text-sm font-semibold tabular-nums text-web3-cyan">
                    <span>{price.value}</span>
                    {price.showUnit ? <span className="text-xs font-semibold text-web3-cyan/70">ETH</span> : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Type</div>
                  <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{resolved.mediaType}</div>
                </div>

                {resolved.isAuction ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 sm:col-span-2">
                    <div className="text-xs text-zinc-500">Auction</div>
                    <div className="mt-1 text-xs font-semibold text-zinc-100">
                      {resolved.highestBid ? "Highest bid available" : resolved.minBid ? "Minimum bid available" : "Auction listing"}
                      {resolved.auctionEndTime ? ` | Ends: ${new Date(resolved.auctionEndTime).toLocaleString()}` : ""}
                    </div>
                  </div>
                ) : null}
              </div>

              {isBuyable && !price.isEstimate && (
                <div className="mt-6">
                  <button
                    onClick={handleBuy}
                    disabled={isWriting || isConfirming}
                    className="w-full rounded-xl bg-web3-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-web3-primary/90 disabled:opacity-50"
                  >
                    {isWriting || isConfirming ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Buy Now"
                    )}
                  </button>
                </div>
              )}
            </section>

            {/* Transaction History Section */}
            <section className="rounded-3xl glass-card p-6 shadow-glow">
              <div className="mb-4 text-sm font-semibold text-zinc-100">Transaction History</div>
              {isHistoryLoading ? (
                <div className="space-y-2">
                   {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
                   ))}
                </div>
              ) : historyData?.nfts?.[0]?.transfers?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-400">
                    <thead className="border-b border-white/10 text-zinc-500">
                      <tr>
                        <th className="py-2 pr-4">Event</th>
                        <th className="py-2 pr-4">From</th>
                        <th className="py-2 pr-4">To</th>
                        <th className="py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historyData.nfts[0].transfers.map((tx: any, i: number) => (
                        <tr key={tx.uniqueId || i}>
                          <td className="py-2 pr-4 font-medium text-zinc-200">
                             {tx.from === "0x0000000000000000000000000000000000000000" ? "Mint" : "Transfer"}
                          </td>
                          <td className="py-2 pr-4 font-mono">{shortenAddress(tx.from)}</td>
                          <td className="py-2 pr-4 font-mono">{shortenAddress(tx.to)}</td>
                          <td className="py-2">{tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).toLocaleDateString() : "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No history available.</div>
              )}
            </section>

            {traits.length ? (
              <section className="rounded-3xl glass-card p-6 shadow-glow">
                <div className="mb-4 text-sm font-semibold text-zinc-100">Traits</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {traits.map((t) => (
                    <div key={`${t.traitType}:${t.value}`} className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                      <div className="text-xs text-zinc-500">{t.traitType}</div>
                      <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{t.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </Mounted>
  );
}
