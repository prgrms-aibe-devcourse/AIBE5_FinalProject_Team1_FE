import { Hash, Users, GitPullRequest, Home, CheckSquare, ChevronDown, ChevronRight, GitBranch, Code2, Database, BookOpen, Maximize2, Minimize2, Plus, Pencil, Trash2, MoreVertical, X, LayoutGrid, type LucideIcon } from "lucide-react";
import { WorkBoardPanel } from "../components/WorkBoardPanel";
import { ChatPanel } from "../components/ChatPanel";
import { PRReviewPanel } from "../components/PRReviewPanel";
import { IssuePanel } from "../components/IssuePanel";
import { ThreadPanel } from "../components/ThreadPanel";
import { ChannelPanel } from "../components/ChannelPanel";
import { CoffeeLogo } from "../components/CoffeeLogo";
import { OverviewPanel } from "../components/OverviewPanel";
import { APISpecPage } from "./APISpecPage";
import { ERDPage } from "./ERDPage";
import { DocsPage } from "./DocsPage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import type { MessageAttachment } from "../components/messageAttachments";
import { TeamInviteModal } from "../components/TeamInviteModal";
import { TeamPanel } from "../components/TeamPanel";

const REPOSITORY_IMPORTED_KEY = "codedock-repository-imported";
const REPOSITORY_LIST_KEY = "codedock-repositories-v2";

type SidebarGroupId = 'documentation';

interface RepositoryItem {
  id: string;
  name: string;
  openPRs: number;
  highRisk: number;
  activeIssues: number;
  connected: boolean;
  membersOnline: number;
  workspaceId?: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  connected: boolean;
  membersOnline: number;
  myRole: string;
}

const DEFAULT_WORKSPACES: WorkspaceItem[] = [
  { id: 'workspace-1', name: 'SecureFlow Workspace', connected: true, membersOnline: 5, myRole: '소유자' },
  { id: 'workspace-2', name: 'AI Chat Platform', connected: true, membersOnline: 8, myRole: '편집 가능' },
  { id: 'workspace-3', name: 'Dashboard UI Kit', connected: true, membersOnline: 3, myRole: '보기 가능' },
];

interface SidebarChannel {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const DEFAULT_REPOSITORIES: RepositoryItem[] = [
  { id: 'secureflow', name: 'BE', openPRs: 7, highRisk: 2, activeIssues: 12, connected: true, membersOnline: 8, workspaceId: 'workspace-1' },
  { id: 'aichat', name: 'FE', openPRs: 3, highRisk: 0, activeIssues: 8, connected: true, membersOnline: 5, workspaceId: 'workspace-1' },
  { id: 'dashboard', name: 'Design', openPRs: 5, highRisk: 1, activeIssues: 6, connected: true, membersOnline: 3, workspaceId: 'workspace-1' },
  { id: 'secureflow-2', name: 'BE', openPRs: 7, highRisk: 2, activeIssues: 12, connected: true, membersOnline: 8, workspaceId: 'workspace-2' },
  { id: 'aichat-2', name: 'FE', openPRs: 3, highRisk: 0, activeIssues: 8, connected: true, membersOnline: 5, workspaceId: 'workspace-2' },
  { id: 'dashboard-2', name: 'Design', openPRs: 5, highRisk: 1, activeIssues: 6, connected: true, membersOnline: 3, workspaceId: 'workspace-2' },
  { id: 'secureflow-3', name: 'BE', openPRs: 7, highRisk: 2, activeIssues: 12, connected: true, membersOnline: 8, workspaceId: 'workspace-3' },
  { id: 'aichat-3', name: 'FE', openPRs: 3, highRisk: 0, activeIssues: 8, connected: true, membersOnline: 5, workspaceId: 'workspace-3' },
  { id: 'dashboard-3', name: 'Design', openPRs: 5, highRisk: 1, activeIssues: 6, connected: true, membersOnline: 3, workspaceId: 'workspace-3' },
];

const REPO_CHANNEL_IDS: Record<string, string> = {
  'secureflow': 'frontend-chat',
  'aichat': 'backend-chat',
  'dashboard': 'review-room',
  'secureflow-2': 'frontend-chat',
  'aichat-2': 'backend-chat',
  'dashboard-2': 'review-room',
  'secureflow-3': 'frontend-chat',
  'aichat-3': 'backend-chat',
  'dashboard-3': 'review-room',
};

// 역방향 매핑: 채널 ID → 레포 ID
const REPO_CHANNEL_IDS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(REPO_CHANNEL_IDS).map(([repoId, channelId]) => [channelId, repoId])
);


const DOCUMENTATION_CHANNELS: SidebarChannel[] = [
  { id: 'api-spec', label: 'API', icon: Code2 },
  { id: 'erd', label: 'ERD', icon: Database },
  { id: 'docs', label: '문서', icon: BookOpen }
];

const ALL_SIDEBAR_CHANNELS = [
  { id: 'overview', label: '통합 개요', icon: Home },
  { id: 'general', label: '일반', icon: Hash },
  ...DOCUMENTATION_CHANNELS
];

function getRepositoryImportPreference() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(REPOSITORY_IMPORTED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveRepositoryImportPreference() {
  saveRepositoryImportPreferenceValue(true);
}

function saveRepositoryImportPreferenceValue(value: boolean) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REPOSITORY_IMPORTED_KEY, value ? "true" : "false");
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

function getSavedRepositories() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(REPOSITORY_LIST_KEY);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return null;

    return parsed.filter((repo): repo is RepositoryItem =>
      repo
      && typeof repo.id === "string"
      && typeof repo.name === "string"
      && typeof repo.openPRs === "number"
      && typeof repo.highRisk === "number"
      && typeof repo.activeIssues === "number"
      && typeof repo.connected === "boolean"
      && typeof repo.membersOnline === "number"
    );
  } catch {
    return null;
  }
}

function saveRepositories(repositories: RepositoryItem[]) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REPOSITORY_LIST_KEY, JSON.stringify(repositories));
  } catch {
    // Storage can be unavailable in embedded previews; the in-memory state still updates.
  }
}

