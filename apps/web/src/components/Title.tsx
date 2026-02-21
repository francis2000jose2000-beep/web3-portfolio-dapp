import type { ReactNode } from "react";

type TitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function Title({ eyebrow, title, subtitle, right }: TitleProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
            <span className="mr-2 h-2 w-2 rounded-full bg-web3-cyan shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-zinc-300">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

