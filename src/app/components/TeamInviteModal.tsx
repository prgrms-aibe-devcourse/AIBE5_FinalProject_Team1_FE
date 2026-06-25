import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (members: InviteDraft[]) => void;
  existingEmails?: string[]; // 이미 멤버이거나 대기 중인 이메일(추가/추천에서 제외)
  suggestions?: InviteDraft[]; // 추천 목록(예: 워크스페이스 레포의 GitHub 협업자)
  suggestionsLabel?: string;
}

export interface InviteDraft {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string; // 추천(협업자) 프로필 사진
  login?: string;     // GitHub 로그인(@login)
}

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

export function TeamInviteModal({ isOpen, onClose, onInvite, existingEmails, suggestions = [], suggestionsLabel = "추천 팀원" }: TeamInviteModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState(ROLE_OPTIONS[0]);
  const [invited, setInvited] = useState<InviteDraft[]>([]);
  const [addNotice, setAddNotice] = useState(""); // 추가 차단 사유 안내

  // 이미 멤버이거나 대기 중인 이메일 집합 — 중복 초대를 막는다
  const existingEmailSet = useMemo(
    () => new Set((existingEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean)),
    [existingEmails]
  );
  const isAlreadyInvitedOrMember = (email: string) => existingEmailSet.has(email.trim().toLowerCase());

  // 모달이 닫히면 입력/선택 상태를 초기화한다.
  // (컴포넌트가 isOpen 토글만 하고 계속 마운트돼 있어, 이전에 보낸 초대 목록이 다음 열람 때 남는 문제 방지)
  useEffect(() => {
    if (!isOpen) {
      setInvited([]);
      setEmailInput("");
      setRoleInput(ROLE_OPTIONS[0]);
      setAddNotice("");
    }
  }, [isOpen]);

  const handleAdd = () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) {
      setAddNotice("올바른 이메일 주소를 입력하세요.");
      return;
    }
    if (invited.some((m) => m.email === email)) {
      setAddNotice("이미 초대 목록에 추가된 이메일입니다.");
      return;
    }
    if (isAlreadyInvitedOrMember(email)) {
      setAddNotice("이미 팀원이거나 초대 대기 중인 이메일입니다.");
      setEmailInput("");
      return;
    }
    setInvited((prev) => [
      ...prev,
      { id: Date.now(), name: email.split("@")[0], email, role: roleInput },
    ]);
    setEmailInput("");
    setAddNotice("");
  };

  const handleToggleSuggested = (member: InviteDraft) => {
    if (isAlreadyInvitedOrMember(member.email)) return; // 이미 멤버/대기 중이면 토글 불가
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
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
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
                  background: "rgba(var(--codedock-primary-rgb), 0.06)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                }}
              >
                <p className="m-0 tracking-tight" style={{ color: "var(--white)", fontSize: "14px", fontWeight: 950 }}>
                  팀원을 초대하세요
                </p>
                <p className="m-0 mt-1 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750, lineHeight: 1.5 }}>
                  초대 메일을 발송합니다. 초대받은 팀원은 수락 후 팀에 합류됩니다.
                </p>
              </div>

              {/* 이메일 + 역할 + 추가 */}
              <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: "1fr 150px auto" }}>
                <input
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); if (addNotice) setAddNotice(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                  }}
                  autoFocus
                  placeholder="teammate@company.com"
                  className="min-w-0 rounded-xl px-4 py-3 outline-none tracking-tight"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.20)",
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
                    border: "1.5px solid rgba(var(--codedock-primary-rgb), 0.20)",
                    color: "var(--white)",
                    fontSize: "var(--krds-body-xsmall)",
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
                    background: "rgba(var(--codedock-primary-rgb), 0.12)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
                    color: "var(--neon-cyan)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 950,
                  }}
                >
                  추가
                </button>
              </div>

              {/* 추가 차단 사유 안내 */}
              {addNotice && (
                <p
                  className="m-0 mb-3 tracking-tight"
                  style={{ color: "#FFB4B4", fontSize: "var(--krds-body-xsmall)", fontWeight: 850 }}
                  role="alert"
                >
                  {addNotice}
                </p>
              )}

              {/* 추천(GitHub 협업자 등) */}
              <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                {suggestionsLabel}
              </p>
              {suggestions.length === 0 && (
                <p className="m-0 mb-4 rounded-xl px-4 py-3 tracking-tight" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                  초대할 수 있는 협업자가 없습니다. 위에 이메일을 입력해 초대하세요.
                </p>
              )}
              <div className="mb-4 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "248px" }}>
                {suggestions.map((member) => {
                  const selected = invited.some((m) => m.email === member.email);
                  const alreadyExisting = isAlreadyInvitedOrMember(member.email);
                  return (
                    <button
                      key={member.email}
                      type="button"
                      onClick={() => handleToggleSuggested(member)}
                      disabled={alreadyExisting}
                      className="flex w-full items-center gap-3 rounded-xl border-0 px-4 py-3 text-left transition-all"
                      style={{
                        background: selected ? "rgba(var(--codedock-secondary-rgb), 0.10)" : "rgba(255,255,255,0.03)",
                        border: selected ? "1px solid rgba(var(--codedock-secondary-rgb), 0.30)" : "1px solid rgba(255,255,255,0.07)",
                        cursor: alreadyExisting ? "not-allowed" : "pointer",
                        opacity: alreadyExisting ? 0.5 : 1,
                      }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                      ) : (
                        <span
                          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full"
                          style={{ background: "linear-gradient(135deg, var(--neon-cyan), var(--matrix-green))", color: "#021014", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}
                        >
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>
                          {member.name}
                          {member.login && (
                            <span style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 700 }}> @{member.login}</span>
                          )}
                        </span>
                        <span className="block truncate" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>{member.email}</span>
                      </span>
                      <span style={{ color: alreadyExisting ? "var(--muted)" : selected ? "var(--matrix-green)" : "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                        {alreadyExisting ? "이미 참여" : selected ? "선택됨" : "초대"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 선택된 팀원 목록 */}
              {invited.length > 0 && (
                <>
                  <p className="m-0 mb-2 tracking-tight" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 900 }}>
                    초대할 팀원 ({invited.length}명)
                  </p>
                  <div className="mb-5 grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "228px" }}>
                    {invited.map((member) => (
                      <div
                        key={member.email}
                        className="grid items-center gap-3 rounded-xl px-4 py-3 tracking-tight"
                        style={{
                          background: "rgba(234, 247, 255, 0.08)",
                          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                          gridTemplateColumns: "minmax(0, 1fr) 190px auto",
                        }}
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate" style={{ color: "var(--white)", fontSize: "13px", fontWeight: 950 }}>{member.name}</p>
                          <p className="m-0 truncate" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 750 }}>{member.email}</p>
                        </div>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.email, e.target.value)}
                          className="rounded-xl px-3 py-2 outline-none tracking-tight"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
                            color: "var(--white)",
                            fontSize: "var(--krds-body-xsmall)",
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
                    boxShadow: invited.length > 0 ? "0 4px 14px rgba(var(--codedock-primary-rgb), 0.28)" : "none",
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
