import { useState } from "react";
import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

export function ThemeToggleButton() {
  const { theme, setTheme, colors } = useTheme();
  const [strikeId, setStrikeId] = useState(0);
  const nextTheme = theme === "cyan" ? "green" : "cyan";
  const nextThemeLabel = theme === "cyan" ? "Matrix Green" : "Cyan";

  const handleClick = () => {
    setStrikeId((current) => current + 1);
    setTheme(nextTheme);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className="relative isolate grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-xl border-0"
      style={{
        background: `${colors.primary}, 0.10)`,
        border: `1px solid ${colors.primary}, 0.22)`,
        color: colors.primaryHex,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: `inset 0 0 18px ${colors.primary}, 0.18), inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
      whileTap={{ scale: 0.9 }}
      title={`${nextThemeLabel} 테마로 전환`}
      aria-label={`${nextThemeLabel} 테마로 전환`}
    >
      <AnimatePresence>
        {strikeId > 0 && (
          <>
            <motion.span
              key={`ring-${strikeId}`}
              className="pointer-events-none absolute inset-[3px] rounded-[10px]"
              style={{
                border: `1px solid ${colors.primary}, 0.42)`,
                boxShadow: `inset 0 0 18px ${colors.primary}, 0.28)`,
              }}
              initial={{ opacity: 0, scale: 0.62 }}
              animate={{ opacity: [0, 1, 0], scale: [0.62, 1, 1.22] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
            />
            <motion.span
              key={`strike-${strikeId}`}
              className="pointer-events-none absolute inset-0 z-20"
              initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
              animate={{
                opacity: [0, 1, 1, 0],
                clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)"],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, times: [0, 0.36, 0.72, 1], ease: "easeOut" }}
            >
              <svg className="h-full w-full" viewBox="0 0 40 40" aria-hidden="true">
                <defs>
                  <filter id={`theme-strike-glow-${strikeId}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor="#FFFFFF" floodOpacity="0.95" />
                    <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor={colors.primaryHex} floodOpacity="0.80" />
                  </filter>
                </defs>
                <motion.path
                  d="M22 1 L15 17 H20 L16 39 L27 14 H22 Z"
                  fill={colors.primaryHex}
                  stroke="#FFFFFF"
                  strokeWidth="1.15"
                  filter={`url(#theme-strike-glow-${strikeId})`}
                  initial={{ scaleY: 0.08, opacity: 0, transformOrigin: "20px 0px" }}
                  animate={{ scaleY: [0.08, 1, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, times: [0, 0.46, 1], ease: "easeOut" }}
                />
                <motion.path
                  d="M21 5 L18 17 H21 L19 29 L24 15 H21 Z"
                  fill="#FFFFFF"
                  initial={{ scaleY: 0.08, opacity: 0, transformOrigin: "20px 0px" }}
                  animate={{ scaleY: [0.08, 1, 1], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.46, times: [0, 0.42, 1], ease: "easeOut" }}
                />
              </svg>
            </motion.span>
            <motion.span
              key={`impact-${strikeId}`}
              className="pointer-events-none absolute bottom-1 left-1/2 z-20 h-[3px] w-7 -translate-x-1/2 rounded-full"
              style={{ background: colors.primaryHex, boxShadow: `0 0 12px ${colors.primary}, 0.75)` }}
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1, 0.55] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, delay: 0.18, ease: "easeOut" }}
            />
            <motion.span
              key={`flash-${strikeId}`}
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent, ${colors.primary}, 0.18), transparent)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.95, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.span
        key={`icon-${strikeId}`}
        className="relative z-10 grid place-items-center"
        initial={false}
        animate={{
          opacity: strikeId ? [1, 0, 0, 1] : 1,
          scale: strikeId ? [1, 0.72, 0.72, 1.08, 1] : 1,
        }}
        transition={{ duration: 0.58, times: strikeId ? [0, 0.08, 0.68, 0.86, 1] : undefined, ease: "easeOut" }}
      >
        <Zap size={20} strokeWidth={2.2} fill={colors.primaryHex} color={colors.primaryHex} />
      </motion.span>
    </motion.button>
  );
}
