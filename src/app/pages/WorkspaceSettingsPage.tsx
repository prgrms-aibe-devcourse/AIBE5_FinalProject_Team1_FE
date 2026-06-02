import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Camera,
  Check,
  Crown,
  Github,
  Globe,
  LogOut,
  MessageSquare,
  Pencil,
  Plug,
  ShieldCheck,
  Trash2,
  Trash,
  UserRound,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

type WorkspaceRole = "owner" | "admin" | "member";

interface WorkspaceMember {
  id: string;
  name: string;
  role: WorkspaceRole;
}

interface WorkspaceRepo {
  id: string;
  name: string;
  connected: boolean;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  role: WorkspaceRole;
  memberCount: number;
  repoCount: number;
  members: WorkspaceMember[];
  repos: WorkspaceRepo[];
  webhookEnabled: boolean;
  slack: boolean;
  discord: boolean;
}

interface ThemeColors {
  primary: string;
  primaryHex: string;
  secondary: string;
}

const ROLE_CONFIG: Record<WorkspaceRole, { label: string; color: string; icon: LucideIcon }> = {
  owner: { label: "소유자", color: "#FFD166", icon: Crown },
  admin: { label: "관리자", color: "#20E3FF", icon: ShieldCheck },
  member: { label: "멤버", color: "#94A3B8", icon: UserRound },
};

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: "codedock",
    name: "CodeDock Team",
    slug: "codedock-team",
    description: "PR 리뷰, 보안 점검, 문서화를 한 흐름으로 모으는 메인 워크스페이스입니다.",
    avatarUrl: "",
    role: "owner",
    memberCount: 6,
    repoCount: 4,
    members: [
      { id: "u-jinpil", name: "김진필", role: "admin" },
      { id: "u-junwoo", name: "김준우", role: "member" },
      { id: "u-anhyeon", name: "안현", role: "member" },
    ],
    repos: [
      { id: "r-fe", name: "codedock/frontend", connected: true },
      { id: "r-be", name: "codedock/backend", connected: true },
      { id: "r-infra", name: "codedock/infra", connected: false },
    ],
    webhookEnabled: true,
    slack: true,
    discord: false,
  },
  {
    id: "secureflow",
    name: "SecureFlow",
    slug: "secureflow",
    description: "보안 리뷰 자동화 실험용 워크스페이스.",
    avatarUrl: "",
    role: "admin",
    memberCount: 4,
    repoCount: 2,
    members: [
      { id: "u-sehun", name: "박세훈", role: "owner" },
      { id: "u-jieun", name: "이지은", role: "member" },
    ],
    repos: [
      { id: "r-sf-api", name: "secureflow/api", connected: true },
      { id: "r-sf-scan", name: "secureflow/scanner", connected: false },
    ],
    webhookEnabled: false,
    slack: false,
    discord: true,
  },
  {
    id: "aichat",
    name: "AI Chat Squad",
    slug: "ai-chat-squad",
    description: "AI 채팅 기능 협업 공간.",
    avatarUrl: "",
    role: "member",
    memberCount: 8,
    repoCount: 3,
    members: [{ id: "u-mina", name: "정미나", role: "owner" }],
    repos: [
      { id: "r-ai-web", name: "aichat/web", connected: true },
      { id: "r-ai-core", name: "aichat/core", connected: true },
    ],
    webhookEnabled: true,
    slack: true,
    discord: true,
  },
];

