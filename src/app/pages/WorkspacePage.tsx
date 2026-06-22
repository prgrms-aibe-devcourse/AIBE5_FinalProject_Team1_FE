import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { ArrowRight, AtSign, Check, ChevronDown, CircleDot, CornerDownRight, GitFork, GitPullRequest, Loader2, MessageSquare, Plus, Settings2, Users, X } from "lucide-react";
import { WorkspaceSettingsModal } from "../components/WorkspaceSettingsModal";
import { REACTION_KEY_TO_EMOJI } from "../components/EmojiPicker";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { fetchMyGithubRepos, fetchRepoCollaborators, fetchWorkspaceRepositories, connectWorkspaceRepository, type GithubCollaborator, type GithubRepo } from "../api/github";
import { fetchMyWorkspaces, createWorkspace, deleteWorkspace, listReceivedInvites, acceptInvite, rejectInvite, createInvite, type WorkspaceDto, type ReceivedInviteDto } from "../api/workspace";
import { fetchMyEvents, type WorkspaceEventDto, type EventType } from "../api/events";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { ApiClientError } from "../api/client";

const DRAG_TYPE = "TEAM_CARD";
const WORKSPACE_COLORS_KEY = "codedock-workspace-colors-v1";
const DASHBOARD_EVENT_SCROLL_MAX_HEIGHT = 420;
const DEFAULT_ACCENT = "#8B94A7"; // default grey
type SortOrder = "name" | "latest" | "activity";
type DashboardEventFilter = "ALL" | EventType;
const REACTION_KEY_PATTERN = new RegExp(
  `\\b(${Object.keys(REACTION_KEY_TO_EMOJI).map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "g"
);

const DASHBOARD_EVENT_FILTERS: Array<{ value: DashboardEventFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "PR_CREATED", label: "PR" },
  { value: "ISSUE_CREATED", label: "이슈" },
  { value: "PR_REVIEW", label: "리뷰" },
  { value: "MENTION", label: "멘션" },
  { value: "REPLY", label: "답장" }
];

const TEAM_SORT_OPTIONS: Array<{ value: SortOrder; label: string; color: string }> = [
  { value: "latest", label: "최신 순", color: "var(--neon-cyan)" },
  { value: "activity", label: "최근 활동 순", color: "var(--matrix-green)" },
  { value: "name", label: "이름 순", color: "#FFD166" }
];

function getTeamSortOption(value: SortOrder) {
  return TEAM_SORT_OPTIONS.find((option) => option.value === value) ?? TEAM_SORT_OPTIONS[0];
}

function TeamSortDropdown({
  value,
  onChange
}: {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = getTeamSortOption(value);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 188);
    setDropPos({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      width
    });
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    const closeOnResize = () => setOpen(false);

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnResize);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="flex min-h-[44px] items-center gap-2 rounded-2xl px-3.5 py-2.5 tracking-tight transition-all"
        style={{
          minWidth: 148,
          background: open
            ? "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.16), rgba(var(--codedock-secondary-rgb), 0.07)), rgba(5, 11, 20, 0.74)"
            : "rgba(5, 11, 20, 0.58)",
          border: open
            ? "1px solid rgba(var(--codedock-primary-rgb), 0.44)"
            : "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
          color: "var(--white)",
          cursor: "pointer",
          boxShadow: open
            ? "0 14px 34px rgba(0, 0, 0, 0.34), 0 0 22px rgba(var(--codedock-primary-rgb), 0.10), inset 0 1px 0 rgba(255,255,255,0.08)"
            : "inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(150%)"
        }}
        aria-label="팀 목록 정렬 방식"
        aria-expanded={open}
      >
        <span
          className="min-w-0 flex-1 text-left"
          style={{
            color: selected.color,
            fontSize: 13,
            fontWeight: 950
          }}
        >
          {selected.label}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: selected.color,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease"
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="grid gap-1 rounded-2xl p-1.5"
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            zIndex: 99999,
            width: dropPos.width,
            background: "linear-gradient(145deg, rgba(11, 22, 40, 0.98), rgba(5, 11, 20, 0.96))",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.56), 0 0 0 1px rgba(255,255,255,0.04), 0 0 36px rgba(var(--codedock-primary-rgb), 0.10)",
            backdropFilter: "blur(18px) saturate(170%)"
          }}
        >
          {TEAM_SORT_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight transition-all"
                style={{
                  background: isSelected ? "rgba(var(--codedock-primary-rgb), 0.12)" : "transparent",
                  color: isSelected ? "var(--white)" : "var(--muted)",
                  cursor: "pointer",
                  border: isSelected ? "1px solid rgba(var(--codedock-primary-rgb), 0.28)" : "1px solid transparent"
                }}
                onMouseEnter={(event) => {
                  if (isSelected) return;
                  event.currentTarget.style.background = "rgba(234, 247, 255, 0.055)";
                  event.currentTarget.style.border = "1px solid rgba(var(--codedock-primary-rgb), 0.12)";
                }}
                onMouseLeave={(event) => {
                  if (isSelected) return;
                  event.currentTarget.style.background = "transparent";
                  event.currentTarget.style.border = "1px solid transparent";
                }}
              >
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 950 : 850
                  }}
                >
                  {option.label}
                </span>
                {isSelected && <Check size={15} style={{ color: option.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

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
  lastActivityAt: string | null;
};

type Invite = {
  id: number;
  token: string;
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
    if (!ref.current) return;
    const el = ref.current;
    // 일시적으로 height 제한 해제 후 자연 높이 측정
    el.style.maxHeight = "none";
    const fullHeight = el.scrollHeight;
    if (itemCount === 0) {
      setLockedHeight(null);
      return;
    }
    if (itemCount <= 3) {
      setLockedHeight(fullHeight);
    } else {
      const perItem = fullHeight / itemCount;
      setLockedHeight(Math.round(perItem * 3));
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
      className="codedock-scrollbar-hidden grid gap-4 overflow-y-auto"
      style={{
        maxHeight: lockedHeight !== null ? `min(${lockedHeight}px, max(320px, calc(100svh - 430px)))` : "none",
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
      style={{ color: "rgba(var(--codedock-primary-rgb), 0.35)", cursor: "grab", lineHeight: 0, padding: "4px" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.color = "rgba(var(--codedock-primary-rgb), 0.75)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.color = "rgba(var(--codedock-primary-rgb), 0.35)")}
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
  const { setWorkspaceId } = useWorkspace();
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
  const handleOpenWorkspace = () => {
    const workspaceApiId = Number(org.workspaceId ?? org.id);
    if (Number.isFinite(workspaceApiId)) {
      setWorkspaceId(workspaceApiId);
    }
    navigate("/chat", { state: { workspaceId: String(workspaceApiId) } });
  };

  return (
    <div
      ref={cardRef}
      onClick={handleOpenWorkspace}
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
            <span
              className="px-2 py-0.5 rounded-md tracking-tight"
              style={{
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 800,
                background: "rgba(var(--codedock-primary-rgb), 0.12)",
                color: "var(--neon-cyan)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.25)",
              }}
            >
              {org.myRole}
            </span>
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
              미해결 이슈: <span style={{ color: "#FF6B6B" }}>{org.myOpenIssues}</span>
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
          <DotHandle dragRef={(node) => { if (node) drag(node); }} />
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
  onCreate: (name: string, repos: GithubRepo[], invitedMembers: TeamInviteDraft[]) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");

  // Step 2: repos
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [repoSearch, setRepoSearch] = useState("");

  // Step 3: members
  const [collaborators, setCollaborators] = useState<GithubCollaborator[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<TeamInviteDraft[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState(TEAM_ROLE_OPTIONS[0]);

  const canProceed = name.trim().length > 0;

  // Fetch repos when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setReposLoading(true);
    setReposError(null);
    fetchMyGithubRepos()
      .then(setRepos)
      .catch((err: Error) => setReposError(err.message))
      .finally(() => setReposLoading(false));
  }, [step]);

  // Fetch collaborators from all selected repos when entering step 3
  useEffect(() => {
    if (step !== 3 || selectedRepos.length === 0) {
      setCollaborators([]);
      return;
    }
    setCollaboratorsLoading(true);
    const selectedRepoObjs = repos.filter((r) => selectedRepos.includes(r.id));
    Promise.all(
      selectedRepoObjs.map((r) => fetchRepoCollaborators(r.owner, r.name).catch(() => [] as GithubCollaborator[]))
    )
      .then((results) => {
        const seen = new Set<string>();
        const merged: GithubCollaborator[] = [];
        for (const list of results) {
          for (const c of list) {
            if (!seen.has(c.login)) {
              seen.add(c.login);
              merged.push(c);
            }
          }
        }
        setCollaborators(merged);
      })
      .finally(() => setCollaboratorsLoading(false));
  }, [step, selectedRepos, repos]);

  const filteredRepos = repos.filter((r) =>
    `${r.owner}/${r.name}`.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const toggleRepo = (id: number) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleCollaborator = (collab: GithubCollaborator) => {
    if (!collab.email) return;
    const draft: TeamInviteDraft = {
      id: collab.userId ?? Date.now(),
      name: collab.displayName ?? collab.login,
      email: collab.email,
      role: TEAM_ROLE_OPTIONS[1],
    };
    setSelectedMembers((prev) =>
      prev.some((m) => m.email === collab.email)
        ? prev.filter((m) => m.email !== collab.email)
        : [...prev, draft]
    );
  };

  const handleAddMemberByEmail = () => {
    const email = memberEmail.trim();
    if (!email || !email.includes("@") || selectedMembers.some((m) => m.email === email)) return;
    setSelectedMembers((prev) => [
      ...prev,
      { id: Date.now(), name: email.split("@")[0], email, role: memberRole },
    ]);
    setMemberEmail("");
  };

  const handleRemoveMember = (email: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleChangeMemberRole = (email: string, role: string) => {
    setSelectedMembers((prev) => prev.map((m) => (m.email === email ? { ...m, role } : m)));
  };

  const [creating, setCreating] = useState(false);
  const handleFinish = async () => {
    const selectedRepoObjs = repos.filter((r) => selectedRepos.includes(r.id));
    setCreating(true);
    try {
      await onCreate(name.trim(), selectedRepoObjs, selectedMembers);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "팀 생성에 실패했습니다.";
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  // Header with step indicator (shared)
  const stepHeader = (
    <div className="flex items-center justify-between px-7 pt-7 pb-5">
      <div>
        <h2 className="m-0 tracking-[-0.06em]" style={{ fontSize: "22px", fontWeight: 950, color: "var(--white)" }}>
          팀 생성하기
        </h2>
        <div className="flex items-center gap-2 mt-2">
          {([1, 2, 3] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: step === s ? "var(--neon-cyan)" : step > s ? "rgba(var(--codedock-primary-rgb), 0.35)" : "rgba(255,255,255,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--krds-body-xsmall)", fontWeight: 950,
                  color: step >= s ? "#021014" : "var(--muted)", transition: "all 0.2s",
                }}
              >
                {s}
              </div>
              <span style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: step === s ? "var(--white)" : "var(--muted)" }}>
                {s === 1 ? "팀 이름" : s === 2 ? "리포지토리" : "팀원 추가"}
              </span>
              {s < 3 && (
                <div style={{ width: "20px", height: "1.5px", background: step > s ? "rgba(var(--codedock-primary-rgb), 0.4)" : "rgba(255,255,255,0.10)", marginLeft: "2px" }} />
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
  );

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
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {stepHeader}

        {/* ── Step 1: 팀 이름 ── */}
        {step === 1 && (
          <div className="px-7 pb-7">
            <label className="block mb-2 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--muted)" }}>
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
                border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.25)",
                color: "var(--white)", fontSize: "15px", fontWeight: 700,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(var(--codedock-primary-rgb), 0.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--codedock-primary-rgb), 0.25)")}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={() => setStep(2)} disabled={!canProceed} className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                style={{
                  background: canProceed ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))" : "rgba(255,255,255,0.08)",
                  color: canProceed ? "#021014" : "var(--muted)", fontSize: "14px", fontWeight: 900,
                  cursor: canProceed ? "pointer" : "not-allowed",
                  boxShadow: canProceed ? "0 4px 14px rgba(var(--codedock-primary-rgb), 0.28)" : "none",
                }}>
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: 리포지토리 선택 ── */}
        {step === 2 && (
          <div className="px-7 pb-7">
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", display: "inline-flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--white)", flexShrink: 0 }}>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--white)" }}>GitHub</span>
              {reposLoading ? (
                <span style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--muted)" }}>불러오는 중…</span>
              ) : reposError ? (
                <span style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "#FF6B6B" }}>연결 오류</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded"
                  style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, background: "rgba(var(--codedock-secondary-rgb), 0.15)", color: "var(--matrix-green)" }}>
                  연결됨
                </span>
              )}
            </div>

            <p className="m-0 mb-3 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 900, color: "var(--muted)" }}>
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
                  border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.18)",
                  color: "var(--white)", fontSize: "13px", fontWeight: 700,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(var(--codedock-primary-rgb), 0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(var(--codedock-primary-rgb), 0.18)")}
              />
              {repoSearch.length > 0 && (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setRepoSearch("")}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-0"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--muted)", cursor: "pointer" }}
                  aria-label="검색어 지우기">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid gap-1.5 overflow-y-auto" style={{ maxHeight: "260px" }}>
              {reposLoading && (
                <div className="flex items-center justify-center py-10 gap-2" style={{ color: "var(--muted)" }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>리포지토리 불러오는 중…</span>
                </div>
              )}
              {!reposLoading && reposError && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="m-0" style={{ fontSize: "13px", fontWeight: 700, color: "#FF6B6B" }}>
                    GitHub 레포지토리를 불러올 수 없습니다.
                  </p>
                  <p className="m-0" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: "var(--muted)", textAlign: "center", maxWidth: "340px" }}>
                    {reposError}
                  </p>
                </div>
              )}
              {!reposLoading && !reposError && filteredRepos.length === 0 && (
                <div className="flex items-center justify-center py-10">
                  <p className="m-0" style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)" }}>
                    {repoSearch ? "검색 결과가 없습니다." : "연결된 리포지토리가 없습니다."}
                  </p>
                </div>
              )}
              {!reposLoading && filteredRepos.map((repo) => {
                const isSelected = selectedRepos.includes(repo.id);
                return (
                  <button key={repo.id} type="button" onClick={() => toggleRepo(repo.id)}
                    className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left border-0 transition-all"
                    style={{
                      background: isSelected ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(255,255,255,0.03)",
                      border: isSelected ? "1px solid rgba(var(--codedock-primary-rgb), 0.35)" : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}>
                    <div style={{
                      width: "16px", height: "16px", borderRadius: "4px",
                      border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                      background: isSelected ? "var(--neon-cyan)" : "transparent",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#021014" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 truncate tracking-tight" style={{ fontSize: "13px", fontWeight: 900, color: "var(--white)" }}>
                        <span style={{ color: "var(--muted)" }}>{repo.owner}/</span>{repo.name}
                      </p>
                      <p className="m-0 mt-0.5 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: "var(--muted)" }}>
                        {repo.language ?? "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="py-0.5 rounded tracking-tight"
                        style={{
                          fontSize: "var(--krds-body-xsmall)", fontWeight: 900, width: "48px", textAlign: "center", display: "inline-block",
                          background: repo.relation === "owner" ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(255, 200, 50, 0.10)",
                          color: repo.relation === "owner" ? "var(--neon-cyan)" : "#FFD93D",
                          border: repo.relation === "owner" ? "1px solid rgba(var(--codedock-primary-rgb), 0.22)" : "1px solid rgba(255, 200, 50, 0.22)",
                        }}>
                        {repo.relation === "owner" ? "소유자" : "협업자"}
                      </span>
                      <span className="py-0.5 rounded tracking-tight"
                        style={{
                          fontSize: "var(--krds-body-xsmall)", fontWeight: 900, width: "72px", textAlign: "center", display: "inline-block",
                          background: "rgba(255,255,255,0.06)", color: "var(--muted)",
                        }}>
                        {repo.isPrivate ? "🔒 Private" : "🌐 Public"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}>
                이전
              </button>
              <button onClick={() => setStep(3)} className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014", fontSize: "14px", fontWeight: 900, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(var(--codedock-primary-rgb), 0.28)",
                }}>
                {selectedRepos.length > 0 ? `다음 (${selectedRepos.length}개 연결)` : "다음"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 팀원 초대 ── */}
        {step === 3 && (
          <div className="px-7 pb-7">
            <div className="mb-5 rounded-2xl px-4 py-3"
              style={{ background: "rgba(var(--codedock-primary-rgb), 0.08)", border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)" }}>
              <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: "14px", fontWeight: 950 }}>팀원을 초대하세요</p>
              <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750, lineHeight: 1.5 }}>
                팀 생성 후 초대 메일을 발송합니다. 지금 건너뛰고 나중에 팀 관리에서 추가할 수도 있습니다.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-[1fr_150px_auto] gap-2">
              <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMemberByEmail(); } }}
                autoFocus placeholder="teammate@company.com"
                className="min-w-0 rounded-xl px-4 py-3 outline-none tracking-tight"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.20)",
                  color: "var(--white)", fontSize: "13px", fontWeight: 800,
                }} />
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                className="rounded-xl px-3 py-3 outline-none tracking-tight"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.20)",
                  color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 850,
                }}>
                {TEAM_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>{role}</option>
                ))}
              </select>
              <button type="button" onClick={handleAddMemberByEmail} className="rounded-xl border-0 px-4 py-3 tracking-tight"
                style={{
                  background: "rgba(var(--codedock-primary-rgb), 0.12)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
                  color: "var(--neon-cyan)", cursor: "pointer", fontSize: "13px", fontWeight: 950,
                }}>
                추가
              </button>
            </div>

            {/* GitHub 협업자 추천 */}
            <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
              {selectedRepos.length > 0 ? "GitHub 협업자 (이 사이트에 가입된 사용자)" : "추천 팀원"}
            </p>
            <div className="mb-4 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "248px" }}>
              {collaboratorsLoading && (
                <div className="flex items-center justify-center py-6 gap-2" style={{ color: "var(--muted)" }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700 }}>협업자 불러오는 중…</span>
                </div>
              )}
              {!collaboratorsLoading && selectedRepos.length > 0 && collaborators.length === 0 && (
                <p className="m-0 text-center py-4" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: "var(--muted)" }}>
                  이 사이트에 가입된 협업자가 없습니다.
                </p>
              )}
              {!collaboratorsLoading && collaborators.filter((c) => c.email).map((collab) => {
                const selected = selectedMembers.some((m) => m.email === collab.email);
                const displayName = collab.displayName ?? collab.login;
                return (
                  <button key={collab.login} type="button" onClick={() => toggleCollaborator(collab)}
                    className="flex w-full items-center gap-3 rounded-xl border-0 px-4 py-3 text-left transition-all"
                    style={{
                      background: selected ? "rgba(var(--codedock-secondary-rgb), 0.10)" : "rgba(255,255,255,0.03)",
                      border: selected ? "1px solid rgba(var(--codedock-secondary-rgb), 0.30)" : "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                    }}>
                    {collab.avatarUrl ? (
                      <img src={collab.avatarUrl} alt={displayName} className="h-9 w-9 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full"
                        style={{ background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))", color: "#021014", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                        {displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>
                        {displayName}
                        <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700 }}> @{collab.login}</span>
                      </span>
                      <span className="block truncate" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>
                        {collab.email}
                      </span>
                    </span>
                    <span style={{ color: selected ? "var(--matrix-green)" : "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {selected ? "선택됨" : "초대"}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMembers.length > 0 && (
              <div className="mb-5 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "228px" }}>
                {selectedMembers.map((member) => (
                  <div key={member.email} className="grid items-center gap-3 rounded-xl px-4 py-3 tracking-tight"
                    style={{
                      background: "rgba(234, 247, 255, 0.08)",
                      border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                      gridTemplateColumns: "minmax(0, 1fr) 190px auto",
                    }}>
                    <div className="min-w-0">
                      <p className="m-0 truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>{member.name}</p>
                      <p className="m-0 truncate" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>{member.email}</p>
                    </div>
                    <select value={member.role} onChange={(e) => handleChangeMemberRole(member.email, e.target.value)}
                      className="rounded-xl px-3 py-2 outline-none tracking-tight"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
                        color: "var(--white)", fontSize: "var(--krds-body-xsmall)", fontWeight: 850,
                      }}>
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>{role}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleRemoveMember(member.email)} className="h-9 w-9 rounded-xl border-0"
                      style={{
                        background: "rgba(255, 107, 107, 0.12)",
                        border: "1px solid rgba(255, 107, 107, 0.24)",
                        color: "#FF6B6B", cursor: "pointer", fontSize: "14px", fontWeight: 950,
                      }}
                      aria-label={`${member.name} 제거`}>
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}>
                이전
              </button>
              <button onClick={handleFinish} disabled={creating} className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014", fontSize: "14px", fontWeight: 900, cursor: creating ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(var(--codedock-primary-rgb), 0.28)",
                  opacity: creating ? 0.7 : 1,
                }}>
                {creating ? "생성 중..." : selectedMembers.length > 0 ? `팀 만들기 (${selectedMembers.length}명 초대)` : "팀 만들기"}
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
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
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
                  style={{ background: "rgba(234, 247, 255, 0.04)", border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="m-0 truncate tracking-tight" style={{ fontSize: "15px", fontWeight: 950, color: "var(--white)" }}>
                        {invite.teamName}
                      </p>
                      <span
                        className="px-2 py-0.5 rounded-md tracking-tight flex-shrink-0"
                        style={{
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 800,
                          background: "rgba(var(--codedock-primary-rgb), 0.10)",
                          color: "var(--neon-cyan)",
                          border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
                        }}
                      >
                        {invite.role}
                      </span>
                    </div>
                    <p className="m-0 mb-2 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 700, color: "var(--muted)" }}>
                      {invite.inviterName} 님이 초대했습니다 · {invite.time}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span style={{ color: "var(--white)" }}>{invite.memberCount}명</span>
                      </span>
                      <span className="flex items-center gap-1 tracking-tight" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800, color: "var(--muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/>
                        </svg>
                        <span style={{ color: "var(--white)" }}>{invite.repoCount}개</span>
                      </span>
                      <span
                        className="flex items-center gap-1 tracking-tight"
                        style={{
                          fontSize: "var(--krds-body-xsmall)",
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
                      style={{ background: "rgba(var(--codedock-secondary-rgb), 0.12)", color: "var(--matrix-green)", cursor: "pointer", border: "1px solid rgba(var(--codedock-secondary-rgb), 0.25)" }}
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

function roleToKorean(role: string): string {
  switch (role) {
    case "owner":  return "소유자";
    case "admin":  return "관리자";
    case "editor": return "편집 가능";
    case "viewer": return "보기 가능";
    default:       return role;
  }
}

function workspaceDtoToOrg(w: WorkspaceDto): Org {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? undefined,
    myPendingReviews: 0,
    myOpenPRs: 0,
    myReviewedPRs: 0,
    myOpenIssues: 0,
    memberCount: w.memberCount,
    repoCount: 0,
    myRole: roleToKorean(w.myRole),
    workspaceId: String(w.id),
    lastActivityAt: w.lastActivityAt,
  };
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const teamSectionRef = useRef<HTMLDivElement>(null);
  const { inviteSignal, memberSignal } = useWorkspace();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  const [settingsOrg, setSettingsOrg] = useState<Org | null>(null);

  const loadOrgs = useCallback(() => {
    const saved = localStorage.getItem("codedock-team-sort-order");
    const order: SortOrder = saved === "name" || saved === "activity" ? saved : "latest";
    fetchMyWorkspaces()
      .then((list) => {
        const mapped = list.map(workspaceDtoToOrg);
        if (order === "name") setOrgs(mapped.sort((a, b) => a.name.localeCompare(b.name, "ko")));
        else if (order === "activity") setOrgs(mapped.sort((a, b) => {
          if (!a.lastActivityAt && !b.lastActivityAt) return 0;
          if (!a.lastActivityAt) return 1;
          if (!b.lastActivityAt) return -1;
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        }));
        else setOrgs(mapped.sort((a, b) => b.id - a.id));
      })
      .catch(() => setOrgs([]))
      .finally(() => setOrgsLoading(false));
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const [orgColors, setOrgColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(WORKSPACE_COLORS_KEY) ?? "{}"); }
    catch { return {}; }
  });

  const handleColorChange = (orgId: number, color: string) => {
    const all = { ...orgColors, [String(orgId)]: color };
    setOrgColors(all);
    localStorage.setItem(WORKSPACE_COLORS_KEY, JSON.stringify(all));
  };

  const [invites, setInvites] = useState<Invite[]>([]);

  const loadReceivedInvites = useCallback(() => {
    return listReceivedInvites()
        .then((list: ReceivedInviteDto[]) => setInvites(list.map((inv) => {
          const expiresInDays = Math.max(0, Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / 86400000));
          return {
            id: inv.invitationId,
            token: inv.token,
            teamName: inv.workspaceName,
            inviterName: inv.inviterName,
            role: roleToKorean(inv.role),
            time: new Date(inv.expiresAt).toLocaleDateString("ko-KR"),
            memberCount: inv.memberCount,
            repoCount: 0,
            myPendingReviews: 0,
            myOpenPRs: 0,
            myReviewedPRs: 0,
            myOpenIssues: 0,
            expiresInDays,
            expiresTime: new Date(inv.expiresAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          };
        })))
        .catch(() => setInvites([]));
  }, []);

  useEffect(() => {
    void loadReceivedInvites();
  }, [loadReceivedInvites]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void loadReceivedInvites();
      void loadOrgs();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadReceivedInvites, loadOrgs]);


  useEffect(() => {
    if (inviteSignal === 0) return;
    void loadReceivedInvites();
  }, [inviteSignal, loadReceivedInvites]);

  useEffect(() => {
    if (memberSignal === 0) return;
    void loadOrgs();
  }, [memberSignal, loadOrgs]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem("codedock-team-sort-order");
    if (saved === "name" || saved === "activity") return saved;
    return "latest";
  });

  const handleSortOrgs = (order: SortOrder) => {
    setSortOrder(order);
    localStorage.setItem("codedock-team-sort-order", order);
    setOrgs((prev) => {
      if (order === "name") return [...prev].sort((a, b) => a.name.localeCompare(b.name, "ko"));
      if (order === "activity") return [...prev].sort((a, b) => {
        if (!a.lastActivityAt && !b.lastActivityAt) return 0;
        if (!a.lastActivityAt) return 1;
        if (!b.lastActivityAt) return -1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });
      return [...prev].sort((a, b) => b.id - a.id);
    });
  };

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

  const handleDeleteOrg = async (orgId: number) => {
    const org = orgs.find((o) => o.id === orgId);
    if (!org?.workspaceId) return;
    try {
      await deleteWorkspace(Number(org.workspaceId));
      setOrgs((prev) => prev.filter((o) => o.id !== orgId));
      setSettingsOrg(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "팀 삭제에 실패했습니다.";
      alert(msg);
    }
  };

  const handleLeaveOrg = (orgId: number) => {
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
    setSettingsOrg(null);
  };

  const handleCreateTeam = async (name: string, selectedRepos: GithubRepo[], invitedMembers: TeamInviteDraft[]) => {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = (base || "team") + "-" + Date.now().toString(36);
    const newWorkspace = await createWorkspace({ name: name.trim(), slug });
    if (selectedRepos.length > 0) {
      const CHAT_REPOS_KEY = "codedock-workspace-repos-v1";
      const REPO_URLS_KEY = "codedock-repo-urls-v1";
      const wsId = String(newWorkspace.id);
      const raw = localStorage.getItem(CHAT_REPOS_KEY);
      const allRepos: { id: string; name: string; workspaceId?: string; channelId?: number; dbRepoId?: string }[] = raw ? JSON.parse(raw) : [];
      const newEntries: typeof allRepos = [];
      for (const r of selectedRepos) {
        let repoId = `repo-${r.owner}-${r.name}-${wsId}`;
        let channelId: number | undefined;
        let dbRepoId: string | undefined;
        try {
          const res = await connectWorkspaceRepository(newWorkspace.id, r.owner, r.name);
          repoId = `repo-${res.id}`;
          channelId = res.channelId ?? undefined;
          dbRepoId = String(res.id);
        } catch { /* 백엔드 실패 시 로컬 ID로 폴백 */ }
        if (!allRepos.some((e) => e.id === repoId)) {
          newEntries.push({ id: repoId, name: r.name, workspaceId: wsId, channelId, dbRepoId });
        }
      }
      localStorage.setItem(CHAT_REPOS_KEY, JSON.stringify([...allRepos, ...newEntries]));
      const urlsRaw = localStorage.getItem(REPO_URLS_KEY);
      const urls: Record<string, string> = urlsRaw ? JSON.parse(urlsRaw) : {};
      for (const entry of newEntries) {
        const src = selectedRepos.find((r) => entry.name === r.name);
        if (src) urls[entry.id] = src.htmlUrl;
      }
      localStorage.setItem(REPO_URLS_KEY, JSON.stringify(urls));
    }
    if (invitedMembers.length > 0) {
      const results = await Promise.allSettled(
          invitedMembers.map((m) => createInvite(newWorkspace.id, { email: m.email, role: "viewer", expiresInHours: 168 }))
      );
      const failed = results.filter(
          (r) => r.status === "rejected" && !(r.reason instanceof ApiClientError && r.reason.code === "C001")
      ).length;
      if (failed > 0) alert(`${failed}건의 초대 생성에 실패했습니다.`);
    }
    const list = await fetchMyWorkspaces();
    setOrgs(list.map(workspaceDtoToOrg));
  };

  const handleAcceptInvite = (invite: Invite) => {
    acceptInvite(invite.token)
        .then(async () => {
          setInvites((prev) => prev.filter((i) => i.id !== invite.id));
          const list = await fetchMyWorkspaces();
          setOrgs(list.map(workspaceDtoToOrg));
        })
        .catch((e) => alert(e instanceof Error ? e.message : "초대 수락에 실패했습니다."));
  };

  const handleRejectInvite = (id: number) => {
    const invite = invites.find((i) => i.id === id);
    if (!invite) return;
    if (!window.confirm(`"${invite.teamName}" 초대를 거절하시겠습니까?`)) return;
    rejectInvite(invite.token)
        .then(() => setInvites((prev) => prev.filter((i) => i.id !== id)))
        .catch((e) => alert(e instanceof Error ? e.message : "초대 거절에 실패했습니다."));
  };

  const [events, setEvents] = useState<WorkspaceEventDto[]>([]);
  const [eventRepositoryNamesByChannelId, setEventRepositoryNamesByChannelId] = useState<Record<number, string>>({});
  const [dashboardEventFilter, setDashboardEventFilter] = useState<DashboardEventFilter>("ALL");

  useEffect(() => {
    fetchMyEvents().then((data) => setEvents(data ?? [])).catch(() => setEvents([]));
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events]);

  const visibleEvents = useMemo(() => {
    return dashboardEventFilter === "ALL"
      ? sortedEvents
      : sortedEvents.filter((event) => event.type === dashboardEventFilter);
  }, [dashboardEventFilter, sortedEvents]);

  const dashboardEventCounts = useMemo(() => {
    return sortedEvents.reduce<Record<DashboardEventFilter, number>>((acc, event) => {
      acc.ALL += 1;
      acc[event.type] += 1;
      return acc;
    }, {
      ALL: 0,
      PR_CREATED: 0,
      ISSUE_CREATED: 0,
      PR_REVIEW: 0,
      MENTION: 0,
      REPLY: 0
    });
  }, [sortedEvents]);

  useEffect(() => {
    const workspaceIds = Array.from(new Set(events.map((event) => event.workspaceId)));
    if (workspaceIds.length === 0) {
      setEventRepositoryNamesByChannelId({});
      return;
    }

    let cancelled = false;
    Promise.allSettled(workspaceIds.map((workspaceId) => fetchWorkspaceRepositories(workspaceId)))
      .then((results) => {
        if (cancelled) return;

        const nextNamesByChannelId: Record<number, string> = {};
        results.forEach((result) => {
          if (result.status !== "fulfilled") return;
          result.value.forEach((repository) => {
            if (repository.channelId) {
              nextNamesByChannelId[repository.channelId] = repository.name;
            }
          });
        });
        setEventRepositoryNamesByChannelId(nextNamesByChannelId);
      });

    return () => {
      cancelled = true;
    };
  }, [events]);

  const getEventMeta = (type: EventType) => {
    switch (type) {
      case "PR_CREATED":  return { label: "PR 올라옴",   icon: GitPullRequest,  color: "var(--neon-cyan)" };
      case "ISSUE_CREATED": return { label: "이슈 올라옴", icon: CircleDot,     color: "#FFD93D" };
      case "PR_REVIEW":   return { label: "리뷰 받음",   icon: MessageSquare,   color: "var(--matrix-green)" };
      case "MENTION":     return { label: "멘션됨",      icon: AtSign,          color: "#C084FC" };
      case "REPLY":       return { label: "답장 받음",   icon: CornerDownRight, color: "var(--soft-mint)" };
    }
  };

  const formatRelativeTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  const normalizeEventEmoji = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return "";
    return REACTION_KEY_TO_EMOJI[trimmed] ?? trimmed;
  };

  const replaceReactionKeys = (content: string) => {
    return content.replace(REACTION_KEY_PATTERN, (key) => REACTION_KEY_TO_EMOJI[key] ?? key);
  };

  const getEventEmoji = (event: WorkspaceEventDto) => {
    return normalizeEventEmoji(event.emoji)
      || normalizeEventEmoji(event.reactionEmoji)
      || normalizeEventEmoji(event.emojiKey)
      || normalizeEventEmoji(event.reactionKey)
      || normalizeEventEmoji(event.metadata?.emoji)
      || normalizeEventEmoji(event.metadata?.reactionEmoji)
      || normalizeEventEmoji(event.metadata?.emojiKey)
      || normalizeEventEmoji(event.metadata?.reactionKey);
  };

  const formatEventContent = (event: WorkspaceEventDto) => {
    const content = event.content?.trim() ?? "";
    const emoji = getEventEmoji(event).trim();
    const contentWithReactionKeys = replaceReactionKeys(content);
    const contentIsReactionKey = content !== contentWithReactionKeys && Object.prototype.hasOwnProperty.call(REACTION_KEY_TO_EMOJI, content);
    const hasBrokenEmojiPlaceholder = /(?:\?\s*){2,}/.test(content);

    if (!content) {
      return emoji ? `${emoji} 이모지 반응` : "";
    }

    if (contentIsReactionKey) {
      return `${contentWithReactionKeys} 이모지 반응`;
    }

    if (!hasBrokenEmojiPlaceholder) {
      return contentWithReactionKeys;
    }

    // DB에는 채팅과 같은 reaction key가 저장될 수 있으니 key가 있으면 채팅 이모지 맵으로 우선 복원한다.
    return content.replace(/(?:\?\s*){2,}/g, emoji || "이모지 반응");
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mx-auto w-[min(1600px,calc(100vw-24px))] py-[clamp(28px,4vw,48px)] pb-20">
        <div className="mb-8">
          <h1
            className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]"
            style={{ fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 950, color: "var(--white)", textShadow: "0 0 22px rgba(var(--codedock-primary-rgb), 0.18)" }}
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
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
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
          className="mb-9 rounded-[30px] px-[clamp(20px,3vw,36px)] py-[clamp(22px,3vw,36px)]"
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="m-0 leading-none tracking-[-0.075em]" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}>
              내 팀
              {!orgsLoading && (
                <span style={{ fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 950, color: "var(--neon-cyan)", marginLeft: "0.35em" }}>
                  {orgs.length}
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <TeamSortDropdown
                value={sortOrder}
                onChange={handleSortOrgs}
              />
              <button
                onClick={() => setShowInvitesModal(true)}
                className="flex items-center gap-2 rounded-xl px-5 py-3 tracking-tight transition-all hover:brightness-110"
                style={{
                  background: "transparent",
                  border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.5)",
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
                    style={{ background: "var(--neon-cyan)", color: "#021014", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}
                  >
                    {invites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl border-0 px-5 py-3 tracking-tight transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                  color: "#021014",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(var(--codedock-primary-rgb), 0.3)",
                }}
              >
                <Plus size={18} />
                팀 생성하기
              </button>
            </div>
          </div>

          {orgsLoading ? (
            <div className="flex items-center justify-center gap-3 py-12" style={{ color: "var(--muted)" }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontSize: "15px", fontWeight: 700 }}>팀 목록 불러오는 중…</span>
            </div>
          ) : orgs.length === 0 ? (
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
          className="rounded-[30px] px-[clamp(20px,3vw,36px)] py-[clamp(22px,3vw,36px)]"
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <h2 className="m-0 mb-6 leading-none tracking-[-0.075em]" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 950 }}>
            주요 이벤트
          </h2>
          {events.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {DASHBOARD_EVENT_FILTERS.map((filter) => {
                const selected = dashboardEventFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setDashboardEventFilter(filter.value)}
                    className="rounded-full border-0 px-3 py-2 tracking-tight transition-all hover:brightness-110"
                    style={{
                      background: selected
                        ? "rgba(var(--codedock-primary-rgb), 0.18)"
                        : "rgba(255,255,255,0.045)",
                      border: selected
                        ? "1px solid rgba(var(--codedock-primary-rgb), 0.36)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: selected ? "var(--neon-cyan)" : "var(--muted)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 900
                    }}
                  >
                    {filter.label} {dashboardEventCounts[filter.value]}
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid gap-3">
            {events.length === 0 ? (
              <p className="m-0 py-6 text-center tracking-tight" style={{ fontSize: "14px", fontWeight: 700, color: "var(--muted)" }}>
                최근 이벤트가 없습니다.
              </p>
            ) : visibleEvents.length === 0 ? (
              <p className="m-0 py-6 text-center tracking-tight" style={{ fontSize: "14px", fontWeight: 700, color: "var(--muted)" }}>
                선택한 필터에 해당하는 이벤트가 없습니다.
              </p>
            ) : (
              <div
                className="grid gap-3 overflow-y-auto pr-1"
                style={{
                  maxHeight: `${DASHBOARD_EVENT_SCROLL_MAX_HEIGHT}px`,
                  scrollbarWidth: "thin"
                }}
              >
                {visibleEvents.map((event) => {
                  const { label, icon: Icon, color } = getEventMeta(event.type);
                  const workspaceName = orgs.find((o) => o.id === event.workspaceId)?.name ?? "";
                  const repositoryName = event.repositoryName ?? (
                    event.channelId ? eventRepositoryNamesByChannelId[event.channelId] : undefined
                  );
                  const eventContextLabels = [
                    workspaceName,
                    repositoryName ? `repo: ${repositoryName}` : "",
                    event.channelId ? `channel #${event.channelId}` : "",
                    event.threadId ? `thread #${event.threadId}` : ""
                  ].filter(Boolean);

                  return (
                    <div
                      key={event.id}
                      className="px-5 py-4 rounded-2xl cursor-pointer transition-all hover:brightness-110"
                      style={{ background: "rgba(5, 11, 20, 0.42)", border: "1px solid rgba(32, 227, 255, 0.10)" }}
                      onClick={() => navigate("/chat", { state: { pendingEvent: event } })}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5">
                          <Icon size={18} style={{ color }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="tracking-tight" style={{ fontSize: "15px", fontWeight: 900, color: "var(--white)" }}>
                              <span style={{ color: "var(--matrix-green)" }}>{event.actorName}</span>
                              {"  "}
                              <span style={{ color, fontSize: "13px", fontWeight: 800 }}>{label}</span>
                            </span>
                            {eventContextLabels.map((contextLabel) => (
                              <span
                                key={contextLabel}
                                className="rounded-full px-2 py-0.5 tracking-tight"
                                style={{
                                  background: "rgba(var(--codedock-primary-rgb), 0.08)",
                                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color: "var(--muted)"
                                }}
                              >
                                {contextLabel}
                              </span>
                            ))}
                          </div>
                          <p className="m-0 tracking-tight truncate" style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                            {formatEventContent(event)}
                          </p>
                        </div>
                        <span className="flex-shrink-0 tracking-tight" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {formatRelativeTime(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
