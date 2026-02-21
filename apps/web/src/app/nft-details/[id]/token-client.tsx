"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Repeat2, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { hardhat } from "viem/chains";
import { formatEther, type Address } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Mounted } from "@/components/Mounted";
import { Title } from "@/components/Title";
import { AuctionBidBox } from "@/components/AuctionBidBox";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";
import { fetchNFTByTokenId, fetchTokenActivity, ipfsToGatewayUrl, swapToIpfsFallbackGateway, type ActivityItem } from "@/lib/api";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";

type MarketItem = {
  itemId: bigint;
  tokenId: bigint;
  seller: Address;
  owner: Address;
  price: bigint;
  sold: boolean;
};

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type ToastId = string | number;

type NftDetailsClientProps = {
  id: string;
};

function activityLabel(item: ActivityItem): string {
  if (item.type === "MINT") return "Minted";
  if (item.type === "LIST") return "Listed";
  if (item.type === "SELL") return "Sold";
  return "Transfer";
}

function activityIcon(item: ActivityItem) {
  if (item.type === "MINT") return <Sparkles className="h-4 w-4 text-web3-cyan" />;
  if (item.type === "LIST") return <Tag className="h-4 w-4 text-web3-purple" />;
  if (item.type === "SELL") return <ShoppingCart className="h-4 w-4 text-web3-cyan" />;
  return <Repeat2 className="h-4 w-4 text-web3-purple" />;
}

