import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AlertCircle, CheckCircle2, Clock, User, XCircle } from "lucide-react";

const DRAG_TYPE = "BOARD_ISSUE";

type ColumnId = "todo" | "in_progress" | "review" | "done" | "blocked";

interface WorkBoardIssue {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  assignee: string | null;
  relatedPR: number | null;
}

interface WorkBoardPanelProps {
  repositoryName?: string;
  onViewIssue?: (issueData: any) => void;
}

type DragIssueItem = {
  id: number;
  fromColumn: ColumnId;
  index: number;
};

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: "todo", title: "할 일", color: "var(--muted)" },
  { id: "in_progress", title: "진행 중", color: "var(--neon-cyan)" },
  { id: "review", title: "검토 중", color: "var(--soft-mint)" },
  { id: "done", title: "완료", color: "var(--matrix-green)" },
  { id: "blocked", title: "막힘", color: "#FF6B6B" },
];

const STAT_ICONS: Record<ColumnId, typeof Clock> = {
  todo: Clock,
  in_progress: Clock,
  review: Clock,
  done: CheckCircle2,
  blocked: XCircle,
};

const COLUMN_LABEL_MAP: Record<ColumnId, { name: string; color: string }[]> = {
  todo: [{ name: "할 일", color: "#6B7280" }],
  in_progress: [{ name: "진행 중", color: "#20E3FF" }],
  review: [{ name: "검토 중", color: "#A8E6CF" }],
  done: [{ name: "완료", color: "#39FF88" }],
  blocked: [{ name: "막힘", color: "#FF6B6B" }],
};

const getStorageKey = (repositoryName?: string) =>
  `codedock.work-board.${repositoryName ?? "default"}`;

function getInitialIssues(): Record<ColumnId, WorkBoardIssue[]> {
  return {
    todo: [
      { id: 145, title: "refresh API 요청 제한이 작동하지 않음", priority: "high", assignee: "김진필", relatedPR: null },
      { id: 144, title: "비밀번호 재설정 이메일 템플릿 추가", priority: "medium", assignee: "김준우", relatedPR: null },
      { id: 143, title: "v2 API 문서 업데이트", priority: "low", assignee: null, relatedPR: null },
    ],
    in_progress: [
      { id: 142, title: "JWT refresh token rotation 구현", priority: "high", assignee: "김진필", relatedPR: 234 },
      { id: 141, title: "인증 실패 로그 추가", priority: "medium", assignee: "김진현", relatedPR: 233 },
    ],
    review: [
      { id: 140, title: "운영 환경 CORS 설정 수정", priority: "high", assignee: "김진현", relatedPR: 232 },
      { id: 139, title: "데이터베이스 쿼리 성능 개선", priority: "medium", assignee: "김재준", relatedPR: 231 },
    ],
    done: [
      { id: 138, title: "사용자 프로필 API 리디자인 추가", priority: "medium", assignee: "김준우", relatedPR: 230 },
      { id: 137, title: "CI/CD 파이프라인 설정", priority: "high", assignee: "김재준", relatedPR: 229 },
    ],
    blocked: [
      { id: 136, title: "데이터베이스 스키마 마이그레이션", priority: "high", assignee: "김재준", relatedPR: null },
    ],
  };
}

function loadIssues(storageKey: string): Record<ColumnId, WorkBoardIssue[]> {
  if (typeof window === "undefined") return getInitialIssues();

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return getInitialIssues();
    const parsed = JSON.parse(saved) as Record<ColumnId, WorkBoardIssue[]>;
    if (!parsed.todo || !parsed.in_progress || !parsed.review || !parsed.done || !parsed.blocked) {
      return getInitialIssues();
    }
    const migrated = migrateIssues(parsed);
    saveIssues(storageKey, migrated);
    return migrated;
  } catch {
    return getInitialIssues();
  }
}

function migrateIssues(issues: Record<ColumnId, WorkBoardIssue[]>): Record<ColumnId, WorkBoardIssue[]> {
  const replaceName = (name: string | null) => (name === "김진아" ? "김진필" : name);

  return {
    todo: issues.todo.map((issue) => ({ ...issue, assignee: replaceName(issue.assignee) })),
    in_progress: issues.in_progress.map((issue) => ({ ...issue, assignee: replaceName(issue.assignee) })),
    review: issues.review.map((issue) => ({ ...issue, assignee: replaceName(issue.assignee) })),
    done: issues.done.map((issue) => ({ ...issue, assignee: replaceName(issue.assignee) })),
    blocked: issues.blocked.map((issue) => ({ ...issue, assignee: replaceName(issue.assignee) })),
  };
}

function saveIssues(storageKey: string, issues: Record<ColumnId, WorkBoardIssue[]>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(issues));
  } catch {
    // Ignore storage failures so dragging remains responsive.
  }
}

