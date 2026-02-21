import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthorClient } from "@/app/author/profile-client";

export const metadata: Metadata = {
  title: "Author",
  description: "View NFTs from a creator."
};

export const dynamic = "force-dynamic";

export default function AuthorPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200">Loading…</div>}>
      <AuthorClient />
    </Suspense>
  );
}
