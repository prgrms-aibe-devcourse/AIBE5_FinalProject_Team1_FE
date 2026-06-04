import { Github, Heart, Mail } from "lucide-react";
import { Link } from "react-router";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const footerLinks = [
  { ko: "대시보드", en: "Dashboard", path: "/workspace" },
  { ko: "프로필", en: "Profile", path: "/profile" },
  { ko: "계정 설정", en: "Account Settings", path: "/settings" },
  { ko: "워크스페이스 설정", en: "Workspace Settings", path: "/workspace-settings" },
];

const socialLinks = [
  { icon: Github, href: "https://github.com/prgrms-aibe-devcourse/AIBE5_FinalProject_Team1_FE", label: "GitHub" },
  { icon: Mail, href: "mailto:contact@codedock.dev", label: "Email" }
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isKorean = language === "ko";
  const tone = (alpha: number) => `${colors.primary}, ${alpha})`;
  const copy = {
    description: isKorean
      ? "PR 리뷰, 보안 점검, 문서화를 한 흐름으로 연결하는 AI 개발 워크스페이스입니다."
      : "An AI development workflow platform for reviews, docs, and team collaboration.",
    madeBy: "CodeDock Team",
    rights: isKorean ? "모든 권리 보유." : "All rights reserved.",
    madeWith: "Made with"
  };

  return (
    <footer
      className="relative mt-12"
      style={{
        background: `
          radial-gradient(circle at 18% 40%, ${tone(0.07)}, transparent 34%),
          radial-gradient(circle at 84% 54%, ${tone(0.05)}, transparent 36%),
          rgba(5, 11, 20, 0.94)
        `,
        borderTop: `1px solid ${tone(0.14)}`
      }}
    >
      <div className="relative mx-auto w-[min(1180px,calc(100vw-32px))] px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="flex items-center gap-3 no-underline tracking-[-0.07em]"
              style={{ fontWeight: 950, fontSize: "22px", color: "var(--white)" }}
            >
              <CoffeeLogo
                className="h-10 w-10 flex-shrink-0"
                style={{ filter: `drop-shadow(0 0 14px ${tone(0.3)})` }}
              />
              <CodeDockWordmark accentColor={colors.primaryHex} />
            </Link>
            <p
              className="m-0 hidden leading-[1.55] tracking-tight md:block"
              style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", maxWidth: "340px" }}
            >
              {copy.description}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-4">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="no-underline tracking-tight transition-colors hover:text-white"
                  style={{ fontSize: "13px", fontWeight: 750, color: "var(--muted)", whiteSpace: "nowrap" }}
                >
                  {isKorean ? link.ko : link.en}
                </Link>
              ))}
            </nav>
            <div className="flex gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label === "Email" && isKorean ? "이메일" : social.label}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110"
                    style={{ background: tone(0.08), border: `1px solid ${tone(0.22)}`, color: colors.primaryHex }}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: `1px solid ${tone(0.14)}` }}>
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <p className="m-0 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: "var(--muted)" }}>
              © {currentYear} CodeDock. {copy.rights}
            </p>
            <p
              className="m-0 flex items-center gap-2 tracking-tight"
              style={{
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 700,
                color: "var(--muted)"
              }}
            >
              {copy.madeWith} <Heart size={14} strokeWidth={2} style={{ color: "#FF6B6B" }} fill="#FF6B6B" /> {copy.madeBy}
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          backgroundImage: `linear-gradient(90deg, ${colors.primaryHex}, ${colors.secondary}, ${colors.primaryHex})`,
          backgroundSize: "200% 100%",
          animation: "gradientShift 3s ease infinite"
        }}
      />

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </footer>
  );
}
