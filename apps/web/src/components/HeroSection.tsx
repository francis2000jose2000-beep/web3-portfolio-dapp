import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";

const FEATURED_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1200'%20height='900'%20viewBox='0%200%201200%20900'%3E%3Cdefs%3E%3CradialGradient%20id='g1'%20cx='28%25'%20cy='22%25'%20r='70%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.35'/%3E%3Cstop%20offset='50%25'%20stop-color='%23A78BFA'%20stop-opacity='0.22'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3ClinearGradient%20id='g2'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.9'/%3E%3Cstop%20offset='100%25'%20stop-color='%23A78BFA'%20stop-opacity='0.9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='1200'%20height='900'%20fill='url(%23g1)'/%3E%3Crect%20x='72'%20y='72'%20width='1056'%20height='756'%20rx='56'%20fill='rgba(255,255,255,0.04)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M210%20640%20c140-170%20210-260%20320-260%2092%200%20156%2042%20218%20112%2062-90%20136-136%20222-136%20110%200%20198%2062%20310%20220%20l-78%2058%20c-88-122-156-176-232-176-64%200-120%2040-182%20132l-60%2090-74-94c-46-58-92-86-146-86-86%200-158%2072-274%20216z'%20fill='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M264%20240%20h672%20v8%20H264z'%20fill='rgba(255,255,255,0.10)'/%3E%3Cpath%20d='M264%20272%20h520%20v8%20H264z'%20fill='rgba(255,255,255,0.10)'/%3E%3Ccircle%20cx='920'%20cy='260'%20r='14'%20fill='url(%23g2)'/%3E%3Ccircle%20cx='960'%20cy='260'%20r='10'%20fill='rgba(255,255,255,0.18)'/%3E%3C/svg%3E";

export function HeroSection() {
  return (
    <section className="grid items-center gap-10 md:grid-cols-2">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-web3-cyan" />
          <span className="h-2 w-2 rounded-full bg-web3-cyan shadow-[0_0_20px_rgba(34,211,238,0.65)]" />
          Cyberpunk-ready marketplace
        </div>

        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-5xl">
          Discover, collect, and sell extraordinary NFTs
        </h1>

        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
          A neon-lit NFT marketplace experience for creators and collectors. Browse listings, mint in seconds, and
          trade directly on-chain.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
          >
            Explore
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
          >
            Create
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Network</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">Hardhat Local</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Payments</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">ETH / MATIC</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Style</div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">Neon Cyberpunk</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(167,139,250,0.20),transparent_55%)] blur-xl" />
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-xs text-zinc-400">Featured Drop</div>
              <div className="mt-1 text-sm font-semibold text-zinc-50">Neon Drift Collection</div>
            </div>
            <div className="rounded-full border border-white/10 bg-zinc-950/50 px-3 py-1 text-xs font-semibold text-zinc-200">
              Live
            </div>
          </div>
          <div className="p-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
              <img src={FEATURED_IMAGE} alt="Featured NFT" className="h-full w-full object-cover" loading="lazy" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Floor</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">0.08 ETH</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Volume</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">12.4 ETH</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-[11px] text-zinc-500">Items</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">256</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

