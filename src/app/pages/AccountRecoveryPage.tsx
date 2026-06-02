import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Send, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CodeDockWordmark } from "../components/CodeDockWordmark";
import { CoffeeLogo } from "../components/CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export function AccountRecoveryPage() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isButtonHovering, setIsButtonHovering] = useState(false);

  const copy = useMemo(
    () => ({
      title: isEnglish ? "Forgot Password" : "비밀번호 찾기",
      titlePrompt: isEnglish ? "I will help you find your password." : "비밀번호 찾기를 도와드릴게요.",
      introTitle: isEnglish ? "We will help you get back in." : "다시 접속할 수 있게 도와드릴게요.",
      introBody: isEnglish
        ? "We will send a reset link to your email."
        : "확인된 이메일로 재설정 링크를 보내요.",
      emailPrompt: isEnglish ? "Tell me the email you used to sign up." : "가입할 때 사용한 이메일을 알려주세요.",
      emailLabel: isEnglish ? "Account email" : "가입 이메일",
      emailPlaceholder: "name@company.com",
      submit: isEnglish ? "Send recovery email" : "비밀번호 찾기 메일 보내기",
      // Do not localize: brand/developer easter-egg microcopy must stay in English.
      hoverSubmit: "Back to Dock",
      successCode: 'console.log("welcome back, sailor")',
      sentTitle: isEnglish ? "Email sent" : "메일 발송 완료",
      sentBody: isEnglish
        ? "We sent a password reset link. Open the email and set a new password."
        : "비밀번호 찾기 메일을 보냈어요. 이메일에서 재설정 링크를 열어주세요.",
      emptyEmail: isEnglish ? "Please enter the email you use to sign in." : "로그인에 사용하는 이메일을 먼저 입력해주세요.",
      invalidEmail: isEnglish ? "This does not look like an email. Check it one more time." : "이메일 형식이 맞지 않아요. 한 번 더 확인해주세요.",
      backToLogin: isEnglish ? "Back to login" : "로그인으로 돌아가기",
      stepEmail: isEnglish ? "Email" : "이메일",
      stepSend: isEnglish ? "Send" : "메일 출항",
      stepDone: isEnglish ? "Done" : "완료",
    }),
    [isEnglish],
  );

  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasEmail = email.trim().length > 0;
  const mascotMood = emailError ? "risk" : isSent ? "success" : "idle";
  const mascotMessage = emailError || (isSent ? copy.sentBody : copy.introTitle);
  const activeStep = isSent ? 2 : canSubmit ? 1 : hasEmail ? 0 : -1;
  const recoverySteps = [
    { label: copy.stepEmail, icon: Mail },
    { label: copy.stepSend, icon: Send },
    { label: copy.stepDone, icon: CheckCircle2 },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setIsSent(false);
      setEmailError("");
      return;
    }
    if (!canSubmit) {
      setIsSent(false);
      setEmailError(copy.invalidEmail);
      return;
    }
    setEmailError("");
    setIsSent(true);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError("");
    if (isSent) setIsSent(false);
  };

  return (
    <section className="mx-auto w-[min(1060px,calc(100vw-32px))] py-10 pb-20 md:py-14">
      <div
        className="grid overflow-hidden rounded-[34px] p-4 md:grid-cols-[0.92fr_1.08fr] md:p-6"
        style={{
          background: "rgba(11, 22, 40, 0.80)",
          border: `1px solid ${colors.primary}, 0.22)`,
          boxShadow: `0 30px 90px rgba(0, 0, 0, 0.42), 0 0 72px ${colors.primary}, 0.10)`,
          backdropFilter: "blur(22px) saturate(180%)",
        }}
      >
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[28px] p-7"
          style={{
            background:
              "radial-gradient(circle at 45% 24%, rgba(32,227,255,0.18), transparent 38%), linear-gradient(145deg, rgba(16,31,52,0.96), rgba(5,11,20,0.90))",
            border: `1px solid ${colors.primary}, 0.18)`,
          }}
        >
          <div>
            <h1 className="m-0 max-w-[420px] text-[clamp(34px,5vw,58px)] font-black leading-[0.96] tracking-[-0.075em]" style={{ color: "var(--white)" }}>
              {copy.title}
            </h1>
            <p className="mt-5 max-w-[420px] text-base font-bold leading-[1.65] tracking-tight" style={{ color: "var(--muted)" }}>
              {copy.introBody}
            </p>

            <div className="mt-7 grid gap-3">
              {recoverySteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep >= index;
                return (
                  <motion.div
                    key={step.label}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{
                      opacity: isActive ? 1 : 0.56,
                      x: 0,
                      scale: isActive ? 1.015 : 1,
                    }}
                    transition={{ duration: 0.34, delay: 0.08 * index, ease: "easeOut" }}
                    style={{
                      background: isActive ? `${colors.primary}, 0.12)` : "rgba(234,247,255,0.045)",
                      border: isActive ? `1px solid ${colors.primary}, 0.24)` : "1px solid rgba(234,247,255,0.08)",
                    }}
                  >
                    <motion.span
                      className="grid h-9 w-9 place-items-center rounded-xl"
                      animate={isActive ? { y: [0, -2, 0], rotate: index === 1 ? [0, -5, 5, 0] : 0 } : { y: 0, rotate: 0 }}
                      transition={{ duration: 1.8, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
                      style={{
                        background: isActive ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})` : "rgba(234,247,255,0.06)",
                        color: isActive ? "#021014" : "var(--muted)",
                      }}
                    >
                      <Icon size={16} strokeWidth={2.5} />
                    </motion.span>
                    <span className="text-sm font-black tracking-tight" style={{ color: isActive ? "var(--white)" : "var(--muted)" }}>
                      {step.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <CoffeeLogo className="h-32 w-32 flex-shrink-0" alive mood={mascotMood} />
            <div
              className="relative rounded-[22px] px-5 py-4"
              style={{
                background: emailError ? "rgba(255, 107, 107, 0.10)" : "rgba(234, 247, 255, 0.075)",
                border: emailError ? "1px solid rgba(255, 107, 107, 0.28)" : `1px solid ${colors.primary}, 0.18)`,
                color: "var(--white)",
                transform: isSent ? "translateY(-18px)" : undefined,
              }}
            >
              <p className="m-0 text-sm font-black leading-[1.5] tracking-tight">{mascotMessage}</p>
            </div>
          </div>
        </motion.aside>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col justify-center px-2 py-8 md:px-8"
        >
          <div className="mb-7 flex items-center justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.34, ease: "easeOut" }}>
              <CodeDockWordmark size="md" />
            </motion.div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black tracking-tight no-underline transition hover:scale-[1.02]"
              style={{ color: "var(--muted)", background: "rgba(234,247,255,0.055)" }}
            >
              <ArrowLeft size={15} />
              {copy.backToLogin}
            </Link>
          </div>

          <div
            className="rounded-[28px] px-5 py-6 md:px-6"
            style={{
              background: "rgba(5, 11, 20, 0.52)",
              border: `1px solid ${colors.primary}, 0.14)`,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex, border: `1px solid ${colors.primary}, 0.18)` }}>
              <KeyRound size={16} />
              <span className="text-sm font-black tracking-tight">{copy.title}</span>
            </div>

            <div className="grid gap-4">
              <RecoverySequentialChatPrompt messages={[copy.titlePrompt, copy.emailPrompt]} delay={0.1} />
            </div>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-4" noValidate>
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.38, delay: 0.5, ease: "easeOut" }}
              >
                <RecoveryField icon={Mail} label={copy.emailLabel} value={email} onChange={handleEmailChange} placeholder={copy.emailPlaceholder} type="email" error={Boolean(emailError)} />
              </motion.div>

              <AnimatePresence initial={false}>
                {emailError && (
                  <RecoveryChatPrompt key="recovery-error" text={emailError} delay={0.02} typingDelay={220} mood="risk" />
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {isSent && (
                  <motion.div
                    key="recovery-sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-[20px] px-5 py-4"
                    style={{ background: "rgba(57,255,136,0.10)", border: "1px solid rgba(57,255,136,0.24)" }}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={22} style={{ color: "var(--matrix-green)", flexShrink: 0 }} />
                      <div>
                        <p className="m-0 text-sm font-black tracking-tight" style={{ color: "var(--white)" }}>
                          {copy.sentTitle}
                        </p>
                        <p className="m-0 mt-1 text-sm font-bold leading-[1.55] tracking-tight" style={{ color: "var(--muted)" }}>
                          {copy.sentBody}
                        </p>
                        <motion.code
                          className="mt-3 inline-flex rounded-xl px-3 py-2 text-xs font-black tracking-tight"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.24, delay: 0.08, ease: "easeOut" }}
                          style={{
                            background: "rgba(5, 11, 20, 0.42)",
                            border: "1px solid rgba(57,255,136,0.20)",
                            color: "#B7FFE3",
                          }}
                        >
                          {copy.successCode}
                        </motion.code>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                aria-disabled={!canSubmit}
                onMouseEnter={() => setIsButtonHovering(true)}
                onMouseLeave={() => setIsButtonHovering(false)}
                onFocus={() => setIsButtonHovering(true)}
                onBlur={() => setIsButtonHovering(false)}
                className="mt-2 flex h-14 items-center justify-start gap-3 rounded-2xl border-0 pl-4 pr-6 tracking-tight transition hover:scale-[1.01]"
                style={{
                  background: canSubmit ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})` : "rgba(234,247,255,0.08)",
                  color: canSubmit ? "#021014" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 950,
                }}
              >
                <motion.span
                  animate={isButtonHovering && canSubmit ? { x: [0, 3, 0], y: [0, -2, 0] } : { x: 0, y: 0 }}
                  transition={{ duration: 0.72, repeat: isButtonHovering && canSubmit ? Infinity : 0, ease: "easeInOut" }}
                  className="grid place-items-center"
                >
                  <Send size={18} />
                </motion.span>
                <span className="relative inline-grid min-w-[148px] place-items-start overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isButtonHovering && canSubmit ? "hover" : "default"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      {isButtonHovering && canSubmit ? copy.hoverSubmit : copy.submit}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface RecoveryFieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: boolean;
}