function buildIssueData(issue: WorkBoardIssue, columnId: ColumnId) {
  const priorityLabelMap: Record<string, { name: string; color: string }> = {
    high: { name: "priority: high", color: "#FF6B6B" },
    medium: { name: "priority: medium", color: "#F59E0B" },
    low: { name: "priority: low", color: "#22C55E" },
  };

  return {
    issueNumber: issue.id,
    issueTitle: issue.title,
    issueStatus: columnId,
    issueAuthor: issue.assignee ?? "미할당",
    issueLabels: [...COLUMN_LABEL_MAP[columnId], priorityLabelMap[issue.priority]].filter(Boolean),
    issueAssignees: issue.assignee ? [issue.assignee] : [],
    issuePriority: issue.priority,
    issueType: columnId === "blocked" ? "Blocked" : columnId === "done" ? "Completed" : "Task",
    issueBody: `## 이슈 제목\n${issue.title}${issue.relatedPR ? `\n\n## 연결 PR\nPR #${issue.relatedPR}과 연결되어 있습니다.` : ""}`,
    issueHistory: [
      {
        id: "h1",
        actor: issue.assignee ?? "시스템",
        action: "이슈가 생성되었습니다.",
        time: "작업 보드",
        eventType: "created" as const,
      },
      ...(issue.assignee
        ? [
            {
              id: "h2",
              actor: issue.assignee,
              action: `${issue.assignee}님이 담당자로 지정되었습니다.`,
              time: "작업 보드",
              eventType: "assigned" as const,
            },
          ]
        : []),
    ],
  };
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "#FF6B6B";
    case "medium":
      return "#FFD93D";
    case "low":
      return "#6BCF7F";
    default:
      return "var(--muted)";
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "high":
      return <AlertCircle size={14} />;
    case "medium":
      return <Clock size={14} />;
    case "low":
      return <CheckCircle2 size={14} />;
    default:
      return null;
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case "high":
      return "높음";
    case "medium":
      return "보통";
    case "low":
      return "낮음";
    default:
      return "미정";
  }
};

interface IssueCardProps {
  issue: WorkBoardIssue;
  columnId: ColumnId;
  index: number;
  moveIssue: (issueId: number, fromColumn: ColumnId, toColumn: ColumnId, toIndex?: number) => void;
  onViewIssue?: (issueData: any) => void;
}

function IssueCard({ issue, columnId, index, moveIssue, onViewIssue }: IssueCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag<DragIssueItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: issue.id, fromColumn: columnId, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<DragIssueItem>({
    accept: DRAG_TYPE,
    hover: (item, monitor) => {
      if (!cardRef.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      const sameColumn = item.fromColumn === columnId;

      if (sameColumn && dragIndex === hoverIndex) return;

      const hoverRect = cardRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverRect.top;

      if (sameColumn && dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (sameColumn && dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      if (!sameColumn && hoverClientY > hoverMiddleY) return;

      moveIssue(item.id, item.fromColumn, columnId, hoverIndex);
      item.fromColumn = columnId;
      item.index = hoverIndex;
    },
  });

  drag(drop(cardRef));

  return (
    <div
      ref={cardRef}
      onClick={() => !isDragging && onViewIssue?.(buildIssueData(issue, columnId))}
      className="px-4 py-4 rounded-2xl transition-all hover:scale-[1.02]"
      style={{
        background: "rgba(234, 247, 255, 0.055)",
        border: "1px solid rgba(32, 227, 255, 0.14)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="tracking-tight" style={{ fontSize: "12px", fontWeight: 900, color: "var(--neon-cyan)" }}>
          #{issue.id}
        </span>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            background: `${getPriorityColor(issue.priority)}22`,
            border: `1px solid ${getPriorityColor(issue.priority)}`,
            fontSize: "11px",
            fontWeight: 900,
            color: getPriorityColor(issue.priority),
          }}
        >
          {getPriorityIcon(issue.priority)}
          {getPriorityLabel(issue.priority)}
        </div>
      </div>

      <h3 className="m-0 mb-3 leading-[1.3] tracking-tight" style={{ fontSize: "14px", fontWeight: 900, color: "var(--white)" }}>
        {issue.title}
      </h3>

      <div className="flex items-center justify-between gap-2">
        {issue.assignee ? (
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: "var(--matrix-green)" }} />
            <span className="tracking-tight" style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)" }}>
              {issue.assignee}
            </span>
          </div>
        ) : (
          <span className="tracking-tight" style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)" }}>
            미할당
          </span>
        )}

        {issue.relatedPR && (
          <span
            className="px-2 py-0.5 rounded tracking-tight"
            style={{
              background: "rgba(57, 255, 136, 0.15)",
              border: "1px solid rgba(57, 255, 136, 0.3)",
              fontSize: "11px",
              fontWeight: 900,
              color: "var(--matrix-green)",
            }}
          >
            PR #{issue.relatedPR}
          </span>
        )}
      </div>
    </div>
  );
}

