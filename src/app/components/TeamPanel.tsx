import {
  ArrowRight,
  Clock3,
  GitCommitHorizontal,
  GitPullRequest,
  Github,
  Hash,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

interface TeamPanelProps {
  workspaceId: string;
  currentUserId: string;
  currentUserOnline: boolean;   // true when presence is not 'offline'
  onInvite: () => void;
  onOpenChannel?: (channelId: string) => void;
}

interface TeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  email: string;
  github: string;
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

const teamRooms: TeamRoom[] = [
  {
    id: "general",
    name: "일반 채널",
    description: "팀 전체 공지와 일상적인 협업 대화",
    lastMessage: "이번 주 스프린트 계획 공유드립니다.",
    updatedAt: "10분 전",
    unread: 3,
    online: 3,
    accent: "#20E3FF",
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
    accent: "#39FF88",
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
    statusColor: "#39FF88",
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
    statusColor: "#39FF88",
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
    statusColor: "#39FF88",
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
function ensureSeeded() {
  if (localStorage.getItem(WORKSPACE_TEAMS_KEY) !== null) return;
  const [jaejun, jinpil, junwoo, jinhyun, hyun] = ALL_MEMBERS;
  saveAllTeams({
    "workspace-1": [junwoo, jaejun, jinpil, jinhyun],   // exclude 안현
    "workspace-2": [junwoo, jaejun, jinhyun, hyun],      // exclude 김진필
    "workspace-3": [junwoo, jinpil, jinhyun, hyun],      // exclude 김재준
  });
}

export function TeamPanel({ workspaceId, currentUserId, currentUserOnline, onInvite, onOpenChannel }: TeamPanelProps) {
  ensureSeeded();   // no-op after first run

  const [members, setMembers] = useState<TeamMember[]>(() => {
    const all = loadAllTeams();
    return all[workspaceId] ?? [ALL_MEMBERS[2]];  // fallback: 김준우 only
  });
  const [activeRoomId, setActiveRoomId] = useState(teamRooms[1].id);
  const [notice, setNotice] = useState("팀원 역할 수정 및 삭제가 가능합니다.");
  const [confirmTarget, setConfirmTarget] = useState<TeamMember | null>(null);

  useEffect(() => {
    const all = loadAllTeams();
    setMembers(all[workspaceId] ?? [ALL_MEMBERS[2]]);
  }, [workspaceId]);
  const activeRoom = teamRooms.find((room) => room.id === activeRoomId) ?? teamRooms[0];
  // Override the current user's stored `online` field with the live presence prop
  const onlineCount = members.filter((member) =>
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

  const handleDeleteClick = (member: TeamMember) => {
    if (member.protected) {
      setNotice("팀 리드는 현재 화면에서 삭제할 수 없습니다.");
      return;
    }
    setConfirmTarget(member);
  };

  const handleConfirmDelete = () => {
    if (!confirmTarget) return;
    const next = members.filter((m) => m.id !== confirmTarget.id);
    setMembers(next);
    persistMembers(next);
    setNotice(`${confirmTarget.name} 팀원을 추방했습니다.`);
    setConfirmTarget(null);
  };

  return (
    <div
      className="codedock-scrollbar-hidden h-full overflow-y-auto px-7 py-7"
      style={{
        background:
          "radial-gradient(circle at 12% 0%, rgba(32, 227, 255, 0.18), transparent 28%), radial-gradient(circle at 88% 12%, rgba(57, 255, 136, 0.12), transparent 26%), linear-gradient(135deg, rgba(5, 11, 20, 0.98), rgba(11, 22, 40, 0.94) 54%, rgba(6, 78, 92, 0.60))"
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="m-0 mb-2 font-mono uppercase tracking-[0.16em]" style={{ color: "var(--neon-cyan)", fontSize: 11, fontWeight: 950 }}>
            Team Workspace
          </p>
          <h2 className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>
            팀
          </h2>
          <p className="m-0 mt-2 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800 }}>
            {members.length}명 · {onlineCount}명 접속 중
          </p>
        </div>

        <button
          type="button"
          onClick={onInvite}
          className="inline-flex items-center gap-2 rounded-2xl border-0 px-4 py-3 tracking-tight transition-all hover:translate-y-[-1px]"
          style={{
            background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))",
            color: "#021014",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 950,
            boxShadow: "0 18px 38px rgba(32, 227, 255, 0.24)"
          }}
        >
          <UserPlus size={18} />
          팀원 추가
        </button>
      </div>

      <div
        className="mb-5 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(32, 227, 255, 0.10)",
          border: "1px solid rgba(32, 227, 255, 0.20)",
          color: "var(--soft-mint)",
          fontSize: 13,
          fontWeight: 850
        }}
      >
        {notice}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.email}
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(11, 22, 40, 0.72)",
              color: "var(--white)",
              border: "1px solid rgba(32, 227, 255, 0.16)",
              boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(14px) saturate(150%)"
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{
                    background: "linear-gradient(135deg, var(--neon-cyan), #8b7cf6)",
                    color: "#021014",
                    fontSize: 16,
                    fontWeight: 950
                  }}>
                    {member.initials}
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

              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDeleteClick(member)}
                  disabled={member.protected}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-105"
                  style={{
                    background: member.protected ? "rgba(234, 247, 255, 0.05)" : "rgba(239, 68, 68, 0.10)",
                    border: member.protected ? "1px solid rgba(234, 247, 255, 0.08)" : "1px solid rgba(239, 68, 68, 0.24)",
                    color: member.protected ? "var(--muted)" : "#FF8FA3",
                    cursor: member.protected ? "not-allowed" : "pointer"
                  }}
                  title={member.protected ? "팀 리드는 삭제할 수 없습니다" : `${member.name} 삭제`}
                  aria-label={`${member.name} 삭제`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <label className="mb-4 block tracking-tight" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 900 }}>
              역할
              <select
                value={member.role}
                onChange={(event) => handleRoleChange(member.id, event.target.value)}
                className="mt-1 block w-full rounded-xl px-3 py-2 outline-none"
                style={{
                  background: "rgba(5, 11, 20, 0.58)",
                  border: "1px solid rgba(32, 227, 255, 0.16)",
                  color: "var(--white)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 900
                }}
                aria-label={`${member.name} 역할 변경`}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-5 grid gap-2">
              <MemberContact icon={<Mail size={14} />} text={member.email} />
              <MemberContact icon={<Github size={14} />} text={member.github} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <MemberStat value={member.commits} label="Commits" />
              <MemberStat value={member.prs} label="PRs" />
              <MemberStat value={member.reviews} label="Reviews" />
            </div>
          </article>
        ))}
      </div>

      <section
        className="mt-5 rounded-2xl px-6 py-5"
        style={{
          background: "rgba(11, 22, 40, 0.72)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
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
                      boxShadow: "0 0 14px rgba(32, 227, 255, 0.34)"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(8px)" }}
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-[24px] px-8 py-8"
            style={{
              background: "linear-gradient(135deg, rgba(11, 22, 40, 0.98), rgba(5, 11, 20, 0.98))",
              border: "1px solid rgba(255, 107, 107, 0.35)",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.55), 0 0 40px rgba(255, 107, 107, 0.10)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{
              background: "rgba(255, 107, 107, 0.12)",
              border: "1px solid rgba(255, 107, 107, 0.30)"
            }}>
              <Trash2 size={26} style={{ color: "#FF6B6B" }} />
            </div>

            <h3 className="m-0 mb-2 tracking-tight" style={{ color: "var(--white)", fontSize: 20, fontWeight: 950 }}>
              정말 추방하시겠어요?
            </h3>
            <p className="m-0 mb-7 tracking-tight" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 800, lineHeight: 1.6 }}>
              <span style={{ color: "var(--white)", fontWeight: 950 }}>{confirmTarget.name}</span> 팀원을 워크스페이스에서
              추방합니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(234, 247, 255, 0.07)",
                  border: "1px solid rgba(234, 247, 255, 0.14)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 900
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #FF6B6B, #cc3333)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 950,
                  boxShadow: "0 0 24px rgba(255, 107, 107, 0.30)"
                }}
              >
                추방하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberContact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
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
      <p className="m-0 mt-0.5 tracking-tight" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
        {label}
      </p>
    </div>
  );
}
