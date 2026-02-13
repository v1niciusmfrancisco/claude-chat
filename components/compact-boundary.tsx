import { ConversationMessage } from "@/lib/types";

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function CompactBoundary({ message }: { message: ConversationMessage }) {
  const meta = message.compactMetadata;
  const isPlanImpl = meta?.trigger === "plan_implementation";

  if (isPlanImpl) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 h-px bg-orange-900/30" />
        <span className="text-[10px] text-orange-700/70 font-medium px-2">
          context cleared — implementation begins
        </span>
        <div className="flex-1 h-px bg-orange-900/30" />
      </div>
    );
  }

  const trigger = meta?.trigger === "auto" ? "auto-compacted" : "compacted";
  const tokens = meta?.preTokens ? formatTokens(meta.preTokens) : null;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-[10px] text-zinc-600 px-2">
        {trigger}
        {tokens && <span className="text-zinc-700 ml-1">at {tokens} tok</span>}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}
