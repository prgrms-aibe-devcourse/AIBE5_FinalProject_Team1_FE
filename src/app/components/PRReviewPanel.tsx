import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileCode,
  GitBranch,
  Github,
  History,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PRReviewPanelProps {
  prData: any;
  onClose: () => void;
  onMergePR?: (messageId: number) => void;
}

interface DiffFile {
  id: string;
  name: string;
  path: string;
  status: "modified" | "added";
  tag: string;
  additions: number;
  deletions: number;
}

interface DiffThreadComment {
  id: string;
  author: string;
  time: string;
  text: string;
  fileId: string;
  fileName: string;
  filePath: string;
  line: number;
}

interface ActiveDiffThread {
  fileId: string;
  line: number;
}

interface AiFeedbackFile {
  id: string;
  name: string;
  path: string;
  risk: "높음" | "중간";
  vulnerability: string;
  fix: string;
  currentStartLine: number;
  recommendedStartLine: number;
  currentCode: string[];
  recommendedCode: string[];
  findings: string[];
}

type PrDialogTab = "original" | "summary" | "content" | "history" | "diff";

const diffFiles: DiffFile[] = [
  {
    id: "security",
    name: "SecurityConfig.java",
    path: "src/main/java/com/codedock/config",
    status: "modified",
    tag: "security",
    additions: 45,
    deletions: 12
  },
  {
    id: "jwt",
    name: "JwtAuthenticationFilter.java",
    path: "src/main/java/com/codedock/filter",
    status: "added",
    tag: "feature",
    additions: 89,
    deletions: 3
  },
  {
    id: "auth",
    name: "AuthController.java",
    path: "src/main/java/com/codedock/controller",
    status: "modified",
    tag: "api",
    additions: 67,
    deletions: 8
  },
  {
    id: "config",
    name: "application.yml",
    path: "src/main/resources",
    status: "modified",
    tag: "config",
    additions: 8,
    deletions: 2
  }
];

const diffRows = [
  { line: 18, code: "@Configuration", added: false },
  { line: 19, code: "public class SecurityConfig {", added: false },
  { line: 20, code: "", added: false },
  { line: 21, code: "@Bean", added: true },
  {
    line: 22,
    code: "public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {",
    added: true,
    comment: {
      author: "김진필",
      time: "10:45",
      text: "CSRF 비활성화 이유를 주석으로 남기면 좋을 것 같습니다."
    }
  },
  {
    line: 23,
    code: "http.csrf(csrf -> csrf.disable());",
    added: true,
    comment: {
      author: "김준우",
      time: "10:47",
      text: "동의합니다. JWT stateless 구조라면 문서화하면 좋겠어요."
    }
  },
  { line: 24, code: "http.sessionManagement(session ->", added: true },
  {
    line: 25,
    code: "session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)",
    added: true
  },
  { line: 26, code: ");", added: true },
  { line: 27, code: "return http.build();", added: true },
  { line: 28, code: "}", added: true },
  { line: 29, code: "}", added: false }
];

const checklist = [
  { text: "JWT 만료 처리 확인", checked: true },
  { text: "인증 실패 응답 형식 확인", checked: true },
  { text: "CSRF 비활성화 사유 확인", checked: false },
  { text: "요청 제한 적용 여부 확인", checked: false },
  { text: "테스트 코드 추가 여부 확인", checked: true }
];

const aiFeedbackFiles: AiFeedbackFile[] = [
  {
    id: "security-config-csrf",
    name: "SecurityConfig.java",
    path: "src/main/java/com/codedock/config",
    risk: "높음",
    vulnerability: "CSRF를 전역으로 꺼 두면 브라우저 기반 요청에서 의도하지 않은 상태 변경 요청을 막기 어렵습니다.",
    fix: "JWT 기반 인증 API처럼 필요한 경로만 예외 처리하고, 인증 실패 응답과 필터 순서를 명확히 고정합니다.",
    currentStartLine: 23,
    recommendedStartLine: 23,
    currentCode: [
      "http.csrf(csrf -> csrf.disable());",
      "http.sessionManagement(session ->",
      "  session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)",
      ");",
      "return http.build();"
    ],
    recommendedCode: [
      "http.csrf(csrf -> csrf",
      "  .ignoringRequestMatchers(\"/api/auth/**\")",
      ");",
      "http.exceptionHandling(handler -> handler",
      "  .authenticationEntryPoint(jwtEntryPoint)",
      ");",
      "http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);",
      "return http.build();"
    ],
    findings: [
      "23번째 줄: CSRF 전역 비활성화",
      "인증 실패 응답 형식이 설정에 보이지 않음",
      "JWT 필터 순서가 명시되지 않음"
    ]
  },
  {
    id: "auth-controller-rate-limit",
    name: "AuthController.java",
    path: "src/main/java/com/codedock/controller",
    risk: "높음",
    vulnerability: "로그인 요청에 제한이 없으면 같은 계정이나 IP로 비밀번호 대입 공격이 반복될 수 있습니다.",
    fix: "이메일과 요청 IP 기준으로 시도 횟수를 제한하고, 초과 시 같은 응답 포맷으로 차단합니다.",
    currentStartLine: 41,
    recommendedStartLine: 41,
    currentCode: [
      "@PostMapping(\"/login\")",
      "public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest request) {",
      "  TokenResponse token = authService.login(request);",
      "  return ResponseEntity.ok(token);",
      "}"
    ],
    recommendedCode: [
      "@PostMapping(\"/login\")",
      "public ResponseEntity<TokenResponse> login(",
      "  @RequestBody LoginRequest request, HttpServletRequest servletRequest",
      ") {",
      "  rateLimitService.consume(request.email(), servletRequest.getRemoteAddr());",
      "  TokenResponse token = authService.login(request);",
      "  return ResponseEntity.ok(token);",
      "}"
    ],
    findings: [
      "로그인 반복 시도 제한 없음",
      "IP와 계정 기준 차단 정책 없음",
      "초과 요청 응답 정책 필요"
    ]
  },
  {
    id: "jwt-filter-expiry",
    name: "JwtAuthenticationFilter.java",
    path: "src/main/java/com/codedock/filter",
    risk: "중간",
    vulnerability: "만료되었거나 손상된 토큰이 들어왔을 때 예외 처리가 흩어지면 클라이언트가 실패 이유를 일관되게 받지 못합니다.",
    fix: "토큰 검증 예외를 필터에서 한 번에 잡고, 표준 오류 응답을 내려 보안 로그와 사용자 경험을 맞춥니다.",
    currentStartLine: 28,
    recommendedStartLine: 28,
    currentCode: [
      "String token = resolveToken(request);",
      "if (jwtProvider.validate(token)) {",
      "  Authentication auth = jwtProvider.getAuthentication(token);",
      "  SecurityContextHolder.getContext().setAuthentication(auth);",
      "}",
      "filterChain.doFilter(request, response);"
    ],
    recommendedCode: [
      "try {",
      "  String token = resolveToken(request);",
      "  if (jwtProvider.validate(token)) {",
      "    Authentication auth = jwtProvider.getAuthentication(token);",
      "    SecurityContextHolder.getContext().setAuthentication(auth);",
      "  }",
      "} catch (JwtException ex) {",
      "  jwtErrorResponder.writeUnauthorized(response, ex.getMessage());",
      "  return;",
      "}",
      "filterChain.doFilter(request, response);"
    ],
    findings: [
      "JWT 검증 예외 응답이 명확하지 않음",
      "만료 토큰 로그 기준 필요",
      "필터 이후 체인 진행 여부를 고정해야 함"
    ]
  }
];

const reviewers = [
  { initials: "JP", name: "김진필", status: "Approved", color: "#22C55E" },
  { initials: "JW", name: "김준우", status: "Pending", color: "#F59E0B" },
  { initials: "JH", name: "김진현", status: "Commented", color: "#39FF88" }
];

const prDialogTabs = [
  { id: "original", label: "사용자 PR", icon: Github },
  { id: "summary", label: "AI 요약", icon: Sparkles },
  { id: "content", label: "AI 피드백", icon: ShieldCheck },
  { id: "history", label: "이력 관리", icon: History },
  { id: "diff", label: "DIFF", icon: Code2 }
] satisfies Array<{ id: PrDialogTab; label: string; icon: typeof Sparkles }>;

