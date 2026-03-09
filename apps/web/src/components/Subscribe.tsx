"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useMemo, useState } from "react";

type SubscribeProps = {
  title?: string;
  subtitle?: string;
};

export function Subscribe({
  title = "Get neon drops in your inbox",
  subtitle = "One email a week. No noise. Unsubscribe anytime."
}: SubscribeProps) {
  const [email, setEmail] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const canSubmit = useMemo(() => {
    return email.trim().includes("@") && email.trim().includes(".");
  }, [email]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow sm:p-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.16),transparent_55%)] blur-xl" />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-200">
            <Mail className="h-3.5 w-3.5 text-web3-cyan" />
            Subscribe
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 p-2">
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSubmitted(false);
              }}
              placeholder="you@domain.com"
              className="h-10 w-full bg-transparent px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              inputMode="email"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-web3-cyan px-4 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Join
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {submitted ? <p className="mt-2 text-xs text-emerald-300">Subscribed (demo).</p> : null}
        </form>
      </div>
    </section>
  );
}

