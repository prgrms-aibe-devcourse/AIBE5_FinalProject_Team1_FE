import { apiClient, type ApiRequestOptions } from "./client";

export type DocumentCategory = 'pr-summary' | 'manual' | 'meeting' | 'release';
export type DocumentGeneratedBy = 'AI' | 'MANUAL';
export type DocumentVisibility = 'workspace' | 'private' | 'public';

export type DocumentResponse = {
  id: number;
  workspaceId: number;
  title: string;
  content: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  generatedBy: DocumentGeneratedBy;
  createdByMemberId: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCreateRequest = {
  title: string;
  content: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  generatedBy: DocumentGeneratedBy;
  relatedPrId: null;
};

export type DocumentUpdateRequest = {
  title: string;
  content?: string;
};

export function getDocuments(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<DocumentResponse[]>(`/api/workspaces/${workspaceId}/documents`, options);
}

export function createDocument(workspaceId: number, request: DocumentCreateRequest, options?: ApiRequestOptions) {
  return apiClient.post<DocumentResponse>(`/api/workspaces/${workspaceId}/documents`, request, options);
}

export function updateDocument(workspaceId: number, docId: number, request: DocumentUpdateRequest, options?: ApiRequestOptions) {
  return apiClient.patch<DocumentResponse>(`/api/workspaces/${workspaceId}/documents/${docId}`, request, options);
}

export function deleteDocument(workspaceId: number, docId: number, options?: ApiRequestOptions) {
  return apiClient.delete<void>(`/api/workspaces/${workspaceId}/documents/${docId}`, options);
}

export function aiGenerateDocument(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.post<DocumentResponse>(`/api/workspaces/${workspaceId}/documents/ai-generate`, undefined, options);
}
