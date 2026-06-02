import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type ProfileStatus = "available" | "focus" | "away";

export interface ProfileUser {
  name: string;
  nickname: string;
  email: string;
  workspace: string;
  role: string;
  skills: string[];
  bio: string;
  status: ProfileStatus;
  avatarUrl: string;
  recoveryEmail: string;
  githubConnected: boolean;
  githubUsername: string;
  githubEmail: string;
  connectedAt: string;
}

export const STATUS_OPTIONS: { id: ProfileStatus; label: string; color: string }[] = [
  { id: "available", label: "리뷰 가능", color: "#39FF88" },
  { id: "focus", label: "집중 중", color: "#FFD166" },
  { id: "away", label: "자리 비움", color: "#94A3B8" },
];

export const DEFAULT_PROFILE: ProfileUser = {
  name: "김재준",
  nickname: "CodeDocker",
  email: "jaejun@codedock.dev",
  workspace: "CodeDock Team",
  role: "프론트엔드",
  skills: ["React", "TypeScript"],
  bio: "프론트엔드 중심으로 PR 리뷰와 문서화를 함께 챙깁니다.",
  status: "available",
  avatarUrl: "",
  recoveryEmail: "jaejun@codedock.dev",
  githubConnected: true,
  githubUsername: "jean2077",
  githubEmail: "jean2077@github.com",
  connectedAt: "2026-05-21",
};

const PROFILE_STORAGE_KEY = "codedock-profile-v1";

function getSavedProfile(fallback: ProfileUser): ProfileUser {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return { ...fallback, ...(parsed as Partial<ProfileUser>) };
  } catch {
    return fallback;
  }
}

function saveProfile(profile: ProfileUser) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // 아바타(base64)가 커서 용량을 초과하면 아바타를 빼고 다시 저장 시도
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...profile, avatarUrl: "" }));
    } catch {
      // 저장이 불가능하면 메모리 상태만 유지
    }
  }
}

interface ProfileContextValue {
  profile: ProfileUser;
  setProfile: Dispatch<SetStateAction<ProfileUser>>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileUser>(() => getSavedProfile(DEFAULT_PROFILE));

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