const actualPrWhatItems = [
  "AI 인터뷰와 AI 브리프의 모집 단위 반영 정책을 분리한다",
  "AI 브리프는 초안 생성/재구성 흐름으로 보고 기존처럼 AI 결과 기준 동기화를 유지한다",
  "AI 인터뷰는 기존 폼의 부분 수정 흐름으로 보고 기존 값 유지 우선 정책을 적용한다",
  "AI 인터뷰 응답의 `positions`가 비어 있어도 기존 모집 단위가 유지되는 회귀 테스트를 추가한다",
  "기존 모집 단위 갱신 시 `null` 또는 `blank` 값은 기존 값 유지로 처리한다",
  "기존 모집 단위 갱신 시 `headCount`, 예산, 기간, 경력, 근무형태, 근무지가 응답 누락으로 초기화되지 않도록 보완한다",
  "신규 모집 단위 생성 시에만 `headCount` / `workType` / `workPlace` 기본값 보정을 적용한다",
  "인원만 수정했을 때 예산/기간/근무형태/경력/스킬이 유지되는 테스트를 추가한다",
  "예산만 수정했을 때 인원/기간/근무형태/경력/스킬이 유지되는 테스트를 추가한다",
  "기존 모집 단위 갱신 시 `skills: null` 또는 `skills: []`는 기존 스킬 유지로 처리한다",
  "AI 인터뷰에서 스킬 응답이 non-empty인 경우 기존 스킬 전체 교체가 아니라 추가/중요도 갱신 중심으로 반영한다",
  "AI 인터뷰 스킬 반영 시 응답에 없는 기존 스킬은 삭제하지 않는다",
  "`skills: []` 응답에서도 기존 스킬이 유지되는 테스트를 추가한다",
  "스킬 응답이 non-empty일 때 기존 스킬이 삭제되지 않고 추가/중요도 갱신되는 테스트를 추가한다",
  "사용자가 명시적으로 포지션 삭제를 요청한 경우에만 포지션 삭제가 일어나도록 기존 정책을 유지한다",
  "스킬 개별 삭제/전체 삭제/전체 교체는 이번 이슈에서 다루지 않는다",
  "AI 인터뷰 프롬프트가 위 preserve-by-default 정책과 일치하도록 수정한다",
  "기존 값은 사용자가 명시적으로 바꾸라고 한 경우에만 변경하도록 프롬프트를 보강한다",
  "누락/불확실한 값은 기존 값 삭제나 기본값 덮어쓰기 의도로 해석하지 않도록 프롬프트를 보강한다"
];

const actualPrChecklistItems = [
  "브랜치 base가 적절한가요?",
  "제목이 이슈 제목과 동일한가요?",
  "최소 1명의 리뷰를 받았나요?"
];

function renderInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md px-1.5 py-0.5 font-mono"
          style={{
            background: "rgba(234, 247, 255, 0.10)",
            color: "var(--white)",
            fontSize: "0.92em",
            fontWeight: 900
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function statusColor(status: DiffFile["status"]) {
  return status === "added" ? "#22C55E" : "var(--neon-cyan)";
}

function statusLabel(status: DiffFile["status"]) {
  return status === "added" ? "추가됨" : "수정됨";
}

function tagLabel(tag: string) {
  const labels: Record<string, string> = {
    security: "보안",
    feature: "기능",
    api: "API",
    config: "설정"
  };

  return labels[tag] ?? tag;
}

function reviewerStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Approved: "승인됨",
    Pending: "대기 중",
    Commented: "댓글 남김"
  };

  return labels[status] ?? status;
}

function riskLabel(risk: string) {
  const labels: Record<string, string> = {
    High: "높음",
    Medium: "보통",
    Low: "낮음"
  };

  return labels[risk] ?? risk;
}

