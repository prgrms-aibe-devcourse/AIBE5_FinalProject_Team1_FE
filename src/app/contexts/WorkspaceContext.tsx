import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { fetchMyWorkspaces, getWorkspaceMembers, type WorkspaceMember } from "../api/workspace";
import { useProfile } from "./ProfileContext";
import { isAuthenticated } from "../auth";

interface WorkspaceContextValue {
  workspaceId: number | null;
  setWorkspaceId: (id: number) => void;
  myMemberId: number | null;
  members: Map<number, string>;
  getMemberName: (memberId: number) => string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useProfile();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [myMemberId, setMyMemberId] = useState<number | null>(null);
  const [members, setMembers] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!isAuthenticated()) return;
    fetchMyWorkspaces()
      .then((list) => { if (list.length > 0) setWorkspaceId(list[0].id); })
      .catch(() => {});
  }, []);

  const loadMembers = useCallback(async (wsId: number, uid: number | null) => {
    if (!isAuthenticated() || !uid) return;

    try {
      const data: WorkspaceMember[] = await getWorkspaceMembers(wsId);
      const map = new Map<number, string>();
      let found: number | null = null;

      data.forEach((m) => {
        map.set(m.memberId, m.username);
        if (m.userId === uid) found = m.memberId;
      });

      setMembers(map);
      setMyMemberId(found);
    } catch {
      // 인증 전이거나 네트워크 오류 시 무시
    }
  }, []);

  useEffect(() => {
    if (workspaceId === null) return;
    void loadMembers(workspaceId, userId);
  }, [workspaceId, userId, loadMembers]);

  const getMemberName = useCallback(
    (memberId: number) => members.get(memberId) ?? String(memberId),
    [members]
  );

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId, myMemberId, members, getMemberName }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
