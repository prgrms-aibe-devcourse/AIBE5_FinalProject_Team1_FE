import { Clock, AlertCircle, CheckCircle2, XCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getWorkspaceIssues, updateIssueLocalStatus, type Issue } from "../api/issue";
import { useWorkspace } from "../contexts/WorkspaceContext";

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

type LocalStatus = "todo" | "in_progress" | "review" | "done" | "blocked";

const columns: { id: LocalStatus; title: string; color: string }[] = [
  { id: "todo",        title: "할 일",   color: "var(--muted)" },
  { id: "in_progress", title: "진행 중", color: "var(--neon-cyan)" },
  { id: "review",      title: "검토 중", color: "var(--soft-mint)" },
  { id: "done",        title: "완료",    color: "var(--matrix-green)" },
  { id: "blocked",     title: "막힘",    color: "#FF6B6B" },
];

const EMPTY_BOARD: Record<LocalStatus, Issue[]> = {
  todo: [], in_progress: [], review: [], done: [], blocked: [],
};

function getPriorityColor(priority: string | null) {
  switch (priority) {
    case "high":   return "#FF6B6B";
    case "medium": return "#FFD93D";
    case "low":    return "#6BCF7F";
    default:       return "var(--muted)";
  }
}

function getPriorityIcon(priority: string | null) {
  switch (priority) {
    case "high":   return <AlertCircle size={14} />;
    case "medium": return <Clock size={14} />;
    case "low":    return <CheckCircle2 size={14} />;
    default:       return null;
  }
}

function getPriorityLabel(priority: string | null) {
  switch (priority) {
    case "high":   return "높음";
    case "medium": return "보통";
    case "low":    return "낮음";
    default:       return "미정";
  }
}

function groupByStatus(issues: Issue[]): Record<LocalStatus, Issue[]> {
  const board: Record<LocalStatus, Issue[]> = { ...EMPTY_BOARD, todo: [], in_progress: [], review: [], done: [], blocked: [] };
  for (const issue of issues) {
    const key = (issue.localStatus ?? "todo") as LocalStatus;
    if (board[key]) board[key].push(issue);
    else board.todo.push(issue);
  }
  return board;
}

