import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Learn the vision behind the marketplace."
};

const CARDS = [
  {
    title: "Curated cyberpunk experience",
    body: "A marketplace designed for creators who want a modern, neon-first interface and fast flows."
  },
  {
    title: "Creator-first tooling",
    body: "Profiles, activity history, and clear listing states to help you showcase work and manage sales." 
  },
  {
    title: "Transparent on-chain actions",
    body: "Listings, relists, and sales stay consistent across the UI and the backend sync."
  },
  {
    title: "Built for iteration",
    body: "Each feature is shipped in phases with a focus on demoability, UI polish, and maintainable code."
  }
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-glow">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,43,214,0.14),transparent_55%)] blur-xl" />

        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">About</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">A neon-native NFT marketplace</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            This project blends a cyberpunk design system with practical marketplace flows: mint, list, sell, and track activity.
            The goal is to make creator pages feel alive, with transparent history and a consistent look across the app.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/subscription"
              className="inline-flex items-center justify-center rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
            >
              View Subscription
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/30 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.12),transparent_55%)] opacity-70" />
            <div className="text-sm font-semibold text-zinc-100">{c.title}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-300">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-glow">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,43,214,0.14),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.14),transparent_55%)] blur-xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Ready to go deeper?</div>
            <p className="mt-2 text-sm text-zinc-300">Explore tiers, unlock creator tools, and stay in the loop.</p>
          </div>
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center rounded-2xl bg-web3-purple px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
          >
            See pricing
          </Link>
        </div>
      </section>
    </div>
  );
}

