"use client";

export type CategoryOption = {
  label: string;
  value: string;
};

type CategoryProps = {
  options: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
};

export function Category({ options, value, onChange }: CategoryProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-50 shadow-glow"
                : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

