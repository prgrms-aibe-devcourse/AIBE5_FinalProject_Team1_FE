import { Github, Heart, Mail } from "lucide-react";
import { Link } from "react-router";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const footerLinks = {
  navigation: [
    { ko: "팀 대시보드", en: "Team Dashboard", path: "/workspace" },
    { ko: "협업 워크스페이스", en: "Collaboration Workspace", path: "/chat" },
    { ko: "API 명세", en: "API Spec", path: "/api-spec" },
    { ko: "ERD", en: "ERD", path: "/erd" },
    { ko: "문서", en: "Docs", path: "/docs" }
  ],
  account: [
    { ko: "프로필", en: "Profile", path: "/profile" },
    { ko: "설정", en: "Settings", path: "/settings" }
  ]
};

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
    navigation: isKorean ? "메뉴" : "Menu",
    account: isKorean ? "계정" : "Account",
    description: isKorean
      ? "PR 리뷰, 보안 점검, 문서화를 한 흐름으로 연결하는 AI 개발 워크스페이스입니다."
      : "An AI development workflow platform for reviews, docs, and team collaboration.",
    madeBy: "CodeDock Team",
    rights: isKorean ? "모든 권리 보유." : "All rights reserved.",
    madeWith: "Made with"
  };

  const renderLinks = (links: typeof footerLinks.navigation) => (
    <ul className="m-0 grid list-none gap-2 p-0">
      {links.map((link) => (
        <li key={link.path}>
          <Link
            to={link.path}
            className="no-underline tracking-tight transition-colors hover:text-white"
            style={{
              fontSize: "13px",
              fontWeight: 750,
              color: "var(--muted)"
            }}
          >
            {isKorean ? link.ko : link.en}
          </Link>
        </li>
      ))}
    </ul>
  );

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
      <div className="relative mx-auto w-[min(1180px,calc(100vw-32px))] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-7 grid gap-7 md:grid-cols-[minmax(0,1.5fr)_minmax(150px,0.5fr)_minmax(130px,0.45fr)]">
          <div>
            <Link
              to="/"
              className="mb-3 flex items-center gap-3 no-underline tracking-[-0.07em]"
              style={{
                fontWeight: 950,
                fontSize: "24px",
                color: "var(--white)"
              }}
            >
              <CoffeeLogo
                className="h-12 w-12 flex-shrink-0"
                style={{ filter: `drop-shadow(0 0 14px ${tone(0.3)})` }}
              />
              <CodeDockWordmark accentColor={colors.primaryHex} />
            </Link>
            <p
              className="m-0 mb-4 leading-[1.55] tracking-tight"
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--muted)",
                maxWidth: "420px"
              }}
            >
              {copy.description}
            </p>
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
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-110"
                    style={{
                      background: tone(0.08),
                      border: `1px solid ${tone(0.22)}`,
                      color: colors.primaryHex
                    }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="m-0 mb-3 tracking-tight" style={{ fontSize: "13px", fontWeight: 950, color: "var(--white)" }}>
              {copy.navigation}
            </h3>
            {renderLinks(footerLinks.navigation)}
          </div>

          <div>
            <h3 className="m-0 mb-3 tracking-tight" style={{ fontSize: "13px", fontWeight: 950, color: "var(--white)" }}>
              {copy.account}
            </h3>
            {renderLinks(footerLinks.account)}
          </div>
        </div>

        <div className="pt-5" style={{ borderTop: `1px solid ${tone(0.14)}` }}>
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <p className="m-0 tracking-tight" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
              © {currentYear} CodeDock. {copy.rights}
            </p>
            <p
              className="m-0 flex items-center gap-2 tracking-tight"
              style={{
                fontSize: "12px",
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
