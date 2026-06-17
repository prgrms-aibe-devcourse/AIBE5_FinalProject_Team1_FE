import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { apiClient } from "../api/client";
import { isAuthenticated } from "../auth";

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
  hasPassword: boolean;
}

export const STATUS_OPTIONS: { id: ProfileStatus; label: string; color: string }[] = [
  { id: "available", label: "리뷰 가능", color: "#39FF88" },
  { id: "focus", label: "집중 중", color: "#FFD166" },
  { id: "away", label: "자리 비움", color: "#94A3B8" },
];

export const DEFAULT_PROFILE: ProfileUser = {
  name: "",
  nickname: "",
  email: "",
  workspace: "",
  role: "",
  skills: [],
  bio: "",
  status: "available",
  avatarUrl: "",
  recoveryEmail: "",
  githubConnected: false,
  githubUsername: "",
  githubEmail: "",
  connectedAt: "",
  hasPassword: false,
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

type MeResponse = {
  id: number;
  email: string | null;
  displayName: string | null;
  nickname: string | null;
  developerType: string | null;
  bio: string | null;
  avatarUrl: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
  githubEmail: string | null;
  githubConnectedAt: string | null;
  hasPassword: boolean;
};

interface ProfileContextValue {
  profile: ProfileUser;
  setProfile: Dispatch<SetStateAction<ProfileUser>>;
  loading: boolean;
  userId: number | null;
  reloadProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileUser>(() => getSavedProfile(DEFAULT_PROFILE));
  const [loading, setLoading] = useState<boolean>(() => isAuthenticated());
  const [userId, setUserId] = useState<number | null>(null);

  const reloadProfile = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await apiClient.get<MeResponse>("/api/v1/auth/me");
      const skills = await apiClient.get<string[]>("/api/v1/users/me/skills");
      setUserId(me.id);
      setProfile((prev) => ({
        ...prev,
        name: me.displayName ?? "",
        nickname: me.nickname ?? "",
        email: me.email ?? "",
        role: me.developerType ?? "",
        bio: me.bio ?? "",
        avatarUrl: me.avatarUrl ?? "",
        skills: skills ?? [],
        githubConnected: me.githubConnected,
        githubUsername: me.githubUsername ?? "",
        githubEmail: me.githubEmail ?? "",
        connectedAt: me.githubConnectedAt ? String(me.githubConnectedAt) : "",
        hasPassword: me.hasPassword ?? false,
      }));
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  return (
      <ProfileContext.Provider value={{ profile, setProfile, loading, userId, reloadProfile }}>
        {children}
      </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
