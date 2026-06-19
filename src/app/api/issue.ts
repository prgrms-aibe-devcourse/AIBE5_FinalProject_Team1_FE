import { apiClient } from "./client";

export type IssueLabel = {
  name: string;
  color: string;
};

export type Issue = {
  id: number;
  githubIssueId: string;
  repositoryId: number;
  repositoryFullName: string;
  channelId: number;
  issueNumber: number;
  title: string;
  description: string | null;
  state: "open" | "closed";
  localStatus: "todo" | "in_progress" | "review" | "done" | "blocked";
  url: string;
  author: string | null;
  priority: "high" | "medium" | "low" | null;
  issueType: string | null;
  labels: IssueLabel[];
  assignees: string[];
  closedAt: string | null;
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
  createdAt: string;
};

export type IssueLocalStatusUpdateRequest = {
  localStatus: "todo" | "in_progress" | "review" | "done" | "blocked";
};

export async function getWorkspaceIssues(workspaceId: number): Promise<Issue[]> {
  return apiClient.get<Issue[]>(`/api/v1/workspaces/${workspaceId}/issues`);
}

export async function getIssue(workspaceId: number, issueId: number): Promise<Issue> {
  return apiClient.get<Issue>(`/api/v1/workspaces/${workspaceId}/issues/${issueId}`);
}

export async function updateIssueLocalStatus(
  workspaceId: number,
  issueId: number,
  request: IssueLocalStatusUpdateRequest
): Promise<Issue> {
  return apiClient.patch<Issue>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/local-status`,
    request
  );
}
