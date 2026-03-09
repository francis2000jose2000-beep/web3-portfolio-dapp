import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Search",
  description: "Search NFTs and creators."
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const target = q ? `/explore?q=${encodeURIComponent(q)}&focusSearch=1#search` : "/explore?focusSearch=1#search";
  redirect(target);
}
