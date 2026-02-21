"use client";

import { Suspense } from "react";
import { ExploreClient } from "@/app/explore/explore-client";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl"><div className="h-8 w-40 rounded bg-white/10" /></div>}>
      <ExploreClient />
    </Suspense>
  );
}
