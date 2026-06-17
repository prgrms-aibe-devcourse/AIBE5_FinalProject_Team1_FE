import { apiClient, type ApiRequestOptions } from "./client";

export type ApiSpecMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiSpecStatus = "design" | "in_progress" | "completed";
export type ApiSpecSourceType = "manual" | "swagger" | "AI";

export type ApiSpecResponse = {
  id: number;
  workspaceId: number;
  createdByMemberId: number;
  title: string;
  method: ApiSpecMethod;
  endpoint: string;
  groupName: string | null;
  entityName: string | null;
  summary: string | null;
  description: string | null;
  status: ApiSpecStatus;
  assigneeId: number | null;
  pathParams: string | null;
  headers: string | null;
  queryParams: string | null;
  requestBody: string | null;
  responseBody: string | null;
  responseStatus: number | null;
  version: string | null;
  sourceType: ApiSpecSourceType;
  relatedIssueId: number | null;
  relatedPrId: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSpecCreateRequest = {
  createdByMemberId: number;
  title: string;
  method: ApiSpecMethod;
  endpoint: string;
  groupName?: string;
  entityName?: string;
  summary?: string;
  description?: string;
  status?: ApiSpecStatus;
  assigneeId?: number;
  pathParams?: string;
  headers?: string;
  queryParams?: string;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
  version?: string;
  relatedIssueId?: number;
  relatedPrId?: number;
  note?: string;
};

export type ApiSpecUpdateRequest = {
  title: string;
  method: ApiSpecMethod;
  endpoint: string;
  groupName?: string;
  entityName?: string;
  summary?: string;
  description?: string;
  status?: ApiSpecStatus;
  assigneeId?: number;
  pathParams?: string;
  headers?: string;
  queryParams?: string;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
  version?: string;
  relatedIssueId?: number;
  relatedPrId?: number;
  note?: string;
};

export type ApiSpecListQuery = {
  groupName?: string;
  status?: ApiSpecStatus;
};

export function getApiSpecs(workspaceId: number, query?: ApiSpecListQuery, options?: ApiRequestOptions) {
  return apiClient.get<ApiSpecResponse[]>(`/api/workspaces/${workspaceId}/api-specs`, {
    ...options,
    query,
  });
}

export function getApiSpec(workspaceId: number, apiSpecId: number, options?: ApiRequestOptions) {
  return apiClient.get<ApiSpecResponse>(`/api/workspaces/${workspaceId}/api-specs/${apiSpecId}`, options);
}

export function createApiSpec(workspaceId: number, request: ApiSpecCreateRequest, options?: ApiRequestOptions) {
  return apiClient.post<ApiSpecResponse>(`/api/workspaces/${workspaceId}/api-specs`, request, options);
}

export function updateApiSpec(workspaceId: number, apiSpecId: number, request: ApiSpecUpdateRequest, options?: ApiRequestOptions) {
  return apiClient.patch<ApiSpecResponse>(`/api/workspaces/${workspaceId}/api-specs/${apiSpecId}`, request, options);
}

export function deleteApiSpec(workspaceId: number, apiSpecId: number, options?: ApiRequestOptions) {
  return apiClient.delete<void>(`/api/workspaces/${workspaceId}/api-specs/${apiSpecId}`, options);
}

export type SwaggerSyncResponse = {
  swaggerUrl: string;
  syncedCount: number;
  completedChecklistCount: number;
};

export function getSwaggerUrl(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<string>(`/api/workspaces/${workspaceId}/api-specs/swagger-url`, options);
}

export function registerSwaggerUrl(workspaceId: number, swaggerUrl: string, options?: ApiRequestOptions) {
  return apiClient.post<SwaggerSyncResponse>(`/api/workspaces/${workspaceId}/api-specs/swagger-url`, { swaggerUrl }, options);
}

export function resyncSwagger(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.post<SwaggerSyncResponse>(`/api/workspaces/${workspaceId}/api-specs/swagger-url/resync`, undefined, options);
}

export function generateAiChecklist(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.post<ApiSpecResponse[]>(`/api/workspaces/${workspaceId}/api-specs/ai-checklist`, undefined, options);
}
