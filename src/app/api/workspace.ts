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
  username: string;
  email: string;
  role: string;
  joinedAt: string;
  presence: string;
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

export function getWorkspace(workspaceId: number): Promise<WorkspaceDto> {
  return apiClient.get<WorkspaceDto>(`/api/v1/workspaces/${workspaceId}`);
}

export type WorkspaceUpdatePayload = {
  name?: string;
  description?: string;
};

export function updateWorkspace(workspaceId: number, payload: WorkspaceUpdatePayload): Promise<WorkspaceDto> {
  return apiClient.patch<WorkspaceDto>(`/api/v1/workspaces/${workspaceId}`, payload);
}

export function changeMemberRole(workspaceId: number, memberId: number, role: string): Promise<void> {
  return apiClient.patch<void>(`/api/v1/workspaces/${workspaceId}/members/${memberId}/role`, { role });
}

export function removeMember(workspaceId: number, memberId: number): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/members/${memberId}`);
}

export function leaveWorkspace(workspaceId: number): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/leave`);
}

export function transferOwnership(workspaceId: number, memberId: number): Promise<void> {
  return apiClient.post<void>(`/api/v1/workspaces/${workspaceId}/members/${memberId}/transfer-ownership`);
}

export type InviteCreatePayload = {
  email: string;
  role: string;
  expiresInHours: number;
};

export type InviteResponseDto = {
  inviteUrl: string;
  expiresAt: string;
};

export function createInvite(workspaceId: number, payload: InviteCreatePayload): Promise<InviteResponseDto> {
  return apiClient.post<InviteResponseDto>(`/api/v1/workspaces/${workspaceId}/invites`, payload);
}

export type InvitationDto = {
  invitationId: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export function listInvitations(workspaceId: number): Promise<InvitationDto[]> {
  return apiClient.get<InvitationDto[]>(`/api/v1/workspaces/${workspaceId}/invites`);
}

export function revokeInvitation(workspaceId: number, invitationId: number): Promise<void> {
  return apiClient.delete<void>(`/api/v1/workspaces/${workspaceId}/invites/${invitationId}`);
}

export function acceptInvite(token: string): Promise<void> {
  return apiClient.post<void>(`/api/v1/invites/${encodeURIComponent(token)}/accept`);
}

export function rejectInvite(token: string): Promise<void> {
  return apiClient.post<void>(`/api/v1/invites/${encodeURIComponent(token)}/reject`);
}

export type ReceivedInviteDto = {
  invitationId: number;
  token: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  expiresAt: string;
  memberCount: number;
};

export function listReceivedInvites(): Promise<ReceivedInviteDto[]> {
  return apiClient.get<ReceivedInviteDto[]>("/api/v1/invites/received");
}