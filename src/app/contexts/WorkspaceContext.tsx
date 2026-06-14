import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  fetchMyWorkspaces,
  getWorkspaceMembers,
  changeMemberRole as changeMemberRoleApi,
  removeMember as removeMemberApi,
  transferOwnership as transferOwnershipApi,
  type WorkspaceMember,
} from "../api/workspace";
import { useProfile } from "./ProfileContext";
import { isAuthenticated } from "../auth";

interface WorkspaceContextValue {
  workspaceId: number | null;
  setWorkspaceId: (id: number) => void;
  myMemberId: number | null;
  myAuthority: string | null;
  members: Map<number, string>;
  memberList: WorkspaceMember[];
  getMemberName: (memberId: number) => string;
  refetch: () => Promise<void>;
  changeAuthority: (memberId: number, authority: string) => Promise<void>;
  removeMember: (memberId: number) => Promise<void>;
  transferOwnership: (memberId: number) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { userId } = useProfile();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [myMemberId, setMyMemberId] = useState<number | null>(null);
  const [myAuthority, setMyAuthority] = useState<string | null>(null);
  const [members, setMembers] = useState<Map<number, string>>(new Map());
  const [memberList, setMemberList] = useState<WorkspaceMember[]>([]);

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
      let foundId: number | null = null;
      let foundAuthority: string | null = null;
      data.forEach((m) => {
        map.set(m.memberId, m.username);
        if (m.userId === uid) {
          foundId = m.memberId;
          foundAuthority = m.role;
        }
      });
      setMembers(map);
      setMemberList(data);
      setMyMemberId(foundId);
      setMyAuthority(foundAuthority);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (workspaceId === null) return;
    void loadMembers(workspaceId, userId);
  }, [workspaceId, userId, loadMembers]);

  const refetch = useCallback(
      () => (workspaceId === null ? Promise.resolve() : loadMembers(workspaceId, userId)),
      [loadMembers, workspaceId, userId]
  );

  const runMutation = useCallback(
      async (action: () => Promise<void>) => {
        try {
          await action();
          await refetch();
        } catch (e) {
          await refetch();
          throw e;
        }
      },
      [refetch]
  );

  const changeAuthority = useCallback(
      (memberId: number, authority: string) => {
        if (workspaceId === null) return Promise.resolve();
        return runMutation(() => changeMemberRoleApi(workspaceId, memberId, authority));
      },
      [runMutation, workspaceId]
  );

  const removeMember = useCallback(
      (memberId: number) => {
        if (workspaceId === null) return Promise.resolve();
        return runMutation(() => removeMemberApi(workspaceId, memberId));
      },
      [runMutation, workspaceId]
  );

  const transferOwnership = useCallback(
      (memberId: number) => {
        if (workspaceId === null) return Promise.resolve();
        return runMutation(() => transferOwnershipApi(workspaceId, memberId));
      },
      [runMutation, workspaceId]
  );

  const getMemberName = useCallback(
      (memberId: number) => members.get(memberId) ?? String(memberId),
      [members]
  );

  return (
      <WorkspaceContext.Provider
          value={{
            workspaceId,
            setWorkspaceId,
            myMemberId,
            myAuthority,
            members,
            memberList,
            getMemberName,
            refetch,
            changeAuthority,
            removeMember,
            transferOwnership,
          }}
      >
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