interface DropColumnProps {
  column: { id: ColumnId; title: string; color: string };
  issues: WorkBoardIssue[];
  moveIssue: (issueId: number, fromColumn: ColumnId, toColumn: ColumnId, toIndex?: number) => void;
  onViewIssue?: (issueData: any) => void;
}

function DropColumn({ column, issues, moveIssue, onViewIssue }: DropColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop<DragIssueItem, void, { isOver: boolean }>({
    accept: DRAG_TYPE,
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;

      const currentIndex = issues.findIndex((issue) => issue.id === item.id);
      const shouldMoveToEnd = item.fromColumn !== column.id || currentIndex !== issues.length - 1;
      if (!shouldMoveToEnd) return;

      moveIssue(item.id, item.fromColumn, column.id);
      item.fromColumn = column.id;
      item.index = issues.length;
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  drop(columnRef);

  return (
    <div className="flex flex-col">
      <div
        className="px-5 py-4 rounded-t-3xl"
        style={{
          background: "rgba(11, 22, 40, 0.95)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
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
              background: `${column.color}22`,
              fontSize: "12px",
              fontWeight: 900,
              color: column.color,
            }}
          >
            {issues.length}
          </span>
        </div>
      </div>

      <div
        ref={columnRef}
        className="px-4 py-4 rounded-b-3xl flex-1"
        style={{
          background: isOver ? "rgba(32, 227, 255, 0.08)" : "rgba(11, 22, 40, 0.82)",
          border: `1px solid ${isOver ? "rgba(32, 227, 255, 0.5)" : "rgba(32, 227, 255, 0.16)"}`,
          borderTop: "none",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
          backdropFilter: "blur(16px)",
          transition: "background 0.15s, border 0.15s",
          minHeight: "80px",
        }}
      >
        <div className="grid gap-3">
          {issues.map((issue, index) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              columnId={column.id}
              index={index}
              moveIssue={moveIssue}
              onViewIssue={onViewIssue}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkBoardContent({ repositoryName, onViewIssue }: WorkBoardPanelProps) {
  const storageKey = getStorageKey(repositoryName);
  const [issues, setIssues] = useState<Record<ColumnId, WorkBoardIssue[]>>(() => loadIssues(storageKey));

  useEffect(() => {
    setIssues(loadIssues(storageKey));
  }, [storageKey]);

  const moveIssue = useCallback((issueId: number, fromColumn: ColumnId, toColumn: ColumnId, toIndex?: number) => {
    setIssues((prev) => {
      const source = [...prev[fromColumn]];
      const sourceIndex = source.findIndex((issue) => issue.id === issueId);
      if (sourceIndex === -1) return prev;

      const [moved] = source.splice(sourceIndex, 1);

      if (fromColumn === toColumn) {
        const nextIndex = toIndex ?? source.length;
        source.splice(Math.min(nextIndex, source.length), 0, moved);
        const next = { ...prev, [fromColumn]: source };
        saveIssues(storageKey, next);
        return next;
      }

      const target = [...prev[toColumn]];
      const nextIndex = toIndex ?? target.length;
      target.splice(Math.min(nextIndex, target.length), 0, moved);
      const next = { ...prev, [fromColumn]: source, [toColumn]: target };
      saveIssues(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return (
    <div className="h-full overflow-x-auto overflow-y-auto">
      <div className="px-8 py-10 pb-20" style={{ minWidth: '900px' }}>
        <div className="mb-8">
          <h1
            className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]"
            style={{
              fontSize: "clamp(36px, 4vw, 56px)",
              fontWeight: 950,
              color: "var(--white)",
              textShadow: "0 0 22px rgba(32, 227, 255, 0.18)",
            }}
          >
            작업 보드
          </h1>
          <p className="m-0 tracking-tight" style={{ fontSize: "15px", fontWeight: 700, color: "var(--muted)" }}>
            {repositoryName ? `${repositoryName} · ` : ""}칸반 보드로 작업을 관리합니다
          </p>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {COLUMNS.map((col) => {
            const Icon = STAT_ICONS[col.id];
            return (
              <div
                key={col.id}
                className="px-5 py-5 rounded-3xl"
                style={{
                  background: "rgba(11, 22, 40, 0.82)",
                  border: "1px solid rgba(32, 227, 255, 0.16)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <Icon size={20} style={{ color: col.color, marginBottom: "8px" }} />
                <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>
                  {col.title}
                </p>
                <p className="m-0 tracking-[-0.06em]" style={{ fontSize: "32px", fontWeight: 950, color: col.color }}>
                  {issues[col.id].length}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((column) => (
            <DropColumn
              key={column.id}
              column={column}
              issues={issues[column.id]}
              moveIssue={moveIssue}
              onViewIssue={onViewIssue}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkBoardPanel({ repositoryName, onViewIssue }: WorkBoardPanelProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <WorkBoardContent repositoryName={repositoryName} onViewIssue={onViewIssue} />
    </DndProvider>
  );
}
