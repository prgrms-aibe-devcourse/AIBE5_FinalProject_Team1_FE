import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  X, Lock, Check, Loader2, RefreshCw, UserPlus, UserMinus, Shield, Palette,
  FileText, Settings2, Users, GitFork, AlertTriangle, ChevronDown, ExternalLink,
} from "lucide-react";
import type { Org } from "../pages/WorkspacePage";
import { TeamInviteModal } from "./TeamInviteModal";
import type { InviteDraft } from "./TeamInviteModal";

// ─── localStorage helpers (mirrors TeamPanel pattern) ───────────────────────
const WORKSPACE_TEAMS_KEY  = "codedock-workspace-teams-v1";
const WORKSPACE_COLORS_KEY = "codedock-workspace-colors-v1";
const CHAT_REPOS_KEY       = "codedock-repositories-v2";   // same key as ChatPage
const REPO_URLS_KEY        = "codedock-repo-urls-v1";       // repoId → full GitHub URL
const GITHUB_SYNC_KEY      = "codedock-github-sync-v1";     // workspaceId → last sync timestamp (ms)

// Minimal type mirroring ChatPage's RepositoryItem (only what we need here)
type WorkspaceRepo = {
  id: string;
  name: string;
  workspaceId?: string;
};

// Fallback repos that mirror ChatPage's DEFAULT_REPOSITORIES
const FALLBACK_REPOS: WorkspaceRepo[] = [
  { id: "secureflow",   name: "BE",     workspaceId: "workspace-1" },
  { id: "aichat",       name: "FE",     workspaceId: "workspace-1" },
  { id: "dashboard",    name: "Design", workspaceId: "workspace-1" },
  { id: "secureflow-2", name: "BE",     workspaceId: "workspace-2" },
  { id: "aichat-2",     name: "FE",     workspaceId: "workspace-2" },
  { id: "secureflow-3", name: "BE",     workspaceId: "workspace-3" },
  { id: "aichat-3",     name: "FE",     workspaceId: "workspace-3" },
  { id: "dashboard-3",  name: "Design", workspaceId: "workspace-3" },
];

function loadReposForWorkspace(workspaceId: string): WorkspaceRepo[] {
  try {
    const raw = localStorage.getItem(CHAT_REPOS_KEY);
    const all: WorkspaceRepo[] = raw ? JSON.parse(raw) : FALLBACK_REPOS;
    return all.filter(r => r.workspaceId === workspaceId);
  } catch {
    return FALLBACK_REPOS.filter(r => r.workspaceId === workspaceId);
  }
}

