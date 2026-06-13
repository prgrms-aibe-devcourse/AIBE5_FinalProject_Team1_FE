import { apiClient, type ApiRequestOptions } from "./client";
import { fetchWithAuth } from "./fetchWithAuth";

export type WorkspaceDto = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  myRole: string; // "owner" | "admin" | "editor" | "viewer"
  memberCount: number;
  createdAt: string;
};

export function fetchMyWorkspaces(): Promise<WorkspaceDto[]> {
  return fetchWithAuth<WorkspaceDto[]>("/api/v1/workspaces");
}

export type WorkspaceCreatePayload = {
  name: string;
  slug: string;
  description?: string;
};

export function deleteWorkspace(workspaceId: number): Promise<void> {
  return fetchWithAuth<void>(`/api/v1/workspaces/${workspaceId}`, { method: "DELETE" });
}

export function createWorkspace(payload: WorkspaceCreatePayload): Promise<WorkspaceDto> {
  return fetchWithAuth<WorkspaceDto>("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type WorkspaceMember = {
  memberId: number;
  userId: number;
  email: string;
  username: string;
  role: string;
  joinedAt: string;
  presence?: string;
};

export function getWorkspaceMembers(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceId}/members`, options);
}

export function updatePresence(workspaceId: number, presence: string): Promise<void> {
  return fetchWithAuth<void>(`/api/v1/workspaces/${workspaceId}/me/presence`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presence }),
  });
}
