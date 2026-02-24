import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatEthLabel } from "@/lib/price";

type CollectionProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  href?: string;
  floorEth?: string | number;
  items?: number;
};

const FALLBACK =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='900'%20height='600'%20viewBox='0%200%20900%20600'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='25%25'%20cy='25%25'%20r='85%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.20'/%3E%3Cstop%20offset='55%25'%20stop-color='%23A78BFA'%20stop-opacity='0.16'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='900'%20height='600'%20fill='url(%23g)'/%3E%3Crect%20x='48'%20y='48'%20width='804'%20height='504'%20rx='44'%20fill='rgba(255,255,255,0.04)'%20stroke='rgba(255,255,255,0.10)'/%3E%3C/svg%3E";

export function Collection({ title, subtitle, imageUrl, href = "/explore", floorEth, items }: CollectionProps) {
  const image = imageUrl && imageUrl.trim() ? imageUrl : FALLBACK;
  const floorLabel =
    typeof floorEth === "number"
      ? formatEthLabel({ price: String(floorEth) })
      : typeof floorEth === "string" && floorEth.trim()
        ? formatEthLabel({ price: floorEth })
        : "N/A";
  return (
    <Link
      href={href}
      className="group block snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glow transition hover:border-white/15 hover:bg-white/[0.07]"
    >
      <div className="relative aspect-[3/2]">
        <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.10),transparent_55%)]" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-50">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-zinc-300">{subtitle}</div> : null}
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-web3-cyan">
            View
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
            <div className="text-[11px] text-zinc-500">Floor</div>
            <div className="mt-1 text-xs font-semibold text-zinc-100">{floorLabel}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
            <div className="text-[11px] text-zinc-500">Items</div>
            <div className="mt-1 text-xs font-semibold text-zinc-100">{items ?? "N/A"}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
