import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FileText,
  GitPullRequest,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { CoffeeLogo } from "../components/CoffeeLogo";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const reviewSignals = [
  { label: "GitHub 연동", value: "PR·이슈", tone: "var(--neon-cyan)", progress: 76 },
  { label: "팀 채팅", value: "실시간", tone: "var(--soft-mint)", progress: 88 },
  { label: "문서 허브", value: "API·ERD", tone: "#FFD166", progress: 100 },
];

const mascotMessages = [
  "GitHub, 채팅, 문서... 다 모셔뒀어요. ☕",
  "PR과 이슈를 한곳에 모아뒀어요.",
  "리뷰 결정도 작업 옆에 남겨둘게요.",
  "문서까지 한 흐름으로 이어둘게요.",
];

const introMessages = [
  "GitHub, 채팅, 문서... 다 모셔뒀어요. ☕",
  "GitHub · 채팅 · 문서, 한 워크스페이스에서 이어드릴게요.",
  "PR·이슈 작업, 팀 대화, API·ERD 문서가 같은 흐름으로 이어져요.",
  "CodeDock은 결정과 기록이 흩어지지 않도록 GitHub 작업, 팀 채팅, 문서 허브를 하나의 개발 워크스페이스로 묶습니다.",
];

// 5단계 × 2초 = 단계당 2000ms로 순차 노출됩니다.
const INTRO_DURATION_MS = 10000;
// introDialogueCopy(KO/EN)의 단계 수와 일치해야 합니다.
const INTRO_STEP_COUNT = 5;
// 말풍선 등장/퇴장 전환 시간(ms). mode="wait"라 다음 단계는 이 시간만큼 늦게 뜨므로,
// 단계 타이머를 같은 값만큼 당겨 각 단계의 노출 시간을 균등하게 맞춥니다.
const INTRO_SWAP_MS = 420;

const featureCards = [
  {
    icon: GitPullRequest,
    title: "GitHub 워크스페이스",
    description: "PR·이슈·변경 파일을 한 화면에. 소스에서 결정까지 탭 전환 없이.",
    tone: "var(--neon-cyan)",
  },
  {
    icon: MessageSquare,
    title: "팀 채팅 · 결정 로그",
    description: "리뷰 질문과 결정을 채팅에 남기면, 다음에 같은 고민을 반복하지 않습니다.",
    tone: "var(--soft-mint)",
  },
  {
    icon: FileText,
    title: "문서 허브",
    description: "API 명세·ERD·리뷰 문서를 PR·이슈에 연결해 배포 후에도 추적됩니다.",
    tone: "#FFD166",
  },
];

const workspaceFlow = [
  "저장소 연결",
  "PR·이슈·변경 모으기",
  "채팅에서 리뷰 정리",
  "문서·결정으로 기록",
];

const toneAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

type LandingSection = "hero" | "features" | "flow" | "closing";

