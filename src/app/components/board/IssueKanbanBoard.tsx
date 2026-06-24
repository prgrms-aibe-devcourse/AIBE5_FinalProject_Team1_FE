import { useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CheckCircle2, Clock, User, XCircle } from "lucide-react";
import type { Issue, IssueLabel } from "../../api/issue";
import type { RepositoryPullRequest } from "../../api/github";

// 칸반 컬럼 = GithubIssue.localStatus 값과 1:1. (백엔드는 status만 저장하므로 컬럼 내 순서는 비영속)
export type BoardStatus = "todo" | "in_progress" | "review" | "done" | "blocked";

// 보드 카드 정규화 형태. 이슈와 PR을 함께 담는다. raw에 원본을 보존해 onView 등에서 활용.
export interface BoardCard {
  kind: "issue" | "pr";
  id: number;        // 원본 DB id (이슈는 localStatus PATCH 대상)
  number: number;    // 표시용 번호 (#) — 이슈 번호 / PR 번호
  title: string;     // 이슈 제목 / PR 제목
  priority: "high" | "medium" | "low" | null;
  assignees: string[];
  author: string | null;  // 담당자 없을 때 fallback 표시용 작성자
  labels: IssueLabel[];
  status: BoardStatus;
  raw: Issue | RepositoryPullRequest;
}

const DRAG_TYPE = "BOARD_CARD";

export const BOARD_COLUMNS: { id: BoardStatus; title: string; color: string }[] = [
  { id: "todo", title: "할 일", color: "var(--muted)" },
  { id: "in_progress", title: "진행 중", color: "var(--neon-cyan)" },
  { id: "review", title: "검토 중", color: "var(--soft-mint)" },
  { id: "done", title: "완료", color: "var(--matrix-green)" },
  { id: "blocked", title: "막힘", color: "#FF6B6B" },
];

const STAT_ICONS: Record<BoardStatus, typeof Clock> = {
  todo: Clock,
  in_progress: Clock,
  review: Clock,
  done: CheckCircle2,
  blocked: XCircle,
};

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const EMPTY_BOARD: Record<BoardStatus, BoardCard[]> = {
  todo: [], in_progress: [], review: [], done: [], blocked: [],
};

// 원본 Issue → 정규화 카드
export function issueToBoardCard(issue: Issue): BoardCard {
  return {
    kind: "issue",
    id: issue.id,
    number: issue.issueNumber,
    title: issue.title,
    priority: issue.priority,
    assignees: issue.assignees ?? [],
    author: issue.author ?? null,
    labels: issue.labels ?? [],
    status: (issue.localStatus ?? "todo") as BoardStatus,
    raw: issue,
  };
}

// PR 상태 → 칸반 컬럼. 병합/닫힘 = 완료, 그 외(열림·승인) = 검토 중.
export function prStatusToBoardStatus(prStatus: string): BoardStatus {
  if (prStatus === "merged" || prStatus === "closed") return "done";
  return "review";
}

// 원본 PR → 정규화 카드. PR은 GitHub 상태로 컬럼이 결정되며 드래그 이동/영속화 대상이 아니다.
export function prToBoardCard(pr: RepositoryPullRequest): BoardCard {
  return {
    kind: "pr",
    id: pr.id,
    number: pr.prNumber,
    title: pr.prTitle,
    priority: null,
    assignees: [],
    author: pr.prAuthor ?? null,
    labels: [],
    status: prStatusToBoardStatus(pr.prStatus),
    raw: pr,
  };
}

// 카드 목록을 컬럼별로 그룹화 + 컬럼 내에서는 이슈 번호 내림차순(최신 위)
export function groupCardsByStatus(cards: BoardCard[]): Record<BoardStatus, BoardCard[]> {
  const board: Record<BoardStatus, BoardCard[]> = {
    todo: [], in_progress: [], review: [], done: [], blocked: [],
  };
  for (const card of cards) {
    (board[card.status] ?? board.todo).push(card);
  }
  for (const key of Object.keys(board) as BoardStatus[]) {
    board[key].sort((a, b) => b.number - a.number);
  }
  return board;
}

type DragItem = { card: BoardCard };

interface KanbanCardProps {
  card: BoardCard;
  onView?: (card: BoardCard) => void;
}

