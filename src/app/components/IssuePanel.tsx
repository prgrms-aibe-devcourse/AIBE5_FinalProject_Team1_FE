import { X, FileText, History, CircleDot, Clock, CircleCheck, UserRound, Tag, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import type { IssueLabel, IssueHistoryEvent } from "./ChatPanel";

interface IssuePanelProps {
  issueData: any;
  onClose: () => void;
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

export function IssuePanel({ issueData, onClose }: IssuePanelProps) {
  const [activeTab, setActiveTab] = useState<IssueTab>("content");

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

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]"
      style={{
        background:    "rgba(11, 22, 40, 0.82)",
        border:        "1px solid rgba(32, 227, 255, 0.16)",
        boxShadow:     "0 20px 60px rgba(0, 0, 0, 0.32)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-7 py-6"
        style={{ borderBottom: "1px solid rgba(32, 227, 255, 0.14)" }}
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
              border:     "1px solid rgba(32, 227, 255, 0.18)",
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
        style={{ borderBottom: "1px solid rgba(32, 227, 255, 0.14)" }}
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
                background: isActive ? "rgba(32, 227, 255, 0.14)" : "transparent",
                border:     isActive ? "1px solid rgba(32, 227, 255, 0.32)" : "1px solid transparent",
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
                border:     "1px solid rgba(32, 227, 255, 0.12)",
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
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
                          background: "rgba(32, 227, 255, 0.12)",
                          border:     "1px solid rgba(32, 227, 255, 0.24)",
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
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
                        background: `${label.color}22`,
                        border:     `1px solid ${label.color}88`,
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 900 }}>
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 900 }}>
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 900 }}>
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
                  border:     "1px solid rgba(32, 227, 255, 0.12)",
                }}
              >
                <p className="m-0 mb-1 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 900 }}>
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
                  border:     "1px dashed rgba(32, 227, 255, 0.18)",
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
                      border:     "1px solid rgba(32, 227, 255, 0.10)",
                    }}
                  >
                    <span
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full"
                      style={{
                        background: `${cfg.color}18`,
                        border:     `1px solid ${cfg.color}44`,
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
                    <span className="flex-shrink-0 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
                      {event.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
