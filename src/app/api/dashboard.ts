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
  return fetchWithAuth<DashboardSummary>("/api/dashboard/summary");
}

export function fetchDashboardWorkspaces(): Promise<DashboardWorkspace[]> {
  return fetchWithAuth<DashboardWorkspace[]>("/api/dashboard/workspaces");
}
