import type { ReactNode } from "react";

type FilterProps = {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
};

export function Filter({ title = "Filters", children, right }: FilterProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

