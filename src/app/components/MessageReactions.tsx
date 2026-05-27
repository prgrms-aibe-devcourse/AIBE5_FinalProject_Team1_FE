import { useState } from "react";
import { SmilePlus } from "lucide-react";

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

const quickReactionEmojis = ["👍", "✅", "🔥", "🎉", "👀", "💡", "🙏", "😂"];

export function toggleMessageReaction(
  reactions: MessageReaction[] | undefined,
  emoji: string
): MessageReaction[] {
  const currentReactions = reactions ?? [];
  const existingReaction = currentReactions.find((reaction) => reaction.emoji === emoji);

  if (!existingReaction) {
    return [...currentReactions, { emoji, count: 1, reacted: true }];
  }

  if (existingReaction.reacted) {
    const nextCount = existingReaction.count - 1;

    return currentReactions
      .map((reaction) =>
        reaction.emoji === emoji
          ? { ...reaction, count: nextCount, reacted: false }
          : reaction
      )
      .filter((reaction) => reaction.count > 0);
  }

  return currentReactions.map((reaction) =>
    reaction.emoji === emoji
      ? { ...reaction, count: reaction.count + 1, reacted: true }
      : reaction
  );
}

interface MessageReactionsProps {
  reactions?: MessageReaction[];
  onToggle: (emoji: string) => void;
}

export function MessageReactions({ reactions = [], onToggle }: MessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onToggle(emoji);
    setPickerOpen(false);
  };

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          className="rounded-full border-0 px-2.5 py-1 tracking-tight transition-all"
          style={{
            background: reaction.reacted ? "rgba(32, 227, 255, 0.16)" : "rgba(32, 227, 255, 0.08)",
            border: reaction.reacted
              ? "1px solid rgba(32, 227, 255, 0.34)"
              : "1px solid rgba(32, 227, 255, 0.14)",
            color: reaction.reacted ? "var(--neon-cyan)" : "var(--white)",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 900
          }}
          aria-label={`${reaction.emoji} 반응 ${reaction.count}개`}
          title={`${reaction.emoji} 반응`}
        >
          <span aria-hidden="true">{reaction.emoji}</span>
          <span className="ml-1">{reaction.count}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        className="flex h-7 w-7 items-center justify-center rounded-full border-0 transition-all"
        style={{
          background: pickerOpen ? "rgba(32, 227, 255, 0.16)" : "rgba(5, 11, 20, 0.42)",
          border: pickerOpen ? "1px solid rgba(32, 227, 255, 0.34)" : "1px solid rgba(32, 227, 255, 0.14)",
          color: pickerOpen ? "var(--neon-cyan)" : "var(--muted)",
          cursor: "pointer"
        }}
        aria-label="이모티콘 반응 추가"
        title="반응 추가"
      >
        <SmilePlus size={14} />
      </button>

      {pickerOpen && (
        <div
          className="absolute left-0 top-9 z-20 grid grid-cols-4 gap-1.5 rounded-xl p-2"
          style={{
            background: "rgba(5, 11, 20, 0.94)",
            border: "1px solid rgba(32, 227, 255, 0.22)",
            boxShadow: "0 18px 42px rgba(0, 0, 0, 0.36)",
            backdropFilter: "blur(12px)"
          }}
        >
          {quickReactionEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-0 transition-all"
              style={{
                background: "rgba(32, 227, 255, 0.08)",
                border: "1px solid rgba(32, 227, 255, 0.12)",
                cursor: "pointer",
                fontSize: "18px"
              }}
              aria-label={`${emoji} 반응 추가`}
              title={`${emoji} 반응`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
