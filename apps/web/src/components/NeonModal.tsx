"use client";

import { type ReactNode, useEffect } from "react";

type NeonModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function NeonModal({ open, title, subtitle, onClose, children }: NeonModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur"
        onClick={() => {
          onClose();
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-glow">
          <div className="relative p-6">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(167,139,250,0.16),transparent_55%)] blur-xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-100">{title}</div>
                {subtitle ? <div className="mt-1 text-xs text-zinc-400">{subtitle}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

