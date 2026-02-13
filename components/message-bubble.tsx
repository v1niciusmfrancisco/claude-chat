import { ConversationMessage, ContentBlock } from "@/lib/types";
import { MarkdownContent } from "./markdown-content";
import { ThinkingBlock } from "./thinking-block";
import { ToolCall } from "./tool-call";
import { TokenBadge } from "./token-badge";

function renderContentBlocks(blocks: ContentBlock[]) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "text":
        return block.text ? (
          <MarkdownContent key={i} content={block.text} />
        ) : null;
      case "thinking":
        return block.thinking ? (
          <ThinkingBlock key={i} thinking={block.thinking} />
        ) : null;
      case "tool_use":
        return <ToolCall key={i} block={block} />;
      case "tool_result":
        return null;
      default:
        return null;
    }
  });
}

export function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.type === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-3 py-2 bg-orange-950/30 border border-orange-900/30">
          {typeof message.content === "string" ? (
            <p className="text-[12px] text-orange-200/90 whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="space-y-2 text-[12px] text-orange-200/90">
              {message.content
                .filter((b) => b.type === "text" && b.text?.trim())
                .map((b, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {b.text}
                  </p>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%]">
        {typeof message.content === "string" ? (
          <MarkdownContent content={message.content} />
        ) : (
          <div className="space-y-2">
            {renderContentBlocks(message.content)}
          </div>
        )}
        <TokenBadge usage={message.usage} costUSD={message.costUSD} />
      </div>
    </div>
  );
}
