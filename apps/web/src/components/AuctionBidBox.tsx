"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, parseEther, type Address } from "viem";
import { toast } from "sonner";
import { marketplaceAbi } from "@/config/contracts";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { useMounted } from "@/hooks/useMounted";

type AuctionBidBoxProps = {
  marketplaceAddress: Address;
  chainId: number;
  tokenId: bigint;
  allowEndAuction?: boolean;
};

type AuctionState = {
  minBid: bigint;
  highestBid: bigint;
  highestBidder: Address;
  endTime: bigint;
  active: boolean;
};

function normalizeAuction(data: unknown): AuctionState | null {
  if (!Array.isArray(data) || data.length < 5) return null;
  const [minBid, highestBid, highestBidder, endTime, active] = data as unknown as [bigint, bigint, Address, bigint, boolean];
  if (typeof minBid !== "bigint") return null;
  if (typeof highestBid !== "bigint") return null;
  if (typeof highestBidder !== "string") return null;
  if (typeof endTime !== "bigint") return null;
  if (typeof active !== "boolean") return null;
  return { minBid, highestBid, highestBidder, endTime, active };
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type ToastId = string | number;

export function AuctionBidBox({ marketplaceAddress, chainId, tokenId, allowEndAuction }: AuctionBidBoxProps) {
  const mounted = useMounted();
  const { isConnected, address } = useAccount();

  const { data: auctionData } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceAbi,
    functionName: "auctions",
    args: [tokenId],
    chainId,
    query: {
      enabled: mounted
    }
  });

  const { data: sellerData } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceAbi,
    functionName: "auctionSellers",
    args: [tokenId],
    chainId,
    query: {
      enabled: mounted && allowEndAuction === true
    }
  });

  const auction = useMemo(() => normalizeAuction(auctionData), [auctionData]);

  const auctionActive = auction?.active === true;
  const nowMs = Date.now();
  const endMs = auction ? Number(auction.endTime) * 1000 : 0;
  const [timeLeft, setTimeLeft] = useState<string>(formatTimeLeft(endMs - nowMs));

  useEffect(() => {
    if (!mounted || !auctionActive) return;
    const timer = setInterval(() => {
      setTimeLeft(formatTimeLeft(Number(auction.endTime) * 1000 - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted, auctionActive, auction?.endTime]);

  const ZERO = BigInt(0);
  const ONE = BigInt(1);
  const minBid = auction ? auction.minBid : ZERO;
  const highestBid = auction ? auction.highestBid : ZERO;
  const currentBid = highestBid > ZERO ? highestBid : minBid;

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const [bidEth, setBidEth] = useState<string>("");
  const [toastId, setToastId] = useState<ToastId | null>(null);

  useEffect(() => {
    if (!isSuccess) return;
    if (toastId !== null) toast.success("Bid confirmed", { id: toastId });
    setToastId(null);
  }, [isSuccess, toastId]);

  const busy = isPending || isConfirming;

  const canEnd =
    allowEndAuction === true &&
    isConnected &&
    typeof address === "string" &&
    typeof sellerData === "string" &&
    address.toLowerCase() === sellerData.toLowerCase();

  const handleBid = async (): Promise<void> => {
    if (!auctionActive) return;
    if (!isConnected) {
      toast.warning("Connect your wallet to place a bid.");
      return;
    }

    const trimmed = bidEth.trim();
    if (!trimmed) {
      toast.error("Enter a bid amount.");
      return;
    }

    let value: bigint;
    try {
      value = parseEther(trimmed);
    } catch {
      toast.error("Invalid amount.");
      return;
    }

    const minRequired = highestBid > ZERO ? highestBid + ONE : minBid;
    if (value < minRequired) {
      toast.error(`Minimum bid: ${formatEther(minRequired)} ETH`);
      return;
    }

    let id: ToastId | null = null;
    try {
      id = toast.loading("Submitting bid...");
      setToastId(id);
      await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "placeBid",
        args: [tokenId],
        value,
        chainId
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (id !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.", { id });
        else toast.error(message, { id });
      } else {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.");
        else toast.error(message);
      }
      setToastId(null);
    }
  };

  const handleEnd = async (): Promise<void> => {
    if (!auctionActive) return;
    if (!isConnected) {
      toast.warning("Connect your wallet.");
      return;
    }

    let id: ToastId | null = null;
    try {
      id = toast.loading("Ending auction...");
      setToastId(id);
      await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "endAuction",
        args: [tokenId],
        chainId
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (id !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.", { id });
        else toast.error(message, { id });
      } else {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.");
        else toast.error(message);
      }
      setToastId(null);
    }
  };

  if (!auctionActive) return null;

  return (
    <div className="mt-3 rounded-2xl border border-web3-cyan/25 bg-zinc-950/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-zinc-200">
          <span className="text-web3-cyan">Auction</span> · {timeLeft}
        </div>
        <div className="text-xs text-zinc-300">Current: {formatEther(currentBid)} ETH</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={bidEth}
          onChange={(e) => setBidEth(e.target.value)}
          placeholder="Bid (ETH)"
          inputMode="decimal"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-zinc-100 outline-none focus:border-web3-cyan/40"
        />
        <button
          type="button"
          className="h-10 shrink-0 rounded-xl bg-web3-cyan px-4 text-sm font-semibold text-zinc-950 shadow-neon-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void handleBid()}
          disabled={busy}
        >
          {busy ? "..." : "Place Bid"}
        </button>
        {canEnd ? (
          <button
            type="button"
            className="h-10 shrink-0 rounded-xl bg-web3-purple px-4 text-sm font-semibold text-zinc-950 shadow-neon-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleEnd()}
            disabled={busy}
          >
            End
          </button>
        ) : null}
      </div>
    </div>
  );
}
