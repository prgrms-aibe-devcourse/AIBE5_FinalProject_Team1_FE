import { Hash, MessageSquare, Plus, Send, Bookmark, Share2, MoreVertical, X, ChevronDown, ChevronRight, GitPullRequest, Code2, Database, Paperclip, Smile, UserPlus, FileUp, Image as ImageIcon, Link2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createFileMessageAttachment, createLinkMessageAttachment, createLinkMessageAttachmentFromText, messageAttachmentGroups, messageAttachmentTypeLabels, type MessageAttachment, type MessageAttachmentType } from "./messageAttachments";
import { TypingIndicator } from "./TypingIndicator";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions, toggleMessageReaction, type MessageReaction } from "./MessageReactions";
import { MessageAttachmentCard } from "./MessageAttachmentCard";

interface Thread {
  id: number;
  user: string;
  avatar: string;
  message: string;
  time: string;
  replies: number;
  lastReply?: string;
  attachments?: MessageAttachment[];
}

interface Channel {
  id: string;
  name: string;
  unread?: number;
  threads: Thread[];
}

interface ChannelPanelProps {
  onOpenThread?: (message: any) => void;
  onOpenInvite?: () => void;
}

export function ChannelPanel({ onOpenThread, onOpenInvite }: ChannelPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [teamChannelsOpen, setTeamChannelsOpen] = useState(true);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeAttachmentType, setActiveAttachmentType] = useState<MessageAttachmentType>("pr");
  const [selectedAttachments, setSelectedAttachments] = useState<MessageAttachment[]>([]);
  const [linkComposerOpen, setLinkComposerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [responderTyping, setResponderTyping] = useState(false);
  const [threadReactions, setThreadReactions] = useState<Record<number, MessageReaction[]>>({});
  const responderTypingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [channelList, setChannelList] = useState<Channel[]>([
    {
      id: 'general',
      name: '일반',
      unread: 3,
      threads: [
        {
          id: 1,
          user: '김재준',
          avatar: '👨‍💼',
          message: '이번 주 스프린트 계획 공유드립니다',
          time: '10:23 AM',
          replies: 3,
          lastReply: '안현'
        },
        {
          id: 2,
          user: '김진필',
          avatar: '👨‍💻',
          message: '새로운 API 엔드포인트 추가했습니다. /api/v2/users 확인해주세요',
          time: '11:45 AM',
          replies: 5,
          lastReply: '김재준'
        }
      ]
    },
    {
      id: 'review-room',
      name: '리뷰 룸',
      unread: 2,
      threads: [
        {
          id: 7,
          user: 'CodeDock',
          avatar: 'CD',
          message: 'PR #234 인증 변경 파일을 먼저 묶었어요. 위험 신호 3건을 확인해 주세요.',
          time: '11:12 AM',
          replies: 4,
          lastReply: '김준우'
        },
        {
          id: 8,
          user: '김준우',
          avatar: 'PR',
          message: 'rate limit 빠진 부분만 체크리스트로 빼줘.',
          time: '11:15 AM',
          replies: 2,
          lastReply: 'CodeDock'
        }
      ]
    },
    {
      id: 'frontend',
      name: '프론트엔드',
      unread: 0,
      threads: [
        {
          id: 3,
          user: '김진현',
          avatar: '🎨',
          message: '새로운 컴포넌트 라이브러리 도입을 고려해보면 어떨까요?',
          time: '2:15 PM',
          replies: 8,
          lastReply: '김진필'
        },
        {
          id: 4,
          user: '안현',
          avatar: '👩‍💻',
          message: '다크모드 구현 완료했습니다',
          time: '3:30 PM',
          replies: 2,
          lastReply: '김진현'
        }
      ]
    },
    {
      id: 'backend',
      name: '백엔드',
      unread: 1,
      threads: [
        {
          id: 5,
          user: '김진필',
          avatar: '👨‍💻',
          message: 'DB 최적화 작업 진행 중입니다',
          time: '4:00 PM',
          replies: 1,
          lastReply: '김재준'
        }
      ]
    },
    {
      id: 'design',
      name: '디자인',
      unread: 0,
      threads: [
        {
          id: 6,
          user: '김진현',
          avatar: '🎨',
          message: '새로운 디자인 토큰 추가했습니다',
          time: '5:00 PM',
          replies: 0
        }
      ]
    }
  ]);

  const handleDeleteChannelClick = (channelId: string) => {
    if (channelId === 'general') return;
    setChannelToDelete(channelId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!channelToDelete) return;

    setChannelList(prev => prev.filter(ch => ch.id !== channelToDelete));

    if (selectedChannel === channelToDelete) {
      setSelectedChannel('general');
    }

    setShowDeleteModal(false);
    setChannelToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setChannelToDelete(null);
  };

  const handleCreateSubChannel = () => {
    const channelNumber = channelList.length + 1;
    const channelId = `custom-${Date.now()}`;
    const channelName = `새 채팅 ${channelNumber}`;

    setTeamChannelsOpen(true);
    setChannelList((prev) => [
      ...prev,
      {
        id: channelId,
        name: channelName,
        unread: 0,
        threads: [
          {
            id: Date.now() + 1,
            user: 'CodeDock',
            avatar: 'CD',
            message: `${channelName} 채널이 생성됐어요. 이름을 눌러 바로 바꿀 수 있습니다.`,
            time: '방금',
            replies: 0
          }
        ]
      }
    ]);
    setSelectedChannel(channelId);
  };

  const handleStartRename = (channel: Channel) => {
    setSelectedChannel(channel.id);
    setEditingChannelId(channel.id);
    setEditingChannelName(channel.name);
  };

  const handleCommitRename = () => {
    if (!editingChannelId) return;

    const nextName = editingChannelName.trim();
    if (nextName) {
      setChannelList((prev) =>
        prev.map((channel) =>
          channel.id === editingChannelId ? { ...channel, name: nextName } : channel
        )
      );
    }

    setEditingChannelId(null);
    setEditingChannelName("");
  };

  const handleCancelRename = () => {
    setEditingChannelId(null);
    setEditingChannelName("");
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCommitRename();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelRename();
    }
  };

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

  const activeAttachmentGroup =
    messageAttachmentGroups.find((group) => group.type === activeAttachmentType) ?? messageAttachmentGroups[0];
  const linkPreviewAttachment = linkUrl.trim()
    ? createLinkMessageAttachment(linkUrl, linkTitle)
    : null;

  const canSendMessage = messageText.trim().length > 0 || selectedAttachments.length > 0;
  const composerTyping = messageText.trim().length > 0;
  const typingLabel = responderTyping
    ? "CodeDock AI가 답변을 정리 중입니다"
    : composerTyping
      ? "내가 입력 중입니다"
      : "";
  const typingNote = responderTyping
    ? "채널 맥락을 확인하고 다음 메시지를 준비합니다."
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
    setMessageText((prev) => `${prev}${emoji}`);
    setEmojiPickerOpen(false);
  };

  const handleReactionToggle = (threadId: number, emoji: string) => {
    setThreadReactions((prev) => ({
      ...prev,
      [threadId]: toggleMessageReaction(prev[threadId], emoji)
    }));
  };

  const handleSendMessage = () => {
    const trimmedMessage = messageText.trim();
    if (!canSendMessage) return;
    const detectedLinkAttachment = createLinkMessageAttachmentFromText(trimmedMessage);
    const outgoingAttachments = detectedLinkAttachment && !selectedAttachments.some((attachment) => attachment.url === detectedLinkAttachment.url)
      ? [...selectedAttachments, detectedLinkAttachment]
      : selectedAttachments;

    const nextThread: Thread = {
      id: Date.now(),
      user: '나',
      avatar: '나',
      message: trimmedMessage || `${outgoingAttachments.length}개 항목을 공유합니다.`,
      time: '방금',
      replies: 0,
      attachments: outgoingAttachments
    };

    setChannelList((prev) =>
      prev.map((channel) =>
        channel.id === selectedChannel
          ? { ...channel, threads: [...channel.threads, nextThread], unread: 0 }
          : channel
      )
    );
    setMessageText("");
    setSelectedAttachments([]);
    setAttachmentPickerOpen(false);
    setEmojiPickerOpen(false);
    setLinkComposerOpen(false);
    setLinkUrl("");
    setLinkTitle("");
    triggerResponderTyping();
  };

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const currentChannel = channelList.find(ch => ch.id === selectedChannel);
  const unreadCount = channelList.reduce((total, channel) => total + (channel.unread || 0), 0);

  const getChannelIcon = (channelId: string) => {
    if (channelId === 'review-room') return GitPullRequest;
    if (channelId === 'frontend') return Code2;
    if (channelId === 'backend') return Database;
    return Hash;
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden relative">
      {/* Left Sidebar - Channel List */}
      <div className="w-64 flex flex-col" style={{
        borderRight: '1px solid rgba(32, 227, 255, 0.14)'
      }}>
        <div className="px-4 py-4" style={{
          borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
        }}>
          <h3 className="m-0 tracking-tight" style={{
            fontSize: '14px',
            fontWeight: 900,
            color: 'var(--muted)'
          }}>
            채널
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="grid gap-1">
            <div
              className="w-full px-2 py-2 rounded-lg border-0 text-left transition-all flex items-center gap-1"
              style={{
                background: 'rgba(234, 247, 255, 0.04)',
                border: '1px solid rgba(32, 227, 255, 0.12)'
              }}
            >
              <button
                type="button"
                onClick={() => setTeamChannelsOpen((open) => !open)}
                className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-1 py-0.5 text-left transition-all cursor-pointer flex items-center gap-2"
                aria-expanded={teamChannelsOpen}
              >
                {teamChannelsOpen ? (
                  <ChevronDown size={15} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                )}
                <span className="flex-1 tracking-tight" style={{
                  color: 'var(--white)',
                  fontSize: '12px',
                  fontWeight: 950
                }}>
                  팀 채팅
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full px-2 py-0.5 tracking-tight" style={{
                    background: 'rgba(32, 227, 255, 0.18)',
                    border: '1px solid rgba(32, 227, 255, 0.24)',
                    color: 'var(--neon-cyan)',
                    fontSize: '10px',
                    fontWeight: 950
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleCreateSubChannel}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-0 transition-all cursor-pointer hover:scale-[1.04]"
                style={{
                  background: 'rgba(32, 227, 255, 0.12)',
                  border: '1px solid rgba(32, 227, 255, 0.24)',
                  color: 'var(--neon-cyan)'
                }}
                aria-label="하위 채팅 추가"
                title="하위 채팅 추가"
              >
                <Plus size={15} />
              </button>
            </div>

            {teamChannelsOpen && channelList.map((channel) => {
              const ChannelIcon = getChannelIcon(channel.id);

              return (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedChannel(channel.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border-0 text-left transition-all cursor-pointer flex items-center justify-between"
                  style={{
                    background: selectedChannel === channel.id ? 'rgba(32, 227, 255, 0.15)' : 'transparent',
                    border: selectedChannel === channel.id ? '1px solid rgba(32, 227, 255, 0.3)' : '1px solid transparent'
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ChannelIcon size={14} style={{ color: selectedChannel === channel.id ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
                    {editingChannelId === channel.id ? (
                      <input
                        value={editingChannelName}
                        onChange={(event) => setEditingChannelName(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          handleRenameKeyDown(event);
                        }}
                        onBlur={handleCommitRename}
                        onFocus={(event) => event.currentTarget.select()}
                        autoFocus
                        className="min-w-0 flex-1 rounded-md border-0 px-2 py-1 font-mono tracking-tight outline-none"
                        style={{
                          background: 'rgba(5, 11, 20, 0.76)',
                          border: '1px solid rgba(32, 227, 255, 0.32)',
                          color: 'var(--white)',
                          fontSize: '13px',
                          fontWeight: 900
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedChannel(channel.id);
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          handleStartRename(channel);
                        }}
                        className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left font-mono tracking-tight cursor-text"
                        style={{
                          fontSize: '13px',
                          fontWeight: selectedChannel === channel.id ? 900 : 800,
                          color: selectedChannel === channel.id ? 'var(--white)' : 'var(--muted)'
                        }}
                        title="더블클릭해서 채널 이름 변경"
                      >
                        {channel.name}
                      </button>
                    )}
                  </div>
                  {channel.unread && channel.unread > 0 && (
                    <span className="w-5 h-5 rounded-full flex flex-shrink-0 items-center justify-center" style={{
                      background: 'var(--neon-cyan)',
                      color: '#021014',
                      fontSize: '10px',
                      fontWeight: 900
                    }}>
                      {channel.unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3" style={{
          borderTop: '1px solid rgba(32, 227, 255, 0.14)'
        }}>
          <div className="mb-3 px-3 py-2.5 rounded-lg" style={{
            background: 'rgba(32, 227, 255, 0.08)',
            border: '1px solid rgba(32, 227, 255, 0.2)'
          }}>
            <span className="tracking-tight block mb-1.5" style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--muted)',
              textTransform: 'uppercase'
            }}>
              현재 채널
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={14} style={{ color: 'var(--neon-cyan)' }} />
                <span className="font-mono tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  {currentChannel?.name}
                </span>
              </div>
              {currentChannel?.id !== 'general' && (
                <button
                  onClick={() => handleDeleteChannelClick(currentChannel?.id || '')}
                  className="w-6 h-6 rounded-lg flex items-center justify-center border-0 transition-all cursor-pointer"
                  style={{
                    background: 'rgba(255, 107, 107, 0.15)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    color: '#FF6B6B'
                  }}
                  title="채널 삭제"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <button onClick={handleCreateSubChannel} className="w-full px-4 py-2 rounded-lg border-0 flex items-center justify-center gap-2 tracking-tight transition-all cursor-pointer" style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
            color: '#021014',
            fontSize: '12px',
            fontWeight: 900
          }}>
            <Plus size={16} />
            하위 채널 추가
          </button>
        </div>
      </div>

      {/* Right Content - Channel Messages */}
      <div className="min-h-0 flex-1 flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between" style={{
          borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
        }}>
          <div className="flex items-center gap-2">
            <Hash size={18} style={{ color: 'var(--neon-cyan)' }} />
            <h2 className="m-0 font-mono tracking-tight" style={{
              fontSize: '18px',
              fontWeight: 950,
              color: 'var(--white)'
            }}>
              {currentChannel?.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenInvite}
            className="inline-flex items-center gap-2 rounded-full border-0 px-3 py-2 tracking-tight transition-all"
            style={{
              background: 'rgba(32, 227, 255, 0.12)',
              border: '1px solid rgba(32, 227, 255, 0.24)',
              color: 'var(--neon-cyan)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 950
            }}
            aria-label="팀원 추가"
            title="팀원 추가"
          >
            <UserPlus size={15} />
            팀원 추가
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-4">
            {currentChannel?.threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-xl overflow-hidden relative group"
                style={{
                  background: 'rgba(5, 11, 20, 0.6)',
                  border: '1px solid rgba(32, 227, 255, 0.14)'
                }}
                onMouseEnter={() => setHoveredMessageId(thread.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className="w-full px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: '28px', lineHeight: 1 }}>{thread.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="tracking-tight" style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          color: 'var(--matrix-green)'
                        }}>
                          {thread.user}
                        </span>
                        <span className="tracking-tight" style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--muted)'
                        }}>
                          {thread.time}
                        </span>
                      </div>
                      <p className="m-0 mb-3 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--white)',
                        lineHeight: '1.5'
                      }}>
                        {thread.message}
                      </p>
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
                      {thread.replies > 0 && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenThread?.(thread);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                            style={{
                              background: 'rgba(32, 227, 255, 0.08)',
                              border: '1px solid rgba(32, 227, 255, 0.2)'
                            }}
                          >
                            <MessageSquare size={14} style={{ color: 'var(--neon-cyan)' }} />
                            <span className="tracking-tight" style={{
                              fontSize: '11px',
                              fontWeight: 900,
                              color: 'var(--neon-cyan)'
                            }}>
                              답글 {thread.replies}개
                            </span>
                          </button>
                          {thread.lastReply && (
                            <span className="tracking-tight" style={{
                              fontSize: '11px',
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
                      reactions={threadReactions[thread.id]}
                      onToggle={(emoji) => handleReactionToggle(thread.id, emoji)}
                    />
                  </div>
                </div>

                {hoveredMessageId === thread.id && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{
                    background: 'rgba(11, 22, 40, 0.95)',
                    border: '1px solid rgba(32, 227, 255, 0.3)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenThread?.(thread);
                      }}
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
                    <button className="w-7 h-7 rounded border-0 flex items-center justify-center transition-all hover:bg-[rgba(32,227,255,0.15)]" style={{
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer'
                    }} title="공유">
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
            ))}
            {typingLabel && (
              <TypingIndicator
                label={typingLabel}
                note={typingNote}
                avatar={responderTyping ? "AI" : "나"}
              />
            )}
          </div>
        </div>

        <div className="px-6 py-4" style={{
          borderTop: '1px solid rgba(32, 227, 255, 0.14)'
        }}>
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
              <div className="grid gap-2 xl:grid-cols-[1fr_0.72fr_auto]">
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
                  <MessageAttachmentCard
                    attachment={linkPreviewAttachment}
                    onClick={(event) => event.stopPropagation()}
                  />
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

          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{
            background: 'rgba(5, 11, 20, 0.6)',
            border: '1px solid rgba(32, 227, 255, 0.14)'
          }}>
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleMessageKeyDown}
              placeholder={`#${currentChannel?.name}에 메시지 보내기`}
              className="min-w-0 flex-1 bg-transparent border-0 outline-none tracking-tight"
              style={{
                color: 'var(--white)',
                fontSize: '14px',
                fontWeight: 700
              }}
            />
            <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setAttachmentPickerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: attachmentPickerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(32, 227, 255, 0.08)',
                border: `1px solid ${attachmentPickerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: attachmentPickerOpen ? 'var(--neon-cyan)' : 'var(--muted)'
              }}
              title="목록 첨부"
              aria-label="PR, ERD, Issue, API 명세, Docs 첨부"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: 'rgba(32, 227, 255, 0.08)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--muted)'
              }}
              title="파일 첨부"
              aria-label="파일 첨부"
            >
              <FileUp size={18} />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: 'rgba(32, 227, 255, 0.08)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                color: 'var(--muted)'
              }}
              title="사진 첨부"
              aria-label="사진 첨부"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => setLinkComposerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: linkComposerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(32, 227, 255, 0.08)',
                border: `1px solid ${linkComposerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: linkComposerOpen ? 'var(--neon-cyan)' : 'var(--muted)'
              }}
              title="링크 첨부"
              aria-label="링크 첨부"
            >
              <Link2 size={18} />
            </button>
            <button
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: emojiPickerOpen ? 'rgba(32, 227, 255, 0.15)' : 'rgba(32, 227, 255, 0.08)',
                border: `1px solid ${emojiPickerOpen ? 'rgba(32, 227, 255, 0.3)' : 'rgba(32, 227, 255, 0.14)'}`,
                color: emojiPickerOpen ? 'var(--neon-cyan)' : 'var(--muted)'
              }}
              title="이모티콘"
              aria-label="이모티콘 선택"
            >
              <Smile size={18} />
            </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!canSendMessage}
              className="w-9 h-9 rounded-lg border-0 flex items-center justify-center transition-all"
              style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
              color: '#021014',
              cursor: canSendMessage ? 'pointer' : 'not-allowed',
              opacity: canSendMessage ? 1 : 0.48
            }}
              aria-label="메시지 전송"
              title="메시지 전송"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{
            background: 'rgba(11, 22, 40, 0.95)',
            border: '1px solid rgba(32, 227, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="px-6 py-5" style={{
              borderBottom: '1px solid rgba(32, 227, 255, 0.14)'
            }}>
              <h3 className="m-0 tracking-tight" style={{
                fontSize: '18px',
                fontWeight: 950,
                color: 'var(--white)'
              }}>
                채널 삭제 확인
              </h3>
            </div>

            <div className="px-6 py-6">
              <p className="m-0 mb-4 tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--muted)',
                lineHeight: '1.6'
              }}>
                <span style={{ color: 'var(--neon-cyan)', fontWeight: 900 }}>
                  #{channelList.find(ch => ch.id === channelToDelete)?.name}
                </span> 채널을 삭제하시겠습니까?
              </p>
              <p className="m-0 tracking-tight" style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#FF6B6B',
                lineHeight: '1.6'
              }}>
                이 작업은 되돌릴 수 없으며, 채널의 모든 메시지가 삭제됩니다.
              </p>
            </div>

            <div className="px-6 py-4 flex gap-3" style={{
              borderTop: '1px solid rgba(32, 227, 255, 0.14)'
            }}>
              <button
                onClick={handleCancelDelete}
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
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl border-0 tracking-tight transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #FF6B6B, #EE5A52)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 900
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
