import { Usage } from "@/lib/types";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TokenBadge({
  usage,
  costUSD,
}: {
  usage?: Usage;
  costUSD?: number;
}) {
  if (!usage) return null;

  return (
    <div className="flex items-center gap-2 text-[9px] text-zinc-700 mt-1">
      <span>in: {formatTokens(usage.input_tokens)}</span>
      <span>out: {formatTokens(usage.output_tokens)}</span>
      {usage.cache_read_input_tokens ? (
        <span>cache: {formatTokens(usage.cache_read_input_tokens)}</span>
      ) : null}
      {costUSD ? <span>${costUSD.toFixed(4)}</span> : null}
    </div>
  );
}
