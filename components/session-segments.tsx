"use client";

import { useState } from "react";

interface Segment {
  sessionId: string;
  label: string;
  summary: string;
}

export function SessionSegments({ segments }: { segments: Segment[] }) {
  if (segments.length <= 1) return null;

  return (
    <div className="mt-3 space-y-1">
      <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
        {segments.length} linked sessions
      </span>
      <div className="flex flex-col gap-1">
        {segments.map((seg) => (
          <SegmentRow key={seg.sessionId} segment={seg} />
        ))}
      </div>
    </div>
  );
}

function SegmentRow({ segment }: { segment: Segment }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(segment.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-2 py-1 rounded border text-left transition-colors ${
        copied
          ? "bg-orange-900/20 border-orange-800/50"
          : "bg-zinc-900/30 border-zinc-800/50 hover:border-orange-900/50"
      }`}
      title={`Copy: ${segment.sessionId}`}
    >
      <span className="text-[9px] text-zinc-600 shrink-0 w-4 text-right">
        #{segment.label}
      </span>
      <span className="text-[10px] font-mono text-zinc-600 shrink-0">
        {copied ? (
          <span className="text-orange-400">copied!</span>
        ) : (
          segment.sessionId.slice(0, 8)
        )}
      </span>
      {segment.summary && (
        <span className="text-[10px] text-zinc-500 truncate">
          {segment.summary}
        </span>
      )}
    </button>
  );
}
