import {
  Check,
  ChevronDown,
  GitCommitHorizontal,
  GitPullRequest,
  Github,
  Hash,
  Mail,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchWithAuth } from "../api/fetchWithAuth";
import type { WorkspaceMember } from "../api/workspace";

interface UserProfile {
  id: number;
  avatarUrl?: string | null;
  githubUsername?: string | null;
}

interface TeamPanelProps {
  workspaceId: string;
  workspaceApiId: number;
  currentUserId: string;
  currentUserOnline: boolean;   // true when presence is not 'offline'
  onOpenChannel?: (channelId: string) => void;
  presenceOverrides?: Record<string, string>; // memberId → presence
}

interface TeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  email: string;
  github: string;
  avatarUrl?: string;
  online: boolean;
  statusColor: string;
  commits: number;
  prs: number;
  reviews: number;
  protected?: boolean;
}

interface TeamRoom {
  id: string;
  name: string;
  description: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  online: number;
  accent: string;
  icon: LucideIcon;
}

const roleOptions = [
  "Tech Lead",
  "Backend Developer",
  "Frontend Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "Designer",
  "Viewer"
];

const roleMeta: Record<string, { color: string; bg: string; border: string }> = {
  "Tech Lead": { color: "var(--neon-cyan)", bg: "rgba(var(--codedock-primary-rgb), 0.12)", border: "rgba(var(--codedock-primary-rgb), 0.34)" },
  "Backend Developer": { color: "var(--matrix-green)", bg: "rgba(var(--codedock-secondary-rgb), 0.11)", border: "rgba(var(--codedock-secondary-rgb), 0.30)" },
  "Frontend Developer": { color: "#B58CFF", bg: "rgba(181, 140, 255, 0.12)", border: "rgba(181, 140, 255, 0.30)" },
  "DevOps Engineer": { color: "#FFD166", bg: "rgba(255, 209, 102, 0.12)", border: "rgba(255, 209, 102, 0.30)" },
  "QA Engineer": { color: "#7DD3FC", bg: "rgba(125, 211, 252, 0.12)", border: "rgba(125, 211, 252, 0.30)" },
  "Product Manager": { color: "#F0ABFC", bg: "rgba(240, 171, 252, 0.12)", border: "rgba(240, 171, 252, 0.30)" },
  "Designer": { color: "#FDA4AF", bg: "rgba(253, 164, 175, 0.12)", border: "rgba(253, 164, 175, 0.30)" },
  "Viewer": { color: "#A8B3C7", bg: "rgba(168, 179, 199, 0.10)", border: "rgba(168, 179, 199, 0.24)" }
};

function getRoleMeta(role: string) {
  return roleMeta[role] ?? { color: "var(--neon-cyan)", bg: "rgba(var(--codedock-primary-rgb), 0.10)", border: "rgba(var(--codedock-primary-rgb), 0.24)" };
}

const teamRooms: TeamRoom[] = [
  {
    id: "general",
    name: "일반 채널",
    description: "팀 전체 공지와 일상적인 협업 대화",
    lastMessage: "이번 주 스프린트 계획 공유드립니다.",
    updatedAt: "10분 전",
    unread: 3,
    online: 3,
    accent: "var(--neon-cyan)",
    icon: Hash
  },
  {
    id: "review-room",
    name: "리뷰 룸",
    description: "PR 리뷰, 보안 피드백, 승인 논의",
    lastMessage: "rate limit 빠진 부분만 체크리스트로 빼둘게요.",
    updatedAt: "18분 전",
    unread: 2,
    online: 2,
    accent: "var(--matrix-green)",
    icon: GitPullRequest
  },
  {
    id: "frontend-chat",
    name: "프론트엔드",
    description: "화면, 인터랙션, UI 품질 확인",
    lastMessage: "로그인 페이지 애니메이션 확인 부탁드려요.",
    updatedAt: "32분 전",
    unread: 1,
    online: 2,
    accent: "#B58CFF",
    icon: MessageSquareText
  },
  {
    id: "backend-chat",
    name: "백엔드",
    description: "API, 인증, 데이터 모델 논의",
    lastMessage: "회원 탈퇴와 워크스페이스 삭제 API 명세 추가 예정입니다.",
    updatedAt: "45분 전",
    unread: 1,
    online: 1,
    accent: "#FFD166",
    icon: ShieldCheck
  }
];

const roomPreviewMessages = [
  { author: "김재준", text: "PR #104는 AI 피드백 먼저 보고 결정하겠습니다.", time: "11:24" },
  { author: "CodeDock", text: "보안 위험 3건과 추천 diff를 정리했어요.", time: "11:25" },
  { author: "김준우", text: "리뷰 룸에서 rate limit 기준만 확정할게요.", time: "11:28" }
];

