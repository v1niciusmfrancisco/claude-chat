"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-zinc-300 prose-pre:bg-black prose-pre:border prose-pre:border-zinc-800 prose-code:text-orange-400 prose-a:text-orange-500 prose-headings:text-zinc-200 prose-strong:text-zinc-200 break-words [&_p]:text-[12px] [&_li]:text-[12px] [&_code]:text-[11px]">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
