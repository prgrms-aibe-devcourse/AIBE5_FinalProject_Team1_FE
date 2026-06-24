import { apiClient, type ApiRequestOptions } from "./client";
import type { ChannelType, ISODateTime, ReactionTargetType } from "./types";
import type { MessageAttachmentRequest, MessageAttachmentResponse } from "../components/messageAttachments";

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
  displayOrder?: number | null;
};

export type ChannelCreateRequest = {
  name: string;
  description?: string | null;
};

export type ChannelUpdateRequest = {
  name: string;
  description?: string | null;
};

export type ChannelOrderUpdateRequest = {
  channelIds: number[];
};

export type ChannelMessageReplyTo = {
  messageId: number;
  senderName: string | null;
  content: string;
};

export type ChannelMessage = {
  id: number;
  channelId: number;
  senderMemberId: number;
  senderName: string;
  senderAvatarUrl?: string | null;
  content: string;
  createdAt: ISODateTime;
  attachments?: MessageAttachmentResponse[];
  isDeleted?: boolean;
  replyTo?: ChannelMessageReplyTo | null;
  // 낙관적 전송 멱등 키. 서버가 그대로 echo하므로 pending 메시지 매칭에 사용함.
  clientMessageId?: string | null;
};

export type ChannelMessageCreateRequest = {
  content: string;
  replyToMessageId?: number;
  clientMessageId?: string;
};

export type ChannelMessageRestCreateRequest = {
  content: string;
  attachments?: MessageAttachmentRequest[];
  replyToMessageId?: number;
  clientMessageId?: string;
};

export type ChannelMessageUpdateRequest = {
  content: string;
};

export type ThreadReply = {
  id: number;
  threadId: number;
  senderMemberId: number;
  senderName: string;
  senderAvatarUrl?: string | null;
  content: string;
  createdAt: ISODateTime;
  isDeleted?: boolean;
};

export type ThreadReplyCreateRequest = {
  content: string;
};

export type ThreadReplyUpdateRequest = {
  content: string;
};

export type ThreadReplyWebSocketCreateRequest = {
  content: string;
};

export type ReactionToggleRequest = {
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
  reacted?: boolean;
  userReacted?: boolean;
  count: number;
};

export type ReactionSummary = {
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
  count: number;
  reacted?: boolean;
  userReacted?: boolean;
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
  workspaceId?: number;
  workspaceMemberId: number;
  lastReadThreadId: number | null;
  lastReadAt: ISODateTime;
  unreadCount?: number;
};

export type MentionDeletedEvent = {
  id?: number;
  mentionId?: number;
  workspaceId?: number;
};

export type TypingEvent = {
  channelId?: number;
  threadId?: number;
  workspaceMemberId: number;
  senderName: string;
  typing: boolean;
};

export type TypingEventRequest = {
  typing: boolean;
};