export function IssueBoardPage() {
  const { workspaceId } = useWorkspace();
  const [board, setBoard] = useState<Record<LocalStatus, Issue[]>>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    getWorkspaceIssues(Number(workspaceId))
      .then((issues) => setBoard(groupByStatus(issues)))
      .catch(() => setBoard(EMPTY_BOARD))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleStatusChange = async (issue: Issue, nextStatus: LocalStatus) => {
    if (!workspaceId || issue.localStatus === nextStatus) return;

    // 낙관적 업데이트
    setBoard((prev) => {
      const prevStatus = issue.localStatus as LocalStatus;
      const updated = { ...issue, localStatus: nextStatus };
      return {
        ...prev,
        [prevStatus]: prev[prevStatus].filter((i) => i.id !== issue.id),
        [nextStatus]: [...prev[nextStatus], updated],
      };
    });

    try {
      await updateIssueLocalStatus(Number(workspaceId), issue.id, { localStatus: nextStatus });
    } catch {
      // 실패 시 롤백
      setBoard((prev) => {
        const prevStatus = issue.localStatus as LocalStatus;
        return {
          ...prev,
          [nextStatus]: prev[nextStatus].filter((i) => i.id !== issue.id),
          [prevStatus]: [...prev[prevStatus], issue],
        };
      });
    }
  };

  return (
    <div className="w-[min(1600px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <div className="mb-8">
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: "clamp(48px, 6vw, 72px)",
          fontWeight: 950,
          color: "var(--white)",
          textShadow: "0 0 22px rgba(var(--codedock-primary-rgb), 0.18)"
        }}>
          이슈 보드
        </h1>
        <p className="m-0 tracking-tight" style={{ fontSize: "18px", fontWeight: 700, color: "var(--muted)" }}>
          칸반 보드로 이슈를 관리합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5 mb-9">
        {[
          { label: "할 일",   value: board.todo.length,        color: "var(--muted)",         icon: Clock },
          { label: "진행 중", value: board.in_progress.length, color: "var(--neon-cyan)",      icon: Clock },
          { label: "검토 중", value: board.review.length,      color: "var(--soft-mint)",      icon: Clock },
          { label: "완료",    value: board.done.length,        color: "var(--matrix-green)",   icon: CheckCircle2 },
          { label: "막힘",    value: board.blocked.length,     color: "#FF6B6B",               icon: XCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="px-5 py-5 rounded-3xl" style={{
              background: "rgba(11, 22, 40, 0.82)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
              backdropFilter: "blur(16px)"
            }}>
              <Icon size={20} style={{ color: stat.color, marginBottom: "8px" }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: "var(--muted)",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 900
              }}>
                {stat.label}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: "32px",
                fontWeight: 950,
                color: stat.color
              }}>
                {loading ? "—" : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* 컬럼 헤더 */}
            <div className="px-5 py-4 rounded-t-3xl sticky top-20 z-10" style={{
              background: "rgba(11, 22, 40, 0.95)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
              borderBottom: "none",
              backdropFilter: "blur(16px)"
            }}>
              <div className="flex items-center justify-between">
                <h2 className="m-0 tracking-[-0.065em]" style={{
                  fontSize: "18px", fontWeight: 950, color: column.color
                }}>
                  {column.title}
                </h2>
                <span className="px-2 py-1 rounded-full tracking-tight" style={{
                  background: colorAlpha(column.color, 13),
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 900,
                  color: column.color
                }}>
                  {board[column.id].length}
                </span>
              </div>
            </div>

            {/* 카드 목록 */}
            <div className="px-4 py-4 rounded-b-3xl flex-1" style={{
              background: "rgba(11, 22, 40, 0.82)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
              borderTop: "none",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
              backdropFilter: "blur(16px)"
            }}>
              {loading ? (
                <p className="text-center tracking-tight" style={{
                  color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700, padding: "16px 0"
                }}>
                  로딩 중...
                </p>
              ) : board[column.id].length === 0 ? (
                <p className="text-center tracking-tight" style={{
                  color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700, padding: "16px 0", opacity: 0.5
                }}>
                  이슈 없음
                </p>
              ) : (
                <div className="grid gap-3">
                  {board[column.id].map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      columns={columns}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  columns,
  onStatusChange,
}: {
  issue: Issue;
  columns: { id: LocalStatus; title: string; color: string }[];
  onStatusChange: (issue: Issue, next: LocalStatus) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priorityColor = getPriorityColor(issue.priority);

  return (
    <div
      className="px-4 py-4 rounded-2xl transition-all hover:scale-[1.02]"
      style={{
        background: "rgba(234, 247, 255, 0.055)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
        cursor: "default",
        position: "relative"
      }}
    >
      {/* 상단 행: 이슈 번호 + 우선순위 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="tracking-tight" style={{
          fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--neon-cyan)"
        }}>
          #{issue.issueNumber}
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
          background: colorAlpha(priorityColor, 13),
          border: `1px solid ${priorityColor}`,
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 900,
          color: priorityColor
        }}>
          {getPriorityIcon(issue.priority)}
          {getPriorityLabel(issue.priority)}
        </div>
      </div>

      {/* 이슈 제목 */}
      <h3 className="m-0 mb-2 leading-[1.3] tracking-tight" style={{
        fontSize: "14px", fontWeight: 900, color: "var(--white)"
      }}>
        {issue.title}
      </h3>

      {/* 라벨 */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {issue.labels.slice(0, 3).map((label) => (
            <span key={label.name} className="px-2 py-0.5 rounded-full tracking-tight" style={{
              background: colorAlpha(label.color, 18),
              border: `1px solid ${colorAlpha(label.color, 40)}`,
              fontSize: "11px",
              fontWeight: 800,
              color: label.color
            }}>
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* 하단 행: 담당자 + 상태 변경 */}
      <div className="flex items-center justify-between gap-2">
        {issue.assignees.length > 0 ? (
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: "var(--matrix-green)" }} />
            <span className="tracking-tight" style={{
              fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)"
            }}>
              {issue.assignees[0]}
              {issue.assignees.length > 1 && ` +${issue.assignees.length - 1}`}
            </span>
          </div>
        ) : (
          <span className="tracking-tight" style={{
            fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)"
          }}>
            미할당
          </span>
        )}

        {/* 상태 변경 드롭다운 */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="px-2 py-0.5 rounded tracking-tight"
            style={{
              background: "rgba(var(--codedock-primary-rgb), 0.10)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 800,
              color: "var(--muted)",
              cursor: "pointer"
            }}
          >
            이동 ▾
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                background: "rgba(11, 22, 40, 0.98)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
                borderRadius: "10px",
                padding: "4px",
                minWidth: "120px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {columns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => { onStatusChange(issue, col.id); setMenuOpen(false); }}
                  disabled={col.id === issue.localStatus}
                  className="w-full text-left px-3 py-1.5 rounded-lg tracking-tight"
                  style={{
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 800,
                    color: col.id === issue.localStatus ? col.color : "var(--muted)",
                    background: col.id === issue.localStatus ? colorAlpha(col.color, 10) : "transparent",
                    cursor: col.id === issue.localStatus ? "default" : "pointer",
                    border: "none"
                  }}
                >
                  {col.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
