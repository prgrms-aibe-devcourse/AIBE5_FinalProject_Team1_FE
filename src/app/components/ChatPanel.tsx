import { Send, Sparkles, Code, AtSign, Smile, GitPullRequest, FileText, Plus, Minus, MessageSquare, Bookmark, Share2, MoreVertical, X, CheckCircle, Clock, AlertCircle, ExternalLink, GitMerge, Hash, Paperclip, FileUp, Image as ImageIcon, Link2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createFileMessageAttachment, createLinkMessageAttachment, createLinkMessageAttachmentFromText, messageAttachmentGroups, messageAttachmentTypeLabels, type MessageAttachment, type MessageAttachmentType } from "./messageAttachments";
import { TypingIndicator } from "./TypingIndicator";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions, toggleMessageReaction, type MessageReaction } from "./MessageReactions";
import { MessageAttachmentCard } from "./MessageAttachmentCard";

export interface IssueLabel {
  name: string;
  color: string;
}

export interface IssueHistoryEvent {
  id: string;
  actor: string;
  action: string;
  time: string;
  eventType: 'created' | 'assigned' | 'labeled' | 'commented' | 'status_changed';
}

interface Message {
  id: number;
  user: string;
  text: string;
  time: string;
  type?: 'text' | 'code' | 'system' | 'pr' | 'issue';
  code?: string;
  language?: string;
  mentions?: string[];
  // PR fields
  prNumber?: number;
  prStatus?: 'open' | 'merged' | 'closed' | 'completed';
  prTitle?: string;
  prAuthor?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  repository?: string;
  reviewRoomActive?: boolean;
  approved?: number;
  pending?: number;
  aiRisk?: 'Low' | 'Medium' | 'High';
  passed?: number;
  labels?: string[];
  // Issue fields
  issueNumber?: number;
  issueTitle?: string;
  issueStatus?: 'open' | 'closed' | 'in_progress';
  issueAuthor?: string;
  issueLabels?: IssueLabel[];
  issuePriority?: 'high' | 'medium' | 'low';
  issueType?: string;
  issueAssignees?: string[];
  issueBody?: string;
  issueHistory?: IssueHistoryEvent[];
  attachments?: MessageAttachment[];
}

interface ChatPanelProps {
  title: string;
  messages: Message[];
  onSendMessage?: (message: string, attachments?: MessageAttachment[]) => void;
  showAISummary?: boolean;
  onMergePR?: (messageId: number) => void;
  onReviewPR?: (prData: any) => void;
  onOpenThread?: (message: any) => void;
  isRepository?: boolean;
}

const riskLabel: Record<NonNullable<Message["aiRisk"]>, string> = {
  High: "높음",
  Medium: "보통",
  Low: "낮음"
};

const shareChannels = [
  { id: "general", label: "일반" },
  { id: "frontend", label: "프론트엔드" },
  { id: "backend", label: "백엔드" },
  { id: "design", label: "디자인" }
];

