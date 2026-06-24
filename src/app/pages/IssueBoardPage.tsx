import { IssueKanbanBoard } from "../components/board/IssueKanbanBoard";
import { useIssueBoard } from "../hooks/useIssueBoard";

export function IssueBoardPage() {
  const { board, loading, moveIssue } = useIssueBoard();

  return (
    <div className="w-[min(1600px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <IssueKanbanBoard
        title="이슈 보드"
        subtitle="칸반 보드로 이슈를 관리합니다 · 카드를 끌어 컬럼으로 옮기세요"
        board={board}
        loading={loading}
        onMove={moveIssue}
        emptyLabel="이슈 없음"
      />
    </div>
  );
}
