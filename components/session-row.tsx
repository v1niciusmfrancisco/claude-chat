import Link from "next/link";
import { SessionMeta } from "@/lib/types";
import { CopyButton } from "./copy-button";

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SessionRow({ session }: { session: SessionMeta }) {
  const title = session.summary || session.firstPrompt || "Untitled session";

  return (
    <Link
      href={`/session/${session.sessionId}`}
      className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100 truncate">{title}</p>
          {session.firstPrompt && session.summary && (
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {session.firstPrompt}
            </p>
          )}
        </div>
        <span className="text-xs text-zinc-500 shrink-0">
          {relativeDate(session.modified)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
          {session.project}
        </span>
        {session.gitBranch && (
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-blue-400">
            {session.gitBranch}
          </span>
        )}
        <span className="text-xs text-zinc-600">
          {session.messageCount} messages
        </span>
        <CopyButton text={session.sessionId} />
      </div>
    </Link>
  );
}
