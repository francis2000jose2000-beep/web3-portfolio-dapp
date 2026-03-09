"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, type Address } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { marketplaceAbi } from "@/config/contracts";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { formatEthLabel } from "@/lib/price";
import { NeonModal } from "@/components/NeonModal";

type ResellModalProps = {
  open: boolean;
  onClose: () => void;
  tokenId: bigint;
  marketplaceAddress: Address;
  chainId: number;
  onListed?: () => void;
};

export function ResellModal({ open, onClose, tokenId, marketplaceAddress, chainId, onListed }: ResellModalProps) {
  const [priceEth, setPriceEth] = useState<string>("0.05");
  const [formError, setFormError] = useState<string | null>(null);
  const [toastId, setToastId] = useState<string | number | null>(null);

  const { data: listingFeeData } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceAbi,
    functionName: "getListingFee",
    chainId,
    query: {
      enabled: open
    }
  });

  const listingFeeWei = typeof listingFeeData === "bigint" ? listingFeeData : null;

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isBusy = isPending || isConfirming;

  const canSubmit = useMemo(() => {
    return listingFeeWei !== null && priceEth.trim() !== "" && !isBusy;
  }, [listingFeeWei, priceEth, isBusy]);

  const handleSubmit = async (): Promise<void> => {
    setFormError(null);

    if (listingFeeWei === null) {
      setFormError("Listing fee not loaded yet.");
      return;
    }

    let priceWei: bigint;
    try {
      priceWei = parseEther(priceEth);
    } catch {
      setFormError("Invalid price. Use a number like 0.05");
      return;
    }

    let id: string | number | null = null;

    try {
      id = toast.loading("Please confirm in Wallet...");
      setToastId(id);
      const hash = await writeContractAsync({
        address: marketplaceAddress,
        abi: marketplaceAbi,
        functionName: "resellToken",
        args: [tokenId, priceWei],
        value: listingFeeWei,
        chainId
      });

      if (hash) toast.loading("Confirming on Blockchain...", { id });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setFormError(message);
      if (id !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.", { id });
        else toast.error(message, { id });
      } else {
        if (isUserRejectedError(err)) toast.warning("Transaction cancelled.");
        else toast.error(message);
      }
      setToastId(null);
      return;
    }
  };

  useEffect(() => {
    if (!isConfirming) return;
    if (toastId === null) return;
    toast.loading("Confirming on Blockchain...", { id: toastId });
  }, [isConfirming, toastId]);

  useEffect(() => {
    if (!isSuccess) return;
    if (toastId !== null) toast.success("NFT listed for sale.", { id: toastId });
    else toast.success("NFT listed for sale.");
    setToastId(null);
    if (typeof onListed === "function") onListed();
    onClose();
  }, [isSuccess, toastId, onListed, onClose]);

  useEffect(() => {
    if (!receiptError) return;
    const message = getErrorMessage(receiptError);
    setFormError(message);
    if (toastId !== null) toast.error(message, { id: toastId });
    else toast.error(message);
    setToastId(null);
  }, [receiptError, toastId]);

  return (
    <NeonModal
      open={open}
      onClose={onClose}
      title="List for Sale"
      subtitle={`Token #${tokenId.toString()}`}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-zinc-100">Price (ETH)</label>
          <input
            value={priceEth}
            onChange={(e) => setPriceEth(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
            placeholder="0.05"
            inputMode="decimal"
            autoComplete="off"
          />
          <div className="mt-2 text-xs text-zinc-400">
            Listing fee: {listingFeeWei !== null ? formatEthLabel({ priceWei: listingFeeWei }) : "Loading..."}
          </div>
        </div>

        {formError ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{formError}</div> : null}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Listing..." : "List now"}
        </button>
      </div>
    </NeonModal>
  );
}
