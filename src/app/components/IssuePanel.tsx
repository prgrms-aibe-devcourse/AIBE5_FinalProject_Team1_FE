import { X, FileText, History, CircleDot, Clock, CircleCheck, UserRound, Tag, MessageSquare, CheckCircle2, XCircle, Send } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { IssueLabel, IssueHistoryEvent } from "./ChatPanel";

interface IssuePanelProps {
  issueData: any;
  onClose: () => void;
  externalThreadMessages?: any[];
  onAddThreadMessage?: (msg: any) => void;
}

interface IssueThreadComment {
  id: string;
  author: string;
  time: string;
  text: string;
}

type IssueTab = "content" | "history";

const issueTabs = [
  { id: "content" as IssueTab, label: "이슈 내용", icon: FileText },
  { id: "history" as IssueTab, label: "이력 관리", icon: History },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CircleDot }> = {
  todo:        { label: "할 일",   color: "var(--muted)",        icon: Clock       },
  in_progress: { label: "진행 중", color: "var(--neon-cyan)",    icon: Clock       },
  review:      { label: "검토 중", color: "var(--soft-mint)",    icon: CircleDot   },
  done:        { label: "완료",    color: "var(--matrix-green)", icon: CircleCheck },
  blocked:     { label: "막힘",    color: "#FF6B6B",             icon: XCircle     },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high:   { label: "High",   color: "#FF6B6B" },
  medium: { label: "Medium", color: "#F59E0B" },
  low:    { label: "Low",    color: "#22C55E" },
};

const historyIconConfig: Record<IssueHistoryEvent["eventType"], { icon: typeof CircleDot; color: string }> = {
  created:        { icon: CircleDot,    color: "#22C55E"          },
  assigned:       { icon: UserRound,    color: "var(--neon-cyan)" },
  labeled:        { icon: Tag,          color: "#F59E0B"          },
  commented:      { icon: MessageSquare, color: "#60A5FA"         },
  status_changed: { icon: CheckCircle2, color: "#22C55E"          },
};

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

function renderBody(body: string) {
  return body.split("\n").map((line, idx) => {
    if (line.startsWith("## ")) {
      return (
        <h3
          key={idx}
          className="m-0 mt-5 mb-2 tracking-tight first:mt-0"
          style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}
        >
          {line.replace("## ", "")}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li
          key={idx}
          className="ml-4 tracking-tight"
          style={{ color: "var(--soft-mint)", fontSize: 14, fontWeight: 800, lineHeight: 1.7 }}
        >
          {line.replace("- ", "")}
        </li>
      );
    }
    if (line.match(/^\d+\./)) {
      return (
        <li
          key={idx}
          className="ml-4 list-decimal tracking-tight"
          style={{ color: "var(--soft-mint)", fontSize: 14, fontWeight: 800, lineHeight: 1.7 }}
        >
          {line.replace(/^\d+\.\s*/, "")}
        </li>
      );
    }
    if (line === "") {
      return <div key={idx} className="h-1" />;
    }
    return (
      <p
        key={idx}
        className="m-0 tracking-tight"
        style={{ color: "var(--soft-mint)", fontSize: 14, fontWeight: 800, lineHeight: 1.7 }}
      >
        {line}
      </p>
    );
  });
}

