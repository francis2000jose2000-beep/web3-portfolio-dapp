"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as Record<string, unknown>;
  const message = anyErr.message;
  if (typeof message === "string") return message;
  return "Unknown error";
}

export default function CreatePage() {
  const { isConnected } = useAccount();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;

  const contractAddress = isAddress(CONTRACT_ADDRESS) ? CONTRACT_ADDRESS : undefined;

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priceEth, setPriceEth] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: listingFeeData, isError: isListingFeeError, error: listingFeeError } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "getListingFee",
    chainId,
    query: {
      enabled: Boolean(contractAddress)
    }
  });

  const listingFeeWei = useMemo(() => {
    return typeof listingFeeData === "bigint" ? listingFeeData : null;
  }, [listingFeeData]);

  const {
    writeContractAsync,
    isPending: isWritePending,
    data: txHash,
    error: writeError
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId,
    query: {
      enabled: Boolean(txHash)
    }
  });

  const isBusy = isWritePending || isConfirming;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);

    if (!isConnected) {
      setFormError("Connect your wallet to mint.");
      return;
    }

    if (!contractAddress) {
      setFormError("Invalid CONTRACT_ADDRESS in src/config/contracts.ts");
      return;
    }

    if (!imageUrl.trim()) {
      setFormError("Image URL is required.");
      return;
    }

    if (!priceEth.trim()) {
      setFormError("Price (ETH) is required.");
      return;
    }

    let priceWei: bigint;
    try {
      priceWei = parseEther(priceEth);
    } catch {
      setFormError("Invalid price. Use a number like 0.05");
      return;
    }

    if (priceWei <= BigInt(0)) {
      setFormError("Price must be greater than 0.");
      return;
    }

    if (listingFeeWei === null) {
      setFormError("Listing fee not loaded yet.");
      return;
    }

    try {
      await writeContractAsync({
        address: contractAddress,
        abi: marketplaceAbi,
        functionName: "createToken",
        args: [imageUrl.trim(), priceWei],
        value: listingFeeWei,
        chainId
      });
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
          <p className="mt-2 text-sm text-zinc-300">Mint and list an NFT on the marketplace.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
          {listingFeeWei !== null ? `Listing fee: ${listingFeeWei.toString()} wei` : "Listing fee: …"}
        </div>
      </div>

      {isListingFeeError ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Error loading listing fee: {getErrorMessage(listingFeeError)}
        </div>
      ) : null}

      {formError ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {formError}
        </div>
      ) : null}

      {writeError ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {getErrorMessage(writeError)}
        </div>
      ) : null}

      {receiptError ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {getErrorMessage(receiptError)}
        </div>
      ) : null}

      {txHash ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400">Transaction</span>
            <span className="break-all font-mono text-xs text-zinc-100">{txHash}</span>
            <span className="text-xs text-zinc-400">
              {isConfirming ? "Confirming…" : isSuccess ? "Confirmed." : "Submitted."}
            </span>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-zinc-100">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
              placeholder="e.g., Neon Ape #1"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-100">Price (ETH)</label>
            <input
              value={priceEth}
              onChange={(e) => setPriceEth(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-web3-purple/60 focus:shadow-glow"
              placeholder="0.05"
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-zinc-100">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-[110px] w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-white/20 focus:shadow-glow"
            placeholder="Short description of your NFT."
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-zinc-100">Image URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
            placeholder="https://... (temporary token URI)"
            autoComplete="off"
          />
          <p className="mt-2 text-xs text-zinc-400">
            For now this is sent as the on-chain token URI. Name/Description are UI-only until metadata upload.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isConnected || isBusy || !contractAddress || listingFeeWei === null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
              Minting…
            </span>
          ) : (
            "Mint NFT"
          )}
        </button>

        <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-3">
            <div className="text-zinc-500">Wallet</div>
            <div className="font-semibold text-zinc-200">{isConnected ? "Connected" : "Not connected"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-3">
            <div className="text-zinc-500">Contract</div>
            <div className="truncate font-mono font-semibold text-zinc-200">{CONTRACT_ADDRESS}</div>
          </div>
        </div>
      </form>
    </div>
  );
}
