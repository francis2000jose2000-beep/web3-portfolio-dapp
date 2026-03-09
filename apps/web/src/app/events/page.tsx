"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { EmptyState } from "@/components/EmptyState";
import { fetchEvents, type EventApiItem } from "@/lib/api";

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function EventsPage() {
  const { address, isConnected } = useAccount();

  const participant = typeof address === "string" ? address : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["events", { participant }],
    queryFn: () => fetchEvents(participant, { limit: 100 }),
    enabled: isConnected && Boolean(participant),
    staleTime: 5_000
  });

  const items = useMemo(() => (Array.isArray(data) ? (data as EventApiItem[]) : []), [data]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {!isConnected ? (
        <div className="mt-10">
          <EmptyState message="Connect your wallet to view your events." />
        </div>
      ) : isLoading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="mt-3 h-3 w-1/2 rounded bg-white/10" />
              <div className="mt-5 h-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-100">
          {error instanceof Error ? error.message : "Unable to load events."}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState message="No events found for this wallet." />
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ev, idx) => (
            <div key={ev._id ?? `${ev.title}-${idx}`} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-50">{ev.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-zinc-300">
                    <CalendarDays className="h-4 w-4 text-web3-cyan" />
                    {formatDate(ev.date)}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs font-semibold text-zinc-100">
                  <Users className="h-4 w-4 text-web3-purple" />
                  {Array.isArray(ev.participants) ? ev.participants.length : 0}
                </div>
              </div>

              {ev.description ? <p className="mt-4 line-clamp-4 text-sm text-zinc-200">{ev.description}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
