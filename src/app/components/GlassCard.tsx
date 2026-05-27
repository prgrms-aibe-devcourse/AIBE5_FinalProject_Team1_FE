import { ReactNode, CSSProperties } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  intensity?: 'light' | 'medium' | 'strong';
}

export function GlassCard({ children, className = "", style = {}, intensity = 'medium' }: GlassCardProps) {
  const { colors } = useTheme();

  const intensityStyles = {
    light: {
      background: 'rgba(11, 22, 40, 0.65)',
      backdropFilter: 'blur(12px) saturate(180%)',
      border: `1px solid ${colors.primary}, 0.12)`,
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.06)
      `
    },
    medium: {
      background: 'rgba(11, 22, 40, 0.75)',
      backdropFilter: 'blur(16px) saturate(180%)',
      border: `1px solid ${colors.primary}, 0.18)`,
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset
      `
    },
    strong: {
      background: 'rgba(11, 22, 40, 0.85)',
      backdropFilter: 'blur(24px) saturate(200%)',
      border: `1px solid ${colors.primary}, 0.24)`,
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset,
        0 0 60px ${colors.primary}, 0.08)
      `
    }
  };

  return (
    <div
      className={className}
      style={{
        ...intensityStyles[intensity],
        ...style
      }}
    >
      {children}
    </div>
  );
}
