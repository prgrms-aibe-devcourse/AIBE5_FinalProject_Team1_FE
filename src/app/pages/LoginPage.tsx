import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  Eye,
  EyeOff,
  FileText,
  Github,
  GitPullRequest,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CodeDockWordmark } from "../components/CodeDockWordmark";
import { CoffeeLogo } from "../components/CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { setAuthenticated } from "../auth";

const loginDemoMessagesKo = [
  { speaker: "CodeDock", text: "위험 파일 3개를 먼저 묶었어요.", tone: "var(--soft-mint)" },
  { speaker: "팀 채팅", text: "리뷰 기준 문서에 반영할게요.", tone: "#CFF8FF" },
];

const loginWelcomeMessagesKo = [
  "오늘의 PR 산책은 제가 먼저 다녀왔어요.\n위험한 변경은 줄 세워두고, 문서는 따뜻하게 데워둘게요.",
  "코드 바다에 오신 걸 환영합니다.\n리뷰 파도는 CodeDock이 잔잔하게 만들어둘게요.",
  "커피는 없지만 컨텍스트는 준비됐어요.\nPR, 문서, 팀 대화까지 제가 한 화면에 착 붙여둘게요.",
  "버그는 숨바꼭질을 좋아하죠.\n오늘은 CodeDock이 술래가 되어 먼저 찾아볼게요.",
  "리뷰 대기열이 길어도 괜찮아요.\n제가 중요한 파일부터 콕 집어서 길을 열어둘게요.",
];

const loginWelcomeMessagesEn = [
  "I already took today's PRs for a walk.\nI'll line up the risky changes and keep the docs warm.",
  "Welcome aboard the code harbor.\nCodeDock will keep the review waves pleasantly calm.",
  "No coffee here, but the context is ready.\nI'll keep PRs, docs, and team chat neatly docked.",
  "Bugs love hide-and-seek.\nToday, CodeDock will count first and find them faster.",
  "A long review queue is fine.\nI'll point out the important files and clear the runway.",
];

const toneAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const loginTabDemosKo = [
  {
    icon: Sparkles,
    name: "대시보드",
    title: "오늘의 리뷰 상황",
    summary: "대기 PR 15개 중 위험 신호 3건을 먼저 정리합니다.",
    metrics: ["대기 15", "위험 3", "완료 8"],
    tone: "var(--neon-cyan)",
  },
  {
    icon: GitPullRequest,
    name: "PR 리뷰",
    title: "PR #42 인증 변경",
    summary: "변경 파일, 댓글, 체크리스트를 한 화면에서 봅니다.",
    metrics: ["파일 7", "댓글 12", "위험 3"],
    tone: "var(--soft-mint)",
  },
  {
    icon: FileText,
    name: "API 명세",
    title: "인증 API 문서화",
    summary: "응답 코드와 요청 예시를 리뷰 흐름 안에서 갱신합니다.",
    metrics: ["PATCH", "401", "DTO"],
    tone: "#FFD166",
  },
  {
    icon: Network,
    name: "ERD",
    title: "권한 테이블 관계",
    summary: "users, roles, workspace_members 관계를 바로 확인합니다.",
    metrics: ["users", "roles", "members"],
    tone: "#CFF8FF",
  },
  {
    icon: MessageSquare,
    name: "팀 채팅",
    title: "결정 사항 공유",
    summary: "AI 요약과 리뷰 결론을 팀 대화에 같이 남깁니다.",
    metrics: ["요약", "알림", "결정"],
    tone: "#FFB4B4",
  },
];

