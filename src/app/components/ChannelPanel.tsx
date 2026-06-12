import { Hash, MessageSquare, Send, Bookmark, Reply, AtSign, X, Paperclip, Smile, UserPlus, FileUp, Code, Pencil, Trash2, Link2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createFileMessageAttachment, createLinkMessageAttachment, createLinkMessageAttachmentFromText, messageAttachmentGroups, messageAttachmentTypeLabels, type MessageAttachment, type MessageAttachmentType } from "./messageAttachments";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions, toggleMessageReaction, type MessageReaction } from "./MessageReactions";
import { MessageAttachmentCard } from "./MessageAttachmentCard";
import { TypingIndicatorBar } from "./TypingIndicatorBar";

interface Thread {
  id: number;
  backendMessageId?: number;
  backendChannelId?: number;
  user: string;
  avatar: string;
  message: string;
  time: string;
  replies: number;
  lastReply?: string;
  attachments?: MessageAttachment[];
  replyTo?: { user: string; text: string };
  pending?: boolean;
  deleted?: boolean;
}

interface ChannelPanelProps {
  channelId?: string;
  repoId?: string;
  repoName?: string;
  threads?: Thread[];
  reactions?: Record<string, MessageReaction[]>;
  replyCounts?: Record<number | string, number>;
  onOpenThread?: (message: any) => void;
  selectedThreadId?: number | string;
  onOpenInvite?: () => void;
  onSendThread?: (
    message: string,
    attachments?: MessageAttachment[],
    replyTo?: { user: string; text: string }
  ) => void;
  onTypingChange?: (typing: boolean) => void;
  remoteTypingLabel?: string;
  onToggleReaction?: (reactionKey: string, emoji: string) => void;
  onEditThread?: (thread: Thread, nextMessage: string) => void;
  onDeleteThread?: (thread: Thread) => void;
}

const CHANNEL_THREADS_KEY_PREFIX = "codedock-channel-threads-v1";

const GENERAL_THREADS: Thread[] = [
  { id: 1, user: '김재준', avatar: '👨‍💼', message: '이번 주 스프린트 계획 공유드립니다', time: '10:23 AM', replies: 3, lastReply: '안현' },
  { id: 2, user: '김진필', avatar: '👨‍💻', message: '새로운 API 엔드포인트 추가했습니다. /api/v2/users 확인해주세요', time: '11:45 AM', replies: 5, lastReply: '김재준' }
];

const SECUREFLOW_THREADS: Thread[] = [
  { id: 101, user: '김진현', avatar: '🎨', message: '로그인 페이지 채팅형 전환 애니메이션 확인 부탁드려요.', time: '오늘 10:42', replies: 2, lastReply: '안현' },
  { id: 102, user: '안현', avatar: '👩‍💻', message: '크게 보기 모드에서 헤더 덮는 부분까지 맞췄습니다.', time: '오늘 10:48', replies: 0 }
];
const AICHAT_THREADS: Thread[] = [
  { id: 201, user: '김진필', avatar: '👨‍💻', message: '회원 탈퇴와 워크스페이스 삭제 API 명세 추가 예정입니다.', time: '오늘 09:55', replies: 1, lastReply: 'CodeDock' },
  { id: 202, user: 'CodeDock', avatar: 'CD', message: '리포지토리 연동 해제 정책도 문서 목록에 연결해둘게요.', time: '오늘 09:58', replies: 0 }
];
const DASHBOARD_THREADS: Thread[] = [
  { id: 301, user: '김재준', avatar: '👨‍💼', message: '새로운 디자인 토큰 추가했습니다. 색상 조합이 정말 좋네요!', time: '오늘 14:20', replies: 2, lastReply: '김진현' },
  { id: 302, user: '김진현', avatar: '🎨', message: 'UI 컴포넌트 라이브러리 마이그레이션 완료했습니다.', time: '오늘 14:35', replies: 0 }
];

const REPO_THREADS: Record<string, Thread[]> = {
  'secureflow': SECUREFLOW_THREADS,
  'secureflow-2': SECUREFLOW_THREADS,
  'secureflow-3': SECUREFLOW_THREADS,
  'aichat': AICHAT_THREADS,
  'aichat-2': AICHAT_THREADS,
  'aichat-3': AICHAT_THREADS,
  'dashboard': DASHBOARD_THREADS,
  'dashboard-2': DASHBOARD_THREADS,
  'dashboard-3': DASHBOARD_THREADS,
};

