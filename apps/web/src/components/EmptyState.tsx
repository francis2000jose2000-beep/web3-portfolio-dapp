import { Search } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  message: string;
};

export function EmptyState({ title = "Sector Empty", message }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-web3-cyan/30 bg-white/5 p-10 text-center backdrop-blur-sm">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-web3-cyan/30 bg-zinc-950/30 shadow-neon-cyan">
        <Search className="h-6 w-6 animate-pulse text-web3-cyan" />
      </div>
      <p className="mt-4 text-sm font-semibold tracking-wide text-zinc-100">{title}</p>
      <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-zinc-200">{message}</p>
    </div>
  );
}
