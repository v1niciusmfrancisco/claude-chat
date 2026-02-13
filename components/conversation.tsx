"use client";

import { ConversationMessage } from "@/lib/types";
import { MessageBubble } from "./message-bubble";
import { CompactBoundary } from "./compact-boundary";
import { CollapsedToolRun } from "./collapsed-tool-run";

// A message is "tool-only" if it's an assistant message with no meaningful text
function isToolOnly(msg: ConversationMessage): boolean {
  if (msg.type !== "assistant") return false;
  if (typeof msg.content === "string") return false;

  for (const block of msg.content) {
    if (block.type === "text" && block.text?.trim()) return false;
    if (block.type === "thinking") return false;
  }

  return msg.content.some((b) => b.type === "tool_use");
}

// A user message is "empty" if it's just tool_result or blank approval
function isEmptyUser(msg: ConversationMessage): boolean {
  if (msg.type !== "user") return false;

  if (typeof msg.content === "string") {
    return msg.content.trim().length === 0;
  }

  for (const block of msg.content) {
    if (block.type === "text" && block.text?.trim()) return false;
  }
  return true;
}

function isCollapsible(msg: ConversationMessage): boolean {
  return isToolOnly(msg) || isEmptyUser(msg);
}

type DisplayItem =
  | { kind: "message"; message: ConversationMessage }
  | { kind: "boundary"; message: ConversationMessage }
  | { kind: "tool_run"; messages: ConversationMessage[] };

function collapseMessages(messages: ConversationMessage[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.type === "compact_boundary") {
      items.push({ kind: "boundary", message: msg });
      i++;
      continue;
    }

    if (isCollapsible(msg)) {
      // Start a run
      const run: ConversationMessage[] = [];
      while (i < messages.length && isCollapsible(messages[i])) {
        run.push(messages[i]);
        i++;
      }
      if (run.length >= 2) {
        items.push({ kind: "tool_run", messages: run });
      } else {
        for (const m of run) {
          items.push({ kind: "message", message: m });
        }
      }
      continue;
    }

    items.push({ kind: "message", message: msg });
    i++;
  }

  return items;
}

export function Conversation({
  messages,
}: {
  messages: ConversationMessage[];
}) {
  const items = collapseMessages(messages);

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        switch (item.kind) {
          case "boundary":
            return (
              <CompactBoundary key={item.message.uuid} message={item.message} />
            );
          case "tool_run":
            return (
              <CollapsedToolRun
                key={`run-${item.messages[0].uuid}`}
                messages={item.messages}
              />
            );
          case "message":
            return (
              <MessageBubble key={item.message.uuid} message={item.message} />
            );
        }
      })}
    </div>
  );
}