function RecoverySequentialChatPrompt({ messages, delay = 0.1 }: { messages: string[]; delay?: number }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const sequenceKey = messages.join("\u0001");
  const currentMessage = messages[messageIndex] ?? "";
  const typingDelay = messageIndex === 0 ? 620 : 360;

  useEffect(() => {
    setMessageIndex(0);
  }, [sequenceKey]);

  useEffect(() => {
    if (messageIndex >= messages.length - 1) {
      return;
    }

    const revealDuration = Array.from(currentMessage).length * 28;
    const sequenceTimer = window.setTimeout(() => {
      setMessageIndex((index) => Math.min(messages.length - 1, index + 1));
    }, typingDelay + revealDuration + 760);

    return () => window.clearTimeout(sequenceTimer);
  }, [currentMessage, messageIndex, messages.length, typingDelay]);

  return <RecoveryChatPrompt text={currentMessage} delay={delay} typingDelay={typingDelay} />;
}

function RecoveryChatPrompt({
  text,
  delay = 0,
  typingDelay = 620,
  mood = "idle",
}: {
  text: string;
  delay?: number;
  typingDelay?: number;
  mood?: "idle" | "risk" | "success";
}) {
  const { colors } = useTheme();
  const [isTyping, setIsTyping] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const characters = Array.from(text);
  const visibleText = characters.slice(0, visibleCount).join("");
  const isRisk = mood === "risk";
  const isSuccess = mood === "success";

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
      exit={{ opacity: 0, x: -10, y: -6, scale: 0.98 }}
      transition={{ duration: 0.42, delay, ease: "easeOut" }}
      style={{ marginTop: isRisk ? "-8px" : undefined }}
    >
      <CoffeeLogo
        className="mt-1 h-10 w-10 flex-shrink-0"
        alive
        mood={isRisk ? "risk" : isSuccess ? "success" : "idle"}
        style={{ filter: `drop-shadow(0 0 12px ${colors.primary}, 0.20))` }}
      />
      <div
        className="relative min-h-[48px] rounded-[22px] rounded-bl-md px-4 py-3 text-sm font-black leading-6 tracking-tight"
        style={{
          background: isRisk ? "rgba(255, 107, 107, 0.12)" : isSuccess ? "rgba(57,255,136,0.12)" : `${colors.primary}, 0.12)`,
          border: isRisk ? "1px solid rgba(255, 107, 107, 0.28)" : isSuccess ? "1px solid rgba(57,255,136,0.26)" : `1px solid ${colors.primary}, 0.22)`,
          color: isRisk ? "#FFD9D9" : isSuccess ? "#B7FFE3" : "#DFFAFF",
          minWidth: isTyping ? "92px" : "min(100%, 250px)",
        }}
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          {isTyping ? (
            <motion.span
              key="recovery-typing-dots"
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
                  style={{ background: isRisk ? "#FF8A8A" : isSuccess ? "#39FF88" : colors.primaryHex }}
                  animate={{ y: [0, -5, 0], opacity: [0.38, 1, 0.38] }}
                  transition={{
                    duration: 0.72,
                    repeat: Infinity,
                    delay: dot * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.span>
          ) : (
            <motion.span
              key="recovery-visible-text"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {visibleText}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RecoveryField({ icon: Icon, label, value, onChange, placeholder, type = "text", error = false }: RecoveryFieldProps) {
  return (
    <label className="block">
      <span className="sr-only">
        {label}
      </span>
      <span className="relative block">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2" size={19} style={{ color: "var(--muted)" }} />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="codedock-auth-input h-14 w-full rounded-full px-12 tracking-tight outline-none transition"
          style={{
            background: error ? "rgba(255, 107, 107, 0.08)" : "rgba(234, 247, 255, 0.055)",
            border: error ? "1px solid rgba(255, 107, 107, 0.34)" : "1px solid rgba(32, 227, 255, 0.18)",
            color: "var(--white)",
            colorScheme: "dark",
            fontSize: "15px",
            fontWeight: 800,
          }}
        />
      </span>
    </label>
  );
}
