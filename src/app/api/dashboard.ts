import { fetchWithAuth } from "./fetchWithAuth";

export type DashboardSummary = {
  openIssueCount: number;
  openPrCount: number;
  reviewRequestCount: number;
  receivedReviewCount: number;
};

export type DashboardWorkspace = {
  workspaceId: number;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  openIssueCount: number;
  openPrCount: number;
  reviewRequestCount: number;
  receivedReviewCount: number;
};

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return fetchWithAuth<{ success: boolean; data: DashboardSummary }>("/api/dashboard/summary")
    .then((res) => res.data);
}

export function fetchDashboardWorkspaces(): Promise<DashboardWorkspace[]> {
  return fetchWithAuth<{ success: boolean; data: DashboardWorkspace[] }>("/api/dashboard/workspaces")
    .then((res) => res.data ?? []);
}
