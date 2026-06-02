import { useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (members: InviteDraft[]) => void;
}

export interface InviteDraft {
  id: number;
  name: string;
  email: string;
  role: string;
}

const SUGGESTED_MEMBERS: InviteDraft[] = [
  { id: 1, name: "김재준", email: "jaejun@codedock.dev", role: "Tech Lead" },
  { id: 2, name: "김진아", email: "jinah@codedock.dev", role: "Backend Developer" },
  { id: 3, name: "김진현", email: "jinhyun@codedock.dev", role: "DevOps Engineer" },
  { id: 4, name: "안현",   email: "hyun@codedock.dev",   role: "QA Engineer" },
];

const ROLE_OPTIONS = [
  "Tech Lead",
  "Backend Developer",
  "Frontend Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Product Manager",
  "Designer",
  "Viewer",
];

export function TeamInviteModal({ isOpen, onClose, onInvite }: TeamInviteModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState(ROLE_OPTIONS[0]);
  const [invited, setInvited] = useState<InviteDraft[]>([]);

  const handleAdd = () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    if (invited.some((m) => m.email === email)) return;
    setInvited((prev) => [
      ...prev,
      { id: Date.now(), name: email.split("@")[0], email, role: roleInput },
    ]);
    setEmailInput("");
  };

  const handleToggleSuggested = (member: InviteDraft) => {
    setInvited((prev) =>
      prev.some((m) => m.email === member.email)
        ? prev.filter((m) => m.email !== member.email)
        : [...prev, { ...member }]
    );
  };

  const handleChangeRole = (email: string, role: string) => {
    setInvited((prev) =>
      prev.map((m) => (m.email === email ? { ...m, role } : m))
    );
  };

  const handleRemove = (email: string) => {
    setInvited((prev) => prev.filter((m) => m.email !== email));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[620px] overflow-hidden rounded-[24px]"
            style={{
              background: "rgba(8, 16, 32, 0.98)",
              border: "1px solid rgba(32, 227, 255, 0.18)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5">
              <h2
                className="m-0 tracking-[-0.06em]"
                style={{ fontSize: "22px", fontWeight: 950, color: "var(--white)" }}
              >
                팀원 추가
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border-0"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", cursor: "pointer" }}
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>

            {/* 본문 */}
            <div className="px-7 pb-7" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {/* 안내 배너 */}
              <div
                className="mb-5 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(32, 227, 255, 0.06)",
                  border: "1px solid rgba(32, 227, 255, 0.16)",
                }}
              >
                <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: "14px", fontWeight: 950 }}>
                  팀원을 초대하세요
                </p>
                <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 750, lineHeight: 1.5 }}>
                  초대 메일을 발송합니다. 초대받은 팀원은 수락 후 팀에 합류됩니다.
                </p>
              </div>

              {/* 이메일 + 역할 + 추가 */}
              <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: "1fr 150px auto" }}>
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
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
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="rounded-xl px-3 py-3 outline-none tracking-tight"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(32, 227, 255, 0.20)",
                    color: "var(--white)",
                    fontSize: "12px",
                    fontWeight: 850,
                  }}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAdd}
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

              {/* 추천 팀원 */}
              <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>
                추천 팀원
              </p>
              <div className="mb-4 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "248px" }}>
                {SUGGESTED_MEMBERS.map((member) => {
                  const selected = invited.some((m) => m.email === member.email);
                  return (
                    <button
                      key={member.email}
                      type="button"
                      onClick={() => handleToggleSuggested(member)}
                      className="flex w-full items-center gap-3 rounded-xl border-0 px-4 py-3 text-left transition-all"
                      style={{
                        background: selected ? "rgba(57, 255, 136, 0.10)" : "rgba(255,255,255,0.03)",
                        border: selected ? "1px solid rgba(57, 255, 136, 0.30)" : "1px solid rgba(255,255,255,0.07)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        className="grid flex-shrink-0 place-items-center rounded-full"
                        style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))", color: "#021014", fontSize: "12px", fontWeight: 950 }}
                      >
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

              {/* 선택된 팀원 목록 */}
              {invited.length > 0 && (
                <>
                  <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 900 }}>
                    초대할 팀원 ({invited.length}명)
                  </p>
                  <div className="mb-5 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "228px" }}>
                    {invited.map((member) => (
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
                          <p className="m-0 truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>{member.name}</p>
                          <p className="m-0 truncate" style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 750 }}>{member.email}</p>
                        </div>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.email, e.target.value)}
                          className="rounded-xl px-3 py-2 outline-none tracking-tight"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(32, 227, 255, 0.20)",
                            color: "var(--white)",
                            fontSize: "12px",
                            fontWeight: 850,
                          }}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role} style={{ background: "#121827", color: "#EAF7FF" }}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemove(member.email)}
                          className="grid place-items-center rounded-xl border-0"
                          style={{
                            width: 36, height: 36,
                            background: "rgba(255, 107, 107, 0.12)",
                            border: "1px solid rgba(255, 107, 107, 0.24)",
                            color: "#FF6B6B",
                            cursor: "pointer",
                          }}
                          aria-label={`${member.name} 제거`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 하단 버튼 */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border-0 py-3 tracking-tight"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (invited.length > 0) {
                      onInvite?.(invited);
                    }
                    onClose();
                  }}
                  className="flex-1 rounded-xl border-0 py-3 tracking-tight transition-all"
                  style={{
                    background: invited.length > 0
                      ? "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))"
                      : "rgba(255,255,255,0.08)",
                    color: invited.length > 0 ? "#021014" : "var(--muted)",
                    fontSize: "14px",
                    fontWeight: 900,
                    cursor: invited.length > 0 ? "pointer" : "not-allowed",
                    boxShadow: invited.length > 0 ? "0 4px 14px rgba(32, 227, 255, 0.28)" : "none",
                  }}
                >
                  {invited.length > 0 ? `${invited.length}명 초대하기` : "초대하기"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
