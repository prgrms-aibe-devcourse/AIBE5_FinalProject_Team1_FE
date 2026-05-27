import { useMemo, useState, type ChangeEvent, type ElementType, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
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
  const [message, setMessage] = useState("");

  const trimmedName = formData.name.trim();
  const trimmedEmail = formData.email.trim();
  const hasName = trimmedName.length > 0;
  const hasEmail = trimmedEmail.length > 0;
  const hasPassword = formData.password.length > 0;
  const hasConfirmPassword = formData.confirmPassword.length > 0;
  const isNameValid = trimmedName.length >= 2 && /^[A-Za-z가-힣\s]+$/.test(trimmedName);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPasswordValid = formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password);
  const passwordsMatch = hasConfirmPassword && formData.password === formData.confirmPassword;
  const showEmailStep = hasName;
  const showPasswordStep = hasName && hasEmail;
  const showConfirmStep = showPasswordStep && hasPassword;
  const showFinalStep = showConfirmStep && hasConfirmPassword;

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

  const assistantFeedback = useMemo(() => {
    if (hasName && !isNameValid) {
      return {
        tone: "#FFB4B4",
        status: "확인 필요",
        title: "이름 형식을 확인해주세요.",
        body: "두 글자 이상으로 입력하고 숫자나 특수문자는 빼면 좋아요.",
        warning: true,
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

    if (hasConfirmPassword && !passwordsMatch) {
      return {
        tone: "#FFB4B4",
        status: "확인 필요",
        title: "비밀번호 확인이 달라요.",
        body: "방금 입력한 비밀번호와 똑같이 한 번 더 입력해주세요.",
        warning: true,
      };
    }

    if (isNameValid && isEmailValid && isPasswordValid && passwordsMatch && !agreeTerms) {
      return {
        tone: "#20E3FF",
        status: "거의 완료",
        title: "입력값은 좋아요.",
        body: "마지막으로 약관 동의만 체크하면 계정을 만들 수 있습니다.",
        warning: false,
      };
    }

    if (isNameValid && isEmailValid && isPasswordValid && passwordsMatch && agreeTerms) {
      return {
        tone: "#39FF88",
        status: "준비 완료",
        title: "좋아요. 바로 시작할 수 있어요.",
        body: "가입 후 PR 분석, 문서화, 이슈 추적 흐름을 한 화면에서 확인할 수 있습니다.",
        warning: false,
      };
    }

    return {
      tone: colors.primaryHex,
      status: "가입 도우미",
      title: "하나씩 입력하면 제가 확인할게요.",
      body: "이름, 로그인 이메일, 비밀번호 순서로 열립니다. 형식이 틀리면 바로 알려드릴게요.",
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
    isNameValid,
    isPasswordValid,
    passwordsMatch,
  ]);

  const validationItems = [
    { label: "이름 형식", done: isNameValid, warning: hasName && !isNameValid },
    { label: "로그인 이메일", done: isEmailValid, warning: hasEmail && !isEmailValid },
    { label: "비밀번호 형식", done: isPasswordValid, warning: hasPassword && !isPasswordValid },
    { label: "비밀번호 확인", done: passwordsMatch, warning: hasConfirmPassword && !passwordsMatch },
  ];

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setMessage("");
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isNameValid) {
      setMessage("이름은 두 글자 이상, 한글 또는 영문으로 입력해주세요.");
      return;
    }

    if (!isEmailValid) {
      setMessage("로그인 이메일 형식을 확인해주세요.");
      return;
    }

    if (!isPasswordValid) {
      setMessage("비밀번호는 8자 이상, 영문과 숫자를 함께 입력해주세요.");
      return;
    }

    if (!passwordsMatch) {
      setMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!agreeTerms) {
      setMessage("서비스 이용약관과 개인정보 처리방침에 동의해주세요.");
      return;
    }

    setMessage("회원가입 요청이 준비되었습니다. 백엔드 연동 시 이 데이터로 계정을 생성하면 됩니다.");
    console.log("Signup:", formData);
  };

  const handleGithubSignup = () => {
    setMessage("GitHub OAuth 가입 연결 지점입니다.");
    console.log("GitHub Signup");
  };

  return (
    <section className="w-[min(1180px,calc(100vw-32px))] mx-auto py-10 md:py-14 pb-20">
      <div
        className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-stretch overflow-hidden rounded-[34px] p-4 md:p-6"
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
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
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
            transition={{ duration: 0.42, delay: 0.16, ease: "easeOut" }}
          >
            <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
              회원가입
            </p>
            <h1
              className="m-0 mt-1 leading-tight tracking-tight"
              style={{ color: "var(--white)", fontSize: "30px", fontWeight: 950 }}
            >
              계정 만들기
            </h1>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            <div className="grid gap-3">
              <ChatPrompt delay={0.28}>안녕하세요. 계정에 표시할 이름을 알려주세요.</ChatPrompt>
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
                  placeholder="김재준"
                  autoComplete="name"
                  error={hasName && !isNameValid}
                  onChange={handleChange}
                />
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {showEmailStep && (
                <motion.div
                  key="signup-email-step"
                  className="grid gap-3"
                  initial={{ opacity: 0, y: 14, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <ChatPrompt delay={0.06}>좋아요. 로그인에 사용할 이메일도 입력해주세요.</ChatPrompt>
                  <ChatSignupInput
                    icon={Mail}
                    label="이메일"
                    type="email"
                    name="email"
                    value={formData.email}
                    placeholder="name@company.com"
                    autoComplete="email"
                    error={hasEmail && !isEmailValid}
                    onChange={handleChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {showPasswordStep && (
                <motion.div
                  key="signup-password-step"
                  className="grid gap-3"
                  initial={{ opacity: 0, y: 14, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <ChatPrompt delay={0.06}>이제 안전한 비밀번호를 만들어볼게요.</ChatPrompt>
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
                    onChange={handleChange}
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
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span
                          key={index}
                          className="h-1.5 rounded-full"
                          style={{
                            background:
                              index < passwordStrength
                                ? `linear-gradient(90deg, ${colors.primaryHex}, #39FF88)`
                                : "rgba(234, 247, 255, 0.10)",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                      비밀번호 강도: {strengthLabels[Math.max(passwordStrength - 1, 0)]}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {showConfirmStep && (
                <motion.div
                  key="signup-confirm-step"
                  className="grid gap-3"
                  initial={{ opacity: 0, y: 14, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <ChatPrompt delay={0.06}>마지막으로 비밀번호를 한 번 더 확인할게요.</ChatPrompt>
                  <ChatSignupInput
                    icon={Lock}
                    label="비밀번호 확인"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                    error={hasConfirmPassword && !passwordsMatch}
                    onChange={handleChange}
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
              {showFinalStep && (
                <motion.div
                  key="signup-final-step"
                  className="grid gap-5"
                  initial={{ opacity: 0, y: 16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <label className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(234, 247, 255, 0.045)" }}>
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(event) => {
                        setMessage("");
                        setAgreeTerms(event.target.checked);
                      }}
                      className="mt-1 h-4 w-4 flex-shrink-0"
                      style={{ accentColor: colors.primaryHex }}
                    />
                    <span className="text-sm font-bold leading-6 tracking-tight" style={{ color: "var(--muted)" }}>
                      <Link to="/terms" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                        서비스 이용약관
                      </Link>
                      과{" "}
                      <Link to="/privacy" className="font-black no-underline" style={{ color: colors.primaryHex }}>
                        개인정보 처리방침
                      </Link>
                      에 동의합니다.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 px-6 tracking-tight transition hover:scale-[1.01]"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                      boxShadow: `0 0 28px ${colors.primary}, 0.22)`,
                      color: "#021014",
                      fontSize: "16px",
                      fontWeight: 950,
                    }}
                  >
                    회원가입
                    <ArrowRight size={19} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.72, ease: "easeOut" }}
          >
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: `${colors.primary}, 0.14)` }} />
              <span className="text-xs font-black tracking-tight" style={{ color: "var(--muted)" }}>
                또는
              </span>
              <div className="h-px flex-1" style={{ background: `${colors.primary}, 0.14)` }} />
            </div>

            <button
              type="button"
              onClick={handleGithubSignup}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-6 tracking-tight transition hover:scale-[1.01]"
              style={{
                background: "rgba(234, 247, 255, 0.055)",
                border: `1px solid ${colors.primary}, 0.22)`,
                color: "var(--white)",
                fontSize: "15px",
                fontWeight: 900,
              }}
            >
              <Github size={20} strokeWidth={2.2} />
              GitHub로 가입하기
            </button>

            {message && (
              <p
                className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold leading-6 tracking-tight"
                style={{
                  background:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "rgba(255, 107, 107, 0.08)"
                      : "rgba(57, 255, 136, 0.08)",
                  border:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "1px solid rgba(255, 107, 107, 0.24)"
                      : "1px solid rgba(57, 255, 136, 0.22)",
                  color:
                    message.includes("확인") || message.includes("동의") || message.includes("일치")
                      ? "#FFB4B4"
                      : "#B7FFE3",
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
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative flex min-h-[520px] flex-col justify-between rounded-[28px] p-6 md:p-8"
          style={{
            background: `
              radial-gradient(circle at 50% 35%, ${colors.primary}, 0.17), transparent 42%),
              radial-gradient(circle at 56% 78%, rgba(57,255,136,0.13), transparent 36%),
              linear-gradient(145deg, rgba(16,31,52,0.95), rgba(5,11,20,0.88))
            `,
            border: `1px solid ${colors.primary}, 0.20)`,
            boxShadow: "inset 0 0 32px rgba(32, 227, 255, 0.08), 0 18px 48px rgba(0, 0, 0, 0.32)",
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
              <span className="text-sm font-black tracking-tight">안전한 계정</span>
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
              팀의 코드 리뷰를
              <span style={{ color: colors.primaryHex }}> 한 화면</span>에.
            </h2>

            <p
              className="mt-5 max-w-[560px] leading-8 tracking-tight"
              style={{
                color: "var(--muted)",
                fontSize: "16px",
                fontWeight: 650,
              }}
            >
              가입 후 로그인하면 PR 분석, 문서화, 이슈 추적 흐름을 바로 확인할 수 있습니다.
            </p>
          </div>

          <div className="mt-8 grid gap-5">
            <div className="flex items-start gap-3">
              <CoffeeLogo
                className="mt-1 h-12 w-12 flex-shrink-0"
                style={{ filter: `drop-shadow(0 0 16px ${assistantFeedback.tone}66)` }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${assistantFeedback.title}-${assistantFeedback.body}`}
                  className="relative rounded-[24px] rounded-bl-md px-4 py-4"
                  style={{
                    background: assistantFeedback.warning ? "rgba(255, 107, 107, 0.085)" : `${assistantFeedback.tone}17`,
                    border: `1px solid ${assistantFeedback.tone}55`,
                    color: "#DFFAFF",
                    boxShadow: `0 0 26px ${assistantFeedback.tone}18`,
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
                    <span className="text-xs font-black tracking-tight" style={{ color: assistantFeedback.tone }}>
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
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black tracking-tight"
                  style={{
                    background: item.warning ? "rgba(255, 107, 107, 0.08)" : item.done ? "rgba(57,255,136,0.08)" : "rgba(234, 247, 255, 0.045)",
                    border: item.warning
                      ? "1px solid rgba(255, 107, 107, 0.24)"
                      : item.done
                        ? "1px solid rgba(57,255,136,0.22)"
                        : `1px solid ${colors.primary}, 0.12)`,
                    color: item.warning ? "#FFB4B4" : item.done ? "#B7FFE3" : "rgba(234,247,255,0.56)",
                  }}
                >
                  {item.warning ? <AlertTriangle size={15} strokeWidth={2.6} /> : <Check size={15} strokeWidth={3} />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              {["GitHub 연동 준비", "PR 보안 분석", "API/ERD 문서 협업"].map((label, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: "rgba(234, 247, 255, 0.055)",
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: "#CFF8FF",
                  }}
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full"
                    style={{
                      background: index === 0 && isEmailValid ? "rgba(57, 255, 136, 0.12)" : `${colors.primary}, 0.11)`,
                      color: index === 0 && isEmailValid ? "#39FF88" : colors.primaryHex,
                    }}
                  >
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <span className="text-sm font-black tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function ChatPrompt({ children, delay = 0.06 }: { children: ReactNode; delay?: number }) {
  const { colors } = useTheme();

  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.34, delay, ease: "easeOut" }}
    >
      <CoffeeLogo
        className="mt-1 h-10 w-10 flex-shrink-0"
        style={{ filter: `drop-shadow(0 0 12px ${colors.primary}, 0.20))` }}
      />
      <div
        className="relative rounded-[22px] rounded-bl-md px-4 py-3 text-sm font-black leading-6 tracking-tight"
        style={{
          background: `${colors.primary}, 0.12)`,
          border: `1px solid ${colors.primary}, 0.22)`,
          color: "#DFFAFF",
        }}
      >
        {children}
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
  type = "text",
  autoComplete,
  minLength,
  error = false,
  trailing,
}: ChatSignupInputProps) {
  const { colors } = useTheme();

  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <span className="relative block" style={{ color: "var(--white)" }}>
        <Icon
          size={20}
          strokeWidth={2.2}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: error ? "#FFB4B4" : "var(--muted)" }}
        />
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
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
