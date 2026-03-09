"use client";

import Link from "next/link";
import { ArrowRight, Gavel, Sparkles } from "lucide-react";
import { DEMO_MAINNET_NFTS } from "@/lib/constants/mock-nfts";
import { formatEthForDisplay } from "@/lib/price";

const SLIDER_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1400'%20height='900'%20viewBox='0%200%201400%20900'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='70%25'%20cy='30%25'%20r='80%25'%3E%3Cstop%20offset='0%25'%20stop-color='%23A78BFA'%20stop-opacity='0.40'/%3E%3Cstop%20offset='45%25'%20stop-color='%2322D3EE'%20stop-opacity='0.18'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3ClinearGradient%20id='line'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'/%3E%3Cstop%20offset='100%25'%20stop-color='%23A78BFA'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='1400'%20height='900'%20fill='url(%23g)'/%3E%3Cpath%20d='M150%20710%20C360%20490%20490%20410%20660%20410%20c150%200%20240%2080%20312%20186%20c74-120%20176-182%20312-182%20122%200%20234%2056%20366%20194%20l-76%2056%20c-120-122-214-178-294-178-94%200-176%2072-258%20220%20l-52%2092-70-88c-78-96-152-142-240-142-126%200-232%2082-398%20262z'%20fill='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M240%20240%20h920%20v10%20H240z'%20fill='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M240%20282%20h720%20v10%20H240z'%20fill='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M240%20324%20h560%20v10%20H240z'%20fill='rgba(255,255,255,0.10)'/%3E%3Crect%20x='220'%20y='180'%20width='960'%20height='540'%20rx='56'%20fill='rgba(255,255,255,0.03)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M250%20480%20h900'%20stroke='url(%23line)'%20stroke-width='2'%20opacity='0.55'/%3E%3C/svg%3E";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEndsIn(iso: string | undefined): string {
  const raw = typeof iso === "string" ? iso.trim() : "";
  if (!raw) return "N/A";
  const end = new Date(raw);
  const endMs = end.getTime();
  if (Number.isNaN(endMs)) return "N/A";

  const diff = endMs - Date.now();
  if (diff <= 0) return "Ended";

  const totalMinutes = Math.floor(diff / 60_000);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function BigNFTSlider() {
  const featuredAuction = (() => {
    const auctions = DEMO_MAINNET_NFTS.filter((n) => n.isAuction === true);
    auctions.sort((a, b) => Number(b.highestBid ?? b.minBid ?? b.priceEth) - Number(a.highestBid ?? a.minBid ?? a.priceEth));
    return auctions[0] ?? null;
  })();

  const title = featuredAuction?.name ?? "Featured Auction";
  const description = featuredAuction?.description ?? "";
  const collection = featuredAuction?.collection ?? "";
  const imageSrc = featuredAuction?.image?.trim() ? featuredAuction.image.trim() : SLIDER_IMAGE;
  const creator = featuredAuction?.creatorAddress ? truncateAddress(featuredAuction.creatorAddress) : "-";
  const bidEthRaw = featuredAuction ? featuredAuction.highestBid ?? featuredAuction.minBid ?? featuredAuction.priceEth : "";
  const bidDisplay = formatEthForDisplay({ price: bidEthRaw ? `${bidEthRaw} ETH` : undefined, isExternal: true });
  const endsIn = featuredAuction ? formatEndsIn(featuredAuction.auctionEndTime) : "N/A";
  const shouldPixelate = featuredAuction
    ? `${title} ${collection} ${featuredAuction.externalUrl ?? ""} ${imageSrc}`.toLowerCase().includes("punk")
    : false;

  const bidText = bidDisplay.showUnit ? `${bidDisplay.value} ETH` : bidDisplay.value;
  const nftHref = featuredAuction ? `/nft/${featuredAuction.id}` : "/explore";
  const collectionHref = featuredAuction?.contractAddress ? `/explore?contract=${featuredAuction.contractAddress}` : "/explore";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_85%_60%,rgba(167,139,250,0.18),transparent_55%)] blur-xl" />

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(circle_at_40%_30%,rgba(34,211,238,0.20),transparent_60%),radial-gradient(circle_at_75%_70%,rgba(167,139,250,0.18),transparent_60%)] blur-2xl" />
          <div className="mx-auto w-56 sm:w-64 lg:w-72">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
              <div className="grid h-full w-full p-2">
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                  <img
                    src={imageSrc}
                    alt={title}
                    className="h-full w-full object-cover transition-opacity"
                    loading="lazy"
                    style={shouldPixelate ? { imageRendering: "pixelated" } : undefined}
                    onError={(e) => {
                      e.currentTarget.src = SLIDER_IMAGE;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200">
            <Sparkles className="h-3.5 w-3.5 text-web3-purple" />
            Featured auction
          </div>

          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{title}</h2>

          <p className="mt-3 text-sm leading-7 text-zinc-300">{description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
              <div className="text-xs text-zinc-500">Creator</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">{creator}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
              <div className="text-xs text-zinc-500">Current bid</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">{bidText}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
              <div className="text-xs text-zinc-500">Ends in</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">{endsIn}</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={nftHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-web3-purple px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
            >
              <Gavel className="h-4 w-4" />
              Place a Bid
            </Link>
            <Link
              href={collectionHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              View Collection
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
