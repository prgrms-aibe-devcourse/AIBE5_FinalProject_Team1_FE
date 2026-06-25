import { useEffect, useState } from "react";

import { fetchRepoCollaborators, fetchWorkspaceRepositories, type GithubCollaborator } from "../api/github";
import type { InviteDraft } from "../components/TeamInviteModal";

/**
 * 워크스페이스에 연결된 GitHub 레포지토리들의 협업자 중,
 * 이 사이트에 가입돼 있고(userId 보유) 이메일이 있는 사용자를 초대 추천 목록으로 반환한다.
 * 팀 생성 플로우와 동일한 소스를 재사용해, "나중에 팀원 추가" 모달의 추천도 실제 인물로 통일한다.
 *
 * enabled가 true가 될 때(보통 모달이 열릴 때)만 조회한다.
 */
export function useWorkspaceCollaboratorSuggestions(
  workspaceApiId: number | null | undefined,
  enabled: boolean
): InviteDraft[] {
  const [suggestions, setSuggestions] = useState<InviteDraft[]>([]);

  useEffect(() => {
    // 추천은 워크스페이스 단위 데이터이므로, 비활성/워크스페이스 변경 시 이전 추천을 먼저 비운다.
    // (그렇지 않으면 다른 워크스페이스에서 조회가 끝나기 전까지 직전 워크스페이스의 추천이 노출/선택될 수 있음)
    setSuggestions([]);
    if (!enabled || !workspaceApiId) return;
    let cancelled = false;

    void fetchWorkspaceRepositories(workspaceApiId)
      .then(async (repos) => {
        const lists = await Promise.all(
          repos.map((repo) =>
            fetchRepoCollaborators(repo.owner, repo.name).catch(() => [] as GithubCollaborator[])
          )
        );
        if (cancelled) return;

        // 가입자(userId)+이메일만, 이메일 기준 중복 제거
        const byEmail = new Map<string, InviteDraft>();
        lists.flat().forEach((collab) => {
          if (collab.userId == null || !collab.email) return;
          const key = collab.email.trim().toLowerCase();
          if (!key || byEmail.has(key)) return;
          byEmail.set(key, {
            id: collab.userId,
            name: collab.displayName || collab.login,
            email: collab.email,
            role: "Viewer",
            avatarUrl: collab.avatarUrl || undefined,
            login: collab.login
          });
        });

        setSuggestions(Array.from(byEmail.values()));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceApiId, enabled]);

  return suggestions;
}