export function ChatPanel({ title, messages, onSendMessage, showAISummary = true, onMergePR, onReviewPR, onOpenThread, isRepository = false }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [showCodeBlock, setShowCodeBlock] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPRForShare, setSelectedPRForShare] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeAttachmentType, setActiveAttachmentType] = useState<MessageAttachmentType>("pr");
  const [selectedAttachments, setSelectedAttachments] = useState<MessageAttachment[]>([]);
  const [linkComposerOpen, setLinkComposerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [responderTyping, setResponderTyping] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<number, MessageReaction[]>>({});
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
    const trimmedMessage = message.trim();
    const detectedLinkAttachment = createLinkMessageAttachmentFromText(trimmedMessage);
    const outgoingAttachments = detectedLinkAttachment && !selectedAttachments.some((attachment) => attachment.url === detectedLinkAttachment.url)
      ? [...selectedAttachments, detectedLinkAttachment]
      : selectedAttachments;

    if ((trimmedMessage || outgoingAttachments.length > 0) && onSendMessage) {
      onSendMessage(trimmedMessage, outgoingAttachments);
      setMessage('');
      setSelectedAttachments([]);
      setAttachmentPickerOpen(false);
      setEmojiPickerOpen(false);
      setLinkComposerOpen(false);
      setLinkUrl("");
      setLinkTitle("");
      triggerResponderTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleShareClick = (prData: any) => {
    setSelectedPRForShare(prData);
    setShowShareModal(true);
    setShareMessage('');
    setSelectedChannels([]);
  };

  const handleChannelToggle = (channel: string) => {
    setSelectedChannels(prev => {
      if (prev.includes(channel)) {
        return prev.filter(ch => ch !== channel);
      } else {
        return [...prev, channel];
      }
    });
  };

  const handleShareSubmit = () => {
    if (!selectedPRForShare || !shareMessage.trim() || selectedChannels.length === 0) return;

    console.log('Sharing PR:', selectedPRForShare.prNumber);
    console.log('To channels:', selectedChannels);
    console.log('Message:', shareMessage);

    setShowShareModal(false);
    setSelectedPRForShare(null);
    setShareMessage('');
    setSelectedChannels([]);
  };

  const handleCancelShare = () => {
    setShowShareModal(false);
    setSelectedPRForShare(null);
    setShareMessage('');
    setSelectedChannels([]);
  };

  const activeAttachmentGroup =
    messageAttachmentGroups.find((group) => group.type === activeAttachmentType) ?? messageAttachmentGroups[0];
  const linkPreviewAttachment = linkUrl.trim()
    ? createLinkMessageAttachment(linkUrl, linkTitle)
    : null;

  const canSend = message.trim().length > 0 || selectedAttachments.length > 0;
  const composerTyping = message.trim().length > 0;
  const typingLabel = responderTyping
    ? "CodeDock AI가 답변을 정리 중입니다"
    : composerTyping
      ? "내가 입력 중입니다"
      : "";
  const typingNote = responderTyping
    ? "맥락을 확인하고 다음 메시지를 준비합니다."
    : composerTyping
      ? "팀원에게 입력 중 상태로 표시됩니다."
      : "";

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
    setLinkComposerOpen(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => `${prev}${emoji}`);
    setEmojiPickerOpen(false);
  };

  const handleReactionToggle = (messageId: number, emoji: string) => {
    setMessageReactions((prev) => ({
      ...prev,
      [messageId]: toggleMessageReaction(prev[messageId], emoji)
    }));
  };

  const filteredMessages = isRepository ? messages.filter(msg => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return msg.type === 'pr' && msg.prStatus === 'open';
    if (activeTab === 'completed') return msg.type === 'pr' && msg.prStatus === 'merged';
    return true;
  }) : messages;

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4" style={{
        borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
      }}>
        <h3 className="m-0 tracking-[-0.065em]" style={{
          fontSize: '18px',
          fontWeight: 950,
          color: 'var(--white)'
        }}>
          {title}
        </h3>
        {showAISummary && (
          <button className="px-3 py-2 rounded-lg border-0 flex items-center gap-2 tracking-tight" style={{
            background: 'rgba(32, 227, 255, 0.10)',
            border: '1px solid rgba(32, 227, 255, 0.22)',
            color: 'var(--neon-cyan)',
            fontSize: '12px',
            fontWeight: 900,
            cursor: 'pointer'
          }}>
            <Sparkles size={14} />
            AI 요약
          </button>
        )}
      </div>

      {isRepository && (
        <div className="px-6 py-3" style={{
          borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
        }}>
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: '전체' },
              { id: 'pending', label: '리뷰 대기' },
              { id: 'completed', label: '리뷰 완료' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'all' | 'pending' | 'completed')}
                className="px-4 py-2 border-0 rounded-lg tracking-tight transition-all"
                style={{
                  background: activeTab === tab.id ? 'rgba(32, 227, 255, 0.15)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid rgba(32, 227, 255, 0.3)' : '1px solid transparent',
                  color: activeTab === tab.id ? 'var(--neon-cyan)' : 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 px-6 py-4 overflow-y-auto">
        <div className="grid gap-4">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex flex-col gap-2 relative group"
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className="flex items-center gap-2">
                <span className="tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: msg.type === 'system' ? 'var(--neon-cyan)' : 'var(--matrix-green)'
                }}>
                  {msg.user}
                </span>
                <span className="tracking-tight" style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--muted)'
                }}>
                  {msg.time}
                </span>
              </div>

              {msg.type === 'pr' ? (
                <div className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onReviewPR?.(msg)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onReviewPR?.(msg);
                      }
                    }}
                    className="rounded-xl overflow-hidden transition-all hover:translate-y-[-1px]"
                    style={{
                    background: msg.prStatus === 'merged' ? 'rgba(20, 10, 30, 0.85)' : 'rgba(11, 22, 40, 0.85)',
                    border: msg.prStatus === 'merged' ? '1px solid rgba(138, 43, 226, 0.35)' : '1px solid rgba(32, 227, 255, 0.2)',
                    boxShadow: msg.prStatus === 'merged' ? '0 4px 16px rgba(138, 43, 226, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer'
                  }}>
                    {/* Header */}
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{
                      background: msg.prStatus === 'merged' ? 'rgba(138, 43, 226, 0.1)' : 'rgba(5, 11, 20, 0.5)',
                      borderBottom: msg.prStatus === 'merged' ? '1px solid rgba(138, 43, 226, 0.2)' : '1px solid rgba(32, 227, 255, 0.14)'
                    }}>
                      <div className="flex items-center gap-2">
                        <GitPullRequest size={14} style={{ color: msg.prStatus === 'merged' ? '#A78BFA' : 'var(--neon-cyan)' }} />
                        <span className="font-mono tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--muted)'
                        }}>
                          {msg.repository || 'codeblock-team/codeblock-frontend'}
                        </span>
                        {msg.reviewRoomActive && (
                          <span className="px-2 py-0.5 rounded-md" style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            fontSize: '10px',
                            fontWeight: 900,
                            color: '#22C55E'
                          }}>
                            리뷰 룸 활성화
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.labels?.map((label, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md tracking-tight" style={{
                            background: 'rgba(138, 43, 226, 0.15)',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: '#A78BFA'
                          }}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="px-4 py-3" style={{
                      borderBottom: msg.prStatus === 'merged' ? '1px solid rgba(138, 43, 226, 0.15)' : '1px solid rgba(32, 227, 255, 0.1)'
                    }}>
                      <h4 className="m-0 mb-2 tracking-tight" style={{
                        fontSize: '15px',
                        fontWeight: 950,
                        color: 'var(--white)',
                        lineHeight: '1.4'
                      }}>
                        #{msg.prNumber} {msg.text.replace(/^.*?: /, '')}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md flex items-center gap-1" style={{
                          background: msg.prStatus === 'merged' ? 'rgba(138, 43, 226, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          border: msg.prStatus === 'merged' ? '1px solid rgba(138, 43, 226, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                          fontSize: '10px',
                          fontWeight: 900,
                          color: msg.prStatus === 'merged' ? '#A78BFA' : '#22C55E'
                        }}>
                          {msg.prStatus === 'merged' ? '병합됨' : '열림'}
                        </span>
                        <span className="tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--muted)'
                        }}>
                          2시간 전
                        </span>
                        <span className="tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--muted)'
                        }}>
                          작성자 {msg.prAuthor || msg.user}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="px-4 py-3 flex items-center gap-4" style={{
                      borderBottom: msg.prStatus === 'merged' ? '1px solid rgba(138, 43, 226, 0.15)' : '1px solid rgba(32, 227, 255, 0.1)'
                    }}>
                      {msg.approved !== undefined && (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={12} style={{ color: '#22C55E' }} />
                          <span className="tracking-tight" style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--muted)'
                          }}>
                            {msg.approved}명 승인
                          </span>
                        </div>
                      )}
                      {msg.pending !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} style={{ color: '#FFA500' }} />
                          <span className="tracking-tight" style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--muted)'
                          }}>
                            {msg.pending}명 대기 중
                          </span>
                        </div>
                      )}
                      <span className="tracking-tight" style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--muted)'
                      }}>
                        {msg.filesChanged || 8}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#22C55E'
                        }}>
                          +{msg.additions || 145}
                        </span>
                        <span className="tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#FF6B6B'
                        }}>
                          -{msg.deletions || 47}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
                      {msg.aiRisk && (
                        <span className="px-2.5 py-1 rounded-md tracking-tight" style={{
                          background: msg.aiRisk === 'High' ? 'rgba(255, 107, 107, 0.15)' : msg.aiRisk === 'Medium' ? 'rgba(255, 165, 0, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          border: msg.aiRisk === 'High' ? '1px solid rgba(255, 107, 107, 0.3)' : msg.aiRisk === 'Medium' ? '1px solid rgba(255, 165, 0, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                          fontSize: '10px',
                          fontWeight: 900,
                          color: msg.aiRisk === 'High' ? '#FF6B6B' : msg.aiRisk === 'Medium' ? '#FFA500' : '#22C55E'
                        }}>
                          AI 위험도: {riskLabel[msg.aiRisk]}
                        </span>
                      )}
                      {msg.passed !== undefined && (
                        <span className="px-2.5 py-1 rounded-md tracking-tight" style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontSize: '10px',
                          fontWeight: 900,
                          color: '#22C55E'
                        }}>
                          {msg.passed}개 통과
                        </span>
                      )}
                      {msg.pending !== undefined && msg.pending > 0 && (
                        <span className="px-2.5 py-1 rounded-md tracking-tight" style={{
                          background: 'rgba(255, 165, 0, 0.15)',
                          border: '1px solid rgba(255, 165, 0, 0.3)',
                          fontSize: '10px',
                          fontWeight: 900,
                          color: '#FFA500'
                        }}>
                          {msg.pending}명 대기 중
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReviewPR?.(msg);
                        }}
                        className="px-3 py-1.5 rounded-md border-0 tracking-tight transition-all flex items-center gap-1.5"
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60A5FA',
                          fontSize: '11px',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        리뷰 열기
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-md border-0 tracking-tight transition-all flex items-center gap-1.5"
                        style={{
                        background: 'rgba(32, 227, 255, 0.08)',
                        border: '1px solid rgba(32, 227, 255, 0.2)',
                        color: 'var(--muted)',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}>
                        <ExternalLink size={12} />
                        GitHub에서 보기
                      </button>
                    </div>
                  </div>
                  {hoveredMessageId === msg.id && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                      background: 'rgba(11, 22, 40, 0.95)',
                      border: '1px solid rgba(32, 227, 255, 0.3)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}>
                      <button
                        onClick={() => onOpenThread?.(msg)}
                        className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]"
                        style={{
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer'
                        }}
                        title="답글"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="북마크">
                        <Bookmark size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareClick(msg);
                        }}
                        className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]"
                        style={{
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer'
                        }}
                        title="공유"
                      >
                        <Share2 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="더보기">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ) : msg.type === 'code' && msg.code ? (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden" style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: '1px solid rgba(32, 227, 255, 0.14)'
                  }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{
                      background: 'rgba(32, 227, 255, 0.08)',
                      borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
                    }}>
                      <Code size={14} style={{ color: 'var(--neon-cyan)' }} />
                      <span className="font-mono tracking-tight" style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--neon-cyan)'
                      }}>
                        {msg.language || 'code'}
                      </span>
                    </div>
                    <pre className="m-0 p-4 overflow-x-auto font-mono" style={{
                      fontSize: '13px',
                      color: 'var(--soft-mint)'
                    }}>
                      {msg.code}
                    </pre>
                  </div>
                  {hoveredMessageId === msg.id && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                      background: 'rgba(11, 22, 40, 0.95)',
                      border: '1px solid rgba(32, 227, 255, 0.3)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}>
                      <button
                        onClick={() => onOpenThread?.(msg)}
                        className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]"
                        style={{
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer'
                        }}
                        title="답글"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="북마크">
                        <Bookmark size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="공유">
                        <Share2 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="더보기">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="px-4 py-3 rounded-xl" style={{
                    background: msg.type === 'system'
                      ? 'rgba(32, 227, 255, 0.08)'
                      : 'rgba(5, 11, 20, 0.42)',
                    border: `1px solid ${msg.type === 'system' ? 'rgba(32, 227, 255, 0.22)' : 'rgba(32, 227, 255, 0.10)'}`
                  }}>
                    <p className="m-0 leading-[1.5] tracking-tight whitespace-pre-wrap" style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: msg.type === 'system' ? 'var(--neon-cyan)' : 'var(--white)'
                    }}>
                      {msg.text}
                    </p>
                    {msg.mentions && msg.mentions.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {msg.mentions.map((mention, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded tracking-tight" style={{
                            background: 'rgba(57, 255, 136, 0.15)',
                            fontSize: '11px',
                            fontWeight: 900,
                            color: 'var(--matrix-green)'
                          }}>
                            @{mention}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="grid gap-2 mt-3">
                        {msg.attachments.map((attachment) => (
                          <MessageAttachmentCard key={attachment.id} attachment={attachment} />
                        ))}
                      </div>
                    )}
                  </div>
                  {hoveredMessageId === msg.id && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                      background: 'rgba(11, 22, 40, 0.95)',
                      border: '1px solid rgba(32, 227, 255, 0.3)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}>
                      <button
                        onClick={() => onOpenThread?.(msg)}
                        className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]"
                        style={{
                          background: 'transparent',
                          color: 'var(--muted)',
                          cursor: 'pointer'
                        }}
                        title="답글"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="북마크">
                        <Bookmark size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="공유">
                        <Share2 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all" style={{
                        background: 'transparent',
                        color: 'var(--muted)',
                        cursor: 'pointer'
                      }} title="더보기">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <MessageReactions
                reactions={messageReactions[msg.id]}
                onToggle={(emoji) => handleReactionToggle(msg.id, emoji)}
              />
            </div>
          ))}
          {typingLabel && (
            <div className="pt-1">
              <TypingIndicator
                label={typingLabel}
                note={typingNote}
                avatar={responderTyping ? "AI" : "나"}
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4" style={{
        borderTop: '1px solid rgba(32, 227, 255, 0.14)'
      }}>
        {showCodeBlock && (
          <div className="mb-3 px-4 py-3 rounded-xl" style={{
            background: 'rgba(32, 227, 255, 0.08)',
            border: '1px solid rgba(32, 227, 255, 0.22)'
          }}>
            <p className="m-0 mb-2 tracking-tight" style={{
              fontSize: '12px',
              fontWeight: 900,
              color: 'var(--neon-cyan)'
            }}>
              코드 블록 모드
            </p>
            <textarea
              placeholder="코드를 입력하세요..."
              className="w-full px-3 py-2 rounded-lg border-0 font-mono tracking-tight resize-none"
              rows={4}
              style={{
                background: 'rgba(5, 11, 20, 0.6)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--white)',
                fontSize: '13px',
                fontWeight: 700
              }}
            />
          </div>
        )}

        {selectedAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="tracking-tight" style={{
              fontSize: '11px',
              fontWeight: 900,
              color: 'var(--muted)'
            }}>
              첨부 {selectedAttachments.length}
            </span>
            {selectedAttachments.map((attachment) => (
              <button
                key={attachment.id}
                onClick={() => handleAttachmentRemove(attachment.id)}
                className="px-3 py-1.5 rounded-full border-0 flex items-center gap-2 tracking-tight"
                style={{
                  background: 'rgba(32, 227, 255, 0.12)',
                  border: '1px solid rgba(32, 227, 255, 0.24)',
                  color: 'var(--white)',
                  fontSize: '11px',
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

        {attachmentPickerOpen && (
          <div className="mb-3 rounded-xl px-4 py-3" style={{
            background: 'rgba(5, 11, 20, 0.78)',
            border: '1px solid rgba(32, 227, 255, 0.18)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.24)'
          }}>
            <div className="flex flex-wrap gap-1 mb-3">
              {messageAttachmentGroups.map((group) => (
                <button
                  key={group.type}
                  onClick={() => setActiveAttachmentType(group.type)}
                  className="px-3 py-1.5 rounded-lg border-0 tracking-tight"
                  style={{
                    background: activeAttachmentType === group.type ? 'rgba(32, 227, 255, 0.16)' : 'transparent',
                    border: activeAttachmentType === group.type ? '1px solid rgba(32, 227, 255, 0.36)' : '1px solid transparent',
                    color: activeAttachmentType === group.type ? 'var(--neon-cyan)' : 'var(--muted)',
                    fontSize: '12px',
                    fontWeight: 950,
                    cursor: 'pointer'
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <p className="m-0 mb-3 tracking-tight" style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--muted)'
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
                      background: isSelected ? 'rgba(32, 227, 255, 0.14)' : 'rgba(11, 22, 40, 0.62)',
                      border: isSelected ? '1px solid rgba(32, 227, 255, 0.34)' : '1px solid rgba(32, 227, 255, 0.12)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="tracking-tight" style={{
                        fontSize: '13px',
                        fontWeight: 950,
                        color: 'var(--white)'
                      }}>
                        {attachment.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full tracking-tight" style={{
                        background: isSelected ? 'rgba(57, 255, 136, 0.16)' : 'rgba(32, 227, 255, 0.10)',
                        color: isSelected ? 'var(--matrix-green)' : 'var(--neon-cyan)',
                        fontSize: '10px',
                        fontWeight: 950,
                        whiteSpace: 'nowrap'
                      }}>
                        {isSelected ? '선택됨' : attachment.meta}
                      </span>
                    </div>
                    <p className="m-0 mt-1 tracking-tight" style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--muted)',
                      lineHeight: '1.45'
                    }}>
                      {attachment.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {linkComposerOpen && (
          <div className="mb-3 rounded-xl px-4 py-3" style={{
            background: 'rgba(5, 11, 20, 0.78)',
            border: '1px solid rgba(32, 227, 255, 0.18)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.24)'
          }}>
            <div className="mb-3 flex items-center gap-2">
              <Link2 size={16} style={{ color: 'var(--neon-cyan)' }} />
              <span className="tracking-tight" style={{
                color: 'var(--white)',
                fontSize: '13px',
                fontWeight: 950
              }}>
                링크 첨부
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_0.72fr_auto]">
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddLinkAttachment();
                  }
                }}
                placeholder="https://example.com"
                className="rounded-lg border-0 px-3 py-2 outline-none tracking-tight"
                style={{
                  background: 'rgba(11, 22, 40, 0.72)',
                  border: '1px solid rgba(32, 227, 255, 0.14)',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontWeight: 750
                }}
              />
              <input
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddLinkAttachment();
                  }
                }}
                placeholder="표시 이름 선택"
                className="rounded-lg border-0 px-3 py-2 outline-none tracking-tight"
                style={{
                  background: 'rgba(11, 22, 40, 0.72)',
                  border: '1px solid rgba(32, 227, 255, 0.14)',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontWeight: 750
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
                  fontSize: '13px',
                  fontWeight: 950,
                  opacity: linkUrl.trim() ? 1 : 0.48
                }}
              >
                추가
              </button>
            </div>
            {linkPreviewAttachment && (
              <div className="mt-3">
                <p className="m-0 mb-2 tracking-tight" style={{
                  color: 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: 900
                }}>
                  미리보기
                </p>
                <MessageAttachmentCard attachment={linkPreviewAttachment} />
              </div>
            )}
          </div>
        )}

        {emojiPickerOpen && (
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

        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 tracking-tight resize-none"
            rows={1}
            style={{
              background: 'rgba(5, 11, 20, 0.6)',
              border: '1px solid rgba(32, 227, 255, 0.14)',
              color: 'var(--white)',
              fontSize: '14px',
              fontWeight: 700,
              minHeight: '44px',
              maxHeight: '120px'
            }}
          />

          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <button
              onClick={() => setShowCodeBlock(!showCodeBlock)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: showCodeBlock ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
                border: `1px solid ${showCodeBlock ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: showCodeBlock ? 'var(--neon-cyan)' : 'var(--muted)',
                cursor: 'pointer'
              }}
              title="코드 블록"
              aria-label="코드 블록"
            >
              <Code size={18} />
            </button>
            <button
              onClick={() => setAttachmentPickerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: attachmentPickerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
                border: `1px solid ${attachmentPickerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: attachmentPickerOpen ? 'var(--neon-cyan)' : 'var(--muted)',
                cursor: 'pointer'
              }}
              title="목록 첨부"
              aria-label="PR, ERD, Issue, API 명세, Docs 첨부"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: 'rgba(5, 11, 20, 0.6)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--muted)',
                cursor: 'pointer'
              }}
              title="파일 첨부"
              aria-label="파일 첨부"
            >
              <FileUp size={18} />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: 'rgba(5, 11, 20, 0.6)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--muted)',
                cursor: 'pointer'
              }}
              title="사진 첨부"
              aria-label="사진 첨부"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => setLinkComposerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: linkComposerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
                border: `1px solid ${linkComposerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: linkComposerOpen ? 'var(--neon-cyan)' : 'var(--muted)',
                cursor: 'pointer'
              }}
              title="링크 첨부"
              aria-label="링크 첨부"
            >
              <Link2 size={18} />
            </button>
            <button
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
              style={{
                background: 'rgba(5, 11, 20, 0.6)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--muted)',
                cursor: 'pointer'
              }}
              title="멘션"
              aria-label="멘션"
            >
              <AtSign size={18} />
            </button>
            <button
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center"
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
          </div>

          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-0 px-4"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
              color: '#021014',
              fontWeight: 950,
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.48
            }}
            aria-label="메시지 전송"
            title="메시지 전송"
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

      {/* PR 공유 모달 */}
      {showShareModal && selectedPRForShare && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden" style={{
            background: 'rgba(11, 22, 40, 0.95)',
            border: '1px solid rgba(32, 227, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* 헤더 */}
            <div className="px-6 py-5" style={{
              borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
            }}>
              <h3 className="m-0 tracking-tight" style={{
                fontSize: '18px',
                fontWeight: 950,
                color: 'var(--white)'
              }}>
                PR 공유하기
              </h3>
            </div>

            {/* 본문 */}
            <div className="px-6 py-6">
              {/* PR 정보 */}
              <div className="mb-4 p-4 rounded-xl" style={{
                background: 'rgba(32, 227, 255, 0.08)',
                border: '1px solid rgba(32, 227, 255, 0.2)'
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <GitPullRequest size={16} style={{ color: 'var(--neon-cyan)' }} />
                  <span className="tracking-tight" style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    color: 'var(--neon-cyan)'
                  }}>
                    PR #{selectedPRForShare.prNumber}
                  </span>
                </div>
                <p className="m-0 mb-2 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--white)',
                  lineHeight: '1.5'
                }}>
                  {selectedPRForShare.text.replace(/^.*?: /, '')}
                </p>
                <div className="flex items-center gap-3">
                  <span className="tracking-tight" style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    작성자 {selectedPRForShare.prAuthor || selectedPRForShare.user}
                  </span>
                  <span className="tracking-tight" style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    파일 {selectedPRForShare.filesChanged || 0}개
                  </span>
                  <span className="tracking-tight" style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#22C55E'
                  }}>
                    +{selectedPRForShare.additions || 0}
                  </span>
                  <span className="tracking-tight" style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#FF6B6B'
                  }}>
                    -{selectedPRForShare.deletions || 0}
                  </span>
                </div>
              </div>

              {/* 채널 선택 */}
              <div className="mb-4">
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  공유할 채널 선택 (복수 선택 가능)
                </label>
                <div className="grid gap-2">
                  {shareChannels.map((channel) => (
                    <label
                      key={channel.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: selectedChannels.includes(channel.id) ? 'rgba(32, 227, 255, 0.15)' : 'rgba(5, 11, 20, 0.6)',
                        border: selectedChannels.includes(channel.id) ? '1px solid rgba(32, 227, 255, 0.3)' : '1px solid rgba(32, 227, 255, 0.14)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.id)}
                        onChange={() => handleChannelToggle(channel.id)}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{
                          accentColor: 'var(--neon-cyan)'
                        }}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Hash size={14} style={{ color: selectedChannels.includes(channel.id) ? 'var(--neon-cyan)' : 'var(--muted)' }} />
                        <span className="tracking-tight" style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          color: selectedChannels.includes(channel.id) ? 'var(--white)' : 'var(--muted)'
                        }}>
                          {channel.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 메시지 작성 */}
              <div>
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  메시지 작성
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="이 PR에 대한 설명이나 수정 내용을 작성하세요..."
                  className="w-full px-4 py-3 rounded-xl border-0 tracking-tight resize-none"
                  rows={5}
                  style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: '1px solid rgba(32, 227, 255, 0.14)',
                    color: 'var(--white)',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="px-6 py-4 flex gap-3" style={{
              borderTop: '1px solid rgba(32, 227, 255, 0.14)'
            }}>
              <button
                onClick={handleCancelShare}
                className="flex-1 px-4 py-2.5 rounded-xl border-0 tracking-tight transition-all cursor-pointer"
                style={{
                  background: 'rgba(32, 227, 255, 0.08)',
                  border: '1px solid rgba(32, 227, 255, 0.3)',
                  color: 'var(--white)',
                  fontSize: '13px',
                  fontWeight: 900
                }}
              >
                취소
              </button>
              <button
                onClick={handleShareSubmit}
                disabled={!shareMessage.trim() || selectedChannels.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl border-0 tracking-tight transition-all cursor-pointer"
                style={{
                  background: (shareMessage.trim() && selectedChannels.length > 0) ? 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))' : 'rgba(32, 227, 255, 0.2)',
                  color: (shareMessage.trim() && selectedChannels.length > 0) ? '#021014' : 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: (shareMessage.trim() && selectedChannels.length > 0) ? 'pointer' : 'not-allowed'
                }}
              >
                공유하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
