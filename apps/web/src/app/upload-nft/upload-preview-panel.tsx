"use client";

type UploadPreviewPanelProps = {
  mediaPreviewUrl: string;
  mediaFileName: string | null;
  mediaType: "image" | "audio" | "video";
  listingFeeWei: bigint | null;
  isConnected: boolean;
};

export function UploadPreviewPanel({ mediaPreviewUrl, mediaFileName, mediaType, listingFeeWei, isConnected }: UploadPreviewPanelProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.14),transparent_55%)] blur-xl" />
      <div className="text-sm font-semibold text-zinc-100">Preview</div>
      <div className="mt-4 aspect-square overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/30">
        {mediaPreviewUrl.trim() ? (
          mediaType === "video" ? (
            <video
              src={mediaPreviewUrl.trim()}
              className="h-full w-full object-cover"
              muted
              autoPlay
              loop
              playsInline
              controls
              preload="metadata"
            />
          ) : mediaType === "audio" ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
              <div className="h-44 w-44 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow">
                <div className="h-full w-full animate-pulse bg-white/10" />
              </div>
              <audio controls src={mediaPreviewUrl.trim()} className="w-full" />
            </div>
          ) : (
            <img src={mediaPreviewUrl.trim()} alt="NFT preview" className="h-full w-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">Select a file to preview</div>
        )}
      </div>
      {mediaFileName ? <div className="mt-3 truncate text-xs text-zinc-400">{mediaFileName}</div> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
          <div className="text-xs text-zinc-500">Listing fee</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {listingFeeWei !== null ? `${listingFeeWei.toString()} wei` : "…"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
          <div className="text-xs text-zinc-500">Wallet</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">{isConnected ? "Connected" : "Not connected"}</div>
        </div>
      </div>
    </section>
  );
}
