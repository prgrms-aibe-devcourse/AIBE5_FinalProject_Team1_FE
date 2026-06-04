const emojiGroups = [
  {
    label: "반응",
    emojis: ["👍", "👏", "🙌", "🔥", "✨", "🎉", "✅", "💯"]
  },
  {
    label: "대화",
    emojis: ["😀", "🙂", "😊", "😂", "🤔", "😎", "🙏", "👀"]
  },
  {
    label: "작업",
    emojis: ["🚀", "🛠️", "🔍", "📌", "📝", "⚠️", "🐛", "💡"]
  }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "rgba(5, 11, 20, 0.82)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.24)"
      }}
    >
      <div className="grid gap-3">
        {emojiGroups.map((group) => (
          <div key={group.label}>
            <p
              className="m-0 mb-2 tracking-tight"
              style={{
                color: "var(--muted)",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 900
              }}
            >
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {group.emojis.map((emoji) => (
                <button
                  key={`${group.label}-${emoji}`}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-0 transition-all"
                  style={{
                    background: "rgba(var(--codedock-primary-rgb), 0.08)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                    cursor: "pointer",
                    fontSize: "18px"
                  }}
                  aria-label={`${emoji} 이모티콘 입력`}
                  title={`${emoji} 입력`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