const initialMessages: Record<string, any[]> = {
  'overview': [
    { id: 1, user: '시스템', text: '프로젝트 대시보드에 오신 것을 환영합니다!', time: '오늘 09:00', type: 'system' as const },
    { id: 2, user: '시스템', text: '활성 PR: 5개 | 미해결 이슈: 12개 | 팀원: 15명', time: '오늘 09:00', type: 'system' as const }
  ],
  'general': [
    { id: 1, user: '시스템', text: 'SecureFlow Workspace에 오신 것을 환영합니다!', time: '오늘 09:00', type: 'system' as const },
    { id: 2, user: '김재준', text: '이번 주 스프린트 목표 공유드립니다.', time: '오늘 10:00' },
    { id: 3, user: '김진필', text: '네, 확인했습니다!', time: '오늘 10:05' }
  ],
  'review-room': [
    { id: 1, user: 'CodeDock', text: 'PR #234 인증 변경 파일을 먼저 묶었어요.', time: '오늘 11:12', type: 'system' as const },
    { id: 2, user: '김준우', text: 'rate limit 빠진 부분만 체크리스트로 빼줘.', time: '오늘 11:15' },
    { id: 3, user: 'CodeDock', text: '보안 코멘트 3개와 문서 반영 항목을 준비했습니다.', time: '오늘 11:16', type: 'system' as const }
  ],
  'frontend-chat': [
    { id: 1, user: '김진현', text: '로그인 페이지 채팅형 전환 애니메이션 확인 부탁드려요.', time: '오늘 10:42' },
    { id: 2, user: '안현', text: '크게 보기 모드에서 헤더 덮는 부분까지 맞췄습니다.', time: '오늘 10:48' }
  ],
  'backend-chat': [
    { id: 1, user: '김진필', text: '회원 탈퇴와 워크스페이스 삭제 API 명세 추가 예정입니다.', time: '오늘 09:55' },
    { id: 2, user: 'CodeDock', text: '리포지토리 연동 해제 정책도 문서 목록에 연결해둘게요.', time: '오늘 09:58', type: 'system' as const }
  ],
  'pull-requests': [
    {
      id: 1,
      user: 'GitHub Bot',
      text: 'PR #104 opened by 김재준: [Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
      time: '오늘 11:24',
      type: 'pr' as const,
      prNumber: 104,
      prTitle: '[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
      prStatus: 'open',
      filesChanged: 6,
      additions: 318,
      deletions: 74,
      repository: 'codedock-team/recruiting-backend',
      reviewRoomActive: true,
      approved: 1,
      pending: 1,
      aiRisk: 'Medium',
      passed: 7,
      labels: ['리팩터링', 'AI 인터뷰', '테스트'],
      prAuthor: '김재준',
      githubUser: 'kimjaejun',
      authorInitials: 'JJ',
      branch: 'refactor/ai-interview-preserve'
    },
    {
      id: 2,
      user: 'GitHub Bot',
      text: 'PR #141 opened by 김진필: WebSocket 연결 처리 메모리 누수 수정',
      time: '오늘 09:30',
      type: 'pr' as const,
      prNumber: 141,
      prStatus: 'open',
      filesChanged: 3,
      additions: 45,
      deletions: 28,
      repository: 'codeblock-team/codeblock-frontend',
      reviewRoomActive: false,
      approved: 3,
      pending: 0,
      aiRisk: 'Low',
      passed: 8,
      labels: ['버그 수정', '성능'],
      prAuthor: '김진필'
    },
    {
      id: 3,
      user: 'GitHub Bot',
      text: 'PR #140 merged by 김진현: 새 API 엔드포인트 문서 업데이트',
      time: '오늘 10:30',
      type: 'pr' as const,
      prNumber: 140,
      prStatus: 'merged',
      filesChanged: 12,
      additions: 456,
      deletions: 85,
      repository: 'codeblock-team/codeblock-frontend',
      reviewRoomActive: false,
      approved: 3,
      pending: 0,
      aiRisk: 'Low',
      passed: 7,
      labels: ['문서'],
      prAuthor: '김진현'
    }
  ],
  'ai-review': [
    { id: 1, user: 'AI Assistant', text: 'PR #234 분석 완료: 보안 취약점 없음, 코드 품질 우수', time: '오늘 11:05', type: 'system' as const },
    { id: 2, user: 'AI Assistant', text: 'PR #456의 타입스크립트 마이그레이션 리뷰 중...', time: '오늘 09:35', type: 'system' as const }
  ],
  'issues': [
    {
      id: 1,
      user: 'GitHub Bot',
      text: 'Issue #45 opened by 김진필: 로그인 페이지 반응형 깨짐 현상',
      time: '오늘 10:00',
      type: 'issue' as const,
      issueNumber: 45,
      issueTitle: '로그인 페이지 반응형 깨짐 현상',
      issueStatus: 'in_progress' as const,
      issueAuthor: '김진필',
      issueLabels: [
        { name: 'bug', color: '#EF4444' },
        { name: 'frontend', color: '#06B6D4' },
        { name: 'priority: high', color: '#F59E0B' },
      ],
      issuePriority: 'high' as const,
      issueType: 'Bug',
      issueAssignees: ['김진현', '안현'],
      issueBody: `## 문제 설명\n모바일(375px) 환경에서 로그인 페이지의 입력 폼이 화면 밖으로 넘칩니다.\n\n## 재현 방법\n1. 브라우저 DevTools에서 모바일 뷰로 전환\n2. /login 접속\n3. 이메일 입력 필드가 화면 우측으로 벗어남\n\n## 기대 동작\n모든 해상도에서 폼이 정상적으로 표시되어야 함\n\n## 환경\n- Chrome 120\n- iPhone SE (375px)`,
      issueHistory: [
        { id: 'h1', actor: '김진필', action: '이슈를 생성했습니다', time: '오늘 10:00', eventType: 'created' as const },
        { id: 'h2', actor: '김진필', action: '김진현님을 담당자로 지정했습니다', time: '오늘 10:01', eventType: 'assigned' as const },
        { id: 'h3', actor: '김진필', action: 'bug 라벨을 추가했습니다', time: '오늘 10:01', eventType: 'labeled' as const },
        { id: 'h4', actor: '김진현', action: '재현 확인했습니다. flex-wrap 설정 누락인 것 같습니다.', time: '오늘 10:30', eventType: 'commented' as const },
        { id: 'h5', actor: '김진현', action: '안현님을 담당자로 지정했습니다', time: '오늘 10:31', eventType: 'assigned' as const },
        { id: 'h6', actor: '안현', action: '상태를 Open에서 In Progress로 변경했습니다', time: '오늘 11:00', eventType: 'status_changed' as const },
      ],
    },
    {
      id: 2,
      user: 'GitHub Bot',
      text: 'Issue #46 opened by 김준우: API 응답 시간 개선 필요',
      time: '오늘 10:30',
      type: 'issue' as const,
      issueNumber: 46,
      issueTitle: 'API 응답 시간 개선 필요',
      issueStatus: 'open' as const,
      issueAuthor: '김준우',
      issueLabels: [
        { name: 'enhancement', color: '#8B5CF6' },
        { name: 'backend', color: '#06B6D4' },
        { name: 'priority: medium', color: '#F59E0B' },
      ],
      issuePriority: 'medium' as const,
      issueType: 'Enhancement',
      issueAssignees: ['김재준'],
      issueBody: `## 문제 설명\n일부 API 엔드포인트의 응답 시간이 2초 이상 소요됩니다.\n\n## 재현 방법\n1. /api/workspace/list 호출\n2. Network 탭에서 응답 시간 확인\n\n## 기대 동작\n모든 API 응답이 500ms 이내로 처리되어야 함\n\n## 환경\n- Spring Boot 3\n- Oracle DB`,
      issueHistory: [
        { id: 'h1', actor: '김준우', action: '이슈를 생성했습니다', time: '오늘 10:30', eventType: 'created' as const },
        { id: 'h2', actor: '김준우', action: 'enhancement 라벨을 추가했습니다', time: '오늘 10:30', eventType: 'labeled' as const },
        { id: 'h3', actor: '김준우', action: '김재준님을 담당자로 지정했습니다', time: '오늘 10:31', eventType: 'assigned' as const },
      ],
    },
    {
      id: 3,
      user: 'GitHub Bot',
      text: 'Issue #47 opened by 김진현: 다크모드 색상 일관성 문제',
      time: '오늘 11:00',
      type: 'issue' as const,
      issueNumber: 47,
      issueTitle: '다크모드 색상 일관성 문제',
      issueStatus: 'open' as const,
      issueAuthor: '김진현',
      issueLabels: [
        { name: 'design', color: '#EC4899' },
        { name: 'frontend', color: '#06B6D4' },
      ],
      issuePriority: 'low' as const,
      issueType: 'Design',
      issueAssignees: ['김진현'],
      issueBody: `## 문제 설명\n다크모드 전환 시 일부 컴포넌트에서 배경색과 텍스트 색상이 일치하지 않습니다.\n\n## 재현 방법\n1. 라이트 모드에서 다크 모드로 전환\n2. 설정 페이지 카드 컴포넌트 확인\n\n## 기대 동작\n다크모드에서 모든 컴포넌트가 일관된 색상 체계를 유지해야 함`,
      issueHistory: [
        { id: 'h1', actor: '김진현', action: '이슈를 생성했습니다', time: '오늘 11:00', eventType: 'created' as const },
        { id: 'h2', actor: '김진현', action: 'design 라벨을 추가했습니다', time: '오늘 11:00', eventType: 'labeled' as const },
        { id: 'h3', actor: '김진현', action: '상태를 Open에서 In Progress로 변경했습니다', time: '오늘 11:30', eventType: 'status_changed' as const },
      ],
    },
  ],
  'documentation': [
    { id: 1, user: '김진현', text: '디자인 시스템 문서 업데이트 완료', time: '오늘 09:00' },
    { id: 2, user: '김재준', text: 'API 명세서 v2.0 배포했습니다', time: '오늘 10:00' }
  ],
  'operations': [
    { id: 1, user: '시스템', text: '서버 상태: 정상 | CPU: 45% | 메모리: 62%', time: '오늘 12:00', type: 'system' as const },
    { id: 2, user: 'DevOps Bot', text: '배포 완료: production 환경 v1.2.3', time: '오늘 11:30', type: 'system' as const }
  ],
  'team': [
    { id: 1, user: '김재준', text: '팀 미팅 금요일 오후 3시로 변경되었습니다.', time: '오늘 09:00' },
    { id: 2, user: '김진필', text: '다음 주 휴가 예정입니다.', time: '오늘 10:00' }
  ],
};

