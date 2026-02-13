import { ConversationMessage, ContentBlock } from "./types";
import { calculateCost } from "./pricing";

interface RawRecord {
  type: string;
  subtype?: string;
  uuid?: string;
  sessionId?: string;
  gitBranch?: string;
  slug?: string;
  costUSD?: number;
  message?: {
    role: string;
    model?: string;
    content: string | ContentBlock[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  timestamp?: string;
  compactMetadata?: {
    trigger: string;
    preTokens: number;
  };
}

const USER_ASSISTANT_RE = /"type"\s*:\s*"(user|assistant|system)"/;

const INTERNAL_PREFIXES = [
  "<local-command",
  "<command-name>",
  "<local-command-stdout>",
];

export function isInternalCommand(content: string | ContentBlock[]): boolean {
  if (typeof content !== "string") return false;
  return INTERNAL_PREFIXES.some((p) => content.startsWith(p));
}

export function quickTypeCheck(line: string): "user" | "assistant" | "system" | null {
  const match = USER_ASSISTANT_RE.exec(line);
  if (!match) return null;
  const t = match[1];
  if (t === "user" || t === "assistant" || t === "system") return t;
  return null;
}

export function parseRecord(line: string): RawRecord | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function recordToMessage(rec: RawRecord): ConversationMessage | null {
  if (rec.type === "system" && rec.subtype === "compact_boundary") {
    return {
      uuid: rec.uuid || crypto.randomUUID(),
      type: "compact_boundary",
      timestamp: rec.timestamp,
      content: "",
      compactMetadata: rec.compactMetadata,
    };
  }

  if (rec.type !== "user" && rec.type !== "assistant") return null;
  if (!rec.message) return null;

  // Skip internal Claude Code command messages
  if (rec.type === "user" && isInternalCommand(rec.message.content)) {
    return null;
  }

  return {
    uuid: rec.uuid || crypto.randomUUID(),
    type: rec.type as "user" | "assistant",
    timestamp: rec.timestamp,
    content: rec.message.content,
    model: rec.message.model,
    usage: rec.message.usage,
    costUSD: rec.message.usage && rec.message.model
      ? calculateCost(rec.message.model, rec.message.usage)
      : undefined,
    gitBranch: rec.gitBranch,
    slug: rec.slug,
  };
}

export function extractFirstPrompt(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content.slice(0, 200);
  for (const block of content) {
    if (block.type === "text" && block.text) {
      return block.text.slice(0, 200);
    }
  }
  return "";
}

const TRANSCRIPT_RE =
  /read the full transcript at:\s*([^\s]+\.jsonl)/i;

/**
 * Extract parent session ID from a continuation message.
 * Matches both "Implement the following plan:" and
 * "This session is being continued..." — any message
 * containing "read the full transcript at: .../<uuid>.jsonl".
 */
export function extractParentSessionId(
  content: string | ContentBlock[]
): string | null {
  const text =
    typeof content === "string"
      ? content
      : content
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text!)
          .join("\n");

  const match = TRANSCRIPT_RE.exec(text);
  if (!match) return null;

  const filename = match[1].split("/").pop();
  if (!filename) return null;
  return filename.replace(".jsonl", "");
}
