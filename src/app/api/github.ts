import { fetchWithAuth } from "./fetchWithAuth";

export type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  language: string | null;
  htmlUrl: string;
  defaultBranch: string;
  relation: "owner" | "collaborator";
};

export type GithubCollaborator = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  userId: number | null;
  email: string | null;
  displayName: string | null;
};

export type GithubConnectResponse = {
  id: number;          // github_repository DB id
  channelId: number;   // 생성된 repository channel id
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string | null;
  isPrivate: boolean;
};

export function fetchWorkspaceRepositories(workspaceId: number): Promise<GithubConnectResponse[]> {
  return fetchWithAuth<GithubConnectResponse[]>(`/api/v1/workspaces/${workspaceId}/github`);
}

export function connectWorkspaceRepository(
  workspaceId: number,
  owner: string,
  repo: string
): Promise<GithubConnectResponse> {
  return fetchWithAuth<GithubConnectResponse>(
    `/api/v1/workspaces/${workspaceId}/github`,
    { method: "POST", body: JSON.stringify({ owner, repo }), headers: { "Content-Type": "application/json" } }
  );
}

export function syncRepositoryIssueStatuses(repositoryDbId: string): Promise<void> {
  return fetchWithAuth<void>(
    `/api/v1/github/repositories/${repositoryDbId}/sync-issue-statuses`,
    { method: "POST" }
  );
}

export function fetchMyGithubRepos(): Promise<GithubRepo[]> {
  return fetchWithAuth<GithubRepo[]>("/api/v1/github/repos");
}

export function fetchRepoCollaborators(
  owner: string,
  repo: string
): Promise<GithubCollaborator[]> {
  return fetchWithAuth<GithubCollaborator[]>(
    `/api/v1/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators`
  );
}
