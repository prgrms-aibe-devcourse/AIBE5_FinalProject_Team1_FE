import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Check, Plus, Users, X } from "lucide-react";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
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

type Invite = {
  id: number;
  teamName: string;
  inviterName: string;
  role: string;
  time: string;
  memberCount: number;
  repoCount: number;
  expiresInDays: number;
  expiresTime: string;
};

const MOCK_GITHUB_REPOS = [
  { id: 1,  name: "secure-flow-api",       owner: "my_github",    relation: "owner",        isPrivate: true,  language: "TypeScript" },
  { id: 2,  name: "auth-middleware",        owner: "my_github",    relation: "owner",        isPrivate: true,  language: "TypeScript" },
  { id: 3,  name: "codedock-frontend",      owner: "my_github",    relation: "owner",        isPrivate: false, language: "TypeScript" },
  { id: 4,  name: "dashboard-ui-kit",       owner: "my_github",    relation: "owner",        isPrivate: false, language: "CSS"        },
  { id: 5,  name: "ai-chat-platform",       owner: "AIBE5-Team1", relation: "collaborator", isPrivate: true,  language: "Python"     },
  { id: 6,  name: "infra-terraform",        owner: "AIBE5-Team1", relation: "collaborator", isPrivate: true,  language: "HCL"        },
  { id: 7,  name: "design-system",          owner: "AIBE5-Team1", relation: "collaborator", isPrivate: false, language: "TypeScript" },
  { id: 8,  name: "backend-api-gateway",    owner: "AIBE5-Team1", relation: "collaborator", isPrivate: true,  language: "Java"       },
  { id: 9,  name: "mobile-app",             owner: "some-org",    relation: "collaborator", isPrivate: false, language: "Kotlin"     },
  { id: 10, name: "data-pipeline",          owner: "some-org",    relation: "collaborator", isPrivate: true,  language: "Python"     },
];

function AutoScrollContainer({ children, itemCount }: { children: React.ReactNode; itemCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const { isDragging } = useDragLayer((monitor) => ({ isDragging: monitor.isDragging() }));
  const scrollTopRef = useRef(0);
  const prevIsDraggingRef = useRef(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (itemCount > 0 && itemCount <= 3) {
      setLockedHeight(ref.current.scrollHeight);
    }
  }, [itemCount]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (isDragging) {
      if (!prevIsDraggingRef.current) {
        scrollTopRef.current = ref.current.scrollTop;
      } else {
        ref.current.scrollTop = scrollTopRef.current;
      }
    }
    prevIsDraggingRef.current = isDragging;
  });

  useEffect(() => {
    if (!isDragging || !ref.current) return;
    const el = ref.current;
    const speed = { current: 0 };
    let rafId: number;

    const tick = () => {
      if (speed.current !== 0) {
        scrollTopRef.current = Math.max(0, scrollTopRef.current + speed.current);
        el.scrollTop = scrollTopRef.current;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onDragOver = (e: DragEvent) => {
      const rect = el.getBoundingClientRect();
      const ZONE = 140;
      const fromTop = e.clientY - rect.top;
      const fromBottom = rect.bottom - e.clientY;
      if (fromTop < ZONE) {
        const ratio = Math.min(1, (ZONE - fromTop) / ZONE);
        speed.current = -Math.ceil(ratio * 4);
      } else if (fromBottom < ZONE) {
        const ratio = Math.min(1, (ZONE - fromBottom) / ZONE);
        speed.current = Math.ceil(ratio * 4);
      } else {
        speed.current = 0;
      }
    };

    const onDragEnd = () => { speed.current = 0; };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragend", onDragEnd);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragend", onDragEnd);
      cancelAnimationFrame(rafId);
    };
  }, [isDragging]);

  return (
    <div
      ref={ref}
      className="grid gap-4 overflow-y-auto"
      style={{
        maxHeight: itemCount >= 4 && lockedHeight ? `${lockedHeight}px` : "none",
        padding: "8px",
        margin: "-8px",
        scrollbarWidth: "none",
      }}
    >
      {children}
    </div>
  );
}

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
    hover(item, monitor) {
      if (!cardRef.current || item.index === index) return;
      const hoverRect = cardRef.current.getBoundingClientRect();
      const midY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const cursorY = clientOffset.y - hoverRect.top;
      if (item.index < index && cursorY < midY) return;
      if (item.index > index && cursorY > midY) return;
      moveOrg(item.index, index);
      item.index = index;
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
        <div className="flex flex-col items-center justify-between flex-shrink-0 self-stretch">
          <ArrowRight size={24} style={{ color: "var(--neon-cyan)" }} />
          <DotHandle dragRef={drag} />
        </div>
      </div>
    </div>
  );
}

function CreateTeamModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, repoIds: number[]) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [repoSearch, setRepoSearch] = useState("");

  const canProceed = name.trim().length > 0;

  const filteredRepos = MOCK_GITHUB_REPOS.filter((r) =>
    `${r.owner}/${r.name}`.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const toggleRepo = (id: number) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    onCreate(name.trim(), selectedRepos);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[620px] rounded-[24px] overflow-hidden"
        style={{
          background: "rgba(8, 16, 32, 0.98)",
          border: "1px solid rgba(32, 227, 255, 0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <div>
            <h2
              className="m-0 tracking-[-0.06em]"
              style={{ fontSize: "22px", fontWeight: 950, color: "var(--white)" }}
            >
              팀 생성하기
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {([1, 2] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: step === s ? "var(--neon-cyan)" : step > s ? "rgba(32, 227, 255, 0.35)" : "rgba(255,255,255,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 950,
                      color: step >= s ? "#021014" : "var(--muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    {s}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: step === s ? "var(--white)" : "var(--muted)" }}>
                    {s === 1 ? "팀 이름" : "리포지토리"}
                  </span>
                  {s < 2 && (
                    <div
                      style={{
                        width: "20px",
                        height: "1.5px",
                        background: step > s ? "rgba(32, 227, 255, 0.4)" : "rgba(255,255,255,0.10)",
                        marginLeft: "2px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-0"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        {step === 1 && (
          <div className="px-7 pb-7">
            <label className="block mb-2 tracking-tight" style={{ fontSize: "12px", fontWeight: 900, color: "var(--muted)" }}>
              팀 이름 <span style={{ color: "#FF6B6B" }}>*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canProceed && setStep(2)}
              placeholder="예: Backend Infra Team"
              className="w-full rounded-xl px-4 py-3 outline-none tracking-tight"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(32, 227, 255, 0.25)",
                color: "var(--white)",
                fontSize: "15px",
                fontWeight: 700,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(32, 227, 255, 0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(32, 227, 255, 0.25)")}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                style={{
                  background: canProceed ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(255,255,255,0.08)",
                  color: canProceed ? "#021014" : "var(--muted)",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: canProceed ? "pointer" : "not-allowed",
                  boxShadow: canProceed ? "0 4px 14px rgba(32, 227, 255, 0.28)" : "none",
                }}
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-7 pb-7">
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", display: "inline-flex" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--white)", flexShrink: 0 }}>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--white)" }}>my_github</span>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ fontSize: "10px", fontWeight: 900, background: "rgba(57,255,136,0.15)", color: "var(--matrix-green)" }}
              >
                연결됨
              </span>
            </div>

            <p className="m-0 mb-3 tracking-tight" style={{ fontSize: "12px", fontWeight: 900, color: "var(--muted)" }}>
              연결할 리포지토리 선택{" "}
              <span style={{ fontWeight: 700 }}>(선택 사항 · {selectedRepos.length}개 선택됨)</span>
            </p>

            <input
              autoFocus
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="리포지토리 검색..."
              className="w-full rounded-xl px-4 py-2.5 outline-none tracking-tight mb-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(32, 227, 255, 0.18)",
                color: "var(--white)",
                fontSize: "13px",
                fontWeight: 700,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(32, 227, 255, 0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(32, 227, 255, 0.18)")}
            />

            <div className="grid gap-1.5 overflow-y-auto" style={{ maxHeight: "260px" }}>
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepos.includes(repo.id);
                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => toggleRepo(repo.id)}
                    className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left border-0 transition-all"
                    style={{
                      background: isSelected ? "rgba(32, 227, 255, 0.10)" : "rgba(255,255,255,0.03)",
                      border: isSelected ? "1px solid rgba(32, 227, 255, 0.35)" : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                        background: isSelected ? "var(--neon-cyan)" : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#021014" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 truncate tracking-tight" style={{ fontSize: "13px", fontWeight: 900, color: "var(--white)" }}>
                        <span style={{ color: "var(--muted)" }}>{repo.owner}/</span>
                        {repo.name}
                      </p>
                      <p className="m-0 mt-0.5 tracking-tight" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
                        {repo.language}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="py-0.5 rounded tracking-tight"
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          width: "48px",
                          textAlign: "center",
                          display: "inline-block",
                          background: repo.relation === "owner" ? "rgba(32, 227, 255, 0.10)" : "rgba(255, 200, 50, 0.10)",
                          color: repo.relation === "owner" ? "var(--neon-cyan)" : "#FFD93D",
                          border: repo.relation === "owner" ? "1px solid rgba(32, 227, 255, 0.22)" : "1px solid rgba(255, 200, 50, 0.22)",
                        }}
                      >
                        {repo.relation === "owner" ? "소유자" : "협업자"}
                      </span>
                      <span
                        className="py-0.5 rounded tracking-tight"
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          width: "72px",
                          textAlign: "center",
                          display: "inline-block",
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--muted)",
                        }}
                      >
                        {repo.isPrivate ? "🔒 Private" : "🌐 Public"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}
              >
                이전
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(32, 227, 255, 0.28)",
                }}
              >
                {selectedRepos.length > 0 ? `팀 만들기 (${selectedRepos.length}개 연결)` : "팀 만들기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InvitationsModal({
  invites,
  onClose,
  onAccept,
  onReject,
}: {
  invites: Invite[];
  onClose: () => void;
  onAccept: (invite: Invite) => void;
  onReject: (id: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[620px] rounded-[24px] overflow-hidden"
        style={{
          background: "rgba(8, 16, 32, 0.98)",
          border: "1px solid rgba(32, 227, 255, 0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <div>
            <h2 className="m-0 tracking-[-0.06em]" style={{ fontSize: "22px", fontWeight: 950, color: "var(--white)" }}>
              초대 확인하기
            </h2>
            <p className="m-0 mt-1 tracking-tight" style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)" }}>
              받은 초대 목록입니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border-0"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 pb-7" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div style={{ fontSize: "36px" }}>📭</div>
              <p className="m-0 tracking-tight" style={{ fontSize: "15px", fontWeight: 800, color: "var(--muted)" }}>
                받은 초대가 없습니다
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: "rgba(234, 247, 255, 0.04)", border: "1px solid rgba(32, 227, 255, 0.12)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="m-0 truncate tracking-tight" style={{ fontSize: "15px", fontWeight: 950, color: "var(--white)" }}>
                        {invite.teamName}
                      </p>
                      <span
                        className="px-2 py-0.5 rounded-md tracking-tight flex-shrink-0"
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          background: "rgba(32, 227, 255, 0.10)",
                          color: "var(--neon-cyan)",
                          border: "1px solid rgba(32, 227, 255, 0.22)",
                        }}
                      >
                        {invite.role}
                      </span>
                    </div>
                    <p className="m-0 mb-2 tracking-tight" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                      {invite.inviterName} 님이 초대했습니다 · {invite.time}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 tracking-tight" style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span style={{ color: "var(--white)" }}>{invite.memberCount}명</span>
                      </span>
                      <span className="flex items-center gap-1 tracking-tight" style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/>
                        </svg>
                        <span style={{ color: "var(--white)" }}>{invite.repoCount}개</span>
                      </span>
                      <span
                        className="flex items-center gap-1 tracking-tight"
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: invite.expiresInDays <= 1 ? "#FF6B6B" : "var(--muted)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span style={{ color: invite.expiresInDays <= 1 ? "#FF6B6B" : "var(--white)" }}>
                          {invite.expiresInDays <= 1
                            ? `${invite.expiresInDays === 0 ? "오늘" : "내일"} ${invite.expiresTime}에 만료`
                            : `${invite.expiresInDays}일 후 만료`}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onAccept(invite)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-0 transition-all hover:scale-[1.08]"
                      style={{ background: "rgba(57, 255, 136, 0.12)", color: "var(--matrix-green)", cursor: "pointer", border: "1px solid rgba(57, 255, 136, 0.25)" }}
                      title="수락"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => onReject(invite.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-0 transition-all hover:scale-[1.08]"
                      style={{ background: "rgba(255, 107, 107, 0.12)", color: "#FF6B6B", cursor: "pointer", border: "1px solid rgba(255, 107, 107, 0.25)" }}
                      title="거절"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const teamSectionRef = useRef<HTMLDivElement>(null);

  const [orgs, setOrgs] = useState<Org[]>([
    { id: 1, name: "SecureFlow Workspace", openPRs: 7, highRisk: 2, activeIssues: 12, memberCount: 5, myRole: "소유자" },
    { id: 2, name: "AI Chat Platform", openPRs: 3, highRisk: 0, activeIssues: 8, memberCount: 8, myRole: "편집 가능" },
    { id: 3, name: "Dashboard UI Kit", openPRs: 5, highRisk: 1, activeIssues: 6, memberCount: 3, myRole: "보기 가능" },
  ]);

  const [invites, setInvites] = useState<Invite[]>([
    { id: 1, teamName: "Backend Infra Team", inviterName: "김재준", role: "편집 가능", time: "3일 전", memberCount: 8, repoCount: 4, expiresInDays: 1, expiresTime: "23시 59분" },
    { id: 2, teamName: "Design System Squad", inviterName: "안현", role: "보기 가능", time: "1주 전", memberCount: 3, repoCount: 2, expiresInDays: 6, expiresTime: "09시 00분" },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);

  const moveOrg = useCallback((from: number, to: number) => {
    setOrgs((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  }, []);

  const handleCreateTeam = (name: string, _repoIds: number[]) => {
    setOrgs((prev) => [
      ...prev,
      { id: Date.now(), name, openPRs: 0, highRisk: 0, activeIssues: 0, memberCount: 1, myRole: "소유자" },
    ]);
  };

  const handleAcceptInvite = (invite: Invite) => {
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setOrgs((prev) => [
      ...prev,
      { id: Date.now(), name: invite.teamName, openPRs: 0, highRisk: 0, activeIssues: 0, memberCount: 1, myRole: invite.role },
    ]);
  };

  const handleRejectInvite = (id: number) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

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
            style={{ fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 950, color: "var(--white)", textShadow: "0 0 22px rgba(32, 227, 255, 0.18)" }}
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
            { label: "리뷰 대기 PR", value: "15", color: "var(--matrix-green)", onClick: () => navigate("/prs") },
            { label: "위험도 높은 PR", value: "3", color: "#FF6B6B", onClick: () => navigate("/prs") },
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
            <h2 className="m-0 leading-none tracking-[-0.075em]" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}>
              내 팀
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInvitesModal(true)}
                className="px-5 py-3 rounded-xl flex items-center gap-2 tracking-tight transition-all hover:brightness-110"
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
                {invites.length > 0 && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--neon-cyan)", color: "#021014", fontSize: "11px", fontWeight: 950 }}
                  >
                    {invites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 rounded-xl border-0 flex items-center gap-2 tracking-tight transition-all hover:brightness-110"
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

          {orgs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 tracking-tight"
              style={{ color: "var(--muted)", fontSize: "15px", fontWeight: 700 }}
            >
              <p className="m-0">팀을 생성하거나 초대를 수락하여 시작하세요.</p>
            </div>
          ) : (
            <AutoScrollContainer itemCount={orgs.length}>
              {orgs.map((org, index) => (
                <DraggableTeamCard key={org.id} org={org} index={index} moveOrg={moveOrg} />
              ))}
            </AutoScrollContainer>
          )}
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
          <h2 className="m-0 mb-6 leading-none tracking-[-0.075em]" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}>
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
                    {activity.risk === "high" && <AlertCircle size={20} style={{ color: getRiskColor(activity.risk) }} />}
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

      {showCreateModal && (
        <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTeam} />
      )}
      {showInvitesModal && (
        <InvitationsModal
          invites={invites}
          onClose={() => setShowInvitesModal(false)}
          onAccept={handleAcceptInvite}
          onReject={handleRejectInvite}
        />
      )}
    </DndProvider>
  );
}
