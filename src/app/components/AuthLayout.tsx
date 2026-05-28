import { Link, Outlet } from "react-router";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useTheme } from "../contexts/ThemeContext";

export function AuthLayout() {
  const { colors } = useTheme();

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        color: "var(--white)",
        background: `
          radial-gradient(circle at 18% 16%, ${colors.gradient1}, transparent 28%),
          radial-gradient(circle at 86% 18%, ${colors.gradient2}, transparent 30%),
          radial-gradient(circle at 48% 92%, ${colors.gradient3}, transparent 36%),
          linear-gradient(145deg, #02040A 0%, #050B14 54%, #07182A 100%)
        `,
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px)
          `,
          backgroundSize: "46px 46px",
          maskImage: "radial-gradient(circle at center, black 0%, transparent 78%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-[min(1180px,calc(100vw-32px))] items-center justify-between py-5">
        <Link
          to="/"
          className="codedock-brand-link flex items-center gap-3 no-underline"
          style={{
            color: "var(--white)",
            fontSize: "24px",
            fontWeight: 950,
            letterSpacing: "-0.07em",
          }}
          aria-label="랜딩으로 돌아가기"
        >
          <CoffeeLogo
            className="codedock-header-logo h-14 w-14 flex-shrink-0"
          />
          <CodeDockWordmark accentColor={colors.primaryHex} />
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <LanguageToggleButton />
        </div>
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
