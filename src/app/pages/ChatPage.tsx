import { Hash, Users, GitPullRequest, Home, CheckSquare, ChevronDown, ChevronRight, GitBranch, Code2, Database, BookOpen, Maximize2, Minimize2, Plus, Pencil, Trash2, MoreVertical, X, LayoutGrid, Bell, BellOff, Bookmark, Check, Clock3, MessageCircle, Settings, UserRound, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { WorkBoardPanel } from "../components/WorkBoardPanel";
import { ChatPanel } from "../components/ChatPanel";
import { PRReviewPanel } from "../components/PRReviewPanel";
import { IssuePanel } from "../components/IssuePanel";
import { ThreadPanel } from "../components/ThreadPanel";
import { ChannelPanel } from "../components/ChannelPanel";
import { OverviewPanel } from "../components/OverviewPanel";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { type CSSProperties, type ReactNode, type MouseEvent as ReactMouseEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  isSendableMessageAttachment,
  mapMessageAttachmentResponse,
  toMessageAttachmentRequest,
  type MessageAttachment
} from "../components/messageAttachments";
import type { MessageMetadata } from "../components/chatInteractionUtils";
import { toggleMessageReaction, type MessageReaction } from "../components/MessageReactions";
import { TeamInviteModal } from "../components/TeamInviteModal";
import { TeamPanel } from "../components/TeamPanel";
import { createPortal } from "react-dom";
import {
  CHAT_EVENT_TYPE,
  chatWebSocketDestinations,
  addMessageAttachments,
  createChannelMessage,
  createWorkspaceChannel,
  createThreadReply,
  deleteMessageAttachment,
  deleteWorkspaceChannel,
  deleteChannelMessage,
  deleteThreadReply,
  getChatEventPayload,
  getChannelMessages,
  getChannelReactions,
  getWorkspaceBookmarks,
  getThreadReplies,
  getWorkspaceMentions,
  getWorkspaceChannels,
  markChannelAsRead,
  markMentionAsRead,
  deleteMention,
  toggleChannelReaction,
  toggleMessageBookmark,
  updateWorkspaceChannel,
  updateWorkspaceChannelOrder,
  updateChannelMessage,
  updateThreadReply,
  type Channel,
  type ChannelEventPayload,
  type ChannelMessage,
  type ChatEvent,
  type ApiErrorResponse,
  type BookmarkResponse,
  type MentionResponse,
  type MentionDeletedEvent,
  type PersonalNotification,
  type ReactionSummary,
  type ReactionToggleResponse,
  type ChannelReadStatusResponse,
  type ThreadReply,
  type ThreadEventPayload,
  type TypingEvent,
  type WorkspaceChannelEventPayload
} from "../api";
import type { ChatStompClient } from "../api/stomp";
import { getAccessToken } from "../auth";
import { useProfile } from "../contexts/ProfileContext";
import { fetchMyWorkspaces, getWorkspaceMembers, updatePresence, type WorkspaceDto, type WorkspaceMember } from "../api/workspace";
import { type WorkspaceEventDto } from "../api/events";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { ApiClientError } from "../api/client";
import {
  connectWorkspaceRepository,
  fetchWorkspaceRepositories,
  registerWorkspaceRepositoryWebhook,
  syncRepositoryIssueStatuses,
  syncRepositoryPullRequests,
  syncRepositoryPrStatuses
} from "../api/github";

const APISpecPage = lazy(() => import("./APISpecPage").then((module) => ({ default: module.APISpecPage })));
const ERDPage = lazy(() => import("./ERDPage").then((module) => ({ default: module.ERDPage })));
const DocsPage = lazy(() => import("./DocsPage").then((module) => ({ default: module.DocsPage })));

const REPOSITORY_IMPORTED_KEY = "codedock-repository-imported";
const REPOSITORY_LIST_KEY = "codedock-repositories-v2";
const WORKSPACE_REPOS_KEY = "codedock-workspace-repos-v1";
const HIDDEN_WORKSPACE_REPOS_KEY = "codedock-hidden-workspace-repos-v1";
const CHAT_MESSAGES_KEY = "codedock-chat-messages-v1";
const CHAT_THREAD_REPLIES_KEY = "codedock-chat-thread-replies-v1";
const CHAT_THREAD_REPLY_COUNTS_KEY = "codedock-chat-thread-reply-counts-v1";
const CHAT_REACTIONS_KEY = "codedock-chat-reactions-v1";
const LAST_CHANNEL_KEY = "codedock-last-channel-v1";
const LAST_WORKSPACE_KEY = "codedock-last-workspace-v1";
const LAST_PRESENCE_KEY = "codedock-last-presence-v1";
const API_CHANNEL_ID_PREFIX = "api-channel-";
const DEFAULT_WORKSPACE_API_ID = 1;
const WORKSPACE_CHAT_STATE_KEY_PREFIX = "workspace";
// 워크스페이스 멤버 권한(BE authority) 정렬 순서 및 한글 라벨
const AUTHORITY_ORDER = ['owner', 'admin', 'editor', 'viewer'];
const AUTHORITY_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
  viewer: '뷰어',
};
function formatMemberAuthority(authority: string | null | undefined): string {
  const key = (authority ?? '').toLowerCase();
  return AUTHORITY_LABELS[key] ?? (authority || '멤버');
}
const PRESENCE_ORDER = ['active', 'away', 'busy', 'offline'] as const;
type PresenceKey = typeof PRESENCE_ORDER[number];
const PRESENCE_META: Record<PresenceKey, { label: string; color: string }> = {
  active:  { label: '활동중',  color: 'var(--matrix-green)' },
  away:    { label: '자리비움', color: '#FFD166' },
  busy:    { label: '방해금지', color: '#FF6B6B' },
  offline: { label: '오프라인', color: '#8B94A7' },
};

type SidebarGroupId = 'documentation';
type UserPresence = 'active' | 'away' | 'busy' | 'offline';
type NotificationMode = 'all' | 'mentions' | 'muted';
type RemoteTypingMembers = Record<number, string>;
type ChatProfilePreview = {
  name: string;
  avatarUrl?: string;
  memberId?: number;
  userId?: number;
  email?: string;
  role?: string;
  presence?: PresenceKey;
};

function isGithubNoreplyEmail(email?: string | null) {
  return Boolean(email?.trim().toLowerCase().endsWith("@users.noreply.github.com"));
}

function getPublicProfileEmail(email?: string | null) {
  const trimmed = email?.trim();
  return trimmed && !isGithubNoreplyEmail(trimmed) ? trimmed : "";
}
type ChannelFetchStatus = "idle" | "loading" | "ready" | "failed";
type RealtimeConnectionStatus = "idle" | "waiting" | "connecting" | "connected" | "blocked" | "failed" | "disconnected";
type RealtimeConnectionReason =
  | "missing-token"
  | "workspace-unavailable"
  | "channels-loading"
  | "channels-failed"
  | "no-api-channels"
  | "non-api-channel"
  | "stomp-error"
  | "client-load-failed"
  | "disconnected";

type RealtimeConnectionState = {
  status: RealtimeConnectionStatus;
  reason?: RealtimeConnectionReason;
  detail?: string;
};

type RealtimeConnectionNotice = {
  tone: "info" | "warning" | "error";
  title: string;
  body: string;
};

interface RepositoryItem {
  id: string;
  name: string;
  openPRs: number;
  highRisk: number;
  activeIssues: number;
  connected: boolean;
  membersOnline: number;
  workspaceId?: string;
  channelId?: number;   // 백엔드 repository channel DB id
  dbRepoId?: string;    // github_repositories DB id
}

type RepositoryReference = Pick<RepositoryItem, "id" | "name" | "dbRepoId" | "channelId">;

interface WorkspaceItem {
  id: string;
  apiId?: number;
  name: string;
  connected: boolean;
  membersOnline: number;
  myRole: string;
}

const DEFAULT_WORKSPACES: WorkspaceItem[] = [
  { id: 'workspace-1', name: 'SecureFlow Workspace', connected: true, membersOnline: 5, myRole: '소유자' },
  { id: 'workspace-2', name: 'AI Chat Platform', connected: true, membersOnline: 8, myRole: '편집 가능' },
  { id: 'workspace-3', name: 'Dashboard UI Kit', connected: true, membersOnline: 3, myRole: '보기 가능' },
  { id: 'workspace-4', name: 'Mobile App Beta', connected: true, membersOnline: 6, myRole: '보기 가능' },
];

interface SidebarChannel {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

type CustomChannelItem = {
  id: string;
  label: string;
  apiChannelId?: number;
  displayOrder?: number | null;
};

const REPO_CHANNEL_IDS: Record<string, string> = {
  'secureflow': 'frontend-chat',
  'aichat': 'backend-chat',
  'dashboard': 'review-room',
  'secureflow-2': 'frontend-chat',
  'aichat-2': 'backend-chat',
  'dashboard-2': 'review-room',
  'secureflow-3': 'frontend-chat',
  'aichat-3': 'backend-chat',
  'dashboard-3': 'review-room',
};

// 역방향 매핑: 채널 ID → 레포 ID
const REPO_CHANNEL_IDS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(REPO_CHANNEL_IDS).map(([repoId, channelId]) => [channelId, repoId])
);


const DOCUMENTATION_CHANNELS: SidebarChannel[] = [
  { id: 'api-spec', label: 'API', icon: Code2 },
  { id: 'erd', label: 'ERD', icon: Database },
  { id: 'docs', label: '문서', icon: BookOpen }
];

const ALL_SIDEBAR_CHANNELS = [
  { id: 'overview', label: '통합 개요', icon: Home },
  { id: 'general', label: '일반', icon: Hash },
  ...DOCUMENTATION_CHANNELS
];

const myProfile = {
  id: "jaejun",
  name: "김재준",
  role: "Tech Lead",
  email: "jaejun@codedock.dev",
  initials: "JJ"
};

const presenceOptions: Array<{ id: UserPresence; label: string; description: string; color: string }> = [
  { id: 'active', label: '활동중', description: '바로 응답 가능', color: 'var(--matrix-green)' },
  { id: 'away', label: '자리비움', description: '잠시 후 확인', color: '#FFD166' },
  { id: 'busy', label: '방해금지', description: '멘션만 확인', color: '#FF6B6B' },
  { id: 'offline', label: '오프라인', description: '상태 숨김', color: '#8B94A7' }
];

const notificationOptions: Array<{ id: NotificationMode; label: string; description: string; icon: LucideIcon }> = [
  { id: 'all', label: '모든 알림', description: '채널, PR, 이슈 알림 받기', icon: Bell },
  { id: 'mentions', label: '멘션만', description: '@멘션과 배정 알림만 받기', icon: MessageCircle },
  { id: 'muted', label: '알림 끄기', description: '새 알림을 조용히 보관', icon: BellOff }
];

function getRepositoryImportPreference() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(REPOSITORY_IMPORTED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveRepositoryImportPreference() {
  saveRepositoryImportPreferenceValue(true);
}

function saveRepositoryImportPreferenceValue(value: boolean) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REPOSITORY_IMPORTED_KEY, value ? "true" : "false");
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

function getSavedRepositories() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(REPOSITORY_LIST_KEY);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return null;

    return parsed.filter((repo): repo is RepositoryItem =>
      repo
      && typeof repo.id === "string"
      && typeof repo.name === "string"
      && typeof repo.openPRs === "number"
      && typeof repo.highRisk === "number"
      && typeof repo.activeIssues === "number"
      && typeof repo.connected === "boolean"
      && typeof repo.membersOnline === "number"
    );
  } catch {
    return null;
  }
}

function saveRepositories(repositories: RepositoryItem[]) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REPOSITORY_LIST_KEY, JSON.stringify(repositories));
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

function getSavedJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

function getRepositoryReferenceId(repository: RepositoryReference) {
  const dbRepoId = typeof repository.dbRepoId === "string" ? repository.dbRepoId.trim() : "";
  return dbRepoId ? `db:${dbRepoId}` : `local:${repository.id}`;
}

function getHiddenRepositoryKey(workspaceApiId: number, repository: RepositoryReference) {
  return `${workspaceApiId}:${getRepositoryReferenceId(repository)}`;
}

function getHiddenWorkspaceRepositories() {
  return getSavedJson<Record<string, true>>(HIDDEN_WORKSPACE_REPOS_KEY, {});
}

function saveHiddenWorkspaceRepositories(hiddenRepositories: Record<string, true>) {
  saveJson(HIDDEN_WORKSPACE_REPOS_KEY, hiddenRepositories);
}

function isWorkspaceRepositoryHidden(
  workspaceApiId: number,
  repository: RepositoryReference,
  hiddenRepositories = getHiddenWorkspaceRepositories()
) {
  return Boolean(hiddenRepositories[getHiddenRepositoryKey(workspaceApiId, repository)]);
}

function hideWorkspaceRepository(workspaceApiId: number, repository: RepositoryReference) {
  const hiddenRepositories = getHiddenWorkspaceRepositories();
  hiddenRepositories[getHiddenRepositoryKey(workspaceApiId, repository)] = true;
  saveHiddenWorkspaceRepositories(hiddenRepositories);
}

function unhideWorkspaceRepository(workspaceApiId: number, repository: RepositoryReference) {
  const hiddenRepositories = getHiddenWorkspaceRepositories();
  const hiddenKey = getHiddenRepositoryKey(workspaceApiId, repository);
  if (!hiddenRepositories[hiddenKey]) return;

  delete hiddenRepositories[hiddenKey];
  saveHiddenWorkspaceRepositories(hiddenRepositories);
}

function isSameRepositoryReference(a: Partial<RepositoryReference>, b: Partial<RepositoryReference>) {
  return Boolean(
    (a.dbRepoId && b.dbRepoId && a.dbRepoId === b.dbRepoId)
    || (a.channelId && b.channelId && a.channelId === b.channelId)
    || (a.id && b.id && a.id === b.id)
  );
}

function removeWorkspaceRepositoryFromStorage(workspaceApiId: number, repository: RepositoryReference) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_REPOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    const workspaceId = String(workspaceApiId);
    const next = parsed.filter((item) => {
      if (!item || item.workspaceId !== workspaceId) return true;
      return !isSameRepositoryReference(item, repository);
    });

    window.localStorage.setItem(WORKSPACE_REPOS_KEY, JSON.stringify(next));
  } catch {
    // Keep in-memory state as the source of truth if storage is unavailable.
  }
}

function scheduleSaveJson(key: string, value: unknown, delay = 350) {
  if (typeof window === "undefined") {
    saveJson(key, value);
    return undefined;
  }

  const timeoutId = window.setTimeout(() => {
    saveJson(key, value);
  }, delay);

  return () => window.clearTimeout(timeoutId);
}

function getWorkspaceScopedChatKey(workspaceApiId: number, key: string | number) {
  return `${WORKSPACE_CHAT_STATE_KEY_PREFIX}:${workspaceApiId}:${String(key)}`;
}

function getChannelIdFromWorkspaceScopedChatKey(key: string) {
  const match = key.match(/^workspace:\d+:(.+)$/);
  return match?.[1] ?? key;
}

function getWorkspaceIdFromWorkspaceScopedChatKey(key: string) {
  const match = key.match(/^workspace:(\d+):/);
  return match ? Number(match[1]) : null;
}

function hasWorkspaceScopedChatKeys(value: Record<string, unknown>) {
  return Object.keys(value).some((key) => key.startsWith(`${WORKSPACE_CHAT_STATE_KEY_PREFIX}:`));
}

function scopeChannelRecordByWorkspace<T>(
  workspaceApiId: number,
  record: Record<string, T>
): Record<string, T> {
  return Object.entries(record).reduce<Record<string, T>>((acc, [key, value]) => {
    const scopedKey = key.startsWith(`${WORKSPACE_CHAT_STATE_KEY_PREFIX}:`)
      ? key
      : getWorkspaceScopedChatKey(workspaceApiId, key);
    acc[scopedKey] = value;
    return acc;
  }, {});
}

