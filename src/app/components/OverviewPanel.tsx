import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle,
  Clock,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GithubRepositoryOverviewResponse } from "../api/github";

interface OverviewRepository {
  id: string;
  name: string;
  openPRs: number;
  highRisk: number;
  activeIssues: number;
  connected: boolean;
  membersOnline: number;
  overview?: GithubRepositoryOverviewResponse;
}

interface OverviewPanelProps {
  repositories: OverviewRepository[];
  onlineMembers?: number;
  selectedRepositoryId?: string;
  onSelectRepository?: (repositoryId: string) => void;
  bookmarkGroups?: Array<{
    channelId: string;
    channelLabel: string;
    items: Array<{
      channelId?: string;
      messageId: number;
      content: string;
    }>;
  }>;
  onOpenBookmark?: (channelId: string, messageId: number) => void;
}

type OverviewActivityItem = {
  user: string;
  action: string;
  time: string;
  icon: string;
};

type OverviewPullRequestItem = {
  number: number;
  title: string;
  author: string;
  status: string;
  reviewers?: number;
  comments?: number;
  changedFilesCount?: number | null;
  additions?: number | null;
  deletions?: number | null;
  updatedAt?: string | null;
};

type RepositoryDetails = {
  commitsToday: number;
  codeQuality: number | null;
  securityScore: number | null;
  performance: number | null;
  summary: string;
  recentActivity: OverviewActivityItem[];
  activePRs: OverviewPullRequestItem[];
};

const repositoryDetails: Record<string, RepositoryDetails> = {
  secureflow: {
    commitsToday: 24,
    codeQuality: 87,
    securityScore: 92,
    performance: 74,
    summary: "인증, 권한, API 보안 흐름을 중심으로 리뷰가 진행 중입니다.",
    recentActivity: [
      { user: "김진필", action: "feature/auth에 커밋 3개 푸시", time: "5분 전", icon: "commit" },
      { user: "김준우", action: "PR #142 열림: 사용자 인증 추가", time: "12분 전", icon: "pr" },
      { user: "김진현", action: "PR #141 병합: 메모리 누수 수정", time: "1시간 전", icon: "merge" },
      { user: "CodeDock AI", action: "auth middleware 보안 리뷰를 권장했습니다", time: "2시간 전", icon: "alert" }
    ],
    activePRs: [
      { number: 142, title: "사용자 인증 흐름 추가", author: "김진필", reviewers: 2, comments: 5, status: "In Review" },
      { number: 140, title: "API 문서 업데이트", author: "김준우", reviewers: 3, comments: 2, status: "Approved" },
      { number: 138, title: "데이터베이스 쿼리 정리", author: "김진현", reviewers: 1, comments: 6, status: "Changes Requested" }
    ]
  },
  aichat: {
    commitsToday: 18,
    codeQuality: 91,
    securityScore: 95,
    performance: 82,
    summary: "채팅 히스토리와 응답 속도 개선 작업이 안정적으로 진행 중입니다.",
    recentActivity: [
      { user: "안현", action: "main에 커밋 2개 푸시", time: "3분 전", icon: "commit" },
      { user: "김준우", action: "PR #89 열림: 채팅 기록 기능 추가", time: "20분 전", icon: "pr" },
      { user: "CodeDock AI", action: "response cache 개선 포인트를 감지했습니다", time: "45분 전", icon: "alert" }
    ],
    activePRs: [
      { number: 89, title: "채팅 기록 기능 추가", author: "안현", reviewers: 2, comments: 3, status: "In Review" },
      { number: 87, title: "응답 시간 개선", author: "김준우", reviewers: 1, comments: 1, status: "Approved" }
    ]
  },
  dashboard: {
    commitsToday: 15,
    codeQuality: 85,
    securityScore: 88,
    performance: 79,
    summary: "대시보드 레이아웃과 데이터 시각화 품질을 다듬고 있습니다.",
    recentActivity: [
      { user: "김진현", action: "layout에 커밋 1개 푸시", time: "10분 전", icon: "commit" },
      { user: "김준우", action: "PR #56 열림: 대시보드 레이아웃 수정", time: "1시간 전", icon: "pr" },
      { user: "CodeDock AI", action: "차트 접근성 개선 항목을 추가했습니다", time: "2시간 전", icon: "alert" }
    ],
    activePRs: [
      { number: 56, title: "대시보드 레이아웃 수정", author: "김진현", reviewers: 1, comments: 2, status: "In Review" }
    ]
  }
};