export function WorkspaceSettingsPage() {
  const { colors } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_WORKSPACES[0]?.id ?? "");
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "warn" } | null>(null);

  const selected = workspaces.find((workspace) => workspace.id === selectedId) ?? null;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string, tone: "ok" | "warn" = "ok") => setToast({ message, tone });

  const handleUpdate = (id: string, partial: Partial<Workspace>, message?: string) => {
    setWorkspaces((current) => current.map((workspace) => (workspace.id === id ? { ...workspace, ...partial } : workspace)));
    if (message) notify(message);
  };

  const handleTransfer = (id: string, memberId: string) => {
    let targetName = "";
    setWorkspaces((current) =>
      current.map((workspace) => {
        if (workspace.id !== id) return workspace;
        targetName = workspace.members.find((member) => member.id === memberId)?.name ?? "";
        return {
          ...workspace,
          role: "admin",
          members: workspace.members.map((member) => (member.id === memberId ? { ...member, role: "owner" } : member)),
        };
      }),
    );
    notify(`소유권을 ${targetName}님에게 이전했어요. 이제 관리자 권한입니다.`);
  };

  const removeWorkspace = (id: string, message: string) => {
    setWorkspaces((current) => {
      const next = current.filter((workspace) => workspace.id !== id);
      setSelectedId((prev) => (prev === id ? next[0]?.id ?? "" : prev));
      return next;
    });
    notify(message, "warn");
  };

  const handleLeave = (id: string) => removeWorkspace(id, "워크스페이스에서 나갔어요.");
  const handleDelete = (id: string) => removeWorkspace(id, "워크스페이스를 삭제했어요.");

  return (
    <div className="mx-auto w-[min(1120px,calc(100vw-36px))] py-12 pb-20">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex }}>
          <Users size={15} />
          <span className="text-sm font-black">Workspace Settings</span>
        </div>
        <h1 className="m-0 text-[clamp(36px,5vw,60px)] font-black leading-none" style={{ color: "var(--white)", textShadow: `0 0 22px ${colors.primary}, 0.18)` }}>
          워크스페이스 설정
        </h1>
        <p className="m-0 mt-4 max-w-[680px] text-base font-bold leading-[1.65]" style={{ color: "var(--muted)" }}>
          소속된 워크스페이스를 선택해 일반 정보, 연동, 소유권 이전, 나가기, 삭제를 권한에 맞게 관리합니다.
        </p>
      </motion.header>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{
            background: toast.tone === "ok" ? "rgba(57,255,136,0.10)" : "rgba(255,107,107,0.10)",
            border: toast.tone === "ok" ? "1px solid rgba(57,255,136,0.24)" : "1px solid rgba(255,107,107,0.24)",
            color: toast.tone === "ok" ? "#B7FFE3" : "#FFB4B4",
          }}
        >
          {toast.tone === "ok" ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-black tracking-tight">{toast.message}</span>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: 0.05, ease: "easeOut" }}
          className="grid h-fit gap-2 rounded-[28px] p-3"
          style={{
            background: "rgba(11, 22, 40, 0.76)",
            border: `1px solid ${colors.primary}, 0.16)`,
            boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
            backdropFilter: "blur(18px) saturate(180%)",
          }}
        >
          <p className="m-0 px-3 pb-1 pt-2 text-xs font-black tracking-tight" style={{ color: "var(--muted)" }}>
            내 워크스페이스 ({workspaces.length})
          </p>
          {workspaces.length === 0 && (
            <p className="m-0 px-3 py-6 text-center text-sm font-bold" style={{ color: "var(--muted)" }}>
              소속된 워크스페이스가 없습니다.
            </p>
          )}
          {workspaces.map((workspace) => {
            const active = workspace.id === selectedId;
            const role = ROLE_CONFIG[workspace.role];
            const RoleIcon = role.icon;
            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setSelectedId(workspace.id)}
                className="flex w-full items-center gap-3 rounded-2xl border-0 px-4 py-3 text-left"
                style={{
                  background: active ? `linear-gradient(135deg, ${colors.primary}, 0.18), rgba(234,247,255,0.055))` : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-black"
                  style={{ background: active ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})` : "rgba(234,247,255,0.06)", color: active ? "#021014" : "var(--muted)" }}
                >
                  {workspace.avatarUrl ? <img src={workspace.avatarUrl} alt="" className="h-full w-full object-cover" /> : workspace.name.trim().slice(0, 1)}
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-sm font-black tracking-tight" style={{ color: active ? "var(--white)" : "var(--muted)" }}>
                    {workspace.name}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black" style={{ color: role.color }}>
                    <RoleIcon size={11} />
                    {role.label}
                  </span>
                </span>
              </button>
            );
          })}
        </motion.aside>

        <motion.main
          key={selected?.id ?? "empty"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          {selected ? (
            <WorkspaceDetail
              key={selected.id}
              workspace={selected}
              colors={colors}
              onUpdate={handleUpdate}
              onTransfer={handleTransfer}
              onLeave={handleLeave}
              onDelete={handleDelete}
            />
          ) : (
            <div
              className="grid place-items-center rounded-[30px] px-7 py-20 text-center"
              style={{ background: "rgba(11, 22, 40, 0.76)", border: `1px solid ${colors.primary}, 0.16)` }}
            >
              <p className="m-0 text-base font-bold" style={{ color: "var(--muted)" }}>
                관리할 워크스페이스를 선택하세요.
              </p>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}

type ConfirmKind = "transfer" | "leave" | "delete" | null;

function WorkspaceDetail({
  workspace,
  colors,
  onUpdate,
  onTransfer,
  onLeave,
  onDelete,
}: {
  workspace: Workspace;
  colors: ThemeColors;
  onUpdate: (id: string, partial: Partial<Workspace>, message?: string) => void;
  onTransfer: (id: string, memberId: string) => void;
  onLeave: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [nameDraft, setNameDraft] = useState(workspace.name);
  const [slugDraft, setSlugDraft] = useState(workspace.slug);
  const [descDraft, setDescDraft] = useState(workspace.description);
  const [confirming, setConfirming] = useState<ConfirmKind>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>(workspace.members[0]?.id ?? "");
  const [deleteText, setDeleteText] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const role = ROLE_CONFIG[workspace.role];
  const RoleIcon = role.icon;
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const isOwner = workspace.role === "owner";
  const canLeave = workspace.role !== "owner";

  const sanitizeSlug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-/, "");
  const infoChanged =
    nameDraft.trim().length > 0 &&
    (nameDraft.trim() !== workspace.name || slugDraft !== workspace.slug || descDraft !== workspace.description);
  const transferTargetName = workspace.members.find((member) => member.id === transferTargetId)?.name ?? "";
  const connectedRepoCount = workspace.repos.filter((repo) => repo.connected).length;

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onUpdate(workspace.id, { avatarUrl: reader.result }, "로고를 변경했어요.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <section
      className="grid gap-6 rounded-[30px] px-7 py-7"
      style={{
        background: "rgba(11, 22, 40, 0.76)",
        border: `1px solid ${colors.primary}, 0.16)`,
        boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
        backdropFilter: "blur(18px) saturate(180%)",
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <span
          className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-2xl text-xl font-black"
          style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014" }}
        >
          {workspace.avatarUrl ? <img src={workspace.avatarUrl} alt="" className="h-full w-full object-cover" /> : workspace.name.trim().slice(0, 1)}
        </span>
        <div>
          <h2 className="m-0 text-2xl font-black leading-none" style={{ color: "var(--white)" }}>
            {workspace.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black" style={{ background: `${role.color}1F`, color: role.color }}>
              <RoleIcon size={12} />
              {role.label}
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
              멤버 {workspace.memberCount} · 리포지토리 {workspace.repoCount}
            </span>
          </div>
        </div>
      </div>

      {/* 일반 정보 */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}>
        <div className="mb-4 flex items-center gap-2">
          <Pencil size={17} style={{ color: colors.primaryHex }} />
          <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
            일반 정보
          </p>
        </div>

        {/* 로고 */}
        <div className="mb-4 flex items-center gap-4">
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <button
            type="button"
            disabled={!canManage}
            onClick={() => logoInputRef.current?.click()}
            aria-label="워크스페이스 로고 변경"
            className="group relative grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-2xl border-0 text-2xl font-black"
            style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014", cursor: canManage ? "pointer" : "default" }}
          >
            {workspace.avatarUrl ? <img src={workspace.avatarUrl} alt="" className="h-full w-full object-cover" /> : workspace.name.trim().slice(0, 1)}
            {canManage && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100" style={{ background: "rgba(5,11,20,0.5)" }}>
                <Camera size={18} style={{ color: "#EAF7FF" }} />
              </span>
            )}
          </button>
          <div className="grid gap-1">
            <p className="m-0 text-sm font-black" style={{ color: "var(--white)" }}>
              워크스페이스 로고
            </p>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border-0 px-3 py-1.5 text-xs font-black" style={{ background: `${colors.primary}, 0.10)`, border: `1px solid ${colors.primary}, 0.22)`, color: colors.primaryHex, cursor: "pointer" }}>
                  <Camera size={13} /> 변경
                </button>
                {workspace.avatarUrl && (
                  <button type="button" onClick={() => onUpdate(workspace.id, { avatarUrl: "" }, "로고를 삭제했어요.")} className="inline-flex items-center gap-1 rounded-lg border-0 px-3 py-1.5 text-xs font-black" style={{ background: "rgba(255,107,107,0.10)", border: "1px solid rgba(255,107,107,0.26)", color: "#FF6B6B", cursor: "pointer" }}>
                    <Trash size={13} /> 삭제
                  </button>
                )}
              </div>
            ) : (
              <p className="m-0 text-xs font-bold" style={{ color: "var(--muted)" }}>
                로고는 소유자·관리자만 변경할 수 있어요.
              </p>
            )}
          </div>
        </div>

        {canManage ? (
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black" style={{ color: "var(--white)" }}>이름</span>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={40}
                className="codedock-auth-input h-12 rounded-2xl px-4 outline-none"
                style={{ background: "rgba(5,11,20,0.62)", border: "1px solid rgba(32,227,255,0.16)", color: "var(--white)", fontSize: "15px", fontWeight: 800 }}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black" style={{ color: "var(--white)" }}>워크스페이스 URL</span>
              <div className="flex items-center overflow-hidden rounded-2xl" style={{ background: "rgba(5,11,20,0.62)", border: "1px solid rgba(32,227,255,0.16)" }}>
                <span className="flex h-12 flex-shrink-0 items-center gap-1.5 pl-4 pr-1 text-sm font-bold" style={{ color: "var(--muted)" }}>
                  <Globe size={15} style={{ color: colors.primaryHex }} />
                  codedock.dev/w/
                </span>
                <input
                  value={slugDraft}
                  onChange={(event) => setSlugDraft(sanitizeSlug(event.target.value))}
                  maxLength={32}
                  placeholder="my-workspace"
                  className="codedock-auth-input h-12 min-w-0 flex-1 border-0 bg-transparent pr-4 outline-none"
                  style={{ color: "var(--white)", fontSize: "15px", fontWeight: 800 }}
                />
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black" style={{ color: "var(--white)" }}>설명</span>
              <textarea
                value={descDraft}
                onChange={(event) => setDescDraft(event.target.value)}
                maxLength={160}
                rows={2}
                placeholder="이 워크스페이스를 한 줄로 소개해주세요."
                className="codedock-auth-input w-full resize-none rounded-2xl px-4 py-3 outline-none"
                style={{ background: "rgba(5,11,20,0.62)", border: "1px solid rgba(32,227,255,0.16)", color: "var(--white)", fontSize: "15px", fontWeight: 700, lineHeight: 1.6 }}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!infoChanged}
                onClick={() => onUpdate(workspace.id, { name: nameDraft.trim(), slug: slugDraft || sanitizeSlug(nameDraft), description: descDraft.trim() }, "워크스페이스 정보를 저장했어요.")}
                className="rounded-2xl border-0 px-5 py-3 text-sm font-black"
                style={{
                  background: infoChanged ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})` : "rgba(234,247,255,0.08)",
                  color: infoChanged ? "#021014" : "var(--muted)",
                  cursor: infoChanged ? "pointer" : "not-allowed",
                }}
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <ReadOnlyRow label="URL" value={`codedock.dev/w/${workspace.slug}`} />
            <ReadOnlyRow label="설명" value={workspace.description || "—"} />
            <p className="m-0 text-xs font-bold" style={{ color: "var(--muted)" }}>
              일반 정보는 <b style={{ color: "var(--white)" }}>소유자 · 관리자</b>만 수정할 수 있어요.
            </p>
          </div>
        )}
      </div>

      {/* 연동 */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}>
        <div className="mb-4 flex items-center gap-2">
          <Plug size={17} style={{ color: colors.primaryHex }} />
          <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
            연동
          </p>
        </div>

        {/* GitHub 리포지토리 */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Github size={15} style={{ color: "var(--white)" }} />
            <span className="text-sm font-black" style={{ color: "var(--white)" }}>GitHub 리포지토리</span>
            <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>연결됨 {connectedRepoCount}/{workspace.repos.length}</span>
          </div>
          <div className="grid gap-2">
            {workspace.repos.map((repo) => (
              <div key={repo.id} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(5,11,20,0.42)", border: `1px solid ${colors.primary}, 0.10)` }}>
                <span className="flex min-w-0 items-center gap-2 text-sm font-black" style={{ color: "var(--white)" }}>
                  <Github size={15} style={{ color: repo.connected ? "var(--matrix-green)" : "var(--muted)", flexShrink: 0 }} />
                  <span className="truncate font-mono">{repo.name}</span>
                </span>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => onUpdate(workspace.id, { repos: workspace.repos.map((item) => (item.id === repo.id ? { ...item, connected: !item.connected } : item)) })}
                  className="flex-shrink-0 rounded-lg border-0 px-3 py-1.5 text-xs font-black"
                  style={{
                    background: repo.connected ? "rgba(57,255,136,0.12)" : `${colors.primary}, 0.12)`,
                    border: repo.connected ? "1px solid rgba(57,255,136,0.34)" : `1px solid ${colors.primary}, 0.28)`,
                    color: repo.connected ? "var(--matrix-green)" : colors.primaryHex,
                    cursor: canManage ? "pointer" : "not-allowed",
                    opacity: canManage ? 1 : 0.6,
                  }}
                >
                  {repo.connected ? "연결됨 · 해제" : "연결"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook / Slack / Discord */}
        <div className="grid gap-2">
          <IntegrationToggle
            icon={Webhook}
            title="Webhook"
            body={workspace.webhookEnabled ? "https://api.codedock.dev/hooks/••••" : "PR·이슈 이벤트를 외부로 전송합니다."}
            on={workspace.webhookEnabled}
            canManage={canManage}
            colors={colors}
            onToggle={() => onUpdate(workspace.id, { webhookEnabled: !workspace.webhookEnabled })}
          />
          <IntegrationToggle
            icon={MessageSquare}
            title="Slack 알림"
            body="리뷰·결정 사항을 Slack 채널로 받습니다."
            on={workspace.slack}
            canManage={canManage}
            colors={colors}
            onToggle={() => onUpdate(workspace.id, { slack: !workspace.slack })}
          />
          <IntegrationToggle
            icon={MessageSquare}
            title="Discord 알림"
            body="리뷰·결정 사항을 Discord 채널로 받습니다."
            on={workspace.discord}
            canManage={canManage}
            colors={colors}
            onToggle={() => onUpdate(workspace.id, { discord: !workspace.discord })}
          />
        </div>
        {!canManage && (
          <p className="m-0 mt-3 text-xs font-bold" style={{ color: "var(--muted)" }}>
            연동 변경은 소유자·관리자만 가능합니다.
          </p>
        )}
      </div>

      {/* 위험 구역 */}
      <div className="rounded-[24px] px-5 py-5" style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.20)" }}>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={17} style={{ color: "#FF6B6B" }} />
          <p className="m-0 text-base font-black" style={{ color: "#FFB4B4" }}>
            위험 구역
          </p>
        </div>

        <div className="grid gap-3">
          {isOwner && (
            <DangerRow icon={ArrowRightLeft} title="소유권 이전" body="다른 멤버에게 소유자 권한을 넘깁니다. 이전 후 내 권한은 관리자가 됩니다." colors={colors}>
              {confirming === "transfer" ? (
                <div className="grid gap-2">
                  <select
                    value={transferTargetId}
                    onChange={(event) => setTransferTargetId(event.target.value)}
                    className="h-11 rounded-xl px-3 outline-none"
                    style={{ background: "rgba(5,11,20,0.7)", border: "1px solid rgba(32,227,255,0.18)", color: "var(--white)", fontSize: "14px", fontWeight: 800 }}
                  >
                    {workspace.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({ROLE_CONFIG[member.role].label})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" disabled={!transferTargetId} onClick={() => { onTransfer(workspace.id, transferTargetId); setConfirming(null); }} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "#FFD166", color: "#021014", cursor: transferTargetId ? "pointer" : "not-allowed" }}>
                      {transferTargetName}님에게 이전
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(234,247,255,0.06)", color: "var(--muted)", cursor: "pointer" }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming("transfer")} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(255,209,102,0.14)", border: "1px solid rgba(255,209,102,0.4)", color: "#FFD166", cursor: "pointer" }}>
                  소유권 이전
                </button>
              )}
            </DangerRow>
          )}

          <DangerRow icon={LogOut} title="워크스페이스 나가기" body={isOwner ? "소유자는 먼저 소유권을 이전해야 나갈 수 있어요." : "이 워크스페이스에서 나갑니다. 다시 초대받아야 재참여할 수 있어요."} colors={colors}>
            {!canLeave ? (
              <button type="button" disabled className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(234,247,255,0.06)", color: "var(--muted)", cursor: "not-allowed" }}>
                나가기 불가
              </button>
            ) : confirming === "leave" ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => onLeave(workspace.id)} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "#FF6B6B", color: "#021014", cursor: "pointer" }}>
                  정말 나가기
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(234,247,255,0.06)", color: "var(--muted)", cursor: "pointer" }}>
                  취소
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming("leave")} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.34)", color: "#FF6B6B", cursor: "pointer" }}>
                나가기
              </button>
            )}
          </DangerRow>

          {isOwner && (
            <DangerRow icon={Trash2} title="워크스페이스 삭제" body="워크스페이스와 모든 데이터가 영구히 삭제됩니다. 되돌릴 수 없어요." colors={colors}>
              {confirming === "delete" ? (
                <div className="grid gap-2">
                  <p className="m-0 text-xs font-bold" style={{ color: "var(--muted)" }}>
                    확인을 위해 <b style={{ color: "#FFB4B4" }}>{workspace.name}</b> 을(를) 입력하세요.
                  </p>
                  <input
                    value={deleteText}
                    onChange={(event) => setDeleteText(event.target.value)}
                    placeholder={workspace.name}
                    className="codedock-auth-input h-11 rounded-xl px-3 outline-none"
                    style={{ background: "rgba(5,11,20,0.7)", border: "1px solid rgba(255,107,107,0.3)", color: "var(--white)", fontSize: "14px", fontWeight: 800 }}
                  />
                  <div className="flex gap-2">
                    <button type="button" disabled={deleteText !== workspace.name} onClick={() => onDelete(workspace.id)} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: deleteText === workspace.name ? "#FF6B6B" : "rgba(234,247,255,0.08)", color: deleteText === workspace.name ? "#021014" : "var(--muted)", cursor: deleteText === workspace.name ? "pointer" : "not-allowed" }}>
                      영구 삭제
                    </button>
                    <button type="button" onClick={() => { setConfirming(null); setDeleteText(""); }} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(234,247,255,0.06)", color: "var(--muted)", cursor: "pointer" }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming("delete")} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.34)", color: "#FF6B6B", cursor: "pointer" }}>
                  워크스페이스 삭제
                </button>
              )}
            </DangerRow>
          )}
        </div>
      </div>
    </section>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-black" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: "var(--white)" }}>{value}</span>
    </div>
  );
}

