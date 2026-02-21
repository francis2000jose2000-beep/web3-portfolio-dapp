"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, type Address } from "viem";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { marketplaceAbi } from "@/config/contracts";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { swapToIpfsFallbackGateway } from "@/lib/api";
import { AuctionBidBox } from "@/components/AuctionBidBox";

type NFTCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  mediaUrl?: string;
  type?: "image" | "audio" | "video";
  mediaType?: "image" | "audio" | "video";
  mimeType?: string;
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
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='800'%20viewBox='0%200%20800%20800'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='30%25'%20cy='20%25'%20r='80%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.18'/%3E%3Cstop%20offset='55%25'%20stop-color='%23A78BFA'%20stop-opacity='0.10'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='800'%20height='800'%20fill='url(%23g)'/%3E%3Crect%20x='56'%20y='56'%20width='688'%20height='688'%20rx='48'%20fill='rgba(255,255,255,0.04)'%20stroke='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M240%20500l92-120%2080%20100%2064-84%20124%20168H240z'%20fill='rgba(255,255,255,0.12)'/%3E%3Ccircle%20cx='332'%20cy='316'%20r='44'%20fill='rgba(255,255,255,0.14)'/%3E%3C/svg%3E";

type ToastId = string | number;

export function NFTCard({
  title,
  subtitle,
  imageUrl,
  mediaUrl,
  type,
  mediaType,
  mimeType,
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
  onPurchased
}: NFTCardProps) {
  const resolvedUrl = useMemo(() => {
    const candidate = typeof mediaUrl === "string" && mediaUrl.trim() ? mediaUrl.trim() : typeof imageUrl === "string" ? imageUrl.trim() : "";
    return candidate;
  }, [mediaUrl, imageUrl]);

  const resolvedType = useMemo((): "image" | "audio" | "video" => {
    if (type === "audio" || type === "video" || type === "image") return type;
    if (mediaType === "audio" || mediaType === "video" || mediaType === "image") return mediaType;
    const mime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    const url = resolvedUrl.toLowerCase();
    if (url.endsWith(".mp3") || url.endsWith(".wav")) return "audio";
    if (url.endsWith(".mp4") || url.endsWith(".mov")) return "video";
    return "image";
  }, [type, mediaType, mimeType, resolvedUrl]);

  const typeBadge = useMemo(() => {
    if (resolvedType === "audio") return { label: "Audio", className: "bg-web3-cyan/15 text-web3-cyan shadow-neon-cyan" };
    if (resolvedType === "video") return { label: "Video", className: "bg-web3-purple/15 text-web3-purple shadow-neon-purple" };
    return { label: "Image", className: "bg-white/10 text-zinc-100 shadow-glow" };
  }, [resolvedType]);

  const initialSrc = useMemo(() => {
    if (resolvedType !== "image") return FALLBACK_IMAGE;
    if (typeof resolvedUrl === "string" && resolvedUrl.trim() !== "") return resolvedUrl;
    return FALLBACK_IMAGE;
  }, [resolvedUrl, resolvedType]);

  const [src, setSrc] = useState<string>(initialSrc);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const [purchaseToastId, setPurchaseToastId] = useState<ToastId | null>(null);

  const handleImageError = (): void => {
    setSrc((current) => {
      const swapped = swapToIpfsFallbackGateway(current);
      if (swapped && swapped !== current) return swapped;
      return current === FALLBACK_IMAGE ? current : FALLBACK_IMAGE;
    });
  };

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

  const displayPrice = typeof priceWei === "bigint" ? `${formatEther(priceWei)} ETH` : typeof priceLabel === "string" ? priceLabel : "";

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
              <img src={FALLBACK_IMAGE} alt="Audio cover" className="h-full w-full object-cover opacity-60" />
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
          />
        )}

        {rightBadge ? (
          <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-zinc-100 backdrop-blur">
            {rightBadge}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-semibold text-zinc-50">{title}</h3>
        </div>
        {subtitle ? <p className="truncate text-xs text-zinc-300">{subtitle}</p> : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-300">{displayPrice}</div>

          {showBuyButton ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-purple px-3 py-2 text-xs font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(e) => {
                if (isExternal === true) {
                  e.preventDefault();
                  e.stopPropagation();
                  const target = typeof externalUrl === "string" && externalUrl.trim() ? externalUrl.trim() : null;
                  if (target) window.open(target, "_blank", "noopener,noreferrer");
                  return;
                }
                void handlePurchase();
              }}
              disabled={isExternal === true ? !externalUrl : !canAttemptBuy || isProcessingPurchase || isSuccess}
            >
              {isProcessingPurchase ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
                  {purchaseStatusText}
                </span>
              ) : isExternal === true ? (externalUrl ? "View on Mainnet" : "View Only") : purchaseStatusText}
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
      className="group relative overflow-hidden rounded-2xl"
    >
      <div className="relative overflow-hidden rounded-2xl glass-card shadow-glow transition-colors group-hover:bg-zinc-900/50">
        {content}
      </div>
    </motion.div>
  );

  const cardWithBadge = (
    <div className="relative">
      {cardInner}
      <div
        className={
          "pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center rounded-full border border-white/10 bg-zinc-950/40 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm " +
          typeBadge.className
        }
      >
        {typeBadge.label}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transform-gpu transition-transform duration-300 hover:scale-[1.02]">
        {cardWithBadge}
      </Link>
    );
  }

  return <div className="block transform-gpu transition-transform duration-300 hover:scale-[1.02]">{cardWithBadge}</div>;
}
