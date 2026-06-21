import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  Calendar,
  Camera,
  Code2,
  CheckCircle2,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  Link as LinkIcon,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  User,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";
import { useProfile, STATUS_OPTIONS, type ProfileUser, type ProfileStatus } from "../contexts/ProfileContext";
import { apiClient } from "../api/client";

type ProfileSection = "profile" | "account" | "github";

const SKILL_PRESETS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "Node.js",
  "Spring",
  "Java",
  "Python",
  "Go",
  "Docker",
  "PostgreSQL",
  "AWS",
  "GraphQL",
  "Tailwind CSS",
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = getProfileSection(searchParams.get("section"));
  const [activeSection, setActiveSection] = useState<ProfileSection>(initialSection);
  const { profile: user, setProfile: setUser, reloadProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    workspace: user.workspace,
    role: user.role,
    skills: user.skills,
    bio: user.bio,
  });

  useEffect(() => {
    if (!isEditing) {
      setFormData({
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        workspace: user.workspace,
        role: user.role,
        skills: user.skills,
        bio: user.bio,
      });
    }
  }, [user, isEditing]);

  useEffect(() => {
    setActiveSection(getProfileSection(searchParams.get("section")));
  }, [searchParams]);

  const sections = useMemo(
    () => [
      { id: "profile" as const, label: "프로필 정보", icon: UserRound },
      { id: "account" as const, label: "계정 보안", icon: ShieldCheck },
      { id: "github" as const, label: "GitHub 연동", icon: Github },
    ],
    [],
  );

  const handleSectionChange = (section: ProfileSection) => {
    setActiveSection(section);
    setSearchParams(section === "profile" ? {} : { section });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.patch<{
        displayName: string | null;
        nickname: string | null;
        developerType: string | null;
        bio: string | null;
        avatarUrl: string | null;
      }>("/api/v1/users/me", {
        displayName: formData.name,
        nickname: formData.nickname,
        developerType: formData.role,
        bio: formData.bio,
        avatarUrl: user.avatarUrl,
      });
      const savedSkills = await apiClient.put<string[]>("/api/v1/users/me/skills", {
        skills: formData.skills,
      });
      const nextNickname = updated.nickname ?? formData.nickname.trim();
      setUser((current) => ({
        ...current,
        name: updated.displayName ?? "",
        nickname: nextNickname,
        role: updated.developerType ?? "",
        workspace: nextNickname,
        bio: updated.bio ?? "",
        avatarUrl: updated.avatarUrl ?? "",
        skills: savedSkills ?? [],
      }));
      setIsEditing(false);
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      workspace: user.workspace,
      role: user.role,
      skills: user.skills,
      bio: user.bio,
    });
    setIsEditing(false);
  };

  const handleStatusChange = (status: ProfileStatus) => {
    setUser((current) => ({ ...current, status }));
  };

  const handleAvatarChange = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUser((current) => ({
        ...current,
        avatarUrl: typeof reader.result === "string" ? reader.result : current.avatarUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    setUser((current) => ({
      ...current,
      avatarUrl: "",
    }));
  };

  const handleGithubConnect = async () => {
    const popup = window.open("", "gh-connect", "width=600,height=720");
    if (!popup) {
      alert("팝업을 허용해주세요.");
      return;
    }
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== "github-connect") return;
      finish();
      if (data.status === "success") {
        void reloadProfile();
      } else if (data.status === "conflict") {
        alert("이미 다른 계정에 연결된 GitHub입니다.");
      } else {
        alert("GitHub 연결에 실패했습니다.");
      }
    };
    const timer = window.setInterval(() => {
      if (popup.closed) finish();
    }, 500);
    function finish() {
      window.removeEventListener("message", handler);
      window.clearInterval(timer);
    }
    window.addEventListener("message", handler);
    try {
      const { authorizeUrl } = await apiClient.post<{ authorizeUrl: string }>("/api/v1/users/me/github/connect/start");
      popup.location.href = authorizeUrl;
    } catch {
      finish();
      popup.close();
      alert("GitHub 연결을 시작하지 못했습니다.");
    }
  };

  const handleGithubDisconnect = async () => {
    if (!window.confirm("GitHub 연동을 해제하시겠습니까?")) return;
    try {
      await apiClient.delete("/api/v1/users/me/github");
      await reloadProfile();
    } catch {
      alert("GitHub 연동 해제에 실패했습니다.");
    }
  };

  return (
    <div className="mx-auto w-[min(1120px,calc(100vw-36px))] py-12 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 tracking-tight transition-colors hover:text-white"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px', fontWeight: 800, padding: 0 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        뒤로
      </button>
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto]"
      >
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex }}>
            <UserRound size={15} />
            <span className="text-sm font-black">Account Center</span>
          </div>
          <h1 className="m-0 text-[clamp(40px,6vw,72px)] font-black leading-none" style={{ color: "var(--white)", textShadow: `0 0 22px ${colors.primary}, 0.18)` }}>
            프로필
          </h1>
          <p className="m-0 mt-4 max-w-[680px] text-base font-bold leading-[1.65]" style={{ color: "var(--muted)" }}>
            계정 정보, 비밀번호 찾기, GitHub 연동 상태를 한 곳에서 관리합니다.
          </p>
        </div>

        <ProfileSummary user={user} />
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: 0.05, ease: "easeOut" }}
          className="h-fit rounded-[28px] p-3"
          style={{
            background: "rgba(11, 22, 40, 0.76)",
            border: `1px solid ${colors.primary}, 0.16)`,
            boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
            backdropFilter: "blur(18px) saturate(180%)",
          }}
        >
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionChange(section.id)}
                className="relative mb-2 flex w-full items-center gap-3 rounded-2xl border-0 px-4 py-3 text-left"
                style={{
                  background: active ? `linear-gradient(135deg, ${colors.primary}, 0.18), rgba(234,247,255,0.055))` : "transparent",
                  color: active ? "var(--white)" : "var(--muted)",
                  cursor: "pointer",
                  fontWeight: active ? 950 : 850,
                }}
              >
                <Icon size={18} style={{ color: active ? colors.primaryHex : "var(--muted)" }} />
                {section.label}
              </button>
            );
          })}
        </motion.aside>

        <motion.main
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          {activeSection === "profile" && (
            <ProfileInfoSection
              colors={colors}
              formData={formData}
              isEditing={isEditing}
              userName={user.nickname || user.name}
              avatarUrl={user.avatarUrl}
              status={user.status}
              onStatusChange={handleStatusChange}
              onChange={setFormData}
              onAvatarChange={handleAvatarChange}
              onAvatarRemove={handleAvatarRemove}
              onCancel={handleCancel}
              onEdit={() => setIsEditing(true)}
              onSubmit={handleSave}
            />
          )}

          {activeSection === "account" && <AccountSecuritySection user={user} colors={colors} />}

          {activeSection === "github" && (
            <GithubSection
              user={user}
              colors={colors}
              onConnect={handleGithubConnect}
              onDisconnect={handleGithubDisconnect}
            />
          )}
        </motion.main>
      </div>
    </div>
  );
}