const fallbackDetails: RepositoryDetails = repositoryDetails.secureflow;

function normalizeOverviewScore(value: number | null | undefined, fallback: number | null = null) {
  if (value === null || value === undefined) return fallback;
  return Math.max(0, Math.min(100, value ?? fallback));
}

function formatOverviewRelativeTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.split(".")[0].replace("T", " ");
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getOverviewActivityIcon(type?: string | null) {
  const normalizedType = String(type ?? "").toLowerCase();
  if (normalizedType.includes("commit")) return "commit";
  if (normalizedType.includes("pull") || normalizedType === "pr") return "pr";
  if (normalizedType.includes("merge")) return "merge";
  if (normalizedType.includes("risk") || normalizedType.includes("alert") || normalizedType.includes("issue")) return "alert";
  return "clock";
}

function getOverviewActivityAction(activity: GithubRepositoryOverviewResponse["recentActivities"][number]) {
  const title = activity.title?.trim() || "활동";
  const number = activity.number != null ? `#${activity.number} ` : "";
  const state = activity.state ? ` (${activity.state})` : "";
  return `${number}${title}${state}`;
}

function normalizeOverviewPrStatus(state?: string | null) {
  const normalizedState = String(state ?? "").toLowerCase();
  if (normalizedState.includes("approved")) return "Approved";
  if (normalizedState.includes("change")) return "Changes Requested";
  if (normalizedState.includes("closed") || normalizedState.includes("merged")) return "Merged";
  return "In Review";
}

function mapRepositoryOverviewToDetails(
  repository: OverviewRepository,
  overview: GithubRepositoryOverviewResponse
): RepositoryDetails {
  return {
    commitsToday: overview.todayCommitCount ?? 0,
    codeQuality: normalizeOverviewScore(overview.codeQualityScore),
    securityScore: normalizeOverviewScore(overview.securityScore),
    performance: normalizeOverviewScore(overview.performanceScore),
    summary: `${overview.fullName || repository.name}의 최신 활동, 진행 중인 PR, 품질 지표를 백엔드 실데이터로 보여줍니다.`,
    recentActivity: (overview.recentActivities ?? []).map((activity) => ({
      user: activity.actor?.trim() || "GitHub Bot",
      action: getOverviewActivityAction(activity),
      time: formatOverviewRelativeTime(activity.occurredAt),
      icon: getOverviewActivityIcon(activity.type)
    })),
    activePRs: (overview.openPullRequests ?? []).map((pr) => ({
      number: pr.prNumber ?? pr.prId,
      title: pr.title?.trim() || "제목 없음",
      author: pr.author?.trim() || "unknown",
      changedFilesCount: pr.changedFilesCount,
      additions: pr.additions,
      deletions: pr.deletions,
      updatedAt: pr.updatedAt,
      status: normalizeOverviewPrStatus(pr.state)
    }))
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "In Review":
      return { bg: "rgba(255, 217, 61, 0.15)", border: "rgba(255, 217, 61, 0.4)", text: "#FFD93D" };
    case "Approved":
      return { bg: "rgba(107, 207, 127, 0.15)", border: "rgba(107, 207, 127, 0.4)", text: "#6BCF7F" };
    case "Changes Requested":
      return { bg: "rgba(255, 107, 107, 0.15)", border: "rgba(255, 107, 107, 0.4)", text: "#FF6B6B" };
    default:
      return { bg: "rgba(var(--codedock-primary-rgb), 0.15)", border: "rgba(var(--codedock-primary-rgb), 0.3)", text: "var(--neon-cyan)" };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "In Review":
      return "리뷰 중";
    case "Approved":
      return "승인됨";
    case "Changes Requested":
      return "변경 요청";
    default:
      return status;
  }
}

function getHealthColor(score: number | null) {
  if (score === null) return "var(--muted)";
  if (score >= 90) return "var(--matrix-green)";
  if (score >= 70) return "#FFD93D";
  return "#FF6B6B";
}