const ALL_MEMBERS: TeamMember[] = [
  {
    id: "jaejun",
    initials: "JJ",
    name: "김재준",
    role: "Tech Lead",
    email: "jaejun@codedock.dev",
    github: "kimjaejun",
    online: true,
    statusColor: "var(--matrix-green)",
    commits: 247,
    prs: 42,
    reviews: 68,
    protected: true
  },
  {
    id: "jinpil",
    initials: "JP",
    name: "김진필",
    role: "Backend Developer",
    email: "jinpil@codedock.dev",
    github: "kimjinpil",
    online: true,
    statusColor: "var(--matrix-green)",
    commits: 189,
    prs: 35,
    reviews: 52
  },
  {
    id: "junwoo",
    initials: "JW",
    name: "김준우",
    role: "Frontend Developer",
    email: "junwoo@codedock.dev",
    github: "kimjunwoo",
    online: true,
    statusColor: "var(--matrix-green)",
    commits: 156,
    prs: 28,
    reviews: 45
  },
  {
    id: "jinhyun",
    initials: "JH",
    name: "김진현",
    role: "DevOps Engineer",
    email: "jinhyun@codedock.dev",
    github: "kimjinhyun",
    online: false,
    statusColor: "#8B94A7",
    commits: 98,
    prs: 18,
    reviews: 31
  },
  {
    id: "hyun",
    initials: "AH",
    name: "안현",
    role: "QA Engineer",
    email: "hyun@codedock.dev",
    github: "ahnhyun",
    online: false,
    statusColor: "#8B94A7",
    commits: 45,
    prs: 12,
    reviews: 87
  }
];

const WORKSPACE_TEAMS_KEY = "codedock-workspace-teams-v1";

