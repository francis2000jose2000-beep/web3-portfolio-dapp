"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, type Address } from "viem";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { marketplaceAbi } from "@/config/contracts";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { ipfsToGatewayUrls, swapToIpfsFallbackGateway } from "@/lib/api";
import { formatEthForDisplay, getSmartValuation } from "@/lib/price";
import { AuctionBidBox } from "@/components/AuctionBidBox";

type NFTCardProps = {
  nft?: { 
    priceEth?: unknown; 
    price?: unknown; 
    priceWei?: unknown;
    floorPrice?: number;
    lastSale?: number;
    tokenId?: string;
  };
  title: string;
  subtitle?: string;
  imageUrl?: string;
  mediaUrl?: string;
  type?: "image" | "audio" | "video";
  mediaType?: "image" | "audio" | "video";
  mimeType?: string;
  isPixelArt?: boolean;
  href?: string;
  rightBadge?: string;
  isExternal?: boolean;
  externalUrl?: string;
  marketplaceAddress?: Address;
  chainId?: number;
  tokenId?: bigint;
  seller?: Address;
  sold?: boolean;
  priceWei?: bigint;
  priceLabel?: string;
  onPurchased?: () => void;
  demoActionLabel?: string;
  onDemoAction?: () => void | Promise<void>;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='800'%20viewBox='0%200%20800%20800'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='30%25'%20cy='20%25'%20r='85%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.22'/%3E%3Cstop%20offset='45%25'%20stop-color='%23A78BFA'%20stop-opacity='0.16'/%3E%3Cstop%20offset='100%25'%20stop-color='%2307070A'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3ClinearGradient%20id='l'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.8'/%3E%3Cstop%20offset='100%25'%20stop-color='%23A78BFA'%20stop-opacity='0.8'/%3E%3C/linearGradient%3E%3Cfilter%20id='n'%20x='-20%25'%20y='-20%25'%20width='140%25'%20height='140%25'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.8'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='matrix'%20values='0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200.12%200'/%3E%3C/filter%3E%3C/defs%3E%3Crect%20width='800'%20height='800'%20fill='url(%23g)'/%3E%3Crect%20width='800'%20height='800'%20filter='url(%23n)'%20opacity='0.9'/%3E%3Crect%20x='56'%20y='56'%20width='688'%20height='688'%20rx='48'%20fill='rgba(255,255,255,0.03)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M112%20224H688'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.35'/%3E%3Cpath%20d='M112%20592H688'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.25'/%3E%3Ctext%20x='400'%20y='412'%20text-anchor='middle'%20font-family='ui-sans-serif,system-ui,-apple-system,Segoe%20UI,Roboto'%20font-size='26'%20fill='rgba(255,255,255,0.85)'%20font-weight='700'%3ENo%20Image%20Available%3C/text%3E%3Ctext%20x='400'%20y='452'%20text-anchor='middle'%20font-family='ui-sans-serif,system-ui,-apple-system,Segoe%20UI,Roboto'%20font-size='14'%20fill='rgba(255,255,255,0.55)'%3ECheck%20back%20later%20or%20open%20details%3C/text%3E%3C/svg%3E";

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

type ToastId = string | number;

function normalizePriceValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function NFTCard({
  nft,
  title,
  subtitle,
  imageUrl,
  mediaUrl,
  type,
  mediaType,
  mimeType,
  isPixelArt,
  href,
  rightBadge,
  isExternal,
  externalUrl,
  marketplaceAddress,
  chainId,
  tokenId,
  seller,
  sold,
  priceWei,
  priceLabel,
  onPurchased,
  demoActionLabel,
  onDemoAction
}: NFTCardProps) {
  const rawResolvedUrl = useMemo(() => {
    const candidate = typeof mediaUrl === "string" && mediaUrl.trim() ? mediaUrl.trim() : typeof imageUrl === "string" ? imageUrl.trim() : "";
    return candidate;
  }, [mediaUrl, imageUrl]);

  const resolvedType = useMemo((): "image" | "audio" | "video" => {
    if (type === "audio" || type === "video" || type === "image") return type;
    if (mediaType === "audio" || mediaType === "video" || mediaType === "image") return mediaType;
    const mime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    const url = rawResolvedUrl.toLowerCase();
    if (url.endsWith(".mp3") || url.endsWith(".wav")) return "audio";
    if (url.endsWith(".mp4") || url.endsWith(".mov")) return "video";
    return "image";
  }, [type, mediaType, mimeType, rawResolvedUrl]);

  const effectiveRawUrl = useMemo(() => {
    if (resolvedType === "image") {
      const raw = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : typeof mediaUrl === "string" ? mediaUrl.trim() : "";
      return raw;
    }
    const raw = typeof mediaUrl === "string" && mediaUrl.trim() ? mediaUrl.trim() : typeof imageUrl === "string" ? imageUrl.trim() : "";
    return raw;
  }, [imageUrl, mediaUrl, resolvedType]);

  const urlCandidates = useMemo(() => getUrlCandidates(effectiveRawUrl), [effectiveRawUrl]);
  const resolvedUrl = urlCandidates[0] ?? "";

  const initialSrc = useMemo(() => {
    if (resolvedType !== "image") return FALLBACK_IMAGE;
    return resolvedUrl.trim() ? resolvedUrl.trim() : FALLBACK_IMAGE;
  }, [resolvedType, resolvedUrl]);

  const [src, setSrc] = useState<string>(initialSrc);
  const [srcIndex, setSrcIndex] = useState<number>(0);

  useEffect(() => {
    setSrcIndex(0);
    setSrc(initialSrc);
  }, [initialSrc]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const [purchaseToastId, setPurchaseToastId] = useState<ToastId | null>(null);

  const handleImageError = (): void => {
    if (urlCandidates.length === 0) {
      setSrc(FALLBACK_IMAGE);
      return;
    }
    const next = srcIndex + 1;
    if (next < urlCandidates.length) {
      setSrcIndex(next);
      setSrc(urlCandidates[next] ?? FALLBACK_IMAGE);
      return;
    }
    setSrc(FALLBACK_IMAGE);
  };

  const shouldPixelate = useMemo(() => {
    if (isPixelArt === true) return true;
    const hay = `${title} ${subtitle ?? ""} ${externalUrl ?? ""} ${resolvedUrl}`.toLowerCase();
    return hay.includes("cryptopunk") || hay.includes("crypto punk") || hay.includes("punk");
  }, [externalUrl, isPixelArt, resolvedUrl, subtitle, title]);

  const { address: accountAddress, isConnected } = useAccount();
  const { writeContractAsync, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isProcessingPurchase = isPending || isConfirming;

  const sellerLower = typeof seller === "string" ? seller.toLowerCase() : "";
  const accountLower = typeof accountAddress === "string" ? accountAddress.toLowerCase() : "";
  const canAttemptBuy =
    isExternal !== true &&
    Boolean(marketplaceAddress) &&
    typeof tokenId === "bigint" &&
    typeof priceWei === "bigint" &&
    Boolean(sellerLower) &&
    sold !== true &&
    accountLower !== sellerLower;

  const showBuyButton =
    sold !== true &&
    (sellerLower === "" || accountLower === "" || accountLower !== sellerLower);

  useEffect(() => {
    if (!isSuccess) return;
    if (purchaseSuccess) return;
    setPurchaseSuccess(true);
    if (purchaseToastId !== null) toast.success("Purchase confirmed.", { id: purchaseToastId });
    setPurchaseToastId(null);
    if (typeof onPurchased === "function") onPurchased();
  }, [isSuccess, onPurchased, purchaseSuccess, purchaseToastId]);

  const handlePurchase = async (): Promise<void> => {
    setPurchaseError(null);
    setPurchaseSuccess(false);

    if (!isConnected) {
      setPurchaseError("Connect your wallet to purchase.");
      toast.warning("Connect your wallet to purchase.");
      return;
    }

    if (!canAttemptBuy || !marketplaceAddress || tokenId === undefined || priceWei === undefined) {
      setPurchaseError("Purchase is not available for this item.");
      toast.error("Purchase is not available for this item.");
      return;
    }

    let toastId: ToastId | null = null;

    try {
      toastId = toast.loading("Processing purchase...");
      setPurchaseToastId(toastId);
      await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "createMarketSale",
        args: [tokenId],
        value: priceWei,
        chainId
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setPurchaseError(message);
      if (toastId !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.", { id: toastId });
        else toast.error(message, { id: toastId });
      } else {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.");
        else toast.error(message);
      }
      setPurchaseToastId(null);
    }
  };

  const purchaseStatusText = isProcessingPurchase
    ? "Processing purchase..."
    : isSuccess
      ? "Purchased"
      : "Buy Now";

  const { displayPriceValue, showEthUnit, isEstimate, priceLabelText } = useMemo(() => {
    const effectivePrice =
      normalizePriceValue(nft?.priceEth) ??
      normalizePriceValue(nft?.price) ??
      normalizePriceValue(nft?.priceWei) ??
      normalizePriceValue(priceLabel);

    const valuationInput = {
      price: effectivePrice,
      priceWei: priceWei,
      floorPrice: nft?.floorPrice,
      lastSale: nft?.lastSale,
      tokenId: tokenId?.toString() ?? nft?.tokenId ?? "0"
    };

    const result = getSmartValuation(valuationInput, true);
    return { 
      displayPriceValue: result.value, 
      showEthUnit: true,
      isEstimate: result.isEstimate,
      priceLabelText: result.label
    };
  }, [isExternal, nft?.price, nft?.priceEth, nft?.priceWei, priceLabel, priceWei, nft?.floorPrice, nft?.lastSale, tokenId, nft?.tokenId]);

  const content = (
    <>
      <div className="relative aspect-square">
        {resolvedType === "video" && resolvedUrl ? (
          <video
            src={resolvedUrl}
            className="h-full w-full object-cover"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
          />
        ) : resolvedType === "audio" && resolvedUrl ? (
          <div className="flex h-full w-full flex-col justify-end bg-zinc-950/30">
            <div className="absolute inset-0">
              <img
                src={typeof imageUrl === "string" && imageUrl.trim() ? (getUrlCandidates(imageUrl)[0] ?? FALLBACK_IMAGE) : FALLBACK_IMAGE}
                alt="Audio cover"
                className="h-full w-full object-cover opacity-60"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/30 to-transparent" />
            </div>
            <div className="relative p-4">
              <div className="mb-2 text-xs font-semibold text-zinc-100">Audio</div>
              <audio controls src={resolvedUrl} className="w-full" preload="metadata" />
            </div>
          </div>
        ) : (
          <img
            src={src}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={handleImageError}
            style={shouldPixelate ? { imageRendering: "pixelated" } : undefined}
          />
        )}

        {rightBadge ? (
          <div className="absolute right-4 top-4 inline-flex items-center rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-zinc-100 backdrop-blur">
            {rightBadge}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-semibold text-zinc-50">{title}</h3>
        </div>
        {subtitle ? <p className="truncate text-xs text-zinc-300">{subtitle}</p> : null}

        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="inline-flex items-baseline gap-1 text-xs text-zinc-300 tabular-nums">
            <span className="mr-1">{priceLabelText}:</span>
            <span className="font-semibold text-web3-cyan">{displayPriceValue}</span>
            {showEthUnit ? <span className="text-web3-cyan/70">ETH</span> : null}
          </div>

          {showBuyButton && !isEstimate && (!isExternal || typeof onDemoAction === "function") ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-purple px-3 py-2 text-xs font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(e) => {
                if (isExternal === true) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof onDemoAction === "function") {
                    void onDemoAction();
                    return;
                  }
                  const target = typeof externalUrl === "string" && externalUrl.trim() ? externalUrl.trim() : null;
                  if (target) window.open(target, "_blank", "noopener,noreferrer");
                  return;
                }
                void handlePurchase();
              }}
              disabled={
                isExternal === true
                  ? typeof onDemoAction === "function"
                    ? false
                    : !externalUrl
                  : !canAttemptBuy || isProcessingPurchase || isSuccess
              }
            >
              {isProcessingPurchase ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
                  {purchaseStatusText}
                </span>
              ) : isExternal === true ? (typeof onDemoAction === "function" ? (demoActionLabel ?? "Buy Now") : externalUrl ? "Mainnet Asset" : "View Only") : purchaseStatusText}
            </button>
          ) : null}
        </div>



        {marketplaceAddress && typeof tokenId === "bigint" && typeof chainId === "number" ? (
          <AuctionBidBox marketplaceAddress={marketplaceAddress} chainId={chainId} tokenId={tokenId} />
        ) : null}

        {writeError ? <p className="mt-2 text-xs text-red-300">{getErrorMessage(writeError)}</p> : null}
        {purchaseError ? <p className="mt-2 text-xs text-red-300">{purchaseError}</p> : null}
        {purchaseSuccess ? <p className="mt-2 text-xs text-emerald-300">Purchase confirmed.</p> : null}
      </div>
    </>
  );

  const cardInner = (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      className="group relative overflow-hidden rounded-xl"
    >
      <div className="relative overflow-hidden rounded-xl glass-card shadow-glow transition-colors group-hover:bg-zinc-900/50">
        {content}
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block transform-gpu transition-transform duration-300 hover:scale-[1.02]">
        {cardInner}
      </Link>
    );
  }

  return <div className="block transform-gpu transition-transform duration-300 hover:scale-[1.02]">{cardInner}</div>;
}
