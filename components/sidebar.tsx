"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SessionMeta, DateGroup } from "@/lib/types";

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

function buildParams(opts: {
  q?: string;
  s?: string | null;
  p?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.s) params.set("s", opts.s);
  if (opts.p) params.set("p", opts.p);
  return params.toString();
}

export function Sidebar({
  sessions,
  selectedId,
  query,
  projects,
  activeProject,
}: {
  sessions: SessionMeta[];
  selectedId: string | null;
  query: string;
  projects: string[];
  activeProject: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setSearch(value);
    startTransition(() => {
      router.push(`/?${buildParams({ q: value, s: selectedId, p: activeProject })}`);
    });
  };

  const handleSelect = (id: string) => {
    router.push(`/?${buildParams({ q: search, s: id, p: activeProject })}`);
  };

  const handleProject = (project: string | null) => {
    startTransition(() => {
      router.push(`/?${buildParams({ q: search, s: selectedId, p: project })}`);
    });
  };

  const grouped = groupSessions(sessions);

  return (
    <aside className="w-80 shrink-0 border-r border-zinc-800/80 flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-500 text-xs font-bold tracking-wider">
            CLAUDE CODE
          </span>
          <span className="text-zinc-700 text-[10px]">
            {sessions.length}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="/ search..."
          className="w-full px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded text-[11px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-orange-900/50"
        />

        {/* Project filter */}
        {projects.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <button
              onClick={() => handleProject(null)}
              className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
                !activeProject
                  ? "bg-orange-900/30 text-orange-400 border border-orange-800/50"
                  : "text-zinc-600 hover:text-zinc-400 border border-zinc-800/50"
              }`}
            >
              all
            </button>
            {projects.map((p) => (
              <button
                key={p}
                onClick={() => handleProject(p === activeProject ? null : p)}
                className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
                  p === activeProject
                    ? "bg-orange-900/30 text-orange-400 border border-orange-800/50"
                    : "text-zinc-600 hover:text-zinc-400 border border-zinc-800/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {grouped.map(({ group, sessions: groupSessions }) => (
          <div key={group}>
            <div className="px-3 pt-3 pb-1">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-medium">
                {group}
              </span>
            </div>
            {groupSessions.map((s) => {
              const isSelected = s.sessionId === selectedId;
              const title =
                s.summary || s.firstPrompt || "Untitled";

              return (
                <button
                  key={s.sessionId}
                  onClick={() => handleSelect(s.sessionId)}
                  className={`w-full text-left px-3 py-2 border-l-2 transition-colors ${
                    isSelected
                      ? "border-orange-500 bg-orange-950/20"
                      : "border-transparent hover:bg-zinc-900/50"
                  }`}
                >
                  <p
                    className={`text-[11px] truncate ${
                      isSelected ? "text-orange-400" : "text-zinc-400"
                    }`}
                  >
                    {title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-zinc-600">
                      {s.project}
                    </span>
                    {s.gitBranch && (
                      <span className="text-[9px] text-zinc-700">
                        {s.gitBranch}
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-700 ml-auto">
                      {relativeDate(s.modified)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