function getProfileSection(value: string | null): ProfileSection {
  if (value === "account" || value === "github") return value;
  return "profile";
}

interface ThemeColors {
  primary: string;
  primaryHex: string;
  secondary: string;
}

function ProfileSummary({ user }: { user: ProfileUser }) {
  const displayName = user.nickname.trim() || user.name;
  const initial = displayName.trim().slice(0, 1) || "C";
  const status = STATUS_OPTIONS.find((option) => option.id === user.status) ?? STATUS_OPTIONS[0];

  return (
    <div className="flex min-w-[260px] items-center gap-4 rounded-[28px] px-5 py-4" style={{ background: "rgba(11,22,40,0.72)", border: "1px solid rgba(32,227,255,0.16)" }}>
      <div className="relative h-14 w-14 flex-shrink-0">
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full text-lg font-black" style={{ background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))", color: "#021014" }}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
        </div>
        <span
          className="absolute bottom-0 right-0 h-4 w-4 rounded-full"
          style={{ background: status.color, border: "2px solid rgba(11,22,40,0.95)", boxShadow: `0 0 8px ${status.color}` }}
          title={status.label}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="m-0 truncate text-base font-black" style={{ color: "var(--white)" }}>
            {displayName}
          </p>
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" style={{ background: `${status.color}1F`, color: status.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>
        <p className="m-0 mt-1 truncate text-sm font-bold" style={{ color: "var(--muted)" }}>
          {user.name} · {user.workspace} · {user.role}
        </p>
      </div>
    </div>
  );
}

