import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaceIssues, updateIssueLocalStatus, type Issue } from "../api/issue";
import { getRepositoryPullRequests, syncRepositoryIssues, syncRepositoryPullRequests } from "../api/github";
import { useWorkspace } from "../contexts/WorkspaceContext";
import {
  groupCardsByStatus,
  issueToBoardCard,
  prToBoardCard,
  type BoardCard,
  type BoardStatus,
} from "../components/board/IssueKanbanBoard";

interface UseIssueBoardOptions {
  // 지정 시 해당 GithubRepository DB id의 이슈만 표시. 미지정이면 워크스페이스 전체.
  repositoryId?: number | null;
}

interface UseIssueBoardResult {
  board: Record<BoardStatus, BoardCard[]>;
  loading: boolean;
  moveIssue: (card: BoardCard, toStatus: BoardStatus) => void;
}

// 워크스페이스 이슈를 칸반 보드로 로드하고, 컬럼 간 이동을 localStatus PATCH로 영속화한다.
export function useIssueBoard(options?: UseIssueBoardOptions): UseIssueBoardResult {
  const { workspaceId } = useWorkspace();
  const repositoryId = options?.repositoryId ?? null;
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setCards([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    // DB에서 이슈(워크스페이스 단위)+PR(레포 단위)을 읽어 카드로 합친다.
    const fetchAll = () => Promise.all([
      getWorkspaceIssues(workspaceId).catch(() => []),
      repositoryId != null ? getRepositoryPullRequests(repositoryId).catch(() => []) : Promise.resolve([]),
    ]).then(([issues, prs]) => {
      if (cancelled) return;
      const scopedIssues = repositoryId != null
        ? issues.filter((issue) => issue.repositoryId === repositoryId)
        : issues;
      setCards([...scopedIssues.map(issueToBoardCard), ...prs.map(prToBoardCard)]);
    });

    // 1) 캐시(DB) 데이터를 즉시 표시
    fetchAll().catch(() => { if (!cancelled) setCards([]); }).finally(() => { if (!cancelled) setLoading(false); });

    // 2) 레포 단위면 백그라운드로 GitHub 동기화(우선순위/타입/최신 PR 반영) 후 재로드
    if (repositoryId != null) {
      Promise.allSettled([
        syncRepositoryIssues(repositoryId),
        syncRepositoryPullRequests(repositoryId),
      ]).then(() => { if (!cancelled) fetchAll().catch(() => {}); });
    }
    return () => { cancelled = true; };
  }, [workspaceId, repositoryId]);

  const board = useMemo(() => groupCardsByStatus(cards), [cards]);

  const moveIssue = useCallback((card: BoardCard, toStatus: BoardStatus) => {
    // PR은 GitHub 상태로 컬럼이 결정되므로 이동/영속화 대상이 아니다.
    if (!workspaceId || card.kind !== "issue" || card.status === toStatus) return;
    const fromStatus = card.status;
    const match = (c: BoardCard) => c.kind === "issue" && c.id === card.id;

    // 낙관적 업데이트
    setCards((prev) => prev.map((c) =>
      match(c) ? { ...c, status: toStatus, raw: { ...(c.raw as Issue), localStatus: toStatus } } : c
    ));

    updateIssueLocalStatus(workspaceId, card.id, { localStatus: toStatus }).catch(() => {
      // 실패 시 롤백
      setCards((prev) => prev.map((c) =>
        match(c) ? { ...c, status: fromStatus, raw: { ...(c.raw as Issue), localStatus: fromStatus } } : c
      ));
    });
  }, [workspaceId]);

  return { board, loading, moveIssue };
}
