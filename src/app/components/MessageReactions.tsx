import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

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
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      setPickerPos(null);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Prefer above the button; fall back to below if too close to the top of the viewport
      const spaceAbove = rect.top - 116;
      const top = spaceAbove >= 8 ? spaceAbove : rect.bottom + 8;
      setPickerPos({ top, left: rect.left });
    }

    // Lock the nearest scrollable ancestor so the chat doesn't scroll while picker is open
    let scrollParent: HTMLElement | null = null;
    let el: HTMLElement | null = buttonRef.current?.parentElement ?? null;
    while (el) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollParent = el;
        break;
      }
      el = el.parentElement;
    }
    const prevOverflow = scrollParent?.style.overflowY ?? "";
    if (scrollParent) scrollParent.style.overflowY = "hidden";

    const handleOutside = (e: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      if (scrollParent) scrollParent.style.overflowY = prevOverflow;
    };
  }, [pickerOpen]);

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
        ref={buttonRef}
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        className="flex h-7 w-7 items-center justify-center rounded-full border-0 transition-all"
        style={{
          background: pickerOpen ? "rgba(32, 227, 255, 0.16)" : "rgba(5, 11, 20, 0.42)",
          border: pickerOpen ? "1px solid rgba(32, 227, 255, 0.34)" : "1px solid rgba(32, 227, 255, 0.14)",
          color: pickerOpen ? "var(--neon-cyan)" : "var(--muted)",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => { if (!pickerOpen) { (e.currentTarget as HTMLElement).style.color = 'var(--neon-cyan)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(32, 227, 255, 0.34)'; } }}
        onMouseLeave={(e) => { if (!pickerOpen) { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(32, 227, 255, 0.14)'; } }}
        aria-label="이모티콘 반응 추가"
        title="반응 추가"
      >
        <SmilePlus size={14} />
      </button>

      {pickerOpen && pickerPos && createPortal(
        <div
          ref={pickerRef}
          style={{
            position: "fixed",
            top: pickerPos.top,
            left: pickerPos.left,
            zIndex: 9999,
          }}
        >
          <EmojiPicker onSelect={handleSelect} />
        </div>,
        document.body
      )}
    </div>
  );
}
