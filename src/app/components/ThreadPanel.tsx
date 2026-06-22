import { Check, Pencil, Trash2, X, Send, Smile, FileCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmojiPicker, REACTION_KEY_TO_EMOJI } from "./EmojiPicker";
import { MessageReactions, toggleMessageReaction, type MessageReaction } from "./MessageReactions";
import { TypingIndicatorBar } from "./TypingIndicatorBar";
import { MessageAttachmentCard } from "./MessageAttachmentCard";
import type { MessageAttachment } from "./messageAttachments";

interface ThreadMessage {
  id: number | string;
  backendReplyId?: number;
  backendThreadId?: number;
  senderMemberId?: number;
  user: string;
  avatarUrl?: string;
  text: string;
  message?: string;
  time: string;
  fileId?: string;
  fileName?: string;
  line?: number;
  code?: string;
  pending?: boolean;
  serverSyncState?: "pending" | "failed";
  sendError?: string;
  deleted?: boolean;
}

interface ThreadPanelProps {
  originalMessage: any;
  replies: ThreadMessage[];
  displayReplyCount?: number;
  reactionScope?: string;
  reactions?: Record<string, MessageReaction[]>;
  onClose: () => void;
  onSendReply: (text: string) => void;
  onEditReply?: (reply: ThreadMessage, nextText: string) => void;
  onDeleteReply?: (reply: ThreadMessage) => void;
  onDeleteMessageAttachment?: (message: any, attachment: MessageAttachment) => Promise<void> | void;
  onToggleReaction?: (reactionKey: string, emoji: string) => void;
  myMemberId?: number | null;
  myDisplayName?: string;
  myAvatarUrl?: string;
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

export function ThreadPanel({ originalMessage, replies, displayReplyCount, reactionScope, reactions, onClose, onSendReply, onEditReply, onDeleteReply, onDeleteMessageAttachment, onToggleReaction, myMemberId, myDisplayName, myAvatarUrl }: ThreadPanelProps) {
  const displayCurrentUserName = myDisplayName?.trim() || currentUserDisplayName;
  const displayCurrentUserAvatar = displayCurrentUserName.charAt(0) || currentUserAvatar;
  const displayCurrentUserAvatarUrl = myAvatarUrl?.trim() || "";
  const [replyText, setReplyText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<number | string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [hoveredToolBtn, setHoveredToolBtn] = useState<string | null>(null);
  const [responderTyping, setResponderTyping] = useState(false);
  const [localMessageReactions, setLocalMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const responderTypingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (responderTypingTimerRef.current) {
        window.clearTimeout(responderTypingTimerRef.current);
      }
    };
  }, []);

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
  }, [replies.length, responderTyping, replyText]);

  const triggerResponderTyping = () => {
    if (responderTypingTimerRef.current) {
      window.clearTimeout(responderTypingTimerRef.current);
    }

    setResponderTyping(true);
    responderTypingTimerRef.current = window.setTimeout(() => {
      setResponderTyping(false);
    }, 2200);
  };

  const handleSend = () => {
    if (replyText.trim()) {
      onSendReply(replyText);
      setReplyText('');
      setEmojiPickerOpen(false);
      triggerResponderTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const composerTyping = replyText.trim().length > 0;
  const typingLabel = responderTyping
    ? composerTyping
      ? `CodeDock AI, ${displayCurrentUserName} 입력 중입니다`
      : "CodeDock AI가 답글을 정리 중입니다"
    : composerTyping
      ? "내가 답글 입력 중입니다"
      : "";

  const handleEmojiSelect = (key: string) => {
    const emoji = REACTION_KEY_TO_EMOJI[key] ?? key;
    setReplyText((prev) => `${prev}${emoji}`);
    setEmojiPickerOpen(false);
  };

  const handleStartEditReply = (reply: ThreadMessage) => {
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.text);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const handleSubmitEditReply = (reply: ThreadMessage) => {
    const nextText = editingReplyText.trim();
    if (!nextText) return;

    onEditReply?.(reply, nextText);
    handleCancelEditReply();
  };
  const isReplyMine = (reply: ThreadMessage) => (
    myMemberId != null && reply.senderMemberId != null
      ? Number(reply.senderMemberId) === Number(myMemberId)
      : isSelfUser(reply.user)
  );
  const isOriginalMine = (
    myMemberId != null && originalMessage?.senderMemberId != null
      ? Number(originalMessage.senderMemberId) === Number(myMemberId)
      : isSelfUser(originalMessage?.user)
  );

  const handleDeleteOriginalAttachment = (attachment: MessageAttachment) => {
    if (!onDeleteMessageAttachment || deletingAttachmentId) return;

    setDeletingAttachmentId(attachment.id);
    setAttachmentError('');
    Promise.resolve(onDeleteMessageAttachment(originalMessage, attachment))
      .catch((error) => {
        setAttachmentError(error instanceof Error ? error.message : '첨부파일 삭제에 실패했습니다.');
      })
      .finally(() => {
        setDeletingAttachmentId(null);
      });
  };

  const handleDeleteReply = (reply: ThreadMessage) => {
    if (editingReplyId === reply.id) {
      handleCancelEditReply();
    }
    onDeleteReply?.(reply);
  };

  const handleReactionToggle = (reactionKey: string, emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(reactionKey, emoji);
      return;
    }

    setLocalMessageReactions((prev) => ({
      ...prev,
      [reactionKey]: toggleMessageReaction(prev[reactionKey], emoji)
    }));
  };

  const reactionMap = reactions ?? localMessageReactions;
  const activeReactionScope = reactionScope ?? `thread:${originalMessage.id ?? 0}`;
  const visibleReplyCount = displayReplyCount ?? Math.max(replies.length, originalMessage.replies ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{
      background: 'rgba(11, 22, 40, 0.82)',
      border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
      borderRadius: '30px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
      backdropFilter: 'blur(16px)'
    }}>
      <div className="flex items-center justify-between px-6 py-4" style={{
        borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
      }}>
        <h3 className="m-0 tracking-[-0.065em]" style={{
          fontSize: '18px',
          fontWeight: 950,
          color: 'var(--white)'
        }}>
          스레드
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border-0 flex items-center justify-center transition-all"
          style={{
            background: 'rgba(255, 107, 107, 0.15)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            color: '#FF6B6B',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-4">
          {/* 원본 메시지 */}
          <div className="pb-4" style={{
            borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="tracking-tight" style={{
                fontSize: '13px',
                fontWeight: 900,
                color: 'var(--matrix-green)'
              }}>
                {originalMessage.user}
              </span>
              <span className="tracking-tight" style={{
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 700,
                color: 'var(--muted)'
              }}>
                {originalMessage.time}
              </span>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{
              background: 'rgba(var(--codedock-primary-rgb), 0.08)',
              border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)'
            }}>
              <p className="m-0 leading-[1.5] tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--white)'
              }}>
                {originalMessage.message || originalMessage.text}
              </p>
              {!originalMessage.deleted && originalMessage.attachments && originalMessage.attachments.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {originalMessage.attachments.map((attachment: MessageAttachment) => (
                    <MessageAttachmentCard
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={
                        onDeleteMessageAttachment
                        && isOriginalMine
                        && !originalMessage.deleted
                        && Number.isFinite(Number(originalMessage.backendMessageId))
                        && Number.isFinite(Number(attachment.id))
                          ? () => handleDeleteOriginalAttachment(attachment)
                          : undefined
                      }
                      deleteDisabled={deletingAttachmentId === attachment.id}
                    />
                  ))}
                </div>
              )}
              {attachmentError && (
                <p className="m-0 mt-3 rounded-lg px-3 py-2 tracking-tight" style={{
                  background: 'rgba(255, 107, 107, 0.10)',
                  border: '1px solid rgba(255, 107, 107, 0.28)',
                  color: '#FF6B6B',
                  fontSize: '12px',
                  fontWeight: 900
                }}>
                  {attachmentError}
                </p>
              )}
            </div>
            {!originalMessage.deleted && (
              <MessageReactions
                reactions={reactionMap[`${activeReactionScope}:original`]}
                onToggle={(emoji) => handleReactionToggle(`${activeReactionScope}:original`, emoji)}
              />
            )}
          </div>

          {/* 답글 개수 표시 */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{
              background: 'rgba(var(--codedock-primary-rgb), 0.14)'
            }} />
            <span className="tracking-tight" style={{
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 800,
              color: 'var(--muted)'
            }}>
              {visibleReplyCount}개의 답글
            </span>
            <div className="h-px flex-1" style={{
              background: 'rgba(var(--codedock-primary-rgb), 0.14)'
            }} />
          </div>

          {/* 답글 목록 */}
          {replies.map((reply) => {
            const isMine = isReplyMine(reply);
            const replyAvatarUrl = isMine
              ? displayCurrentUserAvatarUrl
              : reply.avatarUrl?.trim() || "";
            const hasDiffRef = reply.fileId && reply.line > 0;
            const isEditingReply = editingReplyId === reply.id;
            const canManageReply = isMine && !reply.deleted && (onEditReply || onDeleteReply);
            return (
              <div key={reply.id} className="mb-2">
                <div className="px-4 py-3 rounded-xl" style={{
                  width: '100%',
                  maxWidth: '100%',
                  background: isMine ? 'rgba(var(--codedock-primary-rgb), 0.075)' : 'linear-gradient(135deg, rgba(5, 11, 20, 0.6), rgba(11, 22, 40, 0.4))',
                  border: isMine ? '1px solid rgba(var(--codedock-primary-rgb), 0.18)' : '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                  borderRadius: '12px',
                  boxShadow: 'none'
                }}>
                  <div className="flex items-center gap-2 mb-2 pb-2" style={{
                    borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.1)'
                  }}>
                    <div className="w-7 h-7 flex-shrink-0 overflow-hidden rounded-full flex items-center justify-center" style={{
                      background: isMine ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'rgba(var(--codedock-primary-rgb), 0.14)'
                    }}>
                      {replyAvatarUrl ? (
                        <img src={replyAvatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span style={{
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 900,
                          color: 'var(--neon-cyan)'
                        }}>
                          {isMine ? displayCurrentUserAvatar : reply.user.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tracking-tight" style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          color: isMine ? 'var(--neon-cyan)' : 'var(--white)'
                        }}>
                          {isMine ? displayCurrentUserName : reply.user}
                        </span>
                        {isMine && (
                          <span className="rounded px-1.5 py-0.5" style={{ background: 'rgba(var(--codedock-primary-rgb), 0.14)', color: 'var(--neon-cyan)', fontSize: '9px', fontWeight: 950 }}>내 메시지</span>
                        )}
                      </div>
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}>
                        {reply.time}
                      </span>
                    </div>
                    {canManageReply && (
                      <div className="flex items-center gap-1">
                        {onEditReply && (
                          <button
                            type="button"
                            onClick={() => handleStartEditReply(reply)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border-0"
                            style={{
                              background: isEditingReply ? 'rgba(32, 227, 255, 0.16)' : 'rgba(var(--codedock-primary-rgb), 0.08)',
                              border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                              color: isEditingReply ? 'var(--neon-cyan)' : 'var(--muted)',
                              cursor: 'pointer'
                            }}
                            aria-label="답글 수정"
                            title="답글 수정"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {onDeleteReply && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReply(reply)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border-0"
                            style={{
                              background: 'rgba(255, 107, 107, 0.10)',
                              border: '1px solid rgba(255, 107, 107, 0.18)',
                              color: '#FF6B6B',
                              cursor: 'pointer'
                            }}
                            aria-label="답글 삭제"
                            title="답글 삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {hasDiffRef && (
                    <div className="mb-2 overflow-hidden rounded-xl" style={{
                      background: 'rgba(5, 11, 20, 0.72)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                      userSelect: 'none'
                    }}>
                      <div className="flex items-center gap-2 px-3 py-1.5" style={{
                        borderBottom: '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                        background: 'rgba(var(--codedock-primary-rgb), 0.07)'
                      }}>
                        <FileCode size={11} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                        <span className="truncate font-mono" style={{ color: 'var(--neon-cyan)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                          {reply.fileName ?? reply.fileId}
                        </span>
                        <span className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono" style={{ background: 'rgba(var(--codedock-primary-rgb), 0.14)', color: 'var(--neon-cyan)', fontSize: '9px', fontWeight: 950 }}>
                          L{reply.line}
                        </span>
                      </div>
                      {reply.code && (
                        <div className="px-3 py-2 font-mono" style={{ color: '#C6D4E5', fontSize: "var(--krds-body-xsmall)", fontWeight: 850, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {reply.code}
                        </div>
                      )}
                    </div>
                  )}
                  {isEditingReply ? (
                    <div className="grid gap-2">
                      <textarea
                        value={editingReplyText}
                        onChange={(event) => setEditingReplyText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            handleSubmitEditReply(reply);
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            handleCancelEditReply();
                          }
                        }}
                        className="min-h-[72px] w-full resize-none rounded-xl border-0 px-3 py-2 tracking-tight outline-none"
                        style={{
                          background: 'rgba(5, 11, 20, 0.72)',
                          border: '1px solid rgba(var(--codedock-primary-rgb), 0.20)',
                          color: 'var(--white)',
                          fontSize: '13px',
                          fontWeight: 700,
                          lineHeight: 1.5
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEditReply}
                          className="flex items-center gap-1 rounded-lg border-0 px-3 py-1.5 tracking-tight"
                          style={{
                            background: 'rgba(234, 247, 255, 0.06)',
                            color: 'var(--muted)',
                            fontSize: '12px',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          <X size={13} />
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitEditReply(reply)}
                          disabled={!editingReplyText.trim()}
                          className="flex items-center gap-1 rounded-lg border-0 px-3 py-1.5 tracking-tight"
                          style={{
                            background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                            color: '#021014',
                            fontSize: '12px',
                            fontWeight: 950,
                            cursor: editingReplyText.trim() ? 'pointer' : 'not-allowed',
                            opacity: editingReplyText.trim() ? 1 : 0.5
                          }}
                        >
                          <Check size={13} />
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="m-0 leading-[1.5] tracking-tight whitespace-pre-wrap" style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: reply.deleted ? 'var(--muted)' : 'var(--soft-mint)'
                    }}>
                      {reply.text}
                    </p>
                  )}
                  {!reply.deleted && (
                    <MessageReactions
                      reactions={reactionMap[`${activeReactionScope}:reply:${reply.id}`]}
                      onToggle={(emoji) => handleReactionToggle(`${activeReactionScope}:reply:${reply.id}`, emoji)}
                    />
                  )}
                  {reply.sendError && (
                    <p className="m-0 mt-2 rounded-lg px-3 py-2 tracking-tight" style={{
                      background: 'rgba(255, 107, 107, 0.10)',
                      border: '1px solid rgba(255, 107, 107, 0.28)',
                      color: '#FF6B6B',
                      fontSize: '11px',
                      fontWeight: 900
                    }}>
                      {reply.sendError}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-1 pb-3" style={{
        borderTop: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
      }}>
        {emojiPickerOpen && (
          <div className="mb-2">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}

        <TypingIndicatorBar label={typingLabel} />

        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
            }}
            placeholder="답글 남기기..."
            className="min-w-0 flex-1 px-4 rounded-xl border-0 tracking-tight resize-none"
            rows={1}
            style={{
              background: 'rgba(5, 11, 20, 0.6)',
              border: '1px solid rgba(32, 227, 255, 0.14)',
              color: 'var(--white)',
              fontSize: '14px',
              fontWeight: 700,
              height: '44px',
              maxHeight: '96px',
              overflowY: 'auto',
              paddingTop: '12px',
              paddingBottom: '12px',
            }}
          />
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              {hoveredToolBtn === '이모지' && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 tracking-tight pointer-events-none z-10" style={{
                  background: 'rgba(11, 22, 40, 0.95)', border: '1px solid rgba(32, 227, 255, 0.2)',
                  color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap'
                }}>이모지</span>
              )}
              <button
                onClick={() => setEmojiPickerOpen((open) => !open)}
                onMouseEnter={() => setHoveredToolBtn('이모지')}
                onMouseLeave={() => setHoveredToolBtn(null)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-0"
                style={{
                  background: emojiPickerOpen || hoveredToolBtn === '이모지' ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
                  border: `1px solid ${emojiPickerOpen || hoveredToolBtn === '이모지' ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                  color: emojiPickerOpen || hoveredToolBtn === '이모지' ? 'var(--neon-cyan)' : 'var(--muted)',
                  cursor: 'pointer'
                }}
              >
                <Smile size={18} />
              </button>
            </div>
            <div className="relative">
              {hoveredToolBtn === '전송' && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 tracking-tight pointer-events-none z-10" style={{
                  background: 'rgba(11, 22, 40, 0.95)', border: '1px solid rgba(32, 227, 255, 0.2)',
                  color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap'
                }}>전송</span>
              )}
              <button
                onClick={handleSend}
                onMouseEnter={() => setHoveredToolBtn('전송')}
                onMouseLeave={() => setHoveredToolBtn(null)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-0"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                  color: '#021014',
                  cursor: 'pointer'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
