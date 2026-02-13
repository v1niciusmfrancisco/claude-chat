"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SessionMeta, DateGroup } from "@/lib/types";
import { SessionRow } from "./session-row";

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  if (date >= monthAgo) return "This Month";
  return "Older";
}

function groupSessions(
  sessions: SessionMeta[]
): { group: DateGroup; sessions: SessionMeta[] }[] {
  const groups = new Map<DateGroup, SessionMeta[]>();
  const order: DateGroup[] = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "Older",
  ];

  for (const s of sessions) {
    const g = getDateGroup(s.modified);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return order
    .filter((g) => groups.has(g))
    .map((g) => ({ group: g, sessions: groups.get(g)! }));
}

export function SessionList({
  sessions,
  initialQuery,
}: {
  sessions: SessionMeta[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.push(`/?${params.toString()}`);
    });
  };

  const grouped = groupSessions(sessions);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search sessions..."
        className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 mb-6"
      />

      {sessions.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-12">
          No sessions found.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ group, sessions: groupSessions }) => (
            <div key={group}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                {group}
              </h2>
              <div className="space-y-2">
                {groupSessions.map((s) => (
                  <SessionRow key={s.sessionId} session={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-600 text-center mt-8">
        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
