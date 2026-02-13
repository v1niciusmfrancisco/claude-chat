# Claude Chat

A local web UI for browsing your [Claude Code](https://docs.anthropic.com/en/docs/claude-code) conversations.

Claude Code stores every conversation as JSONL files on disk (`~/.claude/projects/`), but there's no built-in way to browse, search, or revisit them. This app reads those files and renders them in a clean, searchable interface.

## Features

- **Session list** with full-text search and project filtering
- **Session chain unification** — when Claude Code splits a conversation across multiple sessions (context clears, plan implementations, auto-compaction), this app stitches them back into a single timeline
- **Collapsible tool calls** with tool name pills and parameter hints
- **Collapsible thinking blocks**
- **Collapsed tool-run summaries** — consecutive tool-only exchanges (e.g. 20 back-to-back file edits you approved) collapse into a single summary line
- **Compact boundary markers** showing where auto-compaction or context clears occurred
- **Token usage and cost tracking** per message and per session
- **Click-to-copy session IDs** for `claude --resume <id>`
- **Linked session panel** — when a conversation spans multiple sessions, shows each segment with a preview and copyable ID

## How it works

Claude Code writes a JSONL file per session to `~/.claude/projects/<project-dir>/`. Each line is a JSON record — `user`, `assistant`, `system`, `file-history-snapshot`, `progress`, etc.

This app:

1. **Scans** all project directories and reads `sessions-index.json` (Claude Code's cache) for fast metadata. Falls back to lightweight JSONL scanning for non-indexed sessions.
2. **Detects chains** — continuation sessions contain `"read the full transcript at: .../<parent-id>.jsonl"` in their first message. The app walks these references to find root sessions, hides all children from the list, and concatenates their messages when viewed.
3. **Filters noise** — internal command messages (`<local-command-caveat>`, `/clear`, etc.) and tool-result-only user records are filtered out.
4. **Renders** with markdown support, syntax highlighting for code blocks, and a dark terminal-style UI.

## Getting started

### Prerequisites

- Node.js 18+
- Claude Code installed and used (so you have conversations in `~/.claude/projects/`)

### Install and run

```bash
git clone https://github.com/v1niciusmfrancisco/claude-chat.git
cd claude-chat
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, Server Components)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- No database. No auth. Reads local files only.

## Project structure

```
app/
  page.tsx              Server component — session list + chat view
  layout.tsx            Dark theme, JetBrains Mono font
  globals.css           Tailwind + scrollbar styling

lib/
  types.ts              TypeScript types
  parser.ts             JSONL parsing, record filtering, chain detection
  sessions.ts           Data layer — listSessions(), getSession(), chain walking

components/
  sidebar.tsx           Left panel — search, project filter, grouped session list
  chat-view.tsx         Right panel — header, metadata, message stream
  conversation.tsx      Message list with tool-run collapsing logic
  message-bubble.tsx    User/assistant message rendering
  tool-call.tsx         Collapsible tool call with parameter hints
  thinking-block.tsx    Collapsible thinking block
  markdown-content.tsx  react-markdown wrapper
  session-segments.tsx  Linked session panel with copy-to-clipboard
  collapsed-tool-run.tsx  Summary line for consecutive tool exchanges
  compact-boundary.tsx  Visual divider for context clears/compaction
  token-badge.tsx       Token usage display
```

## Data privacy

This app runs entirely locally. It reads files from your filesystem and serves them on localhost. No data is sent anywhere.

## Contributing

Contributions are welcome. Open an issue or submit a PR.

## License

MIT
