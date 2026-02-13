import fs from "fs";
import path from "path";
import os from "os";
import { SessionMeta, ConversationMessage } from "./types";
import {
  quickTypeCheck,
  parseRecord,
  recordToMessage,
  extractFirstPrompt,
  extractParentSessionId,
  isInternalCommand,
} from "./parser";

const CLAUDE_DIR = path.join(os.homedir(), ".claude", "projects");

interface IndexEntry {
  sessionId: string;
  fullPath: string;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
}

function deriveProjectName(dirName: string): string {
  const parts = dirName.split("-").filter(Boolean);
  const codingIdx = parts.findIndex(
    (p) => p.toLowerCase() === "coding"
  );
  if (codingIdx >= 0 && codingIdx < parts.length - 1) {
    return parts.slice(codingIdx + 1).join("-");
  }
  return parts.slice(-2).join("-");
}

function readIndex(projectDir: string): Map<string, IndexEntry> {
  const indexPath = path.join(projectDir, "sessions-index.json");
  const map = new Map<string, IndexEntry>();
  try {
    const raw = fs.readFileSync(indexPath, "utf-8");
    const data = JSON.parse(raw);
    const entries: IndexEntry[] = data.entries || [];
    for (const e of entries) {
      map.set(e.sessionId, e);
    }
  } catch {
    // No index file
  }
  return map;
}

/**
 * Quick check: does this file's first user message reference a parent session?
 * Reads only the first 32KB to avoid parsing large files.
 */
function detectParentSessionId(filePath: string): string | null {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(32768);
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const head = buf.toString("utf-8");

  if (!head.includes("read the full transcript at:")) return null;

  const lines = head.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const t = quickTypeCheck(line);
    if (t !== "user") continue;
    const rec = parseRecord(line);
    if (!rec?.message) continue;
    const parentId = extractParentSessionId(rec.message.content);
    if (parentId) return parentId;
  }
  return null;
}

function scanJsonlLightweight(
  filePath: string,
  sessionId: string,
  project: string,
  projectDir: string
): SessionMeta | null {
  let userCount = 0;
  let assistantCount = 0;
  let firstPrompt = "";
  let gitBranch = "";
  let slug = "";
  let firstTimestamp = "";
  let parentSessionId: string | null = null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const t = quickTypeCheck(line);
    if (!t) continue;

    if (t === "user") {
      userCount++;
      const rec = parseRecord(line);
      if (rec?.message) {
        if (!firstPrompt && !isInternalCommand(rec.message.content)) {
          firstPrompt = extractFirstPrompt(rec.message.content);
          gitBranch = rec.gitBranch || "";
          slug = rec.slug || "";
          firstTimestamp = rec.timestamp || "";
        }
        if (!parentSessionId) {
          parentSessionId = extractParentSessionId(rec.message.content);
        }
      }
    } else if (t === "assistant") {
      assistantCount++;
    }
  }

  if (userCount === 0 && assistantCount === 0) return null;

  const stat = fs.statSync(filePath);

  return {
    sessionId,
    project,
    projectPath: projectDir,
    summary: "",
    firstPrompt,
    messageCount: userCount + assistantCount,
    created: firstTimestamp || stat.birthtime.toISOString(),
    modified: stat.mtime.toISOString(),
    gitBranch,
    slug,
    fullPath: filePath,
    parentSessionId: parentSessionId || undefined,
  };
}

