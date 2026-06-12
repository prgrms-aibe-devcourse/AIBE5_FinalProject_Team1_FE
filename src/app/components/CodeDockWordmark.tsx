import type { CSSProperties } from "react";

interface CodeDockWordmarkProps {
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function CodeDockWordmark({
  accentColor = "var(--neon-cyan)",
  className = "",
  style,
}: CodeDockWordmarkProps) {
  const wordmarkStyle = {
    "--codedock-wordmark-accent": accentColor,
    ...style,
  } as CSSProperties;

  return (
    <span className={`codedock-wordmark ${className}`.trim()} style={wordmarkStyle} aria-label="CodeDock">
      <span aria-hidden="true" className="codedock-wordmark__code">Code</span>
      <span aria-hidden="true" className="codedock-wordmark__dock">
        <span className="codedock-wordmark__dock-capital">D</span>
        <span>ock</span>
      </span>
    </span>
  );
}
