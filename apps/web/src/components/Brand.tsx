const BRANDS = ["NeonLabs", "CyberDAO", "PulseChain", "SynthWave", "MetaGrid"];

export function Brand() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="flex items-center justify-between gap-6">
        <h2 className="text-sm font-semibold text-zinc-100">Trusted by</h2>
        <div className="text-xs text-zinc-400">Demo partners</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {BRANDS.map((brand, idx) => (
          <div
            key={brand}
            className={
              idx % 2 === 0
                ? "rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-center text-xs font-semibold text-web3-cyan shadow-glow"
                : "rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 text-center text-xs font-semibold text-web3-purple shadow-glow"
            }
          >
            {brand}
          </div>
        ))}
      </div>
    </section>
  );
}

