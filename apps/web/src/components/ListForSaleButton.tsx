"use client";

import { useState } from "react";
import type { Address } from "viem";
import { ResellModal } from "@/components/ResellModal";

type ListForSaleButtonProps = {
  tokenId: bigint;
  marketplaceAddress: Address;
  chainId: number;
  disabled?: boolean;
  onListed?: () => void;
};

export function ListForSaleButton({ tokenId, marketplaceAddress, chainId, disabled, onListed }: ListForSaleButtonProps) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center rounded-xl bg-web3-purple px-4 py-2 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        List for Sale
      </button>
      <ResellModal
        open={open}
        onClose={() => setOpen(false)}
        tokenId={tokenId}
        marketplaceAddress={marketplaceAddress}
        chainId={chainId}
        onListed={onListed}
      />
    </>
  );
}