function getActivityIcon(icon: string) {
  switch (icon) {
    case "commit":
      return <GitCommit size={16} style={{ color: "var(--soft-mint)" }} />;
    case "pr":
      return <GitPullRequest size={16} style={{ color: "var(--neon-cyan)" }} />;
    case "merge":
      return <CheckCircle size={16} style={{ color: "var(--matrix-green)" }} />;
    case "alert":
      return <AlertCircle size={16} style={{ color: "#FF6B6B" }} />;
    default:
      return <Clock size={16} style={{ color: "var(--muted)" }} />;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  color = "var(--white)"
}: {
  icon: typeof GitPullRequest;
  label: string;
  value: string | number;
  helper?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl px-5 py-5" style={{
      background: "rgba(5, 11, 20, 0.58)",
      border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
      boxShadow: "0 12px 28px rgba(0, 0, 0, 0.24)"
    }}>
      <Icon size={20} style={{ color: "var(--neon-cyan)", marginBottom: 10 }} />
      <p className="m-0 tracking-[-0.04em]" style={{ fontSize: 32, fontWeight: 950, color }}>
        {value}
      </p>
      <p className="m-0 mt-1 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--muted)" }}>
        {label}
      </p>
      {helper && (
        <p className="m-0 mt-1 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--matrix-green)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

const REPO_PAGE_SIZE = 6;
const BOOKMARK_PAGE_SIZE = 4;

function OverviewPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (next: number) => void }) {
  if (totalPages <= 1) return null;
  const navStyle = (disabled: boolean) => ({
    background: "rgba(234,247,255,0.05)",
    border: "1px solid rgba(var(--codedock-primary-rgb),0.16)",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1
  });
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
        className="rounded-lg border-0 px-2.5 py-1.5 tracking-tight" style={navStyle(page <= 1)}>
        이전
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
        const active = p === page;
        return (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={active ? "page" : undefined}
            className="rounded-lg border-0 tracking-tight"
            style={{
              minWidth: 30, padding: "6px 0",
              background: active ? "rgba(var(--codedock-primary-rgb),0.16)" : "rgba(234,247,255,0.05)",
              border: active ? "1px solid var(--neon-cyan)" : "1px solid rgba(var(--codedock-primary-rgb),0.16)",
              color: active ? "var(--neon-cyan)" : "var(--muted)",
              fontSize: 12, fontWeight: 950, cursor: "pointer"
            }}>
            {p}
          </button>
        );
      })}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}
        className="rounded-lg border-0 px-2.5 py-1.5 tracking-tight" style={navStyle(page >= totalPages)}>
        다음
      </button>
    </div>
  );
}

