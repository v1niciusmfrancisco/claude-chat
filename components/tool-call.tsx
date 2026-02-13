"use client";

import { useState } from "react";
import { ContentBlock } from "@/lib/types";

export function ToolCall({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);

  const toolName = block.name || "unknown";
  const input = block.input || {};

  const hint =
    input.file_path ? String(input.file_path) :
    input.command ? String(input.command).slice(0, 80) :
    input.pattern ? String(input.pattern) :
    input.query ? String(input.query).slice(0, 80) :
    null;

  return (
    <div className="border border-zinc-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 text-[11px] hover:bg-zinc-900/50 transition-colors"
      >
        <span className={`text-zinc-600 transition-transform text-[9px] ${open ? "rotate-90" : ""}`}>
          &#9654;
        </span>
        <span className="px-1.5 py-0.5 rounded bg-orange-950/40 text-orange-500/80 font-medium text-[10px]">
          {toolName}
        </span>
        {hint && (
          <span className="text-zinc-600 truncate">{hint}</span>
        )}
      </button>
      {open && (
        <div className="px-2.5 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 overflow-auto max-h-64">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
