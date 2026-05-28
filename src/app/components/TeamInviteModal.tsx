import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ChevronRight, Copy, Folder, Github, Globe2, Link2, Lock, Mail, Play, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENT_USER_ID = "junwoo";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "editor" | "viewer";
  warning?: boolean;
  isGithub?: boolean;
}

const initialMembers: TeamMember[] = [
  { id: "junwoo", name: "김준우", avatar: "준", role: "owner" },
  { id: "jaejun", name: "김재준", avatar: "재", role: "editor" },
  { id: "jinpil", name: "김진필", avatar: "필", role: "editor" },
  { id: "jinhyun", name: "김진현", avatar: "현", role: "editor", warning: true },
  { id: "hyun", name: "안현", avatar: "안", role: "editor", warning: true }
];

const permissionLabels = {
  owner: "소유자",
  editor: "편집 가능",
  viewer: "보기 가능"
};

export function TeamInviteModal({ isOpen, onClose }: TeamInviteModalProps) {
  const [inviteValue, setInviteValue] = useState("");
  const [inviteMode, setInviteMode] = useState<"email" | "github">("email");
  const [members, setMembers] = useState(initialMembers);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [confirmTarget, setConfirmTarget] = useState<TeamMember | null>(null);

  // Current user always first, rest follow in original order
  const sortedMembers = useMemo(() => {
    const me = members.find((m) => m.id === CURRENT_USER_ID);
    const others = members.filter((m) => m.id !== CURRENT_USER_ID);
    return me ? [me, ...others] : others;
  }, [members]);

  if (!isOpen) return null;

  const canInvite = inviteValue.trim().length > 0;

  const handleInvite = () => {
    const values = inviteValue
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter(Boolean);

    if (values.length === 0) return;

    const invitedMembers = values.map((val, index) => ({
      id: `${Date.now()}-${index}`,
      name: val,
      avatar: val.charAt(0).toUpperCase(),
      role: "editor" as const,
      isGithub: inviteMode === "github",
    }));

    setMembers((prev) => [...invitedMembers, ...prev]);
    setInviteValue("");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard?.writeText("https://codedock.local/invite/secureflow-team");
    } catch {
      // Clipboard can be unavailable in previews. The visual confirmation still keeps the flow testable.
    }

    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  const handleRoleChange = (memberId: string, role: TeamMember["role"]) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, role } : member))
    );
  };

  const handleRemoveClick = (member: TeamMember) => {
    if (member.role === "owner") return;
    setConfirmTarget(member);
  };

  const handleConfirmRemove = () => {
    if (!confirmTarget) return;
    setMembers((prev) => prev.filter((member) => member.id !== confirmTarget.id));
    setConfirmTarget(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{
        background: "rgba(0, 0, 0, 0.62)",
        backdropFilter: "blur(10px)"
      }}
      role="dialog"
      aria-modal="true"
      aria-label="팀원 추가"
    >
      <div className="flex w-full max-w-[660px] flex-col gap-3">
      <div className="overflow-hidden rounded-[22px]" style={{
        background: "#ffffff",
        color: "#1f2937",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.44)"
      }}>
        <div className="flex items-center justify-between px-5 py-4" style={{
          borderBottom: "1px solid #e5e7eb"
        }}>
          <h2 className="m-0 tracking-tight" style={{
            color: "#111827",
            fontSize: "16px",
            fontWeight: 900
          }}>
            CodeDock 팀원 추가
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border-0 px-2 py-1 tracking-tight"
              style={{
                background: "transparent",
                color: "#5b5ff7",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 900
              }}
            >
              <Link2 size={16} />
              {copyState === "copied" ? "복사됨" : "링크 복사"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border-0"
              style={{ background: "transparent", color: "#374151", cursor: "pointer" }}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5" style={{ maxHeight: "58vh", overflowY: "auto" }}>
          {/* Mode toggle */}
          <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "#f3f4f6" }}>
            {(["email", "github"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setInviteMode(mode); setInviteValue(""); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 tracking-tight transition-all"
                style={{
                  background: inviteMode === mode ? "#ffffff" : "transparent",
                  color: inviteMode === mode ? "#111827" : "#6b7280",
                  fontSize: "13px",
                  fontWeight: 900,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: inviteMode === mode ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                }}
              >
                {mode === "email" ? <Mail size={14} /> : <Github size={14} />}
                {mode === "email" ? "이메일로 초대" : "GitHub ID로 초대"}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={inviteValue}
              onChange={(event) => setInviteValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleInvite();
                }
              }}
              placeholder={
                inviteMode === "email"
                  ? "쉼표 또는 세미콜론으로 구분된 이메일을 추가하여 초대하세요"
                  : "쉼표 또는 세미콜론으로 구분된 GitHub ID를 추가하여 초대하세요"
              }
              className="min-w-0 flex-1 rounded-lg px-4 py-3 outline-none"
              style={{
                border: "2px solid #6d5dfc",
                color: "#111827",
                fontSize: "14px",
                fontWeight: 700
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={!canInvite}
              className="rounded-lg border-0 px-5 py-3 tracking-tight"
              style={{
                background: canInvite ? "#6d5dfc" : "#d1d5db",
                color: "#ffffff",
                cursor: canInvite ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: 900
              }}
            >
              초대
            </button>
          </div>

          <p className="mb-3 mt-6 tracking-tight" style={{
            color: "#6b7280",
            fontSize: "13px",
            fontWeight: 900
          }}>
            액세스 권한이 있는 사람
          </p>

          <div className="grid gap-1">
            <AccessRow icon={<Lock size={18} />} title="초대받은 사람만" action={<ChevronRight size={16} />} />
            <AccessRow
              icon={<Folder size={18} />}
              title="CodeDock에 있는 모든 사람"
              meta="5명"
              action={<ChevronRight size={16} />}
            />

            {sortedMembers.map((member) => {
              const isMe = member.id === CURRENT_USER_ID;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-1 py-2"
                  style={{}}
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{
                    background: isMe ? "#ff5b8a" : member.isGithub ? "#24292e" : "linear-gradient(135deg, #20e3ff, #7c3aed)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 950
                  }}>
                    {member.isGithub ? <Github size={14} /> : member.avatar}
                  </div>

                  {/* Name */}
                  <span className="min-w-0 flex-1 truncate tracking-tight" style={{
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: 900
                  }}>
                    {member.name}
                    {isMe && (
                      <span style={{ color: "#374151", fontWeight: 700, fontSize: "13px", marginLeft: "6px" }}>
                        (나)
                      </span>
                    )}
                  </span>

                  {member.warning && !isMe && (
                    <AlertCircle size={18} style={{ color: "#f59e0b" }} />
                  )}

                  {/* Role / controls */}
                  {isMe ? (
                    <span className="tracking-tight" style={{ color: "#374151", fontSize: "13px", fontWeight: 900 }}>
                      {permissionLabels[member.role]}
                    </span>
                  ) : member.role === "owner" ? (
                    <span className="tracking-tight" style={{ color: "#374151", fontSize: "13px", fontWeight: 900 }}>
                      {permissionLabels.owner}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={member.role}
                        onChange={(event) => handleRoleChange(member.id, event.target.value as TeamMember["role"])}
                        className="rounded-lg border-0 px-2 py-1 outline-none"
                        style={{
                          background: "#ffffff",
                          color: "#374151",
                          fontSize: "13px",
                          fontWeight: 900,
                          cursor: "pointer"
                        }}
                        aria-label={`${member.name} 권한`}
                      >
                        <option value="editor">{permissionLabels.editor}</option>
                        <option value="viewer">{permissionLabels.viewer}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveClick(member)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-0"
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#ef4444",
                          cursor: "pointer"
                        }}
                        aria-label={`${member.name} 삭제`}
                        title={`${member.name} 삭제`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[22px]"
        style={{
          background: "#ffffff",
          color: "#1f2937",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.34)"
        }}
      >
        <AccessRow icon={<Folder size={18} />} title="템플릿 게시" action={<ChevronRight size={16} />} padded />
        <AccessRow icon={<Globe2 size={18} />} title="커뮤니티에 게시하기" action={<ChevronRight size={16} />} padded />
        <AccessRow
          icon={<Play size={18} />}
          title="전체 화면 보기 링크 복사"
          subtitle="AI 채팅 기록 액세스가 포함됩니다"
          action={<Copy size={16} />}
          padded
        />
      </div>
      </div>

      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmTarget(null)}
          >
            <motion.div
              className="w-full max-w-[400px] rounded-[22px] px-7 py-7"
              style={{
                background: "#ffffff",
                boxShadow: "0 28px 80px rgba(0, 0, 0, 0.40)",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{
                background: "rgba(239, 68, 68, 0.10)",
                border: "1px solid rgba(239, 68, 68, 0.25)"
              }}>
                <Trash2 size={22} style={{ color: "#ef4444" }} />
              </div>

              <h3 className="m-0 mb-2 tracking-tight" style={{ color: "#111827", fontSize: 18, fontWeight: 900 }}>
                정말 추방하시겠어요?
              </h3>
              <p className="m-0 mb-6 tracking-tight" style={{ color: "#6b7280", fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
                <span style={{ color: "#111827", fontWeight: 900 }}>{confirmTarget.name}</span>을(를) 팀에서
                제거합니다. 이 작업은 되돌릴 수 없습니다.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all hover:scale-[1.02]"
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 900
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 900,
                    boxShadow: "0 4px 16px rgba(239, 68, 68, 0.30)"
                  }}
                >
                  추방하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccessRow({
  icon,
  title,
  subtitle,
  meta,
  action,
  padded = false
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  action?: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${padded ? "px-5 py-4" : "px-1 py-2"}`}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{
        color: "#374151"
      }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate tracking-tight" style={{
          color: "#374151",
          fontSize: "14px",
          fontWeight: 900
        }}>
          {title}
        </p>
        {subtitle && (
          <p className="m-0 mt-0.5 truncate tracking-tight" style={{
            color: "#9ca3af",
            fontSize: "12px",
            fontWeight: 700
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {meta && (
        <span className="tracking-tight" style={{ color: "#374151", fontSize: "13px", fontWeight: 900 }}>
          {meta}
        </span>
      )}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center" style={{ color: "#374151" }}>
        {action}
      </div>
    </div>
  );
}
