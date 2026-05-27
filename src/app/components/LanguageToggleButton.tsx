import { Languages } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export function LanguageToggleButton() {
  const { language, toggleLanguage } = useLanguage();
  const { colors } = useTheme();
  const nextLanguage = language === "ko" ? "English" : "Korean";
  const label = language === "ko" ? "KO" : "EN";

  return (
    <motion.button
      type="button"
      onClick={toggleLanguage}
      className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border-0 px-3 tracking-tight"
      style={{
        background: `${colors.primary}, 0.10)`,
        border: `1px solid ${colors.primary}, 0.22)`,
        color: colors.primaryHex,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
      whileHover={{
        scale: 1.05,
        boxShadow: `inset 0 0 18px ${colors.primary}, 0.18), inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
      whileTap={{ scale: 0.94 }}
      title={`Switch to ${nextLanguage}`}
      aria-label={`Switch to ${nextLanguage}`}
    >
      <Languages size={18} strokeWidth={2.4} />
      <span className="text-xs font-black">{label}</span>
    </motion.button>
  );
}
