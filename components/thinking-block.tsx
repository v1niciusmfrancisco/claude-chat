"use client";

import { useState } from "react";

export function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-zinc-500 hover:bg-zinc-900/50 transition-colors"
      >
        <span className={`text-[9px] transition-transform ${open ? "rotate-90" : ""}`}>
          &#9654;
        </span>
        <span className="text-orange-800 font-medium">thinking</span>
        <span className="text-zinc-700">
          {thinking.length.toLocaleString()} chars
        </span>
      </button>
      {open && (
        <div className="px-2.5 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 whitespace-pre-wrap max-h-64 overflow-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}
