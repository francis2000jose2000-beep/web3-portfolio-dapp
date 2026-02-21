"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef } from "react";

type SliderProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function Slider({ title, subtitle, children }: SliderProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const scrollAmount = useMemo(() => {
    return 420;
  }, []);

  const scrollBy = (delta: number): void => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-300">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-scrollAmount)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-100 transition hover:bg-white/10"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(scrollAmount)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/30 text-zinc-100 transition hover:bg-white/10"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

