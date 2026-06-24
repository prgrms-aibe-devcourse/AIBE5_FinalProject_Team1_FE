import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaceIssues, updateIssueLocalStatus, type Issue } from "../api/issue";
import { getRepositoryPullRequests } from "../api/github";
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
    // 이슈는 워크스페이스 단위로, PR은 레포 단위 엔드포인트로 가져온다(워크스페이스 전역 PR API 없음).
    const issuesPromise = getWorkspaceIssues(workspaceId).catch(() => []);
    const prsPromise = repositoryId != null
      ? getRepositoryPullRequests(repositoryId).catch(() => [])
      : Promise.resolve([]);

    Promise.all([issuesPromise, prsPromise])
      .then(([issues, prs]) => {
        if (cancelled) return;
        const scopedIssues = repositoryId != null
          ? issues.filter((issue) => issue.repositoryId === repositoryId)
          : issues;
        setCards([...scopedIssues.map(issueToBoardCard), ...prs.map(prToBoardCard)]);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