export function listSessions(): SessionMeta[] {
  const allSessions: SessionMeta[] = [];

  let projectDirs: string[];
  try {
    projectDirs = fs.readdirSync(CLAUDE_DIR);
  } catch {
    return [];
  }

  for (const dirName of projectDirs) {
    const projectDir = path.join(CLAUDE_DIR, dirName);
    if (!fs.statSync(projectDir).isDirectory()) continue;

    const project = deriveProjectName(dirName);
    const index = readIndex(projectDir);
    const indexedIds = new Set(index.keys());

    // Add indexed sessions
    for (const [, entry] of index) {
      if (entry.messageCount < 2) continue;

      const parentId = detectParentSessionId(entry.fullPath);

      allSessions.push({
        sessionId: entry.sessionId,
        project,
        projectPath: entry.projectPath || projectDir,
        summary: entry.summary || "",
        firstPrompt: entry.firstPrompt || "",
        messageCount: entry.messageCount,
        created: entry.created,
        modified: entry.modified,
        gitBranch: entry.gitBranch || "",
        fullPath: entry.fullPath,
        parentSessionId: parentId || undefined,
      });
    }

    // Scan non-indexed JSONL files
    let files: string[];
    try {
      files = fs
        .readdirSync(projectDir)
        .filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const file of files) {
      const sessionId = file.replace(".jsonl", "");
      if (indexedIds.has(sessionId)) continue;

      const filePath = path.join(projectDir, file);
      const meta = scanJsonlLightweight(
        filePath,
        sessionId,
        project,
        projectDir
      );
      if (meta && meta.messageCount >= 2) {
        allSessions.push(meta);
      }
    }
  }

  // Build parent→child mapping and find chain roots
  // child.parentSessionId → parent session ID
  const childByParent = new Map<string, SessionMeta>();
  for (const s of allSessions) {
    if (s.parentSessionId) {
      childByParent.set(s.parentSessionId, s);
    }
  }

  // Walk chains: find the root for every session
  const sessionsById = new Map(allSessions.map((s) => [s.sessionId, s]));
  const hiddenIds = new Set<string>();

  for (const s of allSessions) {
    if (!s.parentSessionId) continue;

    // This is a child session — walk up to find root
    let rootId = s.parentSessionId;
    const visited = new Set<string>([s.sessionId]);
    while (true) {
      const parent = sessionsById.get(rootId);
      if (!parent || !parent.parentSessionId) break;
      if (visited.has(parent.sessionId)) break; // cycle guard
      visited.add(parent.sessionId);
      rootId = parent.parentSessionId;
    }

    const root = sessionsById.get(rootId);
    if (root) {
      // Merge into root: combined count, latest modified
      root.messageCount += s.messageCount;
      if (new Date(s.modified) > new Date(root.modified)) {
        root.modified = s.modified;
      }
    }

    hiddenIds.add(s.sessionId);
  }

  const sessions = allSessions.filter((s) => !hiddenIds.has(s.sessionId));

  sessions.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  return sessions;
}

function readMessages(filePath: string): {
  messages: ConversationMessage[];
  gitBranch: string;
  slug: string;
  firstPrompt: string;
  parentSessionId: string | null;
} {
  const messages: ConversationMessage[] = [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  let gitBranch = "";
  let slug = "";
  let firstPrompt = "";
  let parentSessionId: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const t = quickTypeCheck(line);
    if (!t) continue;

    const rec = parseRecord(line);
    if (!rec) continue;

    const msg = recordToMessage(rec);
    if (!msg) continue;

    if (!gitBranch && rec.gitBranch) gitBranch = rec.gitBranch;
    if (!slug && rec.slug) slug = rec.slug;
    if (!firstPrompt && msg.type === "user") {
      firstPrompt = extractFirstPrompt(msg.content);
      if (!parentSessionId) {
        parentSessionId = extractParentSessionId(msg.content);
      }
    }

    messages.push(msg);
  }

  return { messages, gitBranch, slug, firstPrompt, parentSessionId };
}

export interface SessionSegment {
  sessionId: string;
  label: string;
  summary: string;
}

/**
 * Walk forward from a root session, collecting the full chain.
 * Returns ordered list of session IDs: [root, child1, child2, ...]
 */
function walkChainForward(
  rootId: string,
  projectDir: string
): string[] {
  const chain = [rootId];
  let currentId = rootId;
  const visited = new Set<string>([rootId]);

  // Scan all JSONL files to find children
  let files: string[];
  try {
    files = fs
      .readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"));
  } catch {
    return chain;
  }

  // Build parent→child map for this directory
  const parentToChild = new Map<string, string>();
  for (const file of files) {
    const sessionId = file.replace(".jsonl", "");
    const filePath = path.join(projectDir, file);
    const parentId = detectParentSessionId(filePath);
    if (parentId) {
      parentToChild.set(parentId, sessionId);
    }
  }

  // Walk forward
  while (true) {
    const childId = parentToChild.get(currentId);
    if (!childId || visited.has(childId)) break;
    visited.add(childId);
    chain.push(childId);
    currentId = childId;
  }

  return chain;
}