const initialThreadReplies: Record<number, any[]> = {
  1: [
    { id: 101, user: '김진필', text: '이번 주는 인증 기능 개선에 집중할 예정입니다.', time: '10:25 AM' },
    { id: 102, user: '김진현', text: 'UI 개선 작업도 같이 진행하면 좋을 것 같아요.', time: '10:30 AM' },
    { id: 103, user: '안현', text: '네, 확인했습니다! 금요일까지 완료 가능할 것 같습니다.', time: '10:35 AM' }
  ],
  2: [
    { id: 201, user: '김재준', text: '좋습니다! 문서도 업데이트 부탁드려요.', time: '11:50 AM' },
    { id: 202, user: '안현', text: 'Swagger 문서 자동 생성되도록 설정했습니다.', time: '12:00 PM' },
    { id: 203, user: '김진필', text: '테스트 케이스도 추가했어요.', time: '12:15 PM' },
    { id: 204, user: '김진현', text: '프론트엔드 연동 테스트 완료했습니다.', time: '12:30 PM' },
    { id: 205, user: '김재준', text: '수고하셨습니다!', time: '12:45 PM' }
  ],
  3: [
    { id: 301, user: '김진필', text: 'shadcn/ui 추천드립니다.', time: '2:20 PM' },
    { id: 302, user: '안현', text: 'MUI도 고려해볼만 한 것 같아요.', time: '2:25 PM' },
    { id: 303, user: '김재준', text: '프로젝트 요구사항에 맞춰 선택하면 좋겠네요.', time: '2:30 PM' },
    { id: 304, user: '김진현', text: '디자인 토큰 호환성도 확인해보겠습니다.', time: '2:35 PM' },
    { id: 305, user: '김진필', text: 'Tailwind CSS와의 통합도 고려하면 좋을 것 같습니다.', time: '2:40 PM' },
    { id: 306, user: '안현', text: '다음 주 회의에서 결정하죠.', time: '2:45 PM' },
    { id: 307, user: '김재준', text: 'POC 자료 준비 부탁드립니다.', time: '2:50 PM' },
    { id: 308, user: '김진현', text: '네, 준비하겠습니다!', time: '2:55 PM' }
  ],
  4: [
    { id: 401, user: '김진현', text: '색상 조합이 정말 좋네요!', time: '3:35 PM' },
    { id: 402, user: '김재준', text: '고생하셨습니다!', time: '3:40 PM' }
  ],
  5: [
    { id: 501, user: '김재준', text: '인덱스 추가는 검토하셨나요?', time: '4:10 PM' }
  ]
};

