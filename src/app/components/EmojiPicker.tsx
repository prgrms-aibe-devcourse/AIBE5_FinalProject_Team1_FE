// BE ALLOWED_REACTION_KEYS와 1:1 대응하는 키→이모지 맵
export const REACTION_KEY_TO_EMOJI: Record<string, string> = {
  like:      "👍",
  dislike:   "👎",
  heart:     "❤️",
  laugh:     "😂",
  smile:     "😄",
  surprised: "😮",
  sad:       "😢",
  cry:       "😭",
  angry:     "😡",
  thinking:  "🤔",
  clap:      "👏",
  pray:      "🙏",
  eyes:      "👀",
  fire:      "🔥",
  rocket:    "🚀",
  party:     "🎉",
  check:     "✅",
  cross:     "❌",
  star:      "⭐",
  bulb:      "💡",
  bug:       "🐛",
  fix:       "🔧",
  memo:      "📝",
  coffee:    "☕",
};

// EmojiPicker는 reaction key를 전송 → BE가 그대로 저장/반환
const emojiGroups: { label: string; keys: string[] }[] = [
  {
    label: "반응",
    keys: ["like", "clap", "pray", "fire", "check", "party", "star", "heart"]
  },
  {
    label: "대화",
    keys: ["smile", "laugh", "thinking", "surprised", "sad", "cry", "angry", "eyes"]
  },
  {
    label: "작업",
    keys: ["rocket", "fix", "bulb", "memo", "bug", "coffee", "dislike", "cross"]
  }
];

interface EmojiPickerProps {
  onSelect: (reactionKey: string) => void;
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
              {group.keys.map((key) => {
                const emoji = REACTION_KEY_TO_EMOJI[key] ?? key;
                return (
                  <button
                    key={`${group.label}-${key}`}
                    type="button"
                    onClick={() => onSelect(key)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border-0 transition-all"
                    style={{
                      background: "rgba(var(--codedock-primary-rgb), 0.08)",
                      border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                      cursor: "pointer",
                      fontSize: "18px"
                    }}
                    aria-label={`${emoji} 이모티콘 입력`}
                    title={`${key} 입력`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
