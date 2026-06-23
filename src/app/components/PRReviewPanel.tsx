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
import { fetchWithAuth } from "../api/fetchWithAuth";
import { getAiSummary, type AiSummaryResponse } from "../api/pr";
import { AnimatePresence, motion } from "motion/react";

interface PRReviewPanelProps {
  prData: any;
  repositoryDbId?: number;
  workspaceId?: number;
  onClose: () => void;
  onMergePR?: (messageId: number) => void;
  externalThreadMessages?: any[];
  onAddThreadMessage?: (msg: any) => void | Promise<void>;
}

interface DiffFile {
  id: string;
  name: string;
  path: string;
  status: "modified" | "added" | "removed" | "renamed";
  tag: string;
  additions: number;
  deletions: number;
}

// 실제 PR diff 한 줄. removed=true면 삭제된 줄(빨강/-), added=true면 추가된 줄(초록/+), 둘 다 false면 context.
interface DiffRow {
  line: number | string;
  code: string;
  added: boolean;
  removed?: boolean;
}

interface RealDiffFile extends DiffFile {
  rows: DiffRow[];
}

// diff 행 헬퍼들이 받는 느슨한 타입 (목데이터의 comment 필드와 실제 데이터 모두 수용)
type DiffRowLike = DiffRow & { comment?: { author: string; time: string; text: string } };

// GitHub PR files API 응답을 화면용 파일/diff 행으로 변환
function mapPrFileStatus(status: string): DiffFile["status"] {
  if (status === "added") return "added";
  if (status === "removed") return "removed";
  if (status === "renamed") return "renamed";
  return "modified"; // modified, changed, copied 등
}

function extToTag(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1) : "file";
}

// GitHub unified diff(patch)를 줄 단위로 파싱. 새 파일 기준 줄번호를 추적한다.
function parsePatchToRows(patch: string): DiffRow[] {
  if (!patch) return [];
  const rows: DiffRow[] = [];
  let newLine = 0;
  let oldLine = 0;
  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      // @@ -oldStart,oldCount +newStart,newCount @@
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLine = parseInt(m[1], 10);
        newLine = parseInt(m[2], 10);
      }
      rows.push({ line: "…", code: raw.replace(/^@@.*?@@\s?/, "").trim() || raw, added: false });
      continue;
    }
    if (raw.startsWith("+")) {
      rows.push({ line: newLine, code: raw.slice(1), added: true });
      newLine += 1;
    } else if (raw.startsWith("-")) {
      rows.push({ line: oldLine, code: raw.slice(1), added: false, removed: true });
      oldLine += 1;
    } else {
      // context line (앞에 공백 1칸)
      rows.push({ line: newLine, code: raw.startsWith(" ") ? raw.slice(1) : raw, added: false });
      newLine += 1;
      oldLine += 1;
    }
  }
  return rows;
}

interface DiffThreadComment {
  id: string;
  backendReplyId?: number;
  backendThreadId?: number;
  senderMemberId?: number;
  author: string;
  time: string;
  text: string;
  fileId: string;
  fileName: string;
  filePath: string;
  line: number | string;
  code?: string;
  pending?: boolean;
  serverSyncState?: "pending" | "failed";
  sendError?: string;
}