function getDefaultThreads(repoId?: string) {
  return repoId ? (REPO_THREADS[repoId] ?? []) : GENERAL_THREADS;
}

function getSavedThreads(storageKey: string, fallback: Thread[]) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return fallback;
    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveThreads(storageKey: string, threads: Thread[]) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(threads));
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

const currentUserDisplayName = "김재준";
const currentUserAvatar = currentUserDisplayName.charAt(0);
const selfUserNames = new Set(["나", "me", "you", "jean", "jeaju", currentUserDisplayName]);

function isSelfUser(user?: string) {
  return selfUserNames.has((user ?? "").trim().toLowerCase());
}

function getDisplayUserName(user?: string) {
  const trimmed = (user ?? "").trim();
  return isSelfUser(trimmed) ? currentUserDisplayName : trimmed;
}

export function ChannelPanel({ channelId, repoId, repoName, threads, reactions, replyCounts = {}, onOpenThread, selectedThreadId, onOpenInvite, onSendThread, onTypingChange, remoteTypingLabel, onToggleReaction, onEditThread, onDeleteThread }: ChannelPanelProps) {
  const channelStorageId = channelId ?? repoId ?? "general";
  const channelStorageKey = `${CHANNEL_THREADS_KEY_PREFIX}:${channelStorageId}`;
  const [localThreads, setLocalThreads] = useState<Thread[]>(() =>
    getSavedThreads(channelStorageKey, getDefaultThreads(repoId))
  );
  const displayedThreads = threads ?? localThreads;

  const channelLabel = repoName ?? '일반';
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [codeBlockText, setCodeBlockText] = useState("");
  type ActivePanel = 'code' | 'attachment' | 'emoji' | 'link' | null;
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const togglePanel = (panel: Exclude<ActivePanel, null>) =>
    setActivePanel((prev) => (prev === panel ? null : panel));
  const [activeAttachmentType, setActiveAttachmentType] = useState<MessageAttachmentType>("pr");
  const [selectedAttachments, setSelectedAttachments] = useState<MessageAttachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [responderTyping, setResponderTyping] = useState(false);
  const [localThreadReactions, setLocalThreadReactions] = useState<Record<string, MessageReaction[]>>({});
  const [bookmarkedThreadIds, setBookmarkedThreadIds] = useState<Record<number, boolean>>({});
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [hoveredToolBtn, setHoveredToolBtn] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<number | null>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; right: number } | null>(null);
  const [replyTo, setReplyTo] = useState<Thread | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const skipThreadSaveRef = useRef(false);
  const responderTypingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (responderTypingTimerRef.current) {
        window.clearTimeout(responderTypingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    skipThreadSaveRef.current = true;
    setLocalThreads(getSavedThreads(channelStorageKey, getDefaultThreads(repoId)));
  }, [channelStorageKey, repoId]);

  useEffect(() => {
    if (skipThreadSaveRef.current) {
      skipThreadSaveRef.current = false;
      return;
    }

    saveThreads(channelStorageKey, localThreads);
  }, [channelStorageKey, localThreads]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [displayedThreads.length, responderTyping, messageText]);

  const triggerResponderTyping = () => {
    if (responderTypingTimerRef.current) {
      window.clearTimeout(responderTypingTimerRef.current);
    }
    setResponderTyping(true);
    responderTypingTimerRef.current = window.setTimeout(() => {
      setResponderTyping(false);
    }, 2200);
  };

  const activeAttachmentGroup =
    messageAttachmentGroups.find((group) => group.type === activeAttachmentType) ?? messageAttachmentGroups[0];
  const linkPreviewAttachment = linkUrl.trim()
    ? createLinkMessageAttachment(linkUrl, linkTitle)
    : null;

  const canSendMessage = messageText.trim().length > 0 || codeBlockText.trim().length > 0 || selectedAttachments.length > 0;
  const composerTyping = messageText.trim().length > 0;
  const localTypingLabel = responderTyping
    ? composerTyping
      ? `CodeDock AI, ${currentUserDisplayName} 입력 중입니다`
      : "CodeDock AI가 답변을 정리 중입니다"
    : composerTyping
      ? "내가 입력 중입니다"
      : "";
  const typingLabel = remoteTypingLabel || localTypingLabel;

  useEffect(() => {
    onTypingChange?.(composerTyping);
    return () => onTypingChange?.(false);
  }, [composerTyping, onTypingChange]);

  const handleAttachmentToggle = (attachment: MessageAttachment) => {
    setSelectedAttachments((prev) =>
      prev.some((item) => item.id === attachment.id)
        ? prev.filter((item) => item.id !== attachment.id)
        : [...prev, attachment]
    );
  };

  const handleAttachmentRemove = (attachmentId: string) => {
    setSelectedAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const handleLocalFilesSelected = (event: ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setSelectedAttachments((prev) => [
      ...prev,
      ...files.map((file) => createFileMessageAttachment(file, type))
    ]);
    event.target.value = "";
  };

  const handleAddLinkAttachment = () => {
    const attachment = createLinkMessageAttachment(linkUrl, linkTitle);
    if (!attachment) return;
    setSelectedAttachments((prev) => [...prev, attachment]);
    setLinkUrl("");
    setLinkTitle("");
    setActivePanel(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => `${prev}${emoji}`);
    setActivePanel(null);
  };

  const getThreadReactionKey = (threadId: number) => `channel:${channelStorageId}:thread:${threadId}`;

  const handleReactionToggle = (threadId: number, emoji: string) => {
    const reactionKey = getThreadReactionKey(threadId);

    if (onToggleReaction) {
      onToggleReaction(reactionKey, emoji);
      return;
    }

    setLocalThreadReactions((prev) => ({
      ...prev,
      [reactionKey]: toggleMessageReaction(prev[reactionKey], emoji)
    }));
  };

  const handleBookmarkToggle = (threadId: number) => {
    setBookmarkedThreadIds((prev) => ({
      ...prev,
      [threadId]: !prev[threadId]
    }));
  };

  const handleShareThread = (thread: Thread) => {
    setReplyTo(thread);
  };

  const handleStartEditThread = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditingMessageText(thread.message);
  };

  const handleCancelEditThread = () => {
    setEditingThreadId(null);
    setEditingMessageText("");
  };

  const handleSubmitEditThread = (thread: Thread) => {
    const nextMessage = editingMessageText.trim();
    if (!nextMessage) return;

    if (onEditThread) {
      onEditThread(thread, nextMessage);
    } else {
      setLocalThreads((prev) =>
        prev.map((item) => item.id === thread.id ? { ...item, message: nextMessage } : item)
      );
    }

    handleCancelEditThread();
  };

  const handleDeleteThread = (thread: Thread) => {
    if (onDeleteThread) {
      onDeleteThread(thread);
    } else {
      setLocalThreads((prev) =>
        prev.map((item) =>
          item.id === thread.id
            ? { ...item, message: "삭제된 메시지입니다.", deleted: true }
            : item
        )
      );
    }
  };

  const renderHoverMenu = (thread: Thread) => {
    const isBookmarked = bookmarkedThreadIds[thread.id];
    const canManageThread = isSelfUser(thread.user) && !thread.deleted;
    const bk = (label: string) => `${thread.id}:${label}`;
    const isHvr = (label: string) => hoveredBtn === bk(label);
    const currentLabel = hoveredBtn?.startsWith(`${thread.id}:`)
      ? hoveredBtn.replace(`${thread.id}:`, '')
      : null;

    const btnStyle = (label: string, active = false): React.CSSProperties => ({
      background: isHvr(label) ? 'rgba(32, 227, 255, 0.15)' : 'transparent',
      color: (isHvr(label) || active) ? 'var(--neon-cyan)' : 'var(--muted)',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s',
    });

    return (
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
        <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1" style={{
          background: 'rgba(11, 22, 40, 0.95)',
          border: '1px solid rgba(32, 227, 255, 0.3)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <button className="w-7 h-7 rounded flex items-center justify-center"
            style={btnStyle('댓글')}
            onMouseEnter={() => setHoveredBtn(bk('댓글'))}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => { e.stopPropagation(); onOpenThread?.(thread); }}
          ><MessageSquare size={14} /></button>

          <button className="w-7 h-7 rounded flex items-center justify-center"
            style={btnStyle('이모지', emojiPickerMsgId === thread.id)}
            onMouseEnter={() => setHoveredBtn(bk('이모지'))}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (emojiPickerMsgId === thread.id) {
                setEmojiPickerMsgId(null);
                setEmojiPickerPos(null);
              } else {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setEmojiPickerPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                setEmojiPickerMsgId(thread.id);
              }
            }}
          ><Smile size={14} /></button>

          <button className="w-7 h-7 rounded flex items-center justify-center"
            style={btnStyle('북마크', isBookmarked)}
            onMouseEnter={() => setHoveredBtn(bk('북마크'))}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => { e.stopPropagation(); handleBookmarkToggle(thread.id); }}
          ><Bookmark size={14} /></button>

          <button className="w-7 h-7 rounded flex items-center justify-center"
            style={btnStyle('답장')}
            onMouseEnter={() => setHoveredBtn(bk('답장'))}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => { e.stopPropagation(); handleShareThread(thread); }}
          ><Reply size={14} /></button>

          <button className="w-7 h-7 rounded flex items-center justify-center"
            style={btnStyle('멘션')}
            onMouseEnter={() => setHoveredBtn(bk('멘션'))}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={(e) => {
              e.stopPropagation();
              setMessageText((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${thread.user} `);
            }}
          ><AtSign size={14} /></button>

          {canManageThread && (
            <>
              <button className="w-7 h-7 rounded flex items-center justify-center"
                style={btnStyle('수정')}
                onMouseEnter={() => setHoveredBtn(bk('수정'))}
                onMouseLeave={() => setHoveredBtn(null)}
                onClick={(e) => { e.stopPropagation(); handleStartEditThread(thread); }}
              ><Pencil size={14} /></button>

              <button className="w-7 h-7 rounded flex items-center justify-center"
                style={btnStyle('삭제')}
                onMouseEnter={() => setHoveredBtn(bk('삭제'))}
                onMouseLeave={() => setHoveredBtn(null)}
                onClick={(e) => { e.stopPropagation(); handleDeleteThread(thread); }}
              ><Trash2 size={14} /></button>
            </>
          )}
        </div>

        {currentLabel && (
          <span className="rounded px-2 py-0.5 tracking-tight" style={{
            background: 'rgba(11, 22, 40, 0.95)',
            border: '1px solid rgba(32, 227, 255, 0.2)',
            color: 'var(--neon-cyan)',
            fontSize: '10px',
            fontWeight: 900,
          }}>{currentLabel}</span>
        )}

      </div>
    );
  };

  const handleSendMessage = () => {
    const trimmedMessage = messageText.trim();
    const trimmedCode = codeBlockText.trim();
    if (!canSendMessage) return;
    const outgoingMessage = trimmedCode
      ? `${trimmedMessage}${trimmedMessage ? "\n\n" : ""}\`\`\`\n${trimmedCode}\n\`\`\``
      : trimmedMessage;
    const detectedLinkAttachment = createLinkMessageAttachmentFromText(outgoingMessage);
    const outgoingAttachments = detectedLinkAttachment && !selectedAttachments.some((a) => a.url === detectedLinkAttachment.url)
      ? [...selectedAttachments, detectedLinkAttachment]
      : selectedAttachments;

    const nextThread: Thread = {
      id: Date.now(),
      user: currentUserDisplayName,
      avatar: currentUserAvatar,
      message: outgoingMessage || `${outgoingAttachments.length}개 항목을 공유합니다.`,
      time: '방금',
      replies: 0,
      attachments: outgoingAttachments,
      replyTo: replyTo ? { user: replyTo.user, text: replyTo.message } : undefined
    };

    if (onSendThread) {
      onSendThread(nextThread.message, nextThread.attachments, nextThread.replyTo);
    } else {
      setLocalThreads((prev) => [...prev, nextThread]);
    }
    setMessageText("");
    setCodeBlockText("");
    setSelectedAttachments([]);
    setActivePanel(null);
    setLinkUrl("");
    setLinkTitle("");
    setReplyTo(null);
    triggerResponderTyping();
  };

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const reactionMap = reactions ?? localThreadReactions;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {emojiPickerMsgId !== null && emojiPickerPos && (
        <div
          style={{ position: 'fixed', top: emojiPickerPos.top, right: emojiPickerPos.right, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker onSelect={(emoji) => {
            handleReactionToggle(emojiPickerMsgId, emoji);
            setEmojiPickerMsgId(null);
            setEmojiPickerPos(null);
          }} />
        </div>
      )}
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{
        borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
      }}>
        <div className="flex items-center gap-2">
          <Hash size={18} style={{ color: 'var(--neon-cyan)' }} />
          <h2 className="m-0 tracking-tight" style={{
            fontSize: '18px',
            fontWeight: 950,
            color: 'var(--white)'
          }}>
            {channelLabel}
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenInvite}
          className="inline-flex items-center gap-2 rounded-full border-0 px-3 py-2 tracking-tight transition-all"
          style={{
            background: 'rgba(var(--codedock-primary-rgb), 0.12)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
            color: 'var(--neon-cyan)',
            cursor: 'pointer',
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 950
          }}
          aria-label="팀원 추가"
        >
          <UserPlus size={15} />
          팀원 추가
        </button>
      </div>

      {/* Thread List */}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4">
          {displayedThreads.map((thread) => {
            const displayedReplyCount = replyCounts[thread.id] ?? thread.replies;
            const isOwnThread = isSelfUser(thread.user);
            const isEditingThread = editingThreadId === thread.id;

            return (
            <div
              key={thread.id}
              className="rounded-xl overflow-hidden relative group"
              style={{
                width: '100%',
                background: isOwnThread ? 'rgba(var(--codedock-primary-rgb), 0.075)' : 'rgba(5, 11, 20, 0.54)',
                border: selectedThreadId === thread.id
                  ? '2px solid rgba(var(--codedock-primary-rgb), 0.6)'
                  : isOwnThread ? '1px solid rgba(var(--codedock-primary-rgb), 0.18)' : '1px solid rgba(var(--codedock-primary-rgb), 0.14)',
                borderRadius: '12px',
                boxShadow: selectedThreadId === thread.id ? '0 0 12px rgba(32, 227, 255, 0.15)' : 'none'
              }}
              onMouseEnter={() => setHoveredMessageId(thread.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className="w-full px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full" style={{
                    background: isOwnThread ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'rgba(var(--codedock-primary-rgb), 0.12)',
                    border: isOwnThread ? '1px solid rgba(var(--codedock-primary-rgb), 0.30)' : '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                    color: 'var(--neon-cyan)',
                    fontSize: thread.avatar.length > 2 ? '18px' : '13px',
                    fontWeight: 950,
                    lineHeight: 1
                  }}>{isOwnThread ? currentUserAvatar : thread.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="tracking-tight" style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        color: isOwnThread ? 'var(--neon-cyan)' : 'var(--matrix-green)'
                      }}>
                        {isOwnThread ? getDisplayUserName(thread.user) : thread.user}
                      </span>
                      {isOwnThread && (
                        <span className="rounded px-1.5 py-0.5 tracking-tight" style={{
                          background: 'rgba(var(--codedock-primary-rgb), 0.12)',
                          color: 'var(--neon-cyan)',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}>
                          내 메시지
                        </span>
                      )}
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}>
                        {thread.time}
                      </span>
                    </div>
                    {thread.replyTo && (
                      <div className="mb-2 flex items-start gap-2 rounded-lg px-3 py-2" style={{
                        background: 'rgba(32, 227, 255, 0.05)',
                        border: '1px solid rgba(32, 227, 255, 0.14)',
                        borderLeft: '3px solid var(--neon-cyan)',
                      }}>
                        <div className="min-w-0 flex-1">
                          <span className="tracking-tight" style={{ color: 'var(--neon-cyan)', fontSize: '11px', fontWeight: 900 }}>
                            @{thread.replyTo.user}
                          </span>
                          <p className="m-0 mt-0.5 truncate tracking-tight" style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>
                            {thread.replyTo.text}
                          </p>
                        </div>
                      </div>
                    )}
                    {isEditingThread ? (
                      <div className="mb-3 grid gap-2" onClick={(event) => event.stopPropagation()}>
                        <textarea
                          value={editingMessageText}
                          onChange={(event) => setEditingMessageText(event.target.value)}
                          className="w-full resize-none rounded-lg px-3 py-2 tracking-tight outline-none"
                          rows={3}
                          style={{
                            background: 'rgba(5, 11, 20, 0.68)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
                            color: 'var(--white)',
                            fontSize: '14px',
                            fontWeight: 700,
                            lineHeight: 1.5
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditThread}
                            className="rounded-lg border-0 px-3 py-1.5 tracking-tight"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitEditThread(thread)}
                            className="rounded-lg border-0 px-3 py-1.5 tracking-tight"
                            style={{ background: 'rgba(var(--codedock-primary-rgb), 0.18)', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="m-0 mb-3 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: thread.deleted ? 'var(--muted)' : 'var(--white)',
                        lineHeight: '1.5'
                      }}>
                        {thread.message}
                      </p>
                    )}
                    {thread.attachments && thread.attachments.length > 0 && (
                      <div className="grid gap-2 mb-3">
                        {thread.attachments.map((attachment) => (
                          <MessageAttachmentCard
                            key={attachment.id}
                            attachment={attachment}
                            onClick={(event) => event.stopPropagation()}
                          />
                        ))}
                      </div>
                    )}
                    {(
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThread?.(thread);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                          style={{
                            background: 'rgba(var(--codedock-primary-rgb), 0.08)',
                            border: '1px solid rgba(var(--codedock-primary-rgb), 0.2)'
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(32, 227, 255, 0.16)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(32, 227, 255, 0.08)'; }}
                        >
                          <MessageSquare size={14} style={{ color: 'var(--neon-cyan)' }} />
                          <span className="tracking-tight" style={{
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 900,
                            color: 'var(--neon-cyan)'
                          }}>
                            답글 {displayedReplyCount}개
                          </span>
                        </button>
                        {thread.lastReply && (
                          <span className="tracking-tight" style={{
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 700,
                            color: 'var(--muted)'
                          }}>
                            마지막 답글: <span style={{ color: 'var(--matrix-green)' }}>{thread.lastReply}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pl-11">
                  <MessageReactions
                    reactions={reactionMap[getThreadReactionKey(thread.id)]}
                    onToggle={(emoji) => handleReactionToggle(thread.id, emoji)}
                  />
                </div>
              </div>

              {(hoveredMessageId === thread.id || emojiPickerMsgId === thread.id) && renderHoverMenu(thread)}
            </div>
          );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="px-6 pt-1 pb-3" style={{
        borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
      }}>
        {selectedAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="tracking-tight" style={{
              fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: 'var(--muted)'
            }}>
              첨부 {selectedAttachments.length}
            </span>
            {selectedAttachments.map((attachment) => (
              <button
                key={attachment.id}
                onClick={() => handleAttachmentRemove(attachment.id)}
                className="px-3 py-1.5 rounded-full border-0 flex items-center gap-2 tracking-tight"
                style={{
                  background: 'rgba(var(--codedock-primary-rgb), 0.12)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
                  color: 'var(--white)',
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
                title="첨부 제거"
              >
                <span style={{ color: 'var(--neon-cyan)' }}>{messageAttachmentTypeLabels[attachment.type]}</span>
                {attachment.title}
                <X size={12} />
              </button>
            ))}
          </div>
        )}

        {activePanel === 'code' && (
          <div className="mb-3 px-4 py-3 rounded-xl" style={{
            background: 'rgba(32, 227, 255, 0.08)',
            border: '1px solid rgba(32, 227, 255, 0.22)'
          }}>
            <p className="m-0 mb-2 tracking-tight" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--neon-cyan)' }}>
              코드 블록 모드
            </p>
            <textarea
              placeholder="코드를 입력하세요..."
              value={codeBlockText}
              onChange={(e) => setCodeBlockText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-0 font-mono tracking-tight resize-none"
              rows={4}
              style={{ background: 'rgba(5, 11, 20, 0.6)', border: '1px solid rgba(32, 227, 255, 0.14)', color: 'var(--white)', fontSize: '13px', fontWeight: 700 }}
            />
          </div>
        )}

        {activePanel === 'attachment' && (
          <div className="mb-3 rounded-xl px-4 py-3" style={{
            background: 'rgba(5, 11, 20, 0.78)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.24)'
          }}>
            <div className="flex flex-wrap gap-1 mb-3">
              {messageAttachmentGroups.map((group) => (
                <button
                  key={group.type}
                  onClick={() => setActiveAttachmentType(group.type)}
                  className="px-3 py-1.5 rounded-lg border-0 tracking-tight"
                  style={{
                    background: activeAttachmentType === group.type ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'transparent',
                    border: activeAttachmentType === group.type ? '1px solid rgba(var(--codedock-primary-rgb), 0.36)' : '1px solid transparent',
                    color: activeAttachmentType === group.type ? 'var(--neon-cyan)' : 'var(--muted)',
                    fontSize: "var(--krds-body-xsmall)", fontWeight: 950, cursor: 'pointer'
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <p className="m-0 mb-3 tracking-tight" style={{
              fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: 'var(--muted)'
            }}>
              {activeAttachmentGroup.description}
            </p>
            <div className="grid gap-2">
              {activeAttachmentGroup.items.map((attachment) => {
                const isSelected = selectedAttachments.some((item) => item.id === attachment.id);
                return (
                  <button
                    key={attachment.id}
                    onClick={() => handleAttachmentToggle(attachment)}
                    className="w-full rounded-lg px-3 py-2 border-0 text-left transition-all"
                    style={{
                      background: isSelected ? 'rgba(var(--codedock-primary-rgb), 0.14)' : 'rgba(11, 22, 40, 0.62)',
                      border: isSelected ? '1px solid rgba(var(--codedock-primary-rgb), 0.34)' : '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="tracking-tight" style={{
                        fontSize: '13px', fontWeight: 950, color: 'var(--white)'
                      }}>
                        {attachment.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full tracking-tight" style={{
                        background: isSelected ? 'rgba(var(--codedock-secondary-rgb), 0.16)' : 'rgba(var(--codedock-primary-rgb), 0.10)',
                        color: isSelected ? 'var(--matrix-green)' : 'var(--neon-cyan)',
                        fontSize: "var(--krds-body-xsmall)", fontWeight: 950, whiteSpace: 'nowrap'
                      }}>
                        {isSelected ? '선택됨' : attachment.meta}
                      </span>
                    </div>
                    <p className="m-0 mt-1 tracking-tight" style={{
                      fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: 'var(--muted)', lineHeight: '1.45'
                    }}>
                      {attachment.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activePanel === 'link' && (
          <div className="mb-3 rounded-xl px-4 py-3" style={{
            background: 'rgba(5, 11, 20, 0.78)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.24)'
          }}>
            <div className="mb-3 flex items-center gap-2">
              <Link2 size={16} style={{ color: 'var(--neon-cyan)' }} />
              <span className="tracking-tight" style={{
                color: 'var(--white)', fontSize: '13px', fontWeight: 950
              }}>
                링크 첨부
              </span>
            </div>
            <div className="grid gap-2 xl:grid-cols-[1fr_0.72fr_auto]">
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); handleAddLinkAttachment(); }
                }}
                placeholder="https://example.com"
                className="rounded-lg border-0 px-3 py-2 outline-none tracking-tight"
                style={{
                  background: 'rgba(11, 22, 40, 0.72)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)',
                  color: 'var(--white)', fontSize: '13px', fontWeight: 750
                }}
              />
              <input
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); handleAddLinkAttachment(); }
                }}
                placeholder="표시 이름 선택"
                className="rounded-lg border-0 px-3 py-2 outline-none tracking-tight"
                style={{
                  background: 'rgba(11, 22, 40, 0.72)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)',
                  color: 'var(--white)', fontSize: '13px', fontWeight: 750
                }}
              />
              <button
                type="button"
                onClick={handleAddLinkAttachment}
                disabled={!linkUrl.trim()}
                className="rounded-lg border-0 px-4 py-2 tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                  color: '#021014',
                  cursor: linkUrl.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px', fontWeight: 950,
                  opacity: linkUrl.trim() ? 1 : 0.48
                }}
              >
                추가
              </button>
            </div>
            {linkPreviewAttachment && (
              <div className="mt-3">
                <p className="m-0 mb-2 tracking-tight" style={{
                  color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 900
                }}>
                  미리보기
                </p>
                <MessageAttachmentCard
                  attachment={linkPreviewAttachment}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}

        {activePanel === 'emoji' && (
          <div className="mb-3">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleLocalFilesSelected(event, "file")}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleLocalFilesSelected(event, "image")}
        />

        <TypingIndicatorBar label={typingLabel} />

        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-xl px-3 py-2" style={{
            background: 'rgba(32, 227, 255, 0.06)',
            border: '1px solid rgba(32, 227, 255, 0.18)',
            borderLeft: '3px solid var(--neon-cyan)',
          }}>
            <div className="min-w-0 flex-1">
              <span className="tracking-tight" style={{ color: 'var(--neon-cyan)', fontSize: '11px', fontWeight: 900 }}>
                @{replyTo.user}에게 답장
              </span>
              <p className="m-0 mt-0.5 truncate tracking-tight" style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>
                {replyTo.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="flex-shrink-0 rounded border-0 flex items-center justify-center"
              style={{ background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: '2px' }}
              aria-label="답장 취소"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-2 px-4 py-2 rounded-xl" style={{
          background: 'rgba(5, 11, 20, 0.6)',
          border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
        }}>
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
              placeholder={`#${channelLabel}에 메시지 보내기`}
              className="min-w-0 flex-1 bg-transparent border-0 outline-none tracking-tight resize-none"
              rows={1}
              style={{ color: 'var(--white)', fontSize: '14px', fontWeight: 700, minHeight: '28px', maxHeight: '96px', overflowY: 'auto' }}
            />
            <div className="flex shrink-0 items-center gap-1">
            {[
              { label: '코드 블록', icon: <Code size={18} />, onClick: () => togglePanel('code'), active: activePanel === 'code' },
              { label: '목록 첨부', icon: <Paperclip size={18} />, onClick: () => togglePanel('attachment'), active: activePanel === 'attachment' },
              { label: '파일 첨부', icon: <FileUp size={18} />, onClick: () => fileInputRef.current?.click(), active: false },
              { label: '이모지', icon: <Smile size={18} />, onClick: () => togglePanel('emoji'), active: activePanel === 'emoji' },
            ].map(({ label, icon, onClick, active }) => (
              <div key={label} className="relative">
                {hoveredToolBtn === label && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 tracking-tight pointer-events-none z-10" style={{
                    background: 'rgba(11, 22, 40, 0.95)', border: '1px solid rgba(32, 227, 255, 0.2)',
                    color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap'
                  }}>{label}</span>
                )}
                <button
                  onClick={onClick}
                  onMouseEnter={() => setHoveredToolBtn(label)}
                  onMouseLeave={() => setHoveredToolBtn(null)}
                  className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    background: active || hoveredToolBtn === label ? 'rgba(32, 227, 255, 0.15)' : 'rgba(32, 227, 255, 0.08)',
                    border: `1px solid ${active || hoveredToolBtn === label ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                    color: active || hoveredToolBtn === label ? 'var(--neon-cyan)' : 'var(--muted)'
                  }}
                >{icon}</button>
              </div>
            ))}
          </div>
          <div className="relative">
            {hoveredToolBtn === '전송' && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 tracking-tight pointer-events-none z-10" style={{
                background: 'rgba(11, 22, 40, 0.95)', border: '1px solid rgba(32, 227, 255, 0.2)',
                color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap'
              }}>전송</span>
            )}
            <button
              onClick={handleSendMessage}
              disabled={!canSendMessage}
              onMouseEnter={() => setHoveredToolBtn('전송')}
              onMouseLeave={() => setHoveredToolBtn(null)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                color: '#021014',
                cursor: canSendMessage ? 'pointer' : 'not-allowed',
                opacity: canSendMessage ? 1 : 0.48
              }}
              aria-label="메시지 전송"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
