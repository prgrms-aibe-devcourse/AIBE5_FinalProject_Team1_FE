interface TypingIndicatorProps {
  label: string;
  note?: string;
  avatar?: string;
  compact?: boolean;
}

export function TypingIndicator({ label, note, avatar = "AI", compact = false }: TypingIndicatorProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        width: compact ? "fit-content" : "100%",
        maxWidth: compact ? "360px" : "520px",
        background: "rgba(32, 227, 255, 0.07)",
        border: "1px solid rgba(32, 227, 255, 0.16)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.20)"
      }}
      aria-live="polite"
    >
      <style>
        {`
          @keyframes codedockTypingDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
            40% { transform: translateY(-4px); opacity: 1; }
          }

          @keyframes codedockTypingPulse {
            0%, 100% { box-shadow: 0 0 0 rgba(32, 227, 255, 0); }
            50% { box-shadow: 0 0 18px rgba(32, 227, 255, 0.28); }
          }
        `}
      </style>
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(135deg, rgba(32, 227, 255, 0.95), rgba(19, 166, 151, 0.95))",
          animation: "codedockTypingPulse 1.8s ease-in-out infinite"
        }}
      >
        <span
          className="tracking-tight"
          style={{
            color: "#021014",
            fontSize: "10px",
            fontWeight: 950
          }}
        >
          {avatar}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="truncate tracking-tight"
            style={{
              color: "var(--white)",
              fontSize: compact ? "12px" : "13px",
              fontWeight: 900
            }}
          >
            {label}
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--neon-cyan)",
                  animation: "codedockTypingDot 1.1s ease-in-out infinite",
                  animationDelay: `${dot * 0.15}s`
                }}
              />
            ))}
          </span>
        </div>
        {note && (
          <p
            className="m-0 mt-1 tracking-tight"
            style={{
              color: "var(--muted)",
              fontSize: "11px",
              fontWeight: 700
            }}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
