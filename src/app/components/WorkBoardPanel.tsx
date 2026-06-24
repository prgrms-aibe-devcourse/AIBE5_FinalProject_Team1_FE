import { IssueKanbanBoard, type BoardCard } from "./board/IssueKanbanBoard";
import { useIssueBoard } from "../hooks/useIssueBoard";
import type { Issue } from "../api/issue";

interface WorkBoardPanelProps {
  repositoryName?: string;
  repositoryDbId?: number;
  onViewIssue?: (issueData: any) => void;
}

// 보드 카드 → ChatPage 이슈 패널이 기대하는 데이터 형태로 변환 (실제 GithubIssue 기반)
function boardCardToIssueData(card: BoardCard) {
  const issue = card.raw as Issue;
  return {
    issueNumber: issue.issueNumber,
    issueTitle: issue.title,
    issueStatus: card.status,
    issueAuthor: issue.author ?? card.assignees[0] ?? "미할당",
    issueLabels: issue.labels ?? [],
    issueAssignees: card.assignees,
    issuePriority: issue.priority ?? "medium",
    issueType: issue.issueType ?? "Task",
    issueBody: issue.description ?? "",
    issueUrl: issue.url,
    githubCreatedAt: issue.githubCreatedAt,
    githubClosedAt: issue.closedAt,
    state: issue.state,
  };
}

export function WorkBoardPanel({ repositoryName, repositoryDbId, onViewIssue }: WorkBoardPanelProps) {
  const { board, loading, moveIssue } = useIssueBoard({ repositoryId: repositoryDbId ?? null });

  return (
    <div className="h-full overflow-x-auto overflow-y-auto">
      <div className="px-8 py-10 pb-20" style={{ minWidth: "900px" }}>
        <IssueKanbanBoard
          title="작업 보드"
          subtitle={`${repositoryName ? `${repositoryName} · ` : ""}칸반 보드로 작업을 관리합니다 · 카드를 끌어 컬럼으로 옮기세요`}
          board={board}
          loading={loading}
          onMove={moveIssue}
          onView={onViewIssue ? (card) => { if (card.kind === "issue") onViewIssue(boardCardToIssueData(card)); } : undefined}
          emptyLabel="이슈 / PR 없음"
        />
      </div>
    </div>
  );
}
