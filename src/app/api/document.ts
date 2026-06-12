import { apiClient, type ApiRequestOptions } from "./client";

export type DocumentCategory = 'manual' | 'faq' | 'release';
export type DocumentGeneratedBy = 'AI' | 'Manual';
export type DocumentVisibility = 'workspace' | 'private' | 'public';

export type DocumentResponse = {
  id: number;
  workspaceId: number;
  title: string;
  content: string | null;
  category: DocumentCategory | null;
  visibility: DocumentVisibility;
  generatedBy: DocumentGeneratedBy;
  createdByMemberId: number;
  relatedPrId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCreateRequest = {
  createdByMemberId: number;
  title: string;
  content?: string;
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  relatedPrId?: number | null;
};

export type DocumentUpdateRequest = {
  title: string;
  content?: string;
};

export function getDocuments(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<DocumentResponse[]>(`/api/workspaces/${workspaceId}/documents`, options);
}

export function getDocumentsByCategory(workspaceId: number, category: DocumentCategory, options?: ApiRequestOptions) {
  return apiClient.get<DocumentResponse[]>(`/api/workspaces/${workspaceId}/documents`, {
    ...options,
    query: { category },
  });
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