interface ProfileInfoSectionProps {
  colors: ThemeColors;
  formData: {
    name: string;
    nickname: string;
    email: string;
    workspace: string;
    role: string;
    skills: string[];
    bio: string;
  };
  isEditing: boolean;
  userName: string;
  avatarUrl: string;
  status: ProfileStatus;
  onStatusChange: (status: ProfileStatus) => void;
  onChange: (value: ProfileInfoSectionProps["formData"]) => void;
  onAvatarChange: (file: File) => void;
  onAvatarRemove: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function ProfileInfoSection({
  colors,
  formData,
  isEditing,
  userName,
  avatarUrl,
  status,
  onStatusChange,
  onChange,
  onAvatarChange,
  onAvatarRemove,
  onCancel,
  onEdit,
  onSubmit,
}: ProfileInfoSectionProps) {
  return (
    <Panel colors={colors} title="프로필 정보" description="서비스에 표시되는 기본 정보를 관리합니다.">
      <div className="grid gap-5">
        <StatusField value={status} onChange={onStatusChange} colors={colors} />

        <form onSubmit={onSubmit} className="grid gap-5">
          <AvatarEditor
            avatarUrl={avatarUrl}
            userName={userName}
            colors={colors}
            onAvatarChange={onAvatarChange}
            onAvatarRemove={onAvatarRemove}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <ProfileField icon={User} label="이름" value={formData.name} disabled={!isEditing} onChange={(name) => onChange({ ...formData, name })} />
            <ProfileField icon={UserRound} label="닉네임" value={formData.nickname} disabled={!isEditing} onChange={(nickname) => onChange({ ...formData, nickname, workspace: nickname })} />
            <ProfileField icon={Mail} label="이메일" value={formData.email} disabled onChange={(email) => onChange({ ...formData, email })} type="email" />
            <ProfileField icon={UsersRound} label="워크스페이스" value={formData.workspace} disabled={!isEditing} onChange={(workspace) => onChange({ ...formData, workspace })} />
            <DeveloperRoleField value={formData.role} disabled={!isEditing} onChange={(role) => onChange({ ...formData, role })} colors={colors} />
            <SkillTagsField value={formData.skills} disabled={!isEditing} onChange={(skills) => onChange({ ...formData, skills })} colors={colors} />
            <BioField value={formData.bio} disabled={!isEditing} onChange={(bio) => onChange({ ...formData, bio })} />
          </div>

        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <button type="button" onClick={onCancel} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: "rgba(234,247,255,0.06)", color: "var(--muted)", cursor: "pointer" }}>
                취소
              </button>
              <button type="submit" className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014", cursor: "pointer" }}>
                저장
              </button>
            </>
          ) : (
            <button type="button" onClick={onEdit} className="rounded-xl border-0 px-4 py-2 text-sm font-black" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex, cursor: "pointer" }}>
              수정
            </button>
          )}
          </div>
        </form>
      </div>
    </Panel>
  );
}

function AvatarEditor({
  avatarUrl,
  userName,
  colors,
  onAvatarChange,
  onAvatarRemove,
}: {
  avatarUrl: string;
  userName: string;
  colors: ThemeColors;
  onAvatarChange: (file: File) => void;
  onAvatarRemove: () => void;
}) {
  const initial = userName.trim().slice(0, 1) || "C";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarChange(file);
    }
    event.target.value = "";
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => fileInputRef.current?.click();

  return (
    <div
      className="flex flex-col gap-5 rounded-[24px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openPicker}
          aria-label="프로필 사진 변경"
          className="group relative grid h-24 w-24 flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-0 text-3xl font-black transition hover:scale-[1.03]"
          style={{
            background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
            color: "#021014",
            boxShadow: `0 0 24px ${colors.primary}, 0.20)`,
          }}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : initial}
          <span
            className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100"
            style={{ background: "rgba(5,11,20,0.46)" }}
          >
            <Camera size={22} style={{ color: "#EAF7FF" }} />
          </span>
        </button>
        <div>
          <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
            프로필 사진
          </p>
          <p className="m-0 mt-2 text-sm font-bold leading-[1.55]" style={{ color: "var(--muted)" }}>
            사진을 클릭하거나 아래 버튼으로 JPG, PNG 이미지를 선택하면 바로 미리보기에 반영됩니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-xl border-0 px-4 py-2 text-sm font-black"
          style={{ background: `${colors.primary}, 0.10)`, border: `1px solid ${colors.primary}, 0.22)`, color: colors.primaryHex, cursor: "pointer" }}
        >
          <Camera size={16} />
          사진 변경
        </button>
        <button
          type="button"
          onClick={onAvatarRemove}
          disabled={!avatarUrl}
          className="inline-flex items-center gap-2 rounded-xl border-0 px-4 py-2 text-sm font-black"
          style={{
            background: avatarUrl ? "rgba(255,107,107,0.10)" : "rgba(234,247,255,0.055)",
            border: avatarUrl ? "1px solid rgba(255,107,107,0.26)" : "1px solid rgba(234,247,255,0.10)",
            color: avatarUrl ? "#FF6B6B" : "var(--muted)",
            cursor: avatarUrl ? "pointer" : "not-allowed",
          }}
        >
          <Trash2 size={16} />
          삭제
        </button>
      </div>
    </div>
  );
}

