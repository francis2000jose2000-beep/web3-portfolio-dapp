"use client";

import { useConnect, useAccount } from "wagmi";
import { NeonModal } from "./NeonModal";
import { Wallet } from "lucide-react";
import { useEffect, useMemo } from "react";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { connectors, connect, isPending, error } = useConnect();
  const { isConnected } = useAccount();

  // Close modal when connected
  useEffect(() => {
    if (isConnected && open) {
      onClose();
    }
  }, [isConnected, open, onClose]);

  const metaMaskConnector = useMemo(() => 
    connectors.find((c) => c.id === "metaMask" || c.name === "MetaMask"),
    [connectors]
  );

  const phantomConnector = useMemo(() => 
    connectors.find((c) => c.id === "phantom" || c.name === "Phantom" || (c.id === "injected" && c.name === "Phantom")),
    [connectors]
  );

  const handleConnect = (connector: typeof metaMaskConnector) => {
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <NeonModal
      open={open}
      onClose={onClose}
      title="Connect Wallet"
      subtitle="Choose a wallet to connect to the marketplace."
    >
      <div className="flex flex-col gap-3">
        {/* MetaMask Button */}
        {metaMaskConnector ? (
          <button
            type="button"
            onClick={() => handleConnect(metaMaskConnector)}
            disabled={isPending}
            className="flex items-center justify-between rounded-xl bg-[#F6851B]/10 px-4 py-4 transition hover:bg-[#F6851B]/20 disabled:opacity-50"
          >
            <span className="flex items-center gap-3 font-semibold text-[#F6851B]">
              <Wallet className="h-5 w-5" />
              Connect MetaMask
            </span>
            {isPending && <span className="text-xs text-zinc-400">Connecting...</span>}
          </button>
        ) : (
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-4 py-4 transition hover:bg-zinc-800"
          >
            <span className="flex items-center gap-3 font-semibold text-zinc-400">
              <Wallet className="h-5 w-5" />
              Install MetaMask
            </span>
          </a>
        )}

        {/* Phantom Button */}
        {phantomConnector ? (
          <button
            type="button"
            onClick={() => handleConnect(phantomConnector)}
            disabled={isPending}
            className="flex items-center justify-between rounded-xl bg-[#AB9FF2]/10 px-4 py-4 transition hover:bg-[#AB9FF2]/20 disabled:opacity-50"
          >
            <span className="flex items-center gap-3 font-semibold text-[#AB9FF2]">
              <Wallet className="h-5 w-5" />
              Connect Phantom
            </span>
            {isPending && <span className="text-xs text-zinc-400">Connecting...</span>}
          </button>
        ) : (
          <a
            href="https://phantom.app/download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-4 py-4 transition hover:bg-zinc-800"
          >
            <span className="flex items-center gap-3 font-semibold text-zinc-400">
              <Wallet className="h-5 w-5" />
              Install Phantom
            </span>
          </a>
        )}

        {error && (
          <p className="mt-2 text-center text-sm text-red-400">
            {error.message}
          </p>
        )}
      </div>
    </NeonModal>
  );
}