function IntegrationToggle({
  icon: Icon,
  title,
  body,
  on,
  canManage,
  colors,
  onToggle,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  on: boolean;
  canManage: boolean;
  colors: ThemeColors;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(5,11,20,0.42)", border: `1px solid ${colors.primary}, 0.10)` }}>
      <div className="flex min-w-0 items-start gap-3">
        <Icon size={17} style={{ color: on ? colors.primaryHex : "var(--muted)", flexShrink: 0, marginTop: "2px" }} />
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-sm font-black" style={{ color: "var(--white)" }}>
            {title}
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: on ? "rgba(57,255,136,0.14)" : "rgba(234,247,255,0.08)", color: on ? "var(--matrix-green)" : "var(--muted)" }}>
              {on ? "연결됨" : "꺼짐"}
            </span>
          </p>
          <p className="m-0 mt-1 truncate text-xs font-bold" style={{ color: "var(--muted)" }}>{body}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!canManage}
        onClick={onToggle}
        className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
        style={{ background: on ? colors.primaryHex : "rgba(234,247,255,0.16)", cursor: canManage ? "pointer" : "not-allowed", opacity: canManage ? 1 : 0.6, border: "none" }}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full transition-all" style={{ left: on ? "22px" : "2px", background: on ? "#021014" : "#EAF7FF" }} />
      </button>
    </div>
  );
}

function DangerRow({
  icon: Icon,
  title,
  body,
  colors,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  colors: ThemeColors;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "rgba(5,11,20,0.42)", border: `1px solid ${colors.primary}, 0.10)` }}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} style={{ color: "var(--muted)", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <p className="m-0 text-sm font-black" style={{ color: "var(--white)" }}>
            {title}
          </p>
          <p className="m-0 mt-1 text-xs font-bold leading-[1.55]" style={{ color: "var(--muted)" }}>
            {body}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