export function LoginPage() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [isLoginButtonHovering, setIsLoginButtonHovering] = useState(false);
  const [isGithubLoginHovering, setIsGithubLoginHovering] = useState(false);
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [welcomeMessageIndex] = useState(() => Math.floor(Math.random() * loginWelcomeMessagesKo.length));
  const trimmedEmail = email.trim();
  const emailAtIndex = trimmedEmail.indexOf("@");
  const shouldRevealPassword = emailAtIndex > 0 && trimmedEmail.slice(emailAtIndex + 1).trim().length > 0;
  const hasPassword = password.trim().length > 0;
  const shouldShowWelcome = shouldRevealPassword && hasPassword;
  const isEnglish = language === "en";
  const loginDemoMessages = isEnglish
    ? [
        { speaker: "CodeDock", text: "I grouped the 3 risky files first.", tone: "var(--soft-mint)" },
        { speaker: "Team Chat", text: "I'll reflect the review rule in the docs.", tone: "#CFF8FF" },
      ]
    : loginDemoMessagesKo;
  const loginTabDemos = isEnglish
    ? [
        {
          icon: Sparkles,
          name: "Dashboard",
          title: "Today's Review Status",
          summary: "CodeDock prioritizes 3 risk signals from 15 waiting PRs.",
          metrics: ["Waiting 15", "Risks 3", "Done 8"],
          tone: "var(--neon-cyan)",
        },
        {
          icon: GitPullRequest,
          name: "PR Review",
          title: "PR #42 Auth Changes",
          summary: "Changed files, comments, and checklists stay in one review screen.",
          metrics: ["Files 7", "Comments 12", "Risks 3"],
          tone: "var(--soft-mint)",
        },
        {
          icon: FileText,
          name: "API Spec",
          title: "Auth API Docs",
          summary: "Response codes and request examples update inside the review flow.",
          metrics: ["PATCH", "401", "DTO"],
          tone: "#FFD166",
        },
        {
          icon: Network,
          name: "ERD",
          title: "Permission Table Relations",
          summary: "Check users, roles, and workspace_members relationships at a glance.",
          metrics: ["users", "roles", "members"],
          tone: "#CFF8FF",
        },
        {
          icon: MessageSquare,
          name: "Team Chat",
          title: "Share Decisions",
          summary: "AI summaries and review outcomes stay with the team discussion.",
          metrics: ["Summary", "Mention", "Decision"],
          tone: "#FFB4B4",
        },
      ]
    : loginTabDemosKo;
  const loginWelcomeMessage = isEnglish ? loginWelcomeMessagesEn[welcomeMessageIndex] : loginWelcomeMessagesKo[welcomeMessageIndex];
  const loginCopy = {
    access: isEnglish ? "CodeDock Access" : "CodeDock 접속",
    login: isEnglish ? "Login" : "로그인",
    accountTitle: isEnglish ? "Access your account" : "계정에 접속하기",
    emailPrompt: isEnglish ? "Which email do you sign in with?" : "로그인할 이메일을 알려주세요.",
    emailLabel: isEnglish ? "Email" : "이메일",
    emailPlaceholder: "name@company.com",
    passwordPrompt: isEnglish ? "Got it! Now enter your password." : "이메일 확인했어요! 비밀번호를 입력해주세요.",
    passwordLabel: isEnglish ? "Password" : "비밀번호",
    passwordPlaceholder: isEnglish ? "Enter password" : "비밀번호 입력",
    remember: isEnglish ? "Keep me signed in" : "로그인 상태 유지",
    forgot: isEnglish ? "Forgot password" : "비밀번호 찾기",
    submit: isEnglish ? "Login" : "로그인",
    divider: isEnglish ? "or" : "또는",
    github: isEnglish ? "Continue with GitHub" : "GitHub로 계속하기",
    signupPrefix: isEnglish ? "No account yet?" : "아직 계정이 없나요?",
    signup: isEnglish ? "Sign up" : "회원가입",
    showPassword: isEnglish ? "Show password" : "비밀번호 보기",
    hidePassword: isEnglish ? "Hide password" : "비밀번호 숨기기",
    miniBrand: "CodeDock",
    liveWorkspace: isEnglish ? "LIVE WORKSPACE" : "실시간 작업 공간",
    welcomeTitle: "Hello CodeDock!",
    welcomeBody: loginWelcomeMessage,
  };
  const activeDemo = loginTabDemos[activeDemoIndex];
  const demoCount = loginTabDemos.length;

  useEffect(() => {
    const demoTimer = window.setTimeout(() => {
      setActiveDemoIndex((index) => (index + 1) % demoCount);
    }, 2600);

    return () => window.clearTimeout(demoTimer);
  }, [demoCount, activeDemoIndex]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthenticated();
    navigate("/workspace");
  };

  const handleGithubLogin = () => {
    setAuthenticated();
    navigate("/workspace");
  };

  return (
    <section className="w-[min(1360px,calc(100vw-32px))] mx-auto py-10 md:py-14 pb-20">
      <div
        className="relative grid gap-8 lg:grid-cols-2 items-stretch overflow-hidden rounded-[34px] p-4 md:p-6"
        style={{
          background: "rgba(11, 22, 40, 0.78)",
          border: `1px solid ${colors.primary}, 0.22)`,
          boxShadow: `
            0 30px 90px rgba(0, 0, 0, 0.42),
            0 0 72px ${colors.primary}, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.10)
          `,
          backdropFilter: "blur(22px) saturate(180%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-36 -bottom-44 h-[360px] w-[360px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--codedock-secondary-rgb),0.14), transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0, minHeight: shouldShowWelcome ? 480 : 420 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative flex self-start flex-col justify-between overflow-hidden rounded-[28px] p-6 md:p-8"
          style={{
            background: `
              radial-gradient(circle at 48% 25%, ${colors.primary}, 0.16), transparent 38%),
              radial-gradient(circle at 50% 72%, rgba(var(--codedock-secondary-rgb),0.12), transparent 34%),
              linear-gradient(145deg, rgba(16,31,52,0.95), rgba(5,11,20,0.88))
            `,
            border: `1px solid ${colors.primary}, 0.20)`,
            boxShadow: "inset 0 0 32px rgba(var(--codedock-primary-rgb), 0.08), 0 18px 48px rgba(0, 0, 0, 0.32)",
          }}
        >
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2"
              style={{
                background: `${colors.primary}, 0.09)`,
                border: `1px solid ${colors.primary}, 0.22)`,
                color: colors.primaryHex,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: "var(--matrix-green)",
                  boxShadow: "0 0 0 5px rgba(var(--codedock-secondary-rgb),0.13), 0 0 16px rgba(var(--codedock-secondary-rgb),0.7)",
                }}
              />
              <span className="text-sm font-black tracking-tight">{loginCopy.access}</span>
            </div>

            <AnimatePresence initial={false}>
              {shouldShowWelcome && (
                <motion.div
                  key="login-welcome-copy"
                  className="mt-7 max-w-[560px]"
                  initial={{ opacity: 0, y: -10, height: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, height: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.42, ease: "easeOut" }}
                >
                  <LoginWelcomeCopy title={loginCopy.welcomeTitle} body={loginCopy.welcomeBody} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            key="login-workspace-preview"
            className="mt-8 overflow-hidden rounded-[26px] p-4"
            initial={{ opacity: 0, y: 18, height: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
            transition={{ duration: 0.44, ease: "easeOut" }}
            style={{
              background: "rgba(5, 11, 20, 0.58)",
              border: `1px solid ${colors.primary}, 0.18)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22)",
              backdropFilter: "blur(18px) saturate(170%)",
            }}
          >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF8FA3]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFD166]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--matrix-green)]" />
                  </div>
                  <div
                    className="rounded-full px-3 py-1.5 text-sm font-black tracking-tight"
                    style={{
                      background: "rgba(var(--codedock-secondary-rgb),0.10)",
                      border: "1px solid rgba(var(--codedock-secondary-rgb),0.22)",
                      color: "var(--soft-mint)",
                    }}
                  >
                    {loginCopy.liveWorkspace}
                  </div>
                </div>

                <div
                  className="mt-4 overflow-hidden rounded-[22px] p-4"
                  data-mini-workspace-preview
                  style={{
                    background: "rgba(3, 8, 16, 0.72)",
                    border: `1px solid ${colors.primary}, 0.16)`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="mb-3 flex min-h-[58px] items-center justify-between gap-3 rounded-2xl px-3 py-3"
                    style={{
                      background: "rgba(234, 247, 255, 0.045)",
                      border: `1px solid ${colors.primary}, 0.10)`,
                    }}
                  >
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <CoffeeLogo
                        className="h-7 w-7 flex-shrink-0"
                        style={{ filter: `drop-shadow(0 0 8px ${colors.primary}, 0.22))` }}
                      />
                      <CodeDockWordmark accentColor={colors.primaryHex} className="text-sm" />
                    </div>
                    <div className="hidden min-w-0 flex-1 flex-nowrap items-center justify-end gap-0.5 sm:flex">
                      {loginTabDemos.map((demo, index) => (
                        <span
                          key={demo.name}
                          className="inline-flex min-h-8 flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-1 text-sm font-black leading-[1.5] tracking-tight transition-all duration-300"
                          style={{
                            background: activeDemoIndex === index
                              ? `linear-gradient(135deg, ${toneAlpha(demo.tone, 18)}, rgba(234,247,255,0.06)), rgba(5, 11, 20, 0.42)`
                              : "transparent",
                            border: activeDemoIndex === index ? `1px solid ${toneAlpha(demo.tone, 34)}` : "1px solid transparent",
                            boxShadow: activeDemoIndex === index
                              ? `0 0 18px ${toneAlpha(demo.tone, 13)}, inset 0 1px 0 rgba(255,255,255,0.16)`
                              : "none",
                            backdropFilter: activeDemoIndex === index ? "blur(14px) saturate(180%)" : "none",
                            color: activeDemoIndex === index ? demo.tone : "rgba(234,247,255,0.42)",
                          }}
                        >
                          {demo.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid min-h-[330px] grid-cols-[58px_minmax(0,1fr)] gap-3">
                    <aside
                      className="grid content-start gap-2 rounded-2xl p-2"
                      style={{
                        background: "rgba(234, 247, 255, 0.045)",
                        border: `1px solid ${colors.primary}, 0.10)`,
                      }}
                    >
                      {loginTabDemos.map((demo, index) => (
                        <button
                          key={demo.name}
                          type="button"
                          aria-label={`${demo.name} 데모 보기`}
                          onClick={() => setActiveDemoIndex(index)}
                          className="grid h-11 w-11 place-items-center rounded-xl border-0 transition hover:scale-105"
                          style={{
                            background: activeDemoIndex === index ? toneAlpha(demo.tone, 14) : "rgba(5, 11, 20, 0.35)",
                            color: activeDemoIndex === index ? demo.tone : "rgba(234,247,255,0.48)",
                          }}
                        >
                          <demo.icon size={18} strokeWidth={2.5} />
                        </button>
                      ))}
                    </aside>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeDemo.name}
                        className="relative overflow-hidden rounded-2xl p-4"
                        style={{
                          background: `linear-gradient(135deg, ${toneAlpha(activeDemo.tone, 8)}, rgba(234, 247, 255, 0.04))`,
                          border: `1px solid ${toneAlpha(activeDemo.tone, 22)}`,
                          minHeight: "320px",
                        }}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.32, ease: "easeOut" }}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="m-0 text-sm font-black leading-[1.5] tracking-tight" style={{ color: activeDemo.tone }}>
                              {activeDemo.name}
                            </p>
                            <h3 className="m-0 mt-1 text-base font-black leading-[1.45] tracking-tight" style={{ color: "var(--white)" }}>
                              {activeDemo.title}
                            </h3>
                          </div>
                          <span
                            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl"
                            style={{
                              background: toneAlpha(activeDemo.tone, 12),
                              border: `1px solid ${toneAlpha(activeDemo.tone, 27)}`,
                            }}
                          >
                            <activeDemo.icon size={20} strokeWidth={2.5} style={{ color: activeDemo.tone }} />
                          </span>
                        </div>

                        {activeDemoIndex === 0 && (
                          <div className="grid gap-3">
                            <div className="grid grid-cols-3 gap-2">
                              {activeDemo.metrics.map((metric) => (
                                <div
                                  key={metric}
                                  className="rounded-xl px-2 py-3 text-center text-sm font-black tracking-tight"
                                  style={{
                                    background: "rgba(5, 11, 20, 0.44)",
                                    border: `1px solid ${toneAlpha(activeDemo.tone, 18)}`,
                                    color: "#DFFAFF",
                                  }}
                                >
                                  {metric}
                                </div>
                              ))}
                            </div>
                            <div className="grid gap-2">
                              {(isEnglish
                                ? ["PR #42 Auth changes", "Issue #18 Rate limit", "Docs Auth API"]
                                : ["PR #42 인증 변경", "이슈 #18 요청 제한", "문서 인증 API"]
                              ).map((item, index) => (
                                <div
                                  key={item}
                                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-black tracking-tight"
                                  style={{
                                    background: "rgba(234, 247, 255, 0.055)",
                                    border: `1px solid ${colors.primary}, 0.10)`,
                                    color: "#DFFAFF",
                                  }}
                                >
                                  <span>{item}</span>
                                  <span style={{ color: index === 0 ? "#FFB4B4" : activeDemo.tone }}>
                                    {index === 0 ? (isEnglish ? "Risk" : "위험") : (isEnglish ? "OK" : "정상")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeDemoIndex === 1 && (
                          <div className="grid gap-3">
                            {["auth/middleware.ts", "routes/session.ts", "docs/security.md"].map((file, index) => (
                              <div
                                key={file}
                                className="rounded-xl px-3 py-2"
                                style={{
                                  background: "rgba(5, 11, 20, 0.42)",
                                  border: `1px solid ${index === 0 ? "#FF8FA355" : toneAlpha(activeDemo.tone, 18)}`,
                                }}
                              >
                                <div className="flex items-center justify-between gap-2 text-sm font-black tracking-tight">
                                  <span style={{ color: "#DFFAFF" }}>{file}</span>
                                  <span style={{ color: index === 0 ? "#FF8FA3" : activeDemo.tone }}>
                                    {index === 0 ? (isEnglish ? "review" : "검토") : (isEnglish ? "ok" : "정상")}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-1">
                                  <span className="h-1.5 rounded-full" style={{ width: "86%", background: toneAlpha(activeDemo.tone, 33) }} />
                                  <span className="h-1.5 rounded-full" style={{ width: index === 0 ? "54%" : "68%", background: "rgba(234,247,255,0.16)" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeDemoIndex === 2 && (
                          <div className="grid gap-3">
                            {["PATCH /api/users/:id", "POST /api/auth/login", "GET /api/workspaces"].map((endpoint, index) => (
                              <div
                                key={endpoint}
                                className="rounded-xl px-3 py-2"
                                style={{
                                  background: "rgba(5, 11, 20, 0.42)",
                                  border: `1px solid ${toneAlpha(activeDemo.tone, 20)}`,
                                }}
                              >
                                <p className="m-0 text-sm font-black tracking-tight" style={{ color: activeDemo.tone }}>
                                  {endpoint}
                                </p>
                                <p className="m-0 mt-1 text-sm font-bold tracking-tight" style={{ color: "rgba(234,247,255,0.62)" }}>
                                  {isEnglish ? "response" : "응답"} {index === 1 ? "200 / 401" : "200 / 404"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeDemoIndex === 3 && (
                          <div className="relative" style={{ height: "170px" }}>
                            <svg
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <line x1="15" y1="40" x2="71" y2="40" stroke={toneAlpha(activeDemo.tone, 53)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                              <line x1="15" y1="40" x2="46" y2="70" stroke={toneAlpha(activeDemo.tone, 40)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                              <line x1="71" y1="40" x2="46" y2="70" stroke={toneAlpha(activeDemo.tone, 40)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                            </svg>
                            {[
                              { label: "users", left: "6%", top: "28%" },
                              { label: "roles", left: "63%", top: "28%" },
                              { label: "members", left: "35%", top: "58%" },
                            ].map((node) => (
                              <div
                                key={node.label}
                                className="absolute rounded-2xl px-4 py-3 text-sm font-black tracking-tight"
                                style={{
                                  left: node.left,
                                  top: node.top,
                                  background: "rgb(5, 11, 20)",
                                  border: `1px solid ${toneAlpha(activeDemo.tone, 33)}`,
                                  color: "#DFFAFF",
                                  boxShadow: `0 0 18px ${toneAlpha(activeDemo.tone, 9)}`,
                                }}
                              >
                                {node.label}
                              </div>
                            ))}
                          </div>
                        )}

                        {activeDemoIndex === 4 && (
                          <div className="grid gap-2.5">
                            {[
                              ...loginDemoMessages,
                              {
                                speaker: "CodeDock",
                                text: isEnglish
                                  ? "I linked the PR #42 checklist to the docs."
                                  : "PR #42 체크리스트를 문서에 연결했어요.",
                                tone: activeDemo.tone,
                              },
                            ].map((item, index) => (
                              <div
                                key={item.text}
                                className={`rounded-2xl px-4 py-3 text-sm font-bold leading-[1.6] tracking-tight ${index === 1 ? "ml-8" : "mr-5"}`}
                                style={{
                                  background: index === 1 ? "rgba(234, 247, 255, 0.06)" : toneAlpha(item.tone, 9),
                                  border: `1px solid ${toneAlpha(item.tone, 20)}`,
                                  color: "#DFFAFF",
                                }}
                              >
                                <span className="mb-0.5 block text-sm font-black leading-[1.5]" style={{ color: item.tone }}>
                                  {item.speaker}
                                </span>
                                <span className="block whitespace-normal break-keep leading-[1.6]">{item.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative rounded-[28px] px-5 py-7 md:px-8 md:py-9"
          style={{
            background: "rgba(5, 11, 20, 0.58)",
            border: `1px solid ${colors.primary}, 0.16)`,
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.18, ease: "easeOut" }}
          >
            <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
              {loginCopy.login}
            </p>
            <h2
              className="m-0 mt-1 leading-tight tracking-tight"
              style={{ color: "var(--white)", fontSize: "30px", fontWeight: 950 }}
            >
              {loginCopy.accountTitle}
            </h2>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <div className="grid gap-3">
              <LoginChatPrompt text={loginCopy.emailPrompt} delay={0.36} />

              <motion.label
                className="block"
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.42, delay: 0.56, ease: "easeOut" }}
              >
                <span className="sr-only">{loginCopy.emailLabel}</span>
                <span
                  className="relative block"
                  style={{
                    color: "var(--white)",
                  }}
                >
                  <Mail
                    size={20}
                    strokeWidth={2.2}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--muted)" }}
                  />
                  <input
                    type="email"
                    aria-label={loginCopy.emailLabel}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={loginCopy.emailPlaceholder}
                    autoComplete="email"
                    required
                    className="codedock-auth-input h-14 w-full rounded-full pl-12 pr-4 tracking-tight outline-none transition"
                    style={{
                      background: "rgba(234, 247, 255, 0.055)",
                      border: `1px solid ${colors.primary}, 0.14)`,
                      color: "var(--white)",
                      caretColor: colors.primaryHex,
                      colorScheme: "dark",
                      fontSize: "15px",
                      fontWeight: 800,
                    }}
                  />
                </span>
              </motion.label>

              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.72, ease: "easeOut" }}
              >
                <Link
                  to="/forgot-password"
                  className="text-sm font-black tracking-tight no-underline transition-opacity hover:opacity-80"
                  style={{ color: colors.primaryHex }}
                >
                  {loginCopy.forgot}
                </Link>
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {shouldRevealPassword && (
                <motion.div
                  key="password-step"
                  className="grid gap-3"
                  initial={{ opacity: 0, y: 14, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <LoginChatPrompt text={loginCopy.passwordPrompt} delay={0.08} typingDelay={520} />

                  <motion.span
                    className="relative block"
                    initial={{ opacity: 0, y: 14, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.34, delay: 0.18, ease: "easeOut" }}
                  >
                    <span className="sr-only">{loginCopy.passwordLabel}</span>
                    <span
                      className="relative block"
                      style={{
                        color: "var(--white)",
                      }}
                    >
                      <Lock
                        size={20}
                        strokeWidth={2.2}
                        className="absolute left-4 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--muted)" }}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        aria-label={loginCopy.passwordLabel}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={loginCopy.passwordPlaceholder}
                        autoComplete="current-password"
                        required
                        className="codedock-auth-input h-14 w-full rounded-full pl-12 pr-12 tracking-tight outline-none transition"
                        style={{
                          background: "rgba(234, 247, 255, 0.055)",
                          border: `1px solid ${colors.primary}, 0.14)`,
                          color: "var(--white)",
                          caretColor: colors.primaryHex,
                          colorScheme: "dark",
                          fontSize: "15px",
                          fontWeight: 800,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? loginCopy.hidePassword : loginCopy.showPassword}
                        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl border-0 bg-transparent"
                        style={{ color: "var(--muted)" }}
                      >
                        {showPassword ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
                      </button>
                    </span>
                  </motion.span>

                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {shouldRevealPassword && hasPassword && (
                <motion.div
                  key="login-actions"
                  className="grid gap-5"
                  initial={{ opacity: 0, y: 16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4"
                        style={{ accentColor: colors.primaryHex }}
                      />
                      <span className="text-sm font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                        {loginCopy.remember}
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    onMouseEnter={() => setIsLoginButtonHovering(true)}
                    onMouseLeave={() => setIsLoginButtonHovering(false)}
                    onFocus={() => setIsLoginButtonHovering(true)}
                    onBlur={() => setIsLoginButtonHovering(false)}
                    className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 px-6 tracking-tight transition hover:scale-[1.01]"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                      boxShadow: `0 0 28px ${colors.primary}, 0.22)`,
                      color: "#021014",
                      fontSize: "16px",
                      fontWeight: 950,
                    }}
                  >
                    <LoginSubmitLabel isHovering={isLoginButtonHovering} defaultLabel={loginCopy.submit} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.78, ease: "easeOut" }}
          >
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: `${colors.primary}, 0.14)` }} />
              <span className="text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: "var(--muted)" }}>
                {loginCopy.divider}
              </span>
              <div className="h-px flex-1" style={{ background: `${colors.primary}, 0.14)` }} />
            </div>

            <button
              type="button"
              onClick={handleGithubLogin}
              onMouseEnter={() => setIsGithubLoginHovering(true)}
              onMouseLeave={() => setIsGithubLoginHovering(false)}
              onFocus={() => setIsGithubLoginHovering(true)}
              onBlur={() => setIsGithubLoginHovering(false)}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-6 tracking-tight transition hover:scale-[1.01]"
              style={{
                background: isGithubLoginHovering ? "rgba(234, 247, 255, 0.085)" : "rgba(234, 247, 255, 0.055)",
                border: `1px solid ${colors.primary}, ${isGithubLoginHovering ? "0.36" : "0.22"})`,
                boxShadow: isGithubLoginHovering ? `0 0 24px ${colors.primary}, 0.16)` : "0 0 0 rgba(0, 0, 0, 0)",
                color: "var(--white)",
                fontSize: "15px",
                fontWeight: 900,
              }}
            >
              <motion.span
                className="grid place-items-center"
                animate={
                  isGithubLoginHovering
                    ? { rotate: [0, -8, 7, 0], y: [0, -2, 0], scale: [1, 1.08, 1] }
                    : { rotate: 0, y: 0, scale: 1 }
                }
                transition={{ duration: 0.42, ease: "easeOut" }}
              >
                <Github size={20} strokeWidth={2.2} />
              </motion.span>
              {loginCopy.github}
            </button>

            {message && (
              <p
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold leading-6 tracking-tight"
                style={{
                  background: "rgba(var(--codedock-secondary-rgb), 0.08)",
                  border: "1px solid rgba(var(--codedock-secondary-rgb), 0.22)",
                  color: "var(--soft-mint)",
                }}
              >
                {message}
              </p>
            )}

            <p className="m-0 mt-6 text-center text-sm font-bold tracking-tight" style={{ color: "var(--muted)" }}>
              {loginCopy.signupPrefix}{" "}
              <Link to="/signup" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                {loginCopy.signup}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

interface LoginChatPromptProps {
  text: string;
  delay?: number;
  typingDelay?: number;
}

function LoginWelcomeCopy({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  const [visibleTitleCount, setVisibleTitleCount] = useState(0);
  const titleCharacters = Array.from(title);
  const visibleTitle = titleCharacters.slice(0, visibleTitleCount).join("");
  const bodyLines = body.split("\n");

  useEffect(() => {
    setVisibleTitleCount(0);
  }, [title]);

  useEffect(() => {
    if (visibleTitleCount >= titleCharacters.length) {
      return;
    }

    const titleTimer = window.setTimeout(() => {
      setVisibleTitleCount((count) => Math.min(titleCharacters.length, count + 1));
    }, visibleTitleCount === 0 ? 130 : 34);

    return () => window.clearTimeout(titleTimer);
  }, [titleCharacters.length, visibleTitleCount]);

  const isTitleComplete = visibleTitleCount >= titleCharacters.length;

  return (
    <>
      <h2
        className="m-0 inline-flex min-h-[1.08em] items-center leading-tight tracking-tight"
        style={{
          color: "var(--white)",
          fontSize: "clamp(30px, 4.4vw, 54px)",
          fontWeight: 950,
          textShadow: `0 0 22px ${colors.primary}, 0.18)`,
        }}
      >
        <span>{visibleTitle}</span>
        <motion.span
          className="ml-2 inline-block h-[0.86em] w-[0.08em] rounded-full"
          style={{ background: colors.primaryHex, boxShadow: `0 0 14px ${colors.primary}, 0.46)` }}
          animate={{ opacity: [0.24, 1, 0.24] }}
          transition={{ duration: 0.68, repeat: Infinity, ease: "easeInOut" }}
        />
      </h2>

      <div className="mt-4 grid max-w-[500px] gap-1.5">
        <AnimatePresence>
          {isTitleComplete &&
            bodyLines.map((line, index) => (
              <motion.p
                key={`${line}-${index}`}
                className="m-0 text-sm font-bold leading-6 tracking-tight"
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.34, delay: index * 0.11, ease: "easeOut" }}
                style={{ color: "rgba(234, 247, 255, 0.70)" }}
              >
                {line}
              </motion.p>
            ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function LoginSubmitLabel({ isHovering, defaultLabel }: { isHovering: boolean; defaultLabel: string }) {
  // Do not localize: brand/developer easter-egg hover microcopy must stay in English.
  const targetText = "Hello CodeDock!";
  const [visibleCount, setVisibleCount] = useState(0);
  const visibleText = targetText.slice(0, visibleCount);

  useEffect(() => {
    if (!isHovering) {
      setVisibleCount(0);
      return;
    }

    setVisibleCount(0);
  }, [isHovering]);

  useEffect(() => {
    if (!isHovering || visibleCount >= targetText.length) {
      return;
    }

    const typingTimer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(targetText.length, count + 1));
    }, visibleCount === 0 ? 120 : 38);

    return () => window.clearTimeout(typingTimer);
  }, [isHovering, targetText.length, visibleCount]);

  return (
    <span className="inline-flex min-w-[150px] items-center justify-center text-center">
      <AnimatePresence mode="wait" initial={false}>
        {isHovering ? (
          <motion.span
            key="login-code-typing"
            className="inline-flex items-center justify-center font-black"
            initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
          >
            <span>{visibleText}</span>
            <motion.span
              className="ml-1 inline-block h-5 w-1 rounded-full"
              style={{ background: "#021014" }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.62, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>
        ) : (
          <motion.span
            key="login-default-label"
            className="inline-block"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {defaultLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function LoginChatPrompt({ text, delay = 0, typingDelay = 620 }: LoginChatPromptProps) {
  const { colors } = useTheme();
  const [isTyping, setIsTyping] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const characters = Array.from(text);
  const visibleText = characters.slice(0, visibleCount).join("");

  useEffect(() => {
    setIsTyping(true);
    setVisibleCount(0);

    const typingTimer = window.setTimeout(() => {
      setIsTyping(false);
    }, typingDelay);

    return () => window.clearTimeout(typingTimer);
  }, [text, typingDelay]);

  useEffect(() => {
    if (isTyping || visibleCount >= characters.length) {
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(characters.length, count + 1));
    }, 28);

    return () => window.clearTimeout(revealTimer);
  }, [characters.length, isTyping, visibleCount]);

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -18, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay, ease: "easeOut" }}
    >
      <CoffeeLogo
        className="mt-1 h-10 w-10 flex-shrink-0"
        style={{ filter: `drop-shadow(0 0 12px ${colors.primary}, 0.20))` }}
      />
      <div
        className="relative min-h-[48px] rounded-[22px] rounded-bl-md px-4 py-3 text-sm font-black leading-6 tracking-tight"
        style={{
          background: `${colors.primary}, 0.12)`,
          border: `1px solid ${colors.primary}, 0.22)`,
          color: "#DFFAFF",
          minWidth: isTyping ? "92px" : "min(100%, 240px)",
        }}
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          {isTyping ? (
            <motion.span
              key="typing-dots"
              className="flex h-6 items-center gap-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              aria-label="CodeDock 입력 중"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="block h-2 w-2 rounded-full"
                  style={{ background: colors.primaryHex }}
                  animate={{ y: [0, -5, 0], opacity: [0.38, 1, 0.38] }}
                  transition={{
                    duration: 0.72,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.12,
                  }}
                />
              ))}
            </motion.span>
          ) : (
            <motion.span
              key="typed-text"
              className="inline-block min-h-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {visibleText}
              {visibleCount < characters.length && (
                <motion.span
                  className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 rounded-full"
                  style={{ background: colors.primaryHex }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
