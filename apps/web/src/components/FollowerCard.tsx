"use client";

import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

type FollowerCardProps = {
  name: string;
  handle: string;
  avatarUrl?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function FollowerCard({ name, handle, avatarUrl }: FollowerCardProps) {
  const [following, setFollowing] = useState<boolean>(false);

  const avatar = useMemo(() => {
    return avatarUrl && avatarUrl.trim() ? avatarUrl : null;
  }, [avatarUrl]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glow">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30">
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-web3-cyan">
              {initials(name)}
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-50">{name}</div>
          <div className="text-xs text-zinc-400">{handle}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFollowing((v) => !v)}
        className={
          following
            ? "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
            : "inline-flex items-center justify-center gap-2 rounded-xl bg-web3-purple px-3 py-2 text-xs font-semibold text-zinc-950 shadow-glow transition hover:brightness-110"
        }
      >
        <UserPlus className="h-4 w-4" />
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