function loadAllTeams(): Record<string, TeamMember[]> {
  try { return JSON.parse(localStorage.getItem(WORKSPACE_TEAMS_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveAllTeams(all: Record<string, TeamMember[]>) {
  localStorage.setItem(WORKSPACE_TEAMS_KEY, JSON.stringify(all));
}

// Idempotent: seeds only when the key is completely absent (first-ever load)
export function ensureSeeded() {
  if (localStorage.getItem(WORKSPACE_TEAMS_KEY) !== null) return;
  const [jaejun, jinpil, junwoo, jinhyun, hyun] = ALL_MEMBERS;
  saveAllTeams({
    "workspace-1": [jaejun, jinpil, jinhyun, hyun],       // exclude 김준우
    "workspace-2": [jaejun, junwoo, jinhyun, hyun],      // exclude 김진필
    "workspace-3": [jaejun, jinpil, junwoo, hyun],       // exclude 김진현
    "workspace-4": [jaejun, jinpil, hyun, jinhyun],      // exclude 김준우
  });
}

function nameToInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Korean names: take first 2 chars; others: first letter of each word up to 2
  if (/[ㄱ-힝]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function presenceToColor(p: string): string {
  if (p === 'active') return 'var(--matrix-green)';
  if (p === 'away') return '#F59E0B';
  if (p === 'busy') return '#EF4444';
  return '#8B94A7';
}

export function TeamPanel({ workspaceId, workspaceApiId, currentUserId, currentUserOnline, onOpenChannel, presenceOverrides = {} }: TeamPanelProps) {
  ensureSeeded();   // no-op after first run

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(teamRooms[1].id);
  const [notice, setNotice] = useState("팀원 역할 수정이 가능합니다.");

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchWithAuth<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceApiId}/members`)
      .then(async (apiMembers) => {
        if (cancelled) return;
        if (!apiMembers || apiMembers.length === 0) return;

        const avatarMap = await Promise.all(
          apiMembers.map((m) =>
            fetchWithAuth<UserProfile>(`/api/v1/users/${m.userId}`)
              .then((u) => {
                const avatarUrl = u?.avatarUrl || (u?.githubUsername ? `https://github.com/${u.githubUsername}.png` : "");
                return { userId: m.userId, avatarUrl };
              })
              .catch(() => ({ userId: m.userId, avatarUrl: "" }))
          )
        ).then((results) => Object.fromEntries(results.map((r) => [r.userId, r.avatarUrl])));

        if (cancelled) return;
        const mapped: TeamMember[] = apiMembers.map((m) => {
          const presence = m.presence ?? "active";
          const online = presence !== "offline";
          const statusColor = presence === "active" ? "var(--matrix-green)"
            : presence === "away" ? "#F59E0B"
            : presence === "busy" ? "#EF4444"
            : "#8B94A7";
          return {
            id: String(m.memberId),
            initials: nameToInitials(m.username),
            name: m.username,
            role: m.role || "Member",
            email: m.email ?? "",
            github: "",
            avatarUrl: avatarMap[m.userId] ?? "",
            online,
            statusColor,
            commits: 0,
            prs: 0,
            reviews: 0,
          };
        });
        setMembers(mapped);
      })
      .catch(() => {});
    load();
    return () => { cancelled = true; };
  }, [workspaceApiId]);
  const activeRoom = teamRooms.find((room) => room.id === activeRoomId) ?? teamRooms[0];

  // Apply real-time presence overrides from WebSocket
  const effectiveMembers = useMemo(() => members.map((m) => {
    const override = presenceOverrides[m.id];
    if (!override) return m;
    return { ...m, online: override !== 'offline', statusColor: presenceToColor(override) };
  }), [members, presenceOverrides]);

  const onlineCount = effectiveMembers.filter((member) =>
    member.id === currentUserId ? currentUserOnline : member.online
  ).length;
  const activityItems = useMemo(() => {
    const commits = members.reduce((sum, member) => sum + member.commits, 0);
    const prs = members.reduce((sum, member) => sum + member.prs, 0);
    const reviews = members.reduce((sum, member) => sum + member.reviews, 0);

    return [
      { label: "커밋", value: commits, icon: GitCommitHorizontal, progress: Math.min(100, Math.round(commits / 10)) },
      { label: "PR", value: prs, icon: GitPullRequest, progress: Math.min(100, Math.round(prs / 2)) },
      { label: "코드 리뷰", value: reviews, icon: MessageSquareText, progress: Math.min(100, Math.round(reviews / 3)) }
    ];
  }, [members]);

  const persistMembers = (next: TeamMember[]) => {
    const all = loadAllTeams();
    saveAllTeams({ ...all, [workspaceId]: next });
  };

  const handleOpenRoom = (room: TeamRoom) => {
    setActiveRoomId(room.id);
    setNotice(`${room.name} 채팅방으로 이동합니다.`);
    onOpenChannel?.(room.id);
  };

  const handleRoleChange = (memberId: string, nextRole: string) => {
    const target = members.find((m) => m.id === memberId);
    const next = members.map((m) => m.id === memberId ? { ...m, role: nextRole } : m);
    setMembers(next);
    persistMembers(next);
    setNotice(`${target?.name ?? "팀원"} 역할을 ${nextRole}(으)로 변경했습니다.`);
  };

  return (
    <div
      className="codedock-scrollbar-hidden h-full overflow-y-auto px-7 py-7"
      style={{
        background:
          "radial-gradient(circle at 12% 0%, rgba(var(--codedock-primary-rgb), 0.18), transparent 28%), radial-gradient(circle at 88% 12%, rgba(var(--codedock-secondary-rgb), 0.12), transparent 26%), linear-gradient(135deg, rgba(5, 11, 20, 0.98), rgba(11, 22, 40, 0.94) 54%, rgba(6, 78, 92, 0.60))"
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="m-0 mb-2 font-mono uppercase tracking-[0.16em]" style={{ color: "var(--neon-cyan)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
            Team Workspace
          </p>
          <h2 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>
            팀
          </h2>
          <p className="m-0 mt-2 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800 }}>
            {effectiveMembers.length}명 · {onlineCount}명 접속 중
          </p>
        </div>

      </div>

      <div
        className="mb-5 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(var(--codedock-primary-rgb), 0.10)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
          color: "var(--soft-mint)",
          fontSize: 13,
          fontWeight: 850
        }}
      >
        {notice}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {effectiveMembers.map((member) => (
          <article
            key={member.email}
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(11, 22, 40, 0.72)",
              color: "var(--white)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
              boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(14px) saturate(150%)"
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{
                    background: "linear-gradient(135deg, var(--neon-cyan), #8b7cf6)",
                    color: "#021014",
                    fontSize: 16,
                    fontWeight: 950
                  }}>
                    {member.avatarUrl
                      ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                      : member.initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full" style={{
                    background: member.statusColor,
                    border: "2px solid #0B1628"
                  }} />
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 truncate tracking-tight" style={{ color: "var(--white)", fontSize: 16, fontWeight: 950 }}>
                    {member.name}
                  </h3>
                  <p className="m-0 mt-0.5 truncate tracking-tight" style={{ color: "var(--muted)", fontSize: 13, fontWeight: 800 }}>
                    {member.role}
                  </p>
                </div>
              </div>

            </div>

            <label className="mb-4 block tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
              역할
              <RoleDropdown
                value={member.role}
                onChange={(role) => handleRoleChange(member.id, role)}
                aria-label={`${member.name} 역할 변경`}
              />
            </label>

            {(member.email || member.github) && (
              <div className="mb-5 grid gap-2">
                {member.email && <MemberContact icon={<Mail size={14} />} text={member.email} />}
                {member.github && <MemberContact icon={<Github size={14} />} text={member.github} />}
              </div>
            )}

            {(member.commits > 0 || member.prs > 0 || member.reviews > 0) && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <MemberStat value={member.commits} label="커밋" />
                <MemberStat value={member.prs} label="PR" />
                <MemberStat value={member.reviews} label="리뷰" />
              </div>
            )}
          </article>
        ))}
      </div>

      <section
        className="mt-5 rounded-2xl px-6 py-5"
        style={{
          background: "rgba(11, 22, 40, 0.72)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.05)"
        }}
      >
        <h3 className="m-0 mb-8 tracking-tight" style={{ color: "var(--white)", fontSize: 17, fontWeight: 950 }}>
          팀 활동
        </h3>

        <div className="grid gap-4">
          {activityItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color: "var(--neon-cyan)" }} />
                    <span className="tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 900 }}>
                      {item.label}
                    </span>
                  </div>
                  <span className="tracking-tight" style={{ color: "var(--white)", fontSize: 14, fontWeight: 950 }}>
                    {item.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(234, 247, 255, 0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.progress}%`,
                      background: "linear-gradient(90deg, var(--neon-cyan), var(--matrix-green), #B58CFF)",
                      boxShadow: "0 0 14px rgba(var(--codedock-primary-rgb), 0.34)"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function RoleDropdown({
  value,
  onChange,
  "aria-label": ariaLabel
}: {
  value: string;
  onChange: (role: string) => void;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const meta = getRoleMeta(value);

  const openDropdown = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setDropPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target)
        || menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("scroll", closeOnScroll, true);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        className="mt-1 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 tracking-tight transition-all"
        style={{
          background: open
            ? "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.14), rgba(var(--codedock-secondary-rgb), 0.06)), rgba(5, 11, 20, 0.76)"
            : "rgba(5, 11, 20, 0.62)",
          border: open
            ? "1px solid rgba(var(--codedock-primary-rgb), 0.44)"
            : "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
          color: "var(--white)",
          cursor: "pointer",
          boxShadow: open
            ? "0 14px 34px rgba(0, 0, 0, 0.34), 0 0 24px rgba(var(--codedock-primary-rgb), 0.10), inset 0 1px 0 rgba(255,255,255,0.08)"
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
          outline: "none"
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{
              background: meta.color,
              boxShadow: `0 0 12px ${meta.color}`
            }}
          />
          <span
            className="truncate"
            style={{
              color: meta.color,
              fontSize: 13,
              fontWeight: 950
            }}
          >
            {value}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{
            color: meta.color,
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
            width: Math.max(dropPos.width, 224),
            background:
              "linear-gradient(145deg, rgba(11, 22, 40, 0.98), rgba(5, 11, 20, 0.96))",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
            boxShadow:
              "0 24px 70px rgba(0, 0, 0, 0.56), 0 0 0 1px rgba(255,255,255,0.04), 0 0 36px rgba(var(--codedock-primary-rgb), 0.10)",
            backdropFilter: "blur(18px) saturate(170%)"
          }}
        >
          {roleOptions.map((role) => {
            const optionMeta = getRoleMeta(role);
            const selected = role === value;
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  onChange(role);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight transition-all"
                style={{
                  background: selected ? optionMeta.bg : "transparent",
                  color: selected ? "var(--white)" : "var(--muted)",
                  cursor: "pointer",
                  border: selected ? `1px solid ${optionMeta.border}` : "1px solid transparent"
                }}
                onMouseEnter={(event) => {
                  if (!selected) {
                    event.currentTarget.style.background = "rgba(234, 247, 255, 0.055)";
                    event.currentTarget.style.border = "1px solid rgba(var(--codedock-primary-rgb), 0.12)";
                  }
                }}
                onMouseLeave={(event) => {
                  if (!selected) {
                    event.currentTarget.style.background = "transparent";
                    event.currentTarget.style.border = "1px solid transparent";
                  }
                }}
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background: optionMeta.color,
                    boxShadow: selected ? `0 0 12px ${optionMeta.color}` : "none"
                  }}
                />
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: selected ? 950 : 850
                  }}
                >
                  {role}
                </span>
                {selected && <Check size={15} style={{ color: optionMeta.color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

function MemberContact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );
}

function MemberStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 18, fontWeight: 950 }}>
        {value}
      </p>
      <p className="m-0 mt-0.5 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
        {label}
      </p>
    </div>
  );
}
