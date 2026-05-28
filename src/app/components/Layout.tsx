import { Link, Outlet, useLocation } from "react-router";
import { Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CodeDockWordmark } from "./CodeDockWordmark";
import { CoffeeLogo } from "./CoffeeLogo";
import { Footer } from "./Footer";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useTheme } from "../contexts/ThemeContext";

const navItems = [
  { path: "/workspace", label: "Dashboard" },
  { path: "/prs", label: "PRs" },
  { path: "/issues", label: "Issues" },
  { path: "/chat", label: "Workspace" },
];

const currentUser = {
  name: "김준우",
  email: "junwoo@codedock.dev",
  workspace: "DevFlow Team",
};

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remoteNav, setRemoteNav] = useState(false);
  const { colors } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setRemoteNav(window.scrollY > 72 && window.matchMedia("(min-width: 1024px)").matches);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

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

      <header
        className="fixed left-0 right-0 top-0 z-50 px-4 py-4 transition-all duration-300"
        style={{
          background: remoteNav ? "transparent" : "rgba(5, 11, 20, 0.85)",
          backdropFilter: remoteNav ? "none" : "blur(20px)",
          borderBottom: remoteNav ? "1px solid transparent" : `1px solid ${colors.primary}, 0.15)`,
        }}
      >
        <div className="relative mx-auto flex w-[min(1400px,100%)] items-center justify-between gap-4">
          <Link
            to="/"
            className="codedock-brand-link flex items-center gap-3 no-underline transition-all duration-300"
            style={{
              color: "var(--white)",
              fontSize: "26px",
              fontWeight: 950,
              letterSpacing: "-0.07em",
              opacity: remoteNav ? 0 : 1,
              pointerEvents: remoteNav ? "none" : "auto",
              transform: remoteNav ? "translateY(-8px) scale(0.96)" : "translateY(0) scale(1)",
            }}
            aria-label="CodeDock 랜딩으로 이동"
          >
            <CoffeeLogo
              className="codedock-header-logo h-16 w-16 flex-shrink-0"
            />
            <CodeDockWordmark accentColor={colors.primaryHex} />
          </Link>

          <nav
            className={
              remoteNav
                ? "fixed left-1/2 top-4 hidden max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full px-3 py-2 transition-all duration-300 lg:flex"
                : "absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 transition-all duration-300 lg:flex"
            }
            style={
              remoteNav
                ? {
                    background: `
                      linear-gradient(135deg, ${colors.primary}, 0.13), rgba(234, 247, 255, 0.045)),
                      rgba(5, 11, 20, 0.72)
                    `,
                    border: `1px solid ${colors.primary}, 0.24)`,
                    boxShadow: `
                      0 18px 55px rgba(0, 0, 0, 0.42),
                      0 0 38px ${colors.primary}, 0.12),
                      inset 0 1px 0 rgba(255, 255, 255, 0.13)
                    `,
                    backdropFilter: "blur(22px) saturate(190%)",
                    WebkitBackdropFilter: "blur(22px) saturate(190%)",
                  }
                : undefined
            }
          >
            {navItems.map((item) => (
              <HeaderLink key={item.path} item={item} active={isActive(item.path)} />
            ))}
          </nav>

          <div
            className="flex items-center gap-3 transition-all duration-300"
            style={{
              opacity: remoteNav ? 0 : 1,
              pointerEvents: remoteNav ? "none" : "auto",
              transform: remoteNav ? "translateY(-8px) scale(0.96)" : "translateY(0) scale(1)",
            }}
          >
            <ThemeToggleButton />

            <Link
              to="/profile"
              className="hidden h-12 items-center gap-3 rounded-2xl px-3 no-underline transition-all hover:scale-[1.02] xl:flex"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, 0.12), rgba(234, 247, 255, 0.045))`,
                border: `1px solid ${colors.primary}, 0.22)`,
                color: "var(--white)",
                boxShadow: `0 0 24px ${colors.primary}, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.10)`,
                backdropFilter: "blur(16px) saturate(180%)",
              }}
              aria-label="계정 정보 보기"
              title={`${currentUser.name} - ${currentUser.email}`}
            >
              <AccountAvatar />
              <span className="grid min-w-0 leading-none">
                <span className="max-w-[112px] truncate text-sm font-black tracking-tight">{currentUser.name}</span>
                <span
                  className="mt-1 max-w-[112px] truncate text-[11px] font-bold tracking-tight"
                  style={{ color: "rgba(234, 247, 255, 0.62)" }}
                >
                  {currentUser.workspace}
                </span>
              </span>
            </Link>

            <Link
              to="/profile"
              className="grid h-10 w-10 place-items-center rounded-xl no-underline transition-all hover:scale-110 xl:hidden"
              style={{
                background: `${colors.primary}, 0.10)`,
                border: `1px solid ${colors.primary}, 0.22)`,
                color: colors.primaryHex,
              }}
              aria-label="계정 정보 보기"
              title={`${currentUser.name} - ${currentUser.email}`}
            >
              <UserRound size={19} strokeWidth={2.4} />
            </Link>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center border-0 bg-transparent cursor-pointer lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              style={{ color: colors.primaryHex }}
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            >
              {mobileMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
            </button>

            <LanguageToggleButton />
          </div>
        </div>

        <div
          className="fixed right-4 top-4 hidden items-center gap-2 transition-all duration-300 lg:flex"
          style={{
            opacity: remoteNav ? 1 : 0,
            pointerEvents: remoteNav ? "auto" : "none",
            transform: remoteNav ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)",
          }}
        >
          <Link
            to="/profile"
            className="hidden h-12 items-center gap-2 rounded-full px-3 no-underline lg:flex"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, 0.12), rgba(234, 247, 255, 0.045))`,
              border: `1px solid ${colors.primary}, 0.22)`,
              color: "var(--white)",
              boxShadow: `0 18px 55px rgba(0, 0, 0, 0.38), 0 0 24px ${colors.primary}, 0.10)`,
              backdropFilter: "blur(22px) saturate(190%)",
              WebkitBackdropFilter: "blur(22px) saturate(190%)",
            }}
            aria-label="계정 정보 보기"
            tabIndex={remoteNav ? 0 : -1}
            title={`${currentUser.name} - ${currentUser.email}`}
          >
            <AccountAvatar />
            <span className="max-w-[92px] truncate text-sm font-black tracking-tight">{currentUser.name}</span>
          </Link>
          <LanguageToggleButton />
        </div>

        {mobileMenuOpen && (
          <nav className="mt-4 flex flex-col gap-2 lg:hidden">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 no-underline"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, 0.12), rgba(234, 247, 255, 0.045))`,
                border: `1px solid ${colors.primary}, 0.22)`,
                color: "var(--white)",
              }}
            >
              <AccountAvatar />
              <span className="grid min-w-0 leading-none">
                <span className="truncate text-sm font-black tracking-tight">{currentUser.name}</span>
                <span className="mt-1 truncate text-xs font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                  {currentUser.email}
                </span>
              </span>
            </Link>
            {navItems.map((item) => (
              <HeaderLink
                key={item.path}
                item={item}
                active={isActive(item.path)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </nav>
        )}
      </header>

      <main className="relative pt-24">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function AccountAvatar() {
  const { colors } = useTheme();

  return (
    <span
      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-sm font-black tracking-tight"
      style={{
        background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
        color: "#021014",
        boxShadow: `0 0 18px ${colors.primary}, 0.24)`,
      }}
    >
      김
    </span>
  );
}

interface HeaderLinkProps {
  item: {
    path: string;
    label: string;
  };
  active: boolean;
  onClick?: () => void;
}

function HeaderLink({ item, active, onClick }: HeaderLinkProps) {
  const { colors } = useTheme();

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className="relative rounded-full px-4 py-2 no-underline tracking-tight transition-colors"
      style={{
        background: "transparent",
        border: "none",
        color: active ? "var(--white)" : "rgba(234, 247, 255, 0.62)",
        fontSize: "14px",
        fontWeight: 800,
      }}
    >
      {active && (
        <motion.div
          layoutId={onClick ? "activeMobileTab" : "activeTab"}
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              linear-gradient(135deg, ${colors.primary}, 0.16), rgba(234, 247, 255, 0.045)),
              rgba(11, 22, 40, 0.42)
            `,
            border: `1px solid ${colors.primary}, 0.22)`,
            boxShadow: `
              0 0 22px ${colors.primary}, 0.10),
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 0 18px rgba(255, 255, 255, 0.035)
            `,
            backdropFilter: "blur(14px) saturate(180%)",
            WebkitBackdropFilter: "blur(14px) saturate(180%)",
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}