interface ActiveDiffThread {
  fileId: string;
  line: number | string;
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


const reviewers = [
  { initials: "JP", name: "김진필", status: "Approved", color: "#22C55E" },
  { initials: "JW", name: "김준우", status: "Pending", color: "#F59E0B" },
  { initials: "JH", name: "김진현", status: "Commented", color: "var(--matrix-green)" }
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
  if (status === "added") return "#22C55E";
  if (status === "removed") return "#EF4444";
  if (status === "renamed") return "#A78BFA";
  return "var(--neon-cyan)";
}

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

function statusLabel(status: DiffFile["status"]) {
  if (status === "added") return "추가됨";
  if (status === "removed") return "삭제됨";
  if (status === "renamed") return "이름변경";
  return "수정됨";
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

const currentUserDisplayName = "김재준";
const currentUserAvatar = currentUserDisplayName.charAt(0);

function isCurrentUser(author?: string) {
  const trimmed = (author ?? "").trim();
  return trimmed === "나" || trimmed === currentUserDisplayName;
}

function getDisplayAuthor(author?: string) {
  const trimmed = (author ?? "").trim();
  return isCurrentUser(trimmed) ? currentUserDisplayName : trimmed;
}

function mapExternalThreadMessages(messages?: any[]): DiffThreadComment[] {
  const seedIds = new Set(
    diffFiles.flatMap((file) => diffRows.flatMap((row) =>
      file.id === "security" && row.comment ? [`seed-${file.id}-${row.line}`] : []
    ))
  );

  return (messages ?? [])
    .filter((message) => !seedIds.has(String(message.id)))
    .map((message): DiffThreadComment => ({
      id: String(message.id),
      backendReplyId: message.backendReplyId,
      backendThreadId: message.backendThreadId,
      senderMemberId: message.senderMemberId,
      author: message.author ?? message.user ?? "",
      time: message.time ?? "",
      text: message.text ?? message.message ?? "",
      fileId: message.fileId ?? "pr",
      fileName: message.fileName ?? "",
      filePath: message.filePath ?? "",
      line: message.line ?? 0,
      code: message.code,
      pending: message.pending,
      serverSyncState: message.serverSyncState,
      sendError: message.sendError,
    }));
}

export function PRReviewPanel({ prData, repositoryDbId, workspaceId, onClose, onMergePR, externalThreadMessages, onAddThreadMessage }: PRReviewPanelProps) {
  const [liveBody, setLiveBody] = useState<string | null>(null);
  const [liveCommits, setLiveCommits] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResponse | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  // prStatus가 이미 approved/merged면 처음부터 승인 완료 상태로 초기화
  const [isApproved, setIsApproved] = useState(
    () => prData?.prStatus === 'approved' || prData?.prStatus === 'merged'
  );
  // 병합 완료 여부 (병합 성공 시 즉시 버튼을 "병합됨"으로 고정 — prData prop 갱신 지연과 무관)
  const [isMerged, setIsMerged] = useState(() => prData?.prStatus === 'merged');

  // prBody가 없을 때 GitHub API에서 직접 실시간 fetch
  useEffect(() => {
    const dbBody = prData?.prBody ?? '';
    if (dbBody) {
      setLiveBody(dbBody);
      if (prData?.prCommits) setLiveCommits(prData.prCommits);
      return;
    }
    if (!repositoryDbId || !prData?.prNumber) return;
    fetchWithAuth<{ prBody: string; prCommits: string }>(
      `/api/v1/github/repositories/${repositoryDbId}/pull-requests/${prData.prNumber}/body`
    )
      .then((res) => {
        setLiveBody(res.prBody ?? '');
        setLiveCommits(res.prCommits ?? '[]');
      })
      .catch(() => { setLiveBody(''); });
  }, [repositoryDbId, prData?.prNumber, prData?.prBody]);

  // 패널 열릴 때 현재 유저의 승인 상태 조회
  // prStatus가 merged/approved면 이미 완료 상태이므로 my-review 결과가 null이어도 true 유지
  useEffect(() => {
    if (!repositoryDbId || !prData?.prNumber) return;
    fetchWithAuth<{ reviewState: string | null }>(
      `/api/v1/github/repositories/${repositoryDbId}/pull-requests/${prData.prNumber}/my-review`
    )
      .then((res) => {
        const alreadyDone = prData?.prStatus === 'merged' || prData?.prStatus === 'approved';
        setIsApproved(alreadyDone || res.reviewState === 'approved');
      })
      .catch(() => { /* 조회 실패 시 기본값 유지 */ });
  }, [repositoryDbId, prData?.prNumber, prData?.prStatus]);

  // AI 요약 폴링: pending/processing 동안 3초 간격으로 재조회
  useEffect(() => {
    if (!workspaceId || !prData?.prDbId) return;
    setAiSummaryLoading(true);

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    const fetchSummary = () => {
      getAiSummary(workspaceId, prData.prDbId)
        .then((res) => {
          if (cancelled) return;
          setAiSummary(res);
          if (res.status === "pending" || res.status === "processing") {
            timerId = setTimeout(fetchSummary, 3000);
          } else {
            setAiSummaryLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setAiSummaryLoading(false);
        });
    };

    fetchSummary();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [workspaceId, prData?.prDbId]);

  const resolvedPrBody: string = liveBody ?? prData?.prBody ?? '';
  const resolvedPrCommits: string = liveCommits ?? prData?.prCommits ?? '[]';

  const tabContentRef = useRef<HTMLDivElement>(null);
  const [activeFileId, setActiveFileId] = useState(diffFiles[0].id);
  const [activePrTab, setActivePrTab] = useState<PrDialogTab>("original");
  const [activeDiffThread, setActiveDiffThread] = useState<ActiveDiffThread | null>(null);
  const [diffCommentDrafts, setDiffCommentDrafts] = useState<Record<string, string>>({});
  const [diffThreadComments, setDiffThreadComments] = useState<Record<string, DiffThreadComment[]>>({});
  const [prThreadDraft, setPrThreadDraft] = useState("");
  const [diffEdits, setDiffEdits] = useState<Record<string, string>>({});
  // 로컬 스레드 상태 — externalThreadMessages(시드 제외)로 초기화
  const [prThreadComments, setPrThreadComments] = useState<DiffThreadComment[]>(() =>
    mapExternalThreadMessages(externalThreadMessages)
  );
  const [showThreadModal, setShowThreadModal] = useState(false);
  // 실제 PR의 변경 파일 (GitHub files API). null이면 데모 목데이터로 폴백.
  const [realFiles, setRealFiles] = useState<RealDiffFile[] | null>(null);

  useEffect(() => {
    if (!repositoryDbId || !prData?.prNumber) { setRealFiles(null); return; }
    fetchWithAuth<Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }>>(
      `/api/v1/github/repositories/${repositoryDbId}/pull-requests/${prData.prNumber}/files`
    )
      .then((files) => {
        if (!Array.isArray(files) || files.length === 0) { setRealFiles(null); return; }
        const mapped: RealDiffFile[] = files.map((f) => {
          const slash = f.filename.lastIndexOf("/");
          return {
            id: f.filename,
            name: slash >= 0 ? f.filename.slice(slash + 1) : f.filename,
            path: slash >= 0 ? f.filename.slice(0, slash) : "",
            status: mapPrFileStatus(f.status),
            tag: extToTag(f.filename),
            additions: f.additions ?? 0,
            deletions: f.deletions ?? 0,
            rows: parsePatchToRows(f.patch ?? ""),
          };
        });
        setRealFiles(mapped);
        setActiveFileId(mapped[0].id);
      })
      .catch(() => setRealFiles(null));
  }, [repositoryDbId, prData?.prNumber]);

  // 실제 파일이 있으면 그것을, 없으면 데모 목데이터를 사용
  const effectiveFiles: DiffFile[] = realFiles ?? diffFiles;
  const activeFile = effectiveFiles.find((file) => file.id === activeFileId) ?? effectiveFiles[0];
  // 활성 파일의 diff 행: 실제 데이터면 파싱된 rows, 아니면 데모 diffRows
  const activeRows: DiffRow[] = realFiles
    ? ((activeFile as RealDiffFile).rows ?? [])
    : diffRows;
  const prNumber = prData.prNumber ?? 142;
  const prTitle =
    prData.prTitle ||
    prData.text?.replace(/^.*?:\s*/, "") ||
    "JWT 사용자 인증 흐름 추가";
  const author = prData.prAuthor || "김진필";
  const risk = prData.aiRisk || "Medium";
  const branch = prData.branch || "feature/auth";
  const authorBadge = prData.authorInitials || author.slice(0, 2).toUpperCase();
  const summaryText = aiSummary?.summaryText ?? null;
  const cautionItems = aiSummary?.cautionItems ?? [];
  const positiveItems = aiSummary?.positiveItems ?? [];
  const originalWhatItems = actualPrWhatItems;
  const originalIssueTitle = "[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화 #103";
  const originalChecklistItems = actualPrChecklistItems;
  const originalActivityText = prData.time ? `opened ${prData.time}` : "opened";

  useEffect(() => {
    tabContentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [activePrTab]);

  useEffect(() => {
    setPrThreadComments(mapExternalThreadMessages(externalThreadMessages));
  }, [externalThreadMessages]);

  const handleApprove = async () => {
    // 이미 병합된 PR만 막는다. "승인됨"이지만 아직 병합 안 된 경우엔
    // (예: 직전에 GitHub 권한 문제로 merge가 막혔던 경우) 다시 눌러 병합을 재시도할 수 있게 한다.
    if (isMerged || prData?.prStatus === 'merged') return;

    // 버튼은 즉시 "승인됨"으로 전환
    setIsApproved(true);

    if (!repositoryDbId || !prData?.prNumber) return;

    // 1) 아직 승인 기록이 없을 때만 저장 (새로고침 후 my-review로 복원됨)
    if (!isApproved) {
      try {
        await fetchWithAuth(`/api/v1/github/repositories/${repositoryDbId}/pull-requests/${prData.prNumber}/approve`, {
          method: 'POST',
        });
      } catch {
        // 승인 기록 저장 실패는 무시하고 병합은 계속 시도
      }
    }

    // 2) 승인 저장 "후"에 GitHub merge를 시도한다.
    //    approve(meta="approved")보다 뒤에 실행해야 최종 meta가 "merged"로 확정되어
    //    경합으로 인해 "병합됨"이 "승인됨"으로 덮어써지지 않는다.
    //    성공 시에만 카드를 병합됨으로 전환하며, 서버도 MESSAGE_UPDATED를 브로드캐스트한다.
    try {
      await fetchWithAuth(`/api/v1/github/repositories/${repositoryDbId}/pull-requests/${prData.prNumber}/merge`, {
        method: 'POST',
      });
      setIsMerged(true);
      onMergePR?.(prData.id);
    } catch (e) {
      // merge 실패(충돌/권한 등): 승인됨 상태는 유지하되 병합됨으로 표시하지 않는다.
      console.warn('PR 병합 실패', e);
    }
  };

  const getDiffThreadKey = (fileId: string, line: number | string) => `${fileId}:${line}`;

  // seed 댓글은 PR #104 (id:1)에만 표시
  const getSeedDiffComments = (file: DiffFile, row: DiffRowLike): DiffThreadComment[] => (
    prData.id === 1 && file.id === "security" && row.comment
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

  const getDiffLineComments = (file: DiffFile, row: DiffRowLike) => {
    const threadKey = getDiffThreadKey(file.id, row.line);
    return [
      ...getSeedDiffComments(file, row),
      ...(diffThreadComments[threadKey] ?? [])
    ];
  };

  const handleDiffCommentSubmit = (file: DiffFile, row: DiffRowLike) => {
    const threadKey = getDiffThreadKey(file.id, row.line);
    const draft = diffCommentDrafts[threadKey]?.trim();
    if (!draft) return;

    setDiffThreadComments((prev) => ({
      ...prev,
      [threadKey]: [
        ...(prev[threadKey] ?? []),
        {
          id: `line-${file.id}-${row.line}-${Date.now()}`,
          author: currentUserDisplayName,
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

  const getEditedDiffCode = (file: DiffFile, row: DiffRowLike) => (
    diffEdits[getDiffThreadKey(file.id, row.line)] ?? row.code
  );

  const getPrThreadMessages = (): DiffThreadComment[] => {
    const seeds = diffFiles.flatMap((file) => diffRows.flatMap((row) => getSeedDiffComments(file, row)));
    const seedIds = new Set(seeds.map((s) => s.id));
    const local = prThreadComments.filter((c) => !seedIds.has(c.id));
    return [...seeds, ...local];
  };

  const getPrLineMessages = (file: DiffFile, row: DiffRowLike) => (
    getPrThreadMessages().filter((comment) => comment.fileId === file.id && comment.line === row.line)
  );

  const handleDiffReferenceSelect = (file: DiffFile, row: DiffRowLike) => {
    setActiveDiffThread({ fileId: file.id, line: row.line });
    setShowThreadModal(true);
  };

  const handleDiffLineCodeChange = (file: DiffFile, row: DiffRowLike, value: string) => {
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
      ? activeRows.find((row) => row.line === activeDiffThread.line)
      : null;

    const referencedCode = referencedFile && referencedRow
      ? (diffEdits[getDiffThreadKey(referencedFile.id, referencedRow.line)] ?? referencedRow.code)
      : undefined;

    const newComment: DiffThreadComment = {
      id: `pr-thread-${Date.now()}`,
      author: currentUserDisplayName,
      time: "방금",
      text: draft,
      fileId: referencedFile?.id ?? "pr",
      fileName: referencedFile?.name ?? `PR #${prNumber}`,
      filePath: referencedFile?.path ?? prTitle,
      line: referencedRow?.line ?? 0,
      code: referencedCode,
    };
    if (onAddThreadMessage) {
      void onAddThreadMessage({ ...newComment, user: currentUserDisplayName });
    } else {
      setPrThreadComments((prev) => [...prev, newComment]);
    }
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
              {prData.prAuthor || prData.githubUser || author}
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
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 900
            }}
          >
            Member
          </span>
        </div>

        <div className="px-6 py-6">
          {resolvedPrBody ? (
            <div
              style={{
                color: "var(--white)",
                fontSize: 15,
                fontWeight: 820,
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {resolvedPrBody}
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800, margin: 0 }}>
              PR 설명이 없습니다.
            </p>
          )}
        </div>
      </section>
    </div>
  );

  const renderSummaryTab = () => {
    if (aiSummaryLoading || aiSummary?.status === "pending" || aiSummary?.status === "processing") {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Sparkles size={32} style={{ color: "var(--neon-cyan)", opacity: 0.7 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            AI가 PR을 분석하고 있습니다...
          </p>
        </div>
      );
    }
    if (aiSummary?.status === "failed" || (!aiSummaryLoading && aiSummary && !summaryText)) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertTriangle size={32} style={{ color: "#FF6B6B", opacity: 0.8 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      );
    }
    if (!aiSummary) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Sparkles size={32} style={{ color: "var(--muted)", opacity: 0.5 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            AI 요약 정보가 없습니다.
          </p>
        </div>
      );
    }
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl px-6 py-5" style={{
          background: "rgba(var(--codedock-primary-rgb), 0.10)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.30)"
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

        {cautionItems.length > 0 && (
          <section className="rounded-2xl px-6 py-5" style={{
            background: "rgba(239, 68, 68, 0.10)",
            border: "1px solid rgba(239, 68, 68, 0.28)"
          }}>
            <h3 className="m-0 mb-4 tracking-tight" style={{ color: "#FF6B6B", fontSize: 18, fontWeight: 950 }}>
              주의사항
            </h3>
            <div className="grid gap-3">
              {cautionItems.map((item) => (
                <div key={item} className="flex gap-2 m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 850 }}>
                  <span style={{ flexShrink: 0, color: "#FF6B6B", fontWeight: 950 }}>-</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {positiveItems.length > 0 && (
          <section className="rounded-2xl px-6 py-5" style={{
            background: "rgba(34, 197, 94, 0.10)",
            border: "1px solid rgba(34, 197, 94, 0.30)"
          }}>
            <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--matrix-green)", fontSize: 18, fontWeight: 950 }}>
              긍정적인 점
            </h3>
            <div className="grid gap-3">
              {positiveItems.map((item) => (
                <div key={item} className="flex gap-2 m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 850 }}>
                  <span style={{ flexShrink: 0, color: "var(--matrix-green)", fontWeight: 950 }}>-</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  const getRiskStyle = (risk: string) => {
    if (risk === "High") return { bg: "rgba(239, 68, 68, 0.13)", border: "1px solid rgba(239, 68, 68, 0.38)", color: "#FF8FA3", label: "높음" };
    if (risk === "Low") return { bg: "rgba(34, 197, 94, 0.13)", border: "1px solid rgba(34, 197, 94, 0.38)", color: "var(--matrix-green)", label: "낮음" };
    return { bg: "rgba(245, 158, 11, 0.13)", border: "1px solid rgba(245, 158, 11, 0.38)", color: "#FBBF24", label: "보통" };
  };

  const renderContentTab = () => {
    const fileFeedbacks = aiSummary?.fileFeedbacks ?? null;

    if (aiSummaryLoading || aiSummary?.status === "pending" || aiSummary?.status === "processing") {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <ShieldCheck size={32} style={{ color: "var(--neon-cyan)", opacity: 0.7 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            AI가 PR을 분석하고 있습니다...
          </p>
        </div>
      );
    }
    if (aiSummary?.status === "failed") {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertTriangle size={32} style={{ color: "#FF6B6B", opacity: 0.8 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      );
    }
    if (!fileFeedbacks || fileFeedbacks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <ShieldCheck size={32} style={{ color: "var(--muted)", opacity: 0.5 }} />
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 15, fontWeight: 850 }}>
            피드백 정보가 없습니다.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <section
          className="overflow-hidden rounded-2xl px-6 py-5"
          style={{
            background: "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.12), rgba(var(--codedock-secondary-rgb), 0.055))",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(var(--codedock-primary-rgb), 0.12)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.26)",
                  color: "var(--neon-cyan)"
                }}
              >
                <ShieldCheck size={22} />
              </span>
              <div>
                <p className="m-0 mb-1 font-mono uppercase tracking-[0.14em]" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
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
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 950
              }}
            >
              취약점 {fileFeedbacks.length}건 감지
            </span>
          </div>
          <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 15, fontWeight: 800, lineHeight: 1.75 }}>
            PR 설명 대신 AI가 발견한 위험 지점과 수정 방향을 먼저 보여줍니다. 각 파일은 왼쪽에 현재 코드, 오른쪽에 AI가 추천하는 코드가 나란히 표시되어 바로 비교할 수 있습니다.
          </p>
        </section>

        {fileFeedbacks.map((file, fileIndex) => {
          const riskStyle = getRiskStyle(file.risk);
          return (
            <section
              key={`${file.name}-${fileIndex}`}
              className="overflow-hidden rounded-2xl"
              style={{
                background: "rgba(5, 11, 20, 0.52)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.15)"
              }}
            >
              <div
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
                style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.12)" }}
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
                    <p className="m-0 mt-1 truncate font-mono" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                      {file.path}
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{
                    background: riskStyle.bg,
                    border: riskStyle.border,
                    color: riskStyle.color,
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950
                  }}
                >
                  <AlertTriangle size={14} />
                  위험도 {riskStyle.label}
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

              <div className="grid gap-0 lg:grid-cols-2" style={{ borderTop: "1px solid rgba(var(--codedock-primary-rgb), 0.12)" }}>
                {[
                  { title: "현재 코드", tone: "#FF8FA3", bg: "rgba(239, 68, 68, 0.055)", prefix: "-", lines: file.currentCode },
                  { title: "AI 추천 코드", tone: "var(--matrix-green)", bg: "rgba(34, 197, 94, 0.055)", prefix: "+", lines: file.recommendedCode }
                ].map((block) => (
                  <div
                    key={`${file.name}-${block.title}`}
                    className="min-w-0"
                    style={{
                      background: block.bg,
                      borderRight: block.title === "현재 코드" ? "1px solid rgba(var(--codedock-primary-rgb), 0.12)" : undefined
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(234, 247, 255, 0.08)" }}>
                      <span className="tracking-tight" style={{ color: block.tone, fontSize: 13, fontWeight: 950 }}>
                        {block.title}
                      </span>
                      <span className="font-mono" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                        {file.name}
                      </span>
                    </div>
                    <div className="codedock-scrollbar-hidden overflow-x-auto px-0 py-2">
                      {block.lines.map((line, index) => (
                        <div key={`${file.name}-${block.title}-${index}`} className="grid min-w-[520px] grid-cols-[52px_28px_minmax(0,1fr)] items-start px-4 py-1.5 font-mono">
                          <span style={{ color: "rgba(234, 247, 255, 0.38)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                            {index + 1}
                          </span>
                          <span style={{ color: block.tone, fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{block.prefix}</span>
                          <code className="whitespace-pre-wrap break-words" style={{ color: "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.65 }}>
                            {line}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {file.findings.length > 0 && (
                <div className="flex flex-wrap gap-2 px-5 py-4" style={{ borderTop: "1px solid rgba(var(--codedock-primary-rgb), 0.12)" }}>
                  {file.findings.map((finding, i) => (
                    <span
                      key={`${file.name}-finding-${i}`}
                      className="rounded-full px-3 py-1.5 tracking-tight"
                      style={{
                        background: "rgba(234, 247, 255, 0.055)",
                        border: "1px solid rgba(234, 247, 255, 0.10)",
                        color: "var(--soft-mint)",
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 850
                      }}
                    >
                      {finding}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  };

  const renderHistoryTab = () => {
    let commits: Array<{ sha: string; message: string; author: string; date: string }> = [];
    try {
      const parsed = typeof resolvedPrCommits === 'string'
        ? JSON.parse(resolvedPrCommits)
        : resolvedPrCommits;
      if (Array.isArray(parsed)) commits = parsed;
    } catch {
      // ignore
    }

    const prOpenEvent = {
      sha: 'open',
      message: `PR #${prData.prNumber || ''} 오픈: ${prData.prTitle || prData.text || ''}`,
      author: prData.prAuthor || prData.user || '',
      date: prData.time || ''
    };

    const allEvents = [prOpenEvent, ...commits];

    return (
      <div className="grid gap-4">
        {allEvents.length === 1 && commits.length === 0 ? (
          <div className="rounded-2xl px-5 py-6 text-center" style={{
            background: "rgba(5, 11, 20, 0.46)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
          }}>
            <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800 }}>
              커밋 이력이 없습니다
            </p>
          </div>
        ) : (
          allEvents.map((event, idx) => {
            const isOpen = event.sha === 'open';
            const shortSha = isOpen ? '' : event.sha.slice(0, 7);
            const displayDate = event.date
              ? event.date.replace('T', ' ').slice(0, 16)
              : '';
            return (
              <div key={`${event.sha}-${idx}`} className="flex gap-4 rounded-2xl px-5 py-4" style={{
                background: isOpen ? "rgba(var(--codedock-primary-rgb), 0.08)" : "rgba(5, 11, 20, 0.46)",
                border: isOpen
                  ? "1px solid rgba(var(--codedock-primary-rgb), 0.25)"
                  : "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
              }}>
                <span className="font-mono flex-shrink-0" style={{
                  color: isOpen ? "var(--neon-cyan)" : "rgba(var(--codedock-secondary-rgb), 0.9)",
                  fontSize: 12,
                  fontWeight: 950,
                  minWidth: 52
                }}>
                  {isOpen ? 'OPEN' : shortSha}
                </span>
                <div className="min-w-0">
                  <p className="m-0 mb-1 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                    {event.author}
                  </p>
                  <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 14, fontWeight: 800, wordBreak: 'break-word' }}>
                    {event.message}
                  </p>
                  {displayDate && (
                    <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                      {displayDate}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderPrThreadChat = (showClose = false) => {
    const selectedFile = activeDiffThread
      ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
      : null;
    const selectedRow = activeDiffThread
      ? activeRows.find((row) => row.line === activeDiffThread.line)
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
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
            backdropFilter: "blur(14px)"
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
              <h3 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                PR #{prNumber} 스레드
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-1 font-mono"
                style={{
                  background: "rgba(var(--codedock-secondary-rgb), 0.10)",
                  border: "1px solid rgba(var(--codedock-secondary-rgb), 0.24)",
                  color: "var(--matrix-green)",
                  fontSize: 9,
                  fontWeight: 950
                }}
              >
                PR THREAD
              </span>
              {showClose && (
                <button
                  type="button"
                  onClick={() => setShowThreadModal(false)}
                  className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 transition-all hover:scale-110"
                  style={{
                    background: "rgba(234, 247, 255, 0.07)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
                    color: "var(--muted)",
                    cursor: "pointer"
                  }}
                  aria-label="스레드 닫기"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.45 }}>
            DIFF 라인을 클릭하면 이 PR 스레드 입력창에 파일과 줄 번호가 참조로 붙습니다.
          </p>
        </div>

        <div className="codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-2">
            {threadMessages.map((comment) => {
              const isMine = isCurrentUser(comment.author);
              const hasLineReference = comment.fileId !== "pr" && comment.line > 0;

              return (
                <div
                  key={comment.id}
                  className="w-full rounded-2xl px-3 py-2"
                  style={{
                    background: isMine ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(11, 22, 40, 0.78)",
                    border: isMine ? "1px solid rgba(var(--codedock-primary-rgb), 0.28)" : "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                  }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full text-center leading-6 flex-shrink-0"
                      style={{
                        background: isMine ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(var(--codedock-primary-rgb), 0.14)",
                        color: isMine ? "#021014" : "var(--neon-cyan)",
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 950
                      }}
                    >
                      {isMine ? currentUserAvatar : comment.author.slice(0, 1)}
                    </span>
                    <span className="tracking-tight" style={{ color: isMine ? "var(--neon-cyan)" : "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {isMine ? getDisplayAuthor(comment.author) : comment.author}
                    </span>
                    {isMine && (
                      <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(var(--codedock-primary-rgb), 0.14)", color: "var(--neon-cyan)", fontSize: 9, fontWeight: 950 }}>내 메시지</span>
                    )}
                    <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                      {comment.time}
                    </span>
                  </div>
                  {hasLineReference && (() => {
                    const refRow = diffRows.find((r) => r.line === comment.line);
                    const refCode = diffEdits[getDiffThreadKey(comment.fileId, comment.line)] ?? refRow?.code ?? comment.code ?? "";
                    return (
                      <div
                        className="mb-2 overflow-hidden rounded-xl"
                        style={{
                          background: "rgba(5, 11, 20, 0.72)",
                          border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
                          userSelect: "none"
                        }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-1.5"
                          style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.12)", background: "rgba(var(--codedock-primary-rgb), 0.07)" }}
                        >
                          <FileCode size={11} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
                          <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                            {comment.fileName}
                          </span>
                          <span className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono" style={{ background: "rgba(var(--codedock-primary-rgb), 0.14)", color: "var(--neon-cyan)", fontSize: 9, fontWeight: 950 }}>
                            L{comment.line}
                          </span>
                        </div>
                        {refCode && (
                          <div className="px-3 py-2 font-mono" style={{ color: refRow?.added ? "#D7FFE7" : "#C6D4E5", fontSize: "var(--krds-body-xsmall)", fontWeight: 850, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                            {refCode}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <p className="m-0 whitespace-pre-wrap tracking-tight" style={{ color: isMine ? "var(--soft-mint)" : "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.55 }}>
                    {comment.text}
                  </p>
                  {comment.serverSyncState === "pending" && (
                    <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800 }}>
                      sending...
                    </p>
                  )}
                  {comment.serverSyncState === "failed" && (
                    <p className="m-0 mt-1 tracking-tight" style={{ color: "#FF6B6B", fontSize: 10, fontWeight: 850 }}>
                      {comment.sendError || "Send failed."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="px-4 py-1"
          style={{
            background: "rgba(8, 17, 31, 0.96)",
            borderTop: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
          }}
        >
          {selectedFile && selectedRow && (() => {
            const refCode = diffEdits[getDiffThreadKey(selectedFile.id, selectedRow.line)] ?? selectedRow.code;
            return (
              <div
                className="mb-2 overflow-hidden rounded-xl"
                style={{
                  background: "rgba(5, 11, 20, 0.72)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.26)"
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ background: "rgba(var(--codedock-primary-rgb), 0.09)", borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)" }}
                >
                  <FileCode size={11} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
                  <span className="min-w-0 flex-1 truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                    {selectedFile.name}
                  </span>
                  <span className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono" style={{ background: "rgba(var(--codedock-primary-rgb), 0.14)", color: "var(--neon-cyan)", fontSize: 9, fontWeight: 950 }}>
                    L{selectedRow.line}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDiffThread(null)}
                    className="flex-shrink-0 rounded-md border-0 px-2 py-0.5"
                    style={{ background: "rgba(234, 247, 255, 0.06)", color: "var(--muted)", cursor: "pointer", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}
                  >
                    해제
                  </button>
                </div>
                {refCode && (
                  <div className="px-3 py-2 font-mono" style={{ color: selectedRow.added ? "#D7FFE7" : "#C6D4E5", fontSize: "var(--krds-body-xsmall)", fontWeight: 850, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {refCode}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex items-end gap-2">
            <textarea
              value={prThreadDraft}
              onChange={(event) => setPrThreadDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handlePrThreadSubmit();
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
              placeholder="PR 스레드에 댓글 남기기..."
              className="min-w-0 flex-1 resize-none rounded-xl px-3 outline-none tracking-tight"
              rows={1}
              style={{
                background: "rgba(11, 22, 40, 0.86)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
                color: "var(--white)",
                fontFamily: "inherit",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 800,
                lineHeight: 1.55,
                minHeight: "36px",
                maxHeight: "96px",
                overflowY: "auto",
                paddingTop: "9px",
                paddingBottom: "9px",
              }}
            />
            <button
              type="button"
              onClick={handlePrThreadSubmit}
              disabled={!prThreadDraft.trim()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-0"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                color: "#021014",
                cursor: prThreadDraft.trim() ? "pointer" : "not-allowed",
                opacity: prThreadDraft.trim() ? 1 : 0.48,
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 950
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiffTab = () => (
    <div
      className="grid grid-rows-1 h-full min-h-0 overflow-hidden rounded-2xl"
      style={{
        gridTemplateColumns: "2.5fr 7.5fr",
        background: "rgba(5, 11, 20, 0.42)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
      }}
    >
      <aside className="codedock-scrollbar-hidden min-h-0 overflow-y-auto px-4 py-4" style={{
        borderRight: "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
      }}>
        <div className="mb-4">
          <h3 className="m-0 mb-1 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
            변경 파일
          </h3>
          <p className="m-0" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
            파일 {effectiveFiles.length}개
          </p>
        </div>

        <div className="grid gap-3">
          {effectiveFiles.map((file) => {
            const isActive = file.id === activeFile.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setActiveFileId(file.id)}
                className="w-full min-w-0 overflow-hidden rounded-xl p-3 text-left transition-all"
                style={{
                  background: isActive ? "rgba(var(--codedock-primary-rgb), 0.10)" : "transparent",
                  border: isActive ? "1px solid rgba(var(--codedock-secondary-rgb), 0.28)" : "1px solid transparent",
                  cursor: "pointer"
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5" style={{
                    background: colorAlpha(statusColor(file.status), 13),
                    color: statusColor(file.status),
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950
                  }}>
                    {statusLabel(file.status)}
                  </span>
                  <span className="rounded-md px-2 py-0.5" style={{
                    background: "rgba(234, 247, 255, 0.07)",
                    color: "var(--muted)",
                    fontSize: "var(--krds-body-xsmall)",
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
                <p className="m-0 mb-2 truncate font-mono" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>
                  {file.path}
                </p>
                <div className="flex gap-2 font-mono" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
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
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
            backdropFilter: "blur(14px)"
          }}
        >
          <FileCode size={16} style={{ color: "var(--neon-cyan)" }} />
          <span className="truncate font-mono" style={{ color: "var(--white)", fontSize: 13, fontWeight: 900 }}>
            {activeFile.path}/{activeFile.name}
          </span>
        </div>

        <div className="py-5 font-mono" style={{ color: "var(--soft-mint)", fontSize: 13, lineHeight: 1.65 }}>
          {activeRows.length === 0 && (
            <div className="px-5 py-3" style={{ color: "var(--muted)", fontSize: 13, fontWeight: 800 }}>
              이 파일은 표시할 diff가 없습니다 (바이너리이거나 변경 내용이 너무 큼).
            </div>
          )}
          {activeRows.map((row, rowIdx) => {
            const threadKey = getDiffThreadKey(activeFile.id, row.line);
            const editedCode = getEditedDiffCode(activeFile, row);
            const lineComments = getPrLineMessages(activeFile, row);
            const isThreadOpen = activeDiffThread?.fileId === activeFile.id && activeDiffThread.line === row.line;
            const isEdited = editedCode !== row.code;

            return (
              <div key={`${rowIdx}-${row.line}`}>
                <div
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: "58px 32px minmax(0, 1fr) 92px",
                    background: isThreadOpen
                      ? "rgba(var(--codedock-primary-rgb), 0.11)"
                      : row.added
                        ? "rgba(34, 197, 94, 0.12)"
                        : row.removed
                          ? "rgba(239, 68, 68, 0.12)"
                          : "transparent",
                    borderLeft: isThreadOpen
                      ? "3px solid var(--neon-cyan)"
                      : row.added
                        ? "3px solid #22C55E"
                        : row.removed
                          ? "3px solid #EF4444"
                          : "3px solid transparent",
                  }}
                >
                  <span className="select-none text-right" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                    {row.line}
                  </span>
                  <span className="select-none text-center" style={{ color: row.added ? "#22C55E" : row.removed ? "#EF4444" : "var(--muted)", fontWeight: 950 }}>
                    {row.added ? "+" : row.removed ? "-" : ""}
                  </span>
                  <span
                    className="min-w-0 whitespace-pre-wrap break-words px-2 py-1.5 font-mono"
                    style={{
                      display: "block",
                      color: row.added ? "#D7FFE7" : row.removed ? "#FFD7D7" : "#C6D4E5",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.65,
                      userSelect: "text"
                    }}
                  >
                    {row.code}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDiffReferenceSelect(activeFile, row);
                    }}
                    className="mx-1 flex h-7 items-center justify-center gap-1 rounded-md border-0 px-2"
                    style={{
                      background: isThreadOpen || lineComments.length > 0 ? "rgba(var(--codedock-primary-rgb), 0.13)" : "transparent",
                      border: isThreadOpen || lineComments.length > 0 ? "1px solid rgba(var(--codedock-primary-rgb), 0.28)" : "1px solid transparent",
                      color: isThreadOpen || lineComments.length > 0 ? "var(--neon-cyan)" : "var(--muted)",
                      cursor: "pointer",
                      fontSize: "var(--krds-body-xsmall)",
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
                      fontSize: "var(--krds-body-xsmall)",
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
                              background: "rgba(var(--codedock-primary-rgb), 0.14)",
                              color: "var(--neon-cyan)",
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}>
                              {comment.author.slice(0, 1)}
                            </span>
                            <span style={{ color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{comment.author}</span>
                            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>{comment.time}</span>
                          </div>
                          <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
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
                    borderLeft: "2px solid rgba(var(--codedock-primary-rgb), 0.70)",
                    borderTop: lineComments.length > 0 ? "1px solid rgba(var(--codedock-primary-rgb), 0.10)" : "none"
                  }}>
                    <p className="m-0 mb-2 tracking-tight" style={{
                      color: "var(--muted)",
                      fontSize: "var(--krds-body-xsmall)",
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
                        border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                        color: "var(--white)",
                        fontFamily: "inherit",
                        fontSize: "var(--krds-body-xsmall)",
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
                          fontSize: "var(--krds-body-xsmall)",
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
                          fontSize: "var(--krds-body-xsmall)",
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

      {false && (() => {
          const activeThreadFile = activeDiffThread
            ? diffFiles.find((file) => file.id === activeDiffThread.fileId)
            : null;
          const activeThreadRow = activeDiffThread
            ? activeRows.find((row) => row.line === activeDiffThread.line)
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
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)"
              }}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
                    <h3 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                      라인 스레드
                    </h3>
                  </div>
                  <span className="rounded-full px-2 py-1 font-mono" style={{
                    background: "rgba(var(--codedock-primary-rgb), 0.10)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
                    color: "var(--neon-cyan)",
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950
                  }}>
                    {allThreadItems.length}
                  </span>
                </div>

                {activeThreadFile && activeThreadRow && activeThreadKey ? (
                  <div className="grid gap-4">
                    <div className="rounded-xl px-3 py-3" style={{
                      background: "rgba(var(--codedock-primary-rgb), 0.08)",
                      border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)"
                    }}>
                      <p className="m-0 mb-1 truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                        {activeThreadFile.name}:{activeThreadRow.line}
                      </p>
                      <p className="m-0 mb-2 truncate font-mono" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                        {activeThreadFile.path}/{activeThreadFile.name}
                      </p>
                      <code className="block rounded-lg px-3 py-2 font-mono" style={{
                        background: "rgba(5, 11, 20, 0.72)",
                        border: "1px solid rgba(234, 247, 255, 0.08)",
                        color: activeThreadRow.added ? "#D7FFE7" : "#C6D4E5",
                        fontSize: "var(--krds-body-xsmall)",
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
                          border: "1px dashed rgba(var(--codedock-primary-rgb), 0.16)",
                          color: "var(--muted)",
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 800,
                          lineHeight: 1.6
                        }}>
                          아직 이 줄에 댓글이 없습니다. 아래 입력창에서 첫 댓글을 남겨보세요.
                        </p>
                      ) : (
                        activeThreadComments.map((comment) => (
                          <div key={comment.id} className="rounded-xl px-3 py-3" style={{
                            background: isCurrentUser(comment.author) ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(11, 22, 40, 0.72)",
                            border: isCurrentUser(comment.author) ? "1px solid rgba(var(--codedock-primary-rgb), 0.26)" : "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                          }}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full text-center leading-6" style={{
                                background: isCurrentUser(comment.author) ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(var(--codedock-primary-rgb), 0.14)",
                                color: isCurrentUser(comment.author) ? "#021014" : "var(--neon-cyan)",
                                fontSize: "var(--krds-body-xsmall)",
                                fontWeight: 950
                              }}>
                                {comment.author.slice(0, 1)}
                              </span>
                              <span className="tracking-tight" style={{ color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                                {comment.author}
                              </span>
                              <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                                {comment.time}
                              </span>
                            </div>
                            <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.55 }}>
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
                          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                          color: "var(--white)",
                          fontFamily: "inherit",
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 800,
                          lineHeight: 1.55
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>
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
                            fontSize: "var(--krds-body-xsmall)",
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
                    <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.6 }}>
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
                          background: "rgba(var(--codedock-primary-rgb), 0.07)",
                          border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
                          cursor: "pointer"
                        }}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate font-mono" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                            {item.file.name}:{item.row.line}
                          </span>
                          <span style={{ color: "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                            댓글 {item.comments.length}
                          </span>
                        </div>
                        <p className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 850 }}>
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
                      <span className="tracking-tight" style={{ color: item.checked ? "var(--white)" : "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 850 }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })()}
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
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]"
      style={{
        background: "rgba(8, 17, 31, 0.96)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
        boxShadow: "0 30px 90px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      }}
    >
      <header className="flex items-start justify-between gap-6 px-8 py-7" style={{
        borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
      }}>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 tracking-tight">
            <Github size={15} style={{ color: "var(--muted)" }} />
            <span className="font-mono" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
              {prData.repository || "codedock-team/codedock-frontend"}
            </span>
            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>·</span>
            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>PR #{prNumber}</span>
            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>·</span>
            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>GitHub 동기화: 2분 전</span>
          </div>

          <h2 className="m-0 mb-3 tracking-tight" style={{ color: "var(--white)", fontSize: 28, fontWeight: 950 }}>
            PR #{prNumber}
          </h2>
          <p className="m-0 mb-5 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 900 }}>
            {prTitle}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono" style={{
              background: "rgba(var(--codedock-primary-rgb), 0.08)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
              color: "var(--neon-cyan)",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 900
            }}>
              <GitBranch size={13} />
              {branch}
            </span>
            <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 900 }}>main</span>
            <span className="h-6 w-6 rounded-full text-center leading-6" style={{
              background: "linear-gradient(135deg, var(--matrix-green), var(--deep-teal))",
              color: "#021014",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 950
            }}>
              {authorBadge}
            </span>
            <span style={{ color: "var(--white)", fontSize: 13, fontWeight: 900 }}>{author}</span>
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              color: "#FBBF24",
              fontSize: "var(--krds-body-xsmall)",
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
            disabled={isMerged || prData?.prStatus === 'merged'}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-3 tracking-tight"
            style={{
              background: (isMerged || prData?.prStatus === 'merged')
                ? "rgba(100,100,100,0.3)"
                : "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))",
              border: (isMerged || prData?.prStatus === 'merged') ? "1px solid rgba(100,100,100,0.4)" : 0,
              color: (isMerged || prData?.prStatus === 'merged') ? "rgba(200,200,200,0.6)" : "#021014",
              fontSize: 14,
              fontWeight: 950,
              cursor: (isMerged || prData?.prStatus === 'merged') ? "not-allowed" : "pointer"
            }}
          >
            <CheckCircle2 size={16} />
            {(isMerged || prData?.prStatus === 'merged') ? "병합됨" : isApproved ? "승인됨 · 병합 재시도" : "승인"}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prData.prUrl || prData.url;
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
            disabled={!(prData.prUrl || prData.url)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 tracking-tight transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(234, 247, 255, 0.055)",
              border: "1px solid rgba(234, 247, 255, 0.12)",
              color: "var(--muted)",
              fontSize: 13,
              fontWeight: 950,
              cursor: (prData.prUrl || prData.url) ? "pointer" : "not-allowed"
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

      <div className="shrink-0 px-8 py-5" style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.12)" }}>
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
                  background: isActive ? "rgba(var(--codedock-primary-rgb), 0.12)" : "rgba(5, 11, 20, 0.42)",
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

      {/* 플로팅 스레드 버튼 */}
      <button
        type="button"
        onClick={() => setShowThreadModal((prev) => !prev)}
        className="absolute bottom-6 z-30 grid h-14 w-14 place-items-center rounded-full border-0 hover:scale-110"
        style={{
          right: showThreadModal ? "474px" : "24px",
          transition: "right 0.32s cubic-bezier(0.36, 0.66, 0.04, 1), transform 0.18s, background 0.18s",
          background: showThreadModal
            ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))"
            : "rgba(8, 17, 31, 0.88)",
          border: showThreadModal
            ? "1.5px solid var(--neon-cyan)"
            : "1.5px solid rgba(var(--codedock-primary-rgb), 0.38)",
          boxShadow: showThreadModal
            ? "0 0 24px rgba(var(--codedock-primary-rgb), 0.38), 0 8px 24px rgba(0,0,0,0.38)"
            : "0 8px 24px rgba(0,0,0,0.38)",
          color: showThreadModal ? "#021014" : "var(--neon-cyan)",
          cursor: "pointer"
        }}
        aria-label="PR 스레드 채팅"
      >
        <MessageSquare size={22} />
      </button>

      {/* 스레드 모달 */}
      <AnimatePresence>
        {showThreadModal && (
          <>
            {/* 백드롭 */}
            <motion.div
              className="absolute inset-0 z-10"
              style={{ background: "rgba(3, 8, 18, 0.45)", backdropFilter: "blur(2px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowThreadModal(false)}
            />
            {/* 슬라이드 패널 */}
            <motion.div
              className="absolute bottom-0 right-0 top-0 z-20 w-[450px]"
              style={{
                background: "rgba(8, 17, 31, 0.97)",
                borderLeft: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
                boxShadow: "-12px 0 40px rgba(0,0,0,0.42)"
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              {renderPrThreadChat(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
