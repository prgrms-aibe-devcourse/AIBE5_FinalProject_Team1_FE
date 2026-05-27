import { Github, Heart, Linkedin, Mail, Twitter } from "lucide-react";
import { Link } from "react-router";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const footerLinks = {
  product: [
    { ko: "기능", en: "Features", path: "/#features" },
    { ko: "대시보드", en: "Dashboard", path: "/workspace" },
    { ko: "PR 리뷰", en: "PR Review", path: "/prs" },
    { ko: "API 명세", en: "API Spec", path: "/api-spec" },
    { ko: "ERD", en: "ERD", path: "/erd" },
    { ko: "문서", en: "Docs", path: "/docs" }
  ],
  company: [
    { ko: "소개", en: "About", path: "/about" },
    { ko: "소식", en: "Blog", path: "/blog" },
    { ko: "채용", en: "Careers", path: "/careers" },
    { ko: "문의", en: "Contact", path: "/contact" }
  ],
  resources: [
    { ko: "문서", en: "Documentation", path: "/docs" },
    { ko: "API 참조", en: "API Reference", path: "/api-spec" },
    { ko: "튜토리얼", en: "Tutorials", path: "/tutorials" },
    { ko: "커뮤니티", en: "Community", path: "/community" }
  ],
  legal: [
    { ko: "개인정보", en: "Privacy", path: "/privacy" },
    { ko: "이용약관", en: "Terms", path: "/terms" },
    { ko: "보안", en: "Security", path: "/security" },
    { ko: "쿠키", en: "Cookies", path: "/cookies" }
  ]
};

const socialLinks = [
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Mail, href: "mailto:contact@coffeeting.dev", label: "Email" }
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isKorean = language === "ko";
  const copy = {
    product: isKorean ? "제품" : "Product",
    company: isKorean ? "회사" : "Company",
    resources: isKorean ? "자료" : "Resources",
    legal: isKorean ? "정책" : "Legal",
    description: isKorean
      ? "AI 기반 개발 협업 플랫폼. 코딩은 개발자가, 리뷰와 문서는 AI가 돕습니다."
      : "An AI development workflow platform for reviews, docs, and team collaboration.",
    madeBy: isKorean ? "DevFlow Team 제작" : "by DevFlow Team",
    rights: isKorean ? "모든 권리 보유." : "All rights reserved.",
    madeWith: isKorean ? "제작" : "Made with"
  };

  const renderLinks = (links: typeof footerLinks.product) => (
    <ul className="m-0 grid list-none gap-3 p-0">
      {links.map((link) => (
        <li key={link.path}>
          <Link
            to={link.path}
            className="no-underline tracking-tight transition-colors"
            style={{
              fontSize: "14px",
              fontWeight: 700,
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
      className="relative mt-20"
      style={{
        background: `
          radial-gradient(circle at 20% 50%, ${colors.primary}, 0.08), transparent 40%),
          radial-gradient(circle at 80% 50%, ${colors.primary}, 0.06), transparent 40%),
          rgba(5, 11, 20, 0.95)
        `,
        borderTop: `1px solid ${colors.primary}, 0.15)`
      }}
    >
      <div className="relative mx-auto w-[min(1400px,calc(100vw-36px))] px-6 py-16">
        <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="mb-6 flex items-center gap-3 no-underline tracking-[-0.07em]"
              style={{
                fontWeight: 950,
                fontSize: "30px",
                color: "var(--white)"
              }}
            >
              <CoffeeLogo
                className="h-16 w-16 flex-shrink-0"
                style={{ filter: `drop-shadow(0 0 14px ${colors.primary}, 0.3))` }}
              />
              <CodeDockWordmark accentColor={colors.primaryHex} />
            </Link>
            <p className="m-0 mb-6 leading-[1.7] tracking-tight" style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--muted)",
              maxWidth: "320px"
            }}>
              {copy.description}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label === "Email" && isKorean ? "이메일" : social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:scale-110"
                    style={{
                      background: `${colors.primary}, 0.08)`,
                      border: `1px solid ${colors.primary}, 0.22)`,
                      color: colors.primaryHex
                    }}
                  >
                    <Icon size={20} strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="m-0 mb-4 tracking-tight" style={{ fontSize: "14px", fontWeight: 950, color: "var(--white)" }}>
              {copy.product}
            </h3>
            {renderLinks(footerLinks.product)}
          </div>

          <div>
            <h3 className="m-0 mb-4 tracking-tight" style={{ fontSize: "14px", fontWeight: 950, color: "var(--white)" }}>
              {copy.company}
            </h3>
            {renderLinks(footerLinks.company)}
          </div>

          <div>
            <h3 className="m-0 mb-4 tracking-tight" style={{ fontSize: "14px", fontWeight: 950, color: "var(--white)" }}>
              {copy.resources}
            </h3>
            {renderLinks(footerLinks.resources)}
          </div>

          <div>
            <h3 className="m-0 mb-4 tracking-tight" style={{ fontSize: "14px", fontWeight: 950, color: "var(--white)" }}>
              {copy.legal}
            </h3>
            {renderLinks(footerLinks.legal)}
          </div>
        </div>

        <div className="pt-8" style={{ borderTop: `1px solid ${colors.primary}, 0.15)` }}>
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="m-0 tracking-tight" style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)" }}>
              © {currentYear} CodeDock. {copy.rights}
            </p>
            <p className="m-0 flex items-center gap-2 tracking-tight" style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--muted)"
            }}>
              {copy.madeWith} <Heart size={16} strokeWidth={2} style={{ color: "#FF6B6B" }} fill="#FF6B6B" /> {copy.madeBy}
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
