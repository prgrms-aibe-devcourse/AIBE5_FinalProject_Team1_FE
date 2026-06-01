import { X, Send, Smile, FileCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TypingIndicator } from "./TypingIndicator";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions, toggleMessageReaction, type MessageReaction } from "./MessageReactions";

interface ThreadMessage {
  id: number | string;
  user: string;
  text: string;
  time: string;
  fileId?: string;
  fileName?: string;
  line?: number;
  code?: string;
}

interface ThreadPanelProps {
  originalMessage: any;
  replies: ThreadMessage[];
  displayReplyCount?: number;
  reactionScope?: string;
  reactions?: Record<string, MessageReaction[]>;
  onClose: () => void;
  onSendReply: (text: string) => void;
  onToggleReaction?: (reactionKey: string, emoji: string) => void;
}

export function ThreadPanel({ originalMessage, replies, displayReplyCount, reactionScope, reactions, onClose, onSendReply, onToggleReaction }: ThreadPanelProps) {
  const [replyText, setReplyText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
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

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth"
    });
  }, [replies.length, responderTyping]);

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
    ? "CodeDock AI가 답글을 정리 중입니다"
    : composerTyping
      ? "내가 답글 입력 중입니다"
      : "";
  const typingNote = responderTyping
    ? "스레드 맥락을 확인하고 있습니다."
    : composerTyping
      ? "팀원에게 입력 중 상태로 표시됩니다."
      : "";

  const handleEmojiSelect = (emoji: string) => {
    setReplyText((prev) => `${prev}${emoji}`);
    setEmojiPickerOpen(false);
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
    <div className="h-full flex flex-col" style={{
      background: 'rgba(11, 22, 40, 0.82)',
      border: '1px solid rgba(32, 227, 255, 0.16)',
      borderRadius: '30px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
      backdropFilter: 'blur(16px)'
    }}>
      <div className="flex items-center justify-between px-6 py-4" style={{
        borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-4">
          {/* 원본 메시지 */}
          <div className="pb-4" style={{
            borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
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
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--muted)'
              }}>
                {originalMessage.time}
              </span>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{
              background: 'rgba(32, 227, 255, 0.08)',
              border: '1px solid rgba(32, 227, 255, 0.22)'
            }}>
              <p className="m-0 leading-[1.5] tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--white)'
              }}>
                {originalMessage.message || originalMessage.text}
              </p>
            </div>
            <MessageReactions
              reactions={reactionMap[`${activeReactionScope}:original`]}
              onToggle={(emoji) => handleReactionToggle(`${activeReactionScope}:original`, emoji)}
            />
          </div>

          {/* 답글 개수 표시 */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{
              background: 'rgba(32, 227, 255, 0.14)'
            }} />
            <span className="tracking-tight" style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--muted)'
            }}>
              {visibleReplyCount}개의 답글
            </span>
            <div className="h-px flex-1" style={{
              background: 'rgba(32, 227, 255, 0.14)'
            }} />
          </div>

          {/* 답글 목록 */}
          {replies.map((reply) => {
            const isMine = reply.user === '나';
            const hasDiffRef = reply.fileId && reply.line > 0;
            return (
              <div key={reply.id} className="mb-2">
                <div className="px-4 py-3 rounded-xl" style={{
                  background: isMine ? 'rgba(32, 227, 255, 0.10)' : 'linear-gradient(135deg, rgba(5, 11, 20, 0.6), rgba(11, 22, 40, 0.4))',
                  border: isMine ? '1px solid rgba(32, 227, 255, 0.28)' : '1px solid rgba(32, 227, 255, 0.16)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="flex items-center gap-2 mb-2 pb-2" style={{
                    borderBottom: '1px solid rgba(32, 227, 255, 0.1)'
                  }}>
                    <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center" style={{
                      background: isMine ? 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))' : 'rgba(32, 227, 255, 0.14)'
                    }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        color: isMine ? '#021014' : 'var(--neon-cyan)'
                      }}>
                        {reply.user.charAt(0)}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tracking-tight" style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          color: isMine ? 'var(--neon-cyan)' : 'var(--white)'
                        }}>
                          {reply.user}
                        </span>
                        {isMine && (
                          <span className="rounded px-1.5 py-0.5" style={{ background: 'rgba(32, 227, 255, 0.14)', color: 'var(--neon-cyan)', fontSize: '9px', fontWeight: 950 }}>나</span>
                        )}
                      </div>
                      <span className="tracking-tight" style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}>
                        {reply.time}
                      </span>
                    </div>
                  </div>
                  {hasDiffRef && (
                    <div className="mb-2 overflow-hidden rounded-xl" style={{
                      background: 'rgba(5, 11, 20, 0.72)',
                      border: '1px solid rgba(32, 227, 255, 0.22)',
                      userSelect: 'none'
                    }}>
                      <div className="flex items-center gap-2 px-3 py-1.5" style={{
                        borderBottom: '1px solid rgba(32, 227, 255, 0.12)',
                        background: 'rgba(32, 227, 255, 0.07)'
                      }}>
                        <FileCode size={11} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                        <span className="truncate font-mono" style={{ color: 'var(--neon-cyan)', fontSize: '10px', fontWeight: 950 }}>
                          {reply.fileName ?? reply.fileId}
                        </span>
                        <span className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono" style={{ background: 'rgba(32, 227, 255, 0.14)', color: 'var(--neon-cyan)', fontSize: '9px', fontWeight: 950 }}>
                          L{reply.line}
                        </span>
                      </div>
                      {reply.code && (
                        <div className="px-3 py-2 font-mono" style={{ color: '#C6D4E5', fontSize: '11px', fontWeight: 850, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {reply.code}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="m-0 leading-[1.5] tracking-tight whitespace-pre-wrap" style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--soft-mint)'
                  }}>
                    {reply.text}
                  </p>
                  <MessageReactions
                    reactions={reactionMap[`${activeReactionScope}:reply:${reply.id}`]}
                    onToggle={(emoji) => handleReactionToggle(`${activeReactionScope}:reply:${reply.id}`, emoji)}
                  />
                </div>
              </div>
            );
          })}
          {typingLabel && (
            <TypingIndicator
              label={typingLabel}
              note={typingNote}
              avatar={responderTyping ? "AI" : "나"}
              compact
            />
          )}
        </div>
      </div>

      <div className="px-6 py-4" style={{
        borderTop: '1px solid rgba(32, 227, 255, 0.14)'
      }}>
        {emojiPickerOpen && (
          <div className="mb-3">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="답글 남기기..."
            className="min-w-0 flex-1 px-4 py-3 rounded-xl border-0 tracking-tight resize-none"
            rows={3}
            style={{
              background: 'rgba(5, 11, 20, 0.6)',
              border: '1px solid rgba(32, 227, 255, 0.14)',
              color: 'var(--white)',
              fontSize: '14px',
              fontWeight: 700
            }}
          />
          <button
            onClick={() => setEmojiPickerOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0"
            style={{
              background: emojiPickerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
              border: `1px solid ${emojiPickerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
              color: emojiPickerOpen ? 'var(--neon-cyan)' : 'var(--muted)',
              cursor: 'pointer'
            }}
            title="이모티콘"
            aria-label="이모티콘 선택"
          >
            <Smile size={18} />
          </button>
          <button
            onClick={handleSend}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl border-0 px-4"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
              color: '#021014',
              fontWeight: 950,
              cursor: 'pointer'
            }}
            aria-label="답글 전송"
            title="답글 전송"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="m-0 mt-2 tracking-tight" style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          Enter로 전송, Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}
