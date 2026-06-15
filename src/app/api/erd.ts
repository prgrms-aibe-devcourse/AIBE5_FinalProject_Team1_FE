import { apiClient, type ApiRequestOptions } from "./client";

export type ErdResponse = {
  workspaceId: number;
  mermaidCode: string;
  updatedAt: string;
};

export type ErdTable = {
  id: number;
  workspaceId: number;
  tableName: string;
  schemaDefinition: string;
  description: string | null;
};

export function getErd(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<ErdResponse>(`/api/workspaces/${workspaceId}/erd`, options);
}

export function getErdTables(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<ErdTable[]>(`/api/workspaces/${workspaceId}/erd/tables`, options);
}

export function generateErd(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.post<ErdResponse>(`/api/workspaces/${workspaceId}/erd/generate`, undefined, options);
}
