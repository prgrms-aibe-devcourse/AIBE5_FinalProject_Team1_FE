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

export type ChannelMessageUpdateRequest = {
  content: string;
};

export type ThreadReply = {
  id: number;
  threadId: number;
  senderMemberId: number;
  senderName: string;
  content: string;
  createdAt: ISODateTime;
};

export type ThreadReplyCreateRequest = {
  content: string;
};

export type ThreadReplyWebSocketCreateRequest = {
  userId: number;
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

export type ReactionSummary = {
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
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

export const CHAT_EVENT_TYPES = [
  "MESSAGE_CREATED",
  "MESSAGE_UPDATED",
  "MESSAGE_DELETED",
  "THREAD_REPLY_CREATED",
  "REACTION_UPDATED",
  "TYPING",
  "NOTIFICATION_CREATED"
] as const;

export type ChatEventType =
  typeof CHAT_EVENT_TYPES[number];

export type ChatEvent<T> = {
  type: ChatEventType;
  payload: T;
};

export type ChannelEventPayload =
  | ChannelMessage
  | ReactionToggleResponse
  | TypingEvent;

export type ThreadEventPayload = ThreadReply;

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
  },
  sendThreadReply(threadId: number) {
    return `/app/threads/${threadId}/replies`;
  },
  subscribeThreadEvents(threadId: number) {
    return `/topic/threads/${threadId}/events`;
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

export function updateChannelMessage(
  channelId: number,
  messageId: number,
  request: ChannelMessageUpdateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.patch<ChannelMessage>(`/api/channels/${channelId}/messages/${messageId}`, request, options);
}

export function deleteChannelMessage(channelId: number, messageId: number, options?: ApiRequestOptions) {
  return apiClient.delete<ChannelMessage>(`/api/channels/${channelId}/messages/${messageId}`, options);
}

export function getThreadReplies(threadId: number, options?: ApiRequestOptions) {
  return apiClient.get<ThreadReply[]>(`/api/threads/${threadId}/replies`, options);
}

export function createThreadReply(threadId: number, request: ThreadReplyCreateRequest, options?: ApiRequestOptions) {
  return apiClient.post<ThreadReply>(`/api/threads/${threadId}/replies`, request, options);
}

export function getChannelReactions(channelId: number, options?: ApiRequestOptions) {
  return apiClient.get<ReactionSummary[]>(`/api/channels/${channelId}/reactions`, options);
}

export function toggleChannelReaction(channelId: number, request: ReactionToggleRequest, options?: ApiRequestOptions) {
  return apiClient.post<ReactionToggleResponse>(`/api/channels/${channelId}/reactions/toggle`, request, options);
}

