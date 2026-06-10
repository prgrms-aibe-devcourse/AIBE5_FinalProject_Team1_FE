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
