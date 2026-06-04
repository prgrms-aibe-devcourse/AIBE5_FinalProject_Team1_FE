import { useStickyTypingLabel } from "./useStickyTypingLabel";

interface TypingIndicatorBarProps {
  /** 표시할 라벨. 비어 있으면 슬롯 높이는 유지되고 내용만 사라진다(fade). */
  label: string;
}

/**
 * 입력창 위에 뜨는 "입력 중" 인디케이터 바.
 * - 고정 높이 슬롯을 항상 차지해 레이아웃이 흔들리지 않는다(공간 미리 확보).
 * - 라벨은 useStickyTypingLabel로 디바운스되어 깜빡이지 않는다.
 * - 활성 상태에서 점 3개가 통통 튀는 애니메이션을 보여준다.
 */
export function TypingIndicatorBar({ label }: TypingIndicatorBarProps) {
  const displayed = useStickyTypingLabel(label);
  const active = displayed.length > 0;

  return (
    <div className="mb-2 flex h-7 items-center" aria-live="polite">
      <span
        className={`codedock-typing-indicator-badge inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 tracking-tight transition-all duration-200 ${active ? "is-active" : ""}`}
        style={{
          background: "rgba(5, 11, 20, 0.78)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
          color: "var(--neon-cyan)",
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 900,
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0) scale(1)" : "translateY(2px) scale(0.98)"
        }}
      >
        <span className="truncate">{displayed}</span>
        <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="codedock-typing-indicator-dot block h-1 w-1 rounded-full"
              style={{
                background: "var(--neon-cyan)",
                animationDelay: `${dot * 0.15}s`
              }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}