function formatWhen(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export function NftDetailsClient({ id }: NftDetailsClientProps) {
  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-64 rounded bg-white/10" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-3xl border border-white/10 bg-white/5" />
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6" />
      </div>
    </div>
  );

  const tokenId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? (CONTRACT_ADDRESS as Address) : undefined;

  const { isConnected, address } = useAccount();
  const [buyToastId, setBuyToastId] = useState<ToastId | null>(null);

  const { data: nftDoc, isLoading: isMetaLoading } = useQuery({
    queryKey: ["nft", id],
    queryFn: () => fetchNFTByTokenId(id),
    enabled: tokenId !== null,
    staleTime: 15_000
  });

  const isExternal = nftDoc?.isExternal === true;

  const { data: history } = useQuery({
    queryKey: ["activity", { tokenId: id }],
    queryFn: () => fetchTokenActivity(id, { limit: 50 }),
    enabled: tokenId !== null,
    staleTime: 5_000
  });

  const { data: ownerData } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "ownerOf",
    args: tokenId !== null ? [tokenId] : undefined,
    chainId,
    query: {
      enabled: !isExternal && Boolean(contractAddress) && tokenId !== null
    }
  });

  const owner = isExternal
    ? typeof nftDoc?.owner === "string" && isAddress(nftDoc.owner)
      ? nftDoc.owner
      : null
    : typeof ownerData === "string" && isAddress(ownerData)
      ? ownerData
      : null;

  const { data: itemsData } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "fetchMarketItems",
    chainId,
    query: {
      enabled: !isExternal && Boolean(contractAddress)
    }
  });

  const listing = useMemo(() => {
    if (isExternal) return null;
    if (!itemsData || tokenId === null) return null;
    const items = itemsData as readonly MarketItem[];
    return items.find((it) => it.tokenId === tokenId) ?? null;
  }, [isExternal, itemsData, tokenId]);

  const priceLabel = isExternal
    ? typeof nftDoc?.price === "string" && nftDoc.price.trim()
      ? nftDoc.price.trim()
      : null
    : listing
      ? `${formatEther(listing.price)} ETH`
      : null;
  const authorAddress = (isExternal ? (typeof nftDoc?.seller === "string" && isAddress(nftDoc.seller) ? nftDoc.seller : null) : listing?.seller) ?? owner ?? null;

  const displayName = nftDoc?.name?.trim() ? nftDoc.name.trim() : `Token #${id}`;
  const displayDescription = nftDoc?.description?.trim() ? nftDoc.description.trim() : null;
  const displayImage = typeof nftDoc?.image === "string" && nftDoc.image.trim() ? ipfsToGatewayUrl(nftDoc.image.trim()) : null;
  const displayMediaRaw =
    typeof nftDoc?.media === "string" && nftDoc.media.trim()
      ? nftDoc.media.trim()
      : typeof nftDoc?.image === "string" && nftDoc.image.trim()
        ? nftDoc.image.trim()
        : null;
  const displayMedia = displayMediaRaw ? ipfsToGatewayUrl(displayMediaRaw) : null;
  const displayMediaType = (() => {
    const mt =
      typeof nftDoc?.type === "string" && nftDoc.type.trim()
        ? nftDoc.type.toLowerCase()
        : typeof nftDoc?.mediaType === "string"
          ? nftDoc.mediaType.toLowerCase()
          : "";
    if (mt === "audio" || mt === "video" || mt === "image") return mt;
    const mime = typeof nftDoc?.mimeType === "string" ? nftDoc.mimeType.toLowerCase() : "";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    const url = (displayMediaRaw ?? "").toLowerCase();
    if (url.endsWith(".mp3") || url.endsWith(".wav")) return "audio";
    if (url.endsWith(".mp4") || url.endsWith(".mov")) return "video";
    return "image";
  })();

  const [mediaSrc, setMediaSrc] = useState<string | null>(displayMedia);
  const [posterSrc, setPosterSrc] = useState<string | null>(displayImage);

  useEffect(() => {
    setMediaSrc(displayMedia);
  }, [displayMedia]);

  useEffect(() => {
    setPosterSrc(displayImage);
  }, [displayImage]);

  const handleMediaError = (): void => {
    setMediaSrc((current) => {
      if (!current) return current;
      const swapped = swapToIpfsFallbackGateway(current);
      return swapped && swapped !== current ? swapped : null;
    });
  };

  const handlePosterError = (): void => {
    setPosterSrc((current) => {
      if (!current) return current;
      const swapped = swapToIpfsFallbackGateway(current);
      return swapped && swapped !== current ? swapped : null;
    });
  };

  const { writeContractAsync, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isBusy = isPending || isConfirming;

  const auctionPanel =
    !isExternal && contractAddress && tokenId !== null ? (
      <AuctionBidBox marketplaceAddress={contractAddress} chainId={chainId} tokenId={tokenId} allowEndAuction />
    ) : null;

  const accountLower = typeof address === "string" ? address.toLowerCase() : "";
  const sellerLower = listing ? listing.seller.toLowerCase() : "";

  const canBuy = !isExternal && Boolean(contractAddress) && Boolean(listing) && isConnected && accountLower !== "" && accountLower !== sellerLower;

  const handleBuy = async (): Promise<void> => {
    if (!listing || !contractAddress || tokenId === null) return;

    let toastId: ToastId | null = null;

    try {
      if (!isConnected) {
        toast.warning("Connect wallet to buy");
        return;
      }

      toastId = toast.loading("Processing purchase...");
      setBuyToastId(toastId);
      await writeContractAsync({
        address: contractAddress,
        abi: marketplaceAbi,
        functionName: "createMarketSale",
        args: [tokenId],
        value: listing.price,
        chainId
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (toastId !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction Cancelled", { id: toastId });
        else toast.error(message, { id: toastId });
      } else {
        if (isUserRejectedError(err)) toast.warning("Transaction Cancelled");
        else toast.error(message);
      }
      setBuyToastId(null);
      return;
    }
  };

  useEffect(() => {
    if (!isSuccess) return;
    if (buyToastId === null) return;
    toast.success("Congrats! You own a new NFT!", { id: buyToastId });
    setBuyToastId(null);
  }, [isSuccess, buyToastId]);

  useEffect(() => {
    if (!writeError) return;
    if (buyToastId !== null) {
      toast.error(getErrorMessage(writeError), { id: buyToastId });
      setBuyToastId(null);
    }
  }, [writeError, buyToastId]);

  useEffect(() => {
    if (!receiptError) return;
    if (buyToastId !== null) {
      toast.error(getErrorMessage(receiptError), { id: buyToastId });
      setBuyToastId(null);
    }
  }, [receiptError, buyToastId]);

  const explorerUrl = useMemo(() => {
    const chain = isExternal ? nftDoc?.chainId : chainId;
    const ca = isExternal ? nftDoc?.contractAddress : contractAddress;
    if (!ca || tokenId === null) return null;

    const external = typeof nftDoc?.externalUrl === "string" && nftDoc.externalUrl.trim() ? nftDoc.externalUrl.trim() : null;
    if (isExternal && external) return external;

    if (chain === hardhat.id) return null;

    const base =
      chain === 1
        ? "https://etherscan.io"
        : chain === 137
          ? "https://polygonscan.com"
          : chain === 8453
            ? "https://basescan.org"
            : "https://etherscan.io";

    return `${base}/token/${ca}?a=${tokenId.toString()}`;
  }, [isExternal, nftDoc?.chainId, nftDoc?.contractAddress, nftDoc?.externalUrl, contractAddress, tokenId, chainId]);

  if (tokenId === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">
        Invalid token id.
      </div>
    );
  }

  return (
    <Mounted fallback={mountedFallback}>
      <div className="space-y-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          {authorAddress ? (
            <Link
              href={`/author/${authorAddress}`}
              className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              View author
            </Link>
          ) : null}
        </div>

        {isMetaLoading && !nftDoc ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
                <span className="mr-2 h-2 w-2 rounded-full bg-web3-cyan shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
                NFT
              </div>
              <div className="mt-3 h-8 w-72 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white/10 opacity-80" />
            </div>
          </div>
        ) : (
          <Title
            eyebrow="NFT"
            title={displayName}
            subtitle={listing ? "Listed on the marketplace" : "Not currently listed"}
          />
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl glass-card shadow-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.14),transparent_55%)] blur-xl" />
            <div className="aspect-square">
              {isMetaLoading && !mediaSrc ? (
                <div className="h-full w-full bg-zinc-950/30">
                <div className="h-full w-full animate-pulse bg-white/10" />
                </div>
              ) : mediaSrc ? (
                displayMediaType === "video" ? (
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
                ) : displayMediaType === "audio" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
                    <div className="h-52 w-52 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
                      {posterSrc ? (
                        <img src={posterSrc} alt={displayName} className="h-full w-full object-cover" onError={handlePosterError} />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-white/10" />
                      )}
                    </div>
                    <audio controls src={mediaSrc} className="w-full" preload="metadata" onError={handleMediaError} />
                  </div>
                ) : (
                  <img
                    src={mediaSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={handleMediaError}
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-950/30">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200">
                    No media
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-3xl glass-card p-6 shadow-glow">
              {displayDescription ? (
                <div className="mb-4 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Description</div>
                  <div className="mt-2 text-sm text-zinc-200">{displayDescription}</div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Contract</div>
                  <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-100">
                    {isExternal ? (nftDoc?.contractAddress ?? "—") : (contractAddress ?? "—")}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Owner</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-zinc-100">
                    {owner ? truncateAddress(owner) : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Seller</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-zinc-100">
                    {isExternal
                      ? typeof nftDoc?.seller === "string" && isAddress(nftDoc.seller)
                        ? truncateAddress(nftDoc.seller)
                        : "—"
                      : listing
                        ? truncateAddress(listing.seller)
                        : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Price</div>
                  <div className="mt-1 text-sm font-semibold text-web3-cyan">{priceLabel ?? "—"}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl glass-card p-6 shadow-glow">
              {auctionPanel}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isExternal) {
                      if (explorerUrl) window.open(explorerUrl, "_blank", "noopener,noreferrer");
                      return;
                    }
                    void handleBuy();
                  }}
                  disabled={isExternal ? !explorerUrl : !canBuy || isBusy || isSuccess}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExternal ? (explorerUrl ? "View on Mainnet" : "View Only") : isBusy ? "Processing…" : isSuccess ? "Purchased" : isConnected ? "Buy now" : "Connect wallet to buy"}
                </button>

                {explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                  >
                    View on explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}

                {writeError ? <p className="text-xs text-red-300">{getErrorMessage(writeError)}</p> : null}
                {receiptError ? <p className="text-xs text-red-300">{getErrorMessage(receiptError)}</p> : null}
                {txHash ? <p className="break-all font-mono text-xs text-zinc-400">{txHash}</p> : null}
              </div>
            </section>

            <section className="rounded-3xl glass-card p-6 shadow-glow">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-100">Transaction History</div>
                <div className="text-xs text-zinc-400">{Array.isArray(history) ? `${history.length} event(s)` : "—"}</div>
              </div>

              <div className="mt-4 space-y-3">
                {Array.isArray(history) && history.length > 0 ? (
                  history.map((it) => (
                    <div
                      key={it.eventId}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 p-4"
                    >
                      <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        {activityIcon(it)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div className="text-sm font-semibold text-zinc-100">{activityLabel(it)}</div>
                          <div className="text-xs text-zinc-400">Token #{it.tokenId}</div>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">{formatWhen(it.timestamp)}</div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                          {it.from ? <span>From {truncateAddress(it.from)}</span> : null}
                          {it.to ? <span>To {truncateAddress(it.to)}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-200">
                    No on-chain events indexed for this token yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Mounted>
  );
}
