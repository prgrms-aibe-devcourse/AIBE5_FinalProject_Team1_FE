import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type ElementType,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Github,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CoffeeLogo } from "../components/CoffeeLogo";
import { useTheme } from "../contexts/ThemeContext";

const strengthLabels = ["매우 약함", "약함", "보통", "좋음", "안전함"];
type SignupMascotMood = "idle" | "focus" | "cta" | "risk" | "success";
type GithubConnectStatus = "idle" | "connecting" | "authorizing" | "syncing" | "connected";
type SignupStep = "account" | "connect";

const githubConnectSteps: Array<{ status: Exclude<GithubConnectStatus, "idle">; label: string; detail: string }> = [
  { status: "connecting", label: "GitHub 로그인 확인", detail: "계정 인증 창을 준비합니다." },
  { status: "authorizing", label: "저장소 권한 요청", detail: "PR, 이슈, 코드 리뷰 접근 권한을 확인합니다." },
  { status: "syncing", label: "워크스페이스 동기화", detail: "팀 저장소와 리뷰 흐름을 CodeDock에 연결합니다." },
  { status: "connected", label: "연동 완료", detail: "가입 후 바로 PR 리뷰를 시작할 수 있습니다." },
];

const toneAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function SignupPage() {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSignupButtonHovering, setIsSignupButtonHovering] = useState(false);
  const [isGithubSignupHovering, setIsGithubSignupHovering] = useState(false);
  const [isNameComposing, setIsNameComposing] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("account");
  const [signupFinalStage, setSignupFinalStage] = useState(0);
  const [githubConnectStatus, setGithubConnectStatus] = useState<GithubConnectStatus>("idle");
  const [message, setMessage] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = formData.name.trim();
  const trimmedEmail = formData.email.trim();
  const hasName = trimmedName.length > 0;
  const hasEmail = trimmedEmail.length > 0;
  const hasPassword = formData.password.length > 0;
  const hasConfirmPassword = formData.confirmPassword.length > 0;
  const isNameLongEnough = trimmedName.length >= 2;
  const isNameCharactersValid = !hasName || /^[A-Za-z가-힣\s]+$/.test(trimmedName);
  const isNameValid = isNameLongEnough && isNameCharactersValid;
  const isNameReady = isNameValid && !isNameComposing;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPasswordValid = formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password);
  const passwordsMatch = hasConfirmPassword && formData.password === formData.confirmPassword;
  const isConfirmPasswordReadyToCompare = hasConfirmPassword && isPasswordValid && formData.confirmPassword.length >= formData.password.length;
  const shouldShowPasswordMismatch = isConfirmPasswordReadyToCompare && !passwordsMatch;
  const showEmailStep = isNameReady;
  const showPasswordStep = isNameReady && isEmailValid;
  const showConfirmStep = showPasswordStep && isPasswordValid;
  const showFinalStep = showConfirmStep && passwordsMatch;
  const isConnectStep = signupStep === "connect" && showFinalStep;
  const isAccountStep = !isConnectStep;
  const githubConnectStepIndex = githubConnectSteps.findIndex((step) => step.status === githubConnectStatus);
  const isGithubConnecting = githubConnectStatus !== "idle" && githubConnectStatus !== "connected";
  const isGithubConnected = githubConnectStatus === "connected";

  const passwordStrength = useMemo(() => {
    const checks = [
      formData.password.length >= 8,
      /[A-Z]/.test(formData.password),
      /[a-z]/.test(formData.password),
      /\d/.test(formData.password),
      /[^A-Za-z0-9]/.test(formData.password),
    ];
    return checks.filter(Boolean).length;
  }, [formData.password]);

  useEffect(() => {
    if (!showFinalStep) {
      setSignupStep("account");
      setSignupFinalStage(0);
      setGithubConnectStatus("idle");
      return;
    }

    if (!isConnectStep) {
      setSignupFinalStage(0);
      return;
    }

    setSignupFinalStage(0);

    const termsTimer = window.setTimeout(() => {
      setSignupFinalStage(1);
    }, 820);
    const happyTimer = window.setTimeout(() => {
      setSignupFinalStage(2);
    }, 2800);

    return () => {
      window.clearTimeout(termsTimer);
      window.clearTimeout(happyTimer);
    };
  }, [isConnectStep, showFinalStep]);

  useEffect(() => {
    const nextStatus: Record<GithubConnectStatus, GithubConnectStatus | null> = {
      idle: null,
      connecting: "authorizing",
      authorizing: "syncing",
      syncing: "connected",
      connected: null,
    };
    const next = nextStatus[githubConnectStatus];

    if (!next) {
      return;
    }

    const githubTimer = window.setTimeout(() => {
      setGithubConnectStatus(next);
      if (next === "connected") {
        setMessage("GitHub 연동이 완료되었습니다.");
      }
    }, 760);

    return () => window.clearTimeout(githubTimer);
  }, [githubConnectStatus]);

  const assistantFeedback = useMemo(() => {
    if (isConnectStep) {
      if (!agreeTerms) {
        return {
          tone: colors.primaryHex,
          status: "권한 연결",
          title: "계정 정보는 준비됐어요.",
          body: "이제 약관을 확인하고 GitHub 저장소를 연결하면 CodeDock이 PR과 이슈를 함께 정리할 수 있어요.",
          warning: false,
        };
      }

      if (!isGithubConnected) {
        return {
          tone: colors.primaryHex,
          status: isGithubConnecting ? "연동 중" : "GitHub 연결",
          title: isGithubConnecting ? "저장소 권한을 확인하고 있어요." : "GitHub를 연결해볼까요?",
          body: "연동이 끝나면 PR 리뷰와 이슈 흐름을 바로 가져올 수 있어요.",
          warning: false,
        };
      }

      return {
        tone: "var(--matrix-green)",
        status: "가입 준비 완료",
        title: "Happy Hacking!",
        body: "GitHub 연동까지 끝났어요. 이제 회원가입을 완료하면 바로 작업 공간으로 들어갈 수 있어요.",
        warning: false,
      };
    }

    if (isNameComposing) {
      return {
        tone: colors.primaryHex,
        status: "이름 입력 중",
        title: "이름을 확인하고 있어요.",
        body: "한글 조합이 끝나면 다음 단계가 부드럽게 열립니다.",
        warning: false,
      };
    }

    if (hasName && !isNameCharactersValid) {
      return {
        tone: "#FFB4B4",
        status: "확인 필요",
        title: "이름 형식을 확인해주세요.",
        body: "한글 또는 영문만 사용할 수 있어요. 숫자나 특수문자는 빼주세요.",
        warning: true,
      };
    }

    if (hasName && !isNameLongEnough) {
      return {
        tone: colors.primaryHex,
        status: "이름 입력 중",
        title: "성 입력 완료!",
        body: "이름을 한 글자 더 입력하면 이메일 단계가 열립니다.",
        warning: false,
      };
    }

    if (hasEmail && !isEmailValid) {
      return {
        tone: "#FFB4B4",
        status: "확인 필요",
        title: "로그인 이메일 형식이 어색해요.",
        body: "name@company.com처럼 @와 도메인이 모두 들어가야 합니다.",
        warning: true,
      };
    }

    if (hasPassword && !isPasswordValid) {
      return {
        tone: "#FFD166",
        status: "보강 필요",
        title: "비밀번호를 조금 더 안전하게 만들어요.",
        body: "8자 이상, 영문과 숫자를 함께 넣으면 다음 단계로 진행할 수 있어요.",
        warning: true,
      };
    }

    if (shouldShowPasswordMismatch) {
      return {
        tone: "#FFB4B4",
        status: "확인 필요",
        title: "비밀번호 확인이 달라요.",
        body: "방금 입력한 비밀번호와 똑같이 한 번 더 입력해주세요.",
        warning: true,
      };
    }

    if (isNameReady && !hasEmail) {
      return {
        tone: colors.primaryHex,
        status: "이름 입력 완료",
        title: `${trimmedName}님, 반가워요!`,
        body: "이제 로그인에 사용할 이메일을 알려주세요.",
        warning: false,
      };
    }

    if (isEmailValid && !hasPassword) {
      return {
        tone: "var(--matrix-green)",
        status: "이메일 입력 완료",
        title: "이메일 입력 완료!",
        body: "좋아요. 이 주소로 CodeDock 계정을 만들게요. 이제 안전한 비밀번호를 입력해주세요.",
        warning: false,
      };
    }

    if (isPasswordValid && !hasConfirmPassword) {
      return {
        tone: "var(--neon-cyan)",
        status: "비밀번호 입력 완료",
        title: "비밀번호도 안전해요.",
        body: "마지막으로 같은 비밀번호를 한 번 더 입력하면 확인할 수 있어요.",
        warning: false,
      };
    }

    if (isNameReady && isEmailValid && isPasswordValid && passwordsMatch && !agreeTerms) {
      return {
        tone: "var(--neon-cyan)",
        status: "입력 완료",
        title: "Happy Hacking!",
        body: "입력이 모두 끝났어요. GitHub를 연결하면 PR 리뷰를 바로 시작할 수 있어요.",
        warning: false,
      };
    }

    if (isNameReady && isEmailValid && isPasswordValid && passwordsMatch && agreeTerms) {
      return {
        tone: "var(--matrix-green)",
        status: "준비 완료",
        title: "Happy Hacking!",
        body: "가입 준비가 끝났어요. 이제 CodeDock에서 리뷰와 문서를 이어갈 수 있습니다.",
        warning: false,
      };
    }

    return {
      tone: colors.primaryHex,
      status: "CodeDock",
      title: "코드의 항구, CodeDock입니다.",
      body: "함께할 준비가 됐나요? 딱 1분이면 돼요.",
      warning: false,
    };
  }, [
    agreeTerms,
    colors.primaryHex,
    hasConfirmPassword,
    hasEmail,
    hasName,
    hasPassword,
    isEmailValid,
    isNameCharactersValid,
    isNameComposing,
    isNameLongEnough,
    isNameReady,
    isNameValid,
    isConnectStep,
    isGithubConnected,
    isGithubConnecting,
    isPasswordValid,
    passwordsMatch,
    shouldShowPasswordMismatch,
    trimmedName,
  ]);

  const validationItems = isConnectStep
    ? [
        { label: "계정 정보", done: showFinalStep, warning: false },
        { label: "약관 동의", done: agreeTerms, warning: false },
        { label: "GitHub 연동", done: isGithubConnected, warning: false },
        { label: "가입 준비", done: showFinalStep && agreeTerms && isGithubConnected, warning: false },
      ]
    : [
        { label: "이름 형식", done: isNameReady, warning: hasName && !isNameCharactersValid },
        { label: "로그인 이메일", done: isEmailValid, warning: hasEmail && !isEmailValid },
        { label: "비밀번호 형식", done: isPasswordValid, warning: hasPassword && !isPasswordValid },
        { label: "비밀번호 확인", done: passwordsMatch, warning: shouldShowPasswordMismatch },
      ];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setMessage("");
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateAccountStep = () => {
    if (!isNameReady) {
      setMessage("이름은 두 글자 이상, 한글 또는 영문으로 입력해주세요.");
      return false;
    }

    if (!isEmailValid) {
      setMessage("로그인 이메일 형식을 확인해주세요.");
      return false;
    }

    if (!isPasswordValid) {
      setMessage("비밀번호는 8자 이상, 영문과 숫자를 함께 입력해주세요.");
      return false;
    }

    if (!passwordsMatch) {
      setMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return false;
    }

    return true;
  };

  const handleNextSignupStep = () => {
    if (!validateAccountStep()) {
      return;
    }

    setMessage("");
    setSignupStep("connect");
  };

  const focusInputAfterAnimation = (inputRef: RefObject<HTMLInputElement | null>) => {
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 430);
  };

  const shouldMoveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    return event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing;
  };

  const moveFocusOnEnter = (event: KeyboardEvent<HTMLInputElement>, canMove: boolean, nextInputRef: RefObject<HTMLInputElement | null>) => {
    if (!shouldMoveOnEnter(event)) {
      return;
    }

    event.preventDefault();

    if (canMove) {
      focusInputAfterAnimation(nextInputRef);
    }
  };

  const moveToConnectStepOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldMoveOnEnter(event)) {
      return;
    }

    event.preventDefault();

    if (passwordsMatch) {
      handleNextSignupStep();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateAccountStep()) {
      return;
    }

    if (!isConnectStep) {
      setMessage("");
      setSignupStep("connect");
      return;
    }

    if (!agreeTerms) {
      setMessage("서비스 이용약관과 개인정보 처리방침에 동의해주세요.");
      return;
    }

    if (!isGithubConnected) {
      setMessage("GitHub 연동 확인이 필요합니다.");
      return;
    }

    setMessage("회원가입 요청이 준비되었습니다. 백엔드 연동 시 이 데이터와 GitHub 권한으로 계정을 생성하면 됩니다.");
  };

  const handleGithubSignup = () => {
    if (!agreeTerms) {
      setMessage("GitHub 연동 전에 약관 동의가 필요합니다.");
      return;
    }

    setMessage("");
    setGithubConnectStatus("connecting");
  };

  return (
    <section className="w-[min(1180px,calc(100vw-32px))] mx-auto py-10 md:py-14 pb-20">
      <div
        className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-stretch overflow-hidden rounded-[34px] p-4 md:p-6"
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
        <motion.div
          initial={{ opacity: 0, x: 18, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative order-2 rounded-[28px] px-5 py-7 md:px-8 md:py-9 lg:order-2"
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
            transition={{ duration: 0.42, delay: 0.16, ease: "easeOut" }}
          >
            <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
              회원가입
            </p>
            <h1
              className="m-0 mt-1 leading-tight tracking-tight"
              style={{ color: "var(--white)", fontSize: "30px", fontWeight: 950 }}
            >
              {isAccountStep ? "계정 정보 입력" : "권한 연결"}
            </h1>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                { key: "account", label: "1. 계정 정보", active: isAccountStep, done: showFinalStep },
                { key: "connect", label: "2. 권한 연결", active: isConnectStep, done: isGithubConnected },
              ].map((step) => (
                <div
                  key={step.key}
                  className="rounded-2xl px-3 py-2 text-[var(--krds-body-xsmall)] font-black tracking-tight"
                  style={{
                    background: step.active
                      ? `${colors.primary}, 0.14)`
                      : step.done
                        ? "rgba(var(--codedock-secondary-rgb),0.10)"
                        : "rgba(234,247,255,0.045)",
                    border: step.active
                      ? `1px solid ${colors.primary}, 0.34)`
                      : step.done
                        ? "1px solid rgba(var(--codedock-secondary-rgb),0.24)"
                        : "1px solid rgba(234,247,255,0.08)",
                    color: step.active ? colors.primaryHex : step.done ? "var(--soft-mint)" : "rgba(234,247,255,0.52)",
                  }}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <div className={isAccountStep ? "grid gap-3" : "hidden"}>
              <ChatPrompt delay={0.28}>안녕하세요! 계정에 사용할 이름을 알려주세요.</ChatPrompt>
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.42, delay: 0.48, ease: "easeOut" }}
              >
                <ChatSignupInput
                  icon={UserRound}
                  label="이름"
                  name="name"
                  value={formData.name}
                  placeholder="이름을 입력하세요"
                  autoComplete="name"
                  error={hasName && !isNameCharactersValid}
                  inputRef={nameInputRef}
                  onChange={handleChange}
                  onKeyDown={(event) => moveFocusOnEnter(event, isNameReady, emailInputRef)}
                  onCompositionStart={() => setIsNameComposing(true)}
                  onCompositionEnd={() => setIsNameComposing(false)}
                />
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {isAccountStep && showEmailStep && (
                <motion.div
                  key="signup-email-step"
                  className="grid gap-3 overflow-hidden"
                  initial={{ opacity: 0, y: 14, height: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, height: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <ChatPrompt delay={0.06}>좋아요. 로그인에 사용할 이메일을 입력해주세요.</ChatPrompt>
                  <ChatSignupInput
                    icon={Mail}
                    label="이메일"
                    type="email"
                    name="email"
                    value={formData.email}
                    placeholder="name@company.com"
                    autoComplete="email"
                    error={hasEmail && !isEmailValid}
                    inputRef={emailInputRef}
                    onChange={handleChange}
                    onKeyDown={(event) => moveFocusOnEnter(event, isEmailValid, passwordInputRef)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isAccountStep && showPasswordStep && (
                <motion.div
                  key="signup-password-step"
                  className="grid gap-3 overflow-hidden"
                  initial={{ opacity: 0, y: 14, height: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, height: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <ChatPrompt delay={0.06}>이메일 입력 완료! 이제 안전한 비밀번호를 만들어볼게요.</ChatPrompt>
                  <ChatSignupInput
                    icon={Lock}
                    label="비밀번호"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    placeholder="8자 이상, 영문/숫자 조합"
                    autoComplete="new-password"
                    minLength={8}
                    error={hasPassword && !isPasswordValid}
                    inputRef={passwordInputRef}
                    onChange={handleChange}
                    onKeyDown={(event) => moveFocusOnEnter(event, isPasswordValid, confirmPasswordInputRef)}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        className="grid h-9 w-9 place-items-center rounded-xl border-0 bg-transparent"
                        style={{ color: "var(--muted)" }}
                      >
                        {showPassword ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
                      </button>
                    }
                  />
                  <div className="grid gap-2">
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(234, 247, 255, 0.10)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: `${(passwordStrength / 5) * 100}%` }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        style={{
                          background: `linear-gradient(90deg, ${colors.primaryHex}, var(--matrix-green))`,
                          boxShadow: `0 0 16px ${colors.primary}, 0.26)`,
                        }}
                      />
                    </div>
                    <span className="text-[var(--krds-body-xsmall)] font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                      비밀번호 강도: {strengthLabels[Math.max(passwordStrength - 1, 0)]}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isAccountStep && showConfirmStep && (
                <motion.div
                  key="signup-confirm-step"
                  className="grid gap-3 overflow-hidden"
                  initial={{ opacity: 0, y: 14, height: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, height: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  {!showFinalStep && (
                    <ChatPrompt delay={0.06} mood={shouldShowPasswordMismatch ? "risk" : "idle"}>
                      {shouldShowPasswordMismatch
                        ? "비밀번호가 서로 달라요. 다시 한 번 확인해주세요."
                        : "비밀번호 입력 완료! 마지막으로 한 번 더 확인할게요."}
                    </ChatPrompt>
                  )}
                  <ChatSignupInput
                    icon={Lock}
                    label="비밀번호 확인"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                    error={shouldShowPasswordMismatch}
                    inputRef={confirmPasswordInputRef}
                    onChange={handleChange}
                    onKeyDown={moveToConnectStepOnEnter}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        aria-label={showConfirmPassword ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                        className="grid h-9 w-9 place-items-center rounded-xl border-0 bg-transparent"
                        style={{ color: "var(--muted)" }}
                      >
                        {showConfirmPassword ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
                      </button>
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isAccountStep && showFinalStep && (
                <motion.button
                  key="signup-next-button"
                  type="button"
                  onClick={handleNextSignupStep}
                  className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 px-6 tracking-tight transition hover:scale-[1.01]"
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                    boxShadow: `0 0 28px ${colors.primary}, 0.18)`,
                    color: "#021014",
                    fontSize: "16px",
                    fontWeight: 950,
                  }}
                >
                  권한 연결로 이동
                  <ArrowRight size={19} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isConnectStep && (
                <motion.div
                  key="signup-final-step"
                  className="grid gap-5 overflow-hidden"
                  initial={{ opacity: 0, y: 16, height: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, height: "auto", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, height: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setSignupStep("account");
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border-0 bg-transparent px-3 text-sm font-black tracking-tight transition hover:scale-[1.02]"
                      style={{
                        color: "rgba(234,247,255,0.72)",
                        boxShadow: "inset 0 0 0 1px rgba(234,247,255,0.10)",
                      }}
                    >
                      <ArrowLeft size={17} strokeWidth={2.5} />
                      계정 정보 수정
                    </button>
                    <span className="rounded-full px-3 py-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ background: "rgba(234,247,255,0.06)", color: colors.primaryHex }}>
                      2 / 2
                    </span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <ChatPrompt
                      key={signupFinalStage < 2 ? "init" : `${agreeTerms}-${githubConnectStatus}`}
                      delay={0.06}
                      mood={isGithubConnected ? "success" : "idle"}
                    >
                      {signupFinalStage < 2
                        ? "비밀번호 확인 완료! 약관만 확인하면 가입 준비가 끝나요."
                        : !agreeTerms
                          ? "마지막으로 약관 동의만 확인해주세요."
                          : isGithubConnected
                            ? "모든 준비가 끝났어요. 아래 버튼을 눌러 CodeDock을 시작하세요."
                            : "좋아요. GitHub를 연결하면 PR 리뷰 준비까지 이어서 마무리할게요."}
                    </ChatPrompt>
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {signupFinalStage >= 1 && (
                      <motion.label
                        key="signup-terms-check"
                        className="flex items-start gap-3 rounded-2xl px-4 py-3"
                        initial={{ opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.985 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{ background: "rgba(234, 247, 255, 0.045)" }}
                      >
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          required
                          aria-label="서비스 이용약관과 개인정보 처리방침 필수 동의"
                          onChange={(event) => {
                            setMessage("");
                            setAgreeTerms(event.target.checked);
                          }}
                          className="mt-1 h-4 w-4 flex-shrink-0"
                          style={{ accentColor: colors.primaryHex }}
                        />
                        <span className="text-sm font-bold leading-6 tracking-tight" style={{ color: "var(--muted)" }}>
                          <span className="mr-1 font-black" style={{ color: colors.primaryHex }}>[필수]</span>
                          <Link to="/terms" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                            서비스 이용약관
                          </Link>
                          과{" "}
                          <Link to="/privacy" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                            개인정보 처리방침
                          </Link>
                          에 동의합니다.
                        </span>
                      </motion.label>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {signupFinalStage >= 2 && agreeTerms && (
                      <motion.div
                        key="github-connect-process"
                        className={`rounded-[24px] ${isGithubConnected ? "p-3" : "p-4"}`}
                        initial={{ opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.985 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                          background: "rgba(234, 247, 255, 0.045)",
                          border: `1px solid ${isGithubConnected ? "rgba(var(--codedock-secondary-rgb),0.28)" : `${colors.primary}, 0.16)`}`,
                          boxShadow: isGithubConnected ? "0 0 26px rgba(var(--codedock-secondary-rgb),0.10)" : "none",
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl"
                              style={{
                                background: isGithubConnected ? "rgba(var(--codedock-secondary-rgb),0.12)" : "rgba(234, 247, 255, 0.07)",
                                border: isGithubConnected ? "1px solid rgba(var(--codedock-secondary-rgb),0.30)" : `1px solid ${colors.primary}, 0.18)`,
                                color: isGithubConnected ? "var(--matrix-green)" : "var(--white)",
                              }}
                            >
                              {isGithubConnected ? <Check size={21} strokeWidth={3} /> : <Github size={21} strokeWidth={2.2} />}
                            </span>
                            <div>
                              <p className="m-0 text-sm font-black tracking-tight" style={{ color: "var(--white)" }}>
                                GitHub 저장소 연동
                              </p>
                              <p className="m-0 mt-1 text-[var(--krds-body-xsmall)] font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                                GitHub를 연결하면 PR 리뷰와 이슈를 바로 시작할 수 있어요.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleGithubSignup}
                            onMouseEnter={() => setIsGithubSignupHovering(true)}
                            onMouseLeave={() => setIsGithubSignupHovering(false)}
                            onFocus={() => setIsGithubSignupHovering(true)}
                            onBlur={() => setIsGithubSignupHovering(false)}
                            disabled={isGithubConnecting || isGithubConnected}
                            className="flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-0 px-3 text-[13px] font-black tracking-tight transition sm:px-4 sm:text-sm enabled:hover:scale-[1.02] disabled:cursor-default"
                            style={{
                              background: isGithubConnected
                                ? "rgba(var(--codedock-secondary-rgb),0.18)"
                                : isGithubConnecting
                                  ? "rgba(234, 247, 255, 0.08)"
                                  : `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                              boxShadow:
                                isGithubSignupHovering && !isGithubConnecting && !isGithubConnected
                                  ? `0 0 24px ${colors.primary}, 0.22)`
                                  : isGithubConnected
                                    ? "0 0 18px rgba(57,255,136,0.10)"
                                    : "none",
                              color: isGithubConnected ? "var(--soft-mint)" : isGithubConnecting ? "rgba(234,247,255,0.62)" : "#021014",
                            }}
                          >
                            <motion.span
                              className="grid place-items-center"
                              animate={
                                isGithubSignupHovering && !isGithubConnecting && !isGithubConnected
                                  ? { rotate: [0, -8, 7, 0], y: [0, -2, 0], scale: [1, 1.08, 1] }
                                  : { rotate: 0, y: 0, scale: 1 }
                              }
                              transition={{ duration: 0.42, ease: "easeOut" }}
                            >
                              {isGithubConnected ? <Check size={15} strokeWidth={3} /> : <Github size={15} strokeWidth={2.3} />}
                            </motion.span>
                            {isGithubConnected ? "연동 완료" : isGithubConnecting ? "연동 중..." : "GitHub 연동하기"}
                          </button>
                        </div>

                        {!isGithubConnected && (
                          <div className="mt-4 grid gap-2">
                            {githubConnectSteps.map((step, index) => {
                              const isDone = githubConnectStepIndex > index;
                              const isCurrent = githubConnectStepIndex === index;

                              return (
                                <div
                                  key={step.status}
                                  className="flex items-start gap-3 rounded-2xl px-3 py-2"
                                  style={{
                                    background: isDone
                                      ? "rgba(var(--codedock-secondary-rgb),0.08)"
                                      : isCurrent
                                        ? `${colors.primary}, 0.10)`
                                        : "rgba(234, 247, 255, 0.035)",
                                  }}
                                >
                                  <span
                                    className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full"
                                    style={{
                                      background: isDone ? "var(--matrix-green)" : isCurrent ? colors.primaryHex : "rgba(234,247,255,0.14)",
                                      color: isDone || isCurrent ? "#021014" : "rgba(234,247,255,0.48)",
                                    }}
                                  >
                                    {isDone ? (
                                      <Check size={13} strokeWidth={3} />
                                    ) : isCurrent ? (
                                      <motion.span
                                        className="block h-2 w-2 rounded-full"
                                        style={{ background: "#021014" }}
                                        animate={{ scale: [0.7, 1.15, 0.7], opacity: [0.45, 1, 0.45] }}
                                        transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut" }}
                                      />
                                    ) : (
                                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    )}
                                  </span>
                                  <div>
                                    <p className="m-0 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: isDone ? "var(--soft-mint)" : "var(--white)" }}>
                                      {step.label}
                                    </p>
                                    <p className="m-0 mt-1 text-[var(--krds-body-xsmall)] font-bold leading-5 tracking-tight" style={{ color: "rgba(234,247,255,0.58)" }}>
                                      {step.detail}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {signupFinalStage >= 2 && isGithubConnected && (
                      <motion.button
                        key="signup-submit-button"
                        type="submit"
                        onMouseEnter={() => setIsSignupButtonHovering(true)}
                        onMouseLeave={() => setIsSignupButtonHovering(false)}
                        onFocus={() => setIsSignupButtonHovering(true)}
                        onBlur={() => setIsSignupButtonHovering(false)}
                        className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 px-6 tracking-tight transition hover:scale-[1.01]"
                        initial={{ opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.985 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                          background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                          boxShadow: `0 0 28px ${colors.primary}, 0.22)`,
                          color: "#021014",
                          fontSize: "16px",
                          fontWeight: 950,
                        }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {/* Do not localize: brand/developer easter-egg hover microcopy must stay in English. */}
                          <motion.span
                            key={isSignupButtonHovering ? "signup-happy" : "signup-default"}
                            className="inline-block min-w-[120px] text-center"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                          >
                            {isSignupButtonHovering ? "Happy Hacking!" : "회원가입"}
                          </motion.span>
                        </AnimatePresence>
                        <ArrowRight size={19} strokeWidth={2.5} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.72, ease: "easeOut" }}
          >
            {message && (
              <p
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold leading-6 tracking-tight"
                style={{
                  background:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "rgba(255, 107, 107, 0.08)"
                      : "rgba(var(--codedock-secondary-rgb), 0.08)",
                  border:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "1px solid rgba(255, 107, 107, 0.24)"
                      : "1px solid rgba(var(--codedock-secondary-rgb), 0.22)",
                  color:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "#FFB4B4"
                      : "var(--soft-mint)",
                }}
              >
                {message}
              </p>
            )}

            <p className="m-0 mt-6 text-center text-sm font-bold tracking-tight" style={{ color: "var(--muted)" }}>
              이미 계정이 있나요?{" "}
              <Link to="/login" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                로그인
              </Link>
            </p>
          </motion.div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative order-1 flex min-h-[520px] flex-col justify-between rounded-[28px] p-6 md:p-8 lg:order-1"
          style={{
            background: `
              radial-gradient(circle at 50% 35%, ${colors.primary}, 0.17), transparent 42%),
              radial-gradient(circle at 56% 78%, rgba(var(--codedock-secondary-rgb),0.13), transparent 36%),
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
              <ShieldCheck size={16} strokeWidth={2.4} />
              <span className="text-sm font-black tracking-tight">1분이면 시작</span>
            </div>

            <h2
              className="mt-8 max-w-[520px] leading-[0.95] tracking-tight"
              style={{
                fontSize: "clamp(38px, 4.8vw, 66px)",
                fontWeight: 950,
                color: "var(--white)",
                textShadow: `0 0 22px ${colors.primary}, 0.18)`,
              }}
            >
              코드가 안전하게
              <span className="block" style={{ color: colors.primaryHex }}>
                출항하는 곳.
              </span>
            </h2>
          </div>

          <div className="mt-8 grid gap-5">
            <div className="flex items-start gap-2">
              <CoffeeLogo
                className="-mt-6 h-48 w-48 flex-shrink-0"
                alive={assistantFeedback.warning}
                mood={assistantFeedback.warning ? "risk" : isGithubConnected ? "success" : isConnectStep ? "cta" : "idle"}
                style={{ filter: `drop-shadow(0 0 28px ${toneAlpha(assistantFeedback.tone, 40)})` }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${assistantFeedback.title}-${assistantFeedback.body}`}
                  className="relative -mt-2 rounded-[24px] rounded-bl-md px-4 py-4"
                  style={{
                    background: assistantFeedback.warning ? "rgba(255, 107, 107, 0.085)" : toneAlpha(assistantFeedback.tone, 9),
                    border: `1px solid ${toneAlpha(assistantFeedback.tone, 33)}`,
                    color: "#DFFAFF",
                    boxShadow: `0 0 26px ${toneAlpha(assistantFeedback.tone, 9)}`,
                  }}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {assistantFeedback.warning ? (
                      <AlertTriangle size={16} strokeWidth={2.6} style={{ color: assistantFeedback.tone }} />
                    ) : (
                      <Check size={16} strokeWidth={3} style={{ color: assistantFeedback.tone }} />
                    )}
                    <span className="text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: assistantFeedback.tone }}>
                      {assistantFeedback.status}
                    </span>
                  </div>
                  <h3 className="m-0 text-lg font-black leading-tight tracking-tight" style={{ color: "var(--white)" }}>
                    {assistantFeedback.title}
                  </h3>
                  <p className="m-0 mt-2 text-sm font-bold leading-6 tracking-tight" style={{ color: "rgba(234,247,255,0.76)" }}>
                    {assistantFeedback.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {validationItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-[var(--krds-body-xsmall)] font-black tracking-tight"
                  style={{
                    background: item.warning ? "rgba(255, 107, 107, 0.08)" : item.done ? "rgba(var(--codedock-secondary-rgb),0.08)" : "rgba(234, 247, 255, 0.045)",
                    border: item.warning
                      ? "1px solid rgba(255, 107, 107, 0.24)"
                      : item.done
                        ? "1px solid rgba(var(--codedock-secondary-rgb),0.22)"
                        : `1px solid ${colors.primary}, 0.12)`,
                    color: item.warning ? "#FFB4B4" : item.done ? "var(--soft-mint)" : "rgba(234,247,255,0.56)",
                  }}
                >
                  {item.warning ? <AlertTriangle size={15} strokeWidth={2.6} /> : <Check size={15} strokeWidth={3} />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function ChatPrompt({ children, delay = 0.06, mood = "idle" }: { children: ReactNode; delay?: number; mood?: SignupMascotMood }) {
  const { colors } = useTheme();
  const text = typeof children === "string" ? children : "";
  const characters = Array.from(text);
  const isRiskMood = mood === "risk";
  const [isTyping, setIsTyping] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!text) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setVisibleCount(0);

    const typingTimer = window.setTimeout(() => {
      setIsTyping(false);
    }, 460);

    return () => window.clearTimeout(typingTimer);
  }, [text]);

  useEffect(() => {
    if (isTyping || visibleCount >= characters.length) {
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(characters.length, count + 1));
    }, 24);

    return () => window.clearTimeout(revealTimer);
  }, [characters.length, isTyping, visibleCount]);

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.34, delay, ease: "easeOut" }}
    >
      <CoffeeLogo
        className="mt-0.5 h-12 w-12 flex-shrink-0"
        alive={isRiskMood}
        mood={mood}
        style={{ filter: `drop-shadow(0 0 14px ${isRiskMood ? "#FFB4B4" : colors.primary}, 0.22))` }}
      />
      <div
        className="relative min-h-[48px] rounded-[22px] rounded-bl-md px-4 py-3 text-sm font-black leading-6 tracking-tight"
        style={{
          background: isRiskMood ? "rgba(255, 107, 107, 0.11)" : `${colors.primary}, 0.12)`,
          border: isRiskMood ? "1px solid rgba(255, 107, 107, 0.32)" : `1px solid ${colors.primary}, 0.22)`,
          color: "#DFFAFF",
          minWidth: isTyping ? "92px" : "min(100%, 260px)",
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
                  style={{ background: isRiskMood ? "#FFB4B4" : colors.primaryHex }}
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
              {text ? characters.slice(0, visibleCount).join("") : children}
              {text && visibleCount < characters.length && (
                <motion.span
                  className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 rounded-full"
                  style={{ background: isRiskMood ? "#FFB4B4" : colors.primaryHex }}
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

interface ChatSignupInputProps {
  icon: ElementType;
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCompositionStart?: (event: CompositionEvent<HTMLInputElement>) => void;
  onCompositionEnd?: (event: CompositionEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  error?: boolean;
  trailing?: ReactNode;
}

function ChatSignupInput({
  icon: Icon,
  label,
  name,
  value,
  placeholder,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  inputRef,
  type = "text",
  autoComplete,
  minLength,
  error = false,
  trailing,
}: ChatSignupInputProps) {
  const { colors } = useTheme();

  return (
    <label className="block w-full">
      <span className="sr-only">{label}</span>
      <span className="relative block" style={{ color: "var(--white)" }}>
        <Icon
          size={20}
          strokeWidth={2.2}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: error ? "#FFB4B4" : "var(--muted)" }}
        />
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className={`codedock-auth-input h-14 w-full rounded-full pl-12 ${trailing ? "pr-12" : "pr-4"} tracking-tight outline-none transition`}
          style={{
            background: "rgba(234, 247, 255, 0.055)",
            border: error ? "1px solid rgba(255, 107, 107, 0.46)" : `1px solid ${colors.primary}, 0.14)`,
            color: "var(--white)",
            caretColor: colors.primaryHex,
            colorScheme: "dark",
            fontSize: "15px",
            fontWeight: 800,
          }}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </span>
    </label>
  );
}
