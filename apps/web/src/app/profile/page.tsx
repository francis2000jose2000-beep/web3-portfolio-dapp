"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useMounted } from "@/hooks/useMounted";
import { NFTCard } from "@/components/NFTCard";
import { NFTSkeleton } from "@/components/NFTSkeleton";
import { fetchNFTs, ipfsToGatewayUrl, type NftApiItem } from "@/lib/api";

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProfilePage() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = useMemo(() => {
    if (!mounted) return undefined;
    return connectors.find((c) => c.id === "injected") ?? connectors[0];
  }, [connectors, mounted]);

  const [items, setItems] = useState<NftApiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ownerAddress = typeof address === "string" ? address : null;
  const ownerLabel = ownerAddress ? truncateAddress(ownerAddress) : "";

  const loadVault = async (owner: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNFTs({ owner, sort: "newest", limit: 48 });
      const filtered = res.filter((nft) => (nft.owner ?? "").toLowerCase() === owner.toLowerCase());
      setItems(filtered);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load NFTs. Please try again.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!ownerAddress) return;
    void loadVault(ownerAddress);
  }, [isConnected, mounted, ownerAddress]);

  const handleConnect = (): void => {
    if (!mounted) return;
    if (!injectedConnector) {
      toast.error("No wallet detected. Install a wallet extension to continue.");
      return;
    }
    connect({ connector: injectedConnector });
  };

  const handleCopy = async (): Promise<void> => {
    if (!ownerAddress) return;
    try {
      await navigator.clipboard.writeText(ownerAddress);
      toast.success("Address copied.");
    } catch {
      toast.error("Unable to copy address.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Your Vault</h1>
        <p className="mt-2 text-sm text-zinc-300">View NFTs owned by your connected wallet.</p>
      </div>

      {!isConnected ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-glow">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.12),transparent_55%)] blur-xl" />
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/40 text-web3-cyan shadow-neon-cyan">
              <Wallet className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-50">Connect to access your vault</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-300">Access your digital vault by connecting your wallet.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleConnect}
                disabled={!mounted || !injectedConnector || isConnecting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-web3-cyan px-6 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConnecting ? "Connecting…" : "Connect Wallet"}
                <Wallet className="h-4 w-4" />
              </button>
            </div>
            {connectError ? <p className="mt-4 text-sm text-red-300">{connectError.message}</p> : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,43,214,0.10),transparent_55%)] blur-xl" />
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Owner address</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-50">{ownerLabel}</div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
                aria-label="Copy address"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 text-xs text-zinc-400">Full address</div>
            <div className="mt-1 break-all rounded-2xl border border-white/10 bg-zinc-950/30 p-3 text-xs text-zinc-200">
              {ownerAddress}
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                <div className="text-xs font-semibold text-zinc-200">Owned NFTs</div>
                <div className="mt-1 text-sm text-zinc-100">{loading ? "—" : String(items.length)}</div>
              </div>
              <button
                type="button"
                onClick={() => (ownerAddress ? void loadVault(ownerAddress) : undefined)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => disconnect()}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
              >
                Disconnect
              </button>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <NFTSkeleton key={i} withButton={false} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <h2 className="text-lg font-semibold text-zinc-50">Something went wrong</h2>
                <p className="mt-2 text-sm text-zinc-300">{error}</p>
                <button
                  type="button"
                  onClick={() => (ownerAddress ? void loadVault(ownerAddress) : undefined)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-web3-purple px-6 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                <h2 className="text-lg font-semibold text-zinc-50">No NFTs to display</h2>
                <p className="mt-2 text-sm text-zinc-300">No NFTs found for this address.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((nft) => {
                  const imageUrl = nft.image ? ipfsToGatewayUrl(nft.image) : undefined;
                  const mediaUrl = nft.media ? ipfsToGatewayUrl(nft.media) : undefined;
                  const tokenId = nft.tokenId;
                  const subtitleParts: string[] = [];
                  if (nft.category) subtitleParts.push(nft.category);
                  subtitleParts.push(`Token #${tokenId}`);

                  return (
                    <NFTCard
                      key={`${tokenId}-${nft.owner ?? ""}`}
                      title={nft.name}
                      subtitle={subtitleParts.join(" • ")}
                      imageUrl={imageUrl}
                      mediaUrl={mediaUrl}
                      type={nft.type}
                      mediaType={nft.mediaType}
                      mimeType={nft.mimeType}
                      href={`/nft-details/${encodeURIComponent(tokenId)}`}
                      rightBadge="Owned"
                      sold={true}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