export function getSession(sessionId: string): {
  messages: ConversationMessage[];
  meta: SessionMeta | null;
  redirectTo?: string;
  segments: SessionSegment[];
} {
  let projectDirs: string[];
  try {
    projectDirs = fs.readdirSync(CLAUDE_DIR);
  } catch {
    return { messages: [], meta: null, segments: [] };
  }

  // Find the JSONL file
  let filePath: string | null = null;
  let project = "";
  let projectDir = "";

  for (const dirName of projectDirs) {
    const dir = path.join(CLAUDE_DIR, dirName);
    const candidate = path.join(dir, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      project = deriveProjectName(dirName);
      projectDir = dir;
      break;
    }
  }

  if (!filePath) return { messages: [], meta: null, segments: [] };

  // Check if this is a child session — redirect to root
  const parentId = detectParentSessionId(filePath);
  if (parentId) {
    // Walk up to the root
    let rootId = parentId;
    const visited = new Set<string>([sessionId]);
    while (true) {
      if (visited.has(rootId)) break;
      visited.add(rootId);
      const rootPath = path.join(projectDir, `${rootId}.jsonl`);
      if (!fs.existsSync(rootPath)) break;
      const grandParentId = detectParentSessionId(rootPath);
      if (!grandParentId) break;
      rootId = grandParentId;
    }
    return { messages: [], meta: null, redirectTo: rootId, segments: [] };
  }

  // This is a root session — walk forward to collect the full chain
  const chain = walkChainForward(sessionId, projectDir);

  const index = readIndex(projectDir);
  const indexEntry = index.get(sessionId);

  // Read root messages
  const rootResult = readMessages(filePath);
  const allMessages: ConversationMessage[] = [...rootResult.messages];

  // Build segments
  const segments: SessionSegment[] = [];
  if (chain.length === 1) {
    segments.push({ sessionId, label: "Session", summary: "" });
  } else {
    segments.push({
      sessionId,
      label: "1",
      summary: rootResult.firstPrompt.slice(0, 80),
    });

    // Append each continuation
    for (let i = 1; i < chain.length; i++) {
      const childId = chain[i];
      const childPath = path.join(projectDir, `${childId}.jsonl`);
      if (!fs.existsSync(childPath)) continue;

      // Add context-cleared divider
      allMessages.push({
        uuid: `divider-${childId}`,
        type: "compact_boundary" as const,
        content: "",
        compactMetadata: {
          trigger: "plan_implementation",
          preTokens: 0,
        },
      });

      const childResult = readMessages(childPath);

      // Skip the synthetic continuation first message
      const realMessages = childResult.messages.filter((msg, idx) => {
        if (idx !== 0 || msg.type !== "user") return true;
        const text =
          typeof msg.content === "string"
            ? msg.content
            : msg.content
                .filter((b) => b.type === "text" && b.text)
                .map((b) => b.text!)
                .join("");
        return (
          !text.includes("read the full transcript at:") &&
          !text.startsWith("Implement the following plan:")
        );
      });

      allMessages.push(...realMessages);

      // Extract first real user prompt for segment summary
      let childSummary = "";
      for (const msg of realMessages) {
        if (msg.type !== "user") continue;
        const text =
          typeof msg.content === "string"
            ? msg.content
            : msg.content
                .filter((b) => b.type === "text" && b.text)
                .map((b) => b.text!)
                .join("");
        if (text && !isInternalCommand(msg.content)) {
          childSummary = text.slice(0, 80);
          break;
        }
      }

      segments.push({
        sessionId: childId,
        label: String(i + 1),
        summary: childSummary,
      });
    }
  }

  const stat = fs.statSync(filePath);

  const meta: SessionMeta = {
    sessionId,
    project,
    projectPath: projectDir,
    summary: indexEntry?.summary || "",
    firstPrompt: indexEntry?.firstPrompt || rootResult.firstPrompt,
    messageCount: allMessages.length,
    created: indexEntry?.created || stat.birthtime.toISOString(),
    modified: indexEntry?.modified || stat.mtime.toISOString(),
    gitBranch: indexEntry?.gitBranch || rootResult.gitBranch,
    slug: rootResult.slug,
    fullPath: filePath,
  };

  return { messages: allMessages, meta, segments };
}
