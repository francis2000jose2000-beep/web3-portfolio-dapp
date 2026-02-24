"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Menu, Search, Wallet, X } from "lucide-react";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hardhat } from "wagmi/chains";
import { useMounted } from "@/hooks/useMounted";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/explore", label: "Explore" },
  { href: "/events", label: "Events" },
  { href: "/upload-nft", label: "Upload" },
  { href: "/profile", label: "My Vault" }
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<boolean>(false);
  const mounted = useMounted();

  const items = useMemo(() => NAV_ITEMS, []);

  const { address, isConnected } = useAccount();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address,
  });

  const formattedBalance = useMemo(() => {
    if (!balanceData) return null;
    const val = parseFloat(balanceData.formatted);
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }, [balanceData]);

  const chainId = useChainId();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const needsHardhat = mounted && isConnected && chainId !== hardhat.id;

  const injectedConnector = useMemo(() => {
    if (!mounted) return undefined;
    return connectors.find((c) => c.id === "injected") ?? connectors[0];
  }, [connectors, mounted]);

  const connectButtonLabel = !mounted
    ? "Connect Wallet"
    : isConnected
      ? needsHardhat
        ? "Switch to Hardhat"
        : truncateAddress(address ?? "")
      : injectedConnector
        ? "Connect Wallet"
        : "No wallet detected";

  const handleConnectClick = (): void => {
    if (!mounted) return;
    if (isConnected) {
      if (needsHardhat) {
        switchChain({ chainId: hardhat.id });
        return;
      }
      disconnect();
      return;
    }

    if (!injectedConnector) return;
    connect({ connector: injectedConnector });
  };

  return (
    <header className="sticky top-0 z-50 -mx-4 border-b border-white/10 bg-zinc-950/70 px-4 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="h-6 w-6 rounded-lg bg-[linear-gradient(135deg,#22D3EE_0%,#A78BFA_100%)] shadow-glow" />
          NFT Marketplace
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-50"
                    : "rounded-lg px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-zinc-50"
                }
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/explore?focusSearch=1#search"
            aria-label="Search"
            title="Search"
            className={
              isActivePath(pathname, "/search") || isActivePath(pathname, "/explore")
                ? "inline-flex items-center justify-center rounded-lg bg-white/10 p-2 text-zinc-50"
                : "inline-flex items-center justify-center rounded-lg p-2 text-zinc-300 transition hover:bg-white/5 hover:text-zinc-50"
            }
          >
            <Search className="h-4 w-4" />
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {mounted && isConnected && (
            <span className="text-sm font-semibold text-web3-cyan">
              {isBalanceLoading || !formattedBalance
                ? "..."
                : `${formattedBalance} ${balanceData?.symbol ?? "ETH"}`}
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 shadow-glow transition hover:bg-white/10"
            onClick={handleConnectClick}
            disabled={
              !mounted ||
              (needsHardhat
                ? isSwitchingChain
                : !isConnected && (!injectedConnector || isPending))
            }
            aria-label={isConnected ? "Disconnect wallet" : "Connect wallet"}
            title={isConnected ? "Disconnect" : "Connect"}
          >
            <Wallet className="h-4 w-4" />
            {connectButtonLabel}
          </button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-200 transition hover:bg-white/10 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-zinc-950/70 px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-50"
                      : "rounded-lg px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-zinc-50"
                  }
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/explore?focusSearch=1#search"
              aria-label="Search"
              title="Search"
              className={
                isActivePath(pathname, "/search") || isActivePath(pathname, "/explore")
                  ? "inline-flex items-center justify-center rounded-lg bg-white/10 p-3 text-zinc-50"
                  : "inline-flex items-center justify-center rounded-lg p-3 text-zinc-200 transition hover:bg-white/5 hover:text-zinc-50"
              }
              onClick={() => setOpen(false)}
            >
              <Search className="h-5 w-5" />
            </Link>

            {mounted && isConnected && (
              <div className="mt-2 flex justify-center text-sm font-semibold text-web3-cyan">
                {isBalanceLoading || !formattedBalance
                  ? "..."
                  : `${formattedBalance} ${balanceData?.symbol ?? "ETH"}`}
              </div>
            )}

            <button
              type="button"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-web3-cyan px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-110"
              onClick={() => {
                handleConnectClick();
                setOpen(false);
              }}
              disabled={!mounted || (needsHardhat ? isSwitchingChain : !isConnected && (!injectedConnector || isPending))}
              aria-label={isConnected ? "Disconnect wallet" : "Connect wallet"}
              title={isConnected ? "Disconnect" : "Connect"}
            >
              <Wallet className="h-4 w-4" />
              {connectButtonLabel}
            </button>

            {error ? (
              <p className="text-sm text-red-300">{error.message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
