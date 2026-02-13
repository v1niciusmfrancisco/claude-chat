export interface SessionMeta {
  sessionId: string;
  project: string;
  projectPath: string;
  summary: string;
  firstPrompt: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  slug?: string;
  fullPath: string;
  parentSessionId?: string;
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  is_error?: boolean;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ConversationMessage {
  uuid: string;
  type: "user" | "assistant" | "compact_boundary";
  timestamp?: string;
  content: string | ContentBlock[];
  model?: string;
  usage?: Usage;
  costUSD?: number;
  gitBranch?: string;
  slug?: string;
  compactMetadata?: {
    trigger: string;
    preTokens: number;
  };
}

export type DateGroup = "Today" | "Yesterday" | "This Week" | "This Month" | "Older";
