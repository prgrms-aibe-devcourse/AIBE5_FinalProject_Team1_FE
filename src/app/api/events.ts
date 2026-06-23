import { fetchWithAuth } from "./fetchWithAuth";

export type EventType = "PR_CREATED" | "PR_REVIEW" | "ISSUE_CREATED" | "MENTION" | "REPLY";

export type WorkspaceEventDto = {
  eventId: number;
  id: number;
  workspaceId: number;
  workspaceName: string | null;
  type: EventType;
  actorName: string;
  prId: number | null;
  prNumber: number | null;
  issueId: number | null;
  issueNumber: number | null;
  channelId: number | null;
  threadId: number | null;
  repositoryId: number | null;
  repositoryName: string | null;
  content: string;
  isRead: boolean;
  emoji?: string | null;
  reactionEmoji?: string | null;
  emojiKey?: string | null;
  reactionKey?: string | null;
  metadata?: {
    emoji?: string | null;
    reactionEmoji?: string | null;
    emojiKey?: string | null;
    reactionKey?: string | null;
    [key: string]: unknown;
  } | null;
  createdAt: string;
};

export function fetchMyEvents(): Promise<WorkspaceEventDto[]> {
  return fetchWithAuth<WorkspaceEventDto[] | { success: boolean; data: WorkspaceEventDto[] }>("/api/dashboard/events")
    .then((res) => {
      if (Array.isArray(res)) return res;
      return res.data ?? [];
    });
}

export function markEventAsRead(eventId: number): Promise<void> {
  return fetchWithAuth<void>(`/api/dashboard/events/${eventId}/read`, { method: "PATCH" });
}
