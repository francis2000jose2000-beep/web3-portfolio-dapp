"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ipfsToGatewayUrl, type CollectionNftCardApiItem } from "@/lib/api";

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='800'%20viewBox='0%200%20800%20800'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='26%25'%20cy='20%25'%20r='85%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.24'/%3E%3Cstop%20offset='48%25'%20stop-color='%23A78BFA'%20stop-opacity='0.18'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3ClinearGradient%20id='l'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.7'/%3E%3Cstop%20offset='100%25'%20stop-color='%23A78BFA'%20stop-opacity='0.7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='800'%20height='800'%20fill='url(%23g)'/%3E%3Crect%20x='64'%20y='64'%20width='672'%20height='672'%20rx='56'%20fill='rgba(255,255,255,0.035)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M168%20218H632'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.35'/%3E%3Cpath%20d='M168%20582H632'%20stroke='url(%23l)'%20stroke-width='2'%20opacity='0.25'/%3E%3Ctext%20x='400'%20y='414'%20text-anchor='middle'%20font-family='ui-sans-serif,system-ui,-apple-system,Segoe%20UI,Roboto'%20font-size='20'%20fill='rgba(255,255,255,0.78)'%20font-weight='700'%3EImage%20Loading%3C/text%3E%3C/svg%3E";

type FeaturedDropGridProps = {
  items: CollectionNftCardApiItem[];
  collectionName?: string;
};

export function FeaturedDropGrid({ items, collectionName }: FeaturedDropGridProps) {
  const cards = useMemo(() => {
    const next: Array<CollectionNftCardApiItem | null> = items.slice(0, 4);
    while (next.length < 4) next.push(null);
    return next;
  }, [items]);

  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const markLoaded = (key: string) => {
    setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
      <div className="grid h-full w-full grid-cols-2 gap-2 p-2">
        {cards.map((item, idx) => {
          const key = item?.dbId ?? item?.tokenId ?? `placeholder-${idx}`;
          const href = item ? `/nft/${encodeURIComponent(item.dbId ?? item.tokenId)}` : null;
          const tokenId = typeof item?.tokenId === "string" ? item.tokenId.trim() : "";
          const baseName = typeof item?.name === "string" ? item.name.trim() : "";
          const collectionLabel = typeof collectionName === "string" ? collectionName.trim() : "";
          const label = baseName ? baseName : tokenId ? (collectionLabel ? `${collectionLabel} #${tokenId}` : `Token #${tokenId}`) : "Loading NFT";
          const imageUrlProp =
            typeof (item as unknown as { imageUrl?: unknown } | null)?.imageUrl === "string" ? (item as unknown as { imageUrl: string }).imageUrl.trim() : "";
          const rawImage =
            imageUrlProp || (typeof item?.image === "string" && item.image.trim() ? item.image.trim() : "");
          const src = rawImage ? ipfsToGatewayUrl(rawImage) : FALLBACK_IMAGE;
          const isLoaded = loaded[key] === true;

          const content = (
            <div className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50 transition will-change-transform hover:scale-[1.02] hover:border-web3-cyan/40 hover:shadow-[0_0_32px_rgba(34,211,238,0.30)]">
              {!isLoaded ? <div className="absolute inset-0 animate-pulse bg-white/10" /> : null}
              <img
                src={src}
                alt={item ? `${label} preview` : "NFT preview"}
                className="h-full w-full object-cover transition-opacity"
                loading="lazy"
                style={{ opacity: isLoaded ? 1 : 0 }}
                onLoad={() => markLoaded(key)}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                  markLoaded(key);
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-3 py-2">
                <div className="truncate text-xs font-semibold text-zinc-100">{label}</div>
              </div>
            </div>
          );

          if (!href) return <div key={key}>{content}</div>;

          return (
            <Link key={key} href={href} className="block h-full w-full">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
