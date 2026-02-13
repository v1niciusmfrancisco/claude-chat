import { ConversationMessage } from "@/lib/types";

function extractToolNames(messages: ConversationMessage[]): string[] {
  const names: string[] = [];
  for (const msg of messages) {
    if (msg.type !== "assistant" || typeof msg.content === "string") continue;
    for (const block of msg.content) {
      if (block.type === "tool_use" && block.name) {
        names.push(block.name);
      }
    }
  }
  return names;
}

export function CollapsedToolRun({
  messages,
}: {
  messages: ConversationMessage[];
}) {
  const toolNames = extractToolNames(messages);
  const count = toolNames.length;

  const counts = new Map<string, number>();
  for (const name of toolNames) {
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const summary = [...counts.entries()]
    .map(([name, c]) => (c > 1 ? `${name} x${c}` : name))
    .join(", ");

  return (
    <div className="px-3 py-1.5 rounded bg-zinc-900/30 border border-zinc-800/50 flex items-center gap-2 text-[10px]">
      <span className="text-zinc-600">
        {count} tool call{count !== 1 ? "s" : ""}
      </span>
      <span className="text-zinc-700 truncate">{summary}</span>
    </div>
  );
}
