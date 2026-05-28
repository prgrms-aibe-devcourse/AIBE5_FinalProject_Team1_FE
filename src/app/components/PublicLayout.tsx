import { Link, Outlet } from "react-router";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { Footer } from "./Footer";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export function PublicLayout() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const copy = {
    login: language === "ko" ? "로그인" : "Login",
    signup: language === "ko" ? "회원가입" : "Sign Up",
  };

  return (
    <div
      className="min-h-screen"
      style={{
        overflowX: "clip",
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

      <header
        className="fixed left-0 right-0 top-0 z-50 px-3 py-3 sm:px-4 sm:py-4"
        style={{
          background: "rgba(5, 11, 20, 0.70)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${colors.primary}, 0.12)`,
          boxShadow: "0 18px 46px rgba(0, 0, 0, 0.24)",
        }}
      >
        <div className="mx-auto flex w-[min(1180px,100%)] items-center justify-between gap-3">
          <Link
            to="/"
            className="codedock-brand-link flex min-w-0 items-center gap-2 no-underline sm:gap-3"
            style={{
              color: "var(--white)",
              fontSize: "26px",
              fontWeight: 950,
              letterSpacing: "-0.07em",
            }}
            aria-label="CodeDock 랜딩"
          >
            <CoffeeLogo
              className="codedock-header-logo h-12 w-12 flex-shrink-0 sm:h-16 sm:w-16"
            />
            <CodeDockWordmark accentColor={colors.primaryHex} className="hidden sm:inline-flex" />
          </Link>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggleButton />

            <Link
              to="/login"
              className="rounded-xl px-3 py-2 no-underline tracking-tight transition-all sm:px-4"
              style={{
                border: `1px solid ${colors.primary}, 0.22)`,
                color: "rgba(234, 247, 255, 0.76)",
                fontSize: "14px",
                fontWeight: 850,
              }}
            >
              {copy.login}
            </Link>
            <Link
              to="/signup"
              className="hidden rounded-xl px-4 py-2 no-underline tracking-tight transition-all sm:block"
              style={{
                background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                boxShadow: `0 0 24px ${colors.primary}, 0.24)`,
                color: "#021014",
                fontSize: "14px",
                fontWeight: 950,
              }}
            >
              {copy.signup}
            </Link>
            <LanguageToggleButton />
          </div>
        </div>
      </header>

      <main className="relative pt-24">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
