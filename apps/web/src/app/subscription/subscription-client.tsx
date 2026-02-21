"use client";

import { Check, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Mounted } from "@/components/Mounted";
import { Subscribe } from "@/components/Subscribe";
import { Title } from "@/components/Title";

type PlanId = "free" | "pro" | "studio";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  accent: "cyan" | "purple";
  perks: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    accent: "cyan",
    perks: ["Browse and buy listed NFTs", "Basic creator profile", "Community access"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9/mo",
    accent: "purple",
    perks: ["Priority listings", "Pro analytics widgets", "Early feature drops"]
  },
  {
    id: "studio",
    name: "Studio",
    price: "$29/mo",
    accent: "cyan",
    perks: ["Creator tooling bundle", "Team collections", "Concierge support"]
  }
];

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SubscriptionClient() {
  const { isConnected, address } = useAccount();
  const [selected, setSelected] = useState<PlanId | null>("pro");
  const [activeTier, setActiveTier] = useState<PlanId>("free");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("nftm.subscriptionTier");
      if (raw === "free" || raw === "pro" || raw === "studio") setActiveTier(raw);
    } catch {
      return;
    }
  }, []);

  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-64 rounded bg-white/10" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-3xl border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );

  const selectedPlan = useMemo(() => {
    return PLANS.find((p) => p.id === selected) ?? null;
  }, [selected]);

  return (
    <Mounted fallback={mountedFallback}>
      <div className="space-y-10">
        <Title
          eyebrow="Membership"
          title="Subscription"
          subtitle="Choose a tier to unlock premium creator tools."
          right={
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
              <span>{isConnected && address ? `Wallet: ${truncateAddress(address)}` : "Wallet: —"}</span>
              {activeTier !== "free" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-950/30 px-2 py-0.5 text-xs font-semibold text-web3-purple">
                  <Crown className="h-3.5 w-3.5" />
                  Pro
                </span>
              ) : null}
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const active = plan.id === selected;
            const accent = plan.accent === "cyan" ? "text-web3-cyan" : "text-web3-purple";
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className={
                  active
                    ? "relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 text-left shadow-glow transition"
                    : "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-glow transition hover:bg-white/10"
                }
              >
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.12),transparent_55%)] opacity-70" />

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">{plan.name}</div>
                  <div className="flex items-center gap-2">
                    {plan.id === "pro" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-950/30 px-2 py-0.5 text-[11px] font-semibold text-web3-purple">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended
                      </span>
                    ) : null}
                    {plan.id === "studio" ? <Crown className={`h-4 w-4 ${accent}`} /> : null}
                  </div>
                </div>
                <div className={`mt-2 text-2xl font-semibold ${accent}`}>{plan.price}</div>
                <div className="mt-4 space-y-2">
                  {plan.perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 text-web3-cyan" />
                      <span className="leading-6">{perk}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Selected plan</div>
              <div className="mt-2 text-sm text-zinc-300">
                {selectedPlan ? `${selectedPlan.name} • ${selectedPlan.price}` : "Pick a plan"}
              </div>
            </div>
            <button
              type="button"
              disabled={!isConnected || !selectedPlan}
              className="inline-flex items-center justify-center rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              title={!isConnected ? "Connect wallet" : "Demo subscription flag"}
              onClick={() => {
                if (!selectedPlan) return;
                setActiveTier(selectedPlan.id);
                try {
                  window.localStorage.setItem("nftm.subscriptionTier", selectedPlan.id);
                } catch {
                  return;
                }
                toast.success(`Subscribed to ${selectedPlan.name} (demo)`);
              }}
            >
              Activate (demo)
            </button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,43,214,0.10),transparent_55%)] blur-xl" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/30">
                <ShieldCheck className="h-5 w-5 text-web3-cyan" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">Cancel anytime (demo)</div>
                <div className="mt-1 text-sm text-zinc-300">No hidden fees. This UI simulates subscription tiers.</div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm text-zinc-200">
              Active tier: {activeTier}
            </div>
          </div>
        </section>

        <Subscribe />
      </div>
    </Mounted>
  );
}