export function HomePage() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [showIntro, setShowIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);
  const [hoveredSignalIndex, setHoveredSignalIndex] = useState<number | null>(null);
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number | null>(0);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [featureScrollProgress, setFeatureScrollProgress] = useState(0);
  const [hoveredFlowIndex, setHoveredFlowIndex] = useState<number | null>(null);
  const [flowScrollProgress, setFlowScrollProgress] = useState(0);
  const [isCtaHovering, setIsCtaHovering] = useState(false);
  const [activeLandingSection, setActiveLandingSection] = useState<LandingSection>("hero");
  const [typedMascotText, setTypedMascotText] = useState("");
  const originalBodyOverflow = useRef("");
  const heroRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const flowRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const heroInView = useInView(heroRef, { amount: 0.12 });
  const featuresInView = useInView(featuresRef, { amount: 0.12 });
  const flowInView = useInView(flowRef, { amount: 0.12 });
  const closingInView = useInView(closingRef, { amount: 0.12 });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 130, damping: 22, mass: 0.35 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 130, damping: 22, mass: 0.35 });
  const mascotRotateY = useTransform(smoothPointerX, [-1, 1], [-8, 8]);
  const mascotRotateX = useTransform(smoothPointerY, [-1, 1], [5, -5]);
  const mascotShiftX = useTransform(smoothPointerX, [-1, 1], [-12, 12]);
  const mascotEyeX = useTransform(smoothPointerX, [-1, 1], [-4.5, 4.5]);
  const mascotEyeY = useTransform(smoothPointerY, [-1, 1], [-3.2, 3.2]);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mascotScrollY = useTransform(heroScrollProgress, [0, 1], [0, -34]);
  const mascotScrollScale = useTransform(heroScrollProgress, [0, 0.7, 1], [1, 1.035, 0.95]);
  const mascotScrollOpacity = useTransform(heroScrollProgress, [0, 0.85, 1], [1, 0.92, 0.76]);
  const isEnglish = language === "en";
  const introDialogueCopy = isEnglish
    ? [
        {
          id: "brand",
          eyebrow: "CodeDock",
          title: "GitHub, chat, and docs in one workspace.",
          lines: ["GitHub, chat, and docs are all here. ☕"],
        },
        {
          id: "github",
          eyebrow: "GitHub",
          title: "Repositories, PRs, and issues in one place.",
          lines: ["Changed files and AI review summaries, one screen."],
        },
        {
          id: "chat",
          eyebrow: "Team Chat",
          title: "Review questions and decisions stay in chat.",
          lines: ["So the team never repeats the same debate."],
        },
        {
          id: "docs",
          eyebrow: "Docs",
          title: "API specs and ERDs in the same flow.",
          lines: ["Decisions stay traceable after release."],
        },
        {
          id: "invite",
          eyebrow: "Let's dive in",
          title: "Shall we dive into the sea of code together?",
          lines: ["Let's open your workspace with GitHub. 🌊"],
        },
      ]
    : [
        {
          id: "brand",
          eyebrow: "CodeDock",
          title: "GitHub · 채팅 · 문서, 한 워크스페이스에서.",
          lines: ["GitHub, 채팅, 문서... 다 모셔뒀어요. ☕"],
        },
        {
          id: "github",
          eyebrow: "GitHub",
          title: "저장소·PR·이슈를 한곳에 모아요.",
          lines: ["변경 파일과 AI 리뷰 요약까지 한 화면에서."],
        },
        {
          id: "chat",
          eyebrow: "팀 채팅",
          title: "리뷰 질문과 결정을 채팅에 남겨요.",
          lines: ["같은 고민을 다시 반복하지 않도록."],
        },
        {
          id: "docs",
          eyebrow: "문서",
          title: "API·ERD 문서까지 한 흐름으로.",
          lines: ["배포 후에도 결정이 추적돼요."],
        },
        {
          id: "invite",
          eyebrow: "함께 출항",
          title: "우리 같이 코드의 바다에 빠져볼까요?",
          lines: ["지금 GitHub으로 워크스페이스를 열어드릴게요. 🌊"],
        },
      ];
  const activeIntroDialogue = introDialogueCopy[introStep] ?? introDialogueCopy[0];
  const introFeatureTags = isEnglish
    ? ["GitHub", "PRs", "Issues", "Team Chat", "API Docs", "ERD"]
    : ["GitHub", "PR", "이슈", "팀 채팅", "API 명세", "ERD"];
  const mascotMessagesCopy = isEnglish
    ? [
        "GitHub, chat, and docs are all here. ☕",
        "PRs and issues are all in one place.",
        "Decisions stay beside the work.",
        "Docs are ready for the next sprint.",
      ]
    : mascotMessages;
  const reviewSignalsCopy = isEnglish
    ? [
        { label: "GitHub sync", value: "PRs", tone: "var(--neon-cyan)", progress: 76 },
        { label: "Team chat", value: "Live", tone: "var(--soft-mint)", progress: 88 },
        { label: "Docs hub", value: "API", tone: "#FFD166", progress: 100 },
      ]
    : reviewSignals;
  const featureCardsCopy = isEnglish
    ? [
        {
          icon: GitPullRequest,
          title: "GitHub workspace",
          description: "PRs, issues, and changed files in one screen. From source to decision without tab hopping.",
          tone: "var(--neon-cyan)",
        },
        {
          icon: MessageSquare,
          title: "Team chat · decision log",
          description: "Keep review questions and decisions in chat so the team does not repeat the same debate.",
          tone: "var(--soft-mint)",
        },
        {
          icon: FileText,
          title: "Docs hub",
          description: "Link API specs, ERDs, and review docs to PRs and issues so they stay traceable after release.",
          tone: "#FFD166",
        },
      ]
    : featureCards;
  const signalDetailsCopy = isEnglish
    ? [
        "GitHub PRs, issues, and changed files come together in one workspace with the AI review process.",
        "Team chat stays beside the work so review questions and decisions do not get lost.",
        "API specs, ERDs, notes, and review docs stay tied to PRs and issues.",
      ]
    : [
        "GitHub의 PR, 이슈, 변경 파일을 AI 리뷰 프로세스와 함께 한 워크스페이스로 모아요.",
        "팀 채팅을 작업 옆에 붙여 리뷰 질문과 결정 사항이 흩어지지 않게 해요.",
        "문서와 PR·이슈 프로세스를 한 번에 이어줘요.",
      ];
  const featureDetailsCopy = isEnglish
    ? [
        {
          eyebrow: "GitHub",
          title: "GitHub work sits at the center of the workspace.",
          description:
            "CodeDock brings repositories, PRs, issues, changed files, AI summaries, and review process into one screen so the team can move from source to decision without tab hopping.",
          bullets: ["Connected repository", "PR and issue process", "AI review summary"],
        },
        {
          eyebrow: "Team Chat",
          title: "Team chat becomes the decision log.",
          description:
            "Review questions, technical decisions, and follow-up notes stay in chat beside the GitHub process, so the team does not repeat the same debate later.",
          bullets: ["Review discussion", "Decision log", "Follow-up notes"],
        },
        {
          eyebrow: "Docs",
          title: "Docs become the record for every decision.",
          description:
            "API specs, ERDs, meeting notes, and review documents stay linked to PRs, issues, and chat decisions so knowledge remains traceable after the work ships.",
          bullets: ["API spec page", "ERD diagram", "Review documents"],
        },
      ]
    : [
        {
          eyebrow: "GitHub",
          title: "GitHub 작업이 워크스페이스의 중심이 돼요.",
          description:
            "저장소·PR·이슈·변경 파일을 한 화면에서 바로 확인하고 결정해요.",
          bullets: ["저장소 연결", "PR·이슈 프로세스", "AI 리뷰 요약"],
        },
        {
          eyebrow: "팀 채팅",
          title: "팀 대화가 결정 로그로 남아요.",
          description:
            "리뷰 질문, 기술 결정, 후속 메모를 채팅에서 바로 정리해 같은 고민의 반복을 줄입니다.",
          bullets: ["리뷰 대화", "결정 로그", "후속 메모"],
        },
        {
          eyebrow: "문서",
          title: "문서가 모든 결정의 기록으로 남아요.",
          description:
            "API 명세와 ERD를 PR·이슈·채팅 결정에 연결해요. 배포 후에도 팀 지식이 추적됩니다.",
          bullets: ["API 명세 화면", "ERD 다이어그램", "리뷰 문서"],
        },
      ];
  const workspaceFlowCopy = isEnglish
    ? ["Connect the repository", "Collect PRs, issues, and changes", "Resolve reviews in team chat", "Record decisions in docs"]
    : workspaceFlow;
  const landingCopy = {
    skipIntro: isEnglish ? "Skip" : "건너뛰기",
    badge: isEnglish ? "GitHub, chat, and docs in one workspace" : "GitHub · 채팅 · 문서, 하나의 워크스페이스로",
    headlinePrefix: isEnglish ? "Where code ships safely," : "코드가 안전하게 출항하는 곳,",
    headlineBrand: "CodeDock",
    subtitle: isEnglish
      ? "PRs, team chat, and docs flow as one. Decisions stop scattering."
      : "PR·이슈 작업, 팀 대화, API·ERD 문서가 같은 흐름으로 이어집니다. 결정과 기록, 작업을 한 워크스페이스에서 이어가세요.",
    start: isEnglish ? "Start with GitHub" : "GitHub으로 시작하기",
    mascotTitle: isEnglish ? "GitHub, chat, and docs connected" : "GitHub · 채팅 · 문서 연결 완료",
    flowEyebrow: isEnglish ? "Workflow" : "작업 흐름",
    flowTitle: isEnglish ? "From connect to record, one connected flow." : "연결에서 기록까지, 하나의 흐름으로 이어집니다.",
    catTitle: isEnglish ? "Today's decisions, ready for the next sprint." : "오늘 내린 결정, 다음 스프린트에서도 그대로.",
    catDescription: isEnglish
      ? "GitHub, chat, and docs stay in one workspace. Open your workspace now."
      : "GitHub · 채팅 · 문서, 한 워크스페이스에서. 지금 시작하세요.",
    points: isEnglish
      ? [
          { icon: GitPullRequest, label: "Repositories, PRs, issues, and changed files stay together in one workspace." },
          { icon: MessageSquare, label: "Review questions and decisions stay beside team chat." },
          { icon: Code2, label: "API specs and ERDs remain traceable from PRs and issues." },
          { icon: FileText, label: "Review notes and decisions become records for the next sprint." },
        ]
      : [
          { icon: GitPullRequest, label: "저장소, PR, 이슈, 변경 파일이 한 워크스페이스에 모입니다." },
          { icon: MessageSquare, label: "리뷰 질문과 결정은 팀 채팅 옆에 남습니다." },
          { icon: Code2, label: "API 명세와 ERD는 PR·이슈에서 추적됩니다." },
          { icon: FileText, label: "리뷰 노트와 결정 사항은 다음 스프린트의 기록이 됩니다." },
        ],
  };

  const sectionMascotMessages: Record<LandingSection, string> = isEnglish
    ? {
        hero: "GitHub, chat, and docs are all here. ☕",
        features: "The workspace keeps source, decisions, and records connected.",
        flow: "I am wiring the flow from connect to record.",
        closing: "Today's decisions are ready for the next sprint.",
      }
    : {
        hero: "GitHub, 채팅, 문서... 다 모셔뒀어요. ☕",
        features: "소스, 결정, 기록이 한 워크스페이스에서 이어져요.",
        flow: "연결부터 기록까지 순서대로 이어둘게요.",
        closing: "오늘 내린 결정, 다음 스프린트에서도 그대로 남겨둘게요.",
      };
  const signalMascotMessages = isEnglish
    ? [
        "GitHub work is synced into the workspace.",
        "Team chat keeps decisions beside the work.",
        "Docs stay tied to PRs and issues.",
      ]
    : [
        "워크스페이스에서 GitHub 작업을 직접 할 수 있어요.",
        "팀 채팅에서 결정 사항을 수정하고 바로 작업할 수 있어요.",
        "문서도 PR·이슈 프로세스를 보면서 함께 작성해요.",
      ];
  const flowMascotMessages = isEnglish
    ? [
        "First, connect the repository.",
        "Then collect PRs, issues, and changes.",
        "Next, check reviews in team chat.",
        "Finally, record decisions in docs.",
      ]
    : [
        "먼저 저장소를 연결해요.",
        "PR, 이슈, 변경 파일을 모을게요.",
        "팀 채팅에서 리뷰를 점검해요.",
        "마지막 결정은 문서로 남겨요.",
      ];
  const activeSignalIndex = hoveredSignalIndex ?? selectedSignalIndex;
  const mascotSignalIndex = hoveredSignalIndex ?? (activeLandingSection === "hero" ? selectedSignalIndex : null);
  const mascotFeatureIndex = activeLandingSection === "features" ? activeFeatureIndex : null;
  const activeFeature = featureCardsCopy[activeFeatureIndex] ?? featureCardsCopy[0];
  const activeFeatureDetail = featureDetailsCopy[activeFeatureIndex] ?? featureDetailsCopy[0];
  const flowAutoIndex =
    flowScrollProgress <= 0.04
      ? -1
      : Math.min(workspaceFlowCopy.length - 1, Math.max(0, Math.ceil(flowScrollProgress * workspaceFlowCopy.length) - 1));
  const flowActiveEndIndex = hoveredFlowIndex ?? flowAutoIndex;
  const featureProgressPercent = Math.round(featureScrollProgress * 100);
  const flowProgressPercent = Math.round(flowScrollProgress * 100);
  const activeMascotMessage = isCtaHovering
    ? isEnglish
      ? "Ready. Shall we open your workspace?"
      : "준비 끝났어요. 워크스페이스 열어드릴까요?"
    : hoveredSignalIndex !== null
      ? signalMascotMessages[hoveredSignalIndex] ?? sectionMascotMessages.hero
      : hoveredFlowIndex !== null
        ? flowMascotMessages[hoveredFlowIndex] ?? sectionMascotMessages.flow
        : activeLandingSection === "hero" && selectedSignalIndex !== null
          ? signalMascotMessages[selectedSignalIndex] ?? sectionMascotMessages.hero
          : sectionMascotMessages[activeLandingSection];
  const activeMascotBubbleText = getMascotBubbleText(activeMascotMessage, isEnglish);
  const mascotMood =
    isCtaHovering
      ? "cta"
      : mascotSignalIndex === 2 || mascotFeatureIndex === 2 || activeLandingSection === "flow" || activeLandingSection === "closing"
          ? "success"
          : mascotSignalIndex !== null || mascotFeatureIndex !== null || hoveredFlowIndex !== null || activeLandingSection === "features"
            ? "focus"
            : "idle";
  const floatingMascotLabel = isEnglish ? "CodeDock is here" : "CodeDock 대기 중";
  const shouldAnimateIntro = !prefersReducedMotion && showIntro;
  const shouldAnimateHero = !prefersReducedMotion && heroInView;
  const shouldAnimateFeatures = !prefersReducedMotion && featuresInView;
  const shouldAnimateFlow = !prefersReducedMotion && flowInView;
  const shouldAnimateClosing = !prefersReducedMotion && closingInView;

  useEffect(() => {
    setIntroStep(0);
    originalBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const stepDuration = INTRO_DURATION_MS / INTRO_STEP_COUNT;
    const introStepTimers = Array.from({ length: INTRO_STEP_COUNT - 1 }, (_, index) =>
      window.setTimeout(() => {
        setIntroStep(index + 1);
      }, Math.max(0, stepDuration * (index + 1) - INTRO_SWAP_MS)),
    );

    const introTimer = window.setTimeout(() => {
      setShowIntro(false);
      document.body.style.overflow = originalBodyOverflow.current;
    }, INTRO_DURATION_MS);

    return () => {
      introStepTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(introTimer);
      document.body.style.overflow = originalBodyOverflow.current;
    };
  }, []);

  useEffect(() => {
    if (showIntro) {
      return;
    }

    const sectionRefs: Array<[LandingSection, HTMLElement | null]> = [
      ["hero", heroRef.current],
      ["features", featuresRef.current],
      ["flow", flowRef.current],
      ["closing", closingRef.current],
    ];

    let frameId = 0;
    const updateActiveSection = () => {
      const targetY = window.innerHeight * 0.56;
      const nextSection = sectionRefs
        .map(([sectionName, element]) => {
          if (!element) {
            return [sectionName, Number.POSITIVE_INFINITY] as const;
          }

          const rect = element.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const isNearViewport = rect.bottom > 90 && rect.top < window.innerHeight - 80;

          return [sectionName, isNearViewport ? Math.abs(sectionCenter - targetY) : Number.POSITIVE_INFINITY] as const;
        })
        .sort((a, b) => a[1] - b[1])[0];

      if (nextSection && Number.isFinite(nextSection[1])) {
        setActiveLandingSection(nextSection[0]);
      }
    };
    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [showIntro]);

  useEffect(() => {
    if (showIntro) {
      return;
    }

    let frameId = 0;
    const updateFeatureProgress = () => {
      const element = featuresRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const stickyOffset = 128;
      const visibleHeight = Math.max(1, window.innerHeight - 240);
      const travel = Math.max(1, rect.height - visibleHeight);
      const nextProgress = Math.min(1, Math.max(0, (window.scrollY - (sectionTop - stickyOffset)) / travel));
      const stepSize = 1 / featureCardsCopy.length;
      const nextFeatureIndex = Math.min(
        featureCardsCopy.length - 1,
        Math.max(0, Math.floor(nextProgress / stepSize)),
      );

      setFeatureScrollProgress((currentProgress) =>
        Math.abs(currentProgress - nextProgress) < 0.01 ? currentProgress : nextProgress,
      );
      setActiveFeatureIndex((currentIndex) =>
        currentIndex === nextFeatureIndex ? currentIndex : nextFeatureIndex,
      );
    };
    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateFeatureProgress);
    };

    updateFeatureProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [featureCardsCopy.length, showIntro]);

  useEffect(() => {
    if (showIntro) {
      return;
    }

    let frameId = 0;
    const updateFlowProgress = () => {
      const element = flowRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewportStart = window.innerHeight * 0.82;
      const viewportEnd = window.innerHeight * 0.34;
      const travel = Math.max(1, viewportStart - viewportEnd);
      const nextProgress = Math.min(1, Math.max(0, (viewportStart - rect.top) / travel));

      setFlowScrollProgress((currentProgress) =>
        Math.abs(currentProgress - nextProgress) < 0.01 ? currentProgress : nextProgress,
      );
    };
    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateFlowProgress);
    };

    updateFlowProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [showIntro]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedMascotText(activeMascotBubbleText);
      return;
    }

    setTypedMascotText("");

    let characterIndex = 0;
    const typingTimer = window.setInterval(() => {
      characterIndex += 1;
      setTypedMascotText(activeMascotBubbleText.slice(0, characterIndex));

      if (characterIndex >= activeMascotBubbleText.length) {
        window.clearInterval(typingTimer);
      }
    }, 28);

    return () => window.clearInterval(typingTimer);
  }, [activeMascotBubbleText, prefersReducedMotion]);

  const skipIntro = () => {
    document.body.style.overflow = originalBodyOverflow.current;
    setShowIntro(false);
  };

  const trackMascotPointer = (event: PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion) {
      return;
    }

    const eventTarget = event.target instanceof HTMLElement ? event.target : null;
    setIsCtaHovering(Boolean(eventTarget?.closest("[data-landing-cta='true']")));

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    pointerX.set(Math.max(-1, Math.min(1, x)));
    pointerY.set(Math.max(-1, Math.min(1, y)));
  };

  const resetMascotPointer = () => {
    setIsCtaHovering(false);
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro && (
          <motion.section
            key="landing-intro"
            className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-5 [&_h2]:break-keep [&_h2]:[text-wrap:balance] [&_p]:break-keep [&_p]:[text-wrap:pretty] [&_span]:break-keep"
            style={{
              background: `
                radial-gradient(circle at 50% 38%, ${colors.primary}, 0.18), transparent 34%),
                linear-gradient(145deg, #050B14, #0B1628)
              `,
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.58, ease: "easeInOut" }}
          >
            <motion.button
              type="button"
              aria-label={landingCopy.skipIntro}
              onClick={skipIntro}
              className="absolute right-4 top-4 z-10 inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black tracking-tight transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B14] active:scale-95 sm:right-8 sm:top-8"
              style={{
                background: "rgba(5, 11, 20, 0.74)",
                border: `1px solid ${colors.primary}, 0.22)`,
                boxShadow: `0 14px 34px rgba(0,0,0,0.28), 0 0 20px ${colors.primary}, 0.10)`,
                color: "#DFFAFF",
                backdropFilter: prefersReducedMotion ? "none" : "blur(18px) saturate(180%)",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.25, ease: "easeOut" }}
            >
              <X size={17} strokeWidth={2.8} style={{ color: colors.primaryHex }} />
              <span>{landingCopy.skipIntro}</span>
            </motion.button>

            <motion.div
              className="relative flex w-full max-w-[820px] flex-col items-center text-center"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.96 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="grid w-full grid-cols-[minmax(120px,0.44fr)_minmax(0,0.56fr)] items-center gap-3 sm:gap-6">
                <motion.div
                  className="relative h-[150px] w-full min-[430px]:h-[190px] sm:h-[260px]"
                  initial={{ y: 22, scale: 0.84, opacity: 0 }}
                  animate={{ y: shouldAnimateIntro ? [0, -8, 0] : 0, scale: 1, opacity: 1 }}
                  transition={{
                    y: shouldAnimateIntro
                      ? { duration: 3.1, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.2, ease: "easeOut" },
                    scale: { duration: 0.52, ease: "backOut" },
                    opacity: { duration: 0.35 },
                  }}
                >
                  <CoffeeLogo
                    alive={!prefersReducedMotion}
                    className="h-full w-full"
                    style={{
                      filter: `drop-shadow(0 0 30px ${colors.primary}, 0.28)) drop-shadow(0 18px 34px rgba(0,0,0,0.42))`,
                    }}
                  />
                </motion.div>

                <div className="grid min-w-0 text-left">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeIntroDialogue.id}
                      className="relative w-fit max-w-full rounded-[28px] px-4 py-4 tracking-tight sm:px-6 sm:py-5"
                      style={{
                        background:
                          activeIntroDialogue.id === "brand"
                            ? `linear-gradient(135deg, ${colors.primary}, 0.18), rgba(234, 247, 255, 0.07))`
                            : "linear-gradient(145deg, rgba(5, 11, 20, 0.84), rgba(11, 22, 40, 0.78))",
                        border: `1px solid ${colors.primary}, ${activeIntroDialogue.id === "brand" ? "0.32" : "0.20"})`,
                        boxShadow: `0 0 30px ${colors.primary}, 0.15), inset 0 1px 0 rgba(255,255,255,0.12)`,
                        color: "#DFFAFF",
                        backdropFilter: prefersReducedMotion ? "none" : "blur(18px) saturate(180%)",
                        maxWidth: "min(100%, 560px)",
                      }}
                      initial={{ opacity: 0, x: -18, scale: 0.94, filter: "blur(8px)" }}
                      animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: 18, scale: 0.96, filter: "blur(8px)" }}
                      transition={{ duration: INTRO_SWAP_MS / 1000, ease: "easeOut" }}
                    >
                      <span
                        className="mb-2 inline-flex rounded-full px-3 py-1 text-sm font-black uppercase tracking-tight sm:text-sm"
                        style={{
                          background: `${colors.primary}, 0.12)`,
                          border: `1px solid ${colors.primary}, 0.22)`,
                          color: colors.primaryHex,
                        }}
                      >
                        {activeIntroDialogue.eyebrow}
                      </span>
                      <h2 className="m-0 text-base font-black leading-tight sm:text-2xl" style={{ color: "var(--white)" }}>
                        {activeIntroDialogue.title}
                      </h2>
                      <div className="mt-3 grid gap-1.5">
                        {activeIntroDialogue.lines.map((line, lineIndex) => (
                          <motion.p
                            key={line}
                            className="m-0 text-sm font-black leading-5 sm:text-sm sm:leading-6"
                            style={{ color: lineIndex === 0 && activeIntroDialogue.id === "brand" ? colors.primaryHex : "#DFFAFF" }}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, delay: 0.12 + lineIndex * 0.12, ease: "easeOut" }}
                          >
                            {line}
                          </motion.p>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {introStep >= 1 && (
                  <motion.div
                    className="mt-6 flex flex-wrap justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.36, ease: "easeOut" }}
                  >
                {introFeatureTags.map((item) => (
                  <span
                    key={item}
                    className="rounded-full px-3 py-2 text-sm font-black tracking-tight"
                    style={{
                      background: "rgba(234, 247, 255, 0.055)",
                      border: `1px solid ${colors.primary}, 0.14)`,
                      color: "#CFF8FF",
                    }}
                  >
                    {item}
                  </span>
                ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          className="mx-auto w-[min(1180px,calc(100vw-32px))] pb-0 pt-0 [&_h1]:break-keep [&_h1]:[text-wrap:balance] [&_h2]:break-keep [&_h2]:[text-wrap:balance] [&_h3]:break-keep [&_h3]:[text-wrap:balance] [&_p]:break-keep [&_p]:[text-wrap:pretty] [&_span]:break-keep"
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
        >
      <motion.section
        ref={heroRef}
        data-landing-section="hero"
        onPointerMove={trackMascotPointer}
        onPointerLeave={resetMascotPointer}
        onPointerCancel={resetMascotPointer}
        className="relative mb-8 mt-8 grid min-h-[clamp(470px,calc(100svh-14rem),510px)] items-center gap-6 overflow-hidden rounded-[38px] px-6 py-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(360px,1.06fr)] md:px-12 md:py-7"
        style={{
          background: `
            linear-gradient(122deg, ${colors.primary}, 0.12), transparent 38%),
            linear-gradient(145deg, rgba(11, 22, 40, 0.88), rgba(5, 11, 20, 0.72)),
            rgba(11, 22, 40, 0.76)
          `,
          border: `1px solid ${colors.primary}, 0.22)`,
          boxShadow: `
            0 30px 90px rgba(0, 0, 0, 0.42),
            0 0 76px ${colors.primary}, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.12)
          `,
          backdropFilter: prefersReducedMotion ? "none" : "blur(22px) saturate(180%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(90deg, ${colors.primary}, 0.08), transparent 34%, rgba(255,209,102,0.06) 56%, rgba(var(--codedock-secondary-rgb),0.07) 70%, transparent),
              linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 34px 34px, 34px 34px",
            maskImage: "linear-gradient(90deg, black 0%, black 68%, transparent 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 self-center"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: `${colors.primary}, 0.09)`,
              border: `1px solid ${colors.primary}, 0.22)`,
              color: colors.primaryHex,
            }}
          >
            <motion.span
              className="h-2 w-2 rounded-full"
              style={{
                background: "var(--matrix-green)",
                boxShadow: "0 0 0 5px rgba(var(--codedock-secondary-rgb),0.13), 0 0 16px rgba(var(--codedock-secondary-rgb),0.7)",
              }}
              animate={shouldAnimateHero ? { scale: [1, 1.55, 1], opacity: [0.74, 1, 0.74] } : { scale: 1, opacity: 0.84 }}
              transition={shouldAnimateHero ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            />
            <span className="text-sm font-black tracking-tight">{landingCopy.badge}</span>
          </div>

          <h1
            className="mt-5 max-w-[720px] leading-[1.04] tracking-tight"
            style={{
              color: "var(--white)",
              fontSize: "clamp(30px, 3.8vw, 52px)",
              fontWeight: 950,
              textShadow: `0 0 22px ${colors.primary}, 0.18)`,
            }}
          >
            {isEnglish ? (
              landingCopy.headlinePrefix
            ) : (
              <>
                코드가 안전하게
                <br />
                출항하는 곳,
              </>
            )}
            <br />
            <span>
              <span style={{ color: "var(--white)" }}>Code</span>
              <span style={{ color: colors.primaryHex }}>Dock</span>
            </span>
          </h1>

          <p
            className="m-0 mt-5 max-w-[640px] text-base font-bold leading-7 tracking-tight sm:text-lg sm:leading-8"
            style={{ color: "rgba(223,250,255,0.82)" }}
          >
            {landingCopy.subtitle}
          </p>

          <motion.div
            className="mt-6 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.22, ease: "easeOut" }}
          >
            <Link
              to="/login"
              data-landing-cta="true"
              onMouseEnter={() => setIsCtaHovering(true)}
              onMouseLeave={() => setIsCtaHovering(false)}
              onPointerEnter={() => setIsCtaHovering(true)}
              onPointerLeave={() => setIsCtaHovering(false)}
              onFocus={() => setIsCtaHovering(true)}
              onBlur={() => setIsCtaHovering(false)}
              className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 no-underline tracking-tight transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B14] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                boxShadow: `0 0 30px ${colors.primary}, 0.24), 0 14px 34px rgba(0,0,0,0.28)`,
                color: "#021014",
                fontSize: "16px",
                fontWeight: 950,
              }}
            >
              <motion.span
                className="pointer-events-none absolute inset-y-0 -left-16 w-14 rotate-12 bg-white/45"
                initial={false}
                animate={{ x: isCtaHovering ? 250 : 0, opacity: isCtaHovering ? [0, 0.75, 0] : 0 }}
                transition={{ duration: 0.72, ease: "easeOut" }}
              />
              <span className="relative">{landingCopy.start}</span>
              <ArrowRight
                size={19}
                strokeWidth={2.7}
                className="relative transition-transform group-hover:translate-x-1"
              />
            </Link>
          </motion.div>

          <div
            className="mt-6 flex items-center gap-3 rounded-[24px] p-3 lg:hidden"
            style={{
              background: "rgba(234, 247, 255, 0.05)",
              border: `1px solid ${colors.primary}, 0.16)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <motion.div
              className="h-24 w-24 flex-shrink-0 sm:h-28 sm:w-28"
              animate={shouldAnimateHero ? { y: [0, -5, 0] } : { y: 0 }}
              transition={shouldAnimateHero ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            >
              <CoffeeLogo
                alive={!prefersReducedMotion}
                mood={mascotMood}
                className="h-full w-full"
                style={{ filter: `drop-shadow(0 0 20px ${colors.primary}, 0.22))` }}
              />
            </motion.div>
            <div className="grid min-w-0 gap-2">
              <MascotTypingBubble
                compact
                text={typedMascotText}
                primary={colors.primary}
                primaryHex={colors.primaryHex}
                tail="left"
                animateTyping={shouldAnimateHero}
              />
            </div>
          </div>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative z-10 hidden self-center lg:block"
        >
          <motion.div
            className="relative overflow-hidden rounded-[34px] p-4 md:p-5"
            style={{
              ...(prefersReducedMotion
                ? {}
                : {
                    x: mascotShiftX,
                    y: mascotScrollY,
                    scale: mascotScrollScale,
                    opacity: mascotScrollOpacity,
                    rotateX: mascotRotateX,
                    rotateY: mascotRotateY,
                    transformPerspective: 950,
                    transformStyle: "preserve-3d",
                  }),
              background: `
                linear-gradient(145deg, rgba(16,31,52,0.96), rgba(5,11,20,0.88)),
                rgba(11,22,40,0.92)
              `,
              border: `1px solid ${colors.primary}, 0.22)`,
              boxShadow: `
                inset 0 1px 0 rgba(255,255,255,0.10),
                0 20px 60px rgba(0,0,0,0.34)
              `,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
                  {isEnglish ? "CODEDOCK MASCOT" : "CODEDOCK 마스코트"}
                </p>
                <h2 className="m-0 mt-1 text-lg font-black tracking-tight" style={{ color: "var(--white)" }}>
                  {landingCopy.mascotTitle}
                </h2>
              </div>
              <div
                className="rounded-full px-3 py-1.5 text-sm font-black tracking-tight"
                style={{
                  background: "rgba(var(--codedock-secondary-rgb),0.10)",
                  border: "1px solid rgba(var(--codedock-secondary-rgb),0.24)",
                  color: "var(--soft-mint)",
                }}
              >
                {isEnglish ? "LIVE" : "실시간"}
              </div>
            </div>

            <div
              className="relative grid min-h-[280px] gap-3 overflow-hidden rounded-[28px] px-4 py-4 sm:min-h-[270px] sm:px-5 lg:min-h-[230px] lg:grid-cols-[minmax(0,0.76fr)_minmax(220px,1fr)] lg:items-center"
              style={{
                background: `
                  linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
                  rgba(234, 247, 255, 0.035)
                `,
                backgroundSize: "30px 30px",
                border: `1px solid ${colors.primary}, 0.14)`,
              }}
            >
              <div className="relative z-10 grid w-full max-w-[320px] gap-2.5">
                <MascotTypingBubble
                  text={typedMascotText}
                primary={colors.primary}
                primaryHex={colors.primaryHex}
                tail="right"
                animateTyping={shouldAnimateHero}
              />
              </div>

              <motion.div
                animate={shouldAnimateHero ? { y: [0, -8, 0] } : { y: 0 }}
                transition={shouldAnimateHero ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className="relative z-0 mt-5 self-center sm:mt-4 sm:self-end lg:mt-0 lg:self-center lg:justify-self-end"
              >
                <CoffeeLogo
                  alive={!prefersReducedMotion}
                  mood={mascotMood}
                  eyeX={mascotEyeX}
                  eyeY={mascotEyeY}
                  className="w-full max-w-[240px] sm:max-w-[270px] lg:max-w-[230px]"
                  style={{ filter: `drop-shadow(0 0 28px ${colors.primary}, 0.28))` }}
                />
              </motion.div>
            </div>

            <div className="mt-2.5 grid gap-2 lg:grid-cols-3">
              {reviewSignalsCopy.map((signal, index) => {
                const isSignalActive = activeSignalIndex === index;

                return (
                  <motion.div
                    key={signal.label}
                    data-review-signal={index + 1}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedSignalIndex === index}
                    className="relative cursor-pointer overflow-hidden rounded-[18px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B14]"
                    style={{
                      background: isSignalActive
                        ? `linear-gradient(135deg, ${toneAlpha(signal.tone, 10)}, rgba(234, 247, 255, 0.06))`
                        : "rgba(234, 247, 255, 0.055)",
                      border: `1px solid ${isSignalActive ? signal.tone : `${colors.primary}, 0.13)`}`,
                      boxShadow: isSignalActive
                        ? `0 0 22px ${toneAlpha(signal.tone, 14)}, inset 0 1px 0 rgba(255,255,255,0.10)`
                        : "inset 0 1px 0 rgba(255,255,255,0.07)",
                      color: "#DFFAFF",
                      transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                    }}
                    onMouseEnter={() => setHoveredSignalIndex(index)}
                    onMouseLeave={() => setHoveredSignalIndex(null)}
                    onPointerEnter={() => setHoveredSignalIndex(index)}
                    onPointerLeave={() => setHoveredSignalIndex(null)}
                    onClick={() => setSelectedSignalIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedSignalIndex(index);
                      }
                    }}
                    onFocus={() => setHoveredSignalIndex(index)}
                    onBlur={() => setHoveredSignalIndex(null)}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <span className="text-sm font-black tracking-tight xl:text-sm">{signal.label}</span>
                      <span className="text-sm font-black tracking-tight xl:text-sm" style={{ color: signal.tone }}>
                        {signal.value}
                      </span>
                    </div>
                    <div
                      className="relative z-10 mt-2 h-1.5 overflow-hidden rounded-full"
                      style={{
                        background: "rgba(234, 247, 255, 0.08)",
                        border: "1px solid rgba(234, 247, 255, 0.08)",
                      }}
                    >
                      <motion.div
                        data-review-fill={index + 1}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${signal.tone}, ${colors.primaryHex})`,
                          boxShadow: `0 0 14px ${toneAlpha(signal.tone, 40)}`,
                        }}
                        initial={false}
                        animate={{ width: isSignalActive ? `${signal.progress}%` : "0%" }}
                        transition={{ duration: 0.42, ease: "easeOut" }}
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {isSignalActive && (
                        <motion.p
                          data-review-signal-detail={index + 1}
                          className="relative z-10 m-0 mt-3 text-sm font-semibold leading-5 tracking-tight lg:hidden"
                          style={{ color: "#CFF8FF" }}
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          {signalDetailsCopy[index]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              <AnimatePresence mode="wait">
                {activeSignalIndex !== null && (
                  <motion.p
                    key={reviewSignalsCopy[activeSignalIndex]?.label}
                    data-review-signal-detail={activeSignalIndex + 1}
                    className="relative z-10 m-0 hidden rounded-[18px] px-3 py-2 text-sm font-semibold leading-5 tracking-tight lg:col-span-3 lg:block"
                    style={{
                      background: "rgba(234, 247, 255, 0.055)",
                      border: `1px solid ${toneAlpha(reviewSignalsCopy[activeSignalIndex]?.tone ?? colors.primaryHex, 27)}`,
                      color: "#CFF8FF",
                    }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    {signalDetailsCopy[activeSignalIndex]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      <section
        ref={featuresRef}
        data-landing-section="features"
        className="relative mt-0 lg:min-h-[calc(340svh-34rem)]"
      >
        <div className="grid min-h-[clamp(460px,calc(100svh-15rem),500px)] gap-5 lg:sticky lg:top-32 lg:grid-cols-[minmax(280px,0.86fr)_minmax(420px,1.14fr)] lg:items-center">
          <motion.div
            className="relative overflow-hidden rounded-[30px] p-5 md:p-6"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.46, ease: "easeOut" }}
            style={{
              background: `
                linear-gradient(145deg, rgba(11, 22, 40, 0.78), rgba(5, 11, 20, 0.66)),
                rgba(11, 22, 40, 0.70)
              `,
              border: `1px solid ${colors.primary}, 0.16)`,
              boxShadow: "0 12px 36px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.07)",
              backdropFilter: prefersReducedMotion ? "none" : "blur(16px) saturate(160%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  linear-gradient(90deg, ${colors.primary}, 0.09), transparent 48%, rgba(255,209,102,0.05)),
                  linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
                `,
                backgroundSize: "100% 100%, 32px 32px, 32px 32px",
                maskImage: "linear-gradient(180deg, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="relative z-10 mx-auto max-w-[430px] text-center">
              <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
                {isEnglish ? "One Workspace Flow" : "하나의 개발 흐름"}
              </p>
              <h2 className="m-0 mt-3 text-2xl font-black leading-tight tracking-tight" style={{ color: "var(--white)" }}>
                {isEnglish ? "From source to decision to record." : "소스에서 결정, 기록까지 한 흐름으로."}
              </h2>
              <p className="m-0 mx-auto mt-3 max-w-[380px] text-balance text-sm font-semibold leading-5 tracking-tight sm:text-sm sm:leading-6" style={{ color: "var(--muted)" }}>
                {isEnglish
                  ? "PRs, chat, API specs, and ERDs stay connected from review to record."
                  : "PR·이슈, 팀 대화, API·ERD가 한 흐름으로 이어져요. 결정 사항도 바로 추적됩니다."}
              </p>

              <div
                className="mx-auto mt-6 h-2 max-w-[420px] overflow-hidden rounded-full"
                style={{
                  background: "rgba(234, 247, 255, 0.07)",
                  border: "1px solid rgba(234, 247, 255, 0.08)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <motion.div
                  data-feature-progress="true"
                  className="h-full rounded-full"
                  initial={false}
                  animate={{ width: `${featureProgressPercent}%` }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  style={{
                    background: `linear-gradient(90deg, ${colors.primaryHex}, var(--matrix-green), #FFD166)`,
                    boxShadow: `0 0 18px ${colors.primary}, 0.42), 0 0 24px rgba(255,209,102,0.18)`,
                  }}
                />
              </div>
            </div>

            <div className="relative z-10 mx-auto mt-5 grid w-full max-w-[430px] gap-3">
              {featureCardsCopy.map((feature, index) => {
                const isFeatureActive = activeFeatureIndex === index;

                return (
                  <motion.button
                    key={feature.title}
                    type="button"
                    data-feature-card={index + 1}
                    aria-pressed={isFeatureActive}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 6 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.36, delay: index * 0.06, ease: "easeOut" }}
                    onClick={() => setActiveFeatureIndex(index)}
                    onFocus={() => setActiveFeatureIndex(index)}
                    className="group relative flex min-h-[82px] cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B14]"
                    style={{
                      background: isFeatureActive
                        ? `linear-gradient(145deg, ${toneAlpha(feature.tone, 15)}, rgba(234, 247, 255, 0.075))`
                        : "rgba(234, 247, 255, 0.052)",
                      border: `1px solid ${isFeatureActive ? feature.tone : `${colors.primary}, 0.13)`}`,
                      boxShadow: isFeatureActive
                        ? `0 0 26px ${toneAlpha(feature.tone, 12)}, inset 0 1px 0 rgba(255,255,255,0.10)`
                        : "inset 0 1px 0 rgba(255,255,255,0.06)",
                      transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                    }}
                  >
                    <span
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl"
                      style={{
                        background: toneAlpha(feature.tone, 9),
                        border: `1px solid ${toneAlpha(feature.tone, 33)}`,
                        boxShadow: `0 0 20px ${toneAlpha(feature.tone, 13)}`,
                      }}
                    >
                      <motion.span
                        animate={
                          shouldAnimateFeatures
                            ? { rotate: [0, index === 1 ? -5 : 5, 0], scale: [1, 1.08, 1] }
                            : { rotate: 0, scale: 1 }
                        }
                        transition={
                          shouldAnimateFeatures
                            ? { duration: 3.4, repeat: Infinity, delay: index * 0.42, ease: "easeInOut" }
                            : { duration: 0.2 }
                        }
                      >
                        <feature.icon size={19} strokeWidth={2.4} style={{ color: feature.tone }} />
                      </motion.span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: feature.tone }}>
                        0{index + 1}
                      </span>
                      <span className="mt-0.5 block text-base font-black tracking-tight" style={{ color: "var(--white)" }}>
                        {feature.title}
                      </span>
                      <span className="mt-1.5 block text-sm font-semibold leading-5 tracking-tight" style={{ color: "var(--muted)" }}>
                        {feature.description}
                      </span>
                    </span>
                    <motion.span
                      className="pointer-events-none absolute bottom-0 left-0 h-1 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${feature.tone}, ${colors.primaryHex})`,
                        boxShadow: `0 0 18px ${toneAlpha(feature.tone, 40)}`,
                      }}
                      initial={false}
                      animate={{ width: isFeatureActive ? "100%" : "0%" }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <div
            className="relative min-h-[430px] overflow-hidden rounded-[34px] p-4 sm:p-5 lg:min-h-[450px]"
            style={{
              background: `
                radial-gradient(circle at 82% 14%, ${toneAlpha(activeFeature.tone, 13)}, transparent 32%),
                linear-gradient(145deg, rgba(11, 22, 40, 0.86), rgba(5, 11, 20, 0.72))
              `,
              border: `1px solid ${toneAlpha(activeFeature.tone, 33)}`,
              boxShadow: `0 18px 54px rgba(0,0,0,0.34), 0 0 34px ${toneAlpha(activeFeature.tone, 9)}, inset 0 1px 0 rgba(255,255,255,0.09)`,
              backdropFilter: prefersReducedMotion ? "none" : "blur(18px) saturate(165%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: "34px 34px",
                maskImage: "linear-gradient(180deg, black 0%, black 72%, transparent 100%)",
              }}
            />
            <AnimatePresence mode="wait">
              <motion.article
                key={activeFeatureDetail.title}
                data-feature-detail={activeFeatureIndex + 1}
                data-feature-slide="true"
                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 64, scale: prefersReducedMotion ? 1 : 0.985 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -42, scale: prefersReducedMotion ? 1 : 0.985 }}
                transition={{ duration: 0.34, ease: "easeOut" }}
                className="relative z-10 flex min-h-[398px] flex-col items-center overflow-hidden rounded-[28px] p-5 text-center sm:p-6 lg:min-h-[410px]"
                style={{
                  background: `
                    linear-gradient(145deg, ${toneAlpha(activeFeature.tone, 8)}, rgba(234, 247, 255, 0.055) 42%, rgba(5, 11, 20, 0.42)),
                    rgba(5, 11, 20, 0.36)
                  `,
                  border: `1px solid ${toneAlpha(activeFeature.tone, 27)}`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <div className="relative flex w-full items-center justify-center">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: toneAlpha(activeFeature.tone, 9),
                      border: `1px solid ${toneAlpha(activeFeature.tone, 40)}`,
                      boxShadow: `0 0 26px ${toneAlpha(activeFeature.tone, 15)}`,
                    }}
                  >
                    <activeFeature.icon size={27} strokeWidth={2.5} style={{ color: activeFeature.tone }} />
                  </div>
                  <span className="absolute right-0 top-0 text-5xl font-black leading-none tracking-tight" style={{ color: toneAlpha(activeFeature.tone, 12) }}>
                    0{activeFeatureIndex + 1}
                  </span>
                </div>

                <div className="mx-auto mt-5 max-w-[560px]">
                  <p className="m-0 text-sm font-black tracking-tight" style={{ color: activeFeature.tone }}>
                    {activeFeatureDetail.eyebrow}
                  </p>
                  <h3 className="m-0 mt-2 text-balance text-2xl font-black leading-tight tracking-tight" style={{ color: "var(--white)" }}>
                    {activeFeatureDetail.title}
                  </h3>
                  <p className="m-0 mx-auto mt-3 max-w-[500px] text-balance text-sm font-semibold leading-6 tracking-tight" style={{ color: "#D7EAF4" }}>
                    {activeFeatureDetail.description}
                  </p>
                </div>

                <div
                  className="mt-5 w-full max-w-[560px] overflow-hidden rounded-[24px] p-3"
                  style={{
                    background: "rgba(234, 247, 255, 0.052)",
                    border: "1px solid rgba(234, 247, 255, 0.10)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {activeFeatureIndex === 0 ? (
                    <div data-feature-preview="github" className="grid gap-3">
                      {[
                        isEnglish ? "PR #128 Login flow" : "PR #128 로그인 흐름",
                        isEnglish ? "Issue #42 API response" : "Issue #42 API 응답",
                        isEnglish ? "Files changed 14" : "변경 파일 14개",
                      ].map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                          style={{
                            background: index === 0 ? toneAlpha(activeFeature.tone, 8) : "rgba(5, 11, 20, 0.34)",
                            border: `1px solid ${index === 0 ? activeFeature.tone : "rgba(234,247,255,0.10)"}`,
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm font-black tracking-tight" style={{ color: "#EAF7FF" }}>
                            <GitPullRequest size={16} strokeWidth={2.5} style={{ color: activeFeature.tone }} />
                            {item}
                          </span>
                          <span className="text-sm font-black tracking-tight" style={{ color: index === 0 ? activeFeature.tone : "var(--soft-mint)" }}>
                            {index === 0 ? (isEnglish ? "AI" : "AI") : (isEnglish ? "sync" : "동기화")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : activeFeatureIndex === 1 ? (
                    <div data-feature-preview="chat" className="grid gap-3">
                      {[
                        {
                          name: isEnglish ? "Review" : "리뷰",
                          text: isEnglish ? "Can we split the auth change?" : "인증 변경은 분리해서 갈까요?",
                        },
                        {
                          name: isEnglish ? "Decision" : "결정",
                          text: isEnglish ? "Ship API fix first, docs follow." : "API 수정 먼저 배포하고 문서로 남겨요.",
                        },
                      ].map((item, index) => (
                        <div
                          key={item.name}
                          className={`flex ${index === 1 ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className="max-w-[88%] rounded-[20px] px-4 py-3"
                            style={{
                              background: index === 1 ? toneAlpha(activeFeature.tone, 9) : "rgba(5, 11, 20, 0.36)",
                              border: `1px solid ${index === 1 ? activeFeature.tone : "rgba(234,247,255,0.10)"}`,
                            }}
                          >
                            <p className="m-0 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: activeFeature.tone }}>
                              {item.name}
                            </p>
                            <p className="m-0 mt-1 text-sm font-bold leading-6 tracking-tight" style={{ color: "#EAF7FF" }}>
                              {item.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div data-feature-preview="docs" className="grid gap-3">
                      {[
                        isEnglish ? "API spec updated" : "API 명세 업데이트",
                        isEnglish ? "ERD decision linked" : "ERD 결정 연결",
                        isEnglish ? "Review note archived" : "리뷰 노트 보관",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3"
                          style={{
                            background: "rgba(5, 11, 20, 0.34)",
                            border: "1px solid rgba(234,247,255,0.10)",
                          }}
                        >
                          <FileText size={16} strokeWidth={2.5} style={{ color: activeFeature.tone }} />
                          <span className="text-sm font-black tracking-tight" style={{ color: "#EAF7FF" }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap justify-center gap-2 pt-4">
                  {activeFeatureDetail.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2"
                      style={{
                        background: "rgba(234, 247, 255, 0.055)",
                        border: "1px solid rgba(234, 247, 255, 0.10)",
                        color: "#EAF7FF",
                      }}
                    >
                      <CheckCircle2 size={14} strokeWidth={2.6} style={{ color: activeFeature.tone }} />
                      <span className="text-sm font-black tracking-tight">{bullet}</span>
                    </div>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section
        ref={flowRef}
        data-landing-section="flow"
        className="relative mb-8 mt-8 flex min-h-[clamp(400px,calc(100svh-17rem),460px)] flex-col justify-center overflow-hidden rounded-[30px] px-6 py-8 md:px-8 md:py-9"
        style={{
          background: `
            linear-gradient(135deg, rgba(255,209,102,0.08), transparent 38%),
            linear-gradient(145deg, rgba(11, 22, 40, 0.72), rgba(5, 11, 20, 0.62))
          `,
          border: `1px solid ${colors.primary}, 0.16)`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.07)",
          backdropFilter: prefersReducedMotion ? "none" : "blur(16px) saturate(160%)",
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
              {landingCopy.flowEyebrow}
            </p>
            <h2 className="m-0 mt-2 text-2xl font-black tracking-tight" style={{ color: "var(--white)" }}>
              {landingCopy.flowTitle}
            </h2>
          </div>
        </div>

        <div
          className="mt-5 h-2 overflow-hidden rounded-full"
          style={{
            background: "rgba(234, 247, 255, 0.07)",
            border: "1px solid rgba(234, 247, 255, 0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <motion.div
            data-flow-progress="true"
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${flowProgressPercent}%` }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, ${colors.primaryHex}, var(--matrix-green), #FFD166)`,
              boxShadow: `0 0 18px ${colors.primary}, 0.42), 0 0 24px rgba(var(--codedock-secondary-rgb),0.22)`,
            }}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
            {workspaceFlowCopy.map((item, index) => {
              const isActiveNode = flowActiveEndIndex >= 0 && index <= flowActiveEndIndex;
              const isActiveConnector = flowActiveEndIndex >= 0 && index < flowActiveEndIndex;

              return (
              <motion.div
                key={item}
                data-flow-index={index + 1}
                role="button"
                aria-label={`${item} ${isEnglish ? "workflow step" : "작업 흐름 단계"}`}
                aria-current={index === flowActiveEndIndex ? "step" : undefined}
                tabIndex={0}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.36, delay: index * 0.08 }}
                onMouseEnter={() => setHoveredFlowIndex(index)}
                onMouseLeave={() => setHoveredFlowIndex(null)}
                onPointerEnter={() => setHoveredFlowIndex(index)}
                onPointerLeave={() => setHoveredFlowIndex(null)}
                onClick={() => setHoveredFlowIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setHoveredFlowIndex(index);
                  }
                }}
                onFocus={() => setHoveredFlowIndex(index)}
                onBlur={() => setHoveredFlowIndex(null)}
                className="relative flex min-h-[120px] items-center gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B14]"
                style={{
                  background: isActiveNode
                    ? `linear-gradient(145deg, ${colors.primary}, 0.12), rgba(234, 247, 255, 0.065))`
                    : "rgba(234, 247, 255, 0.05)",
                  border: `1px solid ${colors.primary}, ${isActiveNode ? "0.34" : "0.13"})`,
                  boxShadow: isActiveNode
                    ? `0 0 24px ${colors.primary}, 0.14), inset 0 1px 0 rgba(255,255,255,0.10)`
                    : "inset 0 1px 0 rgba(255,255,255,0.07)",
                  transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                }}
              >
                {index < workspaceFlowCopy.length - 1 && (
                  <>
                    <motion.span
                      data-flow-connector={`${index + 1}-${index + 2}`}
                      className="pointer-events-none absolute left-[calc(100%+1px)] top-1/2 z-20 hidden h-[3px] w-3 origin-left -translate-y-1/2 rounded-full md:block"
                      style={{
                        background: `linear-gradient(90deg, ${colors.primaryHex}, var(--matrix-green))`,
                      }}
                      initial={false}
                      animate={{
                        opacity: isActiveConnector ? 1 : 0,
                        scaleX: isActiveConnector ? 1 : 0,
                        boxShadow: isActiveConnector
                          ? `0 0 16px ${colors.primary}, 0.55), 0 0 20px rgba(var(--codedock-secondary-rgb),0.30)`
                          : "none",
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                    <motion.span
                      className="pointer-events-none absolute left-8 top-[calc(100%+1px)] z-20 h-3 w-[3px] origin-top rounded-full md:hidden"
                      style={{
                        background: `linear-gradient(180deg, ${colors.primaryHex}, var(--matrix-green))`,
                      }}
                      initial={false}
                      animate={{
                        opacity: isActiveConnector ? 1 : 0,
                        scaleY: isActiveConnector ? 1 : 0,
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </>
                )}
                <span
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                  style={{
                    background: isActiveNode
                      ? `${colors.primary}, 0.18)`
                      : index === workspaceFlowCopy.length - 1 ? "rgba(255,209,102,0.15)" : "rgba(var(--codedock-secondary-rgb),0.12)",
                    color: index === workspaceFlowCopy.length - 1 ? "#FFD166" : "var(--matrix-green)",
                    boxShadow: isActiveNode ? `0 0 18px ${colors.primary}, 0.28)` : "none",
                  }}
                >
                  <motion.span
                    animate={shouldAnimateFlow ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={shouldAnimateFlow ? { duration: 2.6, repeat: Infinity, delay: index * 0.34, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <CheckCircle2 size={17} strokeWidth={2.6} />
                  </motion.span>
                </span>
                <div>
                  <p className="m-0 text-sm font-black tracking-tight" style={{ color: colors.primaryHex }}>
                    STEP {index + 1}
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold leading-6 tracking-tight" style={{ color: "#DFFAFF" }}>
                    {item}
                  </p>
                </div>
                <span
                  className="absolute bottom-3 right-3 text-3xl font-black leading-none tracking-tight"
                  style={{ color: "rgba(234, 247, 255, 0.045)" }}
                >
                  0{index + 1}
                </span>
              </motion.div>
              );
            })}
        </div>
      </section>

      <motion.section
        ref={closingRef}
        data-landing-section="closing"
        className="mb-8 mt-8 grid min-h-[clamp(400px,calc(100svh-17rem),460px)] items-center gap-5 md:grid-cols-[0.9fr_1.1fr]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-90px" }}
        variants={{
          hidden: { opacity: 0, y: 22 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.52, ease: "easeOut", staggerChildren: 0.12 },
          },
        }}
      >
        <motion.div
          className="group relative overflow-hidden rounded-[30px] p-7"
          variants={{
            hidden: { opacity: 0, x: -26, scale: 0.98 },
            show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.52, ease: "easeOut" } },
          }}
          whileHover={{ y: -5, scale: 1.01 }}
          style={{
            background: "rgba(11, 22, 40, 0.68)",
            border: `1px solid ${colors.primary}, 0.16)`,
            boxShadow: "0 12px 36px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.07)",
            backdropFilter: prefersReducedMotion ? "none" : "blur(16px) saturate(160%)",
          }}
        >
          <motion.div
            className="absolute -bottom-20 left-8 h-48 w-48 rounded-full"
            style={{
              background: `${colors.primary}, 0.14)`,
              filter: "blur(42px)",
            }}
            animate={shouldAnimateClosing ? { scale: [1, 1.12, 1], opacity: [0.45, 0.72, 0.45] } : { scale: 1, opacity: 0.5 }}
            transition={shouldAnimateClosing ? { duration: 4.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          />
          <motion.span
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: `${colors.primary}, 0.13)`,
              border: `1px solid ${colors.primary}, 0.28)`,
              boxShadow: `0 0 22px ${colors.primary}, 0.22)`,
            }}
            animate={shouldAnimateClosing ? { rotate: [0, -4, 4, 0] } : { rotate: 0 }}
            transition={shouldAnimateClosing ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          >
            <Sparkles size={28} strokeWidth={2.4} style={{ color: colors.primaryHex }} />
          </motion.span>
          <h2 className="relative m-0 mt-5 text-2xl font-black tracking-tight" style={{ color: "var(--white)" }}>
            {landingCopy.catTitle}
          </h2>
          <p className="relative m-0 mt-4 text-sm font-semibold leading-7 tracking-tight" style={{ color: "var(--muted)" }}>
            {landingCopy.catDescription}
          </p>
        </motion.div>

        <motion.div
          className="grid gap-3"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
        >
          {landingCopy.points.map((item, index) => (
            <motion.div
              key={item.label}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl px-5 py-4"
              variants={{
                hidden: { opacity: 0, x: 28 },
                show: { opacity: 1, x: 0, transition: { duration: 0.42, delay: index * 0.04, ease: "easeOut" } },
              }}
              whileHover={{ x: 6, scale: 1.012 }}
              style={{
                background: "rgba(234, 247, 255, 0.055)",
                border: `1px solid ${colors.primary}, 0.13)`,
                color: "#DFFAFF",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <motion.span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: colors.primaryHex, boxShadow: `0 0 18px ${colors.primaryHex}` }}
                initial={{ scaleY: 0.35 }}
                whileHover={{ scaleY: 1 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              />
              <motion.span
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: `${colors.primary}, 0.10)`,
                  border: `1px solid ${colors.primary}, 0.20)`,
                }}
                animate={shouldAnimateClosing ? { y: [0, -3, 0] } : { y: 0 }}
                transition={shouldAnimateClosing ? { duration: 3.4, repeat: Infinity, delay: index * 0.25, ease: "easeInOut" } : { duration: 0.2 }}
              >
                <item.icon size={20} strokeWidth={2.4} style={{ color: colors.primaryHex }} />
              </motion.span>
              <span className="relative text-sm font-black leading-6 tracking-tight">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
      <AnimatePresence>
        {false && (
          <motion.div
            className="pointer-events-none fixed right-5 top-24 z-40 hidden max-w-[310px] items-center gap-3 rounded-[24px] p-3 lg:flex"
            style={{
              background: "linear-gradient(145deg, rgba(11,22,40,0.88), rgba(5,11,20,0.74))",
              border: `1px solid ${colors.primary}, 0.22)`,
              boxShadow: `0 18px 48px rgba(0,0,0,0.34), 0 0 34px ${colors.primary}, 0.12)`,
              backdropFilter: prefersReducedMotion ? "none" : "blur(18px) saturate(180%)",
            }}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <motion.div
              className="h-20 w-20 flex-shrink-0"
              animate={shouldAnimateClosing ? { y: [0, -4, 0] } : { y: 0 }}
              transition={shouldAnimateClosing ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            >
              <CoffeeLogo
                alive={!prefersReducedMotion}
                mood={mascotMood}
                className="h-full w-full"
                style={{ filter: `drop-shadow(0 0 20px ${colors.primary}, 0.20))` }}
              />
            </motion.div>
            <div className="min-w-0">
              <p className="m-0 mb-1 text-sm font-black uppercase tracking-tight" style={{ color: colors.primaryHex }}>
                {floatingMascotLabel}
              </p>
              <MascotTypingBubble
                compact
                text={typedMascotText}
                primary={colors.primary}
                primaryHex={colors.primaryHex}
                tail="left"
                animateTyping={shouldAnimateClosing}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

function getMascotBubbleText(message: string, isEnglish: boolean) {
  const trimmedMessage = message.trim();
  const sentenceEndIndex = trimmedMessage.search(isEnglish ? /[.!?]/ : /[.!?。？！]/);
  const firstSentence =
    sentenceEndIndex >= 0 ? trimmedMessage.slice(0, sentenceEndIndex + 1) : trimmedMessage;
  const maxLength = isEnglish ? 62 : 34;

  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, maxLength).trim()}...`;
}

function MascotTypingBubble({
  text,
  primary,
  primaryHex,
  compact = false,
  tail = "none",
  animateTyping = true,
}: {
  text: string;
  primary: string;
  primaryHex: string;
  compact?: boolean;
  tail?: "none" | "left" | "right" | "bottom";
  animateTyping?: boolean;
}) {
  const showTypingDots = text.length === 0;
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const rawBubbleId = useId();
  const bubbleId = `mascot-bubble-${rawBubbleId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const tailSize = tail === "none" ? 0 : compact ? 10 : 12;

  useEffect(() => {
    const node = bubbleRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateBubbleSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);
      setBubbleSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    updateBubbleSize();
    const resizeObserver = new ResizeObserver(updateBubbleSize);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [compact, tail, text]);

  return (
    <motion.div
      ref={bubbleRef}
      className="relative inline-flex w-fit max-w-full align-top"
      style={{
        color: primaryHex,
        paddingLeft: tail === "left" ? tailSize : undefined,
        paddingRight: tail === "right" ? tailSize : undefined,
        paddingBottom: tail === "bottom" ? tailSize : undefined,
      }}
      initial={{ opacity: 0, x: -12, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {bubbleSize.width > 0 && bubbleSize.height > 0 && (
        <SpeechBubbleFrame
          id={bubbleId}
          width={bubbleSize.width}
          height={bubbleSize.height}
          tail={tail}
          tailSize={tailSize}
          primary={primary}
          primaryHex={primaryHex}
        />
      )}
      <div
        className={`relative z-10 flex max-w-full items-center gap-2 font-black tracking-tight ${
          compact ? "px-3 py-2 text-sm sm:text-sm" : "px-4 py-3 text-sm"
        }`}
      >
        <MessageSquare className="flex-shrink-0" size={compact ? 14 : 16} strokeWidth={2.4} />
        <span className="min-w-0 break-keep leading-5 [text-wrap:pretty]">{showTypingDots ? "" : text}</span>
        {showTypingDots ? (
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: primaryHex }}
                animate={animateTyping ? { opacity: [0.35, 1, 0.35], y: [0, -2, 0] } : { opacity: 0.78, y: 0 }}
                transition={animateTyping ? { duration: 0.8, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" } : { duration: 0.2 }}
              />
            ))}
          </span>
        ) : (
          <motion.span
            className="h-4 w-[2px] rounded-full"
            style={{ background: primaryHex }}
            animate={animateTyping ? { opacity: [0, 1, 0] } : { opacity: 1 }}
            transition={animateTyping ? { duration: 0.88, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          />
        )}
      </div>
    </motion.div>
  );
}

function SpeechBubbleFrame({
  id,
  width,
  height,
  tail,
  tailSize,
  primary,
  primaryHex,
}: {
  id: string;
  width: number;
  height: number;
  tail: "none" | "left" | "right" | "bottom";
  tailSize: number;
  primary: string;
  primaryHex: string;
}) {
  const bubblePath = getSpeechBubblePath(width, height, tail, tailSize);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ filter: `drop-shadow(0 0 22px ${primary}, 0.14))` }}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={primaryHex} stopOpacity="0.22" />
          <stop offset="42%" stopColor="#17445B" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#091827" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={primaryHex} stopOpacity="0.46" />
          <stop offset="100%" stopColor={primaryHex} stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <path
        d={bubblePath}
        fill={`url(#${id}-fill)`}
        stroke={`url(#${id}-stroke)`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path d={bubblePath} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.85" />
    </svg>
  );
}

function getSpeechBubblePath(
  width: number,
  height: number,
  tail: "none" | "left" | "right" | "bottom",
  tailSize: number,
) {
  const inset = 0.8;
  const w = Math.max(width, 36);
  const h = Math.max(height, 28);
  const left = tail === "left" ? tailSize + inset : inset;
  const right = tail === "right" ? w - tailSize - inset : w - inset;
  const top = inset;
  const bottom = tail === "bottom" ? h - tailSize - inset : h - inset;
  const radius = Math.min(17, Math.max(12, (bottom - top) / 2 - 1, (right - left) / 8));
  const cy = (top + bottom) / 2;

  if (tail === "left") {
    const neck = Math.min(tailSize * 0.8, (bottom - top) * 0.22);
    return [
      `M ${left + radius} ${top}`,
      `H ${right - radius}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `V ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `H ${left + radius}`,
      `Q ${left} ${bottom} ${left} ${bottom - radius}`,
      `V ${cy + neck}`,
      `C ${left - 2} ${cy + neck * 0.72} ${tailSize * 0.48} ${cy + neck * 0.48} ${inset + 1} ${cy}`,
      `C ${tailSize * 0.48} ${cy - neck * 0.48} ${left - 2} ${cy - neck * 0.72} ${left} ${cy - neck}`,
      `V ${top + radius}`,
      `Q ${left} ${top} ${left + radius} ${top}`,
      "Z",
    ].join(" ");
  }

  if (tail === "right") {
    const neck = Math.min(tailSize * 0.8, (bottom - top) * 0.22);
    return [
      `M ${left + radius} ${top}`,
      `H ${right - radius}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `V ${cy - neck}`,
      `C ${right + 2} ${cy - neck * 0.72} ${w - tailSize * 0.48} ${cy - neck * 0.48} ${w - inset - 1} ${cy}`,
      `C ${w - tailSize * 0.48} ${cy + neck * 0.48} ${right + 2} ${cy + neck * 0.72} ${right} ${cy + neck}`,
      `V ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `H ${left + radius}`,
      `Q ${left} ${bottom} ${left} ${bottom - radius}`,
      `V ${top + radius}`,
      `Q ${left} ${top} ${left + radius} ${top}`,
      "Z",
    ].join(" ");
  }

  if (tail === "bottom") {
    const cx = Math.min(left + 42, right - 24);
    const halfTail = Math.min(13, (right - left) * 0.16);
    return [
      `M ${left + radius} ${top}`,
      `H ${right - radius}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `V ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `H ${cx + halfTail}`,
      `C ${cx + halfTail * 0.62} ${bottom + 3} ${cx + 3} ${h - inset - 2} ${cx} ${h - inset}`,
      `C ${cx - 3} ${h - inset - 2} ${cx - halfTail * 0.62} ${bottom + 3} ${cx - halfTail} ${bottom}`,
      `H ${left + radius}`,
      `Q ${left} ${bottom} ${left} ${bottom - radius}`,
      `V ${top + radius}`,
      `Q ${left} ${top} ${left + radius} ${top}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${left + radius} ${top}`,
    `H ${right - radius}`,
    `Q ${right} ${top} ${right} ${top + radius}`,
    `V ${bottom - radius}`,
    `Q ${right} ${bottom} ${right - radius} ${bottom}`,
    `H ${left + radius}`,
    `Q ${left} ${bottom} ${left} ${bottom - radius}`,
    `V ${top + radius}`,
    `Q ${left} ${top} ${left + radius} ${top}`,
    "Z",
  ].join(" ");
}