function loadRepoUrls(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(REPO_URLS_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveRepoUrl(repoId: string, url: string) {
  const all = loadRepoUrls();
  localStorage.setItem(REPO_URLS_KEY, JSON.stringify({ ...all, [repoId]: url }));
}

// Save a new repo entry into the shared ChatPage storage key
function addRepoToStorage(repo: WorkspaceRepo) {
  try {
    const raw = localStorage.getItem(CHAT_REPOS_KEY);
    const all: WorkspaceRepo[] = raw ? JSON.parse(raw) : FALLBACK_REPOS;
    if (!all.some(r => r.id === repo.id)) {
      localStorage.setItem(CHAT_REPOS_KEY, JSON.stringify([...all, repo]));
    }
  } catch { /* ignore */ }
}

function getGithubUrl(repo: WorkspaceRepo, urls: Record<string, string>): string {
  return urls[repo.id] ?? `https://github.com/codedock-team/${repo.id}`;
}

function loadLastSync(workspaceId: string): number | null {
  try {
    const all = JSON.parse(localStorage.getItem(GITHUB_SYNC_KEY) ?? "{}");
    return typeof all[workspaceId] === "number" ? all[workspaceId] : null;
  } catch { return null; }
}

function saveLastSync(workspaceId: string, ts: number) {
  try {
    const all = JSON.parse(localStorage.getItem(GITHUB_SYNC_KEY) ?? "{}");
    localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify({ ...all, [workspaceId]: ts }));
  } catch { /* ignore */ }
}

function clearLastSync(workspaceId: string) {
  try {
    const all = JSON.parse(localStorage.getItem(GITHUB_SYNC_KEY) ?? "{}");
    delete all[workspaceId];
    localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// Returns "N분 전" (< 60 min) or "N시간 전" (< 24 h), or null if expired / no data
function formatSyncAge(ts: number, now: number): string | null {
  const ms = now - ts;
  if (ms < 0) return null;
  if (ms >= 24 * 60 * 60 * 1000) return null;          // > 24 h → expired
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `마지막 동기화: ${minutes}분 전`;
  const hours = Math.floor(ms / 3_600_000);
  return `마지막 동기화: ${hours}시간 전`;
}

type StoredMember = {
  id: string;
  initials: string;
  name: string;
  role: string;           // job title (Tech Lead, Backend Developer, …)
  permissionRole?: string; // 관리자 | 편집 가능 | 보기 가능
  email: string;
  online: boolean;
  statusColor: string;
  protected?: boolean;    // true = 소유자 (immutable)
};

function loadAllTeams(): Record<string, StoredMember[]> {
  try { return JSON.parse(localStorage.getItem(WORKSPACE_TEAMS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveAllTeams(all: Record<string, StoredMember[]>) {
  localStorage.setItem(WORKSPACE_TEAMS_KEY, JSON.stringify(all));
}
function loadColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(WORKSPACE_COLORS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveColor(orgId: number, color: string) {
  const all = loadColors();
  localStorage.setItem(WORKSPACE_COLORS_KEY, JSON.stringify({ ...all, [String(orgId)]: color }));
}

// ─── Admin gate ──────────────────────────────────────────────────────────────
function AdminGate({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  if (isAdmin) return <>{children}</>;
  return (
    <div style={{ position: "relative", minHeight: "200px" }}>
      <div style={{ opacity: 0.2, pointerEvents: "none", userSelect: "none" }}>{children}</div>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          textAlign: "center", padding: "28px 32px", borderRadius: "16px",
          background: "rgba(5,11,20,0.90)", border: "1px solid rgba(32,227,255,0.15)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <Lock size={26} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", fontWeight: 800, lineHeight: 1.5 }}>
            관리자만 접근할 수 있는 설정입니다
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Color swatches ──────────────────────────────────────────────────────────
const DEFAULT_ACCENT = "#8B94A7"; // must match WorkspacePage constant
const COLOR_SWATCHES = [
  "#8B94A7", // default grey
  "#20E3FF", // neon cyan
  "#39FF88", // matrix green
  "#8B7CF6", // purple
  "#FF6B6B", // red
  "#FFD166", // amber
  "#3B82F6", // blue
  "#F97316", // orange
];

type SettingsTab = "일반" | "팀원 관리" | "리포지토리 관리" | "위험";

const TABS: { id: SettingsTab; icon: React.ElementType }[] = [
  { id: "일반", icon: Settings2 },
  { id: "팀원 관리", icon: Users },
  { id: "리포지토리 관리", icon: GitFork },
  { id: "위험", icon: AlertTriangle },
];

// Permission roles — excludes "소유자" (set only via 소유권 이전)
const PERMISSION_ROLE_OPTIONS = ["관리자", "편집 가능", "보기 가능"];

// Sort order: 소유자 always first, then by permission tier, then 가나다
const PERMISSION_ORDER = ["소유자", "관리자", "편집 가능", "보기 가능"];

function sortMembers(members: StoredMember[]): StoredMember[] {
  return [...members].sort((a, b) => {
    const aRole = a.protected ? "소유자" : (a.permissionRole ?? "편집 가능");
    const bRole = b.protected ? "소유자" : (b.permissionRole ?? "편집 가능");
    const tierDiff = PERMISSION_ORDER.indexOf(aRole) - PERMISSION_ORDER.indexOf(bRole);
    if (tierDiff !== 0) return tierDiff;
    return a.name.localeCompare(b.name, "ko");
  });
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export function WorkspaceSettingsModal({
  org,
  onClose,
  onUpdate,
  onDelete,
  onLeave,
  onColorChange,
}: {
  org: Org;
  onClose: () => void;
  onUpdate: (updated: Partial<Org> & { id: number }) => void;
  onDelete: (orgId: number) => void;
  onLeave: (orgId: number) => void;
  onColorChange: (orgId: number, color: string) => void;
}) {
  const isAdmin = org.myRole === "소유자" || org.myRole === "관리자";
  const isOwner = org.myRole === "소유자";

  const [activeTab, setActiveTab] = useState<SettingsTab>("일반");

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          style={{
            width: "100%", maxWidth: "740px",
            minHeight: "520px", maxHeight: "85vh",
            display: "flex", flexDirection: "column",
            borderRadius: "22px",
            background: "rgba(8,16,32,0.98)",
            border: "1px solid rgba(32,227,255,0.18)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "22px 28px 18px",
            borderBottom: "1px solid rgba(32,227,255,0.10)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Settings2 size={18} style={{ color: "var(--neon-cyan)" }} />
              <span style={{ fontSize: "16px", fontWeight: 950, color: "var(--white)", letterSpacing: "-0.03em" }}>
                팀 설정
              </span>
              <span style={{
                fontSize: "12px", fontWeight: 800,
                color: "var(--neon-cyan)", padding: "2px 8px",
                background: "rgba(32,227,255,0.10)",
                border: "1px solid rgba(32,227,255,0.22)", borderRadius: "6px",
              }}>
                {org.name}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--muted)", padding: "4px", borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--white)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: sidebar + content */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            {/* Left sidebar */}
            <nav style={{
              width: "168px", flexShrink: 0,
              borderRight: "1px solid rgba(32,227,255,0.08)",
              padding: "16px 10px",
              display: "flex", flexDirection: "column", gap: "4px",
            }}>
              {TABS.map(({ id, icon: Icon }) => {
                const active = activeTab === id;
                const isDanger = id === "위험";
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "9px",
                      padding: "9px 12px", borderRadius: "10px", border: "none",
                      background: active
                        ? isDanger ? "rgba(255,107,107,0.12)" : "rgba(32,227,255,0.10)"
                        : "transparent",
                      color: active
                        ? isDanger ? "#FF6B6B" : "var(--neon-cyan)"
                        : isDanger ? "rgba(255,107,107,0.6)" : "var(--muted)",
                      fontSize: "13px", fontWeight: active ? 950 : 800,
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = isDanger ? "rgba(255,107,107,0.07)" : "rgba(32,227,255,0.06)";
                        (e.currentTarget as HTMLButtonElement).style.color = isDanger ? "#FF8FA3" : "var(--white)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = isDanger ? "rgba(255,107,107,0.6)" : "var(--muted)";
                      }
                    }}
                  >
                    <Icon size={14} style={{ flexShrink: 0 }} />
                    {id}
                  </button>
                );
              })}
            </nav>

            {/* Right content */}
            <div
              className="codedock-scrollbar-hidden"
              style={{ flex: 1, overflowY: "auto", padding: "28px 32px", minWidth: 0 }}
            >
              {activeTab === "일반" && (
                <GeneralTab org={org} isAdmin={isAdmin} onUpdate={onUpdate} onColorChange={onColorChange} />
              )}
              {activeTab === "팀원 관리" && (
                <MembersTab org={org} isAdmin={isAdmin} isOwner={isOwner} onUpdate={onUpdate} />
              )}
              {activeTab === "리포지토리 관리" && (
                <ReposTab org={org} isAdmin={isAdmin} />
              )}
              {activeTab === "위험" && (
                <DangerTab org={org} isOwner={isOwner} onDelete={onDelete} onLeave={onLeave} />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Tab: 일반 ───────────────────────────────────────────────────────────────
function GeneralTab({ org, isAdmin, onUpdate, onColorChange }: {
  org: Org; isAdmin: boolean;
  onUpdate: (u: Partial<Org> & { id: number }) => void;
  onColorChange: (orgId: number, color: string) => void;
}) {
  const [name, setName] = useState(org.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(
    () => loadColors()[String(org.id)] ?? DEFAULT_ACCENT
  );

  const saveName = (value: string) => {
    if (!value.trim()) return;
    onUpdate({ id: org.id, name: value.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1800);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    saveColor(org.id, color);
    onColorChange(org.id, color);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <SectionHeader icon={FileText} label="팀 이름" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!isAdmin}
          placeholder="팀 이름을 입력하세요"
          style={{
            background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(32,227,255,0.18)",
            borderRadius: "10px", padding: "10px 14px",
            color: isAdmin ? "var(--white)" : "var(--muted)", fontSize: "14px", fontWeight: 800,
            outline: "none", width: "100%", boxSizing: "border-box",
            opacity: isAdmin ? 1 : 0.5, cursor: isAdmin ? "text" : "not-allowed",
          }}
          onFocus={e => isAdmin && (e.target.style.borderColor = "rgba(32,227,255,0.45)")}
          onBlur={e => (e.target.style.borderColor = "rgba(32,227,255,0.18)")}
        />
        {isAdmin && (
          <button
            onClick={() => saveName(name)}
            disabled={!name.trim() || name.trim() === org.name}
            style={actionBtnStyle(!name.trim() || name.trim() === org.name)}
          >
            {nameSaved ? <><Check size={13} /> 저장됨</> : "저장"}
          </button>
        )}
        {!isAdmin && <AdminNote />}
      </div>

      <div style={{ borderTop: "1px solid rgba(32,227,255,0.08)", paddingTop: "24px" }}>
        <SectionHeader icon={Palette} label="워크스페이스 색상" note="내 기기에만 저장됩니다" />
        <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {COLOR_SWATCHES.map((color) => {
            const active = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                title={color === DEFAULT_ACCENT ? "기본" : color}
                style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  background: `linear-gradient(145deg, ${color} 0%, rgba(0,0,0,0.32) 160%)`,
                  border: "none", outline: "none",
                  overflow: "hidden",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.14s, box-shadow 0.14s",
                  transform: active ? "scale(1.20)" : "scale(1)",
                  boxShadow: active
                    ? `0 0 0 2.5px rgba(8,16,32,1), 0 0 0 5px rgba(255,255,255,0.85), 0 0 14px ${color}88`
                    : `0 0 0 1.5px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`,
                  flexShrink: 0,
                }}
              >
                {active && <Check size={13} style={{ color: "rgba(255,255,255,0.9)", strokeWidth: 3, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Invite draft → StoredMember conversion ──────────────────────────────────
const MEMBER_POOL: Record<string, StoredMember> = {
  "jaejun@codedock.dev":  { id: "jaejun",  initials: "JJ", name: "김재준", role: "Tech Lead",          permissionRole: "편집 가능", email: "jaejun@codedock.dev",  online: true,  statusColor: "#39FF88" },
  "jinah@codedock.dev":   { id: "jinah",   initials: "JA", name: "김진아", role: "Backend Developer",  permissionRole: "편집 가능", email: "jinah@codedock.dev",   online: true,  statusColor: "#39FF88" },
  "jinpil@codedock.dev":  { id: "jinpil",  initials: "JP", name: "김진필", role: "Backend Developer",  permissionRole: "편집 가능", email: "jinpil@codedock.dev",  online: true,  statusColor: "#39FF88" },
  "junwoo@codedock.dev":  { id: "junwoo",  initials: "JW", name: "김준우", role: "Frontend Developer", permissionRole: "편집 가능", email: "junwoo@codedock.dev",  online: true,  statusColor: "#39FF88" },
  "jinhyun@codedock.dev": { id: "jinhyun", initials: "JH", name: "김진현", role: "DevOps Engineer",    permissionRole: "편집 가능", email: "jinhyun@codedock.dev", online: false, statusColor: "#8B94A7" },
  "hyun@codedock.dev":    { id: "hyun",    initials: "AH", name: "안현",   role: "QA Engineer",        permissionRole: "편집 가능", email: "hyun@codedock.dev",    online: false, statusColor: "#8B94A7" },
};

function draftToStored(draft: InviteDraft): StoredMember {
  return MEMBER_POOL[draft.email] ?? {
    id: `invited-${draft.id}`,
    initials: draft.name.slice(0, 2).toUpperCase(),
    name: draft.name,
    role: draft.role,
    permissionRole: "편집 가능",
    email: draft.email,
    online: false,
    statusColor: "#8B94A7",
  };
}

// ─── Tab: 팀원 관리 ──────────────────────────────────────────────────────────
function MembersTab({ org, isAdmin, isOwner, onUpdate }: {
  org: Org; isAdmin: boolean; isOwner: boolean;
  onUpdate: (u: Partial<Org> & { id: number }) => void;
}) {
  const wsKey = org.workspaceId ?? String(org.id);

  const [members, setMembers] = useState<StoredMember[]>(() => {
    const all = loadAllTeams();
    return all[wsKey] ?? [];
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferDone, setTransferDone] = useState(false);

  // Always holds the latest members so RAF callbacks don't use stale closures
  const membersRef = useRef(members);
  useEffect(() => { membersRef.current = members; }, [members]);

  const persist = (next: StoredMember[]) => {
    const all = loadAllTeams();
    saveAllTeams({ ...all, [wsKey]: next });
    setMembers(next);
    onUpdate({ id: org.id, memberCount: next.length });
  };

  const handlePermissionChange = (memberId: string, newPermission: string) => {
    // Step 1 — grey out immediately and dismiss any open confirm
    setReordering(true);
    setConfirmKickId(null);

    // Step 2 — wait for the grey paint to finish, THEN apply the role change.
    // requestAnimationFrame fires just before the *next* paint; double-RAF
    // ensures the grey frame has actually been committed to screen first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const updated = membersRef.current.map(m =>
          m.id === memberId ? { ...m, permissionRole: newPermission } : m
        );
        persist(updated);
        // Step 3 (reorder) happens automatically: sortedMembers recomputes
        // from the new members in the same render.
        // Step 4 (un-grey) is handled by the useEffect below.
      });
    });
  };

  // Step 4 — lift the grayout once React has painted the newly sorted list.
  // Skip the very first mount (members hasn't changed yet).
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) { initialMountRef.current = false; return; }
    if (reordering) setReordering(false);
  }, [members]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sorted view — recomputed whenever members change
  const sortedMembers = useMemo(() => sortMembers(members), [members]);

  const handleKickConfirmed = (memberId: string) => {
    persist(members.filter(m => m.id !== memberId));
    setConfirmKickId(null);
  };

  const handleInviteConfirm = (drafts: InviteDraft[]) => {
    const existingIds = new Set(members.map(m => m.id));
    const existingEmails = new Set(members.map(m => m.email));
    const newMembers = drafts
      .map(draftToStored)
      .filter(m => !existingIds.has(m.id) && !existingEmails.has(m.email));
    if (newMembers.length > 0) persist([...members, ...newMembers]);
  };

  const handleTransfer = () => {
    if (!transferTarget) return;

    // Step 1 — show processing state + grey out the member list immediately
    setTransferDone(true);
    setReordering(true);

    // Step 2 — wait for the greyed frame to be painted, then apply all changes atomically
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Swap protected flags and permissionRoles in the stored member array
        const updated = membersRef.current.map(m => {
          if (m.protected) {
            // Previous owner → demoted to 관리자
            return { ...m, protected: false, permissionRole: "관리자" };
          }
          if (m.id === transferTarget) {
            // New owner → elevated to 소유자
            return { ...m, protected: true, permissionRole: "소유자" };
          }
          return m;
        });

        // Persist to localStorage + update members state.
        // sortedMembers recomputes → new owner rises to top.
        // useEffect([members]) fires after paint → clears reordering.
        persist(updated);

        // Update the org-level role in the parent.
        // handleUpdateOrg → setOrgs + setSettingsOrg → modal receives new org prop
        // → isOwner becomes false → 소유권 이전 section disappears, 나가기 unlocks.
        onUpdate({ id: org.id, myRole: "관리자" });

        // Reset transfer UI state
        setShowTransferConfirm(false);
        setTransferDone(false);
        setTransferTarget("");
        // reordering cleared dynamically by useEffect([members]) watcher
      });
    });
  };

  // Exclude protected (소유자) from transfer candidates
  const transferableMembers = members.filter(m => !m.protected);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader icon={Users} label="팀원 목록" />
        {/* 팀원 초대 button — admin only */}
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px",
            border: "1px solid rgba(32,227,255,0.28)",
            background: "transparent", color: "var(--neon-cyan)",
            fontSize: "12px", fontWeight: 900,
            cursor: "pointer", transition: "background 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(32,227,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <UserPlus size={13} />
          팀원 초대
        </button>
      </div>

      {sortedMembers.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>팀원이 없습니다.</p>
      ) : (
        <div style={{
          display: "flex", flexDirection: "column", gap: "6px",
          position: "relative",
          opacity: reordering ? 0.45 : 1,
          pointerEvents: reordering ? "none" : "auto",
          filter: reordering ? "grayscale(0.4)" : "none",
          transition: "opacity 0.2s, filter 0.2s",
        }}>
          {sortedMembers.map(member => {
            const isProtected = !!member.protected; // 소유자
            const canModify = !isProtected;
            const canKick = !isProtected;
            const isConfirmingKick = confirmKickId === member.id;
            const currentPermission = member.permissionRole ?? "편집 가능";

            return (
              <div key={member.id} style={{
                display: "flex", flexDirection: "column", gap: "0",
                borderRadius: "12px", overflow: "hidden",
                border: isConfirmingKick
                  ? "1px solid rgba(255,107,107,0.35)"
                  : "1px solid rgba(32,227,255,0.08)",
                transition: "border-color 0.15s",
              }}>
                {/* Main row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 14px",
                  background: isConfirmingKick ? "rgba(255,107,107,0.05)" : "rgba(255,255,255,0.03)",
                  transition: "background 0.15s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                    background: isProtected
                      ? "linear-gradient(135deg, #FFD166, #FF6B6B)"
                      : "linear-gradient(135deg, var(--neon-cyan), #8b7cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 950, color: "#021014",
                  }}>
                    {member.initials}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 950, color: "var(--white)", lineHeight: 1.2 }}>
                        {member.name}
                      </p>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)", fontWeight: 800 }}>
                      {member.role} · {member.email}
                    </p>
                  </div>
                  {/* Permission role — 소유자 shows badge, others show custom dropdown */}
                  {isProtected ? (
                    <span style={{
                      fontSize: "11px", fontWeight: 900, color: "#FFD166",
                      background: "rgba(255,209,102,0.12)", border: "1px solid rgba(255,209,102,0.25)",
                      borderRadius: "6px", padding: "4px 10px", flexShrink: 0,
                    }}>소유자</span>
                  ) : (
                    <PermissionDropdown
                      value={currentPermission}
                      onChange={(newRole) => handlePermissionChange(member.id, newRole)}
                      disabled={!canModify}
                    />
                  )}
                  {/* Kick button */}
                  {canKick && (
                    <button
                      onClick={() => setConfirmKickId(isConfirmingKick ? null : member.id)}
                      title="추방"
                      style={{
                        background: isConfirmingKick ? "rgba(255,107,107,0.15)" : "transparent",
                        border: "none", cursor: "pointer",
                        color: isConfirmingKick ? "#FF6B6B" : "rgba(255,107,107,0.45)",
                        padding: "4px", borderRadius: "6px",
                        display: "flex", alignItems: "center", flexShrink: 0, transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { if (!isConfirmingKick) (e.currentTarget.style.color = "#FF6B6B"); }}
                      onMouseLeave={e => { if (!isConfirmingKick) (e.currentTarget.style.color = "rgba(255,107,107,0.45)"); }}
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                  {!canKick && <div style={{ width: "22px", flexShrink: 0 }} />}
                </div>
                {/* Kick confirmation row */}
                {isConfirmingKick && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px",
                    borderTop: "1px solid rgba(255,107,107,0.20)",
                    background: "rgba(255,107,107,0.04)",
                  }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#FF8FA3" }}>
                      정말로 <strong>{member.name}</strong>을(를) 추방하시겠습니까?
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        onClick={() => setConfirmKickId(null)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px", border: "1px solid rgba(145,175,196,0.2)",
                          background: "transparent", color: "var(--muted)", fontSize: "12px", fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >취소</button>
                      <button
                        onClick={() => handleKickConfirmed(member.id)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px",
                          border: "1px solid rgba(255,107,107,0.4)",
                          background: "rgba(255,107,107,0.15)", color: "#FF6B6B",
                          fontSize: "12px", fontWeight: 900, cursor: "pointer",
                        }}
                      >추방</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer ownership — owner only, bottom of tab, red section */}
      {isOwner && transferableMembers.length > 0 && (
        <div style={{
          marginTop: "12px", paddingTop: "20px",
          borderTop: "1px solid rgba(255,107,107,0.20)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Shield size={14} style={{ color: "#FF6B6B" }} />
            <span style={{ fontSize: "13px", fontWeight: 950, color: "#FF6B6B" }}>소유권 이전</span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--muted)", fontWeight: 800, lineHeight: 1.5 }}>
            소유권을 이전하면 귀하는 관리자로 역할이 변경됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          {!showTransferConfirm ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <select
                  value={transferTarget}
                  onChange={e => setTransferTarget(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,107,107,0.08)",
                    border: "1px solid rgba(255,107,107,0.25)", borderRadius: "8px",
                    padding: "8px 28px 8px 12px", color: transferTarget ? "#FF8FA3" : "var(--muted)",
                    fontSize: "13px", fontWeight: 800, cursor: "pointer",
                    outline: "none", appearance: "none",
                  }}
                >
                  <option value="">이전할 멤버를 선택하세요</option>
                  {transferableMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} style={{
                  position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  color: "#FF6B6B", pointerEvents: "none",
                }} />
              </div>
              <button
                disabled={!transferTarget}
                onClick={() => setShowTransferConfirm(true)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.4)",
                  background: transferTarget ? "rgba(255,107,107,0.12)" : "transparent",
                  color: transferTarget ? "#FF6B6B" : "rgba(255,107,107,0.35)",
                  fontSize: "13px", fontWeight: 900,
                  cursor: transferTarget ? "pointer" : "not-allowed", transition: "all 0.15s", flexShrink: 0,
                }}
              >
                이전하기
              </button>
            </div>
          ) : (
            <div style={{
              padding: "14px 16px", borderRadius: "10px",
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
            }}>
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#FF8FA3", fontWeight: 800 }}>
                정말로 <strong>{transferableMembers.find(m => m.id === transferTarget)?.name}</strong>에게 소유권을 이전하시겠습니까?
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowTransferConfirm(false)} style={cancelBtnStyle}>
                  취소
                </button>
                <button onClick={handleTransfer} style={dangerBtnStyle} disabled={transferDone}>
                  {transferDone ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> 처리 중...</> : "이전 확인"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      <TeamInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteConfirm}
      />
    </div>
  );

  return <AdminGate isAdmin={isAdmin}>{content}</AdminGate>;
}

// ─── Tab: 리포지토리 관리 ─────────────────────────────────────────────────────
function ReposTab({ org, isAdmin }: { org: Org; isAdmin: boolean }) {
  const wsKey = org.workspaceId ?? String(org.id);

  const [repos, setRepos] = useState<WorkspaceRepo[]>(() => loadReposForWorkspace(wsKey));
  const [repoUrls, setRepoUrls] = useState<Record<string, string>>(() => loadRepoUrls());
  const [syncing, setSyncing] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // Real timestamp of last successful sync (persisted to localStorage)
  const [lastSync, setLastSync] = useState<number | null>(() => loadLastSync(wsKey));
  // Live "now" ticks every minute so the elapsed-time label stays accurate
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      // Expire if > 24 h: clear state + localStorage so next press starts fresh
      setLastSync(prev => {
        if (prev !== null && current - prev >= 24 * 60 * 60 * 1000) {
          clearLastSync(wsKey);
          return null;
        }
        return prev;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [wsKey]);

  const handleRefresh = () => {
    setSyncing(true);
    // Simulate API round-trip with double-RAF (same pattern as elsewhere)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ts = Date.now();
        saveLastSync(wsKey, ts);
        setLastSync(ts);
        setNow(ts);                         // update "now" so label shows 0분 immediately
        setRepos(loadReposForWorkspace(wsKey));
        setRepoUrls(loadRepoUrls());
        setSyncing(false);
      });
    });
  };

  const handleAddRepo = () => {
    const raw = repoUrl.trim();
    // Parse https://github.com/owner/repo-name
    const match = raw.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      setUrlError("올바른 GitHub URL을 입력하세요 (예: https://github.com/owner/repo)");
      return;
    }
    const [, owner, repoName] = match;
    const cleanUrl = `https://github.com/${owner}/${repoName}`;
    const repoId = `${owner}-${repoName}-${wsKey}`;

    const newRepo: WorkspaceRepo = { id: repoId, name: repoName, workspaceId: wsKey };
    addRepoToStorage(newRepo);
    saveRepoUrl(repoId, cleanUrl);

    setRepos(prev => [...prev, newRepo]);
    setRepoUrls(prev => ({ ...prev, [repoId]: cleanUrl }));
    setRepoUrl("");
    setUrlError("");
    setShowAddInput(false);
  };

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeader icon={GitFork} label="연결된 리포지토리" />
        <button
          onClick={() => { setShowAddInput(v => !v); setUrlError(""); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px",
            border: "1px solid rgba(32,227,255,0.28)",
            background: "transparent", color: "var(--neon-cyan)",
            fontSize: "12px", fontWeight: 900,
            cursor: "pointer", transition: "background 0.15s", flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(32,227,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <UserPlus size={13} />
          리포지토리 추가
        </button>
      </div>

      {/* Add repo URL input */}
      {showAddInput && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              autoFocus
              value={repoUrl}
              onChange={e => { setRepoUrl(e.target.value); setUrlError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleAddRepo(); if (e.key === "Escape") setShowAddInput(false); }}
              placeholder="https://github.com/owner/repo"
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)",
                border: `1.5px solid ${urlError ? "rgba(255,107,107,0.45)" : "rgba(32,227,255,0.18)"}`,
                borderRadius: "10px", padding: "9px 13px",
                color: "var(--white)", fontSize: "13px", fontWeight: 800,
                outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = urlError ? "rgba(255,107,107,0.55)" : "rgba(32,227,255,0.45)")}
              onBlur={e => (e.target.style.borderColor = urlError ? "rgba(255,107,107,0.45)" : "rgba(32,227,255,0.18)")}
            />
            <button
              disabled={!repoUrl.trim()}
              onClick={handleAddRepo}
              style={actionBtnStyle(!repoUrl.trim())}
            >
              추가
            </button>
          </div>
          {urlError && (
            <p style={{ margin: 0, fontSize: "11px", color: "#FF8FA3", fontWeight: 800 }}>{urlError}</p>
          )}
        </div>
      )}

      {/* Repo cards */}
      {repos.length === 0 ? (
        <div style={{
          padding: "24px", borderRadius: "12px", textAlign: "center",
          background: "rgba(5,11,20,0.5)", border: "1px dashed rgba(32,227,255,0.12)",
        }}>
          <GitFork size={20} style={{ color: "var(--muted)", marginBottom: "10px" }} />
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", fontWeight: 800 }}>
            연결된 리포지토리가 없습니다
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(145,175,196,0.5)", fontWeight: 700 }}>
            위 버튼으로 GitHub 리포지토리를 추가하세요
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {repos.map(repo => {
            const url = getGithubUrl(repo, repoUrls);
            return (
              <div
                key={repo.id}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(32,227,255,0.08)",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(32,227,255,0.04)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(32,227,255,0.16)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(32,227,255,0.08)";
                }}
              >
                {/* Icon */}
                <div style={{
                  width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
                  background: "rgba(32,227,255,0.08)", border: "1px solid rgba(32,227,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <GitFork size={15} style={{ color: "var(--neon-cyan)" }} />
                </div>

                {/* Name + URL */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 950, color: "var(--white)", lineHeight: 1.3 }}>
                    {repo.name}
                  </p>
                  <p style={{
                    margin: "2px 0 0", fontSize: "11px", color: "var(--muted)", fontWeight: 700,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {url}
                  </p>
                </div>

                {/* Open in GitHub */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GitHub에서 열기"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                    border: "1px solid rgba(32,227,255,0.18)",
                    background: "transparent", color: "var(--muted)",
                    transition: "all 0.15s", textDecoration: "none",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(32,227,255,0.10)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--neon-cyan)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(32,227,255,0.35)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(32,227,255,0.18)";
                  }}
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh connection */}
      <div style={{ borderTop: "1px solid rgba(32,227,255,0.08)", paddingTop: "18px" }}>
        <button
          onClick={handleRefresh}
          disabled={syncing}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 16px", borderRadius: "10px",
            border: "1px solid rgba(32,227,255,0.20)",
            background: "rgba(255,255,255,0.04)",
            color: syncing ? "rgba(145,175,196,0.35)" : "var(--muted)",
            fontSize: "13px", fontWeight: 900,
            cursor: syncing ? "not-allowed" : "pointer",
            opacity: syncing ? 0.55 : 1,
            transition: "opacity 0.2s, color 0.2s",
          }}
        >
          <RefreshCw size={14} />
          GitHub 연결 상태 새로고침
        </button>

        {/* Last sync time — calculated from real stored timestamp, updates every minute */}
        {lastSync !== null && (() => {
          const label = formatSyncAge(lastSync, now);
          return (
            <p style={{
              margin: "7px 0 0 2px", fontSize: "11px", fontWeight: 800,
              color: label ? "rgba(145,175,196,0.55)" : "transparent",
              transition: "color 0.3s",
              userSelect: "none",
            }}>
              {label ?? "마지막 동기화: -"}
            </p>
          );
        })()}
      </div>
    </div>
  );

  return <AdminGate isAdmin={isAdmin}>{content}</AdminGate>;
}

// ─── Tab: 위험 ───────────────────────────────────────────────────────────────
function DangerTab({ org, isOwner, onDelete, onLeave }: {
  org: Org; isOwner: boolean;
  onDelete: (id: number) => void;
  onLeave: (id: number) => void;
}) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDeleteConfirm) setTimeout(() => deleteInputRef.current?.focus(), 50);
  }, [showDeleteConfirm]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Leave */}
      <div>
        <SectionHeader icon={AlertTriangle} label="팀 나가기" color="#FFD166" />
        <p style={{ margin: "8px 0 14px", fontSize: "13px", color: "var(--muted)", fontWeight: 800, lineHeight: 1.5 }}>
          팀을 나가면 이 팀의 채팅, 이슈, PR에 더 이상 접근할 수 없습니다.
        </p>
        {!showLeaveConfirm ? (
          <button
            disabled={isOwner}
            onClick={() => !isOwner && setShowLeaveConfirm(true)}
            title={isOwner ? "소유권을 먼저 이전하세요" : undefined}
            style={{
              padding: "9px 20px", borderRadius: "10px",
              border: "1px solid rgba(255,209,102,0.35)",
              background: isOwner ? "transparent" : "rgba(255,209,102,0.07)",
              color: isOwner ? "rgba(255,209,102,0.35)" : "#FFD166",
              fontSize: "13px", fontWeight: 900,
              cursor: isOwner ? "not-allowed" : "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!isOwner) (e.currentTarget.style.background = "rgba(255,209,102,0.13)"); }}
            onMouseLeave={e => { if (!isOwner) (e.currentTarget.style.background = "rgba(255,209,102,0.07)"); }}
          >
            팀 나가기
          </button>
        ) : (
          <div style={{
            padding: "14px 16px", borderRadius: "10px",
            background: "rgba(255,209,102,0.07)", border: "1px solid rgba(255,209,102,0.25)",
          }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#FFD166", fontWeight: 800 }}>
              정말 이 팀에서 나가시겠습니까?
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={cancelBtnStyle}>취소</button>
              <button
                onClick={() => onLeave(org.id)}
                style={{
                  ...dangerBtnStyle,
                  background: "rgba(255,209,102,0.12)", borderColor: "rgba(255,209,102,0.4)",
                  color: "#FFD166",
                }}
              >
                나가기
              </button>
            </div>
          </div>
        )}
        {isOwner && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "rgba(255,209,102,0.5)", fontWeight: 800 }}>
            소유권을 먼저 이전하세요
          </p>
        )}
      </div>

      {/* Delete — owner only */}
      {isOwner && (
        <div style={{ borderTop: "1px solid rgba(255,107,107,0.18)", paddingTop: "24px" }}>
          <SectionHeader icon={AlertTriangle} label="팀 삭제" color="#FF6B6B" />
          <p style={{ margin: "8px 0 14px", fontSize: "13px", color: "var(--muted)", fontWeight: 800, lineHeight: 1.5 }}>
            팀을 삭제하면 모든 데이터가 영구적으로 제거됩니다. <span style={{ color: "#FF6B6B" }}>이 작업은 되돌릴 수 없습니다.</span>
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "9px 20px", borderRadius: "10px",
                border: "1px solid rgba(255,107,107,0.35)",
                background: "rgba(255,107,107,0.07)",
                color: "#FF6B6B", fontSize: "13px", fontWeight: 900,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,107,107,0.14)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,107,107,0.07)")}
            >
              팀 삭제
            </button>
          ) : (
            <div style={{
              padding: "16px", borderRadius: "12px",
              background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.25)",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#FF8FA3", fontWeight: 800, lineHeight: 1.5 }}>
                확인을 위해 팀 이름 <strong style={{ color: "#FF6B6B" }}>"{org.name}"</strong>을 입력하세요.
              </p>
              <input
                ref={deleteInputRef}
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={org.name}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,107,107,0.08)", border: "1.5px solid rgba(255,107,107,0.25)",
                  borderRadius: "8px", padding: "9px 13px",
                  color: "var(--white)", fontSize: "13px", fontWeight: 800, outline: "none",
                  fontFamily: "inherit", marginBottom: "12px",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(255,107,107,0.55)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,107,107,0.25)")}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }} style={cancelBtnStyle}>
                  취소
                </button>
                <button
                  disabled={deleteInput !== org.name}
                  onClick={() => onDelete(org.id)}
                  style={deleteInput === org.name ? dangerBtnStyle : { ...dangerBtnStyle, opacity: 0.4, cursor: "not-allowed" }}
                >
                  영구 삭제
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom Permission Role Dropdown ─────────────────────────────────────────
const ROLE_META: Record<string, { color: string; bg: string }> = {
  "관리자":   { color: "#20E3FF", bg: "rgba(32,227,255,0.12)" },
  "편집 가능": { color: "#39FF88", bg: "rgba(57,255,136,0.10)" },
  "보기 가능": { color: "#8B94A7", bg: "rgba(139,148,167,0.10)" },
};

function PermissionDropdown({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const meta = ROLE_META[value] ?? ROLE_META["보기 가능"];

  const openDropdown = () => {
    if (disabled) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 5, left: r.left });
    }
    setOpen(true);
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={open ? () => setOpen(false) : openDropdown}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 8px 5px 10px", borderRadius: "8px",
          border: `1px solid ${open ? meta.color + "55" : "rgba(255,255,255,0.12)"}`,
          background: open ? meta.bg : "rgba(255,255,255,0.05)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transition: "all 0.15s", flexShrink: 0, outline: "none",
        }}
        onMouseEnter={e => { if (!disabled && !open) (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); }}
        onMouseLeave={e => { if (!disabled && !open) (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); }}
      >
        {/* Role colour dot */}
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: meta.color, flexShrink: 0,
          boxShadow: `0 0 5px ${meta.color}88`,
        }} />
        <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--white)", whiteSpace: "nowrap" }}>
          {value}
        </span>
        <ChevronDown
          size={11}
          style={{
            color: "var(--muted)", flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            zIndex: 99999,
            minWidth: "148px",
            background: "rgba(6,13,26,0.98)",
            border: "1px solid rgba(32,227,255,0.18)",
            borderRadius: "12px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(32,227,255,0.06)",
            padding: "5px",
            backdropFilter: "blur(12px)",
          }}
        >
          {PERMISSION_ROLE_OPTIONS.map((role) => {
            const m = ROLE_META[role];
            const selected = role === value;
            return (
              <button
                key={role}
                onClick={() => { onChange(role); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "9px",
                  width: "100%", padding: "8px 10px", borderRadius: "8px",
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: selected ? m.bg : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget.style.background = "rgba(255,255,255,0.06)"); }}
                onMouseLeave={e => { if (!selected) (e.currentTarget.style.background = "transparent"); }}
              >
                <span style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: m.color, flexShrink: 0,
                  boxShadow: selected ? `0 0 6px ${m.color}` : "none",
                }} />
                <span style={{
                  flex: 1, fontSize: "12px",
                  fontWeight: selected ? 950 : 800,
                  color: selected ? "var(--white)" : "var(--muted)",
                  letterSpacing: "-0.02em",
                }}>
                  {role}
                </span>
                {selected && (
                  <Check size={12} style={{ color: m.color, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Shared sub-components & styles ─────────────────────────────────────────
function SectionHeader({
  icon: Icon, label, note, color,
}: { icon: React.ElementType; label: string; note?: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
      <Icon size={14} style={{ color: color ?? "var(--neon-cyan)", flexShrink: 0 }} />
      <span style={{ fontSize: "13px", fontWeight: 950, color: color ?? "var(--white)", letterSpacing: "-0.02em" }}>
        {label}
      </span>
      {note && (
        <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--muted)", marginLeft: "4px" }}>
          — {note}
        </span>
      )}
    </div>
  );
}

function AdminNote() {
  return (
    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(145,175,196,0.5)", fontWeight: 800 }}>
      관리자만 변경할 수 있습니다
    </p>
  );
}

const actionBtnStyle = (disabled: boolean): React.CSSProperties => ({
  alignSelf: "flex-start", padding: "7px 18px", borderRadius: "8px", border: "none",
  background: disabled ? "rgba(32,227,255,0.06)" : "rgba(32,227,255,0.14)",
  color: disabled ? "rgba(32,227,255,0.35)" : "var(--neon-cyan)",
  fontSize: "12px", fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.15s", display: "flex", alignItems: "center", gap: "5px",
});

const cancelBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(145,175,196,0.2)",
  background: "transparent", color: "var(--muted)", fontSize: "12px", fontWeight: 900,
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.4)",
  background: "rgba(255,107,107,0.12)", color: "#FF6B6B", fontSize: "12px", fontWeight: 900,
  cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
};
