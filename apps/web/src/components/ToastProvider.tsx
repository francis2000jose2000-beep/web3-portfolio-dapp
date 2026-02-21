"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-white/10 bg-zinc-950/90 text-zinc-100 shadow-glow backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70",
          title: "text-sm font-semibold text-zinc-100",
          description: "text-xs text-zinc-300",
          actionButton: "bg-web3-cyan text-zinc-950",
          cancelButton: "bg-web3-purple text-zinc-950"
        }
      }}
    />
  );
}

