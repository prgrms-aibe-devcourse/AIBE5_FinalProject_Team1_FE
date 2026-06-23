import { apiClient, type ApiRequestOptions } from "./client";

export type AiSummaryStatus = "pending" | "processing" | "completed" | "failed";
export type AiSummaryRisk = "High" | "Medium" | "Low";

export type AiSummaryFileFeedback = {
  name: string;
  path: string;
  risk: AiSummaryRisk;
  vulnerability: string;
  fix: string;
  currentCode: string[];
  recommendedCode: string[];
  findings: string[];
};

export type AiSummaryResponse = {
  id: number;
  prId: number;
  status: AiSummaryStatus;
  riskLevel: AiSummaryRisk | null;
  summaryText: string | null;
  cautionItems: string[] | null;
  positiveItems: string[] | null;
  fileFeedbacks: AiSummaryFileFeedback[] | null;
  createdAt: string;
  updatedAt: string;
};

export function getAiSummary(workspaceId: number, prId: number, options?: ApiRequestOptions) {
  return apiClient.get<AiSummaryResponse>(`/api/workspaces/${workspaceId}/prs/${prId}/ai-summary`, options);
}