export const CHAT_EVENT_TYPE = {
  MESSAGE_CREATED: "MESSAGE_CREATED",
  MESSAGE_UPDATED: "MESSAGE_UPDATED",
  MESSAGE_DELETED: "MESSAGE_DELETED",
  THREAD_REPLY_CREATED: "THREAD_REPLY_CREATED",
  THREAD_REPLY_UPDATED: "THREAD_REPLY_UPDATED",
  THREAD_REPLY_DELETED: "THREAD_REPLY_DELETED",
  REACTION_UPDATED: "REACTION_UPDATED",
  MENTION_DELETED: "MENTION_DELETED",
  CHANNEL_CREATED: "CHANNEL_CREATED",
  CHANNEL_UPDATED: "CHANNEL_UPDATED",
  CHANNEL_DELETED: "CHANNEL_DELETED",
  CHANNEL_READ: "CHANNEL_READ",
  CHANNEL_READ_UPDATED: "CHANNEL_READ_UPDATED",
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

export type WorkspaceChannelEventPayload =
  | Channel
  | ChannelReadStatusResponse;

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
  subscribeWorkspaceChannels(workspaceId: number) {
    return `/topic/workspaces/${workspaceId}/channels`;
  },
  sendThreadTyping(threadId: number) {
    return `/app/threads/${threadId}/typing`;
  },
  subscribeThreadTyping(threadId: number) {
    return `/topic/threads/${threadId}/typing`;
  },
  sendThreadReply(threadId: number) {
    return `/app/threads/${threadId}/replies`;
  },
  subscribeThreadEvents(threadId: number) {
    return `/topic/threads/${threadId}/events`;
  },
  subscribePersonalNotifications() {
    return "/user/queue/notifications";
  },
  subscribePersonalErrors() {
    return "/user/queue/errors";
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

export function createWorkspaceChannel(
  workspaceId: number,
  request: ChannelCreateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.post<Channel>(`/api/workspaces/${workspaceId}/channels`, request, options);
}

export function updateWorkspaceChannel(
  workspaceId: number,
  channelId: number,
  request: ChannelUpdateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.patch<Channel>(`/api/workspaces/${workspaceId}/channels/${channelId}`, request, options);
}

export function deleteWorkspaceChannel(
  workspaceId: number,
  channelId: number,
  options?: ApiRequestOptions
) {
  return apiClient.delete<void>(`/api/workspaces/${workspaceId}/channels/${channelId}`, options);
}

export function updateWorkspaceChannelOrder(
  workspaceId: number,
  request: ChannelOrderUpdateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.patch<Channel[]>(`/api/workspaces/${workspaceId}/channels/order`, request, options);
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

export interface PresignUploadResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  contentType: string;
}

// 파일 업로드용 presigned PUT URL 발급
export function presignAttachmentUpload(
  fileName: string,
  contentType: string,
  options?: ApiRequestOptions
) {
  return apiClient.post<PresignUploadResponse>(
    `/api/attachments/presign`,
    { fileName, contentType },
    options
  );
}

// 파일을 S3로 직접 업로드하고 공개 URL을 반환한다.
// 1) BE에서 presigned URL 발급 → 2) 그 URL로 파일 PUT → 3) 표시용 공개 URL 반환
export async function uploadAttachmentFile(
  file: File,
  options?: ApiRequestOptions
): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const presign = await presignAttachmentUpload(file.name, contentType, options);

  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": presign.contentType },
    signal: options?.signal,
  });

  if (!putResponse.ok) {
    throw new Error(`파일 업로드에 실패했습니다 (HTTP ${putResponse.status})`);
  }

  return presign.fileUrl;
}

export function addMessageAttachments(
  channelId: number,
  messageId: number,
  attachments: MessageAttachmentRequest[],
  options?: ApiRequestOptions
) {
  return apiClient.post<MessageAttachmentResponse[]>(
    `/api/channels/${channelId}/messages/${messageId}/attachments`,
    { attachments },
    options
  );
}

export function deleteMessageAttachment(
  channelId: number,
  messageId: number,
  attachmentId: number,
  options?: ApiRequestOptions
) {
  return apiClient.delete<void>(
    `/api/channels/${channelId}/messages/${messageId}/attachments/${attachmentId}`,
    options
  );
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

export function updateThreadReply(
  threadId: number,
  replyId: number,
  request: ThreadReplyUpdateRequest,
  options?: ApiRequestOptions
) {
  return apiClient.patch<ThreadReply>(`/api/threads/${threadId}/replies/${replyId}`, request, options);
}

export function deleteThreadReply(threadId: number, replyId: number, options?: ApiRequestOptions) {
  return apiClient.delete<ThreadReply>(`/api/threads/${threadId}/replies/${replyId}`, options);
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

export function deleteMention(mentionId: number, options?: ApiRequestOptions) {
  return apiClient.delete<void>(`/api/mentions/${mentionId}`, options);
}

export function markChannelAsRead(channelId: number, options?: ApiRequestOptions) {
  return apiClient.put<ChannelReadStatusResponse>(`/api/channels/${channelId}/read`, undefined, options);
}