function AccountSecuritySection({ user, colors }: { user: ProfileUser; colors: ThemeColors }) {
  return (
    <Panel colors={colors} title="계정 보안" description="비밀번호 찾기는 확인된 이메일로 보내는 재설정 링크로 처리합니다.">
      <div className="grid gap-4">
        <ActionCard
          icon={KeyRound}
          title="비밀번호 찾기"
          body={`${user.recoveryEmail}로 재설정 링크를 받아 새 비밀번호를 설정할 수 있습니다.`}
          to="/forgot-password"
          button="비밀번호 찾기"
          colors={colors}
        />
      </div>

      <PasswordChangeForm colors={colors} />

      <div className="mt-5 rounded-[20px] px-5 py-4" style={{ background: "rgba(57,255,136,0.08)", border: "1px solid rgba(57,255,136,0.18)" }}>
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} style={{ color: "var(--matrix-green)", flexShrink: 0 }} />
          <p className="m-0 text-sm font-bold leading-[1.65]" style={{ color: "var(--muted)" }}>
            계정 이메일은 로그인에 그대로 사용되며, 보안 복구는 비밀번호 찾기 흐름으로 제공합니다.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function PasswordChangeForm({ colors }: { colors: ThemeColors }) {
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [visible, setVisible] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const isNextValid = passwords.next.length >= 8 && /[A-Za-z]/.test(passwords.next) && /\d/.test(passwords.next);
  const isConfirmReady = passwords.confirm.length > 0;
  const isSameAsCurrent = passwords.current.length > 0 && passwords.current === passwords.next;
  const isConfirmMatched = isConfirmReady && passwords.next === passwords.confirm;
  const canSubmit = passwords.current.length > 0 && isNextValid && isConfirmMatched && !isSameAsCurrent;

  const handleChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitMessage("입력한 비밀번호 조건을 다시 확인해주세요.");
      setSubmitStatus("error");
      return;
    }

    setPasswords({ current: "", next: "", confirm: "" });
    setSubmitMessage("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요.");
    setSubmitStatus("success");
  };

  const updatePassword = (key: keyof typeof passwords, value: string) => {
    setSubmitMessage("");
    setSubmitStatus("idle");
    setPasswords((current) => ({ ...current, [key]: value }));
  };

  const toggleVisible = (key: keyof typeof visible) => {
    setVisible((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <form
      onSubmit={handleChangePassword}
      className="mt-5 rounded-[24px] px-5 py-5"
      style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl"
          style={{ background: `${colors.primary}, 0.10)`, border: `1px solid ${colors.primary}, 0.20)`, color: colors.primaryHex }}
        >
          <Lock size={20} />
        </span>
        <div>
          <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
            비밀번호 변경
          </p>
          <p className="m-0 mt-1 text-sm font-bold leading-[1.55]" style={{ color: "var(--muted)" }}>
            현재 비밀번호를 확인한 뒤 새 비밀번호를 설정합니다.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <PasswordField
          label="현재 비밀번호"
          value={passwords.current}
          visible={visible.current}
          onChange={(value) => updatePassword("current", value)}
          onToggleVisible={() => toggleVisible("current")}
        />
        <PasswordField
          label="새 비밀번호"
          value={passwords.next}
          visible={visible.next}
          onChange={(value) => updatePassword("next", value)}
          onToggleVisible={() => toggleVisible("next")}
        />
        <PasswordField
          label="새 비밀번호 확인"
          value={passwords.confirm}
          visible={visible.confirm}
          onChange={(value) => updatePassword("confirm", value)}
          onToggleVisible={() => toggleVisible("confirm")}
        />
      </div>

      <div className="mt-4 grid gap-2">
        <PasswordRule done={passwords.next.length >= 8} label="8자 이상" />
        <PasswordRule done={/[A-Za-z]/.test(passwords.next) && /\d/.test(passwords.next)} label="영문과 숫자 포함" />
        <PasswordRule done={passwords.current.length > 0 && passwords.next.length > 0 && !isSameAsCurrent} label="현재 비밀번호와 다르게 설정" />
        <PasswordRule done={isConfirmMatched} label="새 비밀번호 확인 일치" />
      </div>

      {submitMessage && (
        <p
          className="mt-4 rounded-2xl px-4 py-3 text-sm font-black leading-[1.5]"
          style={{
            background: submitStatus === "success" ? "rgba(57,255,136,0.10)" : "rgba(255,107,107,0.10)",
            border: submitStatus === "success" ? "1px solid rgba(57,255,136,0.22)" : "1px solid rgba(255,107,107,0.22)",
            color: submitStatus === "success" ? "#B7FFE3" : "#FFB4B4",
          }}
        >
          {submitMessage}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-2xl border-0 px-5 py-3 text-sm font-black"
          style={{
            background: canSubmit ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})` : "rgba(234,247,255,0.08)",
            color: canSubmit ? "#021014" : "var(--muted)",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          비밀번호 변경
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onChange,
  onToggleVisible,
}: {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black" style={{ color: "var(--white)" }}>
        {label}
      </span>
      <span className="relative block">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: "var(--muted)" }} />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="codedock-auth-input h-14 w-full rounded-2xl px-12 py-3 pr-12 outline-none"
          style={{
            background: "rgba(5, 11, 20, 0.54)",
            border: "1px solid rgba(32, 227, 255, 0.14)",
            color: "var(--white)",
            fontSize: "14px",
            fontWeight: 800,
          }}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl border-0 bg-transparent"
          style={{ color: "var(--muted)", cursor: "pointer" }}
          aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

function PasswordRule({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-black" style={{ color: done ? "#B7FFE3" : "var(--muted)" }}>
      <CheckCircle2 size={14} style={{ color: done ? "var(--matrix-green)" : "rgba(234,247,255,0.28)" }} />
      {label}
    </div>
  );
}

function GithubSection({ user, colors, onConnect, onDisconnect }: { user: ProfileUser; colors: ThemeColors; onConnect: () => void; onDisconnect: () => void }) {
  return (
    <Panel colors={colors} title="GitHub 연동 관리" description="PR, 이슈, 리포지토리 동기화를 위한 GitHub 계정 연결 상태를 관리합니다.">
      {user.githubConnected ? (
        <div className="grid gap-5">
          <div className="rounded-[24px] px-6 py-5" style={{ background: "rgba(57,255,136,0.08)", border: "1px solid rgba(57,255,136,0.22)" }}>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={24} style={{ color: "var(--matrix-green)", flexShrink: 0 }} />
              <div>
                <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
                  GitHub 계정이 연결되어 있습니다.
                </p>
                <p className="m-0 mt-1 text-sm font-bold" style={{ color: "var(--muted)" }}>
                  PR 분석, 이슈 동기화, 리포지토리 가져오기를 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile icon={Github} label="GitHub 사용자명" value={`@${user.githubUsername}`} colors={colors} />
            <InfoTile icon={Mail} label="GitHub 이메일" value={user.githubEmail || "비공개"} colors={colors} />
            <InfoTile icon={Calendar} label="연동일" value={user.connectedAt} colors={colors} />
          </div>

          <div className="rounded-[20px] px-5 py-4" style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}>
            <p className="m-0 mb-3 text-sm font-black" style={{ color: "var(--white)" }}>
              현재 연동 권한
            </p>
            <div className="flex flex-wrap gap-2">
              {["Repository 읽기", "Pull Request 읽기", "Issue 읽기", "Webhook 이벤트"].map((scope) => (
                <span key={scope} className="rounded-full px-3 py-1 text-xs font-black" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex }}>
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <button type="button" onClick={onDisconnect} disabled={!user.hasPassword} title={!user.hasPassword ? "GitHub로 가입한 계정은 GitHub 연동을 해제할 수 없습니다." : undefined} className="rounded-2xl border-0 px-5 py-3 text-sm font-black" style={{ background: "rgba(255,107,107,0.10)", color: "#FF6B6B", border: "1px solid rgba(255,107,107,0.28)", cursor: user.hasPassword ? "pointer" : "not-allowed", opacity: user.hasPassword ? 1 : 0.5 }}>
            GitHub 연동 해제
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="rounded-[24px] px-6 py-5" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.20)" }}>
            <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
              GitHub 계정이 아직 연결되지 않았습니다.
            </p>
            <p className="m-0 mt-2 text-sm font-bold leading-[1.65]" style={{ color: "var(--muted)" }}>
              연결하면 리포지토리 가져오기, PR 리뷰, 이슈 동기화 흐름을 바로 사용할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={onConnect} disabled={!user.hasPassword} title={!user.hasPassword ? "GitHub로 가입한 계정은 GitHub 연동을 변경할 수 없습니다." : undefined} className="flex items-center justify-center gap-2 rounded-2xl border-0 px-5 py-4 text-base font-black" style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014", cursor: user.hasPassword ? "pointer" : "not-allowed", opacity: user.hasPassword ? 1 : 0.5 }}>
            <Github size={20} />
            GitHub 계정 연결하기
          </button>
        </div>
      )}
    </Panel>
  );
}

function Panel({ colors, title, description, children }: { colors: ThemeColors; title: string; description: string; children: ReactNode }) {
  return (
    <section
      className="rounded-[30px] px-7 py-7"
      style={{
        background: "rgba(11, 22, 40, 0.76)",
        border: `1px solid ${colors.primary}, 0.16)`,
        boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
        backdropFilter: "blur(18px) saturate(180%)",
      }}
    >
      <div className="mb-6">
        <h2 className="m-0 text-[clamp(24px,3vw,34px)] font-black leading-none" style={{ color: "var(--white)" }}>
          {title}
        </h2>
        <p className="m-0 mt-3 text-sm font-bold leading-[1.6]" style={{ color: "var(--muted)" }}>
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function StatusField({
  value,
  onChange,
  colors,
}: {
  value: ProfileStatus;
  onChange: (status: ProfileStatus) => void;
  colors: ThemeColors;
}) {
  return (
    <div
      className="grid gap-3 rounded-[24px] px-5 py-5"
      style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}
    >
      <div>
        <p className="m-0 text-base font-black" style={{ color: "var(--white)" }}>
          상태
        </p>
        <p className="m-0 mt-1 text-sm font-bold leading-[1.55]" style={{ color: "var(--muted)" }}>
          팀에게 보여줄 현재 가용 상태입니다. 선택하면 바로 저장됩니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className="inline-flex items-center gap-2 rounded-full border-0 px-4 py-2 text-sm font-black transition"
              style={{
                background: active ? `${option.color}1F` : "rgba(234,247,255,0.06)",
                border: active ? `1px solid ${option.color}` : `1px solid ${colors.primary}, 0.16)`,
                color: active ? "var(--white)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: option.color, boxShadow: active ? `0 0 10px ${option.color}` : "none" }}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkillTagsField({
  value,
  disabled,
  onChange,
  colors,
}: {
  value: string[];
  disabled: boolean;
  onChange: (skills: string[]) => void;
  colors: ThemeColors;
}) {
  const [draft, setDraft] = useState("");

  const toggleSkill = (skill: string) => {
    if (value.includes(skill)) {
      onChange(value.filter((item) => item !== skill));
    } else {
      onChange([...value, skill]);
    }
  };

  const removeSkill = (skill: string) => onChange(value.filter((item) => item !== skill));

  const addCustomSkill = () => {
    const next = draft.trim();
    if (!next) return;
    if (!value.some((item) => item.toLowerCase() === next.toLowerCase())) {
      onChange([...value, next]);
    }
    setDraft("");
  };

  return (
    <div className="grid gap-3 md:col-span-2">
      <span className="text-sm font-black" style={{ color: "var(--white)" }}>
        기술 스택
      </span>

      <div className="flex flex-wrap gap-2">
        {value.length === 0 && (
          <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
            선택된 기술이 없습니다.
          </span>
        )}
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black"
            style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014" }}
          >
            {skill}
            {!disabled && (
              <button
                type="button"
                aria-label={`${skill} 제거`}
                onClick={() => removeSkill(skill)}
                className="grid h-4 w-4 place-items-center rounded-full border-0"
                style={{ background: "rgba(2,16,20,0.28)", color: "#021014", cursor: "pointer" }}
              >
                <X size={11} strokeWidth={3} />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <>
          <div className="flex flex-wrap gap-2">
            {SKILL_PRESETS.map((skill) => {
              const active = value.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSkill(skill)}
                  className="rounded-full border-0 px-3 py-1.5 text-xs font-black transition"
                  style={{
                    background: active ? `${colors.primary}, 0.18)` : "rgba(234,247,255,0.06)",
                    border: active ? `1px solid ${colors.primary}, 0.4)` : `1px solid ${colors.primary}, 0.14)`,
                    color: active ? colors.primaryHex : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {active ? "− " : "+ "}
                  {skill}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="직접 입력 후 Enter (예: Redis)"
              className="codedock-auth-input h-12 flex-1 rounded-2xl px-4 outline-none"
              style={{
                background: "rgba(5, 11, 20, 0.62)",
                border: "1px solid rgba(32, 227, 255, 0.16)",
                color: "var(--white)",
                fontSize: "14px",
                fontWeight: 800,
              }}
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="rounded-2xl border-0 px-4 text-sm font-black"
              style={{ background: `${colors.primary}, 0.12)`, color: colors.primaryHex, cursor: "pointer" }}
            >
              추가
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BioField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const maxLength = 160;

  return (
    <div className="grid gap-2 md:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: "var(--white)" }}>
          자기소개
        </span>
        <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        placeholder="팀에게 보여줄 한두 줄 소개를 적어주세요."
        className="codedock-auth-input w-full resize-none rounded-2xl px-4 py-3 outline-none"
        style={{
          background: disabled ? "rgba(5, 11, 20, 0.34)" : "rgba(5, 11, 20, 0.62)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
          color: "var(--white)",
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: 1.6,
          cursor: disabled ? "default" : "text",
        }}
      />
    </div>
  );
}

const DEVELOPER_ROLES = ["프론트엔드", "백엔드", "풀스택", "DevOps", "모바일", "AI/ML", "데이터"];

function parseDeveloperRoles(value: string) {
  return value
    .split(/\s*(?:,|;|·)\s*/g)
    .map((role) => role.trim())
    .filter(Boolean);
}

function serializeDeveloperRoles(roles: string[]) {
  const deduped = roles.reduce<string[]>((acc, role) => {
    const next = role.trim();
    if (!next) return acc;
    if (!acc.some((item) => item.toLowerCase() === next.toLowerCase())) {
      acc.push(next);
    }
    return acc;
  }, []);

  return deduped.join(", ");
}

function DeveloperRoleField({
  value,
  disabled,
  onChange,
  colors,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  colors: ThemeColors;
}) {
  const [draft, setDraft] = useState("");
  const selectedRoles = parseDeveloperRoles(value);

  const updateRoles = (roles: string[]) => onChange(serializeDeveloperRoles(roles));

  const toggleRole = (role: string) => {
    if (selectedRoles.some((item) => item.toLowerCase() === role.toLowerCase())) {
      updateRoles(selectedRoles.filter((item) => item.toLowerCase() !== role.toLowerCase()));
    } else {
      updateRoles([...selectedRoles, role]);
    }
  };

  const removeRole = (role: string) => {
    updateRoles(selectedRoles.filter((item) => item.toLowerCase() !== role.toLowerCase()));
  };

  const addCustomRole = () => {
    const next = draft.trim();
    if (!next) return;
    updateRoles([...selectedRoles, next]);
    setDraft("");
  };

  return (
    <div className="grid gap-3 md:col-span-2">
      <span className="text-sm font-black" style={{ color: "var(--white)" }}>
        개발자 유형
      </span>

      <div className="flex flex-wrap gap-2">
        {selectedRoles.length === 0 && (
          <span className="text-sm font-bold" style={{ color: "var(--muted)" }}>
            선택 안 함
          </span>
        )}
        {selectedRoles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black"
            style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014" }}
          >
            {role}
            {!disabled && (
              <button
                type="button"
                aria-label={`${role} 제거`}
                onClick={() => removeRole(role)}
                className="grid h-4 w-4 place-items-center rounded-full border-0"
                style={{ background: "rgba(2,16,20,0.28)", color: "#021014", cursor: "pointer" }}
              >
                <X size={11} strokeWidth={3} />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <>
          <div className="flex flex-wrap gap-2">
            {DEVELOPER_ROLES.map((role) => {
              const active = selectedRoles.some((item) => item.toLowerCase() === role.toLowerCase());
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleRole(role)}
                  className="rounded-full border-0 px-4 py-2 text-sm font-black transition"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`
                      : "rgba(234,247,255,0.06)",
                    border: active ? "1px solid transparent" : `1px solid ${colors.primary}, 0.16)`,
                    color: active ? "#021014" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {active ? "✓ " : "+ "}
                  {role}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
          <span className="relative block flex-1">
            <Code2
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={19}
              style={{ color: draft.trim() ? colors.primaryHex : "var(--muted)" }}
            />
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomRole();
                }
              }}
              placeholder="직접 입력 후 Enter (예: 플랫폼 엔지니어)"
              className="codedock-auth-input h-14 w-full rounded-2xl px-12 py-3 outline-none"
              style={{
                background: "rgba(5, 11, 20, 0.62)",
                border: draft.trim() ? `1px solid ${colors.primary}, 0.34)` : "1px solid rgba(32, 227, 255, 0.16)",
                color: "var(--white)",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "text",
              }}
            />
          </span>
            <button
              type="button"
              onClick={addCustomRole}
              className="rounded-2xl border-0 px-4 text-sm font-black"
              style={{ background: `${colors.primary}, 0.12)`, color: colors.primaryHex, cursor: "pointer" }}
            >
              추가
            </button>
          </div>

          <span className="text-xs font-bold leading-[1.5]" style={{ color: "var(--muted)" }}>
            위 칩에서 여러 개를 선택하거나, 직접 입력 후 Enter로 유형을 추가할 수 있어요.
          </span>
        </>
      )}
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, disabled, onChange, type = "text" }: { icon: LucideIcon; label: string; value: string; disabled: boolean; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black" style={{ color: "var(--white)" }}>
        {label}
      </span>
      <span className="relative block">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2" size={19} style={{ color: "var(--muted)" }} />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="codedock-auth-input h-14 w-full rounded-2xl px-12 py-3 outline-none"
          style={{
            background: disabled ? "rgba(5, 11, 20, 0.34)" : "rgba(5, 11, 20, 0.62)",
            border: "1px solid rgba(32, 227, 255, 0.16)",
            color: "var(--white)",
            fontSize: "15px",
            fontWeight: 800,
            cursor: disabled ? "default" : "text",
          }}
        />
      </span>
    </label>
  );
}

