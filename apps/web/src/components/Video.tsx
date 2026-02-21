"use client";

import { Play } from "lucide-react";
import { useMemo, useState } from "react";

type VideoProps = {
  title?: string;
  subtitle?: string;
  posterUrl?: string;
  videoUrl?: string;
};

const DEFAULT_POSTER =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1600'%20height='900'%20viewBox='0%200%201600%20900'%3E%3Cdefs%3E%3CradialGradient%20id='g'%20cx='35%25'%20cy='35%25'%20r='80%25'%3E%3Cstop%20offset='0%25'%20stop-color='%2322D3EE'%20stop-opacity='0.22'/%3E%3Cstop%20offset='52%25'%20stop-color='%23A78BFA'%20stop-opacity='0.18'/%3E%3Cstop%20offset='100%25'%20stop-color='%230A0A0B'%20stop-opacity='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect%20width='1600'%20height='900'%20fill='url(%23g)'/%3E%3Crect%20x='80'%20y='80'%20width='1440'%20height='740'%20rx='60'%20fill='rgba(255,255,255,0.04)'%20stroke='rgba(255,255,255,0.12)'/%3E%3Cpath%20d='M720%20420%20l220%20130-220%20130z'%20fill='rgba(255,255,255,0.18)'/%3E%3C/svg%3E";

export function Video({
  title = "Watch the marketplace in motion",
  subtitle = "A quick walkthrough of the glow-first experience.",
  posterUrl,
  videoUrl
}: VideoProps) {
  const [playing, setPlaying] = useState<boolean>(false);

  const poster = useMemo(() => {
    return posterUrl && posterUrl.trim() ? posterUrl : DEFAULT_POSTER;
  }, [posterUrl]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
        </div>
        <div className="text-xs font-semibold text-zinc-400">Demo video</div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/30">
        {playing && videoUrl ? (
          <video className="aspect-video w-full" controls autoPlay playsInline src={videoUrl} />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="relative block w-full"
            aria-label="Play video"
          >
            <img src={poster} alt="Video preview" className="aspect-video w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 bg-zinc-950/30" />
            <span className="absolute left-1/2 top-1/2 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-web3-cyan shadow-glow backdrop-blur transition hover:brightness-110">
              <Play className="h-6 w-6" />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

