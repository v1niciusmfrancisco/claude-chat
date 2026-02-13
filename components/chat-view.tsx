"use client";

import { ConversationMessage, SessionMeta, Usage } from "@/lib/types";
import { SessionSegments } from "./session-segments";
import { Conversation } from "./conversation";

interface SessionSegment {
  sessionId: string;
  label: string;
  summary: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function ChatView({
  messages,
  meta,
  segments,
}: {
  messages: ConversationMessage[];
  meta: SessionMeta;
  segments: SessionSegment[];
}) {
  const totalUsage: Usage = { input_tokens: 0, output_tokens: 0 };
  let model = "";

  for (const msg of messages) {
    if (msg.usage) {
      totalUsage.input_tokens += msg.usage.input_tokens;
      totalUsage.output_tokens += msg.usage.output_tokens;
    }
    if (msg.model && !model) model = msg.model;
  }

  const totalCost = meta.costUSD || 0;

  const title = meta.summary || meta.firstPrompt || "Untitled Session";

  return (
    <>
      {/* Header bar */}
      <div className="shrink-0 px-5 py-3 border-b border-zinc-800/80 bg-[#0a0a0a]">
        <h1 className="text-sm font-medium text-zinc-200 truncate">{title}</h1>
        <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap">
          <span className="text-orange-700">{meta.project}</span>
          {meta.gitBranch && (
            <span className="text-zinc-600">{meta.gitBranch}</span>
          )}
          {model && <span className="text-zinc-700">{model}</span>}
          <span className="text-zinc-700">{formatDate(meta.created)}</span>
          <span className="text-zinc-700">{messages.length} msg</span>
          {totalUsage.input_tokens > 0 && (
            <span className="text-zinc-700">
              {formatTokens(totalUsage.input_tokens + totalUsage.output_tokens)}{" "}
              tok
            </span>
          )}
          {totalCost > 0 && (
            <span className="text-orange-700 font-medium">${totalCost.toFixed(2)}</span>
          )}
        </div>
        {segments.length > 1 && (
          <SessionSegments segments={segments} />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <Conversation messages={messages} />
      </div>
    </>
  );
}