function ActionCard({ icon: Icon, title, body, to, button, colors }: { icon: LucideIcon; title: string; body: string; to: string; button: string; colors: ThemeColors }) {
  return (
    <div className="rounded-[24px] px-5 py-5" style={{ background: "rgba(234,247,255,0.045)", border: `1px solid ${colors.primary}, 0.12)` }}>
      <Icon size={24} style={{ color: colors.primaryHex }} />
      <h3 className="m-0 mt-4 text-lg font-black" style={{ color: "var(--white)" }}>
        {title}
      </h3>
      <p className="m-0 mt-2 min-h-[68px] text-sm font-bold leading-[1.6]" style={{ color: "var(--muted)" }}>
        {body}
      </p>
      <Link to={to} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black no-underline" style={{ background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`, color: "#021014" }}>
        <LinkIcon size={15} />
        {button}
      </Link>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, colors }: { icon: LucideIcon; label: string; value: string; colors: ThemeColors }) {
  return (
    <div className="rounded-[20px] px-4 py-4" style={{ background: "rgba(5,11,20,0.42)", border: `1px solid ${colors.primary}, 0.12)` }}>
      <Icon size={19} style={{ color: colors.primaryHex }} />
      <p className="m-0 mt-3 text-xs font-black" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="m-0 mt-1 truncate text-sm font-black" style={{ color: value === "비공개" ? "var(--muted)" : "var(--white)" }}>
        {value}
      </p>
    </div>
  );
}
