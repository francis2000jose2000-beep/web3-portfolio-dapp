"use client";

import type { ReactNode } from "react";
import { useMounted } from "@/hooks/useMounted";

type MountedProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function Mounted({ children, fallback = null }: MountedProps) {
  const mounted = useMounted();
  if (!mounted) return fallback;
  return children;
}