export function PRReviewPanel({ prData, onClose, onMergePR }: PRReviewPanelProps) {
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [activeFileId, setActiveFileId] = useState(diffFiles[0].id);
  const [activePrTab, setActivePrTab] = useState<PrDialogTab>("original");
  const [activeDiffThread, setActiveDiffThread] = useState<ActiveDiffThread | null>(null);
  const [diffCommentDrafts, setDiffCommentDrafts] = useState<Record<string, string>>({});
  const [diffThreadComments, setDiffThreadComments] = useState<Record<string, DiffThreadComment[]>>({});
  const [prThreadDraft, setPrThreadDraft] = useState("");
  const [prThreadComments, setPrThreadComments] = useState<DiffThreadComment[]>([]);
  const [diffEdits, setDiffEdits] = useState<Record<string, string>>({});
  const activeFile = diffFiles.find((file) => file.id === activeFileId) ?? diffFiles[0];
  const prNumber = prData.prNumber ?? 142;
  const prTitle =
    prData.prTitle ||
    prData.text?.replace(/^.*?:\s*/, "") ||
    "JWT 사용자 인증 흐름 추가";
  const author = prData.prAuthor || "김진필";
  const risk = prData.aiRisk || "Medium";
  const branch = prData.branch || "feature/auth";
  const authorBadge = prData.authorInitials || author.slice(0, 2).toUpperCase();
  const isActualPr = prData.isActualPr || prTitle.includes("AI 인터뷰");
  const summaryText = isActualPr
    ? "이 PR은 AI 인터뷰 결과를 기존 값 보존 중심으로 반영하도록 정책과 테스트를 정리합니다. 누락된 값이 기존 모집 단위 정보를 덮어쓰지 않도록 프롬프트와 갱신 로직을 함께 보강합니다."
    : "이 PR은 인증 미들웨어와 SecurityConfig 설정을 변경합니다. refresh token API와 인증 실패 응답 흐름까지 함께 확인해야 하는 보안 관련 변경사항입니다.";
  const cautionItems = isActualPr
    ? [
      "AI 브리프와 AI 인터뷰의 반영 정책이 섞이지 않는지 확인 필요",
      "빈 배열과 null 처리 기준이 서비스/테스트에서 동일해야 함",
      "사용자가 명시적으로 삭제한 경우와 응답 누락을 구분해야 함"
    ]
    : [
      "요청 제한 설정값이 너무 낮을 수 있음",
      "keyGenerator가 undefined user.id를 반환할 가능성",
      "에러 처리 누락"
    ];
  const positiveItems = isActualPr
    ? [
      "기존 값 보존 정책이 테스트로 명확해짐",
      "신규 생성과 기존 수정 흐름을 분리해 회귀 가능성을 낮춤",
      "프롬프트까지 함께 보강해 AI 응답 해석 기준이 선명함"
    ]
    : [
      "express-rate-limit 패키지 사용으로 검증된 솔루션 적용",
      "보안 취약점 해결",
      "코드 가독성 양호"
    ];
  const originalWhatItems = isActualPr
    ? actualPrWhatItems
    : [
      "JWT 인증 미들웨어를 사용자 API 흐름에 적용한다",
      "SecurityConfig를 stateless 세션 기준으로 정리한다",
      "인증 실패 응답 형식을 API 공통 에러 형식에 맞춘다",
      "CSRF 비활성화 사유와 refresh token 요청 제한을 리뷰에서 확인한다"
    ];
  const originalIssueTitle = isActualPr
    ? "[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화 #103"
    : "PR #234 인증 미들웨어 적용 범위 확인";
  const originalChecklistItems = isActualPr
    ? actualPrChecklistItems
    : ["브랜치 base가 적절한가요?", "보안 변경 사항을 리뷰어에게 공유했나요?", "최소 1명의 리뷰를 받았나요?"];
  const originalActivityText = isActualPr ? "commented last month · edited" : "opened today · synced from GitHub";

  useEffect(() => {
    tabContentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [activePrTab]);

  const handleApprove = () => {
    onMergePR?.(prData.id);
    onClose();
  };

  const getDiffThreadKey = (fileId: string, line: number) => `${fileId}:${line}`;

  const getSeedDiffComments = (file: DiffFile, row: (typeof diffRows)[number]): DiffThreadComment[] => (
    file.id === "security" && row.comment
      ? [{
          id: `seed-${file.id}-${row.line}`,
          author: row.comment.author,
          time: row.comment.time,
          text: row.comment.text,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          line: row.line
        }]
      : []
  );

  const getDiffLineComments = (file: DiffFile, row: (typeof diffRows)[number]) => {
    const threadKey = getDiffThreadKey(file.id, row.line);
    return [
      ...getSeedDiffComments(file, row),
      ...(diffThreadComments[threadKey] ?? [])
    ];
  };

  const handleDiffCommentSubmit = (file: DiffFile, row: (typeof diffRows)[number]) => {
    const threadKey = getDiffThreadKey(file.id, row.line);
    const draft = diffCommentDrafts[threadKey]?.trim();
    if (!draft) return;

    setDiffThreadComments((prev) => ({
      ...prev,
      [threadKey]: [
        ...(prev[threadKey] ?? []),
        {
          id: `line-${file.id}-${row.line}-${Date.now()}`,
          author: "나",
          time: "방금",
          text: draft,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          line: row.line
        }
      ]
    }));
    setDiffCommentDrafts((prev) => ({ ...prev, [threadKey]: "" }));
    setActiveDiffThread({ fileId: file.id, line: row.line });
  };

  const getEditedDiffCode = (file: DiffFile, row: (typeof diffRows)[number]) => (
    diffEdits[getDiffThreadKey(file.id, row.line)] ?? row.code
  );

  const getPrThreadMessages = () => [
    ...diffFiles.flatMap((file) => diffRows.flatMap((row) => getSeedDiffComments(file, row))),
    ...prThreadComments
  ];

  const getPrLineMessages = (file: DiffFile, row: (typeof diffRows)[number]) => (
    getPrThreadMessages().filter((comment) => comment.fileId === file.id && comment.line === row.line)
  );

  const handleDiffReferenceSelect = (file: DiffFile, row: (typeof diffRows)[number]) => {
    const code = getEditedDiffCode(file, row);
    const reference = `${file.name}:${row.line}`;
    const referenceBlock = `> ${reference}\n> ${code || "(빈 줄)"}`;

    setActiveDiffThread({ fileId: file.id, line: row.line });
    setPrThreadDraft((current) => {
      if (current.includes(reference)) return current;
      return current.trim() ? `${referenceBlock}\n\n${current}` : `${referenceBlock}\n\n`;
    });
  };

  const handleDiffLineCodeChange = (file: DiffFile, row: (typeof diffRows)[number], value: string) => {
    setDiffEdits((prev) => ({
      ...prev,
      [getDiffThreadKey(file.id, row.line)]: value
    }));
  };

  const handlePrThreadSubmit = () => {
    const draft = prThreadDraft.trim();
    if (!draft) return;

    const referencedFile = activeDiffThread
      ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
      : null;
    const referencedRow = activeDiffThread
      ? diffRows.find((row) => row.line === activeDiffThread.line)
      : null;

    setPrThreadComments((prev) => [
      ...prev,
      {
        id: `pr-thread-${Date.now()}`,
        author: "나",
        time: "방금",
        text: draft,
        fileId: referencedFile?.id ?? "pr",
        fileName: referencedFile?.name ?? `PR #${prNumber}`,
        filePath: referencedFile?.path ?? prTitle,
        line: referencedRow?.line ?? 0
      }
    ]);
    setPrThreadDraft("");
  };

  const renderOriginalPrTab = () => (
    <div className="grid gap-5">
      <section
        className="overflow-hidden rounded-2xl"
        style={{
          background: "rgba(4, 11, 20, 0.88)",
          border: "1px solid rgba(56, 139, 253, 0.42)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.26)"
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          style={{
            background: "rgba(13, 38, 67, 0.78)",
            borderBottom: "1px solid rgba(56, 139, 253, 0.34)"
          }}
        >
          <div className="flex flex-wrap items-center gap-2 tracking-tight">
            <span style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
              {prData.githubUser || author}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 800 }}>
              {originalActivityText}
            </span>
          </div>
          <span
            className="rounded-full px-3 py-1"
            style={{
              border: "1px solid rgba(88, 166, 255, 0.58)",
              color: "#9CCBFF",
              fontSize: 12,
              fontWeight: 900
            }}
          >
            Member
          </span>
        </div>

        <div className="px-6 py-6">
          <section className="mb-7">
            <h3
              className="m-0 mb-4 tracking-tight"
              style={{ color: "var(--white)", fontSize: 24, fontWeight: 950 }}
            >
              What
            </h3>
            <div style={{ borderTop: "1px solid rgba(234, 247, 255, 0.16)" }} />
            <ul className="m-0 mt-4 grid gap-2 pl-5" style={{ color: "var(--white)", fontSize: 15, fontWeight: 820, lineHeight: 1.58 }}>
              {originalWhatItems.map((item) => (
                <li key={item}>{renderInlineCode(item)}</li>
              ))}
            </ul>
          </section>

          <section className="mb-7">
            <h3
              className="m-0 mb-4 tracking-tight"
              style={{ color: "var(--white)", fontSize: 24, fontWeight: 950 }}
            >
              Issue
            </h3>
            <div style={{ borderTop: "1px solid rgba(234, 247, 255, 0.16)" }} />
            <p className="m-0 mt-4 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 15, fontWeight: 850 }}>
              Closes:{" "}
              <span style={{ color: "var(--neon-cyan)", fontWeight: 950 }}>
                {originalIssueTitle}
              </span>
            </p>
          </section>

          <section>
            <h3
              className="m-0 mb-4 tracking-tight"
              style={{ color: "var(--white)", fontSize: 24, fontWeight: 950 }}
            >
              체크리스트
            </h3>
            <div style={{ borderTop: "1px solid rgba(234, 247, 255, 0.16)" }} />
            <div className="mt-4 grid gap-3">
              {originalChecklistItems.map((item) => (
                <label key={item} className="flex items-center gap-3 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 850 }}>
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    style={{ accentColor: "var(--neon-cyan)" }}
                  />
                  {item}
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );

  const renderSummaryTab = () => (
    <div className="grid gap-6">
      <section className="rounded-2xl px-6 py-5" style={{
        background: "rgba(32, 227, 255, 0.10)",
        border: "1px solid rgba(32, 227, 255, 0.30)"
      }}>
        <div className="mb-4 flex items-center gap-3">
          <Sparkles size={24} style={{ color: "var(--neon-cyan)" }} />
          <h3 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 22, fontWeight: 950 }}>
            AI 분석 요약
          </h3>
        </div>
        <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 15, fontWeight: 850, lineHeight: 1.75 }}>
          {summaryText}
        </p>
      </section>

      <section className="rounded-2xl px-6 py-5" style={{
        background: "rgba(239, 68, 68, 0.10)",
        border: "1px solid rgba(239, 68, 68, 0.28)"
      }}>
        <h3 className="m-0 mb-4 tracking-tight" style={{ color: "#FF6B6B", fontSize: 18, fontWeight: 950 }}>
          주의사항
        </h3>
        <div className="grid gap-3">
          {cautionItems.map((item) => (
            <p key={item} className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 850 }}>
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl px-6 py-5" style={{
        background: "rgba(34, 197, 94, 0.10)",
        border: "1px solid rgba(34, 197, 94, 0.30)"
      }}>
        <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--matrix-green)", fontSize: 18, fontWeight: 950 }}>
          긍정적인 점
        </h3>
        <div className="grid gap-3">
          {positiveItems.map((item) => (
            <p key={item} className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 850 }}>
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );

  const renderContentTab = () => (
    <div className="grid gap-5">
      <section
        className="overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, rgba(32, 227, 255, 0.12), rgba(57, 255, 136, 0.055))",
          border: "1px solid rgba(32, 227, 255, 0.24)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{
                background: "rgba(32, 227, 255, 0.12)",
                border: "1px solid rgba(32, 227, 255, 0.26)",
                color: "var(--neon-cyan)"
              }}
            >
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className="m-0 mb-1 font-mono uppercase tracking-[0.14em]" style={{ color: "var(--neon-cyan)", fontSize: 11, fontWeight: 950 }}>
                AI Feedback
              </p>
              <h3 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 22, fontWeight: 950 }}>
                고쳐야 할 부분을 코드 기준으로 비교합니다
              </h3>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1.5"
            style={{
              background: "rgba(245, 158, 11, 0.14)",
              border: "1px solid rgba(245, 158, 11, 0.38)",
              color: "#FBBF24",
              fontSize: 12,
              fontWeight: 950
            }}
          >
            취약점 {aiFeedbackFiles.length}건 감지
          </span>
        </div>
        <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 15, fontWeight: 800, lineHeight: 1.75 }}>
          PR 설명 대신 AI가 발견한 위험 지점과 수정 방향을 먼저 보여줍니다. 각 파일은 왼쪽에 현재 코드, 오른쪽에 AI가 추천하는 코드가 나란히 표시되어 바로 비교할 수 있습니다.
        </p>
      </section>

      {aiFeedbackFiles.map((file) => (
        <section
          key={file.id}
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(5, 11, 20, 0.52)",
            border: "1px solid rgba(32, 227, 255, 0.15)"
          }}
        >
          <div
            className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
            style={{ borderBottom: "1px solid rgba(32, 227, 255, 0.12)" }}
          >
            <div className="flex min-w-0 gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(234, 247, 255, 0.06)",
                  border: "1px solid rgba(234, 247, 255, 0.12)",
                  color: "var(--neon-cyan)"
                }}
              >
                <FileCode size={21} />
              </span>
              <div className="min-w-0">
                <h4 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
                  {file.name}
                </h4>
                <p className="m-0 mt-1 truncate font-mono" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
                  {file.path}
                </p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: file.risk === "높음" ? "rgba(239, 68, 68, 0.13)" : "rgba(245, 158, 11, 0.13)",
                border: file.risk === "높음" ? "1px solid rgba(239, 68, 68, 0.38)" : "1px solid rgba(245, 158, 11, 0.38)",
                color: file.risk === "높음" ? "#FF8FA3" : "#FBBF24",
                fontSize: 12,
                fontWeight: 950
              }}
            >
              <AlertTriangle size={14} />
              위험도 {file.risk}
            </span>
          </div>

          <div className="grid gap-4 px-5 py-5 lg:grid-cols-2">
            <div className="rounded-2xl px-4 py-4" style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.20)"
            }}>
              <p className="m-0 mb-2 tracking-tight" style={{ color: "#FF8FA3", fontSize: 13, fontWeight: 950 }}>
                어떤 취약점인가요
              </p>
              <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 800, lineHeight: 1.65 }}>
                {file.vulnerability}
              </p>
            </div>
            <div className="rounded-2xl px-4 py-4" style={{
              background: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.22)"
            }}>
              <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--matrix-green)", fontSize: 13, fontWeight: 950 }}>
                어떻게 고치면 좋나요
              </p>
              <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 800, lineHeight: 1.65 }}>
                {file.fix}
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-2" style={{ borderTop: "1px solid rgba(32, 227, 255, 0.12)" }}>
            {[
              {
                title: "현재 코드",
                tone: "#FF8FA3",
                bg: "rgba(239, 68, 68, 0.055)",
                prefix: "-",
                startLine: file.currentStartLine,
                lines: file.currentCode
              },
              {
                title: "AI 추천 코드",
                tone: "#39FF88",
                bg: "rgba(34, 197, 94, 0.055)",
                prefix: "+",
                startLine: file.recommendedStartLine,
                lines: file.recommendedCode
              }
            ].map((block) => (
              <div
                key={`${file.id}-${block.title}`}
                className="min-w-0"
                style={{
                  background: block.bg,
                  borderRight: block.title === "현재 코드" ? "1px solid rgba(32, 227, 255, 0.12)" : undefined
                }}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(234, 247, 255, 0.08)" }}>
                  <span className="tracking-tight" style={{ color: block.tone, fontSize: 13, fontWeight: 950 }}>
                    {block.title}
                  </span>
                  <span className="font-mono" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
                    {file.name}
                  </span>
                </div>
                <div className="codedock-scrollbar-hidden overflow-x-auto px-0 py-2">
                  {block.lines.map((line, index) => (
                    <div key={`${file.id}-${block.title}-${index}`} className="grid min-w-[520px] grid-cols-[52px_28px_minmax(0,1fr)] items-start px-4 py-1.5 font-mono">
                      <span style={{ color: "rgba(234, 247, 255, 0.38)", fontSize: 12, fontWeight: 800 }}>
                        {block.startLine + index}
                      </span>
                      <span style={{ color: block.tone, fontSize: 12, fontWeight: 950 }}>{block.prefix}</span>
                      <code className="whitespace-pre-wrap break-words" style={{ color: "var(--soft-mint)", fontSize: 12.5, fontWeight: 800, lineHeight: 1.65 }}>
                        {line}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 px-5 py-4" style={{ borderTop: "1px solid rgba(32, 227, 255, 0.12)" }}>
            {file.findings.map((finding) => (
              <span
                key={finding}
                className="rounded-full px-3 py-1.5 tracking-tight"
                style={{
                  background: "rgba(234, 247, 255, 0.055)",
                  border: "1px solid rgba(234, 247, 255, 0.10)",
                  color: "var(--soft-mint)",
                  fontSize: 12,
                  fontWeight: 850
                }}
              >
                {finding}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="grid gap-4">
      {[
        ["10:23", "김진필", "feature/auth 브랜치에 인증 변경 사항을 푸시"],
        ["10:26", "CodeDock AI", "인증 변경 감지 후 보안 리뷰를 권장"],
        ["10:45", "김진필", "CSRF 비활성화 사유 주석 요청"],
        ["10:47", "김준우", "JWT stateless 구조 문서화 제안"]
      ].map(([time, user, text]) => (
        <div key={`${time}-${user}`} className="flex gap-4 rounded-2xl px-5 py-4" style={{
          background: "rgba(5, 11, 20, 0.46)",
          border: "1px solid rgba(32, 227, 255, 0.12)"
        }}>
          <span className="font-mono" style={{ color: "var(--neon-cyan)", fontSize: 13, fontWeight: 950 }}>{time}</span>
          <div>
            <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>{user}</p>
            <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 14, fontWeight: 800 }}>{text}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmbeddedDiffThreadChat = () => {
    const activeThreadFile = activeDiffThread
      ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
      : null;
    const activeThreadRow = activeDiffThread
      ? diffRows.find((row) => row.line === activeDiffThread.line)
      : null;
    const activeThreadKey = activeThreadFile && activeThreadRow
      ? getDiffThreadKey(activeThreadFile.id, activeThreadRow.line)
      : null;
    const activeThreadComments = activeThreadFile && activeThreadRow
      ? getDiffLineComments(activeThreadFile, activeThreadRow)
      : [];
    const allThreadItems = diffFiles.flatMap((file) => (
      diffRows.map((row) => ({
        key: getDiffThreadKey(file.id, row.line),
        file,
        row,
        comments: getDiffLineComments(file, row)
      }))
    )).filter((item) => item.comments.length > 0);

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderBottom: "1px solid rgba(32, 227, 255, 0.14)",
            backdropFilter: "blur(14px)"
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
              <h3 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                스레드 채팅방
              </h3>
            </div>
            <span
              className="rounded-full px-2 py-1 font-mono"
              style={{
                background: "rgba(57, 255, 136, 0.10)",
                border: "1px solid rgba(57, 255, 136, 0.24)",
                color: "var(--matrix-green)",
                fontSize: 9,
                fontWeight: 950
              }}
            >
              EMBED
            </span>
          </div>
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.45 }}>
            메인 채팅의 리뷰 룸을 불러와 DIFF 라인별 댓글을 같은 스레드로 이어갑니다.
          </p>
        </div>

        <div className="codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {activeThreadFile && activeThreadRow && activeThreadKey ? (
            <div className="grid gap-3">
              <div
                className="rounded-2xl px-3 py-2"
                style={{
                  background: "rgba(32, 227, 255, 0.08)",
                  border: "1px solid rgba(32, 227, 255, 0.20)"
                }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 12, fontWeight: 950 }}>
                    {activeThreadFile.name}:{activeThreadRow.line}
                  </span>
                  <span className="rounded-full px-2 py-1" style={{
                    background: "rgba(234, 247, 255, 0.07)",
                    color: "var(--soft-mint)",
                    fontSize: 10,
                    fontWeight: 900
                  }}>
                    댓글 {activeThreadComments.length}
                  </span>
                </div>
                <p className="hidden">
                  {activeThreadFile.path}/{activeThreadFile.name}
                </p>
                <code className="block rounded-xl px-3 py-1 font-mono" style={{
                  background: "rgba(5, 11, 20, 0.72)",
                  border: "1px solid rgba(234, 247, 255, 0.08)",
                  color: activeThreadRow.added ? "#D7FFE7" : "#C6D4E5",
                  fontSize: 10,
                  fontWeight: 850,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {activeThreadRow.code || " "}
                </code>
              </div>

              {false && (
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(57, 255, 136, 0.08)",
                  border: "1px solid rgba(57, 255, 136, 0.18)"
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles size={14} style={{ color: "var(--matrix-green)" }} />
                  <span className="tracking-tight" style={{ color: "var(--matrix-green)", fontSize: 12, fontWeight: 950 }}>
                    CodeDock
                  </span>
                </div>
                <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                  {activeThreadFile.name} {activeThreadRow.line}번 줄 스레드를 메인 리뷰 채팅방에서 불러왔어요.
                </p>
              </div>
              )}

              <div className="grid gap-3">
                {activeThreadComments.length === 0 ? (
                  <div
                    className="rounded-2xl px-4 py-4 tracking-tight"
                    style={{
                      background: "rgba(234, 247, 255, 0.045)",
                      border: "1px dashed rgba(32, 227, 255, 0.18)",
                      color: "var(--muted)",
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1.6
                    }}
                  >
                    아직 이 라인에는 댓글이 없습니다. 아래 입력창에서 첫 리뷰 스레드를 시작하세요.
                  </div>
                ) : (
                  activeThreadComments.map((comment) => {
                    const isMine = comment.id.startsWith("line-");

                    return (
                      <div
                        key={comment.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className="max-w-[92%] rounded-2xl px-3 py-2"
                          style={{
                            background: isMine ? "rgba(32, 227, 255, 0.12)" : "rgba(11, 22, 40, 0.78)",
                            border: isMine ? "1px solid rgba(32, 227, 255, 0.28)" : "1px solid rgba(32, 227, 255, 0.12)"
                          }}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="h-6 w-6 rounded-full text-center leading-6"
                              style={{
                                background: isMine ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(32, 227, 255, 0.14)",
                                color: isMine ? "#021014" : "var(--neon-cyan)",
                                fontSize: 10,
                                fontWeight: 950
                              }}
                            >
                              {comment.author.slice(0, 1)}
                            </span>
                            <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 12, fontWeight: 950 }}>
                              {comment.author}
                            </span>
                            <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                              {comment.time}
                            </span>
                          </div>
                          <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div
                className="rounded-2xl px-4 py-4"
                style={{
                  background: "rgba(32, 227, 255, 0.07)",
                  border: "1px solid rgba(32, 227, 255, 0.16)"
                }}
              >
                <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 13, fontWeight: 850, lineHeight: 1.6 }}>
                  DIFF의 말풍선 버튼을 누르면 해당 파일과 줄 번호가 연결된 스레드 채팅방이 열립니다.
                </p>
              </div>
              {allThreadItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveFileId(item.file.id);
                    setActiveDiffThread({ fileId: item.file.id, line: item.row.line });
                  }}
                  className="rounded-2xl border-0 px-4 py-3 text-left transition-all hover:translate-y-[-1px]"
                  style={{
                    background: "rgba(11, 22, 40, 0.72)",
                    border: "1px solid rgba(32, 227, 255, 0.14)",
                    cursor: "pointer"
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 11, fontWeight: 950 }}>
                      {item.file.name}:{item.row.line}
                    </span>
                    <span style={{ color: "var(--soft-mint)", fontSize: 10, fontWeight: 900 }}>
                      댓글 {item.comments.length}
                    </span>
                  </div>
                  <p className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 12, fontWeight: 850 }}>
                    {item.comments[item.comments.length - 1]?.text}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="px-4 py-3"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderTop: "1px solid rgba(32, 227, 255, 0.14)"
          }}
        >
          {activeThreadFile && activeThreadRow && activeThreadKey ? (
            <>
              <textarea
                value={diffCommentDrafts[activeThreadKey] ?? ""}
                onChange={(event) => setDiffCommentDrafts((prev) => ({ ...prev, [activeThreadKey]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleDiffCommentSubmit(activeThreadFile, activeThreadRow);
                  }
                }}
                placeholder={`${activeThreadFile.name} ${activeThreadRow.line}번 줄에 답글 남기기...`}
                className="block w-full resize-none rounded-xl px-3 py-2 outline-none tracking-tight"
                rows={1}
                style={{
                  background: "rgba(11, 22, 40, 0.86)",
                  border: "1px solid rgba(32, 227, 255, 0.18)",
                  color: "var(--white)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.55
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 9, fontWeight: 750 }}>
                  Enter 전송 · Shift+Enter 줄바꿈
                </span>
                <button
                  type="button"
                  onClick={() => handleDiffCommentSubmit(activeThreadFile, activeThreadRow)}
                  disabled={!diffCommentDrafts[activeThreadKey]?.trim()}
                  className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                    color: "#021014",
                    cursor: diffCommentDrafts[activeThreadKey]?.trim() ? "pointer" : "not-allowed",
                    opacity: diffCommentDrafts[activeThreadKey]?.trim() ? 1 : 0.48,
                    fontSize: 12,
                    fontWeight: 950
                  }}
                >
                  <Send size={13} />
                  답글
                </button>
              </div>
            </>
          ) : (
            <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
              오른쪽 채팅방에 연결할 DIFF 라인을 먼저 선택해주세요.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderPrThreadChat = () => {
    const selectedFile = activeDiffThread
      ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
      : null;
    const selectedRow = activeDiffThread
      ? diffRows.find((row) => row.line === activeDiffThread.line)
      : null;
    const threadMessages = getPrThreadMessages();
    const selectedReferenceLabel = selectedFile && selectedRow
      ? `${selectedFile.name}:${selectedRow.line}`
      : `PR #${prNumber}`;

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderBottom: "1px solid rgba(32, 227, 255, 0.14)",
            backdropFilter: "blur(14px)"
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
              <h3 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                PR #{prNumber} 스레드 채팅방
              </h3>
            </div>
            <span
              className="rounded-full px-2 py-1 font-mono"
              style={{
                background: "rgba(57, 255, 136, 0.10)",
                border: "1px solid rgba(57, 255, 136, 0.24)",
                color: "var(--matrix-green)",
                fontSize: 9,
                fontWeight: 950
              }}
            >
              PR THREAD
            </span>
          </div>
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.45 }}>
            DIFF 라인을 클릭하면 이 PR 스레드 입력창에 파일과 줄 번호가 참조로 붙습니다.
          </p>
        </div>

        <div className="codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            className="mb-3 rounded-2xl px-3 py-3"
            style={{
              background: "rgba(32, 227, 255, 0.08)",
              border: "1px solid rgba(32, 227, 255, 0.20)"
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 12, fontWeight: 950 }}>
                현재 참조: {selectedReferenceLabel}
              </span>
              <span className="rounded-full px-2 py-1" style={{
                background: "rgba(234, 247, 255, 0.07)",
                color: "var(--soft-mint)",
                fontSize: 10,
                fontWeight: 900
              }}>
                댓글 {threadMessages.length}
              </span>
            </div>
            {selectedFile && selectedRow ? (
              <>
                <p className="m-0 mb-2 truncate font-mono" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                  {selectedFile.path}/{selectedFile.name}
                </p>
                <code className="block rounded-xl px-3 py-2 font-mono" style={{
                  background: "rgba(5, 11, 20, 0.72)",
                  border: "1px solid rgba(234, 247, 255, 0.08)",
                  color: selectedRow.added ? "#D7FFE7" : "#C6D4E5",
                  fontSize: 10,
                  fontWeight: 850,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {getEditedDiffCode(selectedFile, selectedRow) || " "}
                </code>
              </>
            ) : (
              <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                아직 선택한 DIFF 라인이 없습니다. 왼쪽 코드 라인을 클릭하면 참조가 입력창에 자동으로 붙습니다.
              </p>
            )}
          </div>

          <div className="grid gap-3">
            {threadMessages.map((comment) => {
              const isMine = comment.author === "나";
              const hasLineReference = comment.fileId !== "pr" && comment.line > 0;

              return (
                <div key={comment.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[92%] rounded-2xl px-3 py-2"
                    style={{
                      background: isMine ? "rgba(32, 227, 255, 0.12)" : "rgba(11, 22, 40, 0.78)",
                      border: isMine ? "1px solid rgba(32, 227, 255, 0.28)" : "1px solid rgba(32, 227, 255, 0.12)"
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-full text-center leading-6"
                        style={{
                          background: isMine ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(32, 227, 255, 0.14)",
                          color: isMine ? "#021014" : "var(--neon-cyan)",
                          fontSize: 10,
                          fontWeight: 950
                        }}
                      >
                        {comment.author.slice(0, 1)}
                      </span>
                      <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 12, fontWeight: 950 }}>
                        {comment.author}
                      </span>
                      <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                        {comment.time}
                      </span>
                    </div>
                    {hasLineReference && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFileId(comment.fileId);
                          setActiveDiffThread({ fileId: comment.fileId, line: comment.line });
                        }}
                        className="mb-2 rounded-lg border-0 px-2 py-1 text-left font-mono"
                        style={{
                          background: "rgba(32, 227, 255, 0.10)",
                          border: "1px solid rgba(32, 227, 255, 0.18)",
                          color: "var(--neon-cyan)",
                          cursor: "pointer",
                          fontSize: 10,
                          fontWeight: 900
                        }}
                      >
                        {comment.fileName}:{comment.line}
                      </button>
                    )}
                    <p className="m-0 whitespace-pre-wrap tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                      {comment.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="px-4 py-3"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderTop: "1px solid rgba(32, 227, 255, 0.14)"
          }}
        >
          {selectedFile && selectedRow && (
            <div
              className="mb-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2"
              style={{
                background: "rgba(32, 227, 255, 0.07)",
                border: "1px solid rgba(32, 227, 255, 0.16)"
              }}
            >
              <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 10, fontWeight: 950 }}>
                참조 중: {selectedFile.name}:{selectedRow.line}
              </span>
              <button
                type="button"
                onClick={() => setActiveDiffThread(null)}
                className="rounded-md border-0 px-2 py-1"
                style={{
                  background: "rgba(234, 247, 255, 0.06)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 900
                }}
              >
                해제
              </button>
            </div>
          )}
          <textarea
            value={prThreadDraft}
            onChange={(event) => setPrThreadDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handlePrThreadSubmit();
              }
            }}
            placeholder="PR 스레드에 댓글 남기기... DIFF 라인을 클릭하면 참조가 자동으로 들어옵니다."
            className="block w-full resize-none rounded-xl px-3 py-2 outline-none tracking-tight"
            rows={3}
            style={{
              background: "rgba(11, 22, 40, 0.86)",
              border: "1px solid rgba(32, 227, 255, 0.18)",
              color: "var(--white)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.55
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 9, fontWeight: 750 }}>
              PR 하나당 하나의 스레드 · Enter 전송
            </span>
            <button
              type="button"
              onClick={handlePrThreadSubmit}
              disabled={!prThreadDraft.trim()}
              className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                color: "#021014",
                cursor: prThreadDraft.trim() ? "pointer" : "not-allowed",
                opacity: prThreadDraft.trim() ? 1 : 0.48,
                fontSize: 12,
                fontWeight: 950
              }}
            >
              <Send size={13} />
              보내기
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiffTab = () => (
    <div
      className="grid h-full min-h-0 overflow-hidden rounded-2xl"
      style={{
        gridTemplateColumns: "230px minmax(0, 1fr) 380px",
        background: "rgba(5, 11, 20, 0.42)",
        border: "1px solid rgba(32, 227, 255, 0.14)"
      }}
    >
      <aside className="codedock-scrollbar-hidden min-h-0 overflow-y-auto px-4 py-4" style={{
        borderRight: "1px solid rgba(32, 227, 255, 0.12)"
      }}>
        <div className="mb-4">
          <h3 className="m-0 mb-1 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
            변경 파일
          </h3>
          <p className="m-0" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
            파일 {diffFiles.length}개
          </p>
        </div>

        <div className="grid gap-3">
          {diffFiles.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setActiveFileId(file.id)}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: isActive ? "rgba(32, 227, 255, 0.10)" : "transparent",
                  border: isActive ? "1px solid rgba(57, 255, 136, 0.28)" : "1px solid transparent",
                  cursor: "pointer"
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5" style={{
                    background: `${statusColor(file.status)}22`,
                    color: statusColor(file.status),
                    fontSize: 10,
                    fontWeight: 950
                  }}>
                    {statusLabel(file.status)}
                  </span>
                  <span className="rounded-md px-2 py-0.5" style={{
                    background: "rgba(234, 247, 255, 0.07)",
                    color: "var(--muted)",
                    fontSize: 10,
                    fontWeight: 850
                  }}>
                    {tagLabel(file.tag)}
                  </span>
                </div>
                <p className="m-0 mb-1 truncate tracking-tight" style={{
                  color: isActive ? "var(--matrix-green)" : "var(--white)",
                  fontSize: 13,
                  fontWeight: 950
                }}>
                  {file.name}
                </p>
                <p className="m-0 mb-2 truncate font-mono" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 750 }}>
                  {file.path}
                </p>
                <div className="flex gap-2 font-mono" style={{ fontSize: 11, fontWeight: 950 }}>
                  <span style={{ color: "#22C55E" }}>+{file.additions}</span>
                  <span style={{ color: "#EF4444" }}>-{file.deletions}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="codedock-scrollbar-hidden min-h-0 overflow-y-auto">
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderBottom: "1px solid rgba(32, 227, 255, 0.12)",
            backdropFilter: "blur(14px)"
          }}
        >
          <FileCode size={16} style={{ color: "var(--neon-cyan)" }} />
          <span className="truncate font-mono" style={{ color: "var(--white)", fontSize: 13, fontWeight: 900 }}>
            {activeFile.path}/{activeFile.name}
          </span>
          <span className="ml-auto rounded-full px-3 py-1 tracking-tight" style={{
            background: "rgba(32, 227, 255, 0.08)",
            border: "1px solid rgba(32, 227, 255, 0.16)",
            color: "var(--neon-cyan)",
            fontSize: 11,
            fontWeight: 900
          }}>
            라인 클릭: 스레드 참조 · 코드 셀 입력: diff 수정
          </span>
        </div>

        <div className="py-5 font-mono" style={{ color: "var(--soft-mint)", fontSize: 13, lineHeight: 1.65 }}>
          {diffRows.map((row) => {
            const threadKey = getDiffThreadKey(activeFile.id, row.line);
            const editedCode = getEditedDiffCode(activeFile, row);
            const lineComments = getPrLineMessages(activeFile, row);
            const isThreadOpen = activeDiffThread?.fileId === activeFile.id && activeDiffThread.line === row.line;
            const isEdited = editedCode !== row.code;

            return (
              <div key={row.line}>
                <div
                  className="grid items-center"
                  onClick={() => handleDiffReferenceSelect(activeFile, row)}
                  style={{
                    gridTemplateColumns: "58px 32px minmax(0, 1fr) 92px",
                    background: isThreadOpen
                      ? "rgba(32, 227, 255, 0.11)"
                      : row.added
                        ? "rgba(34, 197, 94, 0.12)"
                        : "transparent",
                    borderLeft: isThreadOpen ? "3px solid var(--neon-cyan)" : row.added ? "3px solid #22C55E" : "3px solid transparent",
                    cursor: "pointer"
                  }}
                >
                  <span className="select-none text-right" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
                    {row.line}
                  </span>
                  <span className="select-none text-center" style={{ color: row.added ? "#22C55E" : "var(--muted)", fontWeight: 950 }}>
                    {row.added ? "+" : ""}
                  </span>
                  <textarea
                    value={editedCode}
                    onChange={(event) => handleDiffLineCodeChange(activeFile, row, event.target.value)}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDiffReferenceSelect(activeFile, row);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    aria-label={`${activeFile.name} ${row.line}번 줄 코드 수정`}
                    className="codedock-scrollbar-hidden min-w-0 resize-none whitespace-pre-wrap break-words border-0 bg-transparent px-2 py-1.5 font-mono outline-none"
                    rows={1}
                    style={{
                      color: row.added ? "#D7FFE7" : "#C6D4E5",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.65,
                      overflow: "hidden"
                    }}
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDiffReferenceSelect(activeFile, row);
                    }}
                    className="mx-1 flex h-7 items-center justify-center gap-1 rounded-md border-0 px-2"
                    style={{
                      background: isThreadOpen || lineComments.length > 0 ? "rgba(32, 227, 255, 0.13)" : "transparent",
                      border: isThreadOpen || lineComments.length > 0 ? "1px solid rgba(32, 227, 255, 0.28)" : "1px solid transparent",
                      color: isThreadOpen || lineComments.length > 0 ? "var(--neon-cyan)" : "var(--muted)",
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 950
                    }}
                    title={`${activeFile.name} ${row.line}번 줄을 PR 스레드에 참조`}
                    aria-label={`${activeFile.name} ${row.line}번 줄을 PR 스레드에 참조`}
                  >
                    <MessageSquare size={13} />
                    {isEdited && <span>수정</span>}
                    {lineComments.length > 0 && <span>{lineComments.length}</span>}
                  </button>
                </div>

                {false && lineComments.length > 0 && (
                  <div
                    className="ml-[64px] mr-6 my-0 rounded-r-xl px-4 py-3"
                    style={{
                      background: "rgba(13, 36, 60, 0.78)",
                      borderLeft: "2px solid var(--matrix-green)"
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2 tracking-tight" style={{
                      color: "var(--neon-cyan)",
                      fontSize: 11,
                      fontWeight: 950
                    }}>
                      <MessageSquare size={13} />
                      {activeFile.name}:{row.line} 스레드 · 댓글 {lineComments.length}개
                    </div>
                    <div className="grid gap-3">
                      {lineComments.map((comment) => (
                        <div key={comment.id}>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full text-center leading-5" style={{
                              background: "rgba(32, 227, 255, 0.14)",
                              color: "var(--neon-cyan)",
                              fontSize: 10,
                              fontWeight: 950
                            }}>
                              {comment.author.slice(0, 1)}
                            </span>
                            <span style={{ color: "var(--white)", fontSize: 12, fontWeight: 950 }}>{comment.author}</span>
                            <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>{comment.time}</span>
                          </div>
                          <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 12, fontWeight: 800 }}>
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {false && isThreadOpen && (
                  <div className="ml-[64px] mr-6 rounded-r-xl px-4 py-3" style={{
                    background: "rgba(5, 11, 20, 0.72)",
                    borderLeft: "2px solid rgba(32, 227, 255, 0.70)",
                    borderTop: lineComments.length > 0 ? "1px solid rgba(32, 227, 255, 0.10)" : "none"
                  }}>
                    <p className="m-0 mb-2 tracking-tight" style={{
                      color: "var(--muted)",
                      fontSize: 11,
                      fontWeight: 850
                    }}>
                      {activeFile.name} {row.line}번 줄에 스레드 댓글 달기
                    </p>
                    <textarea
                      value={diffCommentDrafts[threadKey] ?? ""}
                      onChange={(event) => setDiffCommentDrafts((prev) => ({ ...prev, [threadKey]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleDiffCommentSubmit(activeFile, row);
                        }
                      }}
                      placeholder="이 줄에 대한 리뷰 코멘트를 입력하세요..."
                      className="block w-full resize-none rounded-lg px-3 py-2 outline-none tracking-tight"
                      rows={2}
                      style={{
                        background: "rgba(11, 22, 40, 0.86)",
                        border: "1px solid rgba(32, 227, 255, 0.16)",
                        color: "var(--white)",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1.55
                      }}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDiffThread(null)}
                        className="rounded-lg border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: "rgba(234, 247, 255, 0.06)",
                          border: "1px solid rgba(234, 247, 255, 0.10)",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 900
                        }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiffCommentSubmit(activeFile, row)}
                        disabled={!diffCommentDrafts[threadKey]?.trim()}
                        className="inline-flex items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                          color: "#021014",
                          cursor: diffCommentDrafts[threadKey]?.trim() ? "pointer" : "not-allowed",
                          opacity: diffCommentDrafts[threadKey]?.trim() ? 1 : 0.48,
                          fontSize: 12,
                          fontWeight: 950
                        }}
                      >
                        <Send size={13} />
                        댓글 달기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <aside className="flex min-h-0 flex-col" style={{ borderLeft: "1px solid rgba(32, 227, 255, 0.12)" }}>
        {renderPrThreadChat()}
        {false && (() => {
          const activeThreadFile = activeDiffThread
            ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
            : null;
          const activeThreadRow = activeDiffThread
            ? diffRows.find((row) => row.line === activeDiffThread.line)
            : null;
          const activeThreadKey = activeThreadFile && activeThreadRow
            ? getDiffThreadKey(activeThreadFile.id, activeThreadRow.line)
            : null;
          const activeThreadComments = activeThreadFile && activeThreadRow
            ? getDiffLineComments(activeThreadFile, activeThreadRow)
            : [];
          const allThreadItems = diffFiles.flatMap((file) => (
            diffRows.map((row) => ({
              key: getDiffThreadKey(file.id, row.line),
              file,
              row,
              comments: getDiffLineComments(file, row)
            }))
          )).filter((item) => item.comments.length > 0);

          return (
            <div className="codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-5 rounded-2xl px-4 py-4" style={{
                background: "rgba(34, 197, 94, 0.10)",
                border: "1px solid rgba(34, 197, 94, 0.30)"
              }}>
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={17} style={{ color: "var(--matrix-green)" }} />
                  <h3 className="m-0 tracking-tight" style={{ color: "var(--matrix-green)", fontSize: 14, fontWeight: 950 }}>
                    AI 리뷰 요약
                  </h3>
                </div>
                <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 13, fontWeight: 800, lineHeight: 1.65 }}>
                  인증 관련 변경이 포함되어 있어 요청 제한 및 예외 응답 검토를 권장합니다.
                </p>
              </div>

              <section className="mb-5 rounded-2xl px-4 py-4" style={{
                background: "rgba(5, 11, 20, 0.56)",
                border: "1px solid rgba(32, 227, 255, 0.18)"
              }}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
                    <h3 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                      라인 스레드
                    </h3>
                  </div>
                  <span className="rounded-full px-2 py-1 font-mono" style={{
                    background: "rgba(32, 227, 255, 0.10)",
                    border: "1px solid rgba(32, 227, 255, 0.20)",
                    color: "var(--neon-cyan)",
                    fontSize: 11,
                    fontWeight: 950
                  }}>
                    {allThreadItems.length}
                  </span>
                </div>

                {activeThreadFile && activeThreadRow && activeThreadKey ? (
                  <div className="grid gap-4">
                    <div className="rounded-xl px-3 py-3" style={{
                      background: "rgba(32, 227, 255, 0.08)",
                      border: "1px solid rgba(32, 227, 255, 0.20)"
                    }}>
                      <p className="m-0 mb-1 truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 12, fontWeight: 950 }}>
                        {activeThreadFile.name}:{activeThreadRow.line}
                      </p>
                      <p className="m-0 mb-2 truncate font-mono" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                        {activeThreadFile.path}/{activeThreadFile.name}
                      </p>
                      <code className="block rounded-lg px-3 py-2 font-mono" style={{
                        background: "rgba(5, 11, 20, 0.72)",
                        border: "1px solid rgba(234, 247, 255, 0.08)",
                        color: activeThreadRow.added ? "#D7FFE7" : "#C6D4E5",
                        fontSize: 11,
                        fontWeight: 850,
                        whiteSpace: "pre-wrap"
                      }}>
                        {activeThreadRow.code || " "}
                      </code>
                    </div>

                    <div className="grid gap-3">
                      {activeThreadComments.length === 0 ? (
                        <p className="m-0 rounded-xl px-3 py-3 tracking-tight" style={{
                          background: "rgba(234, 247, 255, 0.045)",
                          border: "1px dashed rgba(32, 227, 255, 0.16)",
                          color: "var(--muted)",
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.6
                        }}>
                          아직 이 줄에 댓글이 없습니다. 아래 입력창에서 첫 댓글을 남겨보세요.
                        </p>
                      ) : (
                        activeThreadComments.map((comment) => (
                          <div key={comment.id} className="rounded-xl px-3 py-3" style={{
                            background: comment.author === "나" ? "rgba(32, 227, 255, 0.10)" : "rgba(11, 22, 40, 0.72)",
                            border: comment.author === "나" ? "1px solid rgba(32, 227, 255, 0.26)" : "1px solid rgba(32, 227, 255, 0.12)"
                          }}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full text-center leading-6" style={{
                                background: comment.author === "나" ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(32, 227, 255, 0.14)",
                                color: comment.author === "나" ? "#021014" : "var(--neon-cyan)",
                                fontSize: 10,
                                fontWeight: 950
                              }}>
                                {comment.author.slice(0, 1)}
                              </span>
                              <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 12, fontWeight: 950 }}>
                                {comment.author}
                              </span>
                              <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                                {comment.time}
                              </span>
                            </div>
                            <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                              {comment.text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <textarea
                        value={diffCommentDrafts[activeThreadKey] ?? ""}
                        onChange={(event) => setDiffCommentDrafts((prev) => ({ ...prev, [activeThreadKey]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleDiffCommentSubmit(activeThreadFile, activeThreadRow);
                          }
                        }}
                        placeholder={`${activeThreadFile.name} ${activeThreadRow.line}번 줄에 답글 남기기...`}
                        className="block w-full resize-none rounded-xl px-3 py-3 outline-none tracking-tight"
                        rows={3}
                        style={{
                          background: "rgba(11, 22, 40, 0.86)",
                          border: "1px solid rgba(32, 227, 255, 0.16)",
                          color: "var(--white)",
                          fontFamily: "inherit",
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.55
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 750 }}>
                          Enter 전송 · Shift+Enter 줄바꿈
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDiffCommentSubmit(activeThreadFile, activeThreadRow)}
                          disabled={!diffCommentDrafts[activeThreadKey]?.trim()}
                          className="inline-flex items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
                          style={{
                            background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                            color: "#021014",
                            cursor: diffCommentDrafts[activeThreadKey]?.trim() ? "pointer" : "not-allowed",
                            opacity: diffCommentDrafts[activeThreadKey]?.trim() ? 1 : 0.48,
                            fontSize: 12,
                            fontWeight: 950
                          }}
                        >
                          <Send size={13} />
                          답글
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, lineHeight: 1.6 }}>
                      DIFF의 말풍선 버튼을 누르면 파일명과 줄 번호가 연결된 스레드가 여기 열립니다.
                    </p>
                    {allThreadItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setActiveFileId(item.file.id);
                          setActiveDiffThread({ fileId: item.file.id, line: item.row.line });
                        }}
                        className="rounded-xl border-0 px-3 py-3 text-left transition-all hover:translate-y-[-1px]"
                        style={{
                          background: "rgba(32, 227, 255, 0.07)",
                          border: "1px solid rgba(32, 227, 255, 0.14)",
                          cursor: "pointer"
                        }}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: 11, fontWeight: 950 }}>
                            {item.file.name}:{item.row.line}
                          </span>
                          <span style={{ color: "var(--soft-mint)", fontSize: 10, fontWeight: 900 }}>
                            댓글 {item.comments.length}
                          </span>
                        </div>
                        <p className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 12, fontWeight: 850 }}>
                          {item.comments[item.comments.length - 1]?.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="m-0 mb-3 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                  보안 체크리스트
                </h3>
                <div className="grid gap-3">
                  {checklist.map((item) => (
                    <div key={item.text} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded" style={{
                        background: item.checked ? "var(--matrix-green)" : "rgba(234, 247, 255, 0.10)",
                        border: item.checked ? "1px solid var(--matrix-green)" : "1px solid rgba(234, 247, 255, 0.28)"
                      }}>
                        {item.checked && <CheckCircle2 size={12} style={{ color: "#021014" }} />}
                      </span>
                      <span className="tracking-tight" style={{ color: item.checked ? "var(--white)" : "var(--muted)", fontSize: 12, fontWeight: 850 }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })()}
      </aside>
    </div>
  );

  const renderTabContent = () => {
    if (activePrTab === "original") return renderOriginalPrTab();
    if (activePrTab === "content") return renderContentTab();
    if (activePrTab === "history") return renderHistoryTab();
    if (activePrTab === "diff") return renderDiffTab();
    return renderSummaryTab();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]"
      style={{
        background: "rgba(8, 17, 31, 0.96)",
        border: "1px solid rgba(32, 227, 255, 0.24)",
        boxShadow: "0 30px 90px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      }}
    >
      <header className="flex items-start justify-between gap-6 px-8 py-7" style={{
        borderBottom: "1px solid rgba(32, 227, 255, 0.16)"
      }}>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 tracking-tight">
            <Github size={15} style={{ color: "var(--muted)" }} />
            <span className="font-mono" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
              {prData.repository || "codedock-team/codedock-frontend"}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>·</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>PR #{prNumber}</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>·</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>GitHub 동기화: 2분 전</span>
          </div>

          <h2 className="m-0 mb-3 tracking-tight" style={{ color: "var(--white)", fontSize: 28, fontWeight: 950 }}>
            PR #{prNumber}
          </h2>
          <p className="m-0 mb-5 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 900 }}>
            {prTitle}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono" style={{
              background: "rgba(32, 227, 255, 0.08)",
              border: "1px solid rgba(32, 227, 255, 0.18)",
              color: "var(--neon-cyan)",
              fontSize: 12,
              fontWeight: 900
            }}>
              <GitBranch size={13} />
              {branch}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 900 }}>main</span>
            <span className="h-6 w-6 rounded-full text-center leading-6" style={{
              background: "linear-gradient(135deg, var(--matrix-green), var(--deep-teal))",
              color: "#021014",
              fontSize: 11,
              fontWeight: 950
            }}>
              {authorBadge}
            </span>
            <span style={{ color: "var(--white)", fontSize: 13, fontWeight: 900 }}>{author}</span>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              color: "#FBBF24",
              fontSize: 12,
              fontWeight: 950
            }}>
              <ShieldCheck size={13} />
              AI 위험도: {riskLabel(risk)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-3 tracking-tight"
            style={{
              background: "rgba(239, 68, 68, 0.10)",
              border: "1px solid rgba(239, 68, 68, 0.46)",
              color: "#FF6B6B",
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer"
            }}
          >
            <AlertTriangle size={16} />
            변경 요청
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-3 tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))",
              border: 0,
              color: "#021014",
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer"
            }}
          >
            <CheckCircle2 size={16} />
            승인
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 tracking-tight transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(234, 247, 255, 0.055)",
              border: "1px solid rgba(234, 247, 255, 0.12)",
              color: "var(--muted)",
              fontSize: 13,
              fontWeight: 950,
              cursor: "pointer"
            }}
          >
            <ExternalLink size={15} />
            GitHub에서 열기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-[1.04]"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--muted)",
              cursor: "pointer"
            }}
            aria-label="PR 창 닫기"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <div className="shrink-0 px-8 py-5" style={{ borderBottom: "1px solid rgba(32, 227, 255, 0.12)" }}>
        <div className="codedock-scrollbar-hidden flex min-h-[46px] items-center gap-2 overflow-x-auto overflow-y-hidden">
          {prDialogTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePrTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePrTab(tab.id)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 tracking-tight transition-colors duration-150"
                style={{
                  minWidth: tab.id === "diff" ? 86 : 112,
                  background: isActive ? "rgba(32, 227, 255, 0.12)" : "rgba(5, 11, 20, 0.42)",
                  border: isActive ? "2px solid var(--neon-cyan)" : "2px solid rgba(234, 247, 255, 0.08)",
                  color: isActive ? "var(--neon-cyan)" : "var(--muted)",
                  fontSize: 14,
                  fontWeight: 950,
                  cursor: "pointer"
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 py-6">
        <div
          ref={tabContentRef}
          className={
            activePrTab === "diff"
              ? "h-full min-h-0 overflow-hidden"
              : "codedock-scrollbar-hidden h-full min-h-0 overflow-y-auto pr-1"
          }
        >
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