function getWorkspaceScopedRecordView<T>(
  workspaceApiId: number,
  record: Record<string, T>
): Record<string, T> {
  return Object.entries(record).reduce<Record<string, T>>((acc, [key, value]) => {
    const scopedWorkspaceId = getWorkspaceIdFromWorkspaceScopedChatKey(key);

    if (scopedWorkspaceId === workspaceApiId) {
      acc[getChannelIdFromWorkspaceScopedChatKey(key)] = value;
      return acc;
    }

    if (scopedWorkspaceId === null && workspaceApiId === DEFAULT_WORKSPACE_API_ID) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

function getSavedWorkspaceScopedRecord<T>(
  key: string,
  fallback: Record<string, T>,
  workspaceApiId = DEFAULT_WORKSPACE_API_ID
) {
  const saved = getSavedJson<Record<string, T> | null>(key, null);
  const source = saved ?? fallback;
  return hasWorkspaceScopedChatKeys(source)
    ? source
    : scopeChannelRecordByWorkspace(workspaceApiId, source);
}

function hasServerMessageState(messages: any[]) {
  return messages.some((message) =>
    message?.backendMessageId != null
    || message?.backendChannelId != null
    || message?.serverSyncState != null
    || message?.pending === true
  );
}

function getLocalPersistableMessages(
  messages: Record<string, any[]>,
  apiChannelIdByUiChannel: Record<string, number>,
  currentWorkspaceApiId: number
) {
  return Object.entries(messages).reduce<Record<string, any[]>>((acc, [channelStateKey, channelMessages]) => {
    const channelId = getChannelIdFromWorkspaceScopedChatKey(channelStateKey);
    const workspaceId = getWorkspaceIdFromWorkspaceScopedChatKey(channelStateKey);
    const isCurrentWorkspaceApiChannel =
      workspaceId === currentWorkspaceApiId
      && (
        channelId.startsWith(API_CHANNEL_ID_PREFIX)
        || apiChannelIdByUiChannel[channelId] !== undefined
      );

    if (isCurrentWorkspaceApiChannel || hasServerMessageState(channelMessages)) {
      return acc;
    }

    acc[channelStateKey] = channelMessages;
    return acc;
  }, {});
}

function hasServerThreadReplyState(replies: any[]) {
  return replies.some((reply) =>
    reply?.backendReplyId != null
    || reply?.backendThreadId != null
    || reply?.pending === true
  );
}

function getLocalPersistableThreadReplies(threadReplies: Record<string | number, any[]>): Record<string | number, any[]> {
  return Object.entries(threadReplies).reduce<Record<string | number, any[]>>((acc, [threadKey, replies]) => {
    if (!hasServerThreadReplyState(replies)) {
      acc[threadKey] = replies;
    }

    return acc;
  }, {});
}

function toWorkspaceUiId(workspaceId: number) {
  return `workspace-${workspaceId}`;
}

function getWorkspaceApiId(workspaceId: string, workspace?: WorkspaceItem | null) {
  if (workspace?.apiId) {
    return workspace.apiId;
  }

  return 0;
}

function parseWorkspaceApiId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

// "Seoilhyeon AIBE5_Algorithm_Study 10" → "AIBE5_Algorithm_Study"
// trailing 숫자 토큰이 제거됐을 때만 첫 토큰(owner)도 제거
function cleanChannelLabel(name: string): string {
  const trimmed = name.trim();
  const withoutTrailing = trimmed.replace(/\s+\d+$/, '');
  if (withoutTrailing !== trimmed) {
    const parts = withoutTrailing.trim().split(/\s+/);
    if (parts.length >= 2) return parts.slice(1).join(' ');
  }
  return withoutTrailing.trim() || trimmed;
}

function normalizeChannelName(name: string) {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function canManageWorkspaceChannel(role?: string | null) {
  const normalizedRole = (role ?? "").trim().toLowerCase();
  return normalizedRole === "owner"
    || normalizedRole === "admin"
    || normalizedRole === "소유자"
    || normalizedRole === "관리자";
}

function getChannelActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    const serverMessage = error.response?.message ?? error.message;
    const normalizedMessage = serverMessage.toLowerCase();

    if (error.status === 401) {
      return "로그인이 만료되었습니다. 다시 로그인한 뒤 시도해주세요.";
    }
    if (error.status === 403) {
      return "채널 관리는 워크스페이스 owner/admin만 할 수 있습니다.";
    }
    if (error.status === 404) {
      return "워크스페이스 또는 채널 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.";
    }
    if (error.status === 409 || normalizedMessage.includes("already exists")) {
      return "이미 같은 이름의 채널이 있습니다.";
    }
    if (error.status === 400) {
      if (normalizedMessage.includes("already exists")) {
        return "이미 같은 이름의 채널이 있습니다.";
      }
      if (normalizedMessage.includes("must not be blank")) {
        return "채널 이름을 입력해주세요.";
      }
      if (normalizedMessage.includes("120")) {
        return "채널 이름은 120자 이하로 입력해주세요.";
      }
      if (normalizedMessage.includes("cannot be modified")) {
        return "이 채널은 수정할 수 없습니다.";
      }
      if (normalizedMessage.includes("cannot be deleted")) {
        return "이 채널은 삭제할 수 없습니다.";
      }
      if (normalizedMessage.includes("with pull requests")) {
        return "PR이 연결된 채널은 삭제할 수 없습니다.";
      }
      if (normalizedMessage.includes("with issues")) {
        return "이슈가 연결된 채널은 삭제할 수 없습니다.";
      }
      return serverMessage || fallback;
    }
    if (error.status >= 500 || error.code === "C005") {
      return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
    return serverMessage || fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

function getApiChannelUiId(channel: Channel) {
  const channelType = String(channel.channelType ?? "").toLowerCase();
  const normalizedName = normalizeChannelName(channel.name);

  if (channelType === "general" || normalizedName === "general" || normalizedName === "일반") {
    return "general";
  }

  return `${API_CHANNEL_ID_PREFIX}${channel.id}`;
}

function getApiChannelUiIdById(channelId: number) {
  return `${API_CHANNEL_ID_PREFIX}${channelId}`;
}

// 낙관적 전송 멱등 키. 서버로 보내고 그대로 echo받아 pending 메시지를 정확히 매칭/중복제거하는 데 사용함.
function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cmid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRepositoryApiChannel(channel: Channel) {
  return String(channel.channelType ?? "").toLowerCase() === "repository";
}

type RepositoryMessageView = "pull-requests" | "issues" | "repository";

function normalizeRepositoryAttachmentType(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function getRepositoryMessageViewFromAttachments(message: {
  attachments?: Array<{ type?: unknown; attachmentType?: unknown }>;
}): RepositoryMessageView {
  const attachmentTypes = (message.attachments ?? []).map((attachment) =>
    normalizeRepositoryAttachmentType(attachment.attachmentType ?? attachment.type)
  );

  if (attachmentTypes.some((type) => type === "pr" || type === "pull-request" || type === "pullrequest")) {
    return "pull-requests";
  }

  if (attachmentTypes.some((type) => type === "issue")) {
    return "issues";
  }

  return "repository";
}

function filterRepositoryMessagesForView<T extends { attachments?: Array<{ type?: unknown; attachmentType?: unknown }> }>(
  messages: T[],
  view: RepositoryMessageView | null
) {
  if (!view) return messages;

  // 백엔드는 레포지토리 PR/이슈가 같은 repository channelId를 공유한다.
  // 그래서 프론트의 PR/이슈 탭은 별도 채널이 아니라 같은 조회 결과를 attachment type으로 나누는 가상 탭이다.
  // 이 필터가 없으면 같은 GET /api/channels/{repositoryChannelId}/messages 결과가 두 탭에 모두 저장되어
  // PR 채팅방과 이슈 채팅방이 같은 내용처럼 보인다.
  return messages.filter((message) => getRepositoryMessageViewFromAttachments(message) === view);
}

function sortChannelsByDisplayOrder(channels: Channel[]) {
  return [...channels].sort((a, b) => {
    const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id - b.id;
  });
}

function formatApiDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

// Must stay in sync with the backend Thread.DELETED_MESSAGE_CONTENT constant (no trailing period). 감지용.
const DELETED_MESSAGE_CONTENT = "삭제된 메시지입니다";
// 화면 표시용 통일 라벨(마침표 포함). 채널/스레드 삭제 메시지 모두 이 문구로 표시.
const DELETED_MESSAGE_LABEL = "삭제된 메시지입니다.";

function mapChannelMessageToWorkspaceMessage(message: ChannelMessage) {
  const attachments = (message.attachments ?? []).map(mapMessageAttachmentResponse);
  // The backend marks soft-deleted messages by replacing the content with a sentinel string.
  // Detect it here so a page refresh keeps the message in the "deleted" state (no edit/delete buttons).
  const isDeleted = message.isDeleted === true || message.content === DELETED_MESSAGE_CONTENT;
  const replyTo = message.replyTo
    ? { user: message.replyTo.senderName ?? "", text: message.replyTo.content }
    : undefined;

  // GitHub bot issue notification — parse meta JSON from the issue attachment
  const issueAttachment = (message.attachments ?? []).find(
    (a) => a.attachmentType === "issue" || a.type === "issue"
  );
  let issueFields: Record<string, unknown> = {};
  if (issueAttachment?.meta) {
    try {
      const parsed = JSON.parse(issueAttachment.meta);
      // 우선순위 미설정 시 기본값 'medium'
      if (!parsed.issuePriority) parsed.issuePriority = 'medium';
      // 담당자 미설정 시 작성자로 fallback
      if (!parsed.issueAssignees || (parsed.issueAssignees as unknown[]).length === 0) {
        parsed.issueAssignees = parsed.issueAuthor ? [parsed.issueAuthor] : [];
      }
      issueFields = { type: "issue", ...parsed };
    } catch {
      // meta가 JSON이 아닌 경우 무시
    }
  }

  // GitHub bot PR notification — parse meta JSON from the PR attachment
  const prAttachment = (message.attachments ?? []).find(
    (a) => a.attachmentType === "pr" || a.type === "pr"
  );
let prFields: Record<string, unknown> = {};
  if (prAttachment?.meta) {
    try {
      const parsed = JSON.parse(prAttachment.meta);
      if (!parsed.aiRisk) parsed.aiRisk = 'Medium';
      if (parsed.approved === undefined) parsed.approved = 0;
      if (parsed.pending === undefined) parsed.pending = 0;
      if (parsed.passed === undefined) parsed.passed = 0;
      if (parsed.filesChanged === undefined) parsed.filesChanged = 0;
      if (parsed.additions === undefined) parsed.additions = 0;
      if (parsed.deletions === undefined) parsed.deletions = 0;
      prFields = { type: "pr", ...parsed };
    } catch {
      // meta가 JSON이 아닌 경우 무시
    }
  }

  return {
    id: message.id,
    backendMessageId: message.id,
    backendChannelId: message.channelId,
    ...(message.clientMessageId ? { clientMessageId: message.clientMessageId } : {}),
    senderMemberId: message.senderMemberId,
    user: message.senderName,
    avatar: message.senderName?.charAt(0).toUpperCase() || "U",
    avatarUrl: message.senderAvatarUrl || undefined,
    message: isDeleted ? DELETED_MESSAGE_LABEL : message.content,
    text: isDeleted ? DELETED_MESSAGE_LABEL : message.content,
    time: formatApiDateTime(message.createdAt),
    replies: 0,
    attachments,
    ...(replyTo ? { replyTo } : {}),
    ...(isDeleted ? { deleted: true } : {}),
    ...issueFields,
    ...prFields,
  };
}

function mapThreadReplyToWorkspaceMessage(reply: ThreadReply) {
  const isDeleted = reply.isDeleted === true || reply.content === DELETED_MESSAGE_CONTENT;
  return {
    id: reply.id,
    backendReplyId: reply.id,
    backendThreadId: reply.threadId,
    senderMemberId: reply.senderMemberId,
    user: reply.senderName,
    avatar: reply.senderName?.charAt(0).toUpperCase() || "U",
    avatarUrl: reply.senderAvatarUrl || undefined,
    text: isDeleted ? DELETED_MESSAGE_LABEL : reply.content,
    message: isDeleted ? DELETED_MESSAGE_LABEL : reply.content,
    time: formatApiDateTime(reply.createdAt),
    ...(isDeleted ? { deleted: true } : {})
  };
}

function mapReactionSummaryToMessageReaction(
  summary: ReactionSummary,
  previousReaction?: MessageReaction
): MessageReaction {
  const reacted = typeof summary.reacted === "boolean"
    ? summary.reacted
    : typeof summary.userReacted === "boolean"
      ? summary.userReacted
      : previousReaction?.reacted ?? false;

  return {
    emoji: summary.emoji,
    count: summary.count,
    reacted
  };
}

function formatRemoteTypingLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} 입력 중입니다`;
  if (names.length === 2) return `${names[0]}, ${names[1]} 입력 중입니다`;

  return `${names[0]} 외 ${names.length - 1}명 입력 중입니다`;
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeError = error as {
      body?: string;
      message?: string;
      type?: string;
      headers?: { message?: string };
    };
    return maybeError.headers?.message
      ?? maybeError.body
      ?? maybeError.message
      ?? maybeError.type
      ?? "상세 오류 없음";
  }

  return "상세 오류 없음";
}

function getRealtimeApiErrorMessage(error: ApiErrorResponse | null | undefined) {
  return error?.message || error?.code || "Realtime request failed.";
}

const REALTIME_PENDING_TIMEOUT_MS = 12000;

function findLatestPendingIndex(items: any[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.pending && item?.serverSyncState !== "failed") {
      return index;
    }
  }

  return -1;
}

function getRealtimeBlockState(reason: RealtimeConnectionReason, detail?: string): RealtimeConnectionState {
  const status: RealtimeConnectionStatus =
    reason === "missing-token"
    || reason === "workspace-unavailable"
    || reason === "channels-failed"
      ? "blocked"
      : "waiting";

  return { status, reason, detail };
}

function getRealtimeConnectionNotice(
  connection: RealtimeConnectionState,
  channelFetchError: string
): RealtimeConnectionNotice | null {
  if (connection.status === "connected" || connection.status === "idle") {
    return null;
  }

  if (connection.status === "connecting") {
    return null;
  }

  switch (connection.reason) {
    case "missing-token":
      return {
        tone: "error",
        title: "실시간 연결 대기 중",
        body: "로그인 토큰이 없어 WebSocket 연결을 시작하지 않았습니다."
      };
    case "workspace-unavailable":
      return {
        tone: "error",
        title: "워크스페이스 확인 필요",
        body: "현재 워크스페이스를 확인할 수 없어 실시간 연결을 보류했습니다."
      };
    case "channels-loading":
      return {
        tone: "info",
        title: "채널 목록 확인 중",
        body: "채널 목록을 불러온 뒤 실시간 연결을 시작합니다."
      };
    case "channels-failed":
      return {
        tone: "error",
        title: "채널 조회 실패",
        body: channelFetchError || connection.detail || "채널 목록을 불러오지 못해 실시간 연결을 시작하지 못했습니다."
      };
    case "no-api-channels":
      return {
        tone: "warning",
        title: "연결할 채널 없음",
        body: "백엔드 채널 목록이 비어 있어 실시간 연결을 대기합니다."
      };
    case "non-api-channel":
      return {
        tone: "warning",
        title: "로컬 채널 표시 중",
        body: "현재 채널은 백엔드 채널과 매칭되지 않아 실시간 구독 대상이 아닙니다."
      };
    case "stomp-error":
      return {
        tone: "error",
        title: "WebSocket 연결 실패",
        body: connection.detail || "WebSocket 연결 중 오류가 발생했습니다."
      };
    case "client-load-failed":
      return {
        tone: "error",
        title: "실시간 클라이언트 로드 실패",
        body: connection.detail || "WebSocket 클라이언트를 불러오지 못했습니다."
      };
    case "disconnected":
      return {
        tone: "warning",
        title: "실시간 연결 끊김",
        body: "채널을 다시 확인하거나 잠시 후 재시도합니다."
      };
    default:
      return null;
  }
}

function upsertReactionSummary(
  reactions: MessageReaction[] | undefined,
  response: ReactionToggleResponse
): MessageReaction[] {
  const currentReactions = reactions ?? [];
  const hasReaction = currentReactions.some((reaction) => reaction.emoji === response.emoji);
  const nextReaction: MessageReaction = {
    emoji: response.emoji,
    count: response.count,
    reacted: typeof response.reacted === "boolean"
      ? response.reacted
      : response.userReacted ?? false
  };

  if (!hasReaction) {
    return response.count > 0 ? [...currentReactions, nextReaction] : currentReactions;
  }

  return currentReactions
    .map((reaction) => reaction.emoji === response.emoji ? nextReaction : reaction)
    .filter((reaction) => reaction.count > 0);
}

const initialMessages: Record<string, any[]> = {
  'overview': [
    { id: 1, user: '시스템', text: '프로젝트 대시보드에 오신 것을 환영합니다!', time: '오늘 09:00', type: 'system' as const },
    { id: 2, user: '시스템', text: '활성 PR: 5개 | 미해결 이슈: 12개 | 팀원: 15명', time: '오늘 09:00', type: 'system' as const }
  ],
  'general': [
    { id: 1, user: '시스템', text: 'SecureFlow Workspace에 오신 것을 환영합니다!', time: '오늘 09:00', type: 'system' as const },
    { id: 2, user: '김재준', text: '이번 주 스프린트 목표 공유드립니다.', time: '오늘 10:00' },
    { id: 3, user: '김진필', text: '네, 확인했습니다!', time: '오늘 10:05' }
  ],
  'review-room': [
    { id: 1, user: 'CodeDock', text: 'PR #234 인증 변경 파일을 먼저 묶었어요.', time: '오늘 11:12', type: 'system' as const },
    { id: 2, user: '김준우', text: 'rate limit 빠진 부분만 체크리스트로 빼줘.', time: '오늘 11:15' },
    { id: 3, user: 'CodeDock', text: '보안 코멘트 3개와 문서 반영 항목을 준비했습니다.', time: '오늘 11:16', type: 'system' as const }
  ],
  'frontend-chat': [
    { id: 1, user: '김진현', text: '로그인 페이지 채팅형 전환 애니메이션 확인 부탁드려요.', time: '오늘 10:42' },
    { id: 2, user: '안현', text: '크게 보기 모드에서 헤더 덮는 부분까지 맞췄습니다.', time: '오늘 10:48' }
  ],
  'backend-chat': [
    { id: 1, user: '김진필', text: '회원 탈퇴와 워크스페이스 삭제 API 명세 추가 예정입니다.', time: '오늘 09:55' },
    { id: 2, user: 'CodeDock', text: '리포지토리 연동 해제 정책도 문서 목록에 연결해둘게요.', time: '오늘 09:58', type: 'system' as const }
  ],
  'pull-requests': [
    {
      id: 1,
      user: 'GitHub Bot',
      text: 'PR #104 opened by 김재준: [Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
      time: '오늘 11:24',
      type: 'pr' as const,
      prNumber: 104,
      prTitle: '[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
      prStatus: 'open',
      filesChanged: 6,
      additions: 318,
      deletions: 74,
      repository: 'codedock-team/recruiting-backend',
      reviewRoomActive: true,
      approved: 1,
      pending: 1,
      aiRisk: 'Medium',
      passed: 7,
      labels: ['리팩터링', 'AI 인터뷰', '테스트'],
      prAuthor: '김재준',
      githubUser: 'kimjaejun',
      authorInitials: 'JJ',
      branch: 'refactor/ai-interview-preserve'
    },
    {
      id: 2,
      user: 'GitHub Bot',
      text: 'PR #141 opened by 김진필: WebSocket 연결 처리 메모리 누수 수정',
      time: '오늘 09:30',
      type: 'pr' as const,
      prNumber: 141,
      prStatus: 'open',
      filesChanged: 3,
      additions: 45,
      deletions: 28,
      repository: 'codeblock-team/codeblock-frontend',
      reviewRoomActive: false,
      approved: 3,
      pending: 0,
      aiRisk: 'Low',
      passed: 8,
      labels: ['버그 수정', '성능'],
      prAuthor: '김진필'
    },
    {
      id: 3,
      user: 'GitHub Bot',
      text: 'PR #140 merged by 김진현: 새 API 엔드포인트 문서 업데이트',
      time: '오늘 10:30',
      type: 'pr' as const,
      prNumber: 140,
      prStatus: 'merged',
      filesChanged: 12,
      additions: 456,
      deletions: 85,
      repository: 'codeblock-team/codeblock-frontend',
      reviewRoomActive: false,
      approved: 3,
      pending: 0,
      aiRisk: 'Low',
      passed: 7,
      labels: ['문서'],
      prAuthor: '김진현'
    }
  ],
  'ai-review': [
    { id: 1, user: 'AI Assistant', text: 'PR #234 분석 완료: 보안 취약점 없음, 코드 품질 우수', time: '오늘 11:05', type: 'system' as const },
    { id: 2, user: 'AI Assistant', text: 'PR #456의 타입스크립트 마이그레이션 리뷰 중...', time: '오늘 09:35', type: 'system' as const }
  ],
  'issues': [
    {
      id: 1,
      user: 'GitHub Bot',
      text: 'Issue #45 opened by 김진필: 로그인 페이지 반응형 깨짐 현상',
      time: '오늘 10:00',
      type: 'issue' as const,
      issueNumber: 45,
      issueTitle: '로그인 페이지 반응형 깨짐 현상',
      issueStatus: 'in_progress' as const,
      issueAuthor: '김진필',
      issueLabels: [
        { name: 'bug', color: '#EF4444' },
        { name: 'frontend', color: '#06B6D4' },
        { name: 'priority: high', color: '#F59E0B' },
      ],
      issuePriority: 'high' as const,
      issueType: 'Bug',
      issueAssignees: ['김진현', '안현'],
      issueBody: `## 문제 설명\n모바일(375px) 환경에서 로그인 페이지의 입력 폼이 화면 밖으로 넘칩니다.\n\n## 재현 방법\n1. 브라우저 DevTools에서 모바일 뷰로 전환\n2. /login 접속\n3. 이메일 입력 필드가 화면 우측으로 벗어남\n\n## 기대 동작\n모든 해상도에서 폼이 정상적으로 표시되어야 함\n\n## 환경\n- Chrome 120\n- iPhone SE (375px)`,
      issueHistory: [
        { id: 'h1', actor: '김진필', action: '이슈를 생성했습니다', time: '오늘 10:00', eventType: 'created' as const },
        { id: 'h2', actor: '김진필', action: '김진현님을 담당자로 지정했습니다', time: '오늘 10:01', eventType: 'assigned' as const },
        { id: 'h3', actor: '김진필', action: 'bug 라벨을 추가했습니다', time: '오늘 10:01', eventType: 'labeled' as const },
        { id: 'h4', actor: '김진현', action: '재현 확인했습니다. flex-wrap 설정 누락인 것 같습니다.', time: '오늘 10:30', eventType: 'commented' as const },
        { id: 'h5', actor: '김진현', action: '안현님을 담당자로 지정했습니다', time: '오늘 10:31', eventType: 'assigned' as const },
        { id: 'h6', actor: '안현', action: '상태를 Open에서 In Progress로 변경했습니다', time: '오늘 11:00', eventType: 'status_changed' as const },
      ],
    },
    {
      id: 2,
      user: 'GitHub Bot',
      text: 'Issue #46 opened by 김준우: API 응답 시간 개선 필요',
      time: '오늘 10:30',
      type: 'issue' as const,
      issueNumber: 46,
      issueTitle: 'API 응답 시간 개선 필요',
      issueStatus: 'open' as const,
      issueAuthor: '김준우',
      issueLabels: [
        { name: 'enhancement', color: '#8B5CF6' },
        { name: 'backend', color: '#06B6D4' },
        { name: 'priority: medium', color: '#F59E0B' },
      ],
      issuePriority: 'medium' as const,
      issueType: 'Enhancement',
      issueAssignees: ['김재준'],
      issueBody: `## 문제 설명\n일부 API 엔드포인트의 응답 시간이 2초 이상 소요됩니다.\n\n## 재현 방법\n1. /api/workspace/list 호출\n2. Network 탭에서 응답 시간 확인\n\n## 기대 동작\n모든 API 응답이 500ms 이내로 처리되어야 함\n\n## 환경\n- Spring Boot 3\n- Oracle DB`,
      issueHistory: [
        { id: 'h1', actor: '김준우', action: '이슈를 생성했습니다', time: '오늘 10:30', eventType: 'created' as const },
        { id: 'h2', actor: '김준우', action: 'enhancement 라벨을 추가했습니다', time: '오늘 10:30', eventType: 'labeled' as const },
        { id: 'h3', actor: '김준우', action: '김재준님을 담당자로 지정했습니다', time: '오늘 10:31', eventType: 'assigned' as const },
      ],
    },
    {
      id: 3,
      user: 'GitHub Bot',
      text: 'Issue #47 opened by 김진현: 다크모드 색상 일관성 문제',
      time: '오늘 11:00',
      type: 'issue' as const,
      issueNumber: 47,
      issueTitle: '다크모드 색상 일관성 문제',
      issueStatus: 'open' as const,
      issueAuthor: '김진현',
      issueLabels: [
        { name: 'design', color: '#EC4899' },
        { name: 'frontend', color: '#06B6D4' },
      ],
      issuePriority: 'low' as const,
      issueType: 'Design',
      issueAssignees: ['김진현'],
      issueBody: `## 문제 설명\n다크모드 전환 시 일부 컴포넌트에서 배경색과 텍스트 색상이 일치하지 않습니다.\n\n## 재현 방법\n1. 라이트 모드에서 다크 모드로 전환\n2. 설정 페이지 카드 컴포넌트 확인\n\n## 기대 동작\n다크모드에서 모든 컴포넌트가 일관된 색상 체계를 유지해야 함`,
      issueHistory: [
        { id: 'h1', actor: '김진현', action: '이슈를 생성했습니다', time: '오늘 11:00', eventType: 'created' as const },
        { id: 'h2', actor: '김진현', action: 'design 라벨을 추가했습니다', time: '오늘 11:00', eventType: 'labeled' as const },
        { id: 'h3', actor: '김진현', action: '상태를 Open에서 In Progress로 변경했습니다', time: '오늘 11:30', eventType: 'status_changed' as const },
      ],
    },
  ],
  'documentation': [
    { id: 1, user: '김진현', text: '디자인 시스템 문서 업데이트 완료', time: '오늘 09:00' },
    { id: 2, user: '김재준', text: 'API 명세서 v2.0 배포했습니다', time: '오늘 10:00' }
  ],
  'operations': [
    { id: 1, user: '시스템', text: '서버 상태: 정상 | CPU: 45% | 메모리: 62%', time: '오늘 12:00', type: 'system' as const },
    { id: 2, user: 'DevOps Bot', text: '배포 완료: production 환경 v1.2.3', time: '오늘 11:30', type: 'system' as const }
  ],
  'team': [
    { id: 1, user: '김재준', text: '팀 미팅 금요일 오후 3시로 변경되었습니다.', time: '오늘 09:00' },
    { id: 2, user: '김진필', text: '다음 주 휴가 예정입니다.', time: '오늘 10:00' }
  ],
};

// 메시지 타입별 threadReplies 키 생성 (PR/이슈/일반 채팅 충돌 방지)
function getThreadKey(msg: any): string | number {
  if (msg?.type === 'pr') return `pr-${msg.id}`;
  if (msg?.type === 'issue') return `issue-${msg.id}`;
  return msg?.id;
}

function getMessageFallbackAvatar(user?: string) {
  const trimmedUser = (user ?? "").trim();
  return trimmedUser ? trimmedUser.charAt(0).toUpperCase() : "U";
}

function mapMessageToChannelThread(message: any) {
  const user = message?.user ?? message?.senderName ?? "CodeDock";
  const body = message?.message ?? message?.text ?? "";
  const replyCount = Number(message?.replies ?? message?.replyCount ?? 0);

  return {
    ...message,
    user,
    avatar: message?.avatar ?? getMessageFallbackAvatar(user),
    avatarUrl: message?.avatarUrl,
    message: body,
    text: message?.text ?? body,
    time: message?.time ?? "",
    replies: Number.isFinite(replyCount) ? replyCount : 0
  };
}

const initialThreadReplies: Record<number | string, any[]> = {
  // ── PR 스레드 (pr-{id} 키) ──────────────────────────────────────
  // PR #104 — AI 인터뷰 리팩터 (diff seed 포함)
  'pr-1': [
    {
      id: 'seed-security-22',
      user: '김진필',
      author: '김진필',
      text: 'CSRF 비활성화 이유를 주석으로 남기면 좋을 것 같습니다.',
      time: '10:45',
      fileId: 'security',
      fileName: 'SecurityConfig.java',
      filePath: 'src/main/java/com/codedock/config',
      line: 22,
      code: 'public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {'
    },
    {
      id: 'seed-security-23',
      user: '김준우',
      author: '김준우',
      text: '동의합니다. JWT stateless 구조라면 문서화하면 좋겠어요.',
      time: '10:47',
      fileId: 'security',
      fileName: 'SecurityConfig.java',
      filePath: 'src/main/java/com/codedock/config',
      line: 23,
      code: 'http.csrf(csrf -> csrf.disable());'
    },
    { id: 'pr1-1', user: '김재준', text: '전체적으로 리팩터 방향 좋습니다. 부분 수정 유지 정책 쪽만 한번 더 확인 부탁드려요.', time: '오전 11:30' },
    { id: 'pr1-2', user: '김진필', text: '네, 해당 부분 테스트 케이스 추가해서 다시 올리겠습니다.', time: '오전 11:35' },
  ],
  // PR #141 — WebSocket 메모리 누수 수정
  'pr-2': [
    { id: 'pr2-1', user: '김진필', text: '메모리 누수 재현 확인했습니다. 연결 해제 시 cleanup 로직이 빠져 있었네요.', time: '오전 09:32' },
    { id: 'pr2-2', user: '안현', text: 'WeakReference 처리도 같이 넣어주면 좋을 것 같아요.', time: '오전 09:40' },
    { id: 'pr2-3', user: '김재준', text: '리뷰 완료했습니다. LGTM!', time: '오전 09:48' },
  ],
  // PR #140 — API 문서 업데이트 (merged)
  'pr-3': [
    { id: 'pr3-1', user: '김진현', text: 'Swagger 명세서 v2 기준으로 전부 업데이트했습니다. 확인 부탁드려요.', time: '오전 10:32' },
    { id: 'pr3-2', user: '안현', text: '엔드포인트 설명 번역 깔끔하게 됐네요!', time: '오전 10:37' },
    { id: 'pr3-3', user: '김재준', text: '확인했습니다. 바로 merge 하겠습니다.', time: '오전 10:42' },
  ],
  // ── 이슈 스레드 (issue-{id} 키) ─────────────────────────────────
  // Issue #45 — 로그인 반응형 깨짐
  'issue-1': [
    { id: 'iss1-1', user: '김진현', text: '재현 확인했습니다. flex-wrap 설정이 누락된 것 같아요.', time: '오늘 10:30' },
    { id: 'iss1-2', user: '안현', text: '모바일 375px 기준으로 수정 진행 중입니다.', time: '오늘 11:00' },
    { id: 'iss1-3', user: '김진필', text: 'iPhone SE에서도 재현됩니다. PR 올리면 바로 리뷰할게요.', time: '오늘 11:10' },
  ],
  // Issue #46 — API 응답 시간
  'issue-2': [
    { id: 'iss2-1', user: '김재준', text: 'N+1 쿼리 문제인 것 같습니다. 인덱스 추가해보겠습니다.', time: '오늘 10:35' },
    { id: 'iss2-2', user: '김진필', text: '캐싱 레이어도 고려해볼 만 합니다. Redis 적용 어떤가요?', time: '오늘 10:50' },
  ],
  // Issue #47 — 다크모드 색상
  'issue-3': [
    { id: 'iss3-1', user: '김진현', text: 'CSS 변수 적용 범위 문제입니다. 설정 페이지 카드만 따로 처리하면 될 것 같아요.', time: '오늘 11:05' },
  ],
  // ── 일반 채팅 스레드 (숫자 키, ChannelPanel GENERAL_THREADS 기준) ──
  // GENERAL id:1 — 이번 주 스프린트 계획
  1: [
    { id: 'g1-1', user: '김진필', text: '이번 주는 인증 기능 개선에 집중할 예정입니다.', time: '10:25 AM' },
    { id: 'g1-2', user: '김진현', text: 'UI 개선 작업도 같이 진행하면 좋을 것 같아요.', time: '10:30 AM' },
    { id: 'g1-3', user: '안현', text: '네, 확인했습니다! 금요일까지 완료 가능할 것 같습니다.', time: '10:35 AM' }
  ],
  // GENERAL id:2 — 새로운 API 엔드포인트
  2: [
    { id: 'g2-1', user: '김재준', text: '좋습니다! 문서도 업데이트 부탁드려요.', time: '11:50 AM' },
    { id: 'g2-2', user: '안현', text: 'Swagger 문서 자동 생성되도록 설정했습니다.', time: '12:00 PM' },
    { id: 'g2-3', user: '김진필', text: '테스트 케이스도 추가했어요.', time: '12:15 PM' },
    { id: 'g2-4', user: '김진현', text: '프론트엔드 연동 테스트 완료했습니다.', time: '12:30 PM' },
    { id: 'g2-5', user: '김재준', text: '수고하셨습니다!', time: '12:45 PM' }
  ],
  // ── 레포 채널 스레드 (ChannelPanel REPO_THREADS 기준) ──────────────
  // SECUREFLOW id:101 — 로그인 애니메이션
  101: [
    { id: 'sf101-1', user: '안현', text: '확인했습니다! 전환 속도가 훨씬 자연스러워졌어요.', time: '오늘 10:44' },
    { id: 'sf101-2', user: '김재준', text: '모바일에서도 테스트해봤는데 괜찮네요.', time: '오늘 10:50' },
  ],
  // SECUREFLOW id:102 — 크게 보기 헤더
  102: [],
  // AICHAT id:201 — API 명세 추가
  201: [
    { id: 'ai201-1', user: 'CodeDock', text: '리포지토리 연동 해제 정책도 함께 추가해두면 좋을 것 같습니다.', time: '오늘 09:57' },
  ],
  // AICHAT id:202 — 연동 해제 정책
  202: [],
  // DASHBOARD id:301 — 디자인 토큰
  301: [
    { id: 'db301-1', user: '김진현', text: '색상 조합이 정말 좋네요! 특히 primary 계열이 깔끔합니다.', time: '오늘 14:22' },
    { id: 'db301-2', user: '김재준', text: '고생하셨습니다! 다음 스프린트에 반영하겠습니다.', time: '오늘 14:28' },
  ],
  // DASHBOARD id:302 — UI 라이브러리 마이그레이션
  302: [],
};

export function ChatPage() {
  const { profile, userId } = useProfile();
  const { workspaceId: contextWorkspaceId, setWorkspaceId: setContextWorkspaceId } = useWorkspace();
  const currentDisplayName = profile.name || myProfile.name;
  const [apiWorkspaces, setApiWorkspaces] = useState<WorkspaceDto[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    const state = location.state as { workspaceId?: string | number; pendingEvent?: WorkspaceEventDto } | null;
    const pendingEvent = state?.pendingEvent ?? null;
    if (pendingEvent) pendingEventRef.current = pendingEvent;

    fetchMyWorkspaces()
      .then((workspaces) => {
        setApiWorkspaces(workspaces);
        if (workspaces.length > 0) {
          const incomingId = pendingEvent?.workspaceId ?? state?.workspaceId;
          const incomingApiId = parseWorkspaceApiId(incomingId);
          const savedApiId = parseWorkspaceApiId(getSavedJson<number | null>(LAST_WORKSPACE_KEY, null));
          // 우선순위: 명시적 진입(location.state) > 저장된 마지막 워크스페이스 > context > 첫 번째
          const target =
            (incomingApiId !== null ? workspaces.find((w) => w.id === incomingApiId) : undefined)
            ?? (savedApiId !== null ? workspaces.find((w) => w.id === savedApiId) : undefined)
            ?? (contextWorkspaceId !== null ? workspaces.find((w) => w.id === contextWorkspaceId) : undefined)
            ?? null;
          const nextWorkspace = target ?? workspaces[0];
          setSelectedWorkspace(toWorkspaceUiId(nextWorkspace.id));
          setContextWorkspaceId(nextWorkspace.id);
          // 확정된(복원/진입) 워크스페이스를 저장 — 로드 중 transient 값으로 덮어쓰지 않도록 명시 시점에만 저장
          saveJson(LAST_WORKSPACE_KEY, nextWorkspace.id);
        }
      })
      .catch(() => {})
      .finally(() => setWorkspacesLoaded(true));
  }, []);

  // presence 변경 등으로 워크스페이스별 실시간 접속 인원이 달라졌을 때 목록 카운트를 갱신.
  const refreshWorkspaceList = useCallback(() => {
    fetchMyWorkspaces().then(setApiWorkspaces).catch(() => {});
  }, []);

  // presence 이벤트가 몰려와도 목록 refetch를 한 번으로 묶는 디바운스.
  const workspaceListRefreshTimeoutRef = useRef<number | null>(null);
  const scheduleWorkspaceListRefresh = useCallback(() => {
    if (workspaceListRefreshTimeoutRef.current != null) {
      window.clearTimeout(workspaceListRefreshTimeoutRef.current);
    }
    workspaceListRefreshTimeoutRef.current = window.setTimeout(() => {
      workspaceListRefreshTimeoutRef.current = null;
      refreshWorkspaceList();
    }, 400);
  }, [refreshWorkspaceList]);

  // 내가 속한 워크스페이스 id 집합. 이 집합이 바뀔 때만 presence 구독을 재설정(카운트 변경 refetch로는 재구독 안 함).
  const workspacePresenceSubKey = useMemo(
    () => apiWorkspaces.map((w) => w.id).sort((a, b) => a - b).join(","),
    [apiWorkspaces]
  );

  const workspaceList = apiWorkspaces.length > 0
    ? apiWorkspaces.map(ws => ({ id: toWorkspaceUiId(ws.id), apiId: ws.id, name: ws.name, myRole: ws.myRole, membersOnline: ws.membersOnline ?? ws.memberCount, connected: true }))
    : DEFAULT_WORKSPACES;

  const [repositoriesImported, setRepositoriesImported] = useState(true);
  const [repositories, setRepositories] = useState<RepositoryItem[]>(() =>
    getSavedRepositories() ?? []
  );
  const [selectedRepository, setSelectedRepository] = useState<string>(() =>
    getSavedRepositories()?.[0]?.id ?? ""
  );
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const repoDropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profilePopupRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const isCreatingChannelRef = useRef(false);
  const channelActionInFlightRef = useRef(false);
  const keepFocusedMessageOnChannelChangeRef = useRef(false);

  useEffect(() => {
    if (!showRepoDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(e.target as Node)) {
        setShowRepoDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showRepoDropdown]);

  const [showRepoForm, setShowRepoForm] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>(() => {
    // 새로고침 시 overview를 거치지 않고 바로 마지막 채널로 렌더하도록 저장값으로 초기화
    const savedWorkspaceApiId = parseWorkspaceApiId(getSavedJson<number | null>(LAST_WORKSPACE_KEY, null));
    if (savedWorkspaceApiId === null) return 'overview';
    const savedChannels = getSavedJson<Record<number, string>>(LAST_CHANNEL_KEY, {});
    return savedChannels[savedWorkspaceApiId] ?? 'overview';
  });
  const selectedChannelRef = useRef(selectedChannel);
  const restoredChannelWorkspaceRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>(() =>
    getLocalPersistableMessages(
      getSavedWorkspaceScopedRecord(CHAT_MESSAGES_KEY, initialMessages),
      {},
      DEFAULT_WORKSPACE_API_ID
    )
  );
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const selectedThreadRef = useRef<any>(null);
  const [focusedMessageTarget, setFocusedMessageTarget] = useState<{ channelId: string; messageId: number } | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<number | string, any[]>>(() =>
    getLocalPersistableThreadReplies(
      getSavedWorkspaceScopedRecord(CHAT_THREAD_REPLIES_KEY, initialThreadReplies)
    )
  );
  const threadRepliesRef = useRef<Record<number | string, any[]>>(threadReplies);
  const [threadReplyCounts, setThreadReplyCounts] = useState<Record<number | string, number>>(() =>
    getSavedWorkspaceScopedRecord(CHAT_THREAD_REPLY_COUNTS_KEY, {})
  );
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>(() =>
    getSavedWorkspaceScopedRecord(CHAT_REACTIONS_KEY, {})
  );
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const prevMainExpanded = useRef(false);
  const pendingEventRef = useRef<WorkspaceEventDto | null>(null);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [chatProfilePreview, setChatProfilePreview] = useState<ChatProfilePreview | null>(null);
  const [isGeneralChannelsOpen, setIsGeneralChannelsOpen] = useState(true);
  const [expandedSidebarGroups, setExpandedSidebarGroups] = useState<Record<SidebarGroupId, boolean>>({
    documentation: true
  });
  const [expandedRepoSubmenus, setExpandedRepoSubmenus] = useState<Record<string, boolean>>({});
  const [repoMenuOpenId, setRepoMenuOpenId] = useState<string | null>(null);
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [repositoryRefreshKey, setRepositoryRefreshKey] = useState(0);
  const [channelFetchStatus, setChannelFetchStatus] = useState<ChannelFetchStatus>("idle");
  const [channelFetchError, setChannelFetchError] = useState("");
  const [realtimeConnection, setRealtimeConnection] = useState<RealtimeConnectionState>({
    status: "idle"
  });
  const [presenceOverrides, setPresenceOverrides] = useState<Record<string, string>>({});
  const [remoteTypingByChannel, setRemoteTypingByChannel] = useState<Record<string, RemoteTypingMembers>>({});
  const [remoteTypingByThread, setRemoteTypingByThread] = useState<Record<string, RemoteTypingMembers>>({});
  const remoteTypingTimeoutsRef = useRef<Record<string, number>>({});
  const remoteThreadTypingTimeoutsRef = useRef<Record<string, number>>({});
  const chatStompRef = useRef<ChatStompClient | null>(null);
  const [chatStompReadyKey, setChatStompReadyKey] = useState(0);
  const [serverBookmarkedThreadsByChannel, setServerBookmarkedThreadsByChannel] = useState<Record<string, Record<number, boolean>>>({});
  const [workspaceBookmarks, setWorkspaceBookmarks] = useState<BookmarkResponse[]>([]);
  const [workspaceMentions, setWorkspaceMentions] = useState<MentionResponse[]>([]);
  const [optimisticMentionBumps, setOptimisticMentionBumps] = useState(0);
  const [mentionPulseKey, setMentionPulseKey] = useState(0);
  const [channelBookmarkMenuOpen, setChannelBookmarkMenuOpen] = useState(false);
  const [channelMenuOpenId, setChannelMenuOpenId] = useState<string | null>(null);
  const [channelMenuPosition, setChannelMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingCustomChannelId, setEditingCustomChannelId] = useState<string | null>(null);
  const [editingCustomChannelLabel, setEditingCustomChannelLabel] = useState('');
  const [addChannelStep, setAddChannelStep] = useState<null | 'select' | 'chat' | 'repo'>(null);
  const [addChannelPosition, setAddChannelPosition] = useState<{ top: number; left: number } | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newRepoChannelUrl, setNewRepoChannelUrl] = useState('');
  const [isSubmittingChannel, setIsSubmittingChannel] = useState(false);
  const [channelCreateError, setChannelCreateError] = useState('');
  const [channelActionError, setChannelActionError] = useState('');
  const [channelActionPendingId, setChannelActionPendingId] = useState<string | null>(null);
  const [deleteChannelTargetId, setDeleteChannelTargetId] = useState<string | null>(null);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({
    ...scopeChannelRecordByWorkspace(DEFAULT_WORKSPACE_API_ID, {
      general: 3,
      'frontend-chat': 2,
      'backend-chat': 1,
      'review-room': 2,
    })
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node) &&
        profilePopupRef.current && !profilePopupRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [profileMenuOpen]);

  const [userPresence, setUserPresence] = useState<UserPresence>(() => {
    // 새로고침 후에도 사용자가 고른 상태(자리비움/방해금지 등)를 유지
    const saved = getSavedJson<string>(LAST_PRESENCE_KEY, 'active');
    return (PRESENCE_ORDER as readonly string[]).includes(saved) ? (saved as UserPresence) : 'active';
  });
  const userPresenceRef = useRef(userPresence);
  useEffect(() => {
    userPresenceRef.current = userPresence;
    saveJson(LAST_PRESENCE_KEY, userPresence);
  }, [userPresence]);
  const [notificationMode, setNotificationMode] = useState<NotificationMode>('mentions');

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(() => {
    const savedWorkspaceApiId = parseWorkspaceApiId(getSavedJson<number | null>(LAST_WORKSPACE_KEY, null));
    if (savedWorkspaceApiId !== null) return toWorkspaceUiId(savedWorkspaceApiId);
    return workspaceList[0]?.id ?? DEFAULT_WORKSPACES[0].id;
  });
  const [memberListOpen, setMemberListOpen] = useState(false);
  const memberListButtonRef = useRef<HTMLButtonElement>(null);
  const memberListPopupRef = useRef<HTMLDivElement>(null);
  const [memberListPos, setMemberListPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();


  const hasRepositories = repositoriesImported && repositories.length > 0;
  const currentWorkspace = workspaceList.find(ws => ws.id === selectedWorkspace) ?? workspaceList[0];
  const canManageWorkspaceChannels = canManageWorkspaceChannel(currentWorkspace?.myRole);
  const currentWorkspaceApiId = getWorkspaceApiId(selectedWorkspace, currentWorkspace);
  const selectedChannelMessageKey = useMemo(
    () => getWorkspaceScopedChatKey(currentWorkspaceApiId, selectedChannel),
    [currentWorkspaceApiId, selectedChannel]
  );
  const getMessageChannelKey = useCallback(
    (channelId: string) => getWorkspaceScopedChatKey(currentWorkspaceApiId, channelId),
    [currentWorkspaceApiId]
  );
  const getThreadReplyStateKey = useCallback(
    (thread: any) => getWorkspaceScopedChatKey(currentWorkspaceApiId, getThreadKey(thread)),
    [currentWorkspaceApiId]
  );
  const getInteractionStateKey = useCallback(
    (key: string | number) => getWorkspaceScopedChatKey(currentWorkspaceApiId, key),
    [currentWorkspaceApiId]
  );
  const currentThreadReplies = useMemo(
    () => getWorkspaceScopedRecordView(currentWorkspaceApiId, threadReplies),
    [currentWorkspaceApiId, threadReplies]
  );
  const currentThreadReplyCounts = useMemo(
    () => getWorkspaceScopedRecordView(currentWorkspaceApiId, threadReplyCounts),
    [currentWorkspaceApiId, threadReplyCounts]
  );
  const mergedReplyCounts = useMemo(() => {
    const counts: Record<number | string, number> = { ...currentThreadReplyCounts };
    Object.entries(currentThreadReplies).forEach(([key, replies]) => {
      counts[key] = (replies as any[]).length;
    });
    return counts;
  }, [currentThreadReplies, currentThreadReplyCounts]);
  const currentMessageReactions = useMemo(
    () => getWorkspaceScopedRecordView(currentWorkspaceApiId, messageReactions),
    [currentWorkspaceApiId, messageReactions]
  );
  const currentChannelUnreadCounts = useMemo(
    () => getWorkspaceScopedRecordView(currentWorkspaceApiId, channelUnreadCounts),
    [channelUnreadCounts, currentWorkspaceApiId]
  );
  const currentWorkspaceMemberId = useMemo(() => {
    if (userId == null) return null;
    return workspaceMembers.find((member) => Number(member.userId) === Number(userId))?.memberId ?? null;
  }, [userId, workspaceMembers]);
  const handleOpenChatProfile = useCallback((message: any) => {
    const senderMemberId = Number(message?.senderMemberId ?? message?.memberId);
    const member = Number.isFinite(senderMemberId)
      ? workspaceMembers.find((item) => Number(item.memberId) === senderMemberId)
      : workspaceMembers.find((item) => item.username === message?.user);
    const rawPresence =
      member && currentWorkspaceMemberId != null && Number(member.memberId) === Number(currentWorkspaceMemberId)
        ? userPresence
        : member
          ? presenceOverrides[String(member.memberId)] ?? member.presence ?? "offline"
          : "offline";
    const presence = (PRESENCE_ORDER as readonly string[]).includes(rawPresence)
      ? rawPresence as PresenceKey
      : "offline";

    setChatProfilePreview({
      name: member?.username ?? message?.user ?? "Unknown",
      avatarUrl: message?.avatarUrl,
      memberId: member?.memberId ?? (Number.isFinite(senderMemberId) ? senderMemberId : undefined),
      userId: member?.userId,
      email: getPublicProfileEmail(member?.email),
      role: member?.position?.trim() || formatMemberAuthority(member?.role),
      presence
    });
  }, [currentWorkspaceMemberId, presenceOverrides, userPresence, workspaceMembers]);
  const updateRealtimeConnection = useCallback((next: RealtimeConnectionState) => {
    setRealtimeConnection((prev) => {
      if (
        prev.status === next.status
        && prev.reason === next.reason
        && prev.detail === next.detail
      ) {
        return prev;
      }

      if (import.meta.env.DEV) {
        console.info("[CodeDock realtime]", next);
      }

      return next;
    });
  }, []);
  useEffect(() => {
    if (apiWorkspaces.length === 0 || contextWorkspaceId === null) return;
    const contextWorkspace = apiWorkspaces.find((workspace) => workspace.id === contextWorkspaceId);
    if (!contextWorkspace) return;

    const nextWorkspaceId = toWorkspaceUiId(contextWorkspace.id);
    if (selectedWorkspace !== nextWorkspaceId) {
      setSelectedWorkspace(nextWorkspaceId);
    }
  }, [apiWorkspaces, contextWorkspaceId, selectedWorkspace]);

  useEffect(() => {
    if (apiWorkspaces.length === 0) return;
    const hasWorkspace = apiWorkspaces.some((workspace) => workspace.id === currentWorkspaceApiId);
    if (hasWorkspace && contextWorkspaceId !== currentWorkspaceApiId) {
      setContextWorkspaceId(currentWorkspaceApiId);
    }
  }, [apiWorkspaces, contextWorkspaceId, currentWorkspaceApiId, setContextWorkspaceId]);

  const refreshWorkspaceChannels = useCallback((signal?: AbortSignal) => {
    return getWorkspaceChannels(currentWorkspaceApiId, signal ? { signal } : undefined)
      .then((channels) => {
        const sortedChannels = sortChannelsByDisplayOrder(channels);
        setApiChannels(sortedChannels);
        setChannelFetchStatus("ready");
        setChannelFetchError("");
        return sortedChannels;
      });
  }, [currentWorkspaceApiId]);

  // 백엔드 레포 목록으로 channelId 동기화 (기존 localStorage 항목 업데이트)
  useEffect(() => {
    if (!currentWorkspaceApiId || currentWorkspaceApiId <= 0) return;
    fetchWorkspaceRepositories(currentWorkspaceApiId).then((list) => {
      const wsId = String(currentWorkspaceApiId);
      const hiddenRepositories = getHiddenWorkspaceRepositories();
      const visibleBackendRepositories = list.filter((repo) =>
        !isWorkspaceRepositoryHidden(
          currentWorkspaceApiId,
          { id: `repo-${repo.id}`, name: repo.name, channelId: repo.channelId, dbRepoId: String(repo.id) },
          hiddenRepositories
        )
      );

      if (!visibleBackendRepositories.length) {
        setRepositories((prev) => {
          const next = prev.filter((repo) =>
            repo.workspaceId !== wsId
            || !isWorkspaceRepositoryHidden(currentWorkspaceApiId, repo, hiddenRepositories)
          );
          return next.length === prev.length ? prev : next;
        });
        return;
      }

      // 기존 이슈 상태 동기화 (DB meta와 실제 GitHub 이슈 상태 일치)
      visibleBackendRepositories.forEach((repo) => {
        syncRepositoryIssueStatuses(String(repo.id)).catch(() => { /* ignore */ });
      });

      const apiRepositoryEntries: RepositoryItem[] = visibleBackendRepositories.map((repo) => ({
        id: `repo-${repo.id}`,
        name: repo.name,
        openPRs: 0,
        highRisk: 0,
        activeIssues: 0,
        connected: true,
        membersOnline: 0,
        workspaceId: wsId,
        channelId: repo.channelId,
        dbRepoId: String(repo.id)
      }));

      const raw = window.localStorage.getItem(WORKSPACE_REPOS_KEY);
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return;
        let changed = false;
        const updated = parsed.filter((r) => {
          if (!r || r.workspaceId !== wsId) return true;
          const shouldKeep = !isWorkspaceRepositoryHidden(currentWorkspaceApiId, r, hiddenRepositories);
          if (!shouldKeep) changed = true;
          return shouldKeep;
        }).map((r) => {
          if (r.workspaceId !== wsId) return r;
          const match = visibleBackendRepositories.find(
            (b) => r.dbRepoId === String(b.id) || r.name === b.name
          );
          if (match && (r.channelId !== match.channelId || r.dbRepoId !== String(match.id))) {
            changed = true;
            return { ...r, channelId: match.channelId, dbRepoId: String(match.id) };
          }
          return r;
        });
        apiRepositoryEntries.forEach((entry) => {
          const index = updated.findIndex((repo) =>
            repo?.workspaceId === wsId
            && (
              repo.dbRepoId === entry.dbRepoId
              || repo.id === entry.id
              || repo.name === entry.name
            )
          );

          if (index >= 0) {
            const current = updated[index];
            if (
              current.channelId !== entry.channelId
              || current.dbRepoId !== entry.dbRepoId
              || current.id !== entry.id
            ) {
              updated[index] = { ...current, ...entry };
              changed = true;
            }
            return;
          }

          updated.push(entry);
          changed = true;
        });
        if (changed) window.localStorage.setItem(WORKSPACE_REPOS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      setRepositories((prev) => {
        let stateChanged = false;
        const next = prev.filter((repo) => {
          if (repo.workspaceId !== wsId) return true;
          const shouldKeep = !isWorkspaceRepositoryHidden(currentWorkspaceApiId, repo, hiddenRepositories);
          if (!shouldKeep) stateChanged = true;
          return shouldKeep;
        });

        apiRepositoryEntries.forEach((entry) => {
          const index = next.findIndex((repo) =>
            repo.workspaceId === wsId
            && (
              repo.dbRepoId === entry.dbRepoId
              || repo.id === entry.id
              || repo.name === entry.name
            )
          );

          if (index >= 0) {
            const current = next[index];
            if (
              current.channelId !== entry.channelId
              || current.dbRepoId !== entry.dbRepoId
              || current.id !== entry.id
              || current.workspaceId !== entry.workspaceId
            ) {
              next[index] = { ...current, ...entry };
              stateChanged = true;
            }
            return;
          }

          next.push(entry);
          stateChanged = true;
        });

        if (stateChanged) {
          setRepositoriesImported(true);
          return next;
        }

        return prev;
      });
    }).catch(() => { /* ignore */ });
  }, [currentWorkspaceApiId, repositoryRefreshKey]);

  const visibleRepositories = useMemo(() => {
    try {
      const wsId = String(currentWorkspaceApiId);
      const hiddenRepositories = getHiddenWorkspaceRepositories();
      const stateConnected = repositories.filter(
        (repo) =>
          repo
          && typeof repo.id === "string"
          && typeof repo.name === "string"
          && repo.workspaceId === wsId
          && !isWorkspaceRepositoryHidden(currentWorkspaceApiId, repo, hiddenRepositories)
      );
      if (stateConnected.length > 0) {
        return stateConnected;
      }

      const raw = window.localStorage.getItem(WORKSPACE_REPOS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const connected = parsed.filter(
            (r) =>
              r
              && typeof r.id === "string"
              && typeof r.name === "string"
              && r.workspaceId === wsId
              && !isWorkspaceRepositoryHidden(currentWorkspaceApiId, r, hiddenRepositories)
          );
          if (connected.length > 0) {
            return connected.map((r): RepositoryItem => ({
              id: r.id,
              name: r.name,
              openPRs: 0,
              highRisk: 0,
              activeIssues: 0,
              connected: true,
              membersOnline: 0,
              workspaceId: r.workspaceId,
              channelId: r.channelId,
              dbRepoId: r.dbRepoId,
            }));
          }
        }
      }
    } catch {
      // ignore
    }
    return [];
  }, [currentWorkspaceApiId, repositories]);
  const currentRepo = visibleRepositories.find(repo => repo.id === selectedRepository)
    ?? repositories.find(repo => repo.id === selectedRepository);
  const firstVisibleRepositoryId = visibleRepositories[0]?.id ?? null;
  const repositoryApiChannelByRepoId = useMemo(() => {
    const channelByRepositoryDbId = new Map<number, Channel>();

    apiChannels
      .filter(isRepositoryApiChannel)
      .forEach((channel) => {
        if (channel.githubRepositoryId != null) {
          channelByRepositoryDbId.set(Number(channel.githubRepositoryId), channel);
        }
      });

    return visibleRepositories.reduce<Record<string, Channel>>((acc, repo) => {
      const channelFromRepo = Number.isFinite(Number(repo.channelId))
        ? apiChannels.find((channel) => channel.id === Number(repo.channelId))
        : undefined;
      const channelFromGithubRepositoryId = Number.isFinite(Number(repo.dbRepoId))
        ? channelByRepositoryDbId.get(Number(repo.dbRepoId))
        : undefined;
      const channel = channelFromRepo ?? channelFromGithubRepositoryId;

      if (channel && isRepositoryApiChannel(channel)) {
        acc[repo.id] = channel;
      }

      return acc;
    }, {});
  }, [apiChannels, visibleRepositories]);
  const repositoryChannelUiIdByRepoId = useMemo(() => {
    return visibleRepositories.reduce<Record<string, string>>((acc, repo) => {
      const apiChannel = repositoryApiChannelByRepoId[repo.id];
      acc[repo.id] = apiChannel
        ? getApiChannelUiIdById(apiChannel.id)
        : REPO_CHANNEL_IDS[repo.id] ?? repo.id;
      return acc;
    }, {});
  }, [repositoryApiChannelByRepoId, visibleRepositories]);
  const getRepositoryChannelUiId = useCallback((repo: RepositoryItem) => {
    return repositoryChannelUiIdByRepoId[repo.id] ?? REPO_CHANNEL_IDS[repo.id] ?? repo.id;
  }, [repositoryChannelUiIdByRepoId]);
  useEffect(() => {
    const selectedRepo = visibleRepositories.find((repo) => repo.id === selectedRepository);
    if (!selectedRepo) return;

    const nextChannelId = repositoryChannelUiIdByRepoId[selectedRepo.id];
    if (!nextChannelId || nextChannelId === selectedChannel) return;

    const legacyChannelId = REPO_CHANNEL_IDS[selectedRepo.id] ?? selectedRepo.id;
    if (selectedChannel === legacyChannelId) {
      setSelectedChannel(nextChannelId);
    }
  }, [repositoryChannelUiIdByRepoId, selectedChannel, selectedRepository, visibleRepositories]);
  const apiChannelIdByUiChannel = useMemo(() => {
    return apiChannels.reduce<Record<string, number>>((acc, channel) => {
      acc[getApiChannelUiId(channel)] = channel.id;
      return acc;
    }, {});
  }, [apiChannels]);
  const apiChannelUiById = useMemo(() => {
    return apiChannels.reduce<Record<number, string>>((acc, channel) => {
      acc[channel.id] = getApiChannelUiId(channel);
      return acc;
    }, {});
  }, [apiChannels]);
  const currentRepositoryApiChannelId =
    currentRepo?.channelId ?? (
      currentRepo ? repositoryApiChannelByRepoId[currentRepo.id]?.id : undefined
    );
  // PR/이슈 탭은 현재 레포의 repository channel(DB id)을 공유한다.
  const activeApiChannelId =
    (selectedChannel === 'issues' || selectedChannel === 'pull-requests') && currentRepositoryApiChannelId
      ? currentRepositoryApiChannelId
      : apiChannelIdByUiChannel[selectedChannel];
  const hasActiveApiChatChannel = activeApiChannelId !== undefined;

  // pull-requests 탭 진입 시 GitHub API에서 PR 목록을 DB로 동기화한 뒤 메시지 재로드
  useEffect(() => {
    if (selectedChannel !== 'pull-requests' || !currentRepo || !activeApiChannelId) return;
    const repoDbId = Number(currentRepo.id.replace('repo-', ''));
    if (!Number.isFinite(repoDbId)) return;

    const channelKey = selectedChannelMessageKey;
    const channelId = activeApiChannelId;

    // 1) GitHub API로 새 PR 가져오기, 2) DB 기반 상태 동기화 (이슈와 동일 패턴), 3) 메시지 로드
    syncRepositoryPullRequests(repoDbId).catch(() => { /* ignore */ })
      .then(() => syncRepositoryPrStatuses(repoDbId).catch(() => { /* ignore */ }))
      .then(() => getChannelMessages(channelId, { limit: 50 }))
      .then((serverMessages) => {
        const mapped = serverMessages.map(mapChannelMessageToWorkspaceMessage);
        const filtered = mapped.filter((m) => (m as any).type === 'pr');
        setMessages((prev) => ({ ...prev, [channelKey]: filtered }));
      })
      .catch(() => { /* ignore */ });
  }, [selectedChannel, currentRepo?.id, activeApiChannelId, selectedChannelMessageKey]);

  const hasChatAccessToken = Boolean(getAccessToken());
  const realtimeConnectionBlockReason = useMemo<RealtimeConnectionReason | null>(() => {
    if (!Number.isFinite(currentWorkspaceApiId) || currentWorkspaceApiId <= 0) return "workspace-unavailable";
    if (!hasChatAccessToken) return "missing-token";
    if (channelFetchStatus === "idle" || channelFetchStatus === "loading") return "channels-loading";
    if (channelFetchStatus === "failed") return "channels-failed";
    return null;
  }, [
    channelFetchStatus,
    currentWorkspaceApiId,
    hasChatAccessToken
  ]);
  const apiCustomChannels = useMemo<CustomChannelItem[]>(() => {
    return apiChannels
      .filter((channel) => getApiChannelUiId(channel) !== "general" && !isRepositoryApiChannel(channel))
      .map((channel) => ({
        id: getApiChannelUiId(channel),
        label: cleanChannelLabel(channel.name),
        apiChannelId: channel.id,
        displayOrder: channel.displayOrder
      }));
  }, [apiChannels]);
  const allCustomChannels = useMemo(
    () => apiCustomChannels,
    [apiCustomChannels]
  );

  // repository 채널 중 워크스페이스 repository 트리에 매핑된(=이슈 탭으로 렌더링되는) 채널 id 집합.
  const claimedRepositoryChannelIds = useMemo(
    () => new Set(Object.values(repositoryApiChannelByRepoId).map((channel) => channel.id)),
    [repositoryApiChannelByRepoId]
  );
  // 어떤 repository에도 매핑되지 않은 repository 타입 채널. 커스텀 목록에서도 제외되고 repository
  // 트리에도 없어서 그대로 두면 어디에도 렌더링되지 않으므로, 전용 섹션에서 노출해 선택 가능하게 한다.
  const orphanRepositoryChannels = useMemo<CustomChannelItem[]>(() => {
    return apiChannels
      .filter((channel) => isRepositoryApiChannel(channel) && !claimedRepositoryChannelIds.has(channel.id))
      .map((channel) => ({
        id: getApiChannelUiIdById(channel.id),
        label: cleanChannelLabel(channel.name),
        apiChannelId: channel.id,
        displayOrder: channel.displayOrder
      }));
  }, [apiChannels, claimedRepositoryChannelIds]);

  // 새로고침 시 복원할 채널이 현재 워크스페이스에서 실제 선택 가능한지 검증하기 위한 id 집합
  const selectableChannelIds = useMemo(() => {
    const ids = new Set<string>();
    ALL_SIDEBAR_CHANNELS.forEach((channel) => ids.add(channel.id));
    allCustomChannels.forEach((channel) => ids.add(channel.id));
    orphanRepositoryChannels.forEach((channel) => ids.add(channel.id));
    visibleRepositories.forEach((repo) => ids.add(repo.id));
    return ids;
  }, [allCustomChannels, orphanRepositoryChannels, visibleRepositories]);

  // 마지막으로 본 채널을 워크스페이스별로 복원 (워크스페이스당 1회, 채널 로드 완료 후)
  useEffect(() => {
    if (!currentWorkspaceApiId || channelFetchStatus !== "ready") return;
    if (restoredChannelWorkspaceRef.current === currentWorkspaceApiId) return;
    restoredChannelWorkspaceRef.current = currentWorkspaceApiId;

    const saved = getSavedJson<Record<number, string>>(LAST_CHANNEL_KEY, {});
    const savedChannel = saved[currentWorkspaceApiId];
    if (savedChannel && selectableChannelIds.has(savedChannel)) {
      // 저장된 채널이 이 워크스페이스에서 유효하면 복원
      if (savedChannel !== selectedChannelRef.current) {
        setSelectedChannel(savedChannel);
      }
    } else if (!selectableChannelIds.has(selectedChannelRef.current)) {
      // 저장값이 없거나 무효이고, 현재 채널도 이 워크스페이스에서 유효하지 않으면(예: 다른 팀의
      // 채널로 초기화된 상태) overview로 폴백
      setSelectedChannel('overview');
    }
  }, [currentWorkspaceApiId, channelFetchStatus, selectableChannelIds]);

  // 채널 변경 시 워크스페이스별로 저장 (복원이 끝난 뒤에만 저장해 기본값으로 덮어쓰지 않음)
  useEffect(() => {
    if (!currentWorkspaceApiId) return;
    if (restoredChannelWorkspaceRef.current !== currentWorkspaceApiId) return;
    const saved = getSavedJson<Record<number, string>>(LAST_CHANNEL_KEY, {});
    if (saved[currentWorkspaceApiId] === selectedChannel) return;
    saveJson(LAST_CHANNEL_KEY, { ...saved, [currentWorkspaceApiId]: selectedChannel });
  }, [selectedChannel, currentWorkspaceApiId]);

  const activeRemoteTypingNames = Object.values(remoteTypingByChannel[selectedChannel] ?? {});
  const activeRemoteTypingLabel = formatRemoteTypingLabel(activeRemoteTypingNames);
  const activeThreadTypingStateKey = selectedThread
    ? String(selectedThread.backendMessageId ?? selectedThread.id)
    : "";
  const activeRemoteThreadTypingNames = activeThreadTypingStateKey
    ? Object.values(remoteTypingByThread[activeThreadTypingStateKey] ?? {})
    : [];
  const activeRemoteThreadTypingLabel = formatRemoteTypingLabel(activeRemoteThreadTypingNames);
  const activeServerBookmarkedThreadIds = serverBookmarkedThreadsByChannel[selectedChannelMessageKey] ?? {};
  // Mentions are removed from workspaceMentions on delete (server-backed), so the list is the source of truth.
  const visibleWorkspaceMentions = workspaceMentions;
  const unreadMentionCount =
    visibleWorkspaceMentions.filter((mention) => !mention.read).length + optimisticMentionBumps;

  // A WS mention arrival increments optimisticMentionBumps (current-workspace only). Replay the
  // badge pulse once per increase — not on initial load or on the reset-to-0 after a refetch.
  const prevMentionBumpsRef = useRef(optimisticMentionBumps);
  useEffect(() => {
    if (optimisticMentionBumps > prevMentionBumpsRef.current) {
      setMentionPulseKey((key) => key + 1);
    }
    prevMentionBumpsRef.current = optimisticMentionBumps;
  }, [optimisticMentionBumps]);

  const getChannelBadge = (channelId: string): string | undefined => {
    const count = currentChannelUnreadCounts[channelId];
    return count && count > 0 ? String(count) : undefined;
  };

  const closeChannelMenu = useCallback(() => {
    setChannelMenuOpenId(null);
    setChannelMenuPosition(null);
  }, []);

  const handleToggleChannelMenu = useCallback((
    channelId: string,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    if (channelMenuOpenId === channelId) {
      closeChannelMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 92;
    const viewportPadding = 12;
    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth)
    );
    const top = Math.min(
      window.innerHeight - menuHeight - viewportPadding,
      Math.max(viewportPadding, rect.bottom + 6)
    );

    setChannelMenuOpenId(channelId);
    setChannelMenuPosition({ top, left });
  }, [channelMenuOpenId, closeChannelMenu]);

  useEffect(() => {
    if (!channelMenuOpenId) return;

    const handleDismiss = () => closeChannelMenu();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChannelMenu();
    };

    window.addEventListener('resize', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [channelMenuOpenId, closeChannelMenu]);

  // Seed unread badges from the server's per-channel unreadCount ONCE per workspace. Re-running on
  // every apiChannels reference change would clobber real-time increments accumulated since the
  // fetch — after the initial seed the client owns the count (WS increments + read resets).
  const unreadSeededWorkspaceRef = useRef<number | null>(null);
  useEffect(() => {
    if (apiChannels.length === 0) return;
    if (unreadSeededWorkspaceRef.current === currentWorkspaceApiId) return;
    unreadSeededWorkspaceRef.current = currentWorkspaceApiId;

    const selectedKey = getMessageChannelKey(selectedChannelRef.current);
    setChannelUnreadCounts((prev) => {
      const nextCounts = { ...prev };
      apiChannels.forEach((channel) => {
        const channelKey = getMessageChannelKey(getApiChannelUiId(channel));
        // The channel currently in view has just been read — never seed a stale badge onto it.
        nextCounts[channelKey] = channelKey === selectedKey ? 0 : (channel.unreadCount ?? 0);
      });
      return nextCounts;
    });
  }, [apiChannels, currentWorkspaceApiId, getMessageChannelKey]);

  useEffect(() => {
    if (!currentWorkspaceApiId || userId == null) {
      setWorkspaceMembers([]);
      return;
    }

    const controller = new AbortController();
    getWorkspaceMembers(currentWorkspaceApiId, { signal: controller.signal })
      .then(setWorkspaceMembers)
      .catch(() => {
        setWorkspaceMembers([]);
      });

    return () => controller.abort();
  }, [currentWorkspaceApiId, userId]);

  const isCurrentWorkspaceMember = useCallback((memberId?: number | null) => {
    return currentWorkspaceMemberId != null
      && memberId != null
      && Number(memberId) === Number(currentWorkspaceMemberId);
  }, [currentWorkspaceMemberId]);

  useEffect(() => {
    if (!selectedChannel.startsWith(API_CHANNEL_ID_PREFIX)) return;
    if (apiChannels.length === 0) return;
    if (apiChannelIdByUiChannel[selectedChannel]) return;

    setSelectedChannel('general');
  }, [apiChannelIdByUiChannel, apiChannels.length, selectedChannel]);

  useEffect(() => {
    setChannelBookmarkMenuOpen(false);
    if (keepFocusedMessageOnChannelChangeRef.current) {
      keepFocusedMessageOnChannelChangeRef.current = false;
      return;
    }
    setFocusedMessageTarget(null);
  }, [selectedChannel]);

  const currentMessages = messages[selectedChannelMessageKey] || [];
  const currentChannelThreads = useMemo(
    () => currentMessages.map(mapMessageToChannelThread),
    [currentMessages]
  );
  const currentChannelBookmarkItems = useMemo(() => {
    return Object.keys(activeServerBookmarkedThreadIds)
      .filter((messageId) => activeServerBookmarkedThreadIds[Number(messageId)])
      .map((messageId) => {
        const numericMessageId = Number(messageId);
        const message = currentMessages.find((item) =>
          Number(item.backendMessageId ?? item.id) === numericMessageId
        );
        const content = String(message?.message ?? message?.text ?? `메시지 #${messageId}`);

        return {
          messageId: numericMessageId,
          content,
          message
        };
      });
  }, [activeServerBookmarkedThreadIds, currentMessages]);
  const workspaceBookmarkGroups = useMemo(() => {
    const groups = new Map<string, {
      channelId: string;
      channelLabel: string;
      items: Array<{ messageId: number; content: string }>;
    }>();

    workspaceBookmarks.forEach((bookmark) => {
      const uiChannelId = apiChannelUiById[bookmark.channelId] ?? String(bookmark.channelId);
      const channelStateKey = getMessageChannelKey(uiChannelId);
      const channelMeta = ALL_SIDEBAR_CHANNELS.find((channel) => channel.id === uiChannelId);
      const customChannel = allCustomChannels.find((channel) => channel.id === uiChannelId);
      const channelLabel = customChannel?.label ?? channelMeta?.label ?? `채널 #${bookmark.channelId}`;
      const loadedMessage = (messages[channelStateKey] ?? []).find((item) =>
        Number(item.backendMessageId ?? item.id) === Number(bookmark.messageId)
      );
      const existingGroup = groups.get(uiChannelId) ?? {
        channelId: uiChannelId,
        channelLabel,
        items: []
      };

      existingGroup.items.push({
        messageId: bookmark.messageId,
        content: String(loadedMessage?.message ?? loadedMessage?.text ?? bookmark.content ?? `메시지 #${bookmark.messageId}`)
      });
      groups.set(uiChannelId, existingGroup);
    });

    return Array.from(groups.values());
  }, [allCustomChannels, apiChannelUiById, getMessageChannelKey, messages, workspaceBookmarks]);
  const apiThreadTargets = useMemo(() => {
    const threadTargets = new Map<number, { channelId: string; thread: any }>();

    Object.entries(messages).forEach(([channelStateKey, channelMessages]) => {
      const workspaceId = getWorkspaceIdFromWorkspaceScopedChatKey(channelStateKey);
      if (workspaceId !== null && workspaceId !== currentWorkspaceApiId) return;

      const channelId = getChannelIdFromWorkspaceScopedChatKey(channelStateKey);
      const isRepositorySubChannel = channelId === "pull-requests" || channelId === "issues";
      if (!apiChannelIdByUiChannel[channelId] && !(isRepositorySubChannel && currentRepositoryApiChannelId)) return;

      channelMessages.forEach((message) => {
        const threadId = Number(message.backendMessageId ?? message.id);
        if (!Number.isFinite(threadId) || !message.backendMessageId) return;

        threadTargets.set(threadId, {
          channelId,
          thread: message
        });
      });
    });

    return Array.from(threadTargets.entries()).map(([threadId, target]) => ({
      threadId,
      ...target
    }));
  }, [apiChannelIdByUiChannel, currentRepositoryApiChannelId, currentWorkspaceApiId, messages]);
  // Stable signature of the subscribed channel-id set. The main WS effect re-runs only when
  // channels are added or removed — not on every channel switch or message arrival.
  const channelSubscriptionKey = useMemo(
    () => apiChannels.map((ch) => ch.id).sort((a, b) => a - b).join(","),
    [apiChannels]
  );
  // Stable signature of the subscribed thread-id set. Re-subscribing only when this changes
  // (a thread is added/removed) avoids tearing down every thread subscription on each new
  // message — the unsubscribe→subscribe gap was dropping real-time THREAD_REPLY_CREATED events.
  const threadSubscriptionKey = useMemo(
    () => apiThreadTargets.map((target) => target.threadId).sort((a, b) => a - b).join(","),
    [apiThreadTargets]
  );
  const isRepository = ['pull-requests', 'ai-review'].includes(selectedChannel);
  const sidebarColumn = "clamp(280px, 21vw, 340px)";
  const threadColumn = "clamp(320px, 26vw, 400px)";
  const gridTemplateColumns = selectedPR || selectedIssue
    ? 'minmax(0, 1fr)'
    : isMainExpanded
      ? selectedThread
        ? `${sidebarColumn} minmax(0, 1fr) ${threadColumn}`
        : `${sidebarColumn} minmax(0, 1fr)`
      : selectedThread
        ? `${sidebarColumn} minmax(0, 1fr) ${threadColumn}`
        : `${sidebarColumn} minmax(0, 1fr)`;
  const pageShellClassName = isMainExpanded
    ? "codedock-chat-expanded fixed inset-0 z-[80] mx-auto max-w-none p-[clamp(18px,2vw,28px)]"
    : "w-full max-w-[2000px] mx-auto px-[clamp(14px,2vw,24px)] py-4 pb-4";
  const pageShellStyle = isMainExpanded
    ? {
        background:
          'radial-gradient(circle at 18% 10%, rgba(var(--codedock-primary-rgb), 0.16), transparent 28%), radial-gradient(circle at 82% 0%, rgba(var(--codedock-secondary-rgb), 0.08), transparent 30%), #050b14',
        "--krds-body-xsmall": "0.875rem",
        "--krds-body-small": "1rem",
        "--krds-body-medium": "1.125rem"
      } as CSSProperties
    : undefined;
  const chatGridClassName = isMainExpanded
    ? "grid h-full min-h-0 gap-[clamp(20px,1.8vw,30px)] overflow-hidden"
    : "grid h-[calc(100svh-128px)] min-h-0 gap-[clamp(16px,1.8vw,24px)] overflow-hidden";
  const selectedChannelMeta = ALL_SIDEBAR_CHANNELS.find((channel) => channel.id === selectedChannel);
  const selectedCustomChannel = allCustomChannels.find(ch => ch.id === selectedChannel);
  const deleteChannelTarget = deleteChannelTargetId
    ? allCustomChannels.find((channel) => channel.id === deleteChannelTargetId) ?? null
    : null;
  const orderedApiChannels = useMemo(() => sortChannelsByDisplayOrder(apiChannels), [apiChannels]);
  const channelMenuTarget = channelMenuOpenId
    ? allCustomChannels.find((channel) => channel.id === channelMenuOpenId) ?? null
    : null;
  const channelMenuTargetSource = channelMenuTarget?.apiChannelId
    ? apiChannels.find((apiChannel) => apiChannel.id === channelMenuTarget.apiChannelId)
    : undefined;
  const channelMenuTargetOrderIndex = channelMenuTargetSource
    ? orderedApiChannels.findIndex((apiChannel) => apiChannel.id === channelMenuTargetSource.id)
    : -1;
  const isChannelMenuTargetPending = channelMenuTarget
    ? channelActionPendingId === channelMenuTarget.id
    : false;
  const canManageChannelMenuTarget = canManageWorkspaceChannels && Boolean(channelMenuTargetSource?.isDeletable);
  const canMoveChannelMenuTargetUp = canManageChannelMenuTarget && channelMenuTargetOrderIndex > 0;
  const canMoveChannelMenuTargetDown =
    canManageChannelMenuTarget
    && channelMenuTargetOrderIndex >= 0
    && channelMenuTargetOrderIndex < orderedApiChannels.length - 1;
  const selectedRepoForChannel = visibleRepositories.find(r => getRepositoryChannelUiId(r) === selectedChannel);
  const selectedRepositoryApiChannel = selectedRepoForChannel
    ? repositoryApiChannelByRepoId[selectedRepoForChannel.id]
    : undefined;
  const selectedOrphanRepositoryChannel = orphanRepositoryChannels.find(ch => ch.id === selectedChannel);
  const selectedRepositoryMessageView = useMemo<RepositoryMessageView | null>(() => {
    if (selectedChannel === "pull-requests" || selectedChannel === "issues") {
      return selectedChannel;
    }

    if (selectedRepoForChannel || selectedOrphanRepositoryChannel) {
      return "repository";
    }

    return null;
  }, [selectedChannel, selectedOrphanRepositoryChannel, selectedRepoForChannel]);
  const selectedChannelTitle = selectedChannel === 'pull-requests'
    ? `${cleanChannelLabel(currentRepo?.name ?? '레포')} - PR`
    : selectedChannel === 'issues'
    ? `${cleanChannelLabel(currentRepo?.name ?? '레포')} - 이슈`
    : selectedRepoForChannel
    ? cleanChannelLabel(selectedRepoForChannel.name)
    : selectedOrphanRepositoryChannel?.label
    ?? selectedCustomChannel?.label
    ?? selectedChannelMeta?.label
    ?? selectedChannel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const realtimeConnectionNotice = useMemo(
    () => getRealtimeConnectionNotice(realtimeConnection, channelFetchError),
    [channelFetchError, realtimeConnection]
  );
  const shouldShowRealtimeConnectionNotice =
    Boolean(realtimeConnectionNotice)
    && !['overview', 'api-spec', 'erd', 'docs', 'work-board', 'team'].includes(selectedChannel);
  const selectedRepositoryName = repositories.find((repo) => repo.id === selectedRepository)?.name ?? '전체 리포지토리';

  const currentPresence = presenceOptions.find((option) => option.id === userPresence) ?? presenceOptions[0];
  const currentNotificationMode = notificationOptions.find((option) => option.id === notificationMode) ?? notificationOptions[0];
  const CurrentNotificationIcon = currentNotificationMode.icon;

  useEffect(() => {
    if (!memberListOpen) { setMemberListPos(null); return; }
    if (memberListButtonRef.current) {
      const rect = memberListButtonRef.current.getBoundingClientRect();
      setMemberListPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 220) });
    }
    const handleOutside = (e: MouseEvent) => {
      if (
        memberListButtonRef.current && !memberListButtonRef.current.contains(e.target as Node) &&
        memberListPopupRef.current && !memberListPopupRef.current.contains(e.target as Node)
      ) setMemberListOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [memberListOpen]);

  // Sorted team member list for the current workspace — used by the member list popup.
  // Order: presence group (active→away→busy→offline) → role privilege → Korean alphabetical.
  // presence는 BE가 신뢰원: 실시간 override(스냅샷+브로드캐스트)가 있으면 그것을, 없으면 멤버 목록의 마지막
  // 상태를 사용한다. (WS 연결 여부로 화면에서 강제 offline 처리하지 않음 — 실제 접속자를 가리는 문제 방지)
  const sortedWorkspaceMembers = useMemo(() => {
    const resolvePresence = (m: WorkspaceMember): PresenceKey => {
      if (currentWorkspaceMemberId != null && Number(m.memberId) === Number(currentWorkspaceMemberId)) {
        return userPresence as PresenceKey;
      }
      const raw = presenceOverrides[String(m.memberId)] ?? m.presence ?? 'active';
      return (PRESENCE_ORDER as readonly string[]).includes(raw) ? (raw as PresenceKey) : 'active';
    };
    return workspaceMembers
      .map((m) => {
        const presence = resolvePresence(m);
        const authority = (m.role ?? '').toLowerCase();
        return {
          id: String(m.memberId),
          name: m.username,
          // 표시: 직무(position)가 있으면 우선, 없으면 권한 한글 라벨
          role: m.position?.trim() || formatMemberAuthority(m.role),
          authority,
          initials: (m.username?.charAt(0) ?? '?').toUpperCase(),
          online: presence !== 'offline',
          presence,
        };
      })
      .sort((a, b) => {
        const pA = PRESENCE_ORDER.indexOf(a.presence);
        const pB = PRESENCE_ORDER.indexOf(b.presence);
        if (pA !== pB) return pA - pB;
        // presence 다음은 권한(owner→admin→editor→viewer) 순, 그다음 이름
        const rA = AUTHORITY_ORDER.indexOf(a.authority);
        const rB = AUTHORITY_ORDER.indexOf(b.authority);
        const priA = rA === -1 ? AUTHORITY_ORDER.length : rA;
        const priB = rB === -1 ? AUTHORITY_ORDER.length : rB;
        if (priA !== priB) return priA - priB;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [workspaceMembers, presenceOverrides, currentWorkspaceMemberId, userPresence]);

  // 현재 워크스페이스의 접속 인원을 실제 멤버 + 실시간 presence로 계산.
  // offline만 제외(활동중/자리비움/방해금지는 접속 중). 본인은 userPresence, 타인은 실시간 override > 멤버 초기 presence.
  // 다른 워크스페이스는 실시간 presence가 없으므로 표시 측에서 membersOnline(총원)으로 폴백함.
  const workspaceOnlineCounts = useMemo(() => {
    if (!selectedWorkspace || workspaceMembers.length === 0) return {};
    const onlineCount = workspaceMembers.reduce((acc, member) => {
      const isSelf = currentWorkspaceMemberId != null && Number(member.memberId) === Number(currentWorkspaceMemberId);
      const presence = isSelf
        ? userPresence
        : (presenceOverrides[String(member.memberId)] ?? member.presence ?? 'active');
      return acc + (presence !== 'offline' ? 1 : 0);
    }, 0);
    return { [selectedWorkspace]: onlineCount };
  }, [selectedWorkspace, workspaceMembers, presenceOverrides, currentWorkspaceMemberId, userPresence]);

  // 워크스페이스 진입/전환 시 현재 presence를 자동 송신 → 다른 멤버 화면에 접속 중으로 즉시 표시
  useEffect(() => {
    if (!currentWorkspaceApiId) return;
    updatePresence(currentWorkspaceApiId, userPresenceRef.current).catch(() => {});
  }, [currentWorkspaceApiId]);

  // 페이지 이탈 시 offline 송신 (best-effort). 탭 강제 종료 등 비정상 종료는 BE WS disconnect 감지가 필요(별건).
  useEffect(() => {
    if (!currentWorkspaceApiId) return;
    const handleLeave = () => {
      updatePresence(currentWorkspaceApiId, 'offline').catch(() => {});
    };
    window.addEventListener('beforeunload', handleLeave);
    return () => window.removeEventListener('beforeunload', handleLeave);
  }, [currentWorkspaceApiId]);

  const persistableLocalMessages = useMemo(
    () => getLocalPersistableMessages(messages, apiChannelIdByUiChannel, currentWorkspaceApiId),
    [apiChannelIdByUiChannel, currentWorkspaceApiId, messages]
  );
  const persistableLocalThreadReplies = useMemo(
    () => getLocalPersistableThreadReplies(threadReplies),
    [threadReplies]
  );

  useEffect(() => {
    if (!isMainExpanded) return;

    const handleEscapeExpandedView = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMainExpanded(false);
    };

    window.addEventListener('keydown', handleEscapeExpandedView);
    return () => window.removeEventListener('keydown', handleEscapeExpandedView);
  }, [isMainExpanded]);

  useEffect(() => {
    if (!repositoriesImported) return;
    saveRepositoryImportPreference();
    saveRepositories(repositories);
  }, [repositories, repositoriesImported]);

  useEffect(() => {
    if (!firstVisibleRepositoryId) return;

    setExpandedRepoSubmenus((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, firstVisibleRepositoryId)) {
        return prev;
      }

      return {
        ...prev,
        [firstVisibleRepositoryId]: true
      };
    });
  }, [firstVisibleRepositoryId]);

  useEffect(() => {
    return scheduleSaveJson(CHAT_MESSAGES_KEY, persistableLocalMessages);
  }, [persistableLocalMessages]);

  useEffect(() => {
    threadRepliesRef.current = threadReplies;
    return scheduleSaveJson(CHAT_THREAD_REPLIES_KEY, persistableLocalThreadReplies);
  }, [persistableLocalThreadReplies, threadReplies]);

  useEffect(() => {
    return scheduleSaveJson(CHAT_THREAD_REPLY_COUNTS_KEY, threadReplyCounts);
  }, [threadReplyCounts]);

  useEffect(() => {
    setSelectedThread(null);
  }, [selectedChannel]);

  useEffect(() => {
    setSelectedThread(null);
    setSelectedPR(null);
    setSelectedIssue(null);
    setRemoteTypingByChannel({});
    setRemoteTypingByThread({});
    // 이전 워크스페이스의 실시간 presence가 다른 워크스페이스 멤버 상태로 잘못 비치지 않도록 초기화.
    setPresenceOverrides({});
  }, [currentWorkspaceApiId]);

  useEffect(() => {
    return scheduleSaveJson(CHAT_REACTIONS_KEY, messageReactions);
  }, [messageReactions]);

  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  useEffect(() => {
    setChannelUnreadCounts(prev => {
      if (!prev[selectedChannelMessageKey]) return prev;
      return { ...prev, [selectedChannelMessageKey]: 0 };
    });
  }, [selectedChannelMessageKey]);

  useEffect(() => {
    if (!activeApiChannelId) return;

    markChannelAsRead(activeApiChannelId).catch(() => {
      // The local unread count is already cleared; server read status waits for auth/API availability.
    });
  }, [activeApiChannelId]);

  const applyWorkspaceBookmarks = useCallback((bookmarks: BookmarkResponse[]) => {
    setWorkspaceBookmarks(bookmarks);

    const nextBookmarks = bookmarks.reduce<Record<string, Record<number, boolean>>>((acc, bookmark) => {
      const uiChannelId = apiChannelUiById[bookmark.channelId] ?? String(bookmark.channelId);
      const channelStateKey = getMessageChannelKey(uiChannelId);
      acc[channelStateKey] = {
        ...(acc[channelStateKey] ?? {}),
        [bookmark.messageId]: true
      };
      return acc;
    }, {});

    setServerBookmarkedThreadsByChannel((prev) => ({
      ...Object.fromEntries(
        Object.entries(prev).filter(([key]) => getWorkspaceIdFromWorkspaceScopedChatKey(key) !== currentWorkspaceApiId)
      ),
      ...nextBookmarks
    }));
  }, [apiChannelUiById, currentWorkspaceApiId, getMessageChannelKey]);

  useEffect(() => {
    if (!currentWorkspaceApiId) return;
    const controller = new AbortController();

    getWorkspaceBookmarks(currentWorkspaceApiId, {
      signal: controller.signal
    })
      .then(applyWorkspaceBookmarks)
      .catch(() => {
        // Keep local bookmark state when the backend is unavailable.
      });

    return () => controller.abort();
  }, [applyWorkspaceBookmarks, currentWorkspaceApiId]);

  useEffect(() => {
    if (!currentWorkspaceApiId) return;
    const controller = new AbortController();

    setOptimisticMentionBumps(0);
    getWorkspaceMentions(currentWorkspaceApiId, {
      signal: controller.signal
    })
      .then(setWorkspaceMentions)
      .catch(() => {
        // Mentions are an enhancement; the chat flow should continue without them.
      });

    return () => controller.abort();
  }, [currentWorkspaceApiId]);

  const incrementUnreadCount = useCallback((channelId: string) => {
    if (channelId === selectedChannelRef.current) return;
    const channelStateKey = getMessageChannelKey(channelId);

    setChannelUnreadCounts((prev) => ({
      ...prev,
      [channelStateKey]: (prev[channelStateKey] ?? 0) + 1
    }));
  }, [getMessageChannelKey]);

  // A message arrived in the channel the user is actively viewing: the local badge stays 0, but the
  // server's last-read pointer must advance too — otherwise a refresh re-counts these as unread.
  // Trailing-debounced per channel so a burst of incoming messages collapses to a single PUT.
  const activeChannelReadTimeoutsRef = useRef<Record<number, number>>({});
  const markActiveChannelRead = useCallback((apiChannelId: number) => {
    const timeouts = activeChannelReadTimeoutsRef.current;
    if (timeouts[apiChannelId]) {
      window.clearTimeout(timeouts[apiChannelId]);
    }
    timeouts[apiChannelId] = window.setTimeout(() => {
      delete timeouts[apiChannelId];
      markChannelAsRead(apiChannelId).catch(() => {
        // Best-effort; the local badge is already 0 and the next channel entry retries the sync.
      });
    }, 500);
  }, []);

  const applyChannelReadStatus = useCallback((status: ChannelReadStatusResponse) => {
    if (status.workspaceId !== undefined && Number(status.workspaceId) !== Number(currentWorkspaceApiId)) return;
    if (
      status.workspaceMemberId !== undefined
      && currentWorkspaceMemberId !== null
      && Number(status.workspaceMemberId) !== Number(currentWorkspaceMemberId)
    ) {
      return;
    }

    const uiChannelId = apiChannelUiById[status.channelId] ?? getApiChannelUiIdById(status.channelId);
    const channelStateKey = getMessageChannelKey(uiChannelId);
    const nextUnreadCount = typeof status.unreadCount === "number"
      ? Math.max(0, status.unreadCount)
      : 0;

    setChannelUnreadCounts((prev) => ({
      ...prev,
      [channelStateKey]: nextUnreadCount
    }));
  }, [apiChannelUiById, currentWorkspaceApiId, currentWorkspaceMemberId, getMessageChannelKey]);

  const handleWorkspaceChannelEvent = useCallback((eventType: string, payload: Partial<Channel> & { channelId?: number }) => {
    const eventWorkspaceId = payload.workspaceId ?? currentWorkspaceApiId;
    if (eventWorkspaceId !== undefined && Number(eventWorkspaceId) !== Number(currentWorkspaceApiId)) return;

    const channelId = Number(payload.id ?? payload.channelId);
    if (!Number.isFinite(channelId)) {
      refreshWorkspaceChannels().catch(() => {});
      setRepositoryRefreshKey((key) => key + 1);
      return;
    }

    if (eventType === CHAT_EVENT_TYPE.CHANNEL_DELETED) {
      setApiChannels((prev) => prev.filter((channel) => channel.id !== channelId));
    } else if (typeof payload.name === "string" && typeof payload.channelType === "string") {
      const nextChannel = payload as Channel;
      setApiChannels((prev) => {
        const exists = prev.some((channel) => channel.id === nextChannel.id);
        return exists
          ? prev.map((channel) => channel.id === nextChannel.id ? { ...channel, ...nextChannel } : channel)
          : [...prev, nextChannel];
      });
    }

    refreshWorkspaceChannels().catch(() => {});
    setRepositoryRefreshKey((key) => key + 1);
  }, [currentWorkspaceApiId, refreshWorkspaceChannels]);

  const handleMentionDeletedEvent = useCallback((payload: MentionDeletedEvent) => {
    if (payload.workspaceId !== undefined && Number(payload.workspaceId) !== Number(currentWorkspaceApiId)) return;

    const mentionId = Number(payload.mentionId ?? payload.id);
    if (!Number.isFinite(mentionId)) {
      if (!currentWorkspaceApiId) return;
      getWorkspaceMentions(currentWorkspaceApiId)
        .then(setWorkspaceMentions)
        .catch(() => {});
      return;
    }

    setWorkspaceMentions((prev) => prev.filter((mention) => Number(mention.id) !== mentionId));
    setOptimisticMentionBumps((count) => Math.max(0, count - 1));
  }, [currentWorkspaceApiId]);

  const setServerBookmarkState = useCallback((uiChannelId: string, messageId: number, bookmarked: boolean) => {
    setServerBookmarkedThreadsByChannel((prev) => {
      const channelStateKey = getMessageChannelKey(uiChannelId);
      const nextChannelBookmarks = { ...(prev[channelStateKey] ?? {}) };

      if (bookmarked) {
        nextChannelBookmarks[messageId] = true;
      } else {
        delete nextChannelBookmarks[messageId];
      }

      return {
        ...prev,
        [channelStateKey]: nextChannelBookmarks
      };
    });
  }, [getMessageChannelKey]);

  const handleToggleThreadBookmark = useCallback((thread: any, nextBookmarked: boolean) => {
    const channelId = Number(thread.backendChannelId ?? activeApiChannelId);
    const messageId = Number(thread.backendMessageId ?? thread.id);
    const uiChannelId = Number.isFinite(channelId)
      ? apiChannelUiById[channelId] ?? selectedChannel
      : selectedChannel;

    if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) return;

    setServerBookmarkState(uiChannelId, messageId, nextBookmarked);

    toggleMessageBookmark(channelId, messageId)
      .then((response) => {
        setServerBookmarkState(uiChannelId, response.messageId, response.bookmarked);
        void getWorkspaceBookmarks(currentWorkspaceApiId)
          .then(applyWorkspaceBookmarks)
          .catch(() => {
            // The optimistic state above remains valid when the bookmark list refresh fails.
          });
      })
      .catch(() => {
        setServerBookmarkState(uiChannelId, messageId, !nextBookmarked);
      });
  }, [activeApiChannelId, apiChannelUiById, applyWorkspaceBookmarks, currentWorkspaceApiId, selectedChannel, setServerBookmarkState]);

  const handleMarkMentionAsRead = useCallback((mentionId: number) => {
    setWorkspaceMentions((prev) =>
      prev.map((mention) => mention.id === mentionId ? { ...mention, read: true } : mention)
    );

    markMentionAsRead(mentionId)
      .then((updatedMention) => {
        setWorkspaceMentions((prev) =>
          prev.map((mention) => mention.id === mentionId ? updatedMention : mention)
        );
      })
      .catch(() => {
        setWorkspaceMentions((prev) =>
          prev.map((mention) => mention.id === mentionId ? { ...mention, read: false } : mention)
        );
      });
  }, []);

  const handleDeleteMention = useCallback((mentionId: number) => {
    // Optimistically drop the mention so the badge/list update instantly; the server DELETE makes it
    // permanent (a local-only hide would reappear on refresh once getWorkspaceMentions re-fetches).
    setWorkspaceMentions((prev) => prev.filter((mention) => mention.id !== mentionId));

    deleteMention(mentionId).catch(() => {
      // The delete failed, so the mention still exists server-side — re-sync from the server to
      // restore it (authoritative, and avoids fragile client-side rollback bookkeeping).
      if (!currentWorkspaceApiId) return;
      getWorkspaceMentions(currentWorkspaceApiId)
        .then(setWorkspaceMentions)
        .catch(() => {
          // Keep the optimistic state if the refetch also fails.
        });
    });
  }, [currentWorkspaceApiId]);

  const focusChannelMessage = useCallback((channelId: string, messageId: number) => {
    keepFocusedMessageOnChannelChangeRef.current = channelId !== selectedChannelRef.current;
    setSelectedChannel(channelId);
    setSelectedThread(null);
    setSelectedPR(null);
    setSelectedIssue(null);
    setFocusedMessageTarget({ channelId, messageId });
  }, []);

  // pending 실패 타임아웃 핸들을 clientMessageId로 추적 → 서버 확인이 도착하면 취소(오발동 방지).
  const pendingFailureTimeoutsRef = useRef<Record<string, number>>({});
  // server id(시퀀스, 작은 값)와 겹치지 않도록 큰 base + 시퀀스로 충돌 없는 로컬 pending id를 만든다.
  const pendingMessageSeqRef = useRef(0);
  const nextPendingMessageId = useCallback(() => {
    pendingMessageSeqRef.current = (pendingMessageSeqRef.current + 1) % 1000;
    return Date.now() * 1000 + pendingMessageSeqRef.current;
  }, []);

  const clearPendingFailureTimeout = useCallback((clientMessageId?: string | null) => {
    if (!clientMessageId) return;
    const handle = pendingFailureTimeoutsRef.current[clientMessageId];
    if (handle !== undefined) {
      window.clearTimeout(handle);
      delete pendingFailureTimeoutsRef.current[clientMessageId];
    }
  }, []);

  // 언마운트 시 남아 있는 pending 실패 타이머를 모두 정리(언마운트 후 setState 방지).
  useEffect(() => {
    const timeouts = pendingFailureTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach((handle) => window.clearTimeout(handle));
    };
  }, []);

  const appendServerMessage = useCallback((channelId: string, message: ChannelMessage) => {
    const mappedMessage = mapChannelMessageToWorkspaceMessage(message);
    const channelStateKey = getMessageChannelKey(channelId);
    const serverClientMessageId = message.clientMessageId ?? null;

    // 서버가 메시지를 확정했으므로, 이 전송에 걸려 있던 실패 타임아웃을 취소(오발동 방지).
    clearPendingFailureTimeout(serverClientMessageId);

    setMessages((prev) => {
      const currentChannelMessages = prev[channelStateKey] || [];
      const alreadyExists = currentChannelMessages.some((item) =>
        item.backendMessageId === message.id || (
          item.backendChannelId === message.channelId
          && item.id === message.id
        )
      );

      if (alreadyExists) return prev;

      const withoutMatchingPending = currentChannelMessages.filter((item) => {
        if (!item.pending) return true;
        if (serverClientMessageId) {
          // clientMessageId를 echo받은 경우: 그 키와 일치하는 pending만 제거.
          // (동일 내용 메시지를 연속 전송해도 서로의 pending을 오인 제거하지 않음)
          return item.clientMessageId !== serverClientMessageId;
        }
        // 봇/레거시 등 clientMessageId가 없을 때만 내용+발신자 추정으로 폴백.
        const sameContentAndSender =
          item.text === message.content
          && (
            item.senderMemberId != null
              ? Number(item.senderMemberId) === Number(message.senderMemberId)
              : item.user === message.senderName || item.backendChannelId === message.channelId
          );
        return !sameContentAndSender;
      });

      return {
        ...prev,
        [channelStateKey]: [...withoutMatchingPending, mappedMessage]
      };
    });
  }, [getMessageChannelKey, clearPendingFailureTimeout]);

  const replaceServerMessage = useCallback((channelId: string, message: ChannelMessage) => {
    const mappedMessage = mapChannelMessageToWorkspaceMessage(message);
    const channelStateKey = getMessageChannelKey(channelId);

    setMessages((prev) => ({
      ...prev,
      [channelStateKey]: (prev[channelStateKey] || []).map((item) =>
        item.backendMessageId === message.id || item.id === message.id
          ? { ...item, ...mappedMessage }
          : item
      )
    }));
    setSelectedThread((prevThread: any) =>
      prevThread && Number(prevThread.backendMessageId ?? prevThread.id) === message.id
        ? { ...prevThread, ...mappedMessage }
        : prevThread
    );
  }, [getMessageChannelKey]);

  const attachToExistingServerMessage = useCallback((
    channelId: string,
    apiChannelId: number,
    messageId: number,
    attachments: MessageAttachment[]
  ) => {
    if (attachments.some((attachment) => !isSendableMessageAttachment(attachment))) {
      return Promise.reject(new Error("File/Image attachments must use a public URL. Binary upload is not supported yet."));
    }

    const attachmentPayload = attachments.map(toMessageAttachmentRequest);
    if (attachmentPayload.length === 0 || attachmentPayload.length > 10) {
      return Promise.resolve([]);
    }

    return addMessageAttachments(apiChannelId, messageId, attachmentPayload).then((serverAttachments) => {
      const mappedAttachments = serverAttachments.map(mapMessageAttachmentResponse);
      const channelStateKey = getMessageChannelKey(channelId);

      setMessages((prev) => ({
        ...prev,
        [channelStateKey]: (prev[channelStateKey] || []).map((item) =>
          Number(item.backendMessageId ?? item.id) === messageId
            ? { ...item, attachments: [...(item.attachments ?? []), ...mappedAttachments] }
            : item
        )
      }));
      setSelectedThread((prevThread: any) =>
        prevThread && Number(prevThread.backendMessageId ?? prevThread.id) === messageId
          ? { ...prevThread, attachments: [...(prevThread.attachments ?? []), ...mappedAttachments] }
          : prevThread
      );

      return mappedAttachments;
    });
  }, [getMessageChannelKey]);

  const deleteExistingServerMessageAttachment = useCallback((
    channelId: string,
    apiChannelId: number,
    messageId: number,
    attachmentId: number
  ) => {
    if (!Number.isFinite(apiChannelId) || !Number.isFinite(messageId) || !Number.isFinite(attachmentId)) {
      return Promise.reject(new Error("삭제할 첨부파일 정보를 확인할 수 없습니다."));
    }

    return deleteMessageAttachment(apiChannelId, messageId, attachmentId).then(() => {
      const channelStateKey = getMessageChannelKey(channelId);
      const removeAttachment = (attachments?: MessageAttachment[]) =>
        (attachments ?? []).filter((attachment) => Number(attachment.id) !== attachmentId);

      setMessages((prev) => ({
        ...prev,
        [channelStateKey]: (prev[channelStateKey] || []).map((item) =>
          Number(item.backendMessageId ?? item.id) === messageId
            ? { ...item, attachments: removeAttachment(item.attachments) }
            : item
        )
      }));
      setSelectedThread((prevThread: any) =>
        prevThread && Number(prevThread.backendMessageId ?? prevThread.id) === messageId
          ? { ...prevThread, attachments: removeAttachment(prevThread.attachments) }
          : prevThread
      );
    });
  }, [getMessageChannelKey]);

  const appendServerThreadReply = useCallback((thread: any, reply: ThreadReply) => {
    const threadKey = getThreadReplyStateKey(thread);
    const mappedReply = mapThreadReplyToWorkspaceMessage(reply);
    const currentReplies = threadRepliesRef.current[threadKey] ?? [];
    const alreadyExists = currentReplies.some((item) =>
      Number(item.backendReplyId ?? item.id) === reply.id
    );

    if (alreadyExists) return;

    const pendingIndex = currentReplies.findIndex((item) =>
      item.pending
      && item.text === reply.content
      && (!item.backendThreadId || Number(item.backendThreadId) === Number(reply.threadId))
      && (item.senderMemberId == null || Number(item.senderMemberId) === Number(reply.senderMemberId))
    );
    const nextReplies = pendingIndex >= 0
      ? currentReplies.map((item, index) => index === pendingIndex
        ? {
            ...item,
            ...mappedReply,
            pending: false,
            serverSyncState: undefined,
            sendError: undefined
          }
        : item
      )
      : [...currentReplies, mappedReply];

    const nextThreadReplies = {
      ...threadRepliesRef.current,
      [threadKey]: nextReplies
    };

    threadRepliesRef.current = nextThreadReplies;
    setThreadReplies(nextThreadReplies);
    setThreadReplyCounts((prev) => ({
      ...prev,
      [threadKey]: Math.max(prev[threadKey] ?? 0, nextReplies.length)
    }));
    setSelectedThread((prevThread: any) =>
      prevThread && prevThread.id === thread.id
        ? {
            ...prevThread,
            replies: Math.max(prevThread.replies ?? 0, nextReplies.length),
            lastReply: mappedReply.user
          }
        : prevThread
    );
    setSelectedPR((prevPr: any) =>
      prevPr && getThreadReplyStateKey(prevPr) === threadKey
        ? {
            ...prevPr,
            replies: Math.max(prevPr.replies ?? 0, nextReplies.length)
          }
        : prevPr
    );
    setSelectedIssue((prevIssue: any) =>
      prevIssue && getThreadReplyStateKey(prevIssue) === threadKey
        ? {
            ...prevIssue,
            replies: Math.max(prevIssue.replies ?? 0, nextReplies.length)
          }
        : prevIssue
    );
  }, [getThreadReplyStateKey]);

  // 실시간 답글 수정/삭제 수신 시 기존 답글을 갱신(삭제는 매퍼가 deleted 플래그 부여). 목록에 없으면 무시.
  const replaceServerThreadReply = useCallback((thread: any, reply: ThreadReply) => {
    const threadKey = getThreadReplyStateKey(thread);
    const mappedReply = mapThreadReplyToWorkspaceMessage(reply);
    const currentReplies = threadRepliesRef.current[threadKey] ?? [];
    let found = false;
    const nextReplies = currentReplies.map((item) => {
      if (Number(item.backendReplyId ?? item.id) === reply.id) {
        found = true;
        return { ...item, ...mappedReply };
      }
      return item;
    });
    if (!found) return;

    const nextThreadReplies = { ...threadRepliesRef.current, [threadKey]: nextReplies };
    threadRepliesRef.current = nextThreadReplies;
    setThreadReplies(nextThreadReplies);
  }, [getThreadReplyStateKey]);

  const markPendingMessageFailed = useCallback((channelStateKey: string, pendingMessageId: number, detail: string) => {
    setMessages((prev) => {
      const currentMessagesForChannel = prev[channelStateKey] || [];
      let changed = false;
      const nextMessagesForChannel = currentMessagesForChannel.map((item) => {
        if (item.id === pendingMessageId && item.pending && item.serverSyncState !== "failed") {
          changed = true;
          return {
            ...item,
            pending: false,
            serverSyncState: "failed",
            sendError: detail
          };
        }

        return item;
      });

      return !changed
        ? prev
        : {
            ...prev,
            [channelStateKey]: nextMessagesForChannel
          };
    });
  }, []);

  const failLatestPendingMessage = useCallback((detail: string) => {
    const channelStateKey = getMessageChannelKey(selectedChannelRef.current);

    setMessages((prev) => {
      const currentMessagesForChannel = prev[channelStateKey] || [];
      const pendingIndex = findLatestPendingIndex(currentMessagesForChannel);

      if (pendingIndex < 0) return prev;

      return {
        ...prev,
        [channelStateKey]: currentMessagesForChannel.map((item, index) =>
          index === pendingIndex
            ? {
                ...item,
                pending: false,
                serverSyncState: "failed",
                sendError: detail
              }
            : item
        )
      };
    });
  }, [getMessageChannelKey]);

  const markPendingThreadReplyFailed = useCallback((threadKey: string | number, pendingReplyId: string | number, detail: string) => {
    const currentReplies = threadRepliesRef.current[threadKey] || [];
    let changed = false;
    const nextReplies = currentReplies.map((item) => {
      if (item.id === pendingReplyId && item.pending && item.serverSyncState !== "failed") {
        changed = true;
        return {
          ...item,
          pending: false,
          serverSyncState: "failed",
          sendError: detail
        };
      }

      return item;
    });

    if (!changed) return;

    const nextThreadReplies = {
      ...threadRepliesRef.current,
      [threadKey]: nextReplies
    };
    threadRepliesRef.current = nextThreadReplies;
    setThreadReplies(nextThreadReplies);
  }, []);

  const failLatestPendingThreadReply = useCallback((detail: string) => {
    const thread = selectedThreadRef.current;
    if (!thread) return;

    const threadKey = getThreadReplyStateKey(thread);
    const currentReplies = threadRepliesRef.current[threadKey] || [];
    const pendingIndex = findLatestPendingIndex(currentReplies);
    if (pendingIndex < 0) return;

    const nextReplies = currentReplies.map((item, index) =>
      index === pendingIndex
        ? {
            ...item,
            pending: false,
            serverSyncState: "failed",
            sendError: detail
          }
        : item
    );

    const nextThreadReplies = {
      ...threadRepliesRef.current,
      [threadKey]: nextReplies
    };
    threadRepliesRef.current = nextThreadReplies;
    setThreadReplies(nextThreadReplies);
  }, [getThreadReplyStateKey]);

  const schedulePendingMessageFailure = useCallback((channelStateKey: string, pendingMessageId: number, clientMessageId?: string) => {
    const handle = window.setTimeout(() => {
      if (clientMessageId) {
        delete pendingFailureTimeoutsRef.current[clientMessageId];
      }
      markPendingMessageFailed(
        channelStateKey,
        pendingMessageId,
        "Realtime confirmation timed out. Please try again."
      );
    }, REALTIME_PENDING_TIMEOUT_MS);
    if (clientMessageId) {
      pendingFailureTimeoutsRef.current[clientMessageId] = handle;
    }
  }, [markPendingMessageFailed]);

  const schedulePendingThreadReplyFailure = useCallback((threadKey: string | number, pendingReplyId: string | number) => {
    window.setTimeout(() => {
      markPendingThreadReplyFailed(
        threadKey,
        pendingReplyId,
        "Realtime confirmation timed out. Please try again."
      );
    }, REALTIME_PENDING_TIMEOUT_MS);
  }, [markPendingThreadReplyFailed]);

  const handleRealtimeError = useCallback((error: ApiErrorResponse) => {
    const detail = getRealtimeApiErrorMessage(error);

    failLatestPendingMessage(detail);
    failLatestPendingThreadReply(detail);

    if (import.meta.env.DEV) {
      console.warn("[CodeDock realtime] WebSocket request failed.", {
        code: error?.code,
        message: detail
      });
    }
  }, [failLatestPendingMessage, failLatestPendingThreadReply]);

  const applyReactionSummaries = useCallback((summaries: ReactionSummary[], channelId = selectedChannel) => {
    if (summaries.length === 0) return;

    setMessageReactions((prev) => {
      const next = { ...prev };

      summaries.forEach((summary) => {
        if (summary.targetType === "thread") {
          const keys = [
            `channel:${channelId}:thread:${summary.targetId}`,
            selectedThread && Number(selectedThread.backendMessageId ?? selectedThread.id) === summary.targetId
              ? `thread:${channelId}:${selectedThread.id}:original`
              : null
          ].filter((key): key is string => Boolean(key));

          keys.forEach((key) => {
            const reactionStateKey = getInteractionStateKey(key);
            const previousReaction = next[reactionStateKey]?.find((item) => item.emoji === summary.emoji);
            const reaction = mapReactionSummaryToMessageReaction(summary, previousReaction);
            const existing = next[reactionStateKey]?.filter((item) => item.emoji !== summary.emoji) ?? [];
            next[reactionStateKey] = summary.count > 0 ? [...existing, reaction] : existing;
          });
          return;
        }

        if (summary.targetType === "thread_reply") {
          Object.entries(threadRepliesRef.current).forEach(([threadKey, replies]) => {
            const workspaceId = getWorkspaceIdFromWorkspaceScopedChatKey(String(threadKey));
            if (workspaceId !== null && workspaceId !== currentWorkspaceApiId) return;

            const matchesReply = replies.some((reply) =>
              Number(reply.backendReplyId ?? reply.id) === summary.targetId
            );
            if (!matchesReply) return;

            const unscopedThreadKey = getChannelIdFromWorkspaceScopedChatKey(String(threadKey));
            const key = `thread:${channelId}:${unscopedThreadKey}:reply:${summary.targetId}`;
            const reactionStateKey = getInteractionStateKey(key);
            const previousReaction = next[reactionStateKey]?.find((item) => item.emoji === summary.emoji);
            const reaction = mapReactionSummaryToMessageReaction(summary, previousReaction);
            const existing = next[reactionStateKey]?.filter((item) => item.emoji !== summary.emoji) ?? [];
            next[reactionStateKey] = summary.count > 0 ? [...existing, reaction] : existing;
          });
        }
      });

      return next;
    });
  }, [currentWorkspaceApiId, getInteractionStateKey, selectedChannel, selectedThread]);

  const applyReactionResponse = useCallback((response: ReactionToggleResponse, channelId = selectedChannel) => {
    const keys = response.targetType === "thread"
      ? [
          `channel:${channelId}:thread:${response.targetId}`,
          selectedThread && Number(selectedThread.backendMessageId ?? selectedThread.id) === response.targetId
            ? `thread:${channelId}:${selectedThread.id}:original`
            : null
        ].filter((key): key is string => Boolean(key))
      : Object.entries(threadRepliesRef.current)
        .filter(([threadKey, replies]) => {
          const workspaceId = getWorkspaceIdFromWorkspaceScopedChatKey(String(threadKey));
          if (workspaceId !== null && workspaceId !== currentWorkspaceApiId) return false;
          return replies.some((reply) => Number(reply.backendReplyId ?? reply.id) === response.targetId);
        })
        .map(([threadKey]) => `thread:${channelId}:${getChannelIdFromWorkspaceScopedChatKey(String(threadKey))}:reply:${response.targetId}`);

    if (keys.length === 0) return;

    setMessageReactions((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        const reactionStateKey = getInteractionStateKey(key);
        next[reactionStateKey] = upsertReactionSummary(next[reactionStateKey], response);
      });
      return next;
    });
  }, [currentWorkspaceApiId, getInteractionStateKey, selectedChannel, selectedThread]);

  useEffect(() => {
    if (!currentWorkspaceApiId) return;

    const controller = new AbortController();

    setChannelFetchStatus("loading");
    // 채널을 새로 로드하므로, 로드 완료 후 마지막 채널 복원이 다시 1회 수행되도록 재무장함
    restoredChannelWorkspaceRef.current = null;
    setChannelFetchError("");
    setChannelActionError('');
    refreshWorkspaceChannels(controller.signal)
      .catch((error) => {
        if (!controller.signal.aborted) {
          const message = getReadableErrorMessage(error);
          setApiChannels([]);
          setChannelFetchStatus("failed");
          setChannelFetchError(message);
          if (import.meta.env.DEV) {
            console.warn("[CodeDock realtime] Channel fetch failed; WebSocket connection is waiting.", {
              workspaceId: currentWorkspaceApiId,
              message
            });
          }
          setChannelActionError(getChannelActionErrorMessage(error, '채널 목록을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'));
        }
      });

    return () => controller.abort();
  }, [currentWorkspaceApiId, refreshWorkspaceChannels]);

  useEffect(() => {
    if (!activeApiChannelId) return;

    const controller = new AbortController();
    setMessages((prev) => {
      const currentChannelMessages = prev[selectedChannelMessageKey] ?? [];
      if (currentChannelMessages.length === 0 || hasServerMessageState(currentChannelMessages)) {
        return prev;
      }

      return {
        ...prev,
        [selectedChannelMessageKey]: []
      };
    });

    getChannelMessages(activeApiChannelId, { limit: 50 }, {
      signal: controller.signal
    })
      .then((serverMessages) => {
        const visibleServerMessages = filterRepositoryMessagesForView(serverMessages, selectedRepositoryMessageView);
        setMessages((prev) => ({
          ...prev,
          [selectedChannelMessageKey]: visibleServerMessages.map(mapChannelMessageToWorkspaceMessage)
        }));
      })
      .catch(() => {
        // Keep existing server/pending messages when the backend is unavailable.
        // Local-only messages are cleared above so API channels do not look persisted from localStorage.
      });

    return () => controller.abort();
  }, [activeApiChannelId, selectedChannelMessageKey, selectedRepositoryMessageView]);

  useEffect(() => {
    if (!activeApiChannelId) return;

    const controller = new AbortController();

    getChannelReactions(activeApiChannelId, {
      signal: controller.signal
    })
      .then((summaries) => applyReactionSummaries(summaries, selectedChannel))
      .catch(() => {
        // Keep local reactions when the backend is unavailable.
      });

    return () => controller.abort();
  }, [activeApiChannelId, applyReactionSummaries, selectedChannel]);

  useEffect(() => {
    if (!selectedThread || !activeApiChannelId) return;

    const threadId = Number(selectedThread.backendMessageId ?? selectedThread.id);
    if (!Number.isFinite(threadId)) return;

    const controller = new AbortController();
    const threadKey = getThreadReplyStateKey(selectedThread);

    getThreadReplies(threadId, {
      signal: controller.signal
    })
      .then((serverReplies) => {
        const mappedReplies = serverReplies.map(mapThreadReplyToWorkspaceMessage);

        setThreadReplies((prev) => ({
          ...prev,
          [threadKey]: mappedReplies
        }));
        setThreadReplyCounts((prev) => ({
          ...prev,
          [threadKey]: mappedReplies.length
        }));
        setSelectedThread((prevThread: any) =>
          prevThread && prevThread.id === selectedThread.id
            ? {
                ...prevThread,
                replies: mappedReplies.length,
                lastReply: mappedReplies.at(-1)?.user ?? prevThread.lastReply
              }
            : prevThread
        );
      })
      .catch(() => {
        // Keep local/mock replies when the backend is unavailable.
      });

    return () => controller.abort();
  }, [activeApiChannelId, getThreadReplyStateKey, selectedThread?.backendMessageId, selectedThread?.id]);

  const mentionRefetchTimeoutRef = useRef<number | null>(null);

  // Latest channel event handlers in a ref so the WebSocket subscriptions always call fresh
  // callbacks without listing every handler as an effect dep (which caused full reconnects on
  // every state update — e.g. appendServerMessage changing when a new message arrived).
  const wsChannelHandlersRef = useRef({
    appendServerMessage,
    isCurrentWorkspaceMember,
    incrementUnreadCount,
    markActiveChannelRead,
    replaceServerMessage,
    applyReactionResponse,
    currentWorkspaceApiId,
    updateRealtimeConnection,
    channelFetchError,
    handleRealtimeError,
    claimedRepositoryChannelIds,
    applyChannelReadStatus,
    handleWorkspaceChannelEvent,
    handleMentionDeletedEvent,
  });
  useEffect(() => {
    wsChannelHandlersRef.current = {
      appendServerMessage,
      isCurrentWorkspaceMember,
      incrementUnreadCount,
      markActiveChannelRead,
      replaceServerMessage,
      applyReactionResponse,
      currentWorkspaceApiId,
      updateRealtimeConnection,
      channelFetchError,
      handleRealtimeError,
      claimedRepositoryChannelIds,
      applyChannelReadStatus,
      handleWorkspaceChannelEvent,
      handleMentionDeletedEvent,
    };
  }, [
    appendServerMessage,
    isCurrentWorkspaceMember,
    incrementUnreadCount,
    markActiveChannelRead,
    replaceServerMessage,
    applyReactionResponse,
    currentWorkspaceApiId,
    updateRealtimeConnection,
    channelFetchError,
    handleRealtimeError,
    claimedRepositoryChannelIds,
    applyChannelReadStatus,
    handleWorkspaceChannelEvent,
    handleMentionDeletedEvent,
  ]);

  // Main WebSocket client effect. Deps are narrowed to the channel-id set and workspace/auth
  // conditions — NOT individual channel callbacks or the active channel. This means:
  //   • channel switches do NOT reconnect (only the typing sub below reconnects)
  //   • overview / repository tabs do NOT disconnect (unread counts stay live)
  //   • handler changes (new message arriving) do NOT reconnect
  useEffect(() => {
    const h = wsChannelHandlersRef.current;
    if (realtimeConnectionBlockReason) {
      chatStompRef.current?.disconnect();
      chatStompRef.current = null;
      Object.values(remoteTypingTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      Object.values(remoteThreadTypingTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      remoteTypingTimeoutsRef.current = {};
      remoteThreadTypingTimeoutsRef.current = {};
      setRemoteTypingByChannel({});
      setRemoteTypingByThread({});
      h.updateRealtimeConnection(getRealtimeBlockState(
        realtimeConnectionBlockReason,
        realtimeConnectionBlockReason === "channels-failed" ? h.channelFetchError : undefined
      ));
      return;
    }

    let cancelled = false;
    let client: ChatStompClient | null = null;
    let eventSubscriptions: Array<{ unsubscribe: () => void }> = [];
    let workspaceChannelSubscription: { unsubscribe: () => void } | null = null;
    let personalNotificationSubscription: { unsubscribe: () => void } | null = null;
    let personalErrorSubscription: { unsubscribe: () => void } | null = null;

    wsChannelHandlersRef.current.updateRealtimeConnection({ status: "connecting" });

    void import("../api/stomp").then(({ createChatStompClient }) => {
      if (cancelled) return;

      client = createChatStompClient({
        onConnect: () => {
          if (!cancelled) {
            wsChannelHandlersRef.current.updateRealtimeConnection({ status: "connected" });
          }
        },
        onDisconnect: () => {
          if (!cancelled) {
            wsChannelHandlersRef.current.updateRealtimeConnection({ status: "disconnected", reason: "disconnected" });
          }
        },
        onError: (error) => {
          if (cancelled) return;
          const detail = getReadableErrorMessage(error);
          wsChannelHandlersRef.current.updateRealtimeConnection({ status: "failed", reason: "stomp-error", detail });
          if (import.meta.env.DEV) {
            console.warn("[CodeDock realtime] WebSocket connection failed.", {
              workspaceId: wsChannelHandlersRef.current.currentWorkspaceApiId,
              detail
            });
          }
        },
        onConnectionSkipped: (reason) => {
          if (cancelled || reason === "already-active") return;
          wsChannelHandlersRef.current.updateRealtimeConnection({ status: "blocked", reason: "missing-token" });
        }
      });
      chatStompRef.current = client;
      setChatStompReadyKey((key) => key + 1);

      eventSubscriptions = apiChannels.map((channel) => {
        const isRepositoryChannel = isRepositoryApiChannel(channel);
        const genericUiChannelId = getApiChannelUiId(channel);
        const getRepositoryEventUiChannelId = (payload?: ChannelMessage) => {
          if (!isRepositoryChannel) return genericUiChannelId;

          if (payload) {
            // repository 채널은 PR/이슈 탭이 같은 channelId를 구독하므로,
            // 실시간 메시지도 REST 조회와 같은 attachment type 기준으로 라우팅해야 새로고침 전후 화면이 섞이지 않는다.
            const repositoryMessageView = getRepositoryMessageViewFromAttachments(payload);
            if (repositoryMessageView === "pull-requests") return "pull-requests";
            if (repositoryMessageView === "issues") return "issues";
            return genericUiChannelId;
          }

          const selected = selectedChannelRef.current;
          if (selected === "pull-requests" || selected === "issues") {
            return selected;
          }

          return wsChannelHandlersRef.current.claimedRepositoryChannelIds.has(channel.id)
            ? "issues"
            : genericUiChannelId;
        };

        return client!.subscribe<ChatEvent<ChannelEventPayload>>(
          chatWebSocketDestinations.subscribeChannelEvents(channel.id),
          (event) => {
            const ch = wsChannelHandlersRef.current;

            // repository 채널은 워크스페이스 repository 트리에 매핑되면 'issues' 탭으로 렌더링되지만,
            // 매핑되지 않은 고아 repository 채널은 자체 api-ch-{id} 키로 렌더링된다. 매핑 여부는
            // 메시지 도착 시점의 최신 상태(ref)로 판단해 라우팅한다.
            const createdMessagePayload = getChatEventPayload<ChannelMessage>(event, CHAT_EVENT_TYPE.MESSAGE_CREATED);
            if (createdMessagePayload) {
              const uiChannelId = getRepositoryEventUiChannelId(createdMessagePayload);
              ch.appendServerMessage(uiChannelId, createdMessagePayload);
              if (!ch.isCurrentWorkspaceMember(createdMessagePayload.senderMemberId)) {
                if (uiChannelId === selectedChannelRef.current) {
                  // Viewing this channel: keep the server's read pointer in sync so a refresh shows 0.
                  ch.markActiveChannelRead(createdMessagePayload.channelId);
                } else {
                  ch.incrementUnreadCount(uiChannelId);
                }
              }
              return;
            }

            const updatedMessagePayload = getChatEventPayload<ChannelMessage>(event, CHAT_EVENT_TYPE.MESSAGE_UPDATED);
            if (updatedMessagePayload) {
              const uiChannelId = getRepositoryEventUiChannelId(updatedMessagePayload);
              ch.replaceServerMessage(uiChannelId, updatedMessagePayload);
              return;
            }

            const deletedMessagePayload = getChatEventPayload<ChannelMessage>(event, CHAT_EVENT_TYPE.MESSAGE_DELETED);
            if (deletedMessagePayload) {
              const uiChannelId = getRepositoryEventUiChannelId(deletedMessagePayload);
              ch.replaceServerMessage(uiChannelId, { ...deletedMessagePayload, isDeleted: true });
              return;
            }

            const reactionPayload = getChatEventPayload<ReactionToggleResponse>(event, CHAT_EVENT_TYPE.REACTION_UPDATED);
            if (reactionPayload) {
              const uiChannelId = getRepositoryEventUiChannelId();
              ch.applyReactionResponse(reactionPayload, uiChannelId);
            }
          }
        );
      });

      workspaceChannelSubscription = client.subscribe<ChatEvent<WorkspaceChannelEventPayload>>(
        chatWebSocketDestinations.subscribeWorkspaceChannels(wsChannelHandlersRef.current.currentWorkspaceApiId),
        (event) => {
          const ch = wsChannelHandlersRef.current;

          const createdChannel = getChatEventPayload<Channel>(event, CHAT_EVENT_TYPE.CHANNEL_CREATED);
          if (createdChannel) {
            ch.handleWorkspaceChannelEvent(CHAT_EVENT_TYPE.CHANNEL_CREATED, createdChannel);
            return;
          }

          const updatedChannel = getChatEventPayload<Channel>(event, CHAT_EVENT_TYPE.CHANNEL_UPDATED);
          if (updatedChannel) {
            ch.handleWorkspaceChannelEvent(CHAT_EVENT_TYPE.CHANNEL_UPDATED, updatedChannel);
            return;
          }

          const deletedChannel = getChatEventPayload<Partial<Channel> & { channelId?: number }>(event, CHAT_EVENT_TYPE.CHANNEL_DELETED);
          if (deletedChannel) {
            ch.handleWorkspaceChannelEvent(CHAT_EVENT_TYPE.CHANNEL_DELETED, deletedChannel);
            return;
          }

          const readStatus = getChatEventPayload<ChannelReadStatusResponse>(event, CHAT_EVENT_TYPE.CHANNEL_READ)
            ?? getChatEventPayload<ChannelReadStatusResponse>(event, CHAT_EVENT_TYPE.CHANNEL_READ_UPDATED);
          if (readStatus) {
            ch.applyChannelReadStatus(readStatus);
          }
        }
      );

      personalNotificationSubscription = client.subscribe<ChatEvent<PersonalNotification | MentionDeletedEvent> | PersonalNotification>(
        chatWebSocketDestinations.subscribePersonalNotifications(),
        (event) => {
          const deletedMention = getChatEventPayload<MentionDeletedEvent>(event, CHAT_EVENT_TYPE.MENTION_DELETED);
          if (deletedMention) {
            wsChannelHandlersRef.current.handleMentionDeletedEvent(deletedMention);
            return;
          }

          const notification = getChatEventPayload<PersonalNotification>(event, CHAT_EVENT_TYPE.NOTIFICATION_CREATED)
            ?? (
              event && typeof event === "object" && !("type" in event)
                ? event as PersonalNotification
                : null
            );
          if (!notification) return;

          const wsId = wsChannelHandlersRef.current.currentWorkspaceApiId;
          if (notification.workspaceId === undefined || notification.workspaceId === wsId) {
            setOptimisticMentionBumps((count) => count + 1);
            if (mentionRefetchTimeoutRef.current) {
              window.clearTimeout(mentionRefetchTimeoutRef.current);
            }
            mentionRefetchTimeoutRef.current = window.setTimeout(() => {
              mentionRefetchTimeoutRef.current = null;
              const freshWsId = wsChannelHandlersRef.current.currentWorkspaceApiId;
              if (!freshWsId) return;
              getWorkspaceMentions(freshWsId)
                .then((mentions) => {
                  setWorkspaceMentions(mentions);
                  setOptimisticMentionBumps(0);
                })
                .catch(() => {});
            }, 300);
          }
        }
      );

      personalErrorSubscription = client.subscribe<ApiErrorResponse>(
        chatWebSocketDestinations.subscribePersonalErrors(),
        (error) => {
          wsChannelHandlersRef.current.handleRealtimeError(error);
        }
      );

      client.connect();
    }).catch((error) => {
      if (cancelled) return;
      wsChannelHandlersRef.current.updateRealtimeConnection({
        status: "failed",
        reason: "client-load-failed",
        detail: getReadableErrorMessage(error)
      });
    });

    return () => {
      cancelled = true;
      eventSubscriptions.forEach((subscription) => subscription.unsubscribe());
      workspaceChannelSubscription?.unsubscribe();
      personalNotificationSubscription?.unsubscribe();
      personalErrorSubscription?.unsubscribe();
      client?.disconnect();
      if (chatStompRef.current === client) {
        chatStompRef.current = null;
      }
    };
  }, [channelSubscriptionKey, realtimeConnectionBlockReason]);

  // Typing subscription — channel-specific, so it re-subscribes on every channel switch.
  // Isolated from the main WS effect so channel switches do NOT reconnect the STOMP client.
  useEffect(() => {
    const client = chatStompRef.current;
    if (!client || !activeApiChannelId) return;

    const subscription = client.subscribe<ChatEvent<TypingEvent>>(
      chatWebSocketDestinations.subscribeChannelTyping(activeApiChannelId),
      (event) => {
        const typingPayload = getChatEventPayload<TypingEvent>(event, CHAT_EVENT_TYPE.TYPING);
        if (!typingPayload) return;
        if (isCurrentWorkspaceMember(typingPayload.workspaceMemberId)) return;
        const typingKey = `${selectedChannel}:${typingPayload.workspaceMemberId}`;

        if (remoteTypingTimeoutsRef.current[typingKey]) {
          window.clearTimeout(remoteTypingTimeoutsRef.current[typingKey]);
          delete remoteTypingTimeoutsRef.current[typingKey];
        }

        if (typingPayload.typing) {
          remoteTypingTimeoutsRef.current[typingKey] = window.setTimeout(() => {
            setRemoteTypingByChannel((prev) => ({
              ...prev,
              [selectedChannel]: Object.fromEntries(
                Object.entries(prev[selectedChannel] ?? {}).filter(
                  ([memberId]) => Number(memberId) !== typingPayload.workspaceMemberId
                )
              )
            }));
            delete remoteTypingTimeoutsRef.current[typingKey];
          }, 10000);
        }

        setRemoteTypingByChannel((prev) => {
          const currentTypers = prev[selectedChannel] ?? {};
          const {
            [typingPayload.workspaceMemberId]: _removedTypingMember,
            ...withoutTypingMember
          } = currentTypers;

          return {
            ...prev,
            [selectedChannel]: typingPayload.typing
              ? {
                  ...currentTypers,
                  [typingPayload.workspaceMemberId]: typingPayload.senderName
                }
              : withoutTypingMember
          };
        });
      }
    );

    return () => {
      subscription.unsubscribe();
      Object.entries(remoteTypingTimeoutsRef.current)
        .filter(([key]) => key.startsWith(`${selectedChannel}:`))
        .forEach(([key, timeoutId]) => {
          window.clearTimeout(timeoutId);
          delete remoteTypingTimeoutsRef.current[key];
        });
      setRemoteTypingByChannel((prev) => ({
        ...prev,
        [selectedChannel]: {}
      }));
    };
  }, [activeApiChannelId, selectedChannel, chatStompReadyKey, isCurrentWorkspaceMember]);

  useEffect(() => {
    const client = chatStompRef.current;
    const threadId = Number(selectedThread?.backendMessageId ?? selectedThread?.id);
    if (!client || !Number.isFinite(threadId) || threadId <= 0) return;

    const threadTypingKey = String(threadId);
    const subscription = client.subscribe<ChatEvent<TypingEvent>>(
      chatWebSocketDestinations.subscribeThreadTyping(threadId),
      (event) => {
        const typingPayload = getChatEventPayload<TypingEvent>(event, CHAT_EVENT_TYPE.TYPING);
        if (!typingPayload) return;
        if (isCurrentWorkspaceMember(typingPayload.workspaceMemberId)) return;
        const typingKey = `${threadTypingKey}:${typingPayload.workspaceMemberId}`;

        if (remoteThreadTypingTimeoutsRef.current[typingKey]) {
          window.clearTimeout(remoteThreadTypingTimeoutsRef.current[typingKey]);
          delete remoteThreadTypingTimeoutsRef.current[typingKey];
        }

        if (typingPayload.typing) {
          remoteThreadTypingTimeoutsRef.current[typingKey] = window.setTimeout(() => {
            setRemoteTypingByThread((prev) => ({
              ...prev,
              [threadTypingKey]: Object.fromEntries(
                Object.entries(prev[threadTypingKey] ?? {}).filter(
                  ([memberId]) => Number(memberId) !== typingPayload.workspaceMemberId
                )
              )
            }));
            delete remoteThreadTypingTimeoutsRef.current[typingKey];
          }, 10000);
        }

        setRemoteTypingByThread((prev) => {
          const currentTypers = prev[threadTypingKey] ?? {};
          const {
            [typingPayload.workspaceMemberId]: _removedTypingMember,
            ...withoutTypingMember
          } = currentTypers;

          return {
            ...prev,
            [threadTypingKey]: typingPayload.typing
              ? {
                  ...currentTypers,
                  [typingPayload.workspaceMemberId]: typingPayload.senderName
                }
              : withoutTypingMember
          };
        });
      }
    );

    return () => {
      subscription.unsubscribe();
      Object.entries(remoteThreadTypingTimeoutsRef.current)
        .filter(([key]) => key.startsWith(`${threadTypingKey}:`))
        .forEach(([key, timeoutId]) => {
          window.clearTimeout(timeoutId);
          delete remoteThreadTypingTimeoutsRef.current[key];
        });
      setRemoteTypingByThread((prev) => ({
        ...prev,
        [threadTypingKey]: {}
      }));
    };
  }, [activeThreadTypingStateKey, chatStompReadyKey, isCurrentWorkspaceMember, selectedThread?.backendMessageId, selectedThread?.id]);

  // Keep the latest targets/handlers in a ref so the subscription effect below can read fresh
  // values without listing them as dependencies (which would force a re-subscribe each render).
  const threadSubLatestRef = useRef({
    targets: apiThreadTargets,
    appendServerThreadReply,
    replaceServerThreadReply,
    isCurrentWorkspaceMember,
    incrementUnreadCount
  });
  useEffect(() => {
    threadSubLatestRef.current = {
      targets: apiThreadTargets,
      appendServerThreadReply,
      replaceServerThreadReply,
      isCurrentWorkspaceMember,
      incrementUnreadCount
    };
  }, [apiThreadTargets, appendServerThreadReply, replaceServerThreadReply, isCurrentWorkspaceMember, incrementUnreadCount]);

  useEffect(() => {
    const client = chatStompRef.current;
    if (!client) return;
    const initialTargets = threadSubLatestRef.current.targets;
    if (initialTargets.length === 0) return;

    const threadSubscriptions = initialTargets.map(({ threadId }) =>
      client.subscribe<ChatEvent<ThreadEventPayload>>(
        chatWebSocketDestinations.subscribeThreadEvents(threadId),
        (event) => {
          const latest = threadSubLatestRef.current;
          const target = latest.targets.find((item) => item.threadId === threadId);
          if (!target) return;

          const createdReply = getChatEventPayload<ThreadReply>(event, CHAT_EVENT_TYPE.THREAD_REPLY_CREATED);
          if (createdReply) {
            if (Number(createdReply.threadId) !== threadId) return;
            latest.appendServerThreadReply(target.thread, createdReply);
            if (!latest.isCurrentWorkspaceMember(createdReply.senderMemberId)) {
              latest.incrementUnreadCount(target.channelId);
            }
            return;
          }

          // 답글 수정/삭제는 기존 답글을 갱신만 함(미읽음 카운트 변화 없음)
          const updatedReply = getChatEventPayload<ThreadReply>(event, CHAT_EVENT_TYPE.THREAD_REPLY_UPDATED);
          if (updatedReply) {
            if (Number(updatedReply.threadId) !== threadId) return;
            latest.replaceServerThreadReply(target.thread, updatedReply);
            return;
          }

          const deletedReply = getChatEventPayload<ThreadReply>(event, CHAT_EVENT_TYPE.THREAD_REPLY_DELETED);
          if (deletedReply) {
            if (Number(deletedReply.threadId) !== threadId) return;
            latest.replaceServerThreadReply(target.thread, deletedReply);
          }
        }
      )
    );

    return () => {
      threadSubscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [threadSubscriptionKey, chatStompReadyKey]);

  useEffect(() => {
    const client = chatStompRef.current;
    if (!client || apiWorkspaces.length === 0) return;
    // 입장/재연결 시 BE가 보내는 presence 스냅샷(개인 큐). 토픽 구독보다 먼저 구독해 스냅샷을 놓치지 않음.
    const snapshotSub = client.subscribe<Array<{ memberId: number; presence: string }>>(
      "/user/queue/presence",
      (payload) => {
        if (!Array.isArray(payload)) return;
        setPresenceOverrides((prev) => {
          const next = { ...prev };
          payload.forEach((entry) => {
            if (entry?.memberId != null && entry?.presence) {
              next[String(entry.memberId)] = entry.presence;
            }
          });
          return next;
        });
      }
    );
    // 내가 속한 "모든" 워크스페이스의 presence 토픽 구독 → 어느 워크스페이스에서 누가 들고나도 실시간 반영.
    // 현재 워크스페이스: override로 헤더/멤버목록 즉시 갱신. 모든 워크스페이스: 목록 카운트 디바운스 refetch.
    const topicSubs = apiWorkspaces.map((ws) =>
      client.subscribe<{ memberId: number; presence: string }>(
        `/topic/workspaces/${ws.id}/presence`,
        (payload) => {
          if (!payload?.memberId || !payload?.presence) return;
          setPresenceOverrides((prev) => ({ ...prev, [String(payload.memberId)]: payload.presence }));
          scheduleWorkspaceListRefresh();
        }
      )
    );
    return () => {
      snapshotSub.unsubscribe();
      topicSubs.forEach((sub) => sub.unsubscribe());
    };
  }, [workspacePresenceSubKey, chatStompReadyKey]);

  const handleChannelTypingChange = useCallback((typing: boolean) => {
    if (!activeApiChannelId) return;

    chatStompRef.current?.send(
      chatWebSocketDestinations.sendChannelTyping(activeApiChannelId),
      {
        typing
      }
    );
  }, [activeApiChannelId]);

  const handleThreadTypingChange = useCallback((typing: boolean) => {
    const thread = selectedThreadRef.current;
    const threadId = Number(thread?.backendMessageId ?? thread?.id);
    if (!Number.isFinite(threadId) || threadId <= 0) return;

    chatStompRef.current?.send(
      chatWebSocketDestinations.sendThreadTyping(threadId),
      {
        typing
      }
    );
  }, []);

  const parseRepoNameFromUrl = (url: string): string | null => {
    try {
      const trimmed = url.trim().replace(/\.git$/, '');
      const parts = trimmed.split('/').filter(Boolean);
      const name = parts[parts.length - 1];
      return name || null;
    } catch {
      return null;
    }
  };

  const parseRepoPartsFromUrl = (url: string): { owner: string; repoName: string } | null => {
    try {
      const trimmed = url.trim().replace(/\.git$/, '');
      const parts = trimmed.split('/').filter(Boolean);
      const repoName = parts[parts.length - 1];
      const owner = parts[parts.length - 2];
      if (!owner || !repoName) return null;
      return { owner, repoName };
    } catch {
      return null;
    }
  };

  const registerRepositoryWebhookAfterConnect = useCallback(async (repositoryId: number) => {
    try {
      await registerWorkspaceRepositoryWebhook(currentWorkspaceApiId, repositoryId);
      return true;
    } catch {
      return false;
    }
  }, [currentWorkspaceApiId]);

  const handleOpenRepoForm = () => {
    setShowRepoDropdown(false);
    setShowRepoForm(true);
    setRepoUrlInput('');
  };

  const handleCloseRepoForm = () => {
    setShowRepoForm(false);
    setRepoUrlInput('');
  };

  const handleSubmitRepoForm = async () => {
    const trimmed = repoUrlInput.trim().replace(/\.git$/, '');
    const parts = trimmed.split('/').filter(Boolean);
    const repoName = parts[parts.length - 1];
    const owner = parts[parts.length - 2];
    if (!repoName || !owner) return;

    try {
      const res = await connectWorkspaceRepository(currentWorkspaceApiId, owner, repoName);
      const webhookRegistered = await registerRepositoryWebhookAfterConnect(res.id);
      const nextRepository: RepositoryItem = {
        id: `repo-${res.id}`,
        name: res.name,
        openPRs: 0,
        highRisk: 0,
        activeIssues: 0,
        connected: true,
        membersOnline: 1,
        workspaceId: String(currentWorkspaceApiId),
        channelId: res.channelId,
        dbRepoId: String(res.id),
      };
      unhideWorkspaceRepository(currentWorkspaceApiId, nextRepository);
      setRepositories(prev => [
        nextRepository,
        ...prev.filter((repo) =>
          repo.workspaceId !== nextRepository.workspaceId
          || !isSameRepositoryReference(repo, nextRepository)
        )
      ]);
      setRepositoriesImported(true);
      setSelectedRepository(nextRepository.id);
      setSelectedChannel('overview');
      handleCloseRepoForm();
      if (!webhookRegistered) {
        setChannelActionError('레포지토리는 연결됐지만 GitHub Webhook 등록에 실패했어요. GitHub 권한과 ngrok URL을 확인해주세요.');
      }
    } catch {
      // 백엔드 연동 실패 시 로컬 목데이터로 폴백
      const nextRepository: RepositoryItem = {
        id: `repo-${Date.now()}`,
        name: repoName,
        openPRs: 0,
        highRisk: 0,
        activeIssues: 0,
        connected: true,
        membersOnline: 1,
        workspaceId: String(currentWorkspaceApiId),
      };
      unhideWorkspaceRepository(currentWorkspaceApiId, nextRepository);
      setRepositories(prev => [
        nextRepository,
        ...prev.filter((repo) =>
          repo.workspaceId !== nextRepository.workspaceId
          || !isSameRepositoryReference(repo, nextRepository)
        )
      ]);
      setRepositoriesImported(true);
      setSelectedRepository(nextRepository.id);
      setSelectedChannel('overview');
      handleCloseRepoForm();
    }
  };

  const handleDeleteRepository = (repositoryId: string) => {
    const removedRepository = repositories.find((repo) => repo.id === repositoryId)
      ?? visibleRepositories.find((repo) => repo.id === repositoryId);
    if (removedRepository) {
      hideWorkspaceRepository(currentWorkspaceApiId, removedRepository);
      removeWorkspaceRepositoryFromStorage(currentWorkspaceApiId, removedRepository);
    }

    const nextRepositories = repositories.filter((repo) => repo.id !== repositoryId);
    setRepositories(nextRepositories);
    if (selectedRepository === repositoryId) {
      const workspaceId = String(currentWorkspaceApiId);
      const hiddenRepositories = getHiddenWorkspaceRepositories();
      const nextVisible = nextRepositories.filter((repo) =>
        repo.workspaceId === workspaceId
        && !isWorkspaceRepositoryHidden(currentWorkspaceApiId, repo, hiddenRepositories)
      );
      setSelectedRepository(nextVisible[0]?.id ?? "");
      setSelectedChannel('general');
    }
    if (nextRepositories.length === 0) {
      setRepositoriesImported(false);
      setSelectedChannel('overview');
      setShowRepoDropdown(false);
      saveRepositoryImportPreferenceValue(false);
      saveRepositories([]);
      return;
    }
    saveRepositories(nextRepositories);
  };

  const handleAddCustomChannel = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!canManageWorkspaceChannels) {
      setChannelActionError('채널 관리는 워크스페이스 owner/admin만 할 수 있습니다.');
      return;
    }
    if (addChannelStep) {
      setAddChannelStep(null);
      setAddChannelPosition(null);
      setChannelCreateError('');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const popoverWidth = 252;
    const viewportPadding = 12;
    const left = Math.min(
      window.innerWidth - popoverWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - popoverWidth)
    );
    const top = Math.min(
      window.innerHeight - 230 - viewportPadding,
      Math.max(viewportPadding, rect.bottom + 8)
    );

    closeChannelMenu();
    setNewChannelName('');
    setNewRepoChannelUrl('');
    setChannelCreateError('');
    setChannelActionError('');
    setAddChannelPosition({ top, left });
    setAddChannelStep('select');
  };

  const handleSelectChannelType = (type: 'chat' | 'repo') => {
    closeChannelMenu();
    setChannelCreateError('');
    setChannelActionError('');
    setAddChannelStep(type);
  };

  const handleSubmitAddChannel = async () => {
    if (isCreatingChannelRef.current) return;
    if (!canManageWorkspaceChannels) {
      setChannelCreateError('채널 관리는 워크스페이스 owner/admin만 할 수 있습니다.');
      return;
    }
    if (!Number.isFinite(currentWorkspaceApiId) || currentWorkspaceApiId <= 0) {
      setChannelCreateError("워크스페이스 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    isCreatingChannelRef.current = true;
    setIsSubmittingChannel(true);
    setChannelCreateError('');
    const label = newChannelName.trim() || `새 채널 ${allCustomChannels.length + 1}`;

    try {
      const createdChannel = await createWorkspaceChannel(currentWorkspaceApiId, {
        name: label,
        description: null
      });

      let selectedCreatedChannel = createdChannel;
      setApiChannels((prev) => {
        const alreadyExists = prev.some((channel) => channel.id === createdChannel.id);
        const nextChannels = alreadyExists
          ? prev.map((channel) => (channel.id === createdChannel.id ? createdChannel : channel))
          : [...prev, createdChannel];
        return sortChannelsByDisplayOrder(nextChannels);
      });

      try {
        const syncedChannels = await refreshWorkspaceChannels();
        selectedCreatedChannel = syncedChannels.find((channel) => channel.id === createdChannel.id) ?? createdChannel;
      } catch {
        // Keep the created channel in local state when only the follow-up sync fails.
      }

      setSelectedChannel(getApiChannelUiId(selectedCreatedChannel));
      setAddChannelStep(null);
      setAddChannelPosition(null);
      setNewChannelName('');
    } catch (error) {
      setChannelCreateError(getChannelActionErrorMessage(error, '채널을 만들지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmittingChannel(false);
      isCreatingChannelRef.current = false;
    }
  };

  const handleSubmitAddRepoChannel = () => {
    if (isCreatingChannelRef.current) return;
    const repoName = parseRepoNameFromUrl(newRepoChannelUrl);
    if (!repoName) return;
    isCreatingChannelRef.current = true;
    setChannelCreateError(
      `"${repoName}" 레포 채널은 로컬로 생성하지 않습니다. GitHub 저장소 연동 흐름에서 서버 채널이 생성된 뒤 표시됩니다.`
    );
    isCreatingChannelRef.current = false;
  };

  const handleSubmitConnectedRepoChannel = async () => {
    if (isCreatingChannelRef.current) return;
    const repoParts = parseRepoPartsFromUrl(newRepoChannelUrl);
    if (!repoParts) {
      setChannelCreateError('GitHub 저장소 URL을 owner/repository 형식으로 입력해주세요.');
      return;
    }
    if (!canManageWorkspaceChannels) {
      setChannelCreateError('채널 관리는 워크스페이스 owner/admin만 가능합니다.');
      return;
    }
    if (!Number.isFinite(currentWorkspaceApiId) || currentWorkspaceApiId <= 0) {
      setChannelCreateError('워크스페이스 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }

    isCreatingChannelRef.current = true;
    setIsSubmittingChannel(true);
    setChannelCreateError('');

    try {
      const res = await connectWorkspaceRepository(currentWorkspaceApiId, repoParts.owner, repoParts.repoName);
      const webhookRegistered = await registerRepositoryWebhookAfterConnect(res.id);
      const nextRepository: RepositoryItem = {
        id: `repo-${res.id}`,
        name: res.name,
        openPRs: 0,
        highRisk: 0,
        activeIssues: 0,
        connected: true,
        membersOnline: 1,
        workspaceId: String(currentWorkspaceApiId),
        channelId: res.channelId,
        dbRepoId: String(res.id),
      };

      unhideWorkspaceRepository(currentWorkspaceApiId, nextRepository);
      setRepositories(prev => [
        nextRepository,
        ...prev.filter((repo) =>
          repo.workspaceId !== nextRepository.workspaceId
          || !isSameRepositoryReference(repo, nextRepository)
        )
      ]);
      setRepositoriesImported(true);

      try {
        await refreshWorkspaceChannels();
      } catch {
        // The repository connection already created the backend channel; keep local state if sync fails.
      }

      setSelectedRepository(nextRepository.id);
      setSelectedChannel(getApiChannelUiIdById(res.channelId));
      setAddChannelStep(null);
      setAddChannelPosition(null);
      setNewRepoChannelUrl('');
      if (!webhookRegistered) {
        setChannelActionError('레포지토리 채널은 생성됐지만 GitHub Webhook 등록에 실패했어요. GitHub 권한과 ngrok URL을 확인해주세요.');
      }
    } catch (error) {
      setChannelCreateError(getChannelActionErrorMessage(error, '레포지토리 채널을 만들지 못했어요. 저장소 권한과 URL을 확인해주세요.'));
    } finally {
      setIsSubmittingChannel(false);
      isCreatingChannelRef.current = false;
    }
  };

  const handleCancelAddChannel = () => {
    closeChannelMenu();
    setAddChannelStep(null);
    setAddChannelPosition(null);
    setNewChannelName('');
    setNewRepoChannelUrl('');
    setChannelCreateError('');
    setChannelActionError('');
  };

  const handleDeleteCustomChannel = async (channelId: string) => {
    if (channelActionInFlightRef.current) return;

    const channel = allCustomChannels.find((item) => item.id === channelId);
    if (!channel) return;
    const sourceApiChannel = channel.apiChannelId
      ? apiChannels.find((apiChannel) => apiChannel.id === channel.apiChannelId)
      : undefined;
    if (!canManageWorkspaceChannels || !sourceApiChannel?.isDeletable) {
      setChannelActionError('이 채널은 삭제할 수 없습니다.');
      closeChannelMenu();
      return;
    }
    if (!Number.isFinite(currentWorkspaceApiId) || currentWorkspaceApiId <= 0) {
      setChannelActionError("워크스페이스 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
      closeChannelMenu();
      return;
    }
    setDeleteChannelTargetId(channelId);
    closeChannelMenu();
  };

  const handleCancelDeleteCustomChannel = () => {
    if (channelActionInFlightRef.current) return;
    setDeleteChannelTargetId(null);
  };

  const handleMoveCustomChannel = async (channelId: string, direction: -1 | 1) => {
    if (channelActionInFlightRef.current) return;

    const channel = allCustomChannels.find((item) => item.id === channelId);
    if (!channel?.apiChannelId) return;
    if (!canManageWorkspaceChannels) {
      setChannelActionError('채널 순서 변경은 워크스페이스 owner/admin만 가능합니다.');
      closeChannelMenu();
      return;
    }

    const previousChannels = orderedApiChannels;
    const currentIndex = previousChannels.findIndex((apiChannel) => apiChannel.id === channel.apiChannelId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= previousChannels.length) return;

    const nextChannels = [...previousChannels];
    const [movedChannel] = nextChannels.splice(currentIndex, 1);
    nextChannels.splice(nextIndex, 0, movedChannel);

    channelActionInFlightRef.current = true;
    setChannelActionPendingId(channelId);
    setChannelActionError('');
    setApiChannels(nextChannels);

    try {
      const savedChannels = await updateWorkspaceChannelOrder(currentWorkspaceApiId, {
        channelIds: nextChannels.map((apiChannel) => apiChannel.id)
      });
      setApiChannels(Array.isArray(savedChannels) ? sortChannelsByDisplayOrder(savedChannels) : nextChannels);
      closeChannelMenu();
    } catch (error) {
      setApiChannels(previousChannels);
      setChannelActionError(getChannelActionErrorMessage(error, '채널 순서를 저장하지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setChannelActionPendingId(null);
      channelActionInFlightRef.current = false;
    }
  };

  const handleConfirmDeleteCustomChannel = async () => {
    if (channelActionInFlightRef.current || !deleteChannelTargetId) return;

    const channelId = deleteChannelTargetId;
    const channel = allCustomChannels.find((item) => item.id === channelId);
    if (!channel) {
      setDeleteChannelTargetId(null);
      return;
    }

    channelActionInFlightRef.current = true;
    setChannelActionPendingId(channelId);
    setChannelActionError('');

    try {
      if (!channel.apiChannelId) {
        throw new Error("Server channel id is missing.");
      }

      await deleteWorkspaceChannel(currentWorkspaceApiId, channel.apiChannelId);
      setApiChannels((prev) => sortChannelsByDisplayOrder(prev.filter((apiChannel) => apiChannel.id !== channel.apiChannelId)));
      setDeleteChannelTargetId(null);
      refreshWorkspaceChannels().catch(() => {
        // The deleted channel has already been removed locally after server success.
      });

      if (selectedChannel === channelId) setSelectedChannel('general');
      closeChannelMenu();
    } catch (error) {
      setDeleteChannelTargetId(null);
      setChannelActionError(getChannelActionErrorMessage(error, '채널을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setChannelActionPendingId(null);
      channelActionInFlightRef.current = false;
    }
  };

  const handleStartRenameCustomChannel = (channel: CustomChannelItem) => {
    setChannelActionError('');
    setEditingCustomChannelId(channel.id);
    setEditingCustomChannelLabel(channel.label);
    closeChannelMenu();
  };

  const handleCommitRenameCustomChannel = async () => {
    if (!editingCustomChannelId) return;
    if (channelActionInFlightRef.current) return;

    const channel = allCustomChannels.find((item) => item.id === editingCustomChannelId);
    const nextLabel = editingCustomChannelLabel.trim();
    const sourceApiChannel = channel?.apiChannelId
      ? apiChannels.find((apiChannel) => apiChannel.id === channel.apiChannelId)
      : undefined;
    if (!nextLabel || !channel) {
      setEditingCustomChannelId(null);
      setEditingCustomChannelLabel('');
      return;
    }
    if (!canManageWorkspaceChannels || !sourceApiChannel?.isDeletable) {
      setChannelActionError('이 채널은 수정할 수 없습니다.');
      setEditingCustomChannelId(null);
      setEditingCustomChannelLabel('');
      return;
    }
    if (!Number.isFinite(currentWorkspaceApiId) || currentWorkspaceApiId <= 0) {
      setChannelActionError("워크스페이스 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
      setEditingCustomChannelId(null);
      setEditingCustomChannelLabel('');
      return;
    }

    channelActionInFlightRef.current = true;
    setChannelActionPendingId(editingCustomChannelId);
    setChannelActionError('');

    try {
      if (!channel.apiChannelId) {
        throw new Error("Server channel id is missing.");
      }

      const currentApiChannel = apiChannels.find((apiChannel) => apiChannel.id === channel.apiChannelId);
      const updatedChannel = await updateWorkspaceChannel(currentWorkspaceApiId, channel.apiChannelId, {
        name: nextLabel,
        description: currentApiChannel?.description ?? null
      });

      setApiChannels((prev) =>
        sortChannelsByDisplayOrder(
          prev.map((apiChannel) => (apiChannel.id === updatedChannel.id ? updatedChannel : apiChannel))
        )
      );
      refreshWorkspaceChannels().catch(() => {
        // Keep the updated channel in local state when only the follow-up sync fails.
      });

      setEditingCustomChannelId(null);
      setEditingCustomChannelLabel('');
    } catch (error) {
      setChannelActionError(getChannelActionErrorMessage(error, '채널 이름을 수정하지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setChannelActionPendingId(null);
      channelActionInFlightRef.current = false;
    }
  };

  const toggleSidebarGroup = (group: SidebarGroupId) => {
    setExpandedSidebarGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const toggleRepoSubmenu = (repoId: string) => {
    setExpandedRepoSubmenus((prev) => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const handleSelectSidebarChannel = (channelId: string) => {
    setSelectedPR(null);
    setSelectedIssue(null);
    setSelectedThread(null);
    setSelectedChannel(channelId);
  };

  const renderSidebarChannel = (channel: SidebarChannel, nested = false) => {
    const Icon = channel.icon;
    const isActive = selectedChannel === channel.id;

    return (
      <motion.button
        key={channel.id}
        onClick={() => handleSelectSidebarChannel(channel.id)}
        className={`relative isolate flex w-full items-center gap-3 rounded-full border-0 text-left tracking-tight transition-colors ${nested ? 'pl-8 pr-3 py-2.5' : 'px-4 py-3'}`}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        }}
        whileTap={{ scale: 0.99 }}
      >
        {isActive && (
          <motion.div
            layoutId="workspaceSidebarActiveTab"
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)),
                rgba(11, 22, 40, 0.52)
              `,
              border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
              boxShadow: `
                0 0 24px rgba(var(--codedock-primary-rgb), 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.12),
                inset 0 0 18px rgba(255, 255, 255, 0.035)
              `,
              backdropFilter: 'blur(14px) saturate(180%)',
              WebkitBackdropFilter: 'blur(14px) saturate(180%)'
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30
            }}
          />
        )}
        <Icon size={nested ? 15 : 18} style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
        <span className="relative z-10 min-w-0 flex-1 truncate tracking-tight" style={{
          fontSize: nested ? '13px' : '14px',
          fontWeight: isActive ? 900 : 800,
          color: isActive ? 'var(--white)' : 'var(--muted)'
        }}>
          {channel.label}
        </span>
        {channel.badge && (
          <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
            background: isActive ? 'rgba(var(--codedock-primary-rgb), 0.22)' : 'rgba(234, 247, 255, 0.08)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
            color: isActive ? 'var(--neon-cyan)' : 'var(--muted)',
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 950
          }}>
            {channel.badge}
          </span>
        )}
      </motion.button>
    );
  };

  const renderSidebarGroup = (group: SidebarGroupId, label: string, channels: SidebarChannel[]) => {
    const isOpen = expandedSidebarGroups[group];
    const hasActiveChild = channels.some((channel) => channel.id === selectedChannel);

    return (
      <div className="grid gap-1">
        <motion.button
          type="button"
          onClick={() => toggleSidebarGroup(group)}
          className="w-full rounded-lg border-0 px-3 py-2.5 text-left transition-colors flex items-center gap-2"
          style={{
            background: hasActiveChild ? 'rgba(var(--codedock-primary-rgb), 0.10)' : 'rgba(234, 247, 255, 0.035)',
            border: hasActiveChild ? '1px solid rgba(var(--codedock-primary-rgb), 0.22)' : '1px solid rgba(var(--codedock-primary-rgb), 0.08)',
            cursor: 'pointer'
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronDown size={15} style={{ color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={15} style={{ color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
          )}
          <span className="min-w-0 flex-1 truncate tracking-tight" style={{
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 950,
            color: hasActiveChild ? 'var(--white)' : 'var(--muted)'
          }}>
            {label}
          </span>
          <span className="tracking-tight" style={{
            color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)',
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 900
          }}>
            {channels.length}
          </span>
        </motion.button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              className="grid gap-1 overflow-hidden"
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              {channels.map((channel) => renderSidebarChannel(channel, true))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderProfileDock = () => (
    <div className="relative" ref={profileMenuRef}>
      <button
        ref={profileButtonRef}
        type="button"
        onClick={() => { setShowRepoDropdown(false); setProfileMenuOpen((open) => !open); }}
        className="flex w-full items-center gap-3 rounded-2xl border-0 px-3 py-3 text-left tracking-tight transition-all"
        style={{
          background: profileMenuOpen
            ? 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.16), rgba(var(--codedock-secondary-rgb), 0.08)), rgba(11, 22, 40, 0.88)'
            : 'rgba(5, 11, 20, 0.72)',
          border: profileMenuOpen ? '1px solid rgba(var(--codedock-primary-rgb), 0.34)' : '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
          boxShadow: profileMenuOpen ? '0 0 28px rgba(var(--codedock-primary-rgb), 0.14)' : 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          cursor: 'pointer'
        }}
        aria-expanded={profileMenuOpen}
        aria-label="내 프로필 메뉴 열기"
      >
        <span className="relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-full" style={{
          background: 'linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))',
          color: '#021014',
          fontSize: '13px',
          fontWeight: 950
        }}>
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            : (profile.name.trim().slice(0, 2) || 'ME')}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full" style={{
            background: currentPresence.color,
            border: '2px solid #07111f'
          }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate" style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 950 }}>
            {profile.name || myProfile.name}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <Clock3 size={11} style={{ color: currentPresence.color, flexShrink: 0 }} />
            <span className="truncate" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 850 }}>
              {currentPresence.label}
            </span>
          </span>
        </span>
        <span className="relative grid h-8 w-8 flex-shrink-0 place-items-center rounded-full" style={{
          background: notificationMode === 'muted' ? 'rgba(255, 107, 107, 0.10)' : 'rgba(var(--codedock-primary-rgb), 0.10)',
          border: notificationMode === 'muted' ? '1px solid rgba(255, 107, 107, 0.22)' : '1px solid rgba(var(--codedock-primary-rgb), 0.16)'
        }}>
          <motion.span
            key={`mention-icon-${mentionPulseKey}`}
            className="grid place-items-center"
            initial={{ scale: 1, rotate: 0 }}
            animate={mentionPulseKey > 0 ? { scale: [1, 1.25, 1], rotate: [0, -12, 10, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <CurrentNotificationIcon size={14} style={{ color: notificationMode === 'muted' ? '#FF8FA3' : 'var(--neon-cyan)' }} />
          </motion.span>
          {unreadMentionCount > 0 && (
            <motion.span
              key={`mention-badge-${mentionPulseKey}`}
              className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full px-1"
              initial={{ scale: 1 }}
              animate={mentionPulseKey > 0 ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                height: '16px',
                background: 'var(--matrix-green)',
                color: '#021014',
                fontSize: '10px',
                fontWeight: 950,
                lineHeight: 1
              }}
            >
              {unreadMentionCount > 9 ? '9+' : unreadMentionCount}
            </motion.span>
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {profileMenuOpen && (
          <motion.div
            ref={profilePopupRef}
            className="codedock-scrollbar-hidden absolute bottom-[calc(100%+8px)] left-0 right-0"
            style={{
              maxHeight: 'min(420px, calc(100vh - 160px))',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              background: 'rgba(5, 11, 20, 0.98)',
              border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
              boxShadow: '0 20px 56px rgba(0, 0, 0, 0.48), 0 0 30px rgba(var(--codedock-primary-rgb), 0.12)',
              backdropFilter: 'blur(18px) saturate(180%)',
              borderRadius: '16px',
              padding: '12px',
              zIndex: 60,
            }}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="mb-3 px-1">
              <p className="m-0 tracking-tight" style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 950 }}>내 상태</p>
              <p className="m-0 mt-1 tracking-tight" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>팀원에게 표시되는 상태를 바꿉니다</p>
            </div>

            <div className="grid gap-1.5">
              {presenceOptions.map((option) => {
                const selected = option.id === userPresence;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setUserPresence(option.id);
                      const apiId = currentWorkspaceApiId;
                      if (apiId) updatePresence(apiId, option.id).then(() => refreshWorkspaceList()).catch(() => {});
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight"
                    style={{
                      background: selected ? 'rgba(var(--codedock-primary-rgb), 0.12)' : 'transparent',
                      border: selected ? '1px solid rgba(var(--codedock-primary-rgb), 0.20)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: option.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: 'var(--white)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{option.label}</span>
                      <span className="block truncate" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>{option.description}</span>
                    </span>
                    {selected && <Check size={14} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            <div className="my-3" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }} />

            <div className="mb-2 px-1">
              <p className="m-0 tracking-tight" style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 950 }}>알림 설정</p>
            </div>

            <div className="grid gap-1.5">
              {notificationOptions.map((option) => {
                const selected = option.id === notificationMode;
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setNotificationMode(option.id)}
                    className="flex w-full items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight"
                    style={{
                      background: selected ? 'rgba(var(--codedock-secondary-rgb), 0.10)' : 'transparent',
                      border: selected ? '1px solid rgba(var(--codedock-secondary-rgb), 0.18)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={15} style={{ color: selected ? 'var(--matrix-green)' : 'var(--muted)', flexShrink: 0 }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: 'var(--white)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{option.label}</span>
                      <span className="block truncate" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>{option.description}</span>
                    </span>
                    {selected && <Check size={14} style={{ color: 'var(--matrix-green)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {visibleWorkspaceMentions.length > 0 && (
              <>
                <div className="my-3" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }} />

                <div className="mb-2 px-1">
                  <p className="m-0 tracking-tight" style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 950 }}>
                    최근 멘션
                  </p>
                </div>

                <div className="grid gap-1.5">
                  {visibleWorkspaceMentions.slice(0, 6).map((mention) => (
                    <motion.div
                      key={mention.id}
                      className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 tracking-tight"
                      initial={{ opacity: 0, y: -4 }}
                      animate={mention.read
                        ? { opacity: 1, y: 0 }
                        : { opacity: 1, y: 0, boxShadow: ['0 0 0 0 rgba(0, 255, 170, 0)', '0 0 0 4px rgba(0, 255, 170, 0.28)', '0 0 0 0 rgba(0, 255, 170, 0)'] }}
                      transition={{ duration: mention.read ? 0.2 : 1.2, ease: 'easeOut' }}
                      style={{
                        background: mention.read ? 'transparent' : 'rgba(var(--codedock-primary-rgb), 0.10)',
                        border: mention.read ? '1px solid transparent' : '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!mention.read) {
                            handleMarkMentionAsRead(mention.id);
                          }
                          const uiChannelId = apiChannelUiById[mention.channelId];
                          if (uiChannelId) {
                            focusChannelMessage(uiChannelId, Number(mention.threadId));
                          }
                          setProfileMenuOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-0 text-left tracking-tight"
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{
                          background: mention.read ? 'rgba(234, 247, 255, 0.22)' : 'var(--matrix-green)'
                        }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate" style={{ color: 'var(--white)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                            {mention.mentionedByName}
                          </span>
                          <span className="block truncate" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                            {mention.content}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteMention(mention.id);
                        }}
                        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border-0"
                        style={{
                          background: 'rgba(234, 247, 255, 0.06)',
                          color: 'var(--muted)',
                          cursor: 'pointer'
                        }}
                        aria-label="멘션 알림 삭제"
                        title="멘션 알림 삭제"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            <div className="my-3" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }} />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}
                className="flex items-center justify-center gap-2 rounded-xl border-0 px-3 py-2.5 tracking-tight"
                style={{ background: 'rgba(234, 247, 255, 0.07)', border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)', color: 'var(--white)', cursor: 'pointer', fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}
              >
                <UserRound size={14} />
                프로필
              </button>
              <button
                type="button"
                onClick={() => { setProfileMenuOpen(false); navigate('/workspace-settings', { state: { workspaceId: selectedWorkspace } }); }}
                className="flex items-center justify-center gap-2 rounded-xl border-0 px-3 py-2.5 tracking-tight"
                style={{ background: 'rgba(234, 247, 255, 0.07)', border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)', color: 'var(--white)', cursor: 'pointer', fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}
              >
                <Settings size={14} />
                설정
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const handleMergePR = (messageId: number) => {
    setMessages(prevMessages => {
      const newMessages = { ...prevMessages };
      const channelMessages = newMessages[selectedChannelMessageKey];
      if (channelMessages) {
        // 원본 PR 카드를 approved(보라색)로 변경 — 새로고침 후에도 DB에서 같은 상태로 로드됨
        newMessages[selectedChannelMessageKey] = channelMessages.map(msg =>
          msg.id === messageId && msg.type === 'pr'
            ? { ...msg, prStatus: 'merged' as const }
            : msg
        );
      }
      return newMessages;
    });
  };

  // 메시지가 갱신(sync 후 재로드)되면 열려있는 PR 패널 데이터도 최신화
  useEffect(() => {
    if (!selectedPR) return;
    const updated = currentMessages.find(
      (m: any) => m.type === 'pr' && m.prNumber === selectedPR.prNumber
    );
    if (updated && (updated as any).prBody !== selectedPR.prBody) {
      setSelectedPR(updated);
    }
  }, [currentMessages]);

  const handleReviewPR = (prData: any) => {
    prevMainExpanded.current = isMainExpanded;
    setIsMainExpanded(true);
    setSelectedPR(prData);
    setSelectedIssue(null);
    setSelectedThread(null);
  };

  const handleClosePRReview = () => {
    setSelectedPR(null);
    setSelectedThread(null);
    setIsMainExpanded(prevMainExpanded.current);
  };

  const handleViewIssue = (issueData: any) => {
    prevMainExpanded.current = isMainExpanded;
    setIsMainExpanded(true);
    setSelectedIssue(issueData);
    setSelectedPR(null);
    setSelectedThread(null);
  };

  const handleCloseIssue = () => {
    setSelectedIssue(null);
    setSelectedThread(null);
    setIsMainExpanded(prevMainExpanded.current);
  };

  const handleOpenThread = (message: any) => {
    setFocusedMessageTarget(null);
    setSelectedThread(message);
    setSelectedPR(null);    // 스레드 열 때 PR 리뷰 닫기
    setSelectedIssue(null); // 스레드 열 때 이슈 패널 닫기
  };

  const handleCloseThread = () => {
    setSelectedThread(null);
  };

  // pendingEvent: 레포 목록 변경 시 레포·채널 선택
  useEffect(() => {
    const pending = pendingEventRef.current;
    if (!pending) return;
    if (pending.type === "MENTION" || pending.type === "REPLY") return; // 채널 처리는 아래에서
    if (!pending.repositoryName) return;
    const repo = repositories.find((r) => r.name === pending.repositoryName);
    if (!repo) return;
    setSelectedRepository(repo.id);
    if (pending.type === "PR_CREATED" || pending.type === "PR_REVIEW") {
      setSelectedChannel("pull-requests");
    } else if (pending.type === "ISSUE_CREATED") {
      setSelectedChannel("issues");
    }
  }, [repositories]);

  // pendingEvent: apiChannels 변경 시 MENTION·REPLY 채널 선택
  useEffect(() => {
    const pending = pendingEventRef.current;
    if (!pending || (pending.type !== "MENTION" && pending.type !== "REPLY")) return;
    if (!pending.channelId) return;
    const uiChannelId = apiChannelUiById[pending.channelId];
    if (uiChannelId) setSelectedChannel(uiChannelId);
  }, [apiChannelUiById]);

  // pendingEvent: 메시지 로드 후 PR·이슈·스레드 패널 열기
  useEffect(() => {
    const pending = pendingEventRef.current;
    if (!pending) return;
    if (pending.type === "PR_CREATED" || pending.type === "PR_REVIEW") {
      if (!pending.prNumber) return;
      const msg = currentMessages.find((m: any) => m.type === "pr" && m.prNumber === pending.prNumber);
      if (!msg) return;
      handleReviewPR(msg);
      pendingEventRef.current = null;
    } else if (pending.type === "ISSUE_CREATED") {
      if (!pending.issueNumber) return;
      const msg = currentMessages.find((m: any) => m.type === "issue" && m.issueNumber === pending.issueNumber);
      if (!msg) return;
      handleViewIssue(msg);
      pendingEventRef.current = null;
    } else if (pending.type === "MENTION" || pending.type === "REPLY") {
      if (!pending.threadId) return;
      const msg = currentMessages.find((m: any) => Number(m.backendMessageId ?? m.id) === pending.threadId);
      if (!msg) return;
      handleOpenThread(msg);
      pendingEventRef.current = null;
    }
  }, [currentMessages]);

  const getReactionTarget = (reactionKey: string) => {
    if (reactionKey.endsWith(":original") && selectedThread) {
      return {
        targetType: "thread" as const,
        targetId: Number(selectedThread.backendMessageId ?? selectedThread.id)
      };
    }

    const replyMatch = reactionKey.match(/:reply:(\d+)$/);
    if (replyMatch) {
      return {
        targetType: "thread_reply" as const,
        targetId: Number(replyMatch[1])
      };
    }

    const threadMatch = reactionKey.match(/:thread:(\d+)$/);
    if (threadMatch) {
      return {
        targetType: "thread" as const,
        targetId: Number(threadMatch[1])
      };
    }

    const messageMatch = reactionKey.match(/:message:(\d+)$/);
    if (messageMatch) {
      return {
        targetType: "thread" as const,
        targetId: Number(messageMatch[1])
      };
    }

    return null;
  };

  const handleToggleReaction = (reactionKey: string, emoji: string) => {
    const unscopedReactionKey = getChannelIdFromWorkspaceScopedChatKey(reactionKey);
    const reactionStateKey = getInteractionStateKey(unscopedReactionKey);
    const applyLocalReaction = () => {
      setMessageReactions((prev) => ({
        ...prev,
        [reactionStateKey]: toggleMessageReaction(prev[reactionStateKey], emoji)
      }));
    };
    const target = getReactionTarget(unscopedReactionKey);

    if (!activeApiChannelId || !target || !Number.isFinite(target.targetId)) {
      applyLocalReaction();
      return;
    }

    toggleChannelReaction(activeApiChannelId, {
      targetType: target.targetType,
      targetId: target.targetId,
      emoji
    })
      .then((response) => applyReactionResponse(response))
      .catch(applyLocalReaction);
  };

  const handleSharePR = (prData: any, shareText: string, channelIds: string[]) => {
    const trimmedShareText = shareText.trim();
    if (!trimmedShareText || channelIds.length === 0) return;

    const sharedMessage = {
      id: Date.now(),
      user: "CodeDock",
      text: trimmedShareText,
      time: "now",
      type: "pr" as const,
      prNumber: prData.prNumber,
      prTitle: prData.prTitle,
      prStatus: prData.prStatus ?? "open",
      prAuthor: prData.prAuthor ?? prData.user,
      filesChanged: prData.filesChanged,
      additions: prData.additions,
      deletions: prData.deletions,
      repository: prData.repository,
      aiRisk: prData.aiRisk,
      labels: prData.labels
    };

    setMessages((prev) => {
      const nextMessages = { ...prev };
      channelIds.forEach((channelId, index) => {
        const channelStateKey = getMessageChannelKey(channelId);
        nextMessages[channelStateKey] = [
          ...(nextMessages[channelStateKey] || []),
          { ...sharedMessage, id: sharedMessage.id + index }
        ];
      });
      return nextMessages;
    });

    setChannelUnreadCounts((prev) => {
      const nextCounts = { ...prev };
      channelIds.forEach((channelId) => {
        if (channelId !== selectedChannel) {
          const channelStateKey = getMessageChannelKey(channelId);
          nextCounts[channelStateKey] = (nextCounts[channelStateKey] || 0) + 1;
        }
      });
      return nextCounts;
    });
  };

  const handleSendMessage = (text: string, attachments: MessageAttachment[] = [], replyTo?: { user: string; text: string; messageId?: number }, metadata?: MessageMetadata) => {
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;
    if (attachments.length > 10) return;
    if (attachments.some((attachment) => !isSendableMessageAttachment(attachment))) return;
    const mentions = metadata?.mentions?.filter(Boolean) ?? [];
    const pendingMessageId = nextPendingMessageId();
    const clientMessageId = createClientMessageId();
    const attachmentPayload = attachments.map(toMessageAttachmentRequest);
    const messageText = trimmedText || `${attachments.length}개 항목을 공유합니다.`;
    const replyToMessageId = replyTo?.messageId;

    const nextMessage: any = {
      id: pendingMessageId,
      clientMessageId,
      senderMemberId: currentWorkspaceMemberId ?? undefined,
      user: currentDisplayName,
      avatarUrl: profile.avatarUrl || undefined,
      text: trimmedText || `${attachments.length}개 항목을 공유합니다.`,
      time: '방금',
      attachments,
      replyTo,
      ...(mentions.length ? { mentions } : {})
    };
    nextMessage.text = messageText;
    nextMessage.message = messageText;

    if (activeApiChannelId) {
      setMessages((prev) => ({
        ...prev,
        [selectedChannelMessageKey]: [
          ...(prev[selectedChannelMessageKey] || []),
          {
            ...nextMessage,
            pending: true,
            backendChannelId: activeApiChannelId,
            serverSyncState: "pending"
          }
        ]
      }));

      const stompClient = chatStompRef.current;
      if (stompClient && attachmentPayload.length === 0) {
        try {
          schedulePendingMessageFailure(selectedChannelMessageKey, pendingMessageId, clientMessageId);
          stompClient.send(
            chatWebSocketDestinations.sendChannelMessage(activeApiChannelId),
            {
              content: messageText,
              clientMessageId,
              ...(replyToMessageId ? { replyToMessageId } : {})
            }
          );
          return;
        } catch {
          // Fall back to REST creation below when the STOMP send path is unavailable.
        }
      }

      createChannelMessage(activeApiChannelId, {
        content: messageText,
        clientMessageId,
        ...(attachmentPayload.length > 0 ? { attachments: attachmentPayload } : {}),
        ...(replyToMessageId ? { replyToMessageId } : {})
      })
        .then((serverMessage) => appendServerMessage(selectedChannel, serverMessage))
        .catch((error) => {
          setMessages((prev) => ({
            ...prev,
            [selectedChannelMessageKey]: (prev[selectedChannelMessageKey] || []).map((item) =>
              item.id === pendingMessageId
                ? {
                    ...item,
                    pending: false,
                    serverSyncState: "failed",
                    sendError: error instanceof Error
                      ? error.message
                      : "첨부파일 전송에 실패했습니다."
                  }
                : item
            )
          }));
        });
      return;
    }

    setMessages((prev) => ({
      ...prev,
      [selectedChannelMessageKey]: [...(prev[selectedChannelMessageKey] || []), nextMessage]
    }));
  };

  const updateThreadMessageInState = (thread: any, patch: Record<string, unknown>) => {
    setMessages((prev) => ({
      ...prev,
      [selectedChannelMessageKey]: (prev[selectedChannelMessageKey] || []).map((item) =>
        item.id === thread.id || item.backendMessageId === thread.backendMessageId
          ? { ...item, ...patch }
          : item
      )
    }));
    setSelectedThread((prevThread: any) =>
      prevThread && (prevThread.id === thread.id || prevThread.backendMessageId === thread.backendMessageId)
        ? { ...prevThread, ...patch }
        : prevThread
    );
  };

  const handleEditThreadMessage = (thread: any, nextMessage: string) => {
    updateThreadMessageInState(thread, {
      message: nextMessage,
      text: nextMessage
    });

    const backendMessageId = Number(thread.backendMessageId ?? thread.id);
    if (!activeApiChannelId || !Number.isFinite(backendMessageId)) return;

    updateChannelMessage(activeApiChannelId, backendMessageId, { content: nextMessage }, {})
      .then((serverMessage) => replaceServerMessage(selectedChannel, serverMessage))
      .catch(() => {
        // Keep the optimistic edit so the local mock workflow is not interrupted.
      });
  };

  const handleDeleteThreadMessage = (thread: any) => {
    updateThreadMessageInState(thread, {
      message: DELETED_MESSAGE_LABEL,
      text: DELETED_MESSAGE_LABEL,
      deleted: true
    });

    const backendMessageId = Number(thread.backendMessageId ?? thread.id);
    if (!activeApiChannelId || !Number.isFinite(backendMessageId)) return;

    deleteChannelMessage(activeApiChannelId, backendMessageId, {})
      .then((serverMessage) => {
        replaceServerMessage(selectedChannel, { ...serverMessage, isDeleted: true });
      })
      .catch(() => {
        // Keep the optimistic delete so the local mock workflow is not interrupted.
      });
  };

  const updateThreadReplyInState = (thread: any, reply: any, patch: Record<string, unknown>) => {
    const key = getThreadReplyStateKey(thread);
    const targetReplyId = Number(reply.backendReplyId ?? reply.id);

    setThreadReplies((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((item) =>
        Number(item.backendReplyId ?? item.id) === targetReplyId
          ? { ...item, ...patch }
          : item
      )
    }));
  };

  const handleEditThreadReply = (reply: any, nextText: string) => {
    if (!selectedThread) return;

    const trimmedText = nextText.trim();
    if (!trimmedText) return;

    updateThreadReplyInState(selectedThread, reply, {
      text: trimmedText,
      message: trimmedText
    });

    const backendThreadId = Number(selectedThread.backendMessageId ?? selectedThread.id);
    const backendReplyId = Number(reply.backendReplyId ?? reply.id);
    if (!activeApiChannelId || !Number.isFinite(backendThreadId) || !Number.isFinite(backendReplyId)) return;

    updateThreadReply(backendThreadId, backendReplyId, { content: trimmedText }, {})
      .then((serverReply) => {
        updateThreadReplyInState(selectedThread, reply, mapThreadReplyToWorkspaceMessage(serverReply));
      })
      .catch(() => {
        // Keep the optimistic edit so the local mock workflow is not interrupted.
      });
  };

  const handleDeleteThreadReply = (reply: any) => {
    if (!selectedThread) return;

    // 표시용 통일 라벨로 낙관적 표시 → 서버 응답/브로드캐스트 수신 후에도 동일 문구라 깜빡임 없음
    updateThreadReplyInState(selectedThread, reply, {
      text: DELETED_MESSAGE_LABEL,
      message: DELETED_MESSAGE_LABEL,
      deleted: true
    });

    const backendThreadId = Number(selectedThread.backendMessageId ?? selectedThread.id);
    const backendReplyId = Number(reply.backendReplyId ?? reply.id);
    if (!activeApiChannelId || !Number.isFinite(backendThreadId) || !Number.isFinite(backendReplyId)) return;

    deleteThreadReply(backendThreadId, backendReplyId, {})
      .then((serverReply) => {
        updateThreadReplyInState(selectedThread, reply, {
          ...mapThreadReplyToWorkspaceMessage(serverReply),
          deleted: true
        });
      })
      .catch(() => {
        // Keep the optimistic delete so the local mock workflow is not interrupted.
      });
  };

  const handleSendReply = (text: string) => {
    if (selectedThread) {
      const key = getThreadReplyStateKey(selectedThread);
      const newReply: any = {
        id: Date.now(),
        user: currentDisplayName,
        avatarUrl: profile.avatarUrl || undefined,
        text: text,
        time: '방금'
      };

      setThreadReplies(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), newReply]
      }));
      setThreadReplyCounts(prev => {
        const nextCount = (prev[key] ?? selectedThread.replies ?? 0) + 1;
        return {
          ...prev,
          [key]: nextCount
        };
      });
      setSelectedThread((prevThread: any) =>
        prevThread
          ? {
              ...prevThread,
              replies: (prevThread.replies ?? 0) + 1,
              lastReply: newReply.user
            }
          : prevThread
      );
    }
  };

  const handleSendThreadReply = (text: string) => {
    if (!selectedThread) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    const key = getThreadReplyStateKey(selectedThread);
    const backendThreadId = Number(selectedThread.backendMessageId ?? selectedThread.id);
    const optimisticReply: any = {
      id: Date.now(),
      backendThreadId: Number.isFinite(backendThreadId) ? backendThreadId : undefined,
      senderMemberId: currentWorkspaceMemberId ?? undefined,
      user: currentDisplayName,
      avatarUrl: profile.avatarUrl || undefined,
      text: trimmedText,
      message: trimmedText,
      time: '방금'
    };

    const appendReply = (reply: any) => {
      setThreadReplies(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), reply]
      }));
      setThreadReplyCounts(prev => {
        const nextCount = (prev[key] ?? selectedThread.replies ?? 0) + 1;
        return {
          ...prev,
          [key]: nextCount
        };
      });
      setSelectedThread((prevThread: any) =>
        prevThread
          ? {
              ...prevThread,
              replies: (prevThread.replies ?? 0) + 1,
              lastReply: reply.user
            }
          : prevThread
      );
    };

    const replaceOptimisticReply = (reply: ThreadReply) => {
      const mappedReply = mapThreadReplyToWorkspaceMessage(reply);

      setThreadReplies(prev => ({
        ...prev,
        [key]: (prev[key] || []).map((item) =>
          item.id === optimisticReply.id ? mappedReply : item
        )
      }));
      setSelectedThread((prevThread: any) =>
        prevThread
          ? {
              ...prevThread,
              lastReply: mappedReply.user
            }
          : prevThread
      );
    };

    if (activeApiChannelId && Number.isFinite(backendThreadId)) {
      appendReply({ ...optimisticReply, pending: true, serverSyncState: "pending" });
      const stompClient = chatStompRef.current;
      if (stompClient) {
        schedulePendingThreadReplyFailure(key, optimisticReply.id);
        stompClient.send(
          chatWebSocketDestinations.sendThreadReply(backendThreadId),
          {
            content: trimmedText
          }
        );
        return;
      }

      createThreadReply(backendThreadId, { content: trimmedText }, {})
        .then(replaceOptimisticReply)
        .catch((error) => {
          markPendingThreadReplyFailed(
            key,
            optimisticReply.id,
            error instanceof Error ? error.message : "Thread reply send failed."
          );
        });
      return;
    }

    appendReply(optimisticReply);
  };

  const appendPanelThreadReply = (threadKey: string, msg: any) => {
    const key = getInteractionStateKey(threadKey);
    const nextReplies = [...(threadRepliesRef.current[key] || []), msg];
    const nextThreadReplies = {
      ...threadRepliesRef.current,
      [key]: nextReplies
    };

    threadRepliesRef.current = nextThreadReplies;
    setThreadReplies(nextThreadReplies);
    setThreadReplyCounts((prev) => ({
      ...prev,
      [key]: Math.max(prev[key] ?? 0, nextReplies.length)
    }));

    return nextReplies.length;
  };

  const handleAddPrThreadReply = (msg: any) => {
    if (!selectedPR) return;
    const threadKey = `pr-${selectedPR.id}`;
    const backendThreadId = Number(selectedPR.backendMessageId);
    const pendingReplyId = Date.now();
    const optimisticReply = {
      ...msg,
      id: pendingReplyId,
      backendThreadId: Number.isFinite(backendThreadId) ? backendThreadId : undefined,
      senderMemberId: currentWorkspaceMemberId ?? undefined,
      author: currentDisplayName,
      user: currentDisplayName,
      text: msg.text ?? msg.message ?? "",
      message: msg.message ?? msg.text ?? "",
      avatarUrl: profile.avatarUrl || undefined,
      pending: Number.isFinite(backendThreadId),
      serverSyncState: Number.isFinite(backendThreadId) ? "pending" : undefined
    };

    const nextCount = appendPanelThreadReply(threadKey, optimisticReply);
    setSelectedPR((prev: any) =>
      prev && prev.id === selectedPR.id
        ? { ...prev, replies: Math.max(prev.replies ?? 0, nextCount) }
        : prev
    );

    if (!Number.isFinite(backendThreadId)) return;

    const stateKey = getInteractionStateKey(threadKey);
    const content = String(optimisticReply.text).trim();
    const stompClient = chatStompRef.current;

    if (stompClient) {
      schedulePendingThreadReplyFailure(stateKey, pendingReplyId);
      stompClient.send(
        chatWebSocketDestinations.sendThreadReply(backendThreadId),
        { content }
      );
      return;
    }

    createThreadReply(backendThreadId, { content }, {})
      .then((serverReply) => appendServerThreadReply(selectedPR, serverReply))
      .catch((error) => {
        markPendingThreadReplyFailed(
          stateKey,
          pendingReplyId,
          error instanceof Error ? error.message : "PR thread reply send failed."
        );
      });
  };

  const handleAddIssueThreadReply = (msg: any) => {
    if (!selectedIssue) return;
    const nextCount = appendPanelThreadReply(`issue-${selectedIssue.id}`, msg);
    setSelectedIssue((prev: any) =>
      prev && prev.id === selectedIssue.id
        ? { ...prev, replies: Math.max(prev.replies ?? 0, nextCount) }
        : prev
    );
  };

  // 워크스페이스 목록 로드 전에는 mock(DEFAULT_WORKSPACES) 화면이 잠깐 보이지 않도록 로딩 표시
  if (!workspacesLoaded) {
    return (
      <div className={pageShellClassName} style={pageShellStyle}>
        <div className="grid h-full min-h-[320px] place-items-center">
          <p className="tracking-tight" style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 800 }}>
            워크스페이스를 불러오는 중…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShellClassName} style={pageShellStyle}>
      <div className={chatGridClassName} style={{
        gridTemplateColumns
      }}>
        {!selectedPR && !selectedIssue && (
          <section ref={sidebarRef} className="codedock-scrollbar-hidden codedock-scroll-lock-boundary min-h-0 min-w-0 overflow-y-auto rounded-[30px] px-[clamp(16px,1.4vw,24px)] py-[clamp(16px,1.4vw,24px)] flex flex-col" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
          <div className="mb-4">
            <button
              onClick={() => navigate('/workspace')}
              className="mb-2 flex items-center gap-1.5 tracking-tight transition-colors hover:text-white"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '12px', fontWeight: 800, padding: '0 4px' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              대시보드
            </button>
            <div className="relative" ref={repoDropdownRef}>
              <button
                onClick={() => { setProfileMenuOpen(false); setShowRepoDropdown(!showRepoDropdown); }}
                className="w-full px-4 py-3 rounded-lg border-0 flex items-center justify-between gap-2 transition-all"
                style={{
                  background: 'rgba(var(--codedock-primary-rgb), 0.12)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.3)',
                  cursor: 'pointer'
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))'
                  }}>
                    <LayoutGrid size={14} style={{ color: '#021014' }} />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--muted)', lineHeight: 1 }}>워크스페이스</span>
                    <span className="tracking-tight truncate" style={{ fontSize: '14px', fontWeight: 900, color: 'var(--white)' }}>
                      {currentWorkspace.name}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
              </button>

              <AnimatePresence initial={false}>
                {showRepoDropdown && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-2 rounded-lg z-10"
                    style={{
                      background: 'rgba(5, 11, 20, 0.95)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.3)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      maxHeight: 'calc(3 * 72px)',
                      overflowY: workspaceList.length > 3 ? 'auto' : 'hidden',
                      overflowX: 'hidden',
                    }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  >
                    {workspaceList.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          const nextWorkspaceApiId = getWorkspaceApiId(ws.id, ws);
                          setSelectedWorkspace(ws.id);
                          setContextWorkspaceId(nextWorkspaceApiId);
                          if (nextWorkspaceApiId) saveJson(LAST_WORKSPACE_KEY, nextWorkspaceApiId);
                          // location.state는 새로고침 후에도 history에 남으므로, 전환한 워크스페이스로 갱신해
                          // 새로고침 시 stale한 원래 진입값이 우선되지 않게 함
                          navigate(`${location.pathname}${location.search}`, {
                            replace: true,
                            state: { ...(location.state as Record<string, unknown> | null ?? {}), workspaceId: nextWorkspaceApiId }
                          });
                          const firstRepo = repositories.find(r => r.workspaceId === ws.id || r.workspaceId === String(nextWorkspaceApiId));
                          if (firstRepo) setSelectedRepository(firstRepo.id);
                          setSelectedChannel('overview');
                          setShowRepoDropdown(false);
                        }}
                        className="w-full border-0 px-3 py-3 text-left transition-colors"
                        style={{
                          background: selectedWorkspace === ws.id ? 'rgba(var(--codedock-primary-rgb), 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate tracking-tight" style={{
                              fontSize: '14px',
                              fontWeight: selectedWorkspace === ws.id ? 900 : 800,
                              color: selectedWorkspace === ws.id ? 'var(--neon-cyan)' : 'var(--white)'
                            }}>
                              {ws.name}
                            </span>
                            <span className="flex-shrink-0 rounded px-1.5 py-0.5 tracking-tight" style={{
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 900,
                              background: 'rgba(var(--codedock-primary-rgb), 0.12)',
                              color: 'var(--neon-cyan)',
                              border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)'
                            }}>
                              {ws.myRole}
                            </span>
                          </div>
                          <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)' }}>
                            {workspaceOnlineCounts[ws.id] ?? (ws.membersOnline + (userPresence !== 'offline' ? 1 : 0))}명 접속 중
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {hasRepositories && (
            <div className="mt-3 mb-2 flex items-center gap-2 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: currentWorkspace.connected ? 'var(--matrix-green)' : 'var(--muted)' }} />
                <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: currentWorkspace.connected ? 'var(--matrix-green)' : 'var(--muted)' }}>
                  {currentWorkspace.connected ? 'GitHub 연결됨' : '연결되지 않음'}
                </span>
              </div>
              <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)' }}>•</span>
              <button
                ref={memberListButtonRef}
                type="button"
                onClick={() => setMemberListOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border-0 transition-all"
                style={{ background: 'transparent', cursor: 'pointer', padding: '2px 6px', margin: '-2px -6px' }}
                title="팀원 목록 보기"
              >
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--matrix-green)' }} />
                <span className="tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)' }}>
                  {workspaceOnlineCounts[selectedWorkspace] ?? (currentWorkspace.membersOnline + (userPresence !== 'offline' ? 1 : 0))}명 접속 중
                </span>
              </button>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="codedock-scrollbar-hidden flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {renderSidebarChannel({ id: 'overview', label: '통합 개요', icon: Home })}

              <div className="my-1" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }} />

              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGeneralChannelsOpen((open) => !open)}
                  className="min-w-0 flex flex-1 items-center gap-1.5 rounded-lg border-0 px-0 py-1 text-left tracking-tight transition-colors"
                  style={{ background: "transparent", color: 'var(--muted)', cursor: 'pointer' }}
                  aria-expanded={isGeneralChannelsOpen}
                >
                  {isGeneralChannelsOpen ? (
                    <ChevronDown size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  ) : (
                    <ChevronRight size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  )}
                  <span className="truncate" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>채널</span>
                  <span className="ml-auto" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                    {allCustomChannels.length + 1}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomChannel}
                  className="grid h-5 w-5 place-items-center rounded border-0 transition-all hover:scale-110"
                  style={{ background: 'transparent', color: 'var(--muted)', cursor: 'pointer', opacity: canManageWorkspaceChannels ? 1 : 0.55 }}
                  aria-label="채널 추가"
                  title={canManageWorkspaceChannels ? '채널 추가' : 'owner/admin만 채널을 관리할 수 있습니다'}
                >
                  <Plus size={13} />
                </button>
              </div>
              {isGeneralChannelsOpen && (
                <div
                  className="grid max-h-[164px] min-h-[44px] gap-1 overflow-y-auto pr-1"
                  style={{ scrollbarWidth: 'none' }}
                >
                {renderSidebarChannel({ id: 'general', label: '일반', icon: Hash, badge: getChannelBadge('general') })}

              {allCustomChannels.map((ch) => {
                const isActive = selectedChannel === ch.id;
                const isEditing = editingCustomChannelId === ch.id;
                const isMenuOpen = channelMenuOpenId === ch.id;
                const isChannelActionPending = channelActionPendingId === ch.id;
                return (
                  <div key={ch.id} className="grid gap-0.5">
                    <div className="relative isolate flex w-full items-center rounded-full">
                      {isActive && (
                        <motion.div
                          layoutId="workspaceSidebarActiveTab"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                            boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(14px) saturate(180%)'
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {isEditing ? (
                        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-1.5 px-3 py-2.5">
                          <Hash size={15} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                          <input
                            value={editingCustomChannelLabel}
                            onChange={e => setEditingCustomChannelLabel(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); void handleCommitRenameCustomChannel(); }
                              if (e.key === 'Escape') { e.preventDefault(); setEditingCustomChannelId(null); setEditingCustomChannelLabel(''); }
                            }}
                            disabled={isChannelActionPending}
                            autoFocus
                            className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-0 py-1 outline-none tracking-tight"
                            style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 900 }}
                          />
                          <button
                            type="button"
                            onClick={() => { void handleCommitRenameCustomChannel(); }}
                            disabled={isChannelActionPending || !editingCustomChannelLabel.trim()}
                            className="flex flex-shrink-0 items-center gap-1 rounded-full border-0 px-2 py-1.5 tracking-tight"
                            style={{
                              background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                              color: '#021014',
                              cursor: isChannelActionPending || !editingCustomChannelLabel.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                              fontWeight: 950,
                              opacity: isChannelActionPending || !editingCustomChannelLabel.trim() ? 0.55 : 1
                            }}
                          >
                            <Check size={12} />
                            완료
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setSelectedChannel(ch.id); closeChannelMenu(); }}
                          className="relative z-10 flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
                          style={{ cursor: 'pointer' }}
                        >
                          <Hash size={15} style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
                          <span className="truncate tracking-tight flex-1" style={{
                            fontSize: '13px',
                            fontWeight: isActive ? 900 : 800,
                            color: isActive ? 'var(--white)' : 'var(--muted)'
                          }}>
                            {ch.label}
                          </span>
                          {getChannelBadge(ch.id) && (
                            <span className="relative z-10 flex-shrink-0 rounded-full px-1.5 py-0.5" style={{
                              background: 'rgba(var(--codedock-primary-rgb), 0.22)',
                              border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                              color: 'var(--neon-cyan)',
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}>
                              {getChannelBadge(ch.id)}
                            </span>
                          )}
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(event) => handleToggleChannelMenu(ch.id, event)}
                          disabled={isChannelActionPending}
                          className="relative z-10 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.10)]"
                          style={{ cursor: isChannelActionPending ? 'not-allowed' : 'pointer', opacity: isChannelActionPending ? 0.5 : 1 }}
                          aria-label="채널 옵션"
                        >
                          <MoreVertical size={13} style={{ color: isMenuOpen ? 'var(--neon-cyan)' : 'var(--muted)' }} />
                        </button>
                      )}
                      <div className="mr-2" />
                    </div>
                  </div>
                );
              })}
              {channelActionError && (
                <p className="mx-2 my-1 leading-relaxed tracking-tight" style={{ color: '#FF6B6B', fontSize: '12px', fontWeight: 850 }}>
                  {channelActionError}
                </p>
              )}
              </div>
              )}

              <div
                aria-hidden="true"
                className="mx-3 my-2 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(var(--codedock-primary-rgb), 0.22), rgba(234, 247, 255, 0.08), transparent)'
                }}
              />

              {visibleRepositories.length > 0 && (
              <div
                className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'none' }}
              >
              {visibleRepositories.map((repo) => {
                const repoChannelId = getRepositoryChannelUiId(repo);
                const isExpanded = expandedRepoSubmenus[repo.id] ?? repo.id === firstVisibleRepositoryId;
                const isPRActive = selectedRepository === repo.id && selectedChannel === 'pull-requests';
                const isIssueActive = selectedRepository === repo.id && selectedChannel === 'issues';
                const isRepoBodyActive = selectedRepository === repo.id && selectedChannel === repoChannelId;

                return (
                  <div key={repo.id} className="grid gap-1 min-w-0">
                    <div className="relative isolate flex w-full min-w-0 items-center rounded-full">
                      {isRepoBodyActive && (
                        <motion.div
                          layoutId="workspaceSidebarActiveTab"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                            boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(14px) saturate(180%)'
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelectedRepository(repo.id); setSelectedChannel(repoChannelId); }}
                        className="relative z-10 flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
                        style={{ cursor: 'pointer' }}
                      >
                        <GitBranch size={15} style={{ color: isRepoBodyActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
                        <span className="truncate tracking-tight flex-1" style={{
                          fontSize: '13px',
                          fontWeight: isRepoBodyActive ? 900 : 800,
                          color: isRepoBodyActive ? 'var(--white)' : 'var(--muted)'
                        }}>
                          {repo.name}
                        </span>
                        {getChannelBadge(repoChannelId) && (
                          <span className="relative z-10 flex-shrink-0 rounded-full px-1.5 py-0.5" style={{
                            background: 'rgba(var(--codedock-primary-rgb), 0.22)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                            color: 'var(--neon-cyan)',
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 950
                          }}>
                            {getChannelBadge(repoChannelId)}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepoMenuOpenId(repoMenuOpenId === repo.id ? null : repo.id)}
                        className="relative z-10 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.10)]"
                        style={{ cursor: 'pointer' }}
                        aria-label="레포 옵션"
                      >
                        <MoreVertical size={13} style={{ color: 'var(--muted)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRepoSubmenu(repo.id)}
                        className="relative z-10 mr-2 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.10)]"
                        style={{ cursor: 'pointer' }}
                        aria-label={isExpanded ? '서브메뉴 닫기' : '서브메뉴 열기'}
                      >
                        {isExpanded
                          ? <ChevronDown size={13} style={{ color: 'var(--muted)' }} />
                          : <ChevronRight size={13} style={{ color: 'var(--muted)' }} />
                        }
                      </button>
                    </div>

                    {repoMenuOpenId === repo.id && (
                      <div className="mx-2 overflow-hidden rounded-lg" style={{
                        background: 'rgba(5, 11, 20, 0.92)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                      }}>
                        <button
                          type="button"
                          onClick={() => { handleDeleteRepository(repo.id); setRepoMenuOpenId(null); }}
                          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(255,107,107,0.08)]"
                          style={{ background: 'transparent', color: '#FF6B6B', fontSize: "var(--krds-body-xsmall)", fontWeight: 800, cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                          채널 삭제
                        </button>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          className="grid gap-1 overflow-hidden"
                          initial={{ height: 0, opacity: 0, y: -4 }}
                          animate={{ height: 'auto', opacity: 1, y: 0 }}
                          exit={{ height: 0, opacity: 0, y: -4 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        >
                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('pull-requests'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {isPRActive && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                                  boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <GitPullRequest size={14} style={{ color: isPRActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: isPRActive ? 900 : 800, color: isPRActive ? 'var(--white)' : 'var(--muted)' }}>
                              PR
                            </span>
                            <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
                              background: isPRActive ? 'rgba(var(--codedock-primary-rgb), 0.22)' : 'rgba(234, 247, 255, 0.08)',
                              border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                              color: isPRActive ? 'var(--neon-cyan)' : 'var(--muted)',
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}>
                              {repo.openPRs}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('issues'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {isIssueActive && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                                  boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <CheckSquare size={14} style={{ color: isIssueActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: isIssueActive ? 900 : 800, color: isIssueActive ? 'var(--white)' : 'var(--muted)' }}>
                              이슈
                            </span>
                            <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
                              background: isIssueActive ? 'rgba(var(--codedock-primary-rgb), 0.22)' : 'rgba(234, 247, 255, 0.08)',
                              border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                              color: isIssueActive ? 'var(--neon-cyan)' : 'var(--muted)',
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}>
                              {repo.activeIssues}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('work-board'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {selectedChannel === 'work-board' && selectedRepository === repo.id && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                                  boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <LayoutGrid size={14} style={{ color: selectedChannel === 'work-board' && selectedRepository === repo.id ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: selectedChannel === 'work-board' && selectedRepository === repo.id ? 900 : 800, color: selectedChannel === 'work-board' && selectedRepository === repo.id ? 'var(--white)' : 'var(--muted)' }}>
                              작업 보드
                            </span>
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
                })}
                </div>
              )}

              {orphanRepositoryChannels.length > 0 && (
              <div className="grid max-h-[164px] content-start gap-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                <p className="px-1 pt-1" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: 'var(--muted)', margin: 0 }}>
                  레포지토리 채널
                </p>
                {orphanRepositoryChannels.map((ch) => {
                  const isActive = selectedChannel === ch.id;
                  return (
                    <div key={ch.id} className="relative isolate flex w-full items-center rounded-full">
                      {isActive && (
                        <motion.div
                          layoutId="workspaceSidebarActiveTab"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.30)',
                            boxShadow: '0 0 24px rgba(var(--codedock-primary-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(14px) saturate(180%)'
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelectedChannel(ch.id); closeChannelMenu(); }}
                        className="relative z-10 flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
                        style={{ cursor: 'pointer' }}
                      >
                        <GitBranch size={15} style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
                        <span className="truncate tracking-tight flex-1" style={{
                          fontSize: '13px',
                          fontWeight: isActive ? 900 : 800,
                          color: isActive ? 'var(--white)' : 'var(--muted)'
                        }}>
                          {ch.label}
                        </span>
                        {getChannelBadge(ch.id) && (
                          <span className="relative z-10 flex-shrink-0 rounded-full px-1.5 py-0.5" style={{
                            background: 'rgba(var(--codedock-primary-rgb), 0.22)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                            color: 'var(--neon-cyan)',
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 950
                          }}>
                            {getChannelBadge(ch.id)}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              )}

              <div className="my-1" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }}></div>

              {renderSidebarGroup('documentation', '문서', DOCUMENTATION_CHANNELS)}
              </div>
            </div>

            <div className="mt-auto grid gap-2 pt-4">
              <div className="mb-2" style={{ borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)' }}></div>

              {renderSidebarChannel({ id: 'team', label: '팀', icon: Users })}
              {renderProfileDock()}
            </div>
        </section>
        )}

        {!selectedPR && !selectedIssue && (
          <section className="relative h-full min-h-0 rounded-[30px] overflow-hidden" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            {hasRepositories && selectedChannel !== 'team' && (
              <div className="absolute right-4 top-4 z-40 flex items-start gap-2">
                {selectedChannel !== 'overview' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setChannelBookmarkMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-full border-0 px-4 py-2 tracking-tight transition-all hover:scale-[1.03]"
                    style={{
                      background: channelBookmarkMenuOpen ? 'rgba(5, 18, 30, 0.98)' : 'rgba(5, 11, 20, 0.96)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
                      color: 'var(--neon-cyan)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950,
                      cursor: 'pointer',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(16px)'
                    }}
                    aria-label="현재 채널 북마크 목록"
                    title="현재 채널 북마크 목록"
                  >
                    <Bookmark size={15} />
                    북마크 {currentChannelBookmarkItems.length}
                  </button>

                  <AnimatePresence>
                    {channelBookmarkMenuOpen && (
                      <motion.div
                        className="absolute right-0 top-[calc(100%+8px)] w-[300px] overflow-hidden rounded-2xl p-2.5"
                        style={{
                          background: 'linear-gradient(145deg, rgba(8, 18, 32, 0.98), rgba(4, 10, 18, 0.98))',
                          border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
                          boxShadow: '0 20px 56px rgba(0, 0, 0, 0.48), 0 0 26px rgba(var(--codedock-primary-rgb), 0.10)',
                          backdropFilter: 'blur(18px) saturate(170%)'
                        }}
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                          <p className="m-0 tracking-tight" style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 950 }}>
                            현재 채널 북마크
                          </p>
                          <span className="rounded-full px-2 py-0.5 tracking-tight" style={{
                            background: 'rgba(var(--codedock-primary-rgb), 0.10)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                            color: 'var(--neon-cyan)',
                            fontSize: '10px',
                            fontWeight: 950
                          }}>
                            {currentChannelBookmarkItems.length}
                          </span>
                        </div>

                        {currentChannelBookmarkItems.length > 0 ? (
                          <div className="grid max-h-[260px] gap-1.5 overflow-y-auto pr-1">
                            {currentChannelBookmarkItems.map((bookmark) => (
                              <button
                                key={bookmark.messageId}
                                type="button"
                                onClick={() => {
                                  focusChannelMessage(selectedChannel, bookmark.messageId);
                                  setChannelBookmarkMenuOpen(false);
                                }}
                                className="flex w-full items-start gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight"
                                style={{
                                  background: 'rgba(var(--codedock-primary-rgb), 0.08)',
                                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)',
                                  cursor: 'pointer'
                                }}
                              >
                                <Bookmark size={14} style={{ color: 'var(--neon-cyan)', flexShrink: 0, marginTop: 2 }} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate" style={{ color: 'var(--white)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                                    메시지 #{bookmark.messageId}
                                  </span>
                                  <span className="block truncate" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                                    {bookmark.content}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl px-3 py-3 tracking-tight" style={{
                            background: 'rgba(234, 247, 255, 0.04)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.10)',
                            color: 'var(--muted)',
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 850,
                            lineHeight: 1.5
                          }}>
                            현재 채널에 북마크한 메시지가 없습니다.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsMainExpanded((expanded) => !expanded)}
                  className="inline-flex min-h-[42px] min-w-[118px] items-center justify-center gap-2.5 rounded-full border-0 px-4 py-2 tracking-tight transition-all hover:scale-[1.03]"
                  style={{
                    background: 'rgba(5, 11, 20, 0.96)',
                    border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
                    color: 'var(--neon-cyan)',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950,
                    cursor: 'pointer',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(16px)'
                  }}
                  aria-label={isMainExpanded ? '채팅 박스 작게 보기' : '채팅 박스 크게 보기'}
                  title={isMainExpanded ? '작게 보기' : '크게 보기'}
                >
                  <span
                    className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full"
                    style={{
                      background: "rgba(var(--codedock-primary-rgb), 0.10)",
                      border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)"
                    }}
                  >
                    {isMainExpanded ? <Minimize2 size={12} strokeWidth={2.6} /> : <Maximize2 size={12} strokeWidth={2.6} />}
                  </span>
                  <span className="whitespace-nowrap leading-none">
                    {isMainExpanded ? '작게 보기' : '크게 보기'}
                  </span>
                </button>
              </div>
            )}
            {shouldShowRealtimeConnectionNotice && realtimeConnectionNotice && (
              <div
                className="pointer-events-none absolute right-5 top-16 z-30 flex max-w-[360px] items-start gap-2 rounded-2xl px-3 py-2 tracking-tight"
                style={{
                  background:
                    realtimeConnectionNotice.tone === "error"
                      ? "rgba(58, 13, 22, 0.88)"
                      : realtimeConnectionNotice.tone === "warning"
                      ? "rgba(62, 47, 12, 0.88)"
                      : "rgba(8, 26, 42, 0.86)",
                  border:
                    realtimeConnectionNotice.tone === "error"
                      ? "1px solid rgba(255, 107, 107, 0.34)"
                      : realtimeConnectionNotice.tone === "warning"
                      ? "1px solid rgba(255, 209, 102, 0.30)"
                      : "1px solid rgba(var(--codedock-primary-rgb), 0.28)",
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.34)",
                  backdropFilter: "blur(16px)",
                  color: "var(--white)"
                }}
                title={realtimeConnectionNotice.body}
              >
                {realtimeConnectionNotice.tone === "info" ? (
                  <Wifi size={15} style={{ color: "var(--neon-cyan)", flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <WifiOff
                    size={15}
                    style={{
                      color: realtimeConnectionNotice.tone === "error" ? "#FF6B6B" : "#FFD166",
                      flexShrink: 0,
                      marginTop: 2
                    }}
                  />
                )}
                <span className="min-w-0">
                  <span
                    className="block"
                    style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}
                  >
                    {realtimeConnectionNotice.title}
                  </span>
                  <span
                    className="block"
                    style={{
                      color: "rgba(234, 247, 255, 0.72)",
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 750,
                      lineHeight: 1.35
                    }}
                  >
                    {realtimeConnectionNotice.body}
                  </span>
                </span>
              </div>
            )}
            {selectedChannel === 'overview' ? (
              <OverviewPanel
                repositories={visibleRepositories}
                selectedRepositoryId={selectedRepository}
                onSelectRepository={setSelectedRepository}
                bookmarkGroups={workspaceBookmarkGroups}
                onOpenBookmark={focusChannelMessage}
              />
            ) : selectedChannel === 'api-spec' ? (
              <EmbeddedPanelBoundary key="api-spec">
                <APISpecPage embedded workspaceId={currentWorkspaceApiId} />
              </EmbeddedPanelBoundary>
            ) : selectedChannel === 'erd' ? (
              <EmbeddedPanelBoundary key={`erd-${selectedRepository}`}>
                <ERDPage embedded workspaceId={currentWorkspaceApiId} />
              </EmbeddedPanelBoundary>
            ) : selectedChannel === 'docs' ? (
              <EmbeddedPanelBoundary key="docs">
                <DocsPage embedded expanded={isMainExpanded} workspaceId={currentWorkspaceApiId} />
              </EmbeddedPanelBoundary>
            ) : selectedChannel === 'general' || allCustomChannels.some(ch => ch.id === selectedChannel) || selectedRepositoryApiChannel || selectedOrphanRepositoryChannel ? (
              <ChannelPanel
                channelId={selectedChannel}
                storageScopeId={selectedChannelMessageKey}
                repoId={selectedRepoForChannel?.id}
                repoName={selectedRepoForChannel?.name ?? selectedOrphanRepositoryChannel?.label ?? allCustomChannels.find(ch => ch.id === selectedChannel)?.label}
                myMemberId={currentWorkspaceMemberId}
                myDisplayName={currentDisplayName}
                myAvatarUrl={profile.avatarUrl}
                threads={currentChannelThreads}
                reactions={currentMessageReactions}
                replyCounts={mergedReplyCounts}
                onOpenThread={handleOpenThread}
                selectedThreadId={selectedThread?.id}
                focusedThreadId={focusedMessageTarget?.channelId === selectedChannel ? focusedMessageTarget.messageId : undefined}
                onOpenInvite={() => setTeamInviteOpen(true)}
                onSendThread={handleSendMessage}
                onAddMessageAttachments={activeApiChannelId
                  ? (message, attachments) => attachToExistingServerMessage(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      attachments
                    ).then(() => undefined)
                  : undefined}
                onDeleteMessageAttachment={activeApiChannelId
                  ? (message, attachment) => deleteExistingServerMessageAttachment(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      Number(attachment.id)
                    )
                  : undefined}
                onTypingChange={activeApiChannelId ? handleChannelTypingChange : undefined}
                remoteTypingLabel={activeRemoteTypingLabel}
                onToggleReaction={handleToggleReaction}
                bookmarkedThreadIds={activeApiChannelId ? activeServerBookmarkedThreadIds : undefined}
                onToggleBookmark={activeApiChannelId ? handleToggleThreadBookmark : undefined}
                onEditThread={handleEditThreadMessage}
                onDeleteThread={handleDeleteThreadMessage}
                onOpenProfile={handleOpenChatProfile}
              />
            ) : REPO_CHANNEL_IDS_REVERSE[selectedChannel] !== undefined ? (
              <ChannelPanel
                channelId={selectedChannel}
                storageScopeId={selectedChannelMessageKey}
                repoId={selectedRepository}
                repoName={currentRepo?.name}
                myMemberId={currentWorkspaceMemberId}
                myDisplayName={currentDisplayName}
                myAvatarUrl={profile.avatarUrl}
                threads={currentChannelThreads}
                reactions={currentMessageReactions}
                replyCounts={mergedReplyCounts}
                onOpenThread={handleOpenThread}
                selectedThreadId={selectedThread?.id}
                focusedThreadId={focusedMessageTarget?.channelId === selectedChannel ? focusedMessageTarget.messageId : undefined}
                onOpenInvite={() => setTeamInviteOpen(true)}
                onSendThread={handleSendMessage}
                onAddMessageAttachments={activeApiChannelId
                  ? (message, attachments) => attachToExistingServerMessage(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      attachments
                    ).then(() => undefined)
                  : undefined}
                onDeleteMessageAttachment={activeApiChannelId
                  ? (message, attachment) => deleteExistingServerMessageAttachment(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      Number(attachment.id)
                    )
                  : undefined}
                onTypingChange={activeApiChannelId ? handleChannelTypingChange : undefined}
                remoteTypingLabel={activeRemoteTypingLabel}
                onToggleReaction={handleToggleReaction}
                bookmarkedThreadIds={activeApiChannelId ? activeServerBookmarkedThreadIds : undefined}
                onToggleBookmark={activeApiChannelId ? handleToggleThreadBookmark : undefined}
                onEditThread={handleEditThreadMessage}
                onDeleteThread={handleDeleteThreadMessage}
                onOpenProfile={handleOpenChatProfile}
              />
            ) : repositories.find(r => r.id === selectedChannel) ? (
              <ChannelPanel
                channelId={selectedChannel}
                storageScopeId={selectedChannelMessageKey}
                repoId={selectedChannel}
                repoName={repositories.find(r => r.id === selectedChannel)?.name}
                myMemberId={currentWorkspaceMemberId}
                myDisplayName={currentDisplayName}
                myAvatarUrl={profile.avatarUrl}
                threads={currentChannelThreads}
                reactions={currentMessageReactions}
                replyCounts={mergedReplyCounts}
                onOpenThread={handleOpenThread}
                selectedThreadId={selectedThread?.id}
                focusedThreadId={focusedMessageTarget?.channelId === selectedChannel ? focusedMessageTarget.messageId : undefined}
                onOpenInvite={() => setTeamInviteOpen(true)}
                onSendThread={handleSendMessage}
                onAddMessageAttachments={activeApiChannelId
                  ? (message, attachments) => attachToExistingServerMessage(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      attachments
                    ).then(() => undefined)
                  : undefined}
                onDeleteMessageAttachment={activeApiChannelId
                  ? (message, attachment) => deleteExistingServerMessageAttachment(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      Number(attachment.id)
                    )
                  : undefined}
                onTypingChange={activeApiChannelId ? handleChannelTypingChange : undefined}
                remoteTypingLabel={activeRemoteTypingLabel}
                onToggleReaction={handleToggleReaction}
                bookmarkedThreadIds={activeApiChannelId ? activeServerBookmarkedThreadIds : undefined}
                onToggleBookmark={activeApiChannelId ? handleToggleThreadBookmark : undefined}
                onEditThread={handleEditThreadMessage}
                onDeleteThread={handleDeleteThreadMessage}
                onOpenProfile={handleOpenChatProfile}
              />
            ) : selectedChannel === 'work-board' ? (
              <WorkBoardPanel
                repositoryName={currentRepo?.name}
                onViewIssue={handleViewIssue}
              />
            ) : selectedChannel === 'team' ? (
              <TeamPanel
                workspaceId={selectedWorkspace}
                workspaceApiId={currentWorkspaceApiId}
                currentUserId={myProfile.id}
                currentUserOnline={userPresence !== 'offline'}
                presenceOverrides={presenceOverrides}
                onInvite={() => setTeamInviteOpen(true)}
                onOpenChannel={(channelId) => {
                  setSelectedPR(null);
                  setSelectedThread(null);
                  setSelectedChannel(channelId);
                }}
              />
            ) : (
              <ChatPanel
                channelId={selectedChannel}
                bookmarkScopeId={selectedChannelMessageKey}
                title={selectedChannelTitle}
                messages={currentMessages}
                myMemberId={currentWorkspaceMemberId}
                myDisplayName={currentDisplayName}
                myAvatarUrl={profile.avatarUrl}
                reactions={currentMessageReactions}
                replyCounts={mergedReplyCounts}
                onSendMessage={handleSendMessage}
                onAddMessageAttachments={activeApiChannelId
                  ? (message, attachments) => attachToExistingServerMessage(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      attachments
                    ).then(() => undefined)
                  : undefined}
                onDeleteMessageAttachment={activeApiChannelId
                  ? (message, attachment) => deleteExistingServerMessageAttachment(
                      selectedChannel,
                      activeApiChannelId,
                      Number(message.backendMessageId),
                      Number(attachment.id)
                    )
                  : undefined}
                onSharePR={handleSharePR}
                showAISummary={false}
                onMergePR={handleMergePR}
                onReviewPR={handleReviewPR}
                onViewIssue={handleViewIssue}
                onOpenThread={handleOpenThread}
                onOpenProfile={handleOpenChatProfile}
                selectedThreadId={selectedThread?.id}
                onToggleReaction={handleToggleReaction}
                isRepository={isRepository}
                onTypingChange={activeApiChannelId ? handleChannelTypingChange : undefined}
                remoteTypingLabel={activeRemoteTypingLabel}
              />
            )}
          </section>
        )}

        {selectedPR && (
          <section className="h-full min-h-0 rounded-[30px] overflow-hidden">
            <PRReviewPanel
              prData={selectedPR}
              repositoryDbId={currentRepo ? Number(currentRepo.id.replace('repo-', '')) : undefined}
              onClose={handleClosePRReview}
              onMergePR={handleMergePR}
              externalThreadMessages={currentThreadReplies[`pr-${selectedPR.id}`] ?? []}
              onAddThreadMessage={handleAddPrThreadReply}
            />
          </section>
        )}

        {selectedIssue && (
          <section className="h-full min-h-0 rounded-[30px] overflow-hidden">
            <IssuePanel
              issueData={selectedIssue}
              onClose={handleCloseIssue}
              externalThreadMessages={currentThreadReplies[`issue-${selectedIssue.id}`] ?? []}
              onAddThreadMessage={handleAddIssueThreadReply}
            />
          </section>
        )}

        {selectedThread && !selectedPR && !selectedIssue && (
          <section className="min-h-0 rounded-[30px] overflow-hidden">
            <ThreadPanel
              originalMessage={selectedThread}
              replies={currentThreadReplies[getThreadKey(selectedThread)] || []}
              myMemberId={currentWorkspaceMemberId}
              myDisplayName={currentDisplayName}
              myAvatarUrl={profile.avatarUrl}
              displayReplyCount={
                Math.max(
                  (currentThreadReplies[getThreadKey(selectedThread)] || []).length,
                  mergedReplyCounts[getThreadKey(selectedThread)] ?? 0,
                  selectedThread.replies ?? 0
                )
              }
              reactionScope={`thread:${selectedChannel}:${selectedThread.id}`}
              reactions={currentMessageReactions}
              onClose={handleCloseThread}
              onSendReply={handleSendThreadReply}
              onEditReply={activeApiChannelId ? handleEditThreadReply : undefined}
              onDeleteReply={activeApiChannelId ? handleDeleteThreadReply : undefined}
              onDeleteMessageAttachment={activeApiChannelId
                ? (message, attachment) => deleteExistingServerMessageAttachment(
                    selectedChannel,
                    activeApiChannelId,
                    Number(message.backendMessageId),
                    Number(attachment.id)
                  )
                : undefined}
              onToggleReaction={handleToggleReaction}
              onTypingChange={activeApiChannelId ? handleThreadTypingChange : undefined}
              remoteTypingLabel={activeRemoteThreadTypingLabel}
              onOpenProfile={handleOpenChatProfile}
            />
          </section>
        )}
      </div>

      {chatProfilePreview && (() => {
        const presenceMeta = PRESENCE_META[chatProfilePreview.presence ?? "offline"];
        const initial = chatProfilePreview.name.trim().slice(0, 1).toUpperCase() || "U";

        return (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center px-4"
            style={{ background: "rgba(0, 0, 0, 0.58)", backdropFilter: "blur(10px)" }}
            onClick={() => setChatProfilePreview(null)}
          >
            <div
              className="w-full max-w-[420px] rounded-[28px] p-6"
              style={{
                background: "rgba(8, 16, 32, 0.98)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
                boxShadow: "0 28px 80px rgba(0, 0, 0, 0.48)"
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-2xl" style={{
                    background: "rgba(var(--codedock-primary-rgb), 0.14)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.28)",
                    color: "var(--neon-cyan)",
                    fontSize: chatProfilePreview.avatarUrl ? 0 : "24px",
                    fontWeight: 950
                  }}>
                    {chatProfilePreview.avatarUrl ? (
                      <img src={chatProfilePreview.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: "20px", fontWeight: 950 }}>
                      {chatProfilePreview.name}
                    </p>
                    <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 800 }}>
                      {chatProfilePreview.role ?? "멤버"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatProfilePreview(null)}
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border-0"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", cursor: "pointer" }}
                  aria-label="프로필 닫기"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{
                  background: "rgba(234,247,255,0.045)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>상태</span>
                  <span className="inline-flex items-center gap-2" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 900 }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: presenceMeta.color }} />
                    {presenceMeta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{
                  background: "rgba(234,247,255,0.045)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>이메일</span>
                  <span className="truncate" style={{ color: chatProfilePreview.email ? "var(--white)" : "var(--muted)", fontSize: "13px", fontWeight: 900 }}>
                    {chatProfilePreview.email || "공개 이메일 없음"}
                  </span>
                </div>
              </div>

              <div
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 tracking-tight"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014",
                  fontSize: "14px",
                  fontWeight: 950
                }}
              >
                <UserRound size={16} />
                프로필 보기
              </div>
            </div>
          </div>
        );
      })()}

      <TeamInviteModal
        isOpen={teamInviteOpen}
        onClose={() => setTeamInviteOpen(false)}
      />

      {createPortal(
        <AnimatePresence>
          {addChannelStep && addChannelPosition && (
            <motion.div
              className="fixed z-[9998] w-[252px] rounded-xl p-2.5"
              style={{
                top: addChannelPosition.top,
                left: addChannelPosition.left,
                background: 'linear-gradient(145deg, rgba(8, 18, 32, 0.98), rgba(4, 10, 18, 0.98))',
                border: `1px solid ${addChannelStep === 'repo' ? 'rgba(var(--codedock-secondary-rgb), 0.24)' : 'rgba(var(--codedock-primary-rgb), 0.24)'}`,
                boxShadow: `0 16px 44px rgba(0,0,0,0.46), 0 0 24px ${addChannelStep === 'repo' ? 'rgba(var(--codedock-secondary-rgb),0.10)' : 'rgba(var(--codedock-primary-rgb),0.10)'}`,
                backdropFilter: 'blur(16px) saturate(160%)'
              }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            >
              {addChannelStep === 'select' && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                    <p style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: 'var(--white)', margin: 0 }}>채널 유형 선택</p>
                    <button
                      type="button"
                      onClick={handleCancelAddChannel}
                      className="grid h-6 w-6 place-items-center rounded-full border-0 transition-all hover:bg-[rgba(234,247,255,0.08)]"
                      style={{ background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                      aria-label="채널 생성 닫기"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectChannelType('chat')}
                      className="flex items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-left tracking-tight transition-all hover:scale-[1.01]"
                      style={{
                        background: 'rgba(var(--codedock-primary-rgb), 0.08)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      <Hash size={13} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="m-0 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--white)' }}>대화 채널</p>
                        <p className="m-0 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)' }}>팀 대화용 채널</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectChannelType('repo')}
                      className="flex items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-left tracking-tight transition-all hover:scale-[1.01]"
                      style={{
                        background: 'rgba(var(--codedock-secondary-rgb), 0.08)',
                        border: '1px solid rgba(var(--codedock-secondary-rgb), 0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      <GitBranch size={13} style={{ color: 'var(--matrix-green)', flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="m-0 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--white)' }}>레포 채널</p>
                        <p className="m-0 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)' }}>GitHub 저장소 연결</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {addChannelStep === 'chat' && (
                <>
                  <p style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--muted)', margin: '0 0 8px 0' }}>채널 이름</p>
                  <input
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { e.preventDefault(); handleCancelAddChannel(); }
                      if (e.key === 'Enter') { e.preventDefault(); void handleSubmitAddChannel(); }
                    }}
                    autoFocus
                    placeholder="새 채널 이름..."
                    className="w-full rounded-lg px-3 py-2 outline-none tracking-tight"
                    style={{
                      background: 'rgba(234, 247, 255, 0.08)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                      color: 'var(--white)',
                      fontSize: '13px',
                      fontWeight: 850
                    }}
                  />
                  {channelCreateError && (
                    <p className="mb-0 mt-2 leading-relaxed tracking-tight" style={{ color: '#FF6B6B', fontSize: '12px', fontWeight: 850 }}>
                      {channelCreateError}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelAddChannel}
                      className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.07)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleSubmitAddChannel(); }}
                      disabled={isSubmittingChannel}
                      className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                      style={{
                        background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                        color: '#021014',
                        cursor: isSubmittingChannel ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingChannel ? 0.72 : 1,
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 950
                      }}
                    >
                      {isSubmittingChannel ? '생성 중' : '만들기'}
                    </button>
                  </div>
                </>
              )}

              {addChannelStep === 'repo' && (
                <>
                  <p style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--muted)', margin: '0 0 4px 0' }}>레포 채널</p>
                  <p style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)', margin: '0 0 8px 0' }}>GitHub 저장소 URL을 입력하세요</p>
                  <input
                    value={newRepoChannelUrl}
                    onChange={e => setNewRepoChannelUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { e.preventDefault(); handleCancelAddChannel(); }
                    }}
                    autoFocus
                    placeholder="https://github.com/owner/repository"
                    className="w-full rounded-lg px-3 py-2 outline-none tracking-tight"
                    style={{
                      background: 'rgba(234, 247, 255, 0.08)',
                      border: '1px solid rgba(var(--codedock-secondary-rgb), 0.22)',
                      color: 'var(--white)',
                      fontSize: '13px',
                      fontWeight: 850
                    }}
                  />
                  {channelCreateError && (
                    <p className="mb-0 mt-2 leading-relaxed tracking-tight" style={{ color: '#FF6B6B', fontSize: '12px', fontWeight: 850 }}>
                      {channelCreateError}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelAddChannel}
                      className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.07)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitConnectedRepoChannel}
                      disabled={!parseRepoPartsFromUrl(newRepoChannelUrl)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full border-0 px-3 py-2 tracking-tight transition-all disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, var(--matrix-green), var(--deep-teal))',
                        color: '#021014',
                        cursor: parseRepoNameFromUrl(newRepoChannelUrl) ? 'pointer' : 'not-allowed',
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 950
                      }}
                    >
                      <Plus size={13} />
                      등록
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {channelMenuTarget && channelMenuPosition && (
            <>
              <motion.button
                type="button"
                className="fixed inset-0 z-[9997] cursor-default border-0 bg-transparent"
                aria-label="채널 옵션 닫기"
                onClick={closeChannelMenu}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="fixed z-[9998] w-36 overflow-hidden rounded-lg"
                style={{
                  top: channelMenuPosition.top,
                  left: channelMenuPosition.left,
                  background: 'rgba(5, 11, 20, 0.96)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.46), 0 0 20px rgba(var(--codedock-primary-rgb),0.10)',
                  backdropFilter: 'blur(14px) saturate(160%)'
                }}
                onClick={(event) => event.stopPropagation()}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                <div
                  className="grid grid-cols-2"
                  style={{ borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.10)' }}
                >
                  <button
                    type="button"
                    onClick={() => { void handleMoveCustomChannel(channelMenuTarget.id, -1); }}
                    disabled={isChannelMenuTargetPending || !canMoveChannelMenuTargetUp}
                    className="flex items-center justify-center gap-1 border-0 px-2 py-2 tracking-tight transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.08)]"
                    style={{
                      background: 'transparent',
                      color: 'var(--neon-cyan)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 800,
                      cursor: isChannelMenuTargetPending || !canMoveChannelMenuTargetUp ? 'not-allowed' : 'pointer',
                      opacity: isChannelMenuTargetPending || !canMoveChannelMenuTargetUp ? 0.42 : 1,
                      borderRight: '1px solid rgba(var(--codedock-primary-rgb), 0.10)'
                    }}
                  >
                    <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} />
                    위로
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleMoveCustomChannel(channelMenuTarget.id, 1); }}
                    disabled={isChannelMenuTargetPending || !canMoveChannelMenuTargetDown}
                    className="flex items-center justify-center gap-1 border-0 px-2 py-2 tracking-tight transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.08)]"
                    style={{
                      background: 'transparent',
                      color: 'var(--neon-cyan)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 800,
                      cursor: isChannelMenuTargetPending || !canMoveChannelMenuTargetDown ? 'not-allowed' : 'pointer',
                      opacity: isChannelMenuTargetPending || !canMoveChannelMenuTargetDown ? 0.42 : 1
                    }}
                  >
                    <ChevronDown size={13} />
                    아래
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartRenameCustomChannel(channelMenuTarget)}
                  disabled={isChannelMenuTargetPending || !canManageChannelMenuTarget}
                  className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(var(--codedock-primary-rgb),0.08)]"
                  style={{
                    background: 'transparent',
                    color: 'var(--white)',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 800,
                    cursor: isChannelMenuTargetPending || !canManageChannelMenuTarget ? 'not-allowed' : 'pointer',
                    opacity: isChannelMenuTargetPending || !canManageChannelMenuTarget ? 0.55 : 1,
                    borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.10)'
                  }}
                >
                  <Pencil size={13} style={{ color: 'var(--neon-cyan)' }} />
                  {canManageChannelMenuTarget ? '이름 수정' : '수정 불가'}
                </button>
                <button
                  type="button"
                  onClick={() => { void handleDeleteCustomChannel(channelMenuTarget.id); }}
                  disabled={isChannelMenuTargetPending || !canManageChannelMenuTarget}
                  className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(255,107,107,0.08)]"
                  style={{
                    background: 'transparent',
                    color: '#FF6B6B',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 800,
                    cursor: isChannelMenuTargetPending || !canManageChannelMenuTarget ? 'not-allowed' : 'pointer',
                    opacity: isChannelMenuTargetPending || !canManageChannelMenuTarget ? 0.5 : 1
                  }}
                >
                  <Trash2 size={13} />
                  {isChannelMenuTargetPending ? '삭제 중' : canManageChannelMenuTarget ? '채널 삭제' : '삭제 불가'}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {deleteChannelTarget && (
            <motion.div
              className="fixed inset-0 z-[9998] grid place-items-center px-4"
              style={{
                background: 'rgba(1, 6, 12, 0.68)',
                backdropFilter: 'blur(10px) saturate(150%)'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  handleCancelDeleteCustomChannel();
                }
              }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-channel-dialog-title"
                className="w-full max-w-[420px] overflow-hidden rounded-2xl"
                style={{
                  background: 'linear-gradient(145deg, rgba(8, 18, 32, 0.98), rgba(4, 10, 18, 0.98))',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.28)',
                  boxShadow: '0 28px 90px rgba(0, 0, 0, 0.58), 0 0 42px rgba(var(--codedock-primary-rgb), 0.14)',
                  backdropFilter: 'blur(20px) saturate(180%)'
                }}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <div className="grid gap-4 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl"
                      style={{
                        background: 'rgba(255, 107, 107, 0.12)',
                        border: '1px solid rgba(255, 107, 107, 0.24)',
                        color: '#FF6B6B'
                      }}
                    >
                      <Trash2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2
                        id="delete-channel-dialog-title"
                        className="m-0 tracking-tight"
                        style={{ color: 'var(--white)', fontSize: '16px', fontWeight: 950 }}
                      >
                        채널 삭제
                      </h2>
                      <p
                        className="m-0 mt-1 leading-relaxed tracking-tight"
                        style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}
                      >
                        <span style={{ color: 'var(--neon-cyan)', fontWeight: 950 }}>
                          {deleteChannelTarget.label}
                        </span>
                        {' '}채널을 삭제할까요? 채널에 연결된 채팅 기록과 관련 데이터도 함께 정리됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelDeleteCustomChannel}
                      disabled={channelActionPendingId === deleteChannelTarget.id}
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border-0"
                      style={{
                        background: 'rgba(234, 247, 255, 0.06)',
                        color: 'var(--muted)',
                        cursor: channelActionPendingId === deleteChannelTarget.id ? 'not-allowed' : 'pointer',
                        opacity: channelActionPendingId === deleteChannelTarget.id ? 0.55 : 1
                      }}
                      aria-label="삭제 취소"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelDeleteCustomChannel}
                      disabled={channelActionPendingId === deleteChannelTarget.id}
                      className="rounded-full border-0 px-4 py-2 tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.07)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)',
                        color: 'var(--muted)',
                        cursor: channelActionPendingId === deleteChannelTarget.id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 900,
                        opacity: channelActionPendingId === deleteChannelTarget.id ? 0.55 : 1
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleConfirmDeleteCustomChannel(); }}
                      disabled={channelActionPendingId === deleteChannelTarget.id}
                      className="rounded-full border-0 px-4 py-2 tracking-tight"
                      style={{
                        background: 'linear-gradient(135deg, #FF6B6B, #D94848)',
                        color: '#fff',
                        cursor: channelActionPendingId === deleteChannelTarget.id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 950,
                        opacity: channelActionPendingId === deleteChannelTarget.id ? 0.72 : 1,
                        boxShadow: '0 10px 24px rgba(255, 107, 107, 0.20)'
                      }}
                    >
                      {channelActionPendingId === deleteChannelTarget.id ? '삭제 중' : '삭제'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Team member list — compact anchored popup near "X명 접속 중" */}
      {createPortal(
        <AnimatePresence>
          {memberListOpen && memberListPos && (
            <motion.div
              ref={memberListPopupRef}
              className="codedock-scrollbar-hidden"
              style={{
                position: 'fixed',
                top: memberListPos.top,
                left: memberListPos.left,
                minWidth: memberListPos.width,
                width: '240px',
                maxHeight: '320px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                zIndex: 9997,
                background: 'rgba(5, 11, 20, 0.97)',
                border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--codedock-primary-rgb), 0.06)',
                backdropFilter: 'blur(16px)',
                padding: '6px',
              }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              {sortedWorkspaceMembers.length === 0 ? (
                <p style={{ margin: 0, padding: '12px', textAlign: 'center', fontSize: "var(--krds-body-xsmall)", color: 'var(--muted)' }}>팀원이 없습니다</p>
              ) : sortedWorkspaceMembers.map((member, idx) => {
                const pKey = (member.presence ?? (member.online ? 'active' : 'offline')) as PresenceKey;
                const meta = PRESENCE_META[pKey] ?? PRESENCE_META.offline;
                const isOnline = pKey !== 'offline';
                const prevIsOnline = idx > 0 ? (sortedWorkspaceMembers[idx - 1].presence ?? (sortedWorkspaceMembers[idx - 1].online ? 'active' : 'offline')) !== 'offline' : null;
                const showOnlineLabel = idx === 0 && isOnline;
                const showOfflineLabel = !isOnline && (idx === 0 || prevIsOnline === true);
                return (
                  <div key={member.id ?? idx}>
                    {showOnlineLabel && (
                      <p style={{ margin: '4px 0 2px 8px', fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: 'var(--matrix-green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        온라인
                      </p>
                    )}
                    {showOfflineLabel && (
                      <p style={{ margin: `${idx > 0 ? '8px' : '4px'} 0 2px 8px`, fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        오프라인
                      </p>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 10px', borderRadius: '10px',
                      background: 'transparent',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--codedock-primary-rgb), 0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Avatar with presence-colored status dot */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--neon-cyan), #8b7cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: '#021014',
                        }}>
                          {member.initials}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: '-1px', right: '-1px',
                          width: '9px', height: '9px', borderRadius: '50%',
                          background: meta.color,
                          border: '2px solid #050B14',
                        }} />
                      </div>
                      {/* Name + role (left), status label (top-right) */}
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: "var(--krds-body-xsmall)", fontWeight: 950, color: 'var(--white)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.name}
                          </p>
                          <p style={{ margin: '1px 0 0', fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.role}
                          </p>
                        </div>
                        <span style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 850, color: meta.color, flexShrink: 0, lineHeight: 1.2, paddingTop: '1px' }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function EmbeddedPanelBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="탭 화면을 불러오지 못했습니다"
      fallbackMessage="API 명세, ERD, 문서 화면 렌더링 중 오류가 발생했습니다. 다른 채널로 이동한 뒤 다시 열어주세요."
    >
      <Suspense fallback={<EmbeddedPanelFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function EmbeddedPanelFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full min-h-0 rounded-2xl"
      style={{
        background: "rgba(5, 11, 20, 0.64)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
      }}
    />
  );
}
