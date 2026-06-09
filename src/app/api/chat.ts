import { apiClient, type ApiRequestOptions } from "./client";
import type { ChannelType, ISODateTime, ReactionTargetType } from "./types";

export type Channel = {
  id: number;
  workspaceId: number;
  githubRepositoryId: number | null;
  name: string;
  channelType: ChannelType;
  isDeletable: boolean;
  description: string | null;
};

export type ChannelMessage = {
  id: number;
  channelId: number;
  senderMemberId: number;
  senderName: string;
  content: string;
  createdAt: ISODateTime;
};

export type ChannelMessageCreateRequest = {
  senderMemberId: number;
  content: string;
};

export type ReactionToggleRequest = {
  workspaceMemberId: number;
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
};

export type ReactionToggleResponse = {
  channelId: number;
  workspaceMemberId: number;
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
  reacted: boolean;
  count: number;
};

export type TypingEvent = {
  channelId: number;
  workspaceMemberId: number;
  senderName: string;
  typing: boolean;
};

export type TypingEventRequest = {
  workspaceMemberId: number;
  senderName: string;
  typing: boolean;
};

export type ChatEventType =
  | "MESSAGE_CREATED"
  | "MESSAGE_UPDATED"
  | "MESSAGE_DELETED"
  | "THREAD_REPLY_CREATED"
  | "REACTION_UPDATED"
  | "TYPING"
  | "NOTIFICATION_CREATED";

export type ChatEvent<T> = {
  type: ChatEventType;
  payload: T;
};

export type ChannelEventPayload =
  | ChannelMessage
  | ReactionToggleResponse
  | TypingEvent;

export type ChannelMessagesQuery = {
  cursor?: number | null;
  limit?: number;
};

export const chatWebSocketDestinations = {
  sendChannelMessage(channelId: number) {
    return `/app/channels/${channelId}/messages`;
  },
  subscribeChannelEvents(channelId: number) {
    return `/topic/channels/${channelId}/events`;
  },
  sendChannelTyping(channelId: number) {
    return `/app/channels/${channelId}/typing`;
  },
  subscribeChannelTyping(channelId: number) {
    return `/topic/channels/${channelId}/typing`;
  }
};

export function getWorkspaceChannels(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<Channel[]>(`/api/workspaces/${workspaceId}/channels`, options);
}

export function getChannelMessages(channelId: number, query: ChannelMessagesQuery = {}, options?: ApiRequestOptions) {
  return apiClient.get<ChannelMessage[]>(`/api/channels/${channelId}/messages`, {
    ...options,
    query: {
      cursor: query.cursor,
      limit: query.limit ?? 30,
      ...options?.query
    }
  });
}

export function toggleChannelReaction(channelId: number, request: ReactionToggleRequest, options?: ApiRequestOptions) {
  return apiClient.post<ReactionToggleResponse>(`/api/channels/${channelId}/reactions/toggle`, request, options);
}

