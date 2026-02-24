"use client";

type NFTSkeletonProps = {
  withButton?: boolean;
};

export function NFTSkeleton({ withButton = true }: NFTSkeletonProps) {
  return (
    <div className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-glow">
      <div className="relative aspect-square">
        <div className="h-full w-full bg-white/5">
          <div className="h-full w-full animate-pulse bg-white/10" />
        </div>
        <div className="absolute right-3 top-3 h-6 w-16 rounded-full border border-white/10 bg-zinc-950/70 backdrop-blur" />
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/10 opacity-80" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10 opacity-70" />
          {withButton ? <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" /> : null}
        </div>
      </div>
    </div>
  );
}