export function ChatPage() {
  const [repositoriesImported, setRepositoriesImported] = useState(true);
  const [repositories, setRepositories] = useState<RepositoryItem[]>(() =>
    getSavedRepositories() ?? DEFAULT_REPOSITORIES
  );
  const [selectedRepository, setSelectedRepository] = useState<string>(() =>
    getSavedRepositories()?.[0]?.id ?? DEFAULT_REPOSITORIES[0].id
  );
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showRepoForm, setShowRepoForm] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('overview');
  const [messages, setMessages] = useState<Record<string, any[]>>(initialMessages);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<Record<number, any[]>>(initialThreadReplies);
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [expandedSidebarGroups, setExpandedSidebarGroups] = useState<Record<SidebarGroupId, boolean>>({
    documentation: true
  });
  const [expandedRepoSubmenus, setExpandedRepoSubmenus] = useState<Record<string, boolean>>({});
  const [repoMenuOpenId, setRepoMenuOpenId] = useState<string | null>(null);
  const [customChannels, setCustomChannels] = useState<{ id: string; label: string }[]>([]);
  const [channelMenuOpenId, setChannelMenuOpenId] = useState<string | null>(null);
  const [editingCustomChannelId, setEditingCustomChannelId] = useState<string | null>(null);
  const [editingCustomChannelLabel, setEditingCustomChannelLabel] = useState('');
  const [addChannelStep, setAddChannelStep] = useState<null | 'select' | 'chat' | 'repo'>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newRepoChannelUrl, setNewRepoChannelUrl] = useState('');
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({
    general: 3,
    'frontend-chat': 2,
    'backend-chat': 1,
    'review-room': 2,
  });

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(DEFAULT_WORKSPACES[0].id);

  const navigate = useNavigate();


  const hasRepositories = repositoriesImported && repositories.length > 0;
  const currentRepo = repositories.find(repo => repo.id === selectedRepository);
  const currentWorkspace = DEFAULT_WORKSPACES.find(ws => ws.id === selectedWorkspace) ?? DEFAULT_WORKSPACES[0];
  const visibleRepositories = repositories.filter(r => !r.workspaceId || r.workspaceId === selectedWorkspace);
  const firstVisibleRepositoryId = visibleRepositories[0]?.id ?? null;

  const getChannelBadge = (channelId: string): string | undefined => {
    const count = channelUnreadCounts[channelId];
    return count && count > 0 ? String(count) : undefined;
  };

  const currentMessages = messages[selectedChannel] || [];
  const isRepository = ['pull-requests', 'ai-review'].includes(selectedChannel);
  const gridTemplateColumns = selectedPR || selectedIssue
    ? 'minmax(0, 1fr)'
    : isMainExpanded
      ? selectedThread
        ? '320px minmax(0, 1fr) 380px'
        : '320px minmax(0, 1fr)'
      : selectedThread
        ? '320px 1fr 380px'
        : '320px 1fr';
  const pageShellClassName = isMainExpanded
    ? "fixed inset-0 z-[80] mx-auto max-w-none p-4"
    : "w-full max-w-[2000px] mx-auto px-4 py-8 pb-20";
  const pageShellStyle = isMainExpanded
    ? {
        background:
          'radial-gradient(circle at 18% 10%, rgba(32, 227, 255, 0.16), transparent 28%), radial-gradient(circle at 82% 0%, rgba(57, 255, 136, 0.08), transparent 30%), #050b14'
      }
    : undefined;
  const chatGridClassName = isMainExpanded
    ? "grid h-full min-h-0 gap-4 overflow-hidden"
    : "grid h-[calc(100vh-160px)] min-h-0 gap-6 overflow-hidden";
  const selectedChannelMeta = ALL_SIDEBAR_CHANNELS.find((channel) => channel.id === selectedChannel);
  const selectedCustomChannel = customChannels.find(ch => ch.id === selectedChannel);
  const selectedChannelTitle = selectedChannel === 'pull-requests'
    ? `${currentRepo?.name ?? '레포'} - PR`
    : selectedChannel === 'issues'
    ? `${currentRepo?.name ?? '레포'} - 이슈`
    : selectedCustomChannel?.label
    ?? selectedChannelMeta?.label
    ?? selectedChannel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const selectedRepositoryName = repositories.find((repo) => repo.id === selectedRepository)?.name ?? '전체 리포지토리';

  useEffect(() => {
    if (!isMainExpanded) return;

    const handleEscapeExpandedView = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMainExpanded(false);
    };

    window.addEventListener('keydown', handleEscapeExpandedView);
    return () => window.removeEventListener('keydown', handleEscapeExpandedView);
  }, [isMainExpanded]);

  useEffect(() => {
    if (!repositoriesImported) return;
    saveRepositoryImportPreference();
    saveRepositories(repositories);
  }, [repositories, repositoriesImported]);

  useEffect(() => {
    if (!firstVisibleRepositoryId) return;

    setExpandedRepoSubmenus((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, firstVisibleRepositoryId)) {
        return prev;
      }

      return {
        ...prev,
        [firstVisibleRepositoryId]: true
      };
    });
  }, [firstVisibleRepositoryId]);

  useEffect(() => {
    setChannelUnreadCounts(prev => {
      if (!prev[selectedChannel]) return prev;
      return { ...prev, [selectedChannel]: 0 };
    });
  }, [selectedChannel]);

  const parseRepoNameFromUrl = (url: string): string | null => {
    try {
      const trimmed = url.trim().replace(/\.git$/, '');
      const parts = trimmed.split('/').filter(Boolean);
      const name = parts[parts.length - 1];
      return name || null;
    } catch {
      return null;
    }
  };

  const handleOpenRepoForm = () => {
    setShowRepoDropdown(false);
    setShowRepoForm(true);
    setRepoUrlInput('');
  };

  const handleCloseRepoForm = () => {
    setShowRepoForm(false);
    setRepoUrlInput('');
  };

  const handleSubmitRepoForm = () => {
    const repoName = parseRepoNameFromUrl(repoUrlInput);
    if (!repoName) return;
    const nextRepository: RepositoryItem = {
      id: `repo-${Date.now()}`,
      name: repoName,
      openPRs: 0,
      highRisk: 0,
      activeIssues: 0,
      connected: true,
      membersOnline: 1,
      workspaceId: selectedWorkspace
    };
    setRepositories(prev => [nextRepository, ...prev]);
    setRepositoriesImported(true);
    setSelectedRepository(nextRepository.id);
    setSelectedChannel('overview');
    handleCloseRepoForm();
  };

  const handleDeleteRepository = (repositoryId: string) => {
    const nextRepositories = repositories.filter((repo) => repo.id !== repositoryId);
    setRepositories(nextRepositories);
    if (selectedRepository === repositoryId) {
      const nextVisible = nextRepositories.filter(r => !r.workspaceId || r.workspaceId === selectedWorkspace);
      setSelectedRepository(nextVisible[0]?.id ?? nextRepositories[0]?.id ?? "");
    }
    if (nextRepositories.length === 0) {
      setRepositoriesImported(false);
      setSelectedChannel('overview');
      setShowRepoDropdown(false);
      saveRepositoryImportPreferenceValue(false);
      saveRepositories([]);
      return;
    }
    saveRepositories(nextRepositories);
  };

  const handleAddCustomChannel = () => {
    setAddChannelStep('select');
    setNewChannelName('');
    setNewRepoChannelUrl('');
  };

  const handleSelectChannelType = (type: 'chat' | 'repo') => {
    setAddChannelStep(type);
  };

  const handleSubmitAddChannel = () => {
    const label = newChannelName.trim() || `새 채널 ${customChannels.length + 1}`;
    const id = `custom-${Date.now()}`;
    setCustomChannels(prev => [...prev, { id, label }]);
    setSelectedChannel(id);
    setAddChannelStep(null);
    setNewChannelName('');
  };

  const handleSubmitAddRepoChannel = () => {
    const repoName = parseRepoNameFromUrl(newRepoChannelUrl);
    if (!repoName) return;
    const nextRepository: RepositoryItem = {
      id: `repo-${Date.now()}`,
      name: repoName,
      openPRs: 0,
      highRisk: 0,
      activeIssues: 0,
      connected: true,
      membersOnline: 1,
      workspaceId: selectedWorkspace
    };
    setRepositories(prev => [nextRepository, ...prev]);
    setRepositoriesImported(true);
    setSelectedRepository(nextRepository.id);
    setSelectedChannel(nextRepository.id);
    setAddChannelStep(null);
    setNewRepoChannelUrl('');
  };

  const handleCancelAddChannel = () => {
    setAddChannelStep(null);
    setNewChannelName('');
    setNewRepoChannelUrl('');
  };

  const handleDeleteCustomChannel = (channelId: string) => {
    setCustomChannels(prev => prev.filter(ch => ch.id !== channelId));
    if (selectedChannel === channelId) setSelectedChannel('general');
    setChannelMenuOpenId(null);
  };

  const handleStartRenameCustomChannel = (channel: { id: string; label: string }) => {
    setEditingCustomChannelId(channel.id);
    setEditingCustomChannelLabel(channel.label);
    setChannelMenuOpenId(null);
  };

  const handleCommitRenameCustomChannel = () => {
    if (!editingCustomChannelId) return;
    const nextLabel = editingCustomChannelLabel.trim();
    if (nextLabel) {
      setCustomChannels(prev =>
        prev.map(ch => ch.id === editingCustomChannelId ? { ...ch, label: nextLabel } : ch)
      );
    }
    setEditingCustomChannelId(null);
    setEditingCustomChannelLabel('');
  };

  const toggleSidebarGroup = (group: SidebarGroupId) => {
    setExpandedSidebarGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const toggleRepoSubmenu = (repoId: string) => {
    setExpandedRepoSubmenus((prev) => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const renderSidebarChannel = (channel: SidebarChannel, nested = false) => {
    const Icon = channel.icon;
    const isActive = selectedChannel === channel.id;

    return (
      <motion.button
        key={channel.id}
        onClick={() => setSelectedChannel(channel.id)}
        className={`relative isolate flex w-full items-center gap-3 rounded-full border-0 text-left tracking-tight transition-colors ${nested ? 'pl-8 pr-3 py-2.5' : 'px-4 py-3'}`}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        }}
        whileTap={{ scale: 0.99 }}
      >
        {isActive && (
          <motion.div
            layoutId="workspaceSidebarActiveTab"
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                linear-gradient(135deg, rgba(32, 227, 255, 0.18), rgba(234, 247, 255, 0.045)),
                rgba(11, 22, 40, 0.52)
              `,
              border: '1px solid rgba(32, 227, 255, 0.30)',
              boxShadow: `
                0 0 24px rgba(32, 227, 255, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.12),
                inset 0 0 18px rgba(255, 255, 255, 0.035)
              `,
              backdropFilter: 'blur(14px) saturate(180%)',
              WebkitBackdropFilter: 'blur(14px) saturate(180%)'
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30
            }}
          />
        )}
        <Icon size={nested ? 15 : 18} style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
        <span className="relative z-10 min-w-0 flex-1 truncate tracking-tight" style={{
          fontSize: nested ? '13px' : '14px',
          fontWeight: isActive ? 900 : 800,
          color: isActive ? 'var(--white)' : 'var(--muted)'
        }}>
          {channel.label}
        </span>
        {channel.badge && (
          <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
            background: isActive ? 'rgba(32, 227, 255, 0.22)' : 'rgba(234, 247, 255, 0.08)',
            border: '1px solid rgba(32, 227, 255, 0.18)',
            color: isActive ? 'var(--neon-cyan)' : 'var(--muted)',
            fontSize: '10px',
            fontWeight: 950
          }}>
            {channel.badge}
          </span>
        )}
      </motion.button>
    );
  };

  const renderSidebarGroup = (group: SidebarGroupId, label: string, channels: SidebarChannel[]) => {
    const isOpen = expandedSidebarGroups[group];
    const hasActiveChild = channels.some((channel) => channel.id === selectedChannel);

    return (
      <div className="grid gap-1">
        <motion.button
          type="button"
          onClick={() => toggleSidebarGroup(group)}
          className="w-full rounded-lg border-0 px-3 py-2.5 text-left transition-colors flex items-center gap-2"
          style={{
            background: hasActiveChild ? 'rgba(32, 227, 255, 0.10)' : 'rgba(234, 247, 255, 0.035)',
            border: hasActiveChild ? '1px solid rgba(32, 227, 255, 0.22)' : '1px solid rgba(32, 227, 255, 0.08)',
            cursor: 'pointer'
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronDown size={15} style={{ color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={15} style={{ color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
          )}
          <span className="min-w-0 flex-1 truncate tracking-tight" style={{
            fontSize: '12px',
            fontWeight: 950,
            color: hasActiveChild ? 'var(--white)' : 'var(--muted)'
          }}>
            {label}
          </span>
          <span className="tracking-tight" style={{
            color: hasActiveChild ? 'var(--neon-cyan)' : 'var(--muted)',
            fontSize: '11px',
            fontWeight: 900
          }}>
            {channels.length}
          </span>
        </motion.button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              className="grid gap-1 overflow-hidden"
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              {channels.map((channel) => renderSidebarChannel(channel, true))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const handleImportRepositories = () => {
    const savedRepositories = getSavedRepositories();
    const importedRepositories = savedRepositories?.length ? savedRepositories : DEFAULT_REPOSITORIES;
    saveRepositoryImportPreference();
    setRepositoriesImported(true);
    setRepositories(importedRepositories);
    setSelectedRepository(importedRepositories[0]?.id ?? "");
    setSelectedChannel("general");
    setShowRepoDropdown(false);
    handleCloseRepoForm();
  };

  const handleMergePR = (messageId: number) => {
    setMessages(prevMessages => {
      const newMessages = { ...prevMessages };
      const channelMessages = newMessages[selectedChannel];
      if (channelMessages) {
        const originalPR = channelMessages.find(msg => msg.id === messageId);

        if (originalPR && originalPR.type === 'pr') {
          const newMergeMessage = {
            id: Date.now(),
            user: 'GitHub Bot',
            text: `PR #${originalPR.prNumber} merged: ${originalPR.text.replace(/^.*?: /, '')}`,
            time: '방금',
            type: 'pr' as const,
            prNumber: originalPR.prNumber,
            prStatus: 'merged' as const,
            filesChanged: originalPR.filesChanged,
            additions: originalPR.additions,
            deletions: originalPR.deletions
          };

          newMessages[selectedChannel] = [
            ...channelMessages.map(msg =>
              msg.id === messageId && msg.type === 'pr'
                ? { ...msg, prStatus: 'completed' as const }
                : msg
            ),
            newMergeMessage
          ];
        }
      }
      return newMessages;
    });
  };

  const handleReviewPR = (prData: any) => {
    setIsMainExpanded(true);
    setSelectedPR(prData);
    setSelectedIssue(null);
    setSelectedThread(null);
  };

  const handleClosePRReview = () => {
    setSelectedPR(null);
    setSelectedThread(null);
    setIsMainExpanded(false);
  };

  const handleViewIssue = (issueData: any) => {
    setIsMainExpanded(true);
    setSelectedIssue(issueData);
    setSelectedPR(null);
    setSelectedThread(null);
  };

  const handleCloseIssue = () => {
    setSelectedIssue(null);
    setSelectedThread(null);
    setIsMainExpanded(false);
  };

  const handleOpenThread = (message: any) => {
    setSelectedThread(message);
    setSelectedPR(null);    // 스레드 열 때 PR 리뷰 닫기
    setSelectedIssue(null); // 스레드 열 때 이슈 패널 닫기
  };

  const handleCloseThread = () => {
    setSelectedThread(null);
  };

  const handleSendMessage = (text: string, attachments: MessageAttachment[] = []) => {
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;

    const nextMessage = {
      id: Date.now(),
      user: '나',
      text: trimmedText || `${attachments.length}개 항목을 공유합니다.`,
      time: '방금',
      attachments
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannel]: [...(prev[selectedChannel] || []), nextMessage]
    }));
  };

  const handleSendReply = (text: string) => {
    if (selectedThread) {
      const newReply = {
        id: Date.now(),
        user: '나',
        text: text,
        time: '방금'
      };

      setThreadReplies(prev => ({
        ...prev,
        [selectedThread.id]: [...(prev[selectedThread.id] || []), newReply]
      }));
    }
  };

  const handleAddPrThreadReply = (text: string) => {
    if (!selectedPR) return;
    const newReply = {
      id: Date.now(),
      user: '나',
      text,
      time: '방금'
    };
    setThreadReplies(prev => ({
      ...prev,
      [selectedPR.id]: [...(prev[selectedPR.id] || []), newReply]
    }));
  };

  return (
    <div className={pageShellClassName} style={pageShellStyle}>
      <div className={chatGridClassName} style={{
        gridTemplateColumns
      }}>
        {!selectedPR && !selectedIssue && (
          <section className="min-h-0 overflow-y-auto px-6 py-6 rounded-[30px] flex flex-col" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
          <div className="mb-4">
            <div className="relative">
              <button
                onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                className="w-full px-4 py-3 rounded-lg border-0 flex items-center justify-between gap-2 transition-all"
                style={{
                  background: 'rgba(32, 227, 255, 0.12)',
                  border: '1px solid rgba(32, 227, 255, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))'
                  }}>
                    <LayoutGrid size={14} style={{ color: '#021014' }} />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="tracking-tight" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--muted)', lineHeight: 1 }}>워크스페이스</span>
                    <span className="tracking-tight truncate" style={{ fontSize: '14px', fontWeight: 900, color: 'var(--white)' }}>
                      {currentWorkspace.name}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
              </button>

              <AnimatePresence initial={false}>
                {showRepoDropdown && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-10"
                    style={{
                      background: 'rgba(5, 11, 20, 0.95)',
                      border: '1px solid rgba(32, 227, 255, 0.3)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                    }}
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  >
                    {DEFAULT_WORKSPACES.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkspace(ws.id);
                          const firstRepo = repositories.find(r => r.workspaceId === ws.id);
                          if (firstRepo) setSelectedRepository(firstRepo.id);
                          setSelectedChannel('overview');
                          setShowRepoDropdown(false);
                        }}
                        className="w-full border-0 px-3 py-3 text-left transition-colors"
                        style={{
                          background: selectedWorkspace === ws.id ? 'rgba(32, 227, 255, 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(32, 227, 255, 0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate tracking-tight" style={{
                              fontSize: '14px',
                              fontWeight: selectedWorkspace === ws.id ? 900 : 800,
                              color: selectedWorkspace === ws.id ? 'var(--neon-cyan)' : 'var(--white)'
                            }}>
                              {ws.name}
                            </span>
                            <span className="flex-shrink-0 rounded px-1.5 py-0.5 tracking-tight" style={{
                              fontSize: '10px',
                              fontWeight: 900,
                              background: 'rgba(32, 227, 255, 0.12)',
                              color: 'var(--neon-cyan)',
                              border: '1px solid rgba(32, 227, 255, 0.22)'
                            }}>
                              {ws.myRole}
                            </span>
                          </div>
                          <span className="tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>
                            {ws.membersOnline}명 접속 중
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {hasRepositories && (
            <div className="mt-3 mb-2 flex items-center gap-2 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: currentWorkspace.connected ? 'var(--matrix-green)' : 'var(--muted)' }} />
                <span className="tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: currentWorkspace.connected ? 'var(--matrix-green)' : 'var(--muted)' }}>
                  {currentWorkspace.connected ? 'GitHub 연결됨' : '연결되지 않음'}
                </span>
              </div>
              <span className="tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>•</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--matrix-green)' }} />
                <span className="tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>
                  {currentWorkspace.membersOnline}명 접속 중
                </span>
              </div>
            </div>
          )}

          {visibleRepositories.length > 0 ? (
            <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="grid gap-2 min-w-0">
              {renderSidebarChannel({ id: 'overview', label: '통합 개요', icon: Home })}

              <div className="my-1" style={{ borderTop: '1px solid rgba(32, 227, 255, 0.14)' }} />

              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <p style={{ fontSize: '11px', fontWeight: 950, color: 'var(--muted)', margin: 0 }}>채널</p>
                <button
                  type="button"
                  onClick={handleAddCustomChannel}
                  className="grid h-5 w-5 place-items-center rounded border-0 transition-all hover:scale-110"
                  style={{ background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                  aria-label="채널 추가"
                  title="채널 추가"
                >
                  <Plus size={13} />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {addChannelStep === 'select' && (
                  <motion.div
                    key="select"
                    className="mx-1 overflow-hidden rounded-xl px-3 py-3"
                    style={{
                      background: 'rgba(5, 11, 20, 0.58)',
                      border: '1px solid rgba(32, 227, 255, 0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    }}
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', margin: '0 0 10px 0' }}>채널 유형 선택</p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectChannelType('chat')}
                        className="flex items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight transition-all hover:scale-[1.01]"
                        style={{
                          background: 'rgba(32, 227, 255, 0.08)',
                          border: '1px solid rgba(32, 227, 255, 0.2)',
                          cursor: 'pointer'
                        }}
                      >
                        <Hash size={14} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                        <div>
                          <p className="m-0 tracking-tight" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--white)' }}>대화 채널</p>
                          <p className="m-0 tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>팀 대화용 채널</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectChannelType('repo')}
                        className="flex items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left tracking-tight transition-all hover:scale-[1.01]"
                        style={{
                          background: 'rgba(57, 255, 136, 0.08)',
                          border: '1px solid rgba(57, 255, 136, 0.2)',
                          cursor: 'pointer'
                        }}
                      >
                        <GitBranch size={14} style={{ color: 'var(--matrix-green)', flexShrink: 0 }} />
                        <div>
                          <p className="m-0 tracking-tight" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--white)' }}>레포 채널</p>
                          <p className="m-0 tracking-tight" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>GitHub 저장소 연결</p>
                        </div>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelAddChannel}
                      className="mt-2 w-full rounded-full border-0 px-3 py-2 tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.07)',
                        border: '1px solid rgba(32, 227, 255, 0.12)',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 900
                      }}
                    >
                      취소
                    </button>
                  </motion.div>
                )}
                {addChannelStep === 'chat' && (
                  <motion.div
                    key="chat"
                    className="mx-1 overflow-hidden rounded-xl px-3 py-3"
                    style={{
                      background: 'rgba(5, 11, 20, 0.58)',
                      border: '1px solid rgba(32, 227, 255, 0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    }}
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', margin: '0 0 8px 0' }}>채널 이름</p>
                    <input
                      value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSubmitAddChannel(); }
                        if (e.key === 'Escape') { e.preventDefault(); handleCancelAddChannel(); }
                      }}
                      autoFocus
                      placeholder="새 채널 이름..."
                      className="w-full rounded-lg px-3 py-2 outline-none tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.08)',
                        border: '1px solid rgba(32, 227, 255, 0.22)',
                        color: 'var(--white)',
                        fontSize: '13px',
                        fontWeight: 850
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelAddChannel}
                        className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(234, 247, 255, 0.07)',
                          border: '1px solid rgba(32, 227, 255, 0.12)',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 900
                        }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitAddChannel}
                        className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                          color: '#021014',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 950
                        }}
                      >
                        만들기
                      </button>
                    </div>
                  </motion.div>
                )}
                {addChannelStep === 'repo' && (
                  <motion.div
                    key="repo"
                    className="mx-1 overflow-hidden rounded-xl px-3 py-3"
                    style={{
                      background: 'rgba(5, 11, 20, 0.58)',
                      border: '1px solid rgba(57, 255, 136, 0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    }}
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 900, color: 'var(--muted)', margin: '0 0 4px 0' }}>레포 채널</p>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', margin: '0 0 8px 0' }}>GitHub 저장소 URL을 입력하세요</p>
                    <input
                      value={newRepoChannelUrl}
                      onChange={e => setNewRepoChannelUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSubmitAddRepoChannel(); }
                        if (e.key === 'Escape') { e.preventDefault(); handleCancelAddChannel(); }
                      }}
                      autoFocus
                      placeholder="https://github.com/owner/repository"
                      className="w-full rounded-lg px-3 py-2 outline-none tracking-tight"
                      style={{
                        background: 'rgba(234, 247, 255, 0.08)',
                        border: '1px solid rgba(57, 255, 136, 0.22)',
                        color: 'var(--white)',
                        fontSize: '13px',
                        fontWeight: 850
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelAddChannel}
                        className="flex-1 rounded-full border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(234, 247, 255, 0.07)',
                          border: '1px solid rgba(32, 227, 255, 0.12)',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 900
                        }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitAddRepoChannel}
                        disabled={!parseRepoNameFromUrl(newRepoChannelUrl)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-full border-0 px-3 py-2 tracking-tight transition-all disabled:opacity-40"
                        style={{
                          background: 'linear-gradient(135deg, var(--matrix-green), var(--deep-teal))',
                          color: '#021014',
                          cursor: parseRepoNameFromUrl(newRepoChannelUrl) ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: 950
                        }}
                      >
                        <Plus size={13} />
                        등록
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {renderSidebarChannel({ id: 'general', label: '일반', icon: Hash, badge: getChannelBadge('general') })}

              {customChannels.map((ch) => {
                const isActive = selectedChannel === ch.id;
                const isEditing = editingCustomChannelId === ch.id;
                const isMenuOpen = channelMenuOpenId === ch.id;
                return (
                  <div key={ch.id} className="grid gap-0.5">
                    <div className="relative isolate flex w-full items-center rounded-full">
                      {isActive && (
                        <motion.div
                          layoutId="workspaceSidebarActiveTab"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(32, 227, 255, 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                            border: '1px solid rgba(32, 227, 255, 0.30)',
                            boxShadow: '0 0 24px rgba(32, 227, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(14px) saturate(180%)'
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {isEditing ? (
                        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                          <Hash size={15} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                          <input
                            value={editingCustomChannelLabel}
                            onChange={e => setEditingCustomChannelLabel(e.target.value)}
                            onBlur={handleCommitRenameCustomChannel}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleCommitRenameCustomChannel(); }
                              if (e.key === 'Escape') { e.preventDefault(); setEditingCustomChannelId(null); setEditingCustomChannelLabel(''); }
                            }}
                            autoFocus
                            className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-0 py-0 outline-none tracking-tight"
                            style={{ color: 'var(--white)', fontSize: '13px', fontWeight: 900 }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setSelectedChannel(ch.id); setChannelMenuOpenId(null); }}
                          className="relative z-10 flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
                          style={{ cursor: 'pointer' }}
                        >
                          <Hash size={15} style={{ color: isActive ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0 }} />
                          <span className="truncate tracking-tight flex-1" style={{
                            fontSize: '13px',
                            fontWeight: isActive ? 900 : 800,
                            color: isActive ? 'var(--white)' : 'var(--muted)'
                          }}>
                            {ch.label}
                          </span>
                          {getChannelBadge(ch.id) && (
                            <span className="relative z-10 flex-shrink-0 rounded-full px-1.5 py-0.5" style={{
                              background: 'rgba(32, 227, 255, 0.22)',
                              border: '1px solid rgba(32, 227, 255, 0.18)',
                              color: 'var(--neon-cyan)',
                              fontSize: '10px',
                              fontWeight: 950
                            }}>
                              {getChannelBadge(ch.id)}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setChannelMenuOpenId(isMenuOpen ? null : ch.id)}
                        className="relative z-10 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(32,227,255,0.10)]"
                        style={{ cursor: 'pointer' }}
                        aria-label="채널 옵션"
                      >
                        <MoreVertical size={13} style={{ color: 'var(--muted)' }} />
                      </button>
                      <div className="mr-2" />
                    </div>
                    {isMenuOpen && (
                      <div className="mx-2 overflow-hidden rounded-lg" style={{
                        background: 'rgba(5, 11, 20, 0.92)',
                        border: '1px solid rgba(32, 227, 255, 0.18)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleStartRenameCustomChannel(ch)}
                          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(32,227,255,0.08)]"
                          style={{ background: 'transparent', color: 'var(--white)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', borderBottom: '1px solid rgba(32, 227, 255, 0.10)' }}
                        >
                          <Pencil size={13} style={{ color: 'var(--neon-cyan)' }} />
                          이름 수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomChannel(ch.id)}
                          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(255,107,107,0.08)]"
                          style={{ background: 'transparent', color: '#FF6B6B', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                          채널 삭제
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleRepositories.map((repo) => {
                const repoChannelId = REPO_CHANNEL_IDS[repo.id] ?? repo.id;
                const isExpanded = expandedRepoSubmenus[repo.id] ?? repo.id === firstVisibleRepositoryId;
                const isPRActive = selectedRepository === repo.id && selectedChannel === 'pull-requests';
                const isIssueActive = selectedRepository === repo.id && selectedChannel === 'issues';
                const isRepoBodyActive = selectedRepository === repo.id && selectedChannel === repoChannelId;

                return (
                  <div key={repo.id} className="grid gap-1 min-w-0">
                    <div className="relative isolate flex w-full min-w-0 items-center rounded-full">
                      {isRepoBodyActive && (
                        <motion.div
                          layoutId="workspaceSidebarActiveTab"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(57, 255, 136, 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                            border: '1px solid rgba(57, 255, 136, 0.30)',
                            boxShadow: '0 0 24px rgba(57, 255, 136, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(14px) saturate(180%)'
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelectedRepository(repo.id); setSelectedChannel(REPO_CHANNEL_IDS[repo.id] ?? repo.id); }}
                        className="relative z-10 flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
                        style={{ cursor: 'pointer' }}
                      >
                        <GitBranch size={15} style={{ color: isRepoBodyActive ? 'var(--matrix-green)' : 'var(--muted)', flexShrink: 0 }} />
                        <span className="truncate tracking-tight flex-1" style={{
                          fontSize: '13px',
                          fontWeight: isRepoBodyActive ? 900 : 800,
                          color: isRepoBodyActive ? 'var(--white)' : 'var(--muted)'
                        }}>
                          {repo.name}
                        </span>
                        {getChannelBadge(repoChannelId) && (
                          <span className="relative z-10 flex-shrink-0 rounded-full px-1.5 py-0.5" style={{
                            background: 'rgba(32, 227, 255, 0.22)',
                            border: '1px solid rgba(32, 227, 255, 0.18)',
                            color: 'var(--neon-cyan)',
                            fontSize: '10px',
                            fontWeight: 950
                          }}>
                            {getChannelBadge(repoChannelId)}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepoMenuOpenId(repoMenuOpenId === repo.id ? null : repo.id)}
                        className="relative z-10 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(32,227,255,0.10)]"
                        style={{ cursor: 'pointer' }}
                        aria-label="레포 옵션"
                      >
                        <MoreVertical size={13} style={{ color: 'var(--muted)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRepoSubmenu(repo.id)}
                        className="relative z-10 mr-2 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-0 bg-transparent transition-all hover:bg-[rgba(32,227,255,0.10)]"
                        style={{ cursor: 'pointer' }}
                        aria-label={isExpanded ? '서브메뉴 닫기' : '서브메뉴 열기'}
                      >
                        {isExpanded
                          ? <ChevronDown size={13} style={{ color: 'var(--muted)' }} />
                          : <ChevronRight size={13} style={{ color: 'var(--muted)' }} />
                        }
                      </button>
                    </div>

                    {repoMenuOpenId === repo.id && (
                      <div className="mx-2 overflow-hidden rounded-lg" style={{
                        background: 'rgba(5, 11, 20, 0.92)',
                        border: '1px solid rgba(32, 227, 255, 0.18)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                      }}>
                        <button
                          type="button"
                          onClick={() => { handleDeleteRepository(repo.id); setRepoMenuOpenId(null); }}
                          className="flex w-full items-center gap-2 border-0 px-3 py-2 text-left tracking-tight transition-all hover:bg-[rgba(255,107,107,0.08)]"
                          style={{ background: 'transparent', color: '#FF6B6B', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                          채널 삭제
                        </button>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          className="grid gap-1 overflow-hidden"
                          initial={{ height: 0, opacity: 0, y: -4 }}
                          animate={{ height: 'auto', opacity: 1, y: 0 }}
                          exit={{ height: 0, opacity: 0, y: -4 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        >
                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('pull-requests'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {isPRActive && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(57, 255, 136, 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(57, 255, 136, 0.30)',
                                  boxShadow: '0 0 24px rgba(57, 255, 136, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <GitPullRequest size={14} style={{ color: isPRActive ? 'var(--matrix-green)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: isPRActive ? 900 : 800, color: isPRActive ? 'var(--white)' : 'var(--muted)' }}>
                              PR
                            </span>
                            <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
                              background: isPRActive ? 'rgba(57, 255, 136, 0.22)' : 'rgba(234, 247, 255, 0.08)',
                              border: '1px solid rgba(57, 255, 136, 0.18)',
                              color: isPRActive ? 'var(--matrix-green)' : 'var(--muted)',
                              fontSize: '10px',
                              fontWeight: 950
                            }}>
                              {repo.openPRs}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('issues'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {isIssueActive && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(57, 255, 136, 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(57, 255, 136, 0.30)',
                                  boxShadow: '0 0 24px rgba(57, 255, 136, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <CheckSquare size={14} style={{ color: isIssueActive ? 'var(--matrix-green)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: isIssueActive ? 900 : 800, color: isIssueActive ? 'var(--white)' : 'var(--muted)' }}>
                              이슈
                            </span>
                            <span className="relative z-10 flex-shrink-0 rounded-full px-2 py-0.5 tracking-tight" style={{
                              background: isIssueActive ? 'rgba(57, 255, 136, 0.22)' : 'rgba(234, 247, 255, 0.08)',
                              border: '1px solid rgba(57, 255, 136, 0.18)',
                              color: isIssueActive ? 'var(--matrix-green)' : 'var(--muted)',
                              fontSize: '10px',
                              fontWeight: 950
                            }}>
                              {repo.activeIssues}
                            </span>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => { setSelectedRepository(repo.id); setSelectedChannel('work-board'); }}
                            className="relative isolate flex w-full items-center gap-2 rounded-full border-0 py-2.5 pl-8 pr-3 text-left tracking-tight transition-colors"
                            style={{ background: 'transparent', cursor: 'pointer' }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {selectedChannel === 'work-board' && selectedRepository === repo.id && (
                              <motion.div
                                layoutId="workspaceSidebarActiveTab"
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(32, 227, 255, 0.18), rgba(234, 247, 255, 0.045)), rgba(11, 22, 40, 0.52)',
                                  border: '1px solid rgba(32, 227, 255, 0.30)',
                                  boxShadow: '0 0 24px rgba(32, 227, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(14px) saturate(180%)'
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <LayoutGrid size={14} style={{ color: selectedChannel === 'work-board' && selectedRepository === repo.id ? 'var(--neon-cyan)' : 'var(--muted)', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                            <span className="relative z-10 flex-1 tracking-tight" style={{ fontSize: '13px', fontWeight: selectedChannel === 'work-board' && selectedRepository === repo.id ? 900 : 800, color: selectedChannel === 'work-board' && selectedRepository === repo.id ? 'var(--white)' : 'var(--muted)' }}>
                              작업 보드
                            </span>
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <div className="my-1" style={{ borderTop: '1px solid rgba(32, 227, 255, 0.14)' }}></div>

              {renderSidebarGroup('documentation', '문서', DOCUMENTATION_CHANNELS)}
            </div>

            <div className="mt-auto grid gap-2 pt-4">
              <div className="mb-2" style={{ borderTop: '1px solid rgba(32, 227, 255, 0.14)' }}></div>

              {renderSidebarChannel({ id: 'team', label: '팀', icon: Users })}
            </div>
          </div>
          ) : (
            <div className="flex-1 rounded-2xl px-4 py-5" style={{
              background: 'rgba(5, 11, 20, 0.28)',
              border: '1px dashed rgba(32, 227, 255, 0.18)'
            }}>
              <p className="m-0 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 800,
                lineHeight: 1.6
              }}>
                이 팀에는 아직 연결된 리포지토리가 없습니다
              </p>
            </div>
          )}
        </section>
        )}

        {!selectedPR && !selectedIssue && (
          <section className="relative h-full min-h-0 rounded-[30px] overflow-hidden" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            {hasRepositories && selectedChannel !== 'team' && (
              <button
                type="button"
                onClick={() => setIsMainExpanded((expanded) => !expanded)}
                className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border-0 px-4 py-2 tracking-tight transition-all hover:scale-[1.03]"
                style={{
                  background: 'rgba(5, 11, 20, 0.78)',
                  border: '1px solid rgba(32, 227, 255, 0.24)',
                  color: 'var(--neon-cyan)',
                  fontSize: '12px',
                  fontWeight: 950,
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(16px)'
                }}
                aria-label={isMainExpanded ? '채팅 박스 작게 보기' : '채팅 박스 크게 보기'}
                title={isMainExpanded ? '작게 보기' : '크게 보기'}
              >
                {isMainExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                {isMainExpanded ? '작게 보기' : '크게 보기'}
              </button>
            )}
            {selectedChannel === 'overview' ? (
              <OverviewPanel
                repositories={visibleRepositories}
                selectedRepositoryId={selectedRepository}
                onSelectRepository={setSelectedRepository}
              />
            ) : selectedChannel === 'api-spec' ? (
              <APISpecPage embedded />
            ) : selectedChannel === 'erd' ? (
              <ERDPage embedded repositoryId={selectedRepository} repositoryName={selectedRepositoryName} />
            ) : selectedChannel === 'docs' ? (
              <DocsPage embedded />
            ) : selectedChannel === 'general' || customChannels.some(ch => ch.id === selectedChannel) ? (
              <ChannelPanel
                repoName={customChannels.find(ch => ch.id === selectedChannel)?.label}
                onOpenThread={handleOpenThread}
                onOpenInvite={() => setTeamInviteOpen(true)}
              />
            ) : REPO_CHANNEL_IDS_REVERSE[selectedChannel] !== undefined ? (
              <ChannelPanel
                repoId={selectedRepository}
                repoName={currentRepo?.name}
                onOpenThread={handleOpenThread}
                onOpenInvite={() => setTeamInviteOpen(true)}
              />
            ) : repositories.find(r => r.id === selectedChannel) ? (
              <ChannelPanel
                repoId={selectedChannel}
                repoName={repositories.find(r => r.id === selectedChannel)?.name}
                onOpenThread={handleOpenThread}
                onOpenInvite={() => setTeamInviteOpen(true)}
              />
            ) : selectedChannel === 'work-board' ? (
              <WorkBoardPanel
                repositoryName={currentRepo?.name}
                onViewIssue={handleViewIssue}
              />
            ) : selectedChannel === 'team' ? (
              <TeamPanel
                onInvite={() => setTeamInviteOpen(true)}
                onOpenChannel={(channelId) => {
                  setSelectedPR(null);
                  setSelectedThread(null);
                  setSelectedChannel(channelId);
                }}
              />
            ) : (
              <ChatPanel
                title={selectedChannelTitle}
                messages={currentMessages}
                onSendMessage={handleSendMessage}
                showAISummary={false}
                onMergePR={handleMergePR}
                onReviewPR={handleReviewPR}
                onViewIssue={handleViewIssue}
                onOpenThread={handleOpenThread}
                isRepository={isRepository}
              />
            )}
          </section>
        )}

        {selectedPR && (
          <section className="h-full min-h-0 rounded-[30px] overflow-hidden">
            <PRReviewPanel
              prData={selectedPR}
              onClose={handleClosePRReview}
              onMergePR={handleMergePR}
              onAddThreadReply={handleAddPrThreadReply}
            />
          </section>
        )}

        {selectedIssue && (
          <section className="h-full min-h-0 rounded-[30px] overflow-hidden">
            <IssuePanel
              issueData={selectedIssue}
              onClose={handleCloseIssue}
            />
          </section>
        )}

        {selectedThread && !selectedPR && !selectedIssue && (
          <section className="min-h-0 rounded-[30px] overflow-hidden">
            <ThreadPanel
              originalMessage={selectedThread}
              replies={threadReplies[selectedThread.id] || []}
              onClose={handleCloseThread}
              onSendReply={handleSendReply}
            />
          </section>
        )}
      </div>

      <TeamInviteModal
        isOpen={teamInviteOpen}
        onClose={() => setTeamInviteOpen(false)}
      />
    </div>
  );
}

function RepositoryEmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex h-full min-h-[520px] items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-[760px] items-center justify-center gap-6 max-md:flex-col">
        <div className="relative flex-shrink-0">
          <CoffeeLogo
            className="h-32 w-32"
            style={{ filter: 'drop-shadow(0 0 24px rgba(32, 227, 255, 0.28))' }}
          />
          <div className="absolute -bottom-2 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full blur-md" style={{
            background: 'rgba(32, 227, 255, 0.28)'
          }} />
        </div>

        <div className="relative w-full rounded-[28px] px-7 py-7" style={{
          background: 'linear-gradient(135deg, rgba(32, 227, 255, 0.13), rgba(234, 247, 255, 0.055))',
          border: '1px solid rgba(32, 227, 255, 0.22)',
          boxShadow: '0 26px 70px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        }}>
          <span className="absolute left-[-13px] top-12 hidden h-7 w-7 rotate-45 border-b border-l md:block" style={{
            background: 'rgba(25, 45, 66, 0.96)',
            borderColor: 'rgba(32, 227, 255, 0.20)'
          }} />
          <p className="m-0 mb-3 tracking-tight" style={{
            color: 'var(--neon-cyan)',
            fontSize: '13px',
            fontWeight: 950
          }}>
            CodeDock
          </p>
          <h2 className="m-0 mb-3 tracking-[-0.06em]" style={{
            color: 'var(--white)',
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 950,
            lineHeight: 1
          }}>
            리포지토리가 없습니다. 추가해주세요.
          </h2>
          <p className="m-0 mb-6 tracking-tight" style={{
            color: 'var(--muted)',
            fontSize: '15px',
            fontWeight: 800,
            lineHeight: 1.65
          }}>
            CodeDock이 팀에 연결할 저장소를 기다리고 있어요. GitHub 리포지토리를 가져오면 PR 리뷰, 이슈, 문서화 채널이 바로 열립니다.
          </p>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center gap-2 rounded-full border-0 px-6 py-4 tracking-tight transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
              color: '#021014',
              fontSize: '15px',
              fontWeight: 950,
              cursor: 'pointer',
              boxShadow: '0 14px 34px rgba(32, 227, 255, 0.28)'
            }}
            aria-label="리포지토리 가져오기"
          >
            <GitBranch size={18} />
            리포지토리 가져오기
          </button>
        </div>
      </div>
    </div>
  );
}