export function IssuePanel({ issueData, onClose, externalThreadMessages, onAddThreadMessage }: IssuePanelProps) {
  const [activeTab, setActiveTab] = useState<IssueTab>("content");
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadDraft, setThreadDraft] = useState("");
  // 낙관적 업데이트용: 아직 외부 prop에 반영 안 된 로컬 댓글만 보관
  const [localPending, setLocalPending] = useState<IssueThreadComment[]>([]);

  // 외부 prop에서 매핑한 댓글
  const externalMapped: IssueThreadComment[] = (externalThreadMessages ?? []).map((m) => ({
    id: String(m.id),
    author: m.author ?? m.user ?? "",
    time: m.time ?? "",
    text: m.text ?? "",
  }));
  const externalIds = new Set(externalMapped.map((m) => m.id));
  // 외부에 이미 포함된 로컬 pending은 제거 (중복 방지)
  const threadComments = [...externalMapped, ...localPending.filter((m) => !externalIds.has(m.id))];

  const issueNumber = issueData.issueNumber ?? 0;
  const issueTitle  = issueData.issueTitle  ?? issueData.text ?? "";
  const status      = issueData.issueStatus ?? "open";
  const author      = issueData.issueAuthor ?? issueData.user ?? "";
  const labels: IssueLabel[]           = issueData.issueLabels   ?? [];
  const assignees: string[]            = issueData.issueAssignees ?? [];
  const body: string                   = issueData.issueBody      ?? "";
  const history: IssueHistoryEvent[]   = issueData.issueHistory   ?? [];
  const priority                       = issueData.issuePriority  ?? "medium";
  const issueType: string              = issueData.issueType      ?? "";

  const statusCfg   = statusConfig[status]   ?? statusConfig.todo;
  const priorityCfg = priorityConfig[priority] ?? priorityConfig.medium;
  const StatusIcon  = statusCfg.icon;

  const handleThreadSubmit = () => {
    const text = threadDraft.trim();
    if (!text) return;
    const newComment: IssueThreadComment = { id: `issue-thread-${Date.now()}`, author: "나", time: "방금", text };
    setLocalPending((prev) => [...prev, newComment]);
    onAddThreadMessage?.({ ...newComment, user: "나" });
    setThreadDraft("");
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]"
      style={{
        background:    "rgba(11, 22, 40, 0.82)",
        border:        "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
        boxShadow:     "0 20px 60px rgba(0, 0, 0, 0.32)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-7 py-6"
        style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="m-0 mb-1 font-mono tracking-tight"
              style={{ color: "var(--neon-cyan)", fontSize: 13, fontWeight: 950 }}
            >
              Issue #{issueNumber}
            </p>
            <h2
              className="m-0 tracking-[-0.065em]"
              style={{ color: "var(--white)", fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 950, lineHeight: 1.2 }}
            >
              {issueTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border-0 transition-all hover:scale-110"
            style={{
              background: "rgba(234, 247, 255, 0.07)",
              border:     "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
              color:      "var(--muted)",
              cursor:     "pointer",
            }}
            aria-label="이슈 패널 닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-7 py-3"
        style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)" }}
      >
        {issueTabs.map((tab) => {
          const Icon     = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 rounded-full border-0 px-4 py-2 tracking-tight transition-all"
              style={{
                background: isActive ? "rgba(var(--codedock-primary-rgb), 0.14)" : "transparent",
                border:     isActive ? "1px solid rgba(var(--codedock-primary-rgb), 0.32)" : "1px solid transparent",
                color:      isActive ? "var(--neon-cyan)" : "var(--muted)",
                fontSize:   13,
                fontWeight: 900,
                cursor:     "pointer",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">

        {/* 이슈 내용 탭 */}
        {activeTab === "content" && (
          <div className="grid gap-4">

            {/* 본문 */}
            <section
              className="rounded-2xl px-5 py-5"
              style={{
                background: "rgba(5, 11, 20, 0.46)",
                border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
              }}
            >
              <div className="grid gap-0">{renderBody(body)}</div>
            </section>

            {/* 담당자 */}
            {assignees.length > 0 && (
              <section
                className="rounded-2xl px-5 py-5"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                  담당자
                </h3>
                <div className="flex flex-wrap gap-3">
                  {assignees.map((assignee) => (
                    <div key={assignee} className="flex items-center gap-2">
                      <span
                        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full"
                        style={{
                          background: "rgba(var(--codedock-primary-rgb), 0.12)",
                          border:     "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
                          color:      "var(--neon-cyan)",
                        }}
                      >
                        <UserRound size={14} />
                      </span>
                      <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 850 }}>
                        {assignee}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 라벨 */}
            {labels.length > 0 && (
              <section
                className="rounded-2xl px-5 py-5"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <h3 className="m-0 mb-4 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                  라벨
                </h3>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <span
                      key={label.name}
                      className="rounded-lg px-3 py-1.5 tracking-tight"
                      style={{
                        background: colorAlpha(label.color, 13),
                        border:     `1px solid ${colorAlpha(label.color, 53)}`,
                        color:      label.color,
                        fontSize:   13,
                        fontWeight: 900,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 메타 정보 2x2 그리드 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 타입 */}
              <section
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                  타입
                </p>
                <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                  {issueType || "—"}
                </p>
              </section>

              {/* 우선순위 */}
              <section
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                  우선순위
                </p>
                <p className="m-0 tracking-tight" style={{ color: priorityCfg.color, fontSize: 15, fontWeight: 950 }}>
                  {priorityCfg.label}
                </p>
              </section>

              {/* 상태 */}
              <section
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                  상태
                </p>
                <p className="m-0 flex items-center gap-1.5 tracking-tight" style={{ color: statusCfg.color, fontSize: 15, fontWeight: 950 }}>
                  <StatusIcon size={14} />
                  {statusCfg.label}
                </p>
              </section>

              {/* 작성자 */}
              <section
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                  작성자
                </p>
                <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 15, fontWeight: 950 }}>
                  {author}
                </p>
              </section>
            </div>

          </div>
        )}

        {/* 이력 관리 탭 */}
        {activeTab === "history" && (
          <div className="grid gap-3">
            {history.length === 0 ? (
              <div
                className="rounded-2xl px-5 py-6 text-center tracking-tight"
                style={{
                  background: "rgba(5, 11, 20, 0.46)",
                  border:     "1px dashed rgba(var(--codedock-primary-rgb), 0.18)",
                  color:      "var(--muted)",
                  fontSize:   14,
                  fontWeight: 800,
                }}
              >
                아직 이력이 없습니다
              </div>
            ) : (
              history.map((event) => {
                const cfg  = historyIconConfig[event.eventType] ?? historyIconConfig.created;
                const Icon = cfg.icon;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 rounded-2xl px-5 py-4"
                    style={{
                      background: "rgba(5, 11, 20, 0.46)",
                      border:     "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
                    }}
                  >
                    <span
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                      style={{
                        background: colorAlpha(cfg.color, 9),
                        border:     `1px solid ${colorAlpha(cfg.color, 27)}`,
                        color:      cfg.color,
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 mb-0.5 tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                        {event.actor}
                      </p>
                      <p className="m-0 tracking-tight" style={{ color: "var(--soft-mint)", fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
                        {event.action}
                      </p>
                    </div>
                    <span className="flex-shrink-0 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                      {event.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* 플로팅 스레드 버튼 */}
      <button
        type="button"
        onClick={() => setShowThreadModal((prev) => !prev)}
        className="absolute bottom-6 z-30 grid h-14 w-14 place-items-center rounded-full border-0 hover:scale-110"
        style={{
          right: showThreadModal ? "474px" : "24px",
          transition: "right 0.32s cubic-bezier(0.36, 0.66, 0.04, 1), transform 0.18s, background 0.18s",
          background: showThreadModal
            ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))"
            : "rgba(11, 22, 40, 0.88)",
          border: showThreadModal
            ? "1.5px solid var(--neon-cyan)"
            : "1.5px solid rgba(var(--codedock-primary-rgb), 0.38)",
          boxShadow: showThreadModal
            ? "0 0 24px rgba(var(--codedock-primary-rgb), 0.38), 0 8px 24px rgba(0,0,0,0.38)"
            : "0 8px 24px rgba(0,0,0,0.38)",
          color: showThreadModal ? "#021014" : "var(--neon-cyan)",
          cursor: "pointer"
        }}
        aria-label="이슈 스레드 채팅"
      >
        <MessageSquare size={22} />
      </button>

      {/* 이슈 스레드 모달 */}
      <AnimatePresence>
        {showThreadModal && (
          <>
            <motion.div
              className="absolute inset-0 z-10"
              style={{ background: "rgba(3, 8, 18, 0.45)", backdropFilter: "blur(2px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowThreadModal(false)}
            />
            <motion.div
              className="absolute bottom-0 right-0 top-0 z-20 flex w-[450px] flex-col"
              style={{
                background: "rgba(8, 17, 31, 0.97)",
                borderLeft: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
                boxShadow: "-12px 0 40px rgba(0,0,0,0.42)"
              }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              {/* 모달 헤더 */}
              <div
                className="flex-shrink-0 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)", background: "rgba(8, 17, 31, 0.96)", backdropFilter: "blur(14px)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageSquare size={17} style={{ color: "var(--neon-cyan)" }} />
                    <h3 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                      Issue #{issueNumber} 스레드
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-1 font-mono"
                      style={{ background: "rgba(var(--codedock-secondary-rgb), 0.10)", border: "1px solid rgba(var(--codedock-secondary-rgb), 0.24)", color: "var(--matrix-green)", fontSize: 9, fontWeight: 950 }}
                    >
                      ISSUE THREAD
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowThreadModal(false)}
                      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 transition-all hover:scale-110"
                      style={{ background: "rgba(234, 247, 255, 0.07)", border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)", color: "var(--muted)", cursor: "pointer" }}
                      aria-label="스레드 닫기"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 메시지 목록 */}
              <div className="codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {threadComments.length === 0 ? (
                  <div
                    className="rounded-2xl px-4 py-5 text-center tracking-tight"
                    style={{ background: "rgba(5, 11, 20, 0.46)", border: "1px dashed rgba(var(--codedock-primary-rgb), 0.18)", color: "var(--muted)", fontSize: 13, fontWeight: 800 }}
                  >
                    이슈에 대해 팀원들과 스레드를 시작하세요
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {threadComments.map((comment) => {
                      const isMine = comment.author === "나";
                      return (
                        <div
                          key={comment.id}
                          className="w-full rounded-2xl px-3 py-2"
                          style={{
                            background: isMine ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(11, 22, 40, 0.78)",
                            border: isMine ? "1px solid rgba(var(--codedock-primary-rgb), 0.28)" : "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                          }}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="h-6 w-6 flex-shrink-0 rounded-full text-center leading-6"
                              style={{ background: isMine ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(var(--codedock-primary-rgb), 0.14)", color: isMine ? "#021014" : "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}
                            >
                              {comment.author.slice(0, 1)}
                            </span>
                            <span className="tracking-tight" style={{ color: isMine ? "var(--neon-cyan)" : "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>{comment.author}</span>
                            {isMine && (
                              <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(var(--codedock-primary-rgb), 0.14)", color: "var(--neon-cyan)", fontSize: 9, fontWeight: 950 }}>나</span>
                            )}
                            <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>{comment.time}</span>
                          </div>
                          <p className="m-0 whitespace-pre-wrap tracking-tight" style={{ color: "var(--soft-mint)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.55 }}>
                            {comment.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 입력창 */}
              <div
                className="flex-shrink-0 px-4 py-1"
                style={{ background: "rgba(8, 17, 31, 0.96)", borderTop: "1px solid rgba(var(--codedock-primary-rgb), 0.14)" }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={threadDraft}
                    onChange={(e) => setThreadDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleThreadSubmit(); }
                    }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
                    }}
                    placeholder="이슈 스레드에 댓글 남기기..."
                    className="min-w-0 flex-1 resize-none rounded-xl px-3 outline-none tracking-tight"
                    rows={1}
                    style={{ background: "rgba(11, 22, 40, 0.86)", border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)", color: "var(--white)", fontFamily: "inherit", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.55, minHeight: "36px", maxHeight: "96px", overflowY: "auto", paddingTop: "9px", paddingBottom: "9px" }}
                  />
                  <button
                    type="button"
                    onClick={handleThreadSubmit}
                    disabled={!threadDraft.trim()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-0"
                    style={{
                      background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                      color: "#021014",
                      cursor: threadDraft.trim() ? "pointer" : "not-allowed",
                      opacity: threadDraft.trim() ? 1 : 0.48,
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