function KanbanCard({ card, onView }: KanbanCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const canDrag = card.kind === "issue"; // PR은 GitHub 상태로 컬럼이 고정 → 드래그 불가
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { card },
    canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  drag(ref);

  // 우측 뱃지: 우선순위 대신 현재 컬럼(상태)을 표시
  const column = BOARD_COLUMNS.find((c) => c.id === card.status);
  const statusColor = column?.color ?? "var(--muted)";
  const statusLabel = column?.title ?? "";

  // 담당자 우선, 없으면 작성자, 둘 다 없으면 미할당
  const ownerName = card.assignees[0] ?? card.author ?? null;
  const extraAssignees = card.assignees.length > 1 ? card.assignees.length - 1 : 0;

  return (
    <div
      ref={ref}
      onClick={() => !isDragging && onView?.(card)}
      className="px-4 py-4 rounded-2xl transition-all hover:scale-[1.02]"
      style={{
        background: "rgba(234, 247, 255, 0.055)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
        opacity: isDragging ? 0.4 : 1,
        cursor: canDrag ? "grab" : onView ? "pointer" : "default",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--neon-cyan)" }}>
          {card.kind === "pr" ? (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(var(--codedock-secondary-rgb), 0.15)",
                border: "1px solid rgba(var(--codedock-secondary-rgb), 0.3)",
                fontSize: "10px",
                fontWeight: 900,
                color: "var(--matrix-green)",
              }}
            >
              PR
            </span>
          ) : (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(var(--codedock-primary-rgb), 0.15)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.3)",
                fontSize: "10px",
                fontWeight: 900,
                color: "var(--neon-cyan)",
              }}
            >
              ISSUE
            </span>
          )}
          #{card.number}
        </span>
        <div
          className="px-2 py-0.5 rounded-full tracking-tight"
          style={{
            background: colorAlpha(statusColor, 13),
            border: `1px solid ${statusColor}`,
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 900,
            color: statusColor,
          }}
        >
          {statusLabel}
        </div>
      </div>

      <h3 className="m-0 mb-2 leading-[1.3] tracking-tight" style={{ fontSize: "14px", fontWeight: 900, color: "var(--white)" }}>
        {card.title}
      </h3>

      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="px-2 py-0.5 rounded-full tracking-tight"
              style={{
                background: colorAlpha(label.color, 18),
                border: `1px solid ${colorAlpha(label.color, 40)}`,
                fontSize: "11px",
                fontWeight: 800,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {ownerName ? (
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: "var(--matrix-green)" }} />
            <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)" }}>
              {ownerName}
              {extraAssignees > 0 && ` +${extraAssignees}`}
            </span>
          </div>
        ) : (
          <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)" }}>
            미할당
          </span>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: BoardStatus; title: string; color: string };
  cards: BoardCard[];
  loading?: boolean;
  emptyLabel: string;
  onMove: (card: BoardCard, toStatus: BoardStatus) => void;
  onView?: (card: BoardCard) => void;
}

function KanbanColumn({ column, cards, loading, emptyLabel, onMove, onView }: KanbanColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: DRAG_TYPE,
    drop: (item) => {
      if (item.card.status !== column.id) onMove(item.card, column.id);
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });
  drop(ref);

  return (
    <div className="flex flex-col">
      <div
        className="px-5 py-4 rounded-t-3xl"
        style={{
          background: "rgba(11, 22, 40, 0.95)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
          borderBottom: "none",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 tracking-[-0.065em]" style={{ fontSize: "18px", fontWeight: 950, color: column.color }}>
            {column.title}
          </h2>
          <span
            className="px-2 py-1 rounded-full tracking-tight"
            style={{
              background: colorAlpha(column.color, 13),
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 900,
              color: column.color,
            }}
          >
            {cards.length}
          </span>
        </div>
      </div>

      <div
        ref={ref}
        className="px-4 py-4 rounded-b-3xl flex-1"
        style={{
          background: isOver ? "rgba(var(--codedock-primary-rgb), 0.08)" : "rgba(11, 22, 40, 0.82)",
          border: `1px solid ${isOver ? "rgba(var(--codedock-primary-rgb), 0.5)" : "rgba(var(--codedock-primary-rgb), 0.16)"}`,
          borderTop: "none",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
          backdropFilter: "blur(16px)",
          transition: "background 0.15s, border 0.15s",
          minHeight: "80px",
        }}
      >
        {loading ? (
          <p className="text-center tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700, padding: "16px 0" }}>
            로딩 중...
          </p>
        ) : cards.length === 0 ? (
          <p className="text-center tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700, padding: "16px 0", opacity: 0.5 }}>
            {emptyLabel}
          </p>
        ) : (
          <div className="grid gap-3">
            {cards.map((card) => (
              <KanbanCard key={`${card.kind}-${card.id}`} card={card} onView={onView} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface IssueKanbanBoardProps {
  title: string;
  subtitle?: string;
  board: Record<BoardStatus, BoardCard[]>;
  loading?: boolean;
  onMove: (card: BoardCard, toStatus: BoardStatus) => void;
  onView?: (card: BoardCard) => void;
  emptyLabel?: string;
}

// 제목/통계카드/5컬럼 칸반을 렌더하는 순수 표현 컴포넌트. 외곽 레이아웃(폭/스크롤)은 소비자가 감싼다.
export function IssueKanbanBoard({
  title,
  subtitle,
  board,
  loading = false,
  onMove,
  onView,
  emptyLabel = "이슈 없음",
}: IssueKanbanBoardProps) {
  const safeBoard = board ?? EMPTY_BOARD;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mb-8">
        <h1
          className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]"
          style={{
            fontSize: "clamp(36px, 4vw, 56px)",
            fontWeight: 950,
            color: "var(--white)",
            textShadow: "0 0 22px rgba(var(--codedock-primary-rgb), 0.18)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="m-0 tracking-tight" style={{ fontSize: "15px", fontWeight: 700, color: "var(--muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {BOARD_COLUMNS.map((col) => {
          const Icon = STAT_ICONS[col.id];
          return (
            <div
              key={col.id}
              className="px-5 py-5 rounded-3xl"
              style={{
                background: "rgba(11, 22, 40, 0.82)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Icon size={20} style={{ color: col.color, marginBottom: "8px" }} />
              <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                {col.title}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{ fontSize: "32px", fontWeight: 950, color: col.color }}>
                {loading ? "—" : safeBoard[col.id].length}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {BOARD_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={safeBoard[column.id]}
            loading={loading}
            emptyLabel={emptyLabel}
            onMove={onMove}
            onView={onView}
          />
        ))}
      </div>
    </DndProvider>
  );
}
