import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Plus, Users } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DRAG_TYPE = "TEAM_CARD";

type Org = {
  id: number;
  name: string;
  openPRs: number;
  highRisk: number;
  activeIssues: number;
  memberCount: number;
  myRole: string;
};

function DotHandle({ dragRef }: { dragRef: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={dragRef}
      onClick={(e) => e.stopPropagation()}
      title="드래그하여 순서 변경"
      style={{ color: "rgba(32, 227, 255, 0.35)", cursor: "grab", lineHeight: 0, padding: "4px" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.color = "rgba(32, 227, 255, 0.75)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.color = "rgba(32, 227, 255, 0.35)")}
    >
      <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
        {([0, 6, 12] as number[]).flatMap((y) =>
          ([0, 6] as number[]).map((x) => (
            <circle key={`${x}-${y}`} cx={x + 3} cy={y + 3} r="1.5" />
          ))
        )}
      </svg>
    </div>
  );
}

function DraggableTeamCard({
  org,
  index,
  moveOrg,
}: {
  org: Org;
  index: number;
  moveOrg: (from: number, to: number) => void;
}) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { id: org.id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<{ id: number; index: number }>({
    accept: DRAG_TYPE,
    hover(item) {
      if (item.index !== index) {
        moveOrg(item.index, index);
        item.index = index;
      }
    },
  });

  drop(dragPreview(cardRef));

  return (
    <div
      ref={cardRef}
      onClick={() => navigate("/chat")}
      className="px-6 py-6 rounded-3xl transition-all hover:scale-[1.01]"
      style={{
        background: "rgba(234, 247, 255, 0.055)",
        border: "1px solid rgba(32, 227, 255, 0.14)",
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.22)",
        opacity: isDragging ? 0.4 : 1,
        cursor: "pointer",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3
              className="m-0 tracking-[-0.065em]"
              style={{ fontSize: "22px", fontWeight: 950, color: "var(--white)" }}
            >
              {org.name}
            </h3>
            <span
              className="px-2 py-0.5 rounded-md tracking-tight"
              style={{
                fontSize: "12px",
                fontWeight: 800,
                background: "rgba(32, 227, 255, 0.12)",
                color: "var(--neon-cyan)",
                border: "1px solid rgba(32, 227, 255, 0.25)",
              }}
            >
              {org.myRole}
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              진행 중인 PR: <span style={{ color: "var(--neon-cyan)" }}>{org.openPRs}</span>
            </span>
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              높은 위험:{" "}
              <span style={{ color: org.highRisk > 0 ? "#FF6B6B" : "var(--matrix-green)" }}>{org.highRisk}</span>
            </span>
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              이슈: <span style={{ color: "var(--soft-mint)" }}>{org.activeIssues}</span>
            </span>
            <span
              className="flex items-center gap-1 tracking-tight"
              style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}
            >
              <Users size={13} />
              <span style={{ color: "var(--white)" }}>{org.memberCount}</span>
            </span>
          </div>
        </div>

        {/* Right column: arrow at top, drag handle at bottom aligned with stats row */}
        <div className="flex flex-col items-center justify-between flex-shrink-0 self-stretch">
          <ArrowRight size={24} style={{ color: "var(--neon-cyan)" }} />
          <DotHandle dragRef={drag} />
        </div>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const teamSectionRef = useRef<HTMLDivElement>(null);
  const teamListRef = useRef<HTMLDivElement>(null);
  const [teamListScrollable, setTeamListScrollable] = useState(false);

  const [orgs, setOrgs] = useState<Org[]>([
    { id: 1, name: "SecureFlow Workspace", openPRs: 7, highRisk: 2, activeIssues: 12, memberCount: 5, myRole: "소유자" },
    { id: 2, name: "AI Chat Platform", openPRs: 3, highRisk: 0, activeIssues: 8, memberCount: 8, myRole: "편집 가능" },
    { id: 3, name: "Dashboard UI Kit", openPRs: 5, highRisk: 1, activeIssues: 6, memberCount: 3, myRole: "보기 가능" },
  ]);

  const moveOrg = useCallback((from: number, to: number) => {
    setOrgs((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  useEffect(() => {
    const teamList = teamListRef.current;
    if (!teamList) return;

    const updateScrollState = () => {
      setTeamListScrollable(teamList.scrollHeight > teamList.clientHeight + 1);
    };

    updateScrollState();
    window.addEventListener("resize", updateScrollState);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(teamList);
      Array.from(teamList.children).forEach((child) => resizeObserver?.observe(child));
    }

    return () => {
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [orgs.length]);

  const recentActivity = [
    { type: "pr", user: "김진필", action: "PR 열림", target: "#234: 인증 미들웨어 추가", time: "10분 전", risk: "high" },
    { type: "comment", user: "김준우", action: "댓글 작성", target: "PR #233", time: "25분 전", risk: "low" },
    { type: "merge", user: "김진현", action: "병합", target: "PR #232: CORS 문제 수정", time: "1시간 전", risk: "medium" },
    { type: "issue", user: "안현", action: "이슈 생성", target: "#145: 요청 제한이 작동하지 않음", time: "2시간 전", risk: "high" },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "#FF6B6B";
      case "medium": return "#FFD93D";
      case "low": return "#6BCF7F";
      default: return "var(--muted)";
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-[min(1600px,calc(100vw-36px))] mx-auto py-12 pb-20">
        <div className="mb-8">
          <h1
            className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]"
            style={{
              fontSize: "clamp(48px, 6vw, 72px)",
              fontWeight: 950,
              color: "var(--white)",
              textShadow: "0 0 22px rgba(32, 227, 255, 0.18)",
            }}
          >
            대시보드
          </h1>
          <p className="m-0 tracking-tight" style={{ fontSize: "18px", fontWeight: 700, color: "var(--muted)" }}>
            PR, 이슈, 위험 신호를 한눈에 확인합니다
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-9">
          {[
            {
              label: "전체 팀",
              value: String(orgs.length),
              color: "var(--neon-cyan)",
              onClick: () => {
                if (teamSectionRef.current) {
                  const top = teamSectionRef.current.getBoundingClientRect().top + window.scrollY - 25;
                  window.scrollTo({ top, behavior: "smooth" });
                }
              },
            },
            {
              label: "리뷰 대기 PR",
              value: "15",
              color: "var(--matrix-green)",
              onClick: () => navigate("/prs"),
            },
            {
              label: "위험도 높은 PR",
              value: "3",
              color: "#FF6B6B",
              onClick: () => navigate("/prs"),
            },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className="px-6 py-6 rounded-3xl text-left transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "rgba(11, 22, 40, 0.82)",
                border: "1px solid rgba(32, 227, 255, 0.16)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
                backdropFilter: "blur(16px)",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <p className="m-0 mb-3 tracking-tight" style={{ color: "var(--muted)", fontSize: "14px", fontWeight: 900 }}>
                {stat.label}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{ fontSize: "48px", fontWeight: 950, color: stat.color }}>
                {stat.value}
              </p>
            </button>
          ))}
        </div>

        <section
          ref={teamSectionRef}
          className="mb-9 px-9 py-9 rounded-[30px]"
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(32, 227, 255, 0.16)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              className="m-0 leading-none tracking-[-0.075em]"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}
            >
              내 팀
            </h2>
            <div className="flex items-center gap-3">
              <button
                className="px-5 py-3 rounded-xl flex items-center gap-2 tracking-tight transition-all"
                style={{
                  background: "transparent",
                  border: "1.5px solid rgba(32, 227, 255, 0.5)",
                  color: "var(--neon-cyan)",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                초대 확인하기
              </button>
              <button
                className="px-5 py-3 rounded-xl border-0 flex items-center gap-2 tracking-tight transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(32, 227, 255, 0.3)",
                }}
              >
                <Plus size={18} />
                팀 생성하기
              </button>
            </div>
          </div>

          <div
            ref={teamListRef}
            className="codedock-scrollbar-hidden grid max-h-[min(56vh,520px)] gap-4 overflow-y-auto pr-1"
            style={{ overscrollBehavior: teamListScrollable ? "contain" : "auto" }}
          >
            {orgs.map((org, index) => (
              <DraggableTeamCard key={org.id} org={org} index={index} moveOrg={moveOrg} />
            ))}
          </div>
        </section>

        <section
          className="px-9 py-9 rounded-[30px]"
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(32, 227, 255, 0.16)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <h2
            className="m-0 mb-6 leading-none tracking-[-0.075em]"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}
          >
            최근 활동
          </h2>

          <div className="grid gap-3">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="px-5 py-4 rounded-2xl"
                style={{ background: "rgba(5, 11, 20, 0.42)", border: "1px solid rgba(32, 227, 255, 0.10)" }}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-5 w-5 flex-shrink-0 place-items-center" style={{ marginTop: "2px" }}>
                    {activity.risk === "high" && (
                      <AlertCircle size={20} style={{ color: getRiskColor(activity.risk) }} />
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="m-0 mb-1 tracking-tight" style={{ fontSize: "15px", fontWeight: 900, color: "var(--white)" }}>
                      <span style={{ color: "var(--matrix-green)" }}>{activity.user}</span>{" "}
                      {activity.action}{" "}
                      <span style={{ color: "var(--neon-cyan)" }}>{activity.target}</span>
                    </p>
                    <p className="m-0 tracking-tight" style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)" }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DndProvider>
  );
}
