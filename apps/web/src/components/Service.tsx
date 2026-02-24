import { BadgeDollarSign, SlidersHorizontal, Sparkles, Wallet } from "lucide-react";

type ServiceItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "purple";
};

const SERVICES: ServiceItem[] = [
  {
    title: "Filter & Discover",
    description: "Scan the grid for what's trending: rarity, price, and vibe.",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    accent: "cyan"
  },
  {
    title: "Connect Wallet",
    description: "Connect instantly with an injected wallet and browse on-chain.",
    icon: <Wallet className="h-5 w-5" />,
    accent: "purple"
  },
  {
    title: "Mint NFT",
    description: "Create your next drop in seconds: metadata now, upgrades later.",
    icon: <Sparkles className="h-5 w-5" />,
    accent: "cyan"
  },
  {
    title: "List for Sale",
    description: "Set a price and list your token on the marketplace contract.",
    icon: <BadgeDollarSign className="h-5 w-5" />,
    accent: "purple"
  }
];

function accentClass(accent: ServiceItem["accent"]) {
  return accent === "cyan"
    ? "text-web3-cyan shadow-[0_0_24px_rgba(34,211,238,0.25)]"
    : "text-web3-purple shadow-[0_0_24px_rgba(167,139,250,0.25)]";
}

export function Service() {
  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,0.16),transparent_55%),radial-gradient(circle_at_82%_70%,rgba(167,139,250,0.16),transparent_55%)] blur-xl" />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">How it works</h2>
            <p className="mt-2 text-sm text-zinc-300">A clean path from discovery to sale - with neon energy.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-zinc-950/40 px-4 py-2 text-xs font-semibold text-zinc-200">
            4 simple steps
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((item, idx) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30 p-5 transition hover:border-white/15 hover:bg-zinc-950/20"
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-web3-cyan/10 blur-2xl" />
                <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-web3-purple/10 blur-2xl" />
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${accentClass(item.accent)}`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-semibold text-zinc-400">Step {idx + 1}</div>
                </div>
              </div>

              <h3 className="relative mt-4 text-sm font-semibold text-zinc-50">{item.title}</h3>
              <p className="relative mt-2 text-xs leading-6 text-zinc-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
