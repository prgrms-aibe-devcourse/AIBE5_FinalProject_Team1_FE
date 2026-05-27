import { useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ChevronRight, Copy, Folder, Globe2, Link2, Lock, Play, Trash2, X } from "lucide-react";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "editor" | "viewer";
  warning?: boolean;
}

const initialMembers: TeamMember[] = [
  { id: "jaejun", name: "김재준", avatar: "재", role: "editor" },
  { id: "jinpil", name: "김진필", avatar: "필", role: "editor" },
  { id: "junwoo", name: "김준우", avatar: "준", role: "owner" },
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
  const [members, setMembers] = useState(initialMembers);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  if (!isOpen) return null;

  const canInvite = inviteValue.trim().length > 0;

  const handleInvite = () => {
    const emails = inviteValue
      .split(";")
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length === 0) return;

    const invitedMembers = emails.map((email, index) => ({
      id: `${Date.now()}-${index}`,
      name: email,
      avatar: email.charAt(0).toUpperCase(),
      role: "editor" as const
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

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId || member.role === "owner"));
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
              placeholder="쉼표 또는 세미콜론으로 구분된 이메일을 추가하여 초대하세요"
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
                color: canInvite ? "#ffffff" : "#ffffff",
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

            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{
                  background: member.id === "junwoo" ? "#ff5b8a" : "linear-gradient(135deg, #20e3ff, #7c3aed)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 950
                }}>
                  {member.avatar}
                </div>
                <span className="min-w-0 flex-1 truncate tracking-tight" style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 900
                }}>
                  {member.name}
                </span>
                {member.warning && (
                  <AlertCircle size={18} style={{ color: "#f59e0b" }} />
                )}
                {member.role === "owner" ? (
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
                      onClick={() => handleRemoveMember(member.id)}
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
            ))}
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