export function OverviewPanel({ repositories, onlineMembers, selectedRepositoryId, onSelectRepository, bookmarkGroups = [], onOpenBookmark }: OverviewPanelProps) {
  const [activeRepositoryId, setActiveRepositoryId] = useState<string | null>(null);
  const [repoPage, setRepoPage] = useState(1);
  const [bookmarkPage, setBookmarkPage] = useState(1);
  const repoTotalPages = Math.max(1, Math.ceil(repositories.length / REPO_PAGE_SIZE));
  const bookmarkTotalPages = Math.max(1, Math.ceil(bookmarkGroups.length / BOOKMARK_PAGE_SIZE));
  const safeRepoPage = Math.min(Math.max(1, repoPage), repoTotalPages);
  const safeBookmarkPage = Math.min(Math.max(1, bookmarkPage), bookmarkTotalPages);
  const pagedRepositories = repositories.slice((safeRepoPage - 1) * REPO_PAGE_SIZE, safeRepoPage * REPO_PAGE_SIZE);
  const pagedBookmarkGroups = bookmarkGroups.slice((safeBookmarkPage - 1) * BOOKMARK_PAGE_SIZE, safeBookmarkPage * BOOKMARK_PAGE_SIZE);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const activeRepository = repositories.find((repo) => repo.id === activeRepositoryId);
  const activeDetails = activeRepository
    ? activeRepository.overview
      ? mapRepositoryOverviewToDetails(activeRepository, activeRepository.overview)
      : repositoryDetails[activeRepository.id as keyof typeof repositoryDetails] ?? fallbackDetails
    : null;

  const integratedStats = useMemo(() => {
    return repositories.reduce(
      (acc, repo) => ({
        openPRs: acc.openPRs + repo.openPRs,
        highRisk: acc.highRisk + repo.highRisk,
        activeIssues: acc.activeIssues + repo.activeIssues,
        membersOnline: acc.membersOnline + repo.membersOnline
      }),
      { openPRs: 0, highRisk: 0, activeIssues: 0, membersOnline: 0 }
    );
  }, [repositories]);

  const onlineMembersValue = onlineMembers ?? integratedStats.membersOnline;

  const handleSelectRepository = (repositoryId: string) => {
    setActiveRepositoryId(repositoryId);
    onSelectRepository?.(repositoryId);
  };

  useEffect(() => {
    scrollRootRef.current?.scrollTo({ top: 0 });
  }, [activeRepositoryId]);

  if (activeRepository && activeDetails) {
    return (
      <div ref={scrollRootRef} className="codedock-scrollbar-hidden flex h-full min-h-0 flex-col overflow-y-auto px-6 py-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setActiveRepositoryId(null)}
                className="inline-flex items-center gap-2 rounded-full border-0 px-3 py-2 tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(var(--codedock-primary-rgb), 0.08)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
                  color: "var(--neon-cyan)",
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 950,
                  cursor: "pointer"
                }}
              >
                <ArrowLeft size={14} />
                통합 개요
              </button>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{
                background: "rgba(var(--codedock-secondary-rgb), 0.10)",
                border: "1px solid rgba(var(--codedock-secondary-rgb), 0.22)",
                color: "var(--matrix-green)"
              }}>
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--matrix-green)" }} />
                <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                  리포지토리 개요
                </span>
              </div>
            </div>
            <h2 className="m-0 mb-2 tracking-[-0.065em]" style={{ color: "var(--white)", fontSize: 38, fontWeight: 950 }}>
              {activeRepository.name}
            </h2>
            <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800, lineHeight: 1.6 }}>
              {activeDetails.summary}
            </p>
          </div>
          <div className="mt-10 -mr-2 flex-shrink-0 rounded-2xl px-4 py-3 text-center" style={{
            background: "rgba(234, 247, 255, 0.045)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
          }}>
            <p className="m-0 mb-1" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>현재 선택</p>
            <p className="m-0" style={{ color: selectedRepositoryId === activeRepository.id ? "var(--neon-cyan)" : "var(--white)", fontSize: 13, fontWeight: 950 }}>
              {selectedRepositoryId === activeRepository.id ? "동기화됨" : "미리보기"}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard icon={GitCommit} label="오늘 커밋" value={activeDetails.commitsToday} />
          <StatCard icon={GitPullRequest} label="진행 중인 PR" value={activeRepository.overview?.openPrCount ?? activeRepository.openPRs} helper="리뷰 대기 포함" />
          <StatCard icon={AlertCircle} label="높은 위험" value={activeRepository.overview?.highRiskCount ?? activeRepository.highRisk} color={(activeRepository.overview?.highRiskCount ?? activeRepository.highRisk) > 0 ? "#FF6B6B" : "var(--matrix-green)"} />
          <StatCard icon={Users} label="접속 중인 팀원" value={activeRepository.overview?.activeMemberCount ?? activeRepository.membersOnline} helper="활성 팀원" />
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl px-5 py-5" style={{
            background: "rgba(5, 11, 20, 0.58)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
          }}>
            <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
              최근 활동
            </h3>
            <div className="grid gap-3">
              {activeDetails.recentActivity.length > 0 ? activeDetails.recentActivity.map((activity, idx) => (
                <div key={`${activity.time}-${idx}`} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getActivityIcon(activity.icon)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 13, fontWeight: 850, lineHeight: 1.45 }}>
                      <span style={{ color: "var(--matrix-green)", fontWeight: 950 }}>{activity.user}</span> {activity.action}
                    </p>
                    <p className="m-0 mt-0.5 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="m-0 rounded-xl px-4 py-3 tracking-tight" style={{ background: "rgba(234, 247, 255, 0.045)", color: "var(--muted)", fontSize: 13, fontWeight: 850 }}>
                  최근 활동이 없습니다.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl px-5 py-5" style={{
            background: "rgba(5, 11, 20, 0.58)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
          }}>
            <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
              진행 중인 PR
            </h3>
            <div className="grid gap-3">
              {activeDetails.activePRs.length > 0 ? activeDetails.activePRs.map((pr) => {
                const status = getStatusColor(pr.status);
                const hasChangeStats = pr.changedFilesCount !== undefined || pr.additions !== undefined || pr.deletions !== undefined;
                return (
                  <div key={pr.number} className="rounded-xl px-4 py-3" style={{
                    background: "rgba(234, 247, 255, 0.045)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)"
                  }}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="m-0 min-w-0 tracking-tight" style={{ color: "var(--white)", fontSize: 13, fontWeight: 950 }}>
                        #{pr.number} {pr.title}
                      </p>
                      <span className="shrink-0 rounded px-2 py-1 tracking-tight" style={{
                        background: status.bg,
                        border: `1px solid ${status.border}`,
                        color: status.text,
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 950
                      }}>
                        {getStatusLabel(pr.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>{pr.author}</span>
                      {hasChangeStats ? (
                        <>
                          <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>변경 파일 {pr.changedFilesCount ?? 0}개</span>
                          <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>+{pr.additions ?? 0} / -{pr.deletions ?? 0}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>리뷰어 {pr.reviewers ?? 0}명</span>
                          <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>댓글 {pr.comments ?? 0}개</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p className="m-0 rounded-xl px-4 py-3 tracking-tight" style={{ background: "rgba(234, 247, 255, 0.045)", color: "var(--muted)", fontSize: 13, fontWeight: 850 }}>
                  진행 중인 PR이 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl px-5 py-5" style={{
          background: "rgba(5, 11, 20, 0.58)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
        }}>
          <h3 className="m-0 mb-5 tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
            리포지토리 상태
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: "코드 품질", value: activeDetails.codeQuality, icon: TrendingUp },
              { label: "보안 점수", value: activeDetails.securityScore, icon: Shield },
              { label: "성능", value: activeDetails.performance, icon: Zap }
            ].map((item) => {
              const Icon = item.icon;
              const color = getHealthColor(item.value);
              const scoreText = item.value === null ? "—" : `${item.value}/100`;
              const scoreWidth = item.value === null ? 0 : item.value;
              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} style={{ color: "var(--neon-cyan)" }} />
                      <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>{item.label}</span>
                    </div>
                    <span style={{ color, fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{scoreText}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(var(--codedock-primary-rgb), 0.10)" }}>
                    <div className="h-full rounded-full" style={{ width: `${scoreWidth}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div ref={scrollRootRef} className="codedock-scrollbar-hidden flex h-full min-h-0 flex-col overflow-y-auto px-6 py-6">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{
          background: "rgba(var(--codedock-primary-rgb), 0.09)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
          color: "var(--neon-cyan)"
        }}>
          <Layers size={15} />
          <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
            통합 워크스페이스
          </span>
        </div>
        <h2 className="m-0 mb-2 tracking-[-0.065em]" style={{ color: "var(--white)", fontSize: 40, fontWeight: 950 }}>
          통합 개요
        </h2>
        <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800, lineHeight: 1.65 }}>
          연결된 모든 리포지토리의 PR, 이슈, 위험 신호를 한 화면에서 먼저 확인합니다. 아래 리포지토리를 선택하면 해당 저장소만 따로 볼 수 있어요.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard icon={GitBranch} label="리포지토리" value={repositories.length} helper="연결됨" />
        <StatCard icon={GitPullRequest} label="진행 중인 PR" value={integratedStats.openPRs} helper="전체 리뷰 대기" />
        <StatCard icon={AlertCircle} label="높은 위험" value={integratedStats.highRisk} color={integratedStats.highRisk > 0 ? "#FF6B6B" : "var(--matrix-green)"} />
        <StatCard icon={Activity} label="열린 이슈" value={integratedStats.activeIssues} />
        <StatCard icon={Users} label="접속 중" value={onlineMembersValue} helper="팀원 접속" />
      </div>

      <section className="mb-6 rounded-2xl px-5 py-5" style={{
        background: "rgba(5, 11, 20, 0.50)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
      }}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="m-0 mb-1 tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 950 }}>
              리포지토리별 개요
            </h3>
            <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
              저장소를 선택하면 상세 개요로 전환됩니다.
            </p>
          </div>
          <Sparkles size={20} style={{ color: "var(--neon-cyan)" }} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {pagedRepositories.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => handleSelectRepository(repo.id)}
              className="rounded-2xl px-5 py-5 text-left transition-all hover:translate-y-[-2px]"
              style={{
                background: "rgba(11, 22, 40, 0.82)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
                boxShadow: "0 14px 34px rgba(0, 0, 0, 0.25)",
                cursor: "pointer"
              }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="m-0 mb-1 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
                    {repo.name}
                  </h4>
                  <p className="m-0 tracking-tight" style={{ color: repo.connected ? "var(--matrix-green)" : "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                    {repo.connected ? "GitHub 연결됨" : "연결되지 않음"}
                  </p>
                </div>
                <GitBranch size={20} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="m-0 mb-1" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>PR</p>
                  <p className="m-0" style={{ color: "var(--neon-cyan)", fontSize: 22, fontWeight: 950 }}>{repo.openPRs}</p>
                </div>
                <div>
                  <p className="m-0 mb-1" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>위험</p>
                  <p className="m-0" style={{ color: repo.highRisk > 0 ? "#FF6B6B" : "var(--matrix-green)", fontSize: 22, fontWeight: 950 }}>{repo.highRisk}</p>
                </div>
                <div>
                  <p className="m-0 mb-1" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>이슈</p>
                  <p className="m-0" style={{ color: "var(--soft-mint)", fontSize: 22, fontWeight: 950 }}>{repo.activeIssues}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <OverviewPagination page={safeRepoPage} totalPages={repoTotalPages} onChange={setRepoPage} />
      </section>

      <section className="mb-6 rounded-2xl px-5 py-5" style={{
        background: "rgba(5, 11, 20, 0.50)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
      }}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="m-0 mb-1 tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 950 }}>
              채널별 북마크
            </h3>
            <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
              워크스페이스의 북마크를 채널 기준으로 모아봅니다.
            </p>
          </div>
          <Bookmark size={20} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
        </div>

        {bookmarkGroups.length > 0 ? (
          <>
          <div className="grid gap-4 xl:grid-cols-2">
            {pagedBookmarkGroups.map((group) => (
              <div
                key={group.channelId}
                className="rounded-2xl px-4 py-4"
                style={{
                  background: "rgba(11, 22, 40, 0.74)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                      {`# ${group.channelLabel}`}
                    </p>
                    <p className="m-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                      {`${group.items.length}개 북마크`}
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 tracking-tight" style={{
                    background: "rgba(var(--codedock-primary-rgb), 0.10)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                    color: "var(--neon-cyan)",
                    fontSize: 11,
                    fontWeight: 950
                  }}>
                    {group.items.length}
                  </span>
                </div>

                <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1">
                  {group.items.map((item) => (
                    <button
                      key={`${group.channelId}-${item.messageId}`}
                      type="button"
                      onClick={() => onOpenBookmark?.(item.channelId ?? group.channelId, item.messageId)}
                      disabled={!onOpenBookmark}
                      className="flex w-full items-start gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight transition-all hover:translate-y-[-1px]"
                      style={{
                        background: "rgba(234, 247, 255, 0.045)",
                        border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
                        cursor: onOpenBookmark ? "pointer" : "default",
                        opacity: onOpenBookmark ? 1 : 0.72
                      }}
                    >
                      <Bookmark size={14} style={{ color: "var(--neon-cyan)", flexShrink: 0, marginTop: 2 }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" style={{ color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                          {`메시지 #${item.messageId}`}
                        </span>
                        <span className="block truncate" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                          {item.content}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <OverviewPagination page={safeBookmarkPage} totalPages={bookmarkTotalPages} onChange={setBookmarkPage} />
          </>
        ) : (
          <div className="rounded-2xl px-4 py-4 tracking-tight" style={{
            background: "rgba(234, 247, 255, 0.045)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 850
          }}>
            아직 북마크한 메시지가 없습니다.
          </div>
        )}
      </section>

      <section className="rounded-2xl px-5 py-5" style={{
        background: "rgba(5, 11, 20, 0.50)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
      }}>
        <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 950 }}>
          통합 우선순위
        </h3>
        <div className="grid gap-3">
          {[
            { label: "보안 위험 PR 먼저 확인", value: `${integratedStats.highRisk}건`, color: "#FF6B6B" },
            { label: "리뷰 대기 PR 정리", value: `${integratedStats.openPRs}건`, color: "var(--neon-cyan)" },
            { label: "이슈 트리아지", value: `${integratedStats.activeIssues}건`, color: "var(--soft-mint)" }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl px-4 py-3" style={{
              background: "rgba(234, 247, 255, 0.045)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)"
            }}>
              <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 900 }}>{item.label}</span>
              <span className="tracking-tight" style={{ color: item.color, fontSize: 14, fontWeight: 950 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
