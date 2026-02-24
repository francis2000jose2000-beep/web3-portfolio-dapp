"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Repeat2, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { hardhat } from "viem/chains";
import { type Address } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract, useSignMessage, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Mounted } from "@/components/Mounted";
import { Title } from "@/components/Title";
import { AuctionBidBox } from "@/components/AuctionBidBox";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";
import { fetchNFTByTokenId, fetchTokenActivity, ipfsToGatewayUrl, swapToIpfsFallbackGateway, type ActivityItem } from "@/lib/api";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { getDemoMainnetNftById, type DemoActivityItem } from "@/lib/constants/mock-nfts";
import { getNftDisplayName } from "@/lib/nft";
import { formatEthForDisplay } from "@/lib/price";

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

  const demo = useMemo(() => getDemoMainnetNftById(id), [id]);
  const isDemo = demo !== null;

  const tokenId = useMemo(() => {
    if (isDemo) return null;
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id, isDemo]);

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? (CONTRACT_ADDRESS as Address) : undefined;

  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [buyToastId, setBuyToastId] = useState<ToastId | null>(null);
  const [bidEth, setBidEth] = useState<string>("");

  const { data: nftDoc, isLoading: isMetaLoading } = useQuery({
    queryKey: ["nft", id],
    queryFn: () => fetchNFTByTokenId(id),
    enabled: !isDemo && tokenId !== null,
    staleTime: 15_000
  });

  const isExternal = isDemo ? true : nftDoc?.isExternal === true;

  const { data: history } = useQuery({
    queryKey: ["activity", { tokenId: id }],
    queryFn: () => fetchTokenActivity(id, { limit: 50 }),
    enabled: !isDemo && tokenId !== null,
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
    ? isDemo
      ? demo.ownerAddress
      : typeof nftDoc?.owner === "string" && isAddress(nftDoc.owner)
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
    ? isDemo
      ? demo.isAuction === true
        ? `${demo.highestBid ?? demo.minBid ?? demo.priceEth} ETH`
        : `${demo.priceEth} ETH`
      : typeof nftDoc?.price === "string" && nftDoc.price.trim()
        ? nftDoc.price.trim()
        : null
    : listing
      ? (() => {
          const formatted = formatEthForDisplay({ priceWei: listing.price, isExternal: false });
          return formatted.showUnit ? `${formatted.value} ETH` : formatted.value;
        })()
      : null;

  const authorAddress =
    (isExternal
      ? isDemo
        ? (demo.creatorAddress as Address)
        : typeof nftDoc?.seller === "string" && isAddress(nftDoc.seller)
          ? nftDoc.seller
          : null
      : listing?.seller) ?? owner ?? null;

  const displayCollection =
    isDemo
      ? demo.collection
      : typeof (nftDoc as unknown as { category?: string })?.category === "string" && (nftDoc as unknown as { category: string }).category.trim()
        ? (nftDoc as unknown as { category: string }).category.trim()
        : typeof (nftDoc as unknown as { collection?: string })?.collection === "string" && (nftDoc as unknown as { collection: string }).collection.trim()
          ? (nftDoc as unknown as { collection: string }).collection.trim()
          : null;

  const displayName =
    isDemo
      ? demo.name
      : getNftDisplayName({
          name: typeof (nftDoc as unknown as { name?: string })?.name === "string" ? (nftDoc as unknown as { name: string }).name : null,
          tokenId: typeof (nftDoc as unknown as { tokenId?: string })?.tokenId === "string" ? (nftDoc as unknown as { tokenId: string }).tokenId : id,
          collectionName: displayCollection
        });
  const displayDescription = isDemo ? demo.description : nftDoc?.description?.trim() ? nftDoc.description.trim() : null;
  const displayImage = isDemo
    ? ipfsToGatewayUrl(demo.image)
    : typeof nftDoc?.image === "string" && nftDoc.image.trim()
      ? ipfsToGatewayUrl(nftDoc.image.trim())
      : null;
  const displayMediaRaw = isDemo
    ? demo.image
    : typeof nftDoc?.media === "string" && nftDoc.media.trim()
      ? nftDoc.media.trim()
      : typeof nftDoc?.image === "string" && nftDoc.image.trim()
        ? nftDoc.image.trim()
        : null;
  const displayMedia = displayMediaRaw ? ipfsToGatewayUrl(displayMediaRaw) : null;
  const displayMediaType = (() => {
    const mt =
      isDemo
        ? "image"
        : typeof nftDoc?.type === "string" && nftDoc.type.trim()
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

  const isDemoOwner =
    isDemo && typeof address === "string" ? address.toLowerCase() === demo.ownerAddress.toLowerCase() : false;
  const isDemoAuction = isDemo ? demo.isAuction === true : false;

  useEffect(() => {
    if (!isDemo) return;
    const seed = demo.highestBid ?? demo.minBid ?? "";
    setBidEth(seed);
  }, [isDemo, demo]);

  const simulateDemoAction = async (payload: { action: "Buy" | "Sell" | "Bid"; amountEth?: string }): Promise<void> => {
    if (!isDemo) return;
    try {
      if (!isConnected) {
        toast.warning("Connect wallet to simulate transaction");
        return;
      }

      const msg =
        payload.action === "Bid"
          ? `Portfolio Demo: I want to place a bid of ${payload.amountEth ?? "0"} ETH on ${demo.name} (${demo.collection}).\n\nSigner: ${address ?? ""}\nTimestamp: ${new Date().toISOString()}`
          : `Portfolio Demo: I want to ${payload.action.toLowerCase()} ${demo.name} (${demo.collection}) for ${demo.priceEth} ETH.\n\nSigner: ${address ?? ""}\nTimestamp: ${new Date().toISOString()}`;

      const toastId = toast.loading("Awaiting signature...");
      await signMessageAsync({ message: msg });
      toast.success("Portfolio Demo: Simulated transaction successful", { id: toastId });
    } catch (err: unknown) {
      if (isUserRejectedError(err)) toast.warning("Signature cancelled.");
      else toast.error(getErrorMessage(err));
    }
  };

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

  if (!isDemo && tokenId === null) {
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
            subtitle={
              isDemo
                ? isDemoAuction
                  ? "Auction demo listing"
                  : "Mainnet demo asset"
                : listing
                  ? "Listed on the marketplace"
                  : "Not currently listed"
            }
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
                    {isExternal ? (isDemo ? demo.contractAddress : (nftDoc?.contractAddress ?? "N/A")) : (contractAddress ?? "N/A")}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Owner</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-zinc-100">
                    {owner ? truncateAddress(owner) : "N/A"}
                  </div>
                </div>
                {displayCollection ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                    <div className="text-xs text-zinc-500">Collection</div>
                    <div className="mt-1 truncate text-xs font-semibold text-zinc-100">{displayCollection}</div>
                  </div>
                ) : null}
                {isDemo ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                    <div className="text-xs text-zinc-500">Creator</div>
                    <div className="mt-1 font-mono text-xs font-semibold text-zinc-100">{truncateAddress(demo.creatorAddress)}</div>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Seller</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-zinc-100">
                    {isExternal
                      ? isDemo
                        ? "N/A"
                        : typeof nftDoc?.seller === "string" && isAddress(nftDoc.seller)
                          ? truncateAddress(nftDoc.seller)
                          : "N/A"
                      : listing
                        ? truncateAddress(listing.seller)
                        : "N/A"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                  <div className="text-xs text-zinc-500">Price</div>
                  <div className="mt-1 text-sm font-semibold text-web3-cyan">{priceLabel ?? "N/A"}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl glass-card p-6 shadow-glow">
              {!isDemo ? auctionPanel : null}
              <div className="flex flex-col gap-3">
                {isDemo && isDemoAuction ? (
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                    <div className="text-xs text-zinc-500">Bid amount (ETH)</div>
                    <input
                      value={bidEth}
                      onChange={(e) => setBidEth(e.target.value)}
                      inputMode="decimal"
                      placeholder={demo.minBid ?? "0"}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <div className="mt-2 text-xs text-zinc-400">
                      Min bid: {demo.minBid ?? "N/A"} ETH | Highest bid: {demo.highestBid ?? "N/A"} ETH
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (isDemo) {
                      if (isDemoAuction) {
                        void simulateDemoAction({ action: "Bid", amountEth: bidEth });
                        return;
                      }
                      void simulateDemoAction({ action: isDemoOwner ? "Sell" : "Buy" });
                      return;
                    }

                    if (isExternal) {
                      if (explorerUrl) window.open(explorerUrl, "_blank", "noopener,noreferrer");
                      return;
                    }

                    void handleBuy();
                  }}
                  disabled={isDemo ? false : isExternal ? !explorerUrl : !canBuy || isBusy || isSuccess}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDemo
                    ? isDemoAuction
                      ? isConnected
                        ? "Place Bid"
                        : "Connect wallet to bid"
                      : isDemoOwner
                        ? isConnected
                          ? "Sell"
                          : "Connect wallet to sell"
                        : isConnected
                          ? "Buy Now"
                          : "Connect wallet to buy"
                    : isExternal
                      ? explorerUrl
                        ? "View on Mainnet"
                        : "View Only"
                      : isBusy
                        ? "Processing..."
                        : isSuccess
                          ? "Purchased"
                          : isConnected
                            ? "Buy now"
                            : "Connect wallet to buy"}
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
          </div>
        </div>

        <section className="rounded-3xl glass-card p-6 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-zinc-100">Activity</div>
            <div className="text-xs text-zinc-400">
              {isDemo
                ? `${demo.activity.length} event(s)`
                : Array.isArray(history)
                  ? `${history.length} event(s)`
                  : "N/A"}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs text-zinc-400">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">From</th>
                  <th className="py-2 pr-4">To</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {isDemo
                  ? demo.activity.map((it: DemoActivityItem) => (
                      <tr key={it.id} className="border-t border-white/10">
                        <td className="py-3 pr-4 font-semibold text-zinc-100">{it.type}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{it.from ? truncateAddress(it.from) : "N/A"}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{it.to ? truncateAddress(it.to) : "N/A"}</td>
                        <td className="py-3 pr-4">{it.amountEth ? `${it.amountEth} ETH` : "N/A"}</td>
                        <td className="py-3 text-xs text-zinc-400">{formatWhen(it.timestamp)}</td>
                      </tr>
                    ))
                  : Array.isArray(history) && history.length > 0
                    ? history.map((it) => (
                        <tr key={it.eventId} className="border-t border-white/10">
                          <td className="py-3 pr-4 font-semibold text-zinc-100">{activityLabel(it)}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{it.from ? truncateAddress(it.from) : "N/A"}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{it.to ? truncateAddress(it.to) : "N/A"}</td>
                          <td className="py-3 pr-4">{it.price ? `${it.price} ETH` : "N/A"}</td>
                          <td className="py-3 text-xs text-zinc-400">{formatWhen(it.timestamp)}</td>
                        </tr>
                      ))
                    : (
                        <tr className="border-t border-white/10">
                          <td colSpan={5} className="py-4 text-sm text-zinc-200">
                            No activity available for this token yet.
                          </td>
                        </tr>
                      )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Mounted>
  );
}
