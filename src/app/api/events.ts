import { fetchWithAuth } from "./fetchWithAuth";

export type EventType = "PR_CREATED" | "PR_REVIEW" | "ISSUE_CREATED" | "MENTION" | "REPLY";

export type WorkspaceEventDto = {
  id: number;
  workspaceId: number;
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
  emoji?: string | null;
  reactionEmoji?: string | null;
  metadata?: {
    emoji?: string | null;
    reactionEmoji?: string | null;
  } | null;
  createdAt: string;
};

export function fetchMyEvents(): Promise<WorkspaceEventDto[]> {
  return fetchWithAuth<WorkspaceEventDto[] | { success: boolean; data: WorkspaceEventDto[] }>("/api/v1/events")
    .then((res) => {
      if (Array.isArray(res)) return res;
      return res.data ?? [];
    });
}
