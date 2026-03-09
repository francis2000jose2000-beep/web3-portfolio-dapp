"use client";

import { Headphones, Mic } from "lucide-react";
import { useMemo, useState } from "react";

type AudioLiveProps = {
  title: string;
  host: string;
  listeners: number;
  live?: boolean;
};

export function AudioLive({ title, host, listeners, live = true }: AudioLiveProps) {
  const [joined, setJoined] = useState<boolean>(false);

  const badge = useMemo(() => {
    return live ? "LIVE" : "Replay";
  }, [live]);

  return (
    <div className="snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glow transition hover:border-white/15 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Mic className="h-4 w-4 text-web3-purple" />
          {badge}
        </div>
        <div className="text-xs text-zinc-400">{listeners} listening</div>
      </div>

      <div className="p-4">
        <div className="text-sm font-semibold text-zinc-50">{title}</div>
        <div className="mt-1 text-xs text-zinc-300">Host: {host}</div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-web3-cyan shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Neon audio room
          </div>
          <button
            type="button"
            onClick={() => setJoined((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-web3-cyan px-3 py-2 text-xs font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
          >
            <Headphones className="h-4 w-4" />
            {joined ? "Leave" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

