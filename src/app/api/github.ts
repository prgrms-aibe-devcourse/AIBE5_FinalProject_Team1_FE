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

export type GithubWebhookRegisterResponse = {
  repositoryId: number;
  webhookId: string;
  webhookUrl: string;
  active: boolean;
};

export type RepositoryActivityResponse = {
  type: string | null;
  id: number | null;
  number: number | null;
  title: string | null;
  actor: string | null;
  state: string | null;
  occurredAt: string | null;
};

export type RepositoryPullRequestSummaryResponse = {
  prId: number;
  prNumber: number | null;
  title: string | null;
  author: string | null;
  state: string | null;
  changedFilesCount: number | null;
  additions: number | null;
  deletions: number | null;
  updatedAt: string | null;
};

export type GithubRepositoryOverviewResponse = {
  repositoryId: number;
  workspaceId: number;
  channelId: number | null;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string | null;
  lastSyncedAt: string | null;
  todayCommitCount: number;
  openPrCount: number;
  openIssueCount: number;
  highRiskCount: number;
  activeMemberCount: number;
  codeQualityScore: number | null;
  securityScore: number | null;
  performanceScore: number | null;
  recentActivities: RepositoryActivityResponse[];
  openPullRequests: RepositoryPullRequestSummaryResponse[];
};

export function fetchWorkspaceRepositories(workspaceId: number): Promise<GithubConnectResponse[]> {
  return fetchWithAuth<GithubConnectResponse[]>(`/api/v1/workspaces/${workspaceId}/github`);
}

export function getWorkspaceRepositoryOverview(
  workspaceId: number,
  repositoryId: number
): Promise<GithubRepositoryOverviewResponse> {
  return fetchWithAuth<GithubRepositoryOverviewResponse>(
    `/api/v1/workspaces/${workspaceId}/github/repositories/${repositoryId}/overview`
  );
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

export function registerWorkspaceRepositoryWebhook(
  workspaceId: number,
  repositoryId: number
): Promise<GithubWebhookRegisterResponse> {
  return fetchWithAuth<GithubWebhookRegisterResponse>(
    `/api/v1/workspaces/${workspaceId}/github/repositories/${repositoryId}/webhook`,
    { method: "POST" }
  );
}

export function syncRepositoryPullRequests(repositoryDbId: number): Promise<void> {
  return fetchWithAuth<void>(
    `/api/v1/github/repositories/${repositoryDbId}/sync-pull-requests`,
    { method: "POST" }
  );
}

export function syncRepositoryPrStatuses(repositoryDbId: number): Promise<void> {
  return fetchWithAuth<void>(
    `/api/v1/github/repositories/${repositoryDbId}/sync-pull-request-statuses`,
    { method: "POST" }
  );
}

// 레포지토리 PR 목록 (작업 보드용). 백엔드 buildPrMessageMap 형태와 동일.
export type RepositoryPullRequest = {
  id: number;
  prNumber: number;
  prTitle: string;
  prStatus: "open" | "approved" | "merged" | "closed" | (string & {});
  prAuthor: string | null;
  prUrl: string;
  prBody?: string;
  prCommits?: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  approved?: number;
  branch?: string;
  githubCreatedAt?: string | null;
  githubMergedAt?: string | null;
};

export function getRepositoryPullRequests(repositoryDbId: number): Promise<RepositoryPullRequest[]> {
  return fetchWithAuth<RepositoryPullRequest[]>(
    `/api/v1/github/repositories/${repositoryDbId}/pull-requests`
  );
}

export function syncRepositoryIssues(repositoryDbId: number): Promise<void> {
  return fetchWithAuth<void>(
    `/api/v1/github/repositories/${repositoryDbId}/sync-issues`,
    { method: "POST" }
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
