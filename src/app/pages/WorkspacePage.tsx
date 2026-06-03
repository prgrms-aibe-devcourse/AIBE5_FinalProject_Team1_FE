import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, AtSign, Check, CircleDot, CornerDownRight, GitFork, GitPullRequest, MessageSquare, Plus, Settings2, Users, X } from "lucide-react";
import { WorkspaceSettingsModal } from "../components/WorkspaceSettingsModal";
import { ensureSeeded } from "../components/TeamPanel";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DRAG_TYPE = "TEAM_CARD";
const WORKSPACE_COLORS_KEY = "codedock-workspace-colors-v1";
const DEFAULT_ACCENT = "#8B94A7"; // default grey

function hexToRgb(hex: string): string {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "139,148,167";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

export type Org = {
  id: number;
  name: string;
  description?: string;
  myPendingReviews: number;
  myOpenPRs: number;
  myReviewedPRs: number;
  myOpenIssues: number;
  memberCount: number;
  repoCount: number;
  myRole: string;  // "소유자" | "관리자" | "편집 가능" | "보기 가능"
  workspaceId?: string; // localStorage key for team members
};

type Invite = {
  id: number;
  teamName: string;
  inviterName: string;
  role: string;
  time: string;
  memberCount: number;
  repoCount: number;
  myPendingReviews: number;
  myOpenPRs: number;
  myReviewedPRs: number;
  myOpenIssues: number;
  expiresInDays: number;
  expiresTime: string;
};

type TeamInviteDraft = {
  id: number;
  name: string;
  email: string;
  role: string;
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

const SUGGESTED_TEAM_MEMBERS: TeamInviteDraft[] = [
  { id: 1, name: "김재준", email: "jaejun@codedock.dev", role: "Tech Lead" },
  { id: 2, name: "김진필", email: "jinah@codedock.dev", role: "Backend Developer" },
  { id: 3, name: "김진현", email: "jinhyun@codedock.dev", role: "DevOps Engineer" },
  { id: 4, name: "안현", email: "hyun@codedock.dev", role: "QA Engineer" },
];

const TEAM_ROLE_OPTIONS = [
  "Tech Lead",
  "Backend Developer",
  "Frontend Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "Designer",
  "Viewer",
];

function AutoScrollContainer({ children, itemCount }: { children: React.ReactNode; itemCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const { isDragging } = useDragLayer((monitor) => ({ isDragging: monitor.isDragging() }));
  const scrollTopRef = useRef(0);
  const prevIsDraggingRef = useRef(false);

  useLayoutEffect(() => {
    if (!ref.current || lockedHeight !== null) return;
    if (itemCount > 0 && itemCount <= 3) {
      setLockedHeight(ref.current.scrollHeight);
    } else if (itemCount >= 4) {
      const perItem = ref.current.scrollHeight / itemCount;
      setLockedHeight(Math.round(perItem * 3));
    }
  }, [itemCount, lockedHeight]);

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
        maxHeight: lockedHeight !== null ? `${lockedHeight}px` : "none",
        padding: "8px",
        margin: "-8px",
        scrollbarWidth: "none",
        overscrollBehavior: "contain",
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
  onSettingsClick,
  accentColor,
}: {
  org: Org;
  index: number;
  moveOrg: (from: number, to: number) => void;
  onSettingsClick: (org: Org) => void;
  accentColor: string;
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

  const rgb = hexToRgb(accentColor);

  return (
    <div
      ref={cardRef}
      onClick={() => navigate("/chat")}
      className="px-6 py-6 rounded-3xl transition-all hover:scale-[1.01]"
      style={{
        background: `linear-gradient(135deg, rgba(${rgb},0.13) 0%, rgba(11,22,40,0.90) 55%, rgba(8,16,32,0.85) 100%)`,
        border: `1px solid rgba(${rgb},0.30)`,
        boxShadow: `0 14px 36px rgba(0,0,0,0.22), 0 0 24px rgba(${rgb},0.07)`,
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
          </div>
          <div className="flex flex-wrap gap-4">
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              내 리뷰 대기: <span style={{ color: "var(--neon-cyan)" }}>{org.myPendingReviews}</span>
            </span>
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              내 오픈 PR: <span style={{ color: "var(--matrix-green)" }}>{org.myOpenPRs}</span>
            </span>
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              리뷰받은 PR: <span style={{ color: "#FFD93D" }}>{org.myReviewedPRs}</span>
            </span>
            <span className="tracking-tight" style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}>
              미해결 이슈: <span style={{ color: org.myOpenIssues > 0 ? "#FF6B6B" : "var(--matrix-green)" }}>{org.myOpenIssues}</span>
            </span>
            <span
              className="flex items-center gap-1 tracking-tight"
              style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}
            >
              <Users size={13} />
              <span style={{ color: "var(--white)" }}>{org.memberCount}</span>
            </span>
            <span
              className="flex items-center gap-1 tracking-tight"
              style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)" }}
            >
              <GitFork size={13} />
              <span style={{ color: "var(--white)" }}>{org.repoCount}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSettingsClick(org); }}
          className="grid place-items-center rounded-lg border-0 self-start flex-shrink-0"
          style={{ background: "transparent", cursor: "pointer", opacity: 0.4, color: "var(--muted)", transition: "opacity 0.15s, color 0.15s", padding: "4px", margin: "-4px" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--neon-cyan)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
          title="팀 설정"
          aria-label="팀 설정 열기"
        >
          <Settings2 size={24} />
        </button>
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
  onCreate: (name: string, repoIds: number[], invitedMembers: TeamInviteDraft[]) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<TeamInviteDraft[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState(TEAM_ROLE_OPTIONS[0]);

  const canProceed = name.trim().length > 0;

  const filteredRepos = MOCK_GITHUB_REPOS.filter((r) =>
    `${r.owner}/${r.name}`.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const toggleRepo = (id: number) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleSuggestedMember = (member: TeamInviteDraft) => {
    setSelectedMembers((prev) =>
      prev.some((item) => item.email === member.email)
        ? prev.filter((item) => item.email !== member.email)
        : [...prev, member]
    );
  };

  const handleAddMemberByEmail = () => {
    const email = memberEmail.trim();
    if (!email || !email.includes("@") || selectedMembers.some((member) => member.email === email)) return;

    setSelectedMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: email.split("@")[0],
        email,
        role: memberRole,
      },
    ]);
    setMemberEmail("");
  };

  const handleRemoveMember = (email: string) => {
    setSelectedMembers((prev) => prev.filter((member) => member.email !== email));
  };

  const handleChangeMemberRole = (email: string, role: string) => {
    setSelectedMembers((prev) =>
      prev.map((member) => (member.email === email ? { ...member, role } : member))
    );
  };

  const handleFinish = () => {
    onCreate(name.trim(), selectedRepos, selectedMembers);
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
              {([1, 2, 3] as const).map((s) => (
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
                    {s === 1 ? "팀 이름" : s === 2 ? "리포지토리" : "팀원 추가"}
                  </span>
                  {s < 3 && (
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

            <div className="relative mb-3">
              <input
                autoFocus
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="리포지토리 검색..."
                className="w-full rounded-xl py-2.5 pl-4 pr-11 outline-none tracking-tight"
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
              {repoSearch.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setRepoSearch("")}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-0"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                  aria-label="검색어 지우기"
                >
                  <X size={14} />
                </button>
              )}
            </div>

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
                onClick={() => setStep(3)}
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
                {selectedRepos.length > 0 ? `다음 (${selectedRepos.length}개 연결)` : "다음"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-7 pb-7">
            <div className="mb-5 rounded-2xl px-4 py-3" style={{ background: "rgba(32, 227, 255, 0.08)", border: "1px solid rgba(32, 227, 255, 0.18)" }}>
              <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: "14px", fontWeight: 950 }}>
                팀원을 초대하세요
              </p>
              <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 750, lineHeight: 1.5 }}>
                팀 생성 후 초대 메일을 발송합니다. 지금 건너뛰고 나중에 팀 관리에서 추가할 수도 있습니다.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-[1fr_150px_auto] gap-2">
              <input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMemberByEmail();
                  }
                }}
                autoFocus
                placeholder="teammate@company.com"
                className="min-w-0 rounded-xl px-4 py-3 outline-none tracking-tight"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(32, 227, 255, 0.20)",
                  color: "var(--white)",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="rounded-xl px-3 py-3 outline-none tracking-tight"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(32, 227, 255, 0.20)",
                  color: "var(--white)",
                  fontSize: "12px",
                  fontWeight: 850,
                }}
              >
                {TEAM_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMemberByEmail}
                className="rounded-xl border-0 px-4 py-3 tracking-tight"
                style={{
                  background: "rgba(32, 227, 255, 0.12)",
                  border: "1px solid rgba(32, 227, 255, 0.24)",
                  color: "var(--neon-cyan)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 950,
                }}
              >
                추가
              </button>
            </div>

            <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>
              추천 팀원
            </p>
            <div className="mb-4 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "248px" }}>
              {SUGGESTED_TEAM_MEMBERS.map((member) => {
                const selected = selectedMembers.some((item) => item.email === member.email);
                return (
                  <button
                    key={member.email}
                    type="button"
                    onClick={() => toggleSuggestedMember(member)}
                    className="flex w-full items-center gap-3 rounded-xl border-0 px-4 py-3 text-left transition-all"
                    style={{
                      background: selected ? "rgba(57, 255, 136, 0.10)" : "rgba(255,255,255,0.03)",
                      border: selected ? "1px solid rgba(57, 255, 136, 0.30)" : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}
                  >
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full" style={{ background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))", color: "#021014", fontSize: "12px", fontWeight: 950 }}>
                      {member.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>{member.name}</span>
                      <span className="block truncate" style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 750 }}>{member.email} · {member.role}</span>
                    </span>
                    <span style={{ color: selected ? "var(--matrix-green)" : "var(--muted)", fontSize: "12px", fontWeight: 950 }}>
                      {selected ? "선택됨" : "초대"}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMembers.length > 0 && (
              <div className="mb-5 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "228px" }}>
                {selectedMembers.map((member) => (
                  <div
                    key={member.email}
                    className="grid items-center gap-3 rounded-xl px-4 py-3 tracking-tight"
                    style={{
                      background: "rgba(234, 247, 255, 0.08)",
                      border: "1px solid rgba(32, 227, 255, 0.16)",
                      gridTemplateColumns: "minmax(0, 1fr) 190px auto",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>
                        {member.name}
                      </p>
                      <p className="m-0 truncate" style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 750 }}>
                        {member.email}
                      </p>
                    </div>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeMemberRole(member.email, e.target.value)}
                      className="rounded-xl px-3 py-2 outline-none tracking-tight"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(32, 227, 255, 0.20)",
                        color: "var(--white)",
                        fontSize: "12px",
                        fontWeight: 850,
                      }}
                    >
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.email)}
                      className="h-9 w-9 rounded-xl border-0"
                      style={{
                        background: "rgba(255, 107, 107, 0.12)",
                        border: "1px solid rgba(255, 107, 107, 0.24)",
                        color: "#FF6B6B",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 950,
                      }}
                      aria-label={`${member.name} 제거`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setStep(2)}
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
                {selectedMembers.length > 0 ? `팀 만들기 (${selectedMembers.length}명 초대)` : "팀 만들기"}
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
    { id: 1, name: "SecureFlow Workspace", myPendingReviews: 4, myOpenPRs: 2, myReviewedPRs: 1, myOpenIssues: 5, memberCount: 5, repoCount: 3, myRole: "소유자", workspaceId: "workspace-1" },
    { id: 2, name: "AI Chat Platform", myPendingReviews: 2, myOpenPRs: 1, myReviewedPRs: 1, myOpenIssues: 1, memberCount: 8, repoCount: 2, myRole: "관리자", workspaceId: "workspace-2" },
    { id: 3, name: "Dashboard UI Kit", myPendingReviews: 1, myOpenPRs: 1, myReviewedPRs: 0, myOpenIssues: 0, memberCount: 3, repoCount: 1, myRole: "편집 가능", workspaceId: "workspace-3" },
    { id: 4, name: "Mobile App Beta", myPendingReviews: 1, myOpenPRs: 0, myReviewedPRs: 0, myOpenIssues: 0, memberCount: 6, repoCount: 2, myRole: "보기 가능", workspaceId: "workspace-4" },
  ]);

  const [settingsOrg, setSettingsOrg] = useState<Org | null>(null);

  // Sync memberCount from localStorage on mount so it reflects actual stored data
  useEffect(() => {
    ensureSeeded(); // writes seed data if localStorage has never been initialised
    try {
      const stored = localStorage.getItem("codedock-workspace-teams-v1");
      if (!stored) return;
      const all: Record<string, unknown[]> = JSON.parse(stored);
      setOrgs((prev) =>
        prev.map((o) => {
          const key = o.workspaceId ?? String(o.id);
          const members = all[key];
          if (!Array.isArray(members)) return o;
          return { ...o, memberCount: members.length };
        })
      );
    } catch { /* ignore */ }
  }, []);

  const [orgColors, setOrgColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(WORKSPACE_COLORS_KEY) ?? "{}"); }
    catch { return {}; }
  });

  const handleColorChange = (orgId: number, color: string) => {
    const all = { ...orgColors, [String(orgId)]: color };
    setOrgColors(all);
    localStorage.setItem(WORKSPACE_COLORS_KEY, JSON.stringify(all));
  };

  const [invites, setInvites] = useState<Invite[]>([
    { id: 1, teamName: "Backend Infra Team", inviterName: "김재준", role: "편집 가능", time: "3일 전", memberCount: 8, repoCount: 4, myPendingReviews: 3, myOpenPRs: 2, myReviewedPRs: 1, myOpenIssues: 4, expiresInDays: 1, expiresTime: "23시 59분" },
    { id: 2, teamName: "Design System Squad", inviterName: "안현", role: "보기 가능", time: "1주 전", memberCount: 3, repoCount: 2, myPendingReviews: 1, myOpenPRs: 0, myReviewedPRs: 1, myOpenIssues: 2, expiresInDays: 6, expiresTime: "09시 00분" },
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

  const handleUpdateOrg = (updated: Partial<Org> & { id: number }) => {
    setOrgs((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    // Keep the open settings modal in sync so it doesn't show stale data
    setSettingsOrg((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleDeleteOrg = (orgId: number) => {
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
    setSettingsOrg(null);
  };

  const handleLeaveOrg = (orgId: number) => {
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
    setSettingsOrg(null);
  };

  const handleCreateTeam = (name: string, repoIds: number[], invitedMembers: TeamInviteDraft[]) => {
    const newId = Date.now();   // capture once so org ID and storage key match
    setOrgs((prev) => [
      ...prev,
      { id: newId, name, myPendingReviews: 0, myOpenPRs: 0, myReviewedPRs: 0, myOpenIssues: 0, memberCount: invitedMembers.length + 1, repoCount: repoIds.length, myRole: "소유자", workspaceId: String(newId) },
    ]);

    // Persist workspace team to localStorage
    const memberPool: Record<string, object> = {
      "jaejun@codedock.dev":  { id: "jaejun",  initials: "JJ", name: "김재준",  role: "Tech Lead",          email: "jaejun@codedock.dev",  github: "kimjaejun",  score: 95, online: true,  statusColor: "#39FF88", commits: 247, prs: 42, reviews: 68, protected: true },
      "jinpil@codedock.dev":  { id: "jinpil",  initials: "JP", name: "김진필",  role: "Backend Developer",  email: "jinpil@codedock.dev",  github: "kimjinpil",  score: 88, online: true,  statusColor: "#39FF88", commits: 189, prs: 35, reviews: 52 },
      "junwoo@codedock.dev":  { id: "junwoo",  initials: "JW", name: "김준우",  role: "Frontend Developer", email: "junwoo@codedock.dev",  github: "kimjunwoo",  score: 82, online: true,  statusColor: "#39FF88", commits: 156, prs: 28, reviews: 45 },
      "jinhyun@codedock.dev": { id: "jinhyun", initials: "JH", name: "김진현",  role: "DevOps Engineer",    email: "jinhyun@codedock.dev", github: "kimjinhyun", score: 74, online: false, statusColor: "#8B94A7", commits: 98,  prs: 18, reviews: 31 },
      "hyun@codedock.dev":    { id: "hyun",    initials: "AH", name: "안현",    role: "QA Engineer",        email: "hyun@codedock.dev",    github: "ahnhyun",    score: 79, online: false, statusColor: "#8B94A7", commits: 45,  prs: 12, reviews: 87 },
    };

    const creator = memberPool["jaejun@codedock.dev"];
    const invitedAsFull = invitedMembers.map((draft) =>
      memberPool[draft.email] ?? {
        id: `invited-${draft.id}`,
        initials: draft.name.slice(0, 2).toUpperCase(),
        name: draft.name,
        role: draft.role,
        email: draft.email,
        github: draft.email.split("@")[0],
        score: 50, online: false, statusColor: "#8B94A7",
        commits: 0, prs: 0, reviews: 0,
      }
    );

    try {
      const stored = localStorage.getItem("codedock-workspace-teams-v1");
      const all: Record<string, unknown[]> = stored ? JSON.parse(stored) : {};
      all[String(newId)] = [creator, ...invitedAsFull];
      localStorage.setItem("codedock-workspace-teams-v1", JSON.stringify(all));
    } catch { /* ignore */ }
  };

  const handleAcceptInvite = (invite: Invite) => {
    const newId = Date.now();
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setOrgs((prev) => [
      ...prev,
      { id: newId, name: invite.teamName, myPendingReviews: invite.myPendingReviews, myOpenPRs: invite.myOpenPRs, myReviewedPRs: invite.myReviewedPRs, myOpenIssues: invite.myOpenIssues, memberCount: invite.memberCount, repoCount: invite.repoCount, myRole: invite.role, workspaceId: String(newId) },
    ]);
  };

  const handleRejectInvite = (id: number) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  type KeyEventType = "pr_opened" | "issue_opened" | "review" | "mention" | "reply";

  const keyEvents: { type: KeyEventType; user: string; workspace: string; channel: string; content: string; time: string }[] = [
    { type: "pr_opened",    user: "김진필", workspace: "SecureFlow Workspace", channel: "backend",  content: "PR #234: 인증 미들웨어 추가 — 보안 변경 포함",         time: "10분 전" },
    { type: "review",       user: "김준우", workspace: "SecureFlow Workspace", channel: "frontend", content: "PR #231 승인 — LGTM, 배포 가능합니다.",                 time: "25분 전" },
    { type: "issue_opened", user: "안현",   workspace: "AI Chat Platform",     channel: "general",  content: "Issue #145: 요청 제한이 작동하지 않음",                 time: "1시간 전" },
    { type: "mention",      user: "김재준", workspace: "SecureFlow Workspace", channel: "backend",  content: "@김준우 이 부분 리뷰 부탁드려요, 인증 흐름 변경됐어요.", time: "2시간 전" },
    { type: "reply",        user: "김진현", workspace: "Dashboard UI Kit",     channel: "general",  content: "맞아요, 그 방식으로 처리하면 됩니다.",                   time: "3시간 전" },
    { type: "review",       user: "김진필", workspace: "AI Chat Platform",     channel: "backend",  content: "PR #230 변경 요청 — 에러 처리 로직 수정 필요합니다.",   time: "5시간 전" },
  ];

  const getEventMeta = (type: KeyEventType) => {
    switch (type) {
      case "pr_opened":    return { label: "PR 올라옴",   icon: GitPullRequest, color: "var(--neon-cyan)" };
      case "issue_opened": return { label: "이슈 올라옴", icon: CircleDot,      color: "#FFD93D" };
      case "review":       return { label: "리뷰 받음",   icon: MessageSquare,  color: "var(--matrix-green)" };
      case "mention":      return { label: "멘션됨",      icon: AtSign,         color: "#C084FC" };
      case "reply":        return { label: "답장 받음",   icon: CornerDownRight, color: "var(--soft-mint)" };
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
            내 리뷰, PR, 이슈를 한눈에 확인합니다
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-5 mb-9">
          {[
            { label: "내 리뷰 대기", value: "8", color: "var(--neon-cyan)" },
            { label: "내 오픈 PR", value: "4", color: "var(--matrix-green)" },
            { label: "리뷰받은 PR", value: "2", color: "#FFD93D" },
            { label: "미해결 이슈", value: "6", color: "#FF6B6B" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-6 py-6 rounded-3xl"
              style={{
                background: "rgba(11, 22, 40, 0.82)",
                border: "1px solid rgba(32, 227, 255, 0.16)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
                backdropFilter: "blur(16px)",
              }}
            >
              <p className="m-0 mb-3 tracking-tight" style={{ color: "var(--muted)", fontSize: "14px", fontWeight: 900 }}>
                {stat.label}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{ fontSize: "48px", fontWeight: 950, color: stat.color }}>
                {stat.value}
              </p>
            </div>
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
                <DraggableTeamCard
                  key={org.id} org={org} index={index} moveOrg={moveOrg}
                  onSettingsClick={setSettingsOrg}
                  accentColor={orgColors[String(org.id)] ?? DEFAULT_ACCENT}
                />
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
            주요 이벤트
          </h2>
          <div className="grid gap-3">
            {keyEvents.map((event, idx) => {
              const { label, icon: Icon, color } = getEventMeta(event.type);
              return (
                <div
                  key={idx}
                  className="px-5 py-4 rounded-2xl"
                  style={{ background: "rgba(5, 11, 20, 0.42)", border: "1px solid rgba(32, 227, 255, 0.10)" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">
                      <Icon size={18} style={{ color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="tracking-tight" style={{ fontSize: "15px", fontWeight: 900, color: "var(--white)" }}>
                          <span style={{ color: "var(--matrix-green)" }}>{event.user}</span>
                          {"  "}
                          <span style={{ color, fontSize: "13px", fontWeight: 800 }}>{label}</span>
                        </span>
                        <span className="tracking-tight" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                          {event.workspace} · #{event.channel}
                        </span>
                      </div>
                      <p className="m-0 tracking-tight truncate" style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                        {event.content}
                      </p>
                    </div>
                    <span className="flex-shrink-0 tracking-tight" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {event.time}
                    </span>
                  </div>
                </div>
              );
            })}
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
      {settingsOrg && (
        <WorkspaceSettingsModal
          org={settingsOrg}
          onClose={() => setSettingsOrg(null)}
          onUpdate={handleUpdateOrg}
          onDelete={handleDeleteOrg}
          onLeave={handleLeaveOrg}
          onColorChange={handleColorChange}
        />
      )}
    </DndProvider>
  );
}
