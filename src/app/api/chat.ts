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
  lastMessage: string | null;
  lastMessageAt: ISODateTime | null;
  messageCount: number;
  unreadCount: number;
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

export type ChannelMessageRestCreateRequest = {
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

export type BookmarkToggleResponse = {
  channelId: number;
  messageId: number;
  workspaceMemberId: number;
  bookmarked: boolean;
};

export type BookmarkResponse = {
  bookmarkId: number;
  channelId: number;
  messageId: number;
  senderMemberId: number;
  senderName: string;
  content: string;
  messageCreatedAt: ISODateTime;
  bookmarkedAt: ISODateTime;
};

export type MentionResponse = {
  id: number;
  workspaceId: number;
  channelId: number;
  threadId: number;
  threadReplyId: number | null;
  mentionedMemberId: number;
  mentionedByMemberId: number;
  mentionedByName: string;
  content: string;
  read: boolean;
  createdAt: ISODateTime;
};

export type ChannelReadStatusResponse = {
  channelId: number;
  workspaceMemberId: number;
  lastReadThreadId: number | null;
  lastReadAt: ISODateTime;
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

export const CHAT_EVENT_TYPE = {
  MESSAGE_CREATED: "MESSAGE_CREATED",
  MESSAGE_UPDATED: "MESSAGE_UPDATED",
  MESSAGE_DELETED: "MESSAGE_DELETED",
  THREAD_REPLY_CREATED: "THREAD_REPLY_CREATED",
  REACTION_UPDATED: "REACTION_UPDATED",
  TYPING: "TYPING",
  NOTIFICATION_CREATED: "NOTIFICATION_CREATED"
} as const;

export type ChatEventType = typeof CHAT_EVENT_TYPE[keyof typeof CHAT_EVENT_TYPE];

export const CHAT_EVENT_TYPES = Object.values(CHAT_EVENT_TYPE) as ChatEventType[];

export type ChatEvent<T> = {
  type: ChatEventType;
  payload: T;
};

export type ChannelEventPayload =
  | ChannelMessage
  | ReactionToggleResponse
  | TypingEvent;

export type ThreadEventPayload = ThreadReply;

export type PersonalNotification = {
  id?: number;
  workspaceId?: number;
  channelId?: number;
  threadId?: number;
  mentionedMemberId?: number;
  message: string;
};

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
  },
  subscribePersonalNotifications() {
    return "/user/queue/notifications";
  }
};

const chatEventTypeSet = new Set<string>(CHAT_EVENT_TYPES);

export function isChatEventType(value: unknown): value is ChatEventType {
  return typeof value === "string" && chatEventTypeSet.has(value);
}

export function isChatEventEnvelope(value: unknown): value is ChatEvent<unknown> {
  if (!value || typeof value !== "object") return false;
  const maybeEvent = value as Partial<ChatEvent<unknown>>;
  return isChatEventType(maybeEvent.type) && Object.prototype.hasOwnProperty.call(maybeEvent, "payload");
}

export function getChatEventPayload<T>(event: unknown, expectedType: ChatEventType): T | null {
  if (!isChatEventEnvelope(event) || event.type !== expectedType) return null;
  return event.payload as T;
}

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

export function createChannelMessage(
  channelId: number,
  request: ChannelMessageRestCreateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.post<ChannelMessage>(`/api/channels/${channelId}/messages`, request, options);
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

export function toggleMessageBookmark(channelId: number, messageId: number, options?: ApiRequestOptions) {
  return apiClient.post<BookmarkToggleResponse>(`/api/channels/${channelId}/messages/${messageId}/bookmark`, undefined, options);
}

export function getWorkspaceBookmarks(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<BookmarkResponse[]>(`/api/workspaces/${workspaceId}/bookmarks`, options);
}

export function getWorkspaceMentions(workspaceId: number, options?: ApiRequestOptions) {
  return apiClient.get<MentionResponse[]>(`/api/workspaces/${workspaceId}/mentions`, options);
}

export function markMentionAsRead(mentionId: number, options?: ApiRequestOptions) {
  return apiClient.patch<MentionResponse>(`/api/mentions/${mentionId}/read`, undefined, options);
}

export function markChannelAsRead(channelId: number, options?: ApiRequestOptions) {
  return apiClient.put<ChannelReadStatusResponse>(`/api/channels/${channelId}/read`, undefined, options);
}

