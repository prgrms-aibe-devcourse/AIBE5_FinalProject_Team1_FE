import { lazy, Suspense, useMemo, useState } from "react";
import "swagger-ui-react/swagger-ui.css";
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  FileText,
  GitBranch,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";
type ApiStatus = "completed" | "in_progress" | "design";

const SwaggerUI = lazy(() => import("swagger-ui-react"));

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

interface ApiSpec {
  id: number;
  group: string;
  entity: string;
  method: ApiMethod;
  endpoint: string;
  summary: string;
  status: ApiStatus;
  assignee: string;
  relatedIssue?: number;
  relatedPR?: number;
  description: string;
  request?: {
    pathParams?: string;
    headers?: string;
    body?: string;
  };
  response: {
    status: number;
    body: string;
  };
  note?: string;
  addedFromGap?: boolean;
}

const apis: ApiSpec[] = [
  {
    id: 1,
    group: "인증 API",
    entity: "auth",
    method: "POST",
    endpoint: "/api/auth/login",
    summary: "사용자 로그인",
    status: "completed",
    assignee: "김진필",
    relatedIssue: 142,
    relatedPR: 234,
    description: "이메일과 비밀번호로 로그인하고 access token과 refresh token을 발급합니다.",
    request: {
      body: `{
  "email": "user@example.com",
  "password": "password123"
}`,
    },
    response: {
      status: 200,
      body: `{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "김진필"
  }
}`,
    },
  },
  {
    id: 2,
    group: "사용자 API",
    entity: "users",
    method: "GET",
    endpoint: "/api/users/:id",
    summary: "사용자 프로필 조회",
    status: "completed",
    assignee: "김준우",
    relatedIssue: 138,
    relatedPR: 230,
    description: "사용자 프로필과 워크스페이스 참여 정보를 조회합니다.",
    request: {
      pathParams: "id: number (사용자 ID)",
      headers: "Authorization: Bearer {accessToken}",
    },
    response: {
      status: 200,
      body: `{
  "id": 1,
  "email": "user@example.com",
  "name": "김진필",
  "role": "developer"
}`,
    },
  },
  {
    id: 3,
    group: "사용자 API",
    entity: "users",
    method: "DELETE",
    endpoint: "/api/users/me",
    summary: "회원 탈퇴",
    status: "design",
    assignee: "김진필",
    relatedIssue: 151,
    description: "현재 로그인한 사용자의 계정을 비활성화하고 개인 식별 정보를 삭제 또는 익명화합니다.",
    request: {
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "confirmText": "회원 탈퇴",
  "reason": "선택 입력"
}`,
    },
    response: {
      status: 204,
      body: "No Content",
    },
    note: "사용자가 소유한 워크스페이스가 있으면 소유권 이전 또는 워크스페이스 삭제 확인이 필요합니다.",
    addedFromGap: true,
  },
  {
    id: 4,
    group: "워크스페이스 API",
    entity: "workspaces",
    method: "PATCH",
    endpoint: "/api/workspaces/:workspaceId",
    summary: "워크스페이스 이름 수정",
    status: "design",
    assignee: "김진현",
    relatedIssue: 152,
    description: "워크스페이스 이름, 설명, slug 같은 기본 설정을 수정합니다.",
    request: {
      pathParams: "workspaceId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "name": "CodeDock Team",
  "description": "AI 기반 개발 협업 워크스페이스"
}`,
    },
    response: {
      status: 200,
      body: `{
  "id": 10,
  "name": "CodeDock Team",
  "slug": "codedock-team",
  "updatedAt": "2026-05-21T10:00:00Z"
}`,
    },
    addedFromGap: true,
  },
  {
    id: 5,
    group: "워크스페이스 API",
    entity: "workspaces",
    method: "DELETE",
    endpoint: "/api/workspaces/:workspaceId",
    summary: "워크스페이스 삭제",
    status: "design",
    assignee: "김진현",
    relatedIssue: 153,
    description: "워크스페이스와 하위 프로젝트, 초대 링크, 멤버십을 삭제합니다.",
    request: {
      pathParams: "workspaceId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "confirmText": "워크스페이스 삭제"
}`,
    },
    response: {
      status: 202,
      body: `{
  "deletionJobId": "job_8f3a",
  "status": "scheduled"
}`,
    },
    note: "PR/문서/이슈 데이터는 즉시 삭제보다 soft delete 후 보존 기간을 두는 정책이 안전합니다.",
    addedFromGap: true,
  },
  {
    id: 6,
    group: "이슈 API",
    entity: "issues",
    method: "DELETE",
    endpoint: "/api/issues/:issueId",
    summary: "이슈 삭제",
    status: "design",
    assignee: "김재준",
    relatedIssue: 154,
    description: "이슈를 삭제하거나 보드에서 숨김 처리합니다. 관련 PR 링크는 감사 로그에 남깁니다.",
    request: {
      pathParams: "issueId: number",
      headers: "Authorization: Bearer {accessToken}",
    },
    response: {
      status: 204,
      body: "No Content",
    },
    addedFromGap: true,
  },
  {
    id: 7,
    group: "문서 API",
    entity: "docs",
    method: "PATCH",
    endpoint: "/api/docs/:docId",
    summary: "문서 수정",
    status: "design",
    assignee: "김준우",
    relatedIssue: 155,
    description: "AI가 생성한 문서 또는 사용자가 작성한 문서의 제목과 본문을 수정합니다.",
    request: {
      pathParams: "docId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "title": "PR #234 인증 미들웨어 요약",
  "content": "수정된 문서 본문",
  "changeNote": "보안 체크리스트 보강"
}`,
    },
    response: {
      status: 200,
      body: `{
  "id": 33,
  "title": "PR #234 인증 미들웨어 요약",
  "version": 4,
  "updatedAt": "2026-05-21T10:10:00Z"
}`,
    },
    addedFromGap: true,
  },
  {
    id: 8,
    group: "문서 API",
    entity: "docs",
    method: "DELETE",
    endpoint: "/api/docs/:docId",
    summary: "문서 삭제",
    status: "design",
    assignee: "김준우",
    relatedIssue: 156,
    description: "문서를 삭제하거나 휴지통 상태로 전환합니다.",
    request: {
      pathParams: "docId: number",
      headers: "Authorization: Bearer {accessToken}",
    },
    response: {
      status: 204,
      body: "No Content",
    },
    note: "문서 복구를 고려해 deletedAt 기반 soft delete를 권장합니다.",
    addedFromGap: true,
  },
  {
    id: 9,
    group: "스레드 댓글 API",
    entity: "thread_comments",
    method: "PATCH",
    endpoint: "/api/threads/:threadId/comments/:commentId",
    summary: "스레드 댓글 수정",
    status: "design",
    assignee: "김진현",
    relatedIssue: 157,
    description: "PR/이슈 스레드에 달린 댓글 내용을 수정합니다.",
    request: {
      pathParams: "threadId: number, commentId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "content": "수정된 댓글 내용"
}`,
    },
    response: {
      status: 200,
      body: `{
  "id": 202,
  "content": "수정된 댓글 내용",
  "editedAt": "2026-05-21T10:20:00Z"
}`,
    },
    addedFromGap: true,
  },
  {
    id: 10,
    group: "스레드 댓글 API",
    entity: "thread_comments",
    method: "DELETE",
    endpoint: "/api/threads/:threadId/comments/:commentId",
    summary: "스레드 댓글 삭제",
    status: "design",
    assignee: "김진현",
    relatedIssue: 158,
    description: "스레드 댓글을 삭제합니다. 일반 채팅 메시지와 별도 정책을 적용합니다.",
    request: {
      pathParams: "threadId: number, commentId: number",
      headers: "Authorization: Bearer {accessToken}",
    },
    response: {
      status: 204,
      body: "No Content",
    },
    note: "삭제된 댓글은 UI에서 '삭제된 댓글입니다'로 표시할 수 있습니다.",
    addedFromGap: true,
  },
  {
    id: 11,
    group: "리포지토리 API",
    entity: "repositories",
    method: "DELETE",
    endpoint: "/api/repositories/:repositoryId",
    summary: "리포지토리 연동 해제",
    status: "design",
    assignee: "김재준",
    relatedIssue: 159,
    description: "GitHub 리포지토리 연동을 해제하고 동기화 토큰과 webhook을 정리합니다.",
    request: {
      pathParams: "repositoryId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "revokeWebhook": true,
  "deleteSyncedData": false
}`,
    },
    response: {
      status: 200,
      body: `{
  "repositoryId": 7,
  "connected": false,
  "webhookRevoked": true
}`,
    },
    note: "정책 언급만 있던 부분을 명시적 기능으로 분리했습니다.",
    addedFromGap: true,
  },
  {
    id: 12,
    group: "초대 API",
    entity: "invite_links",
    method: "DELETE",
    endpoint: "/api/invites/:inviteId",
    summary: "초대 링크 취소/만료",
    status: "design",
    assignee: "김진필",
    relatedIssue: 160,
    description: "발급된 초대 링크를 취소하거나 즉시 만료 처리합니다.",
    request: {
      pathParams: "inviteId: number",
      headers: "Authorization: Bearer {accessToken}",
      body: `{
  "reason": "잘못 공유된 링크"
}`,
    },
    response: {
      status: 200,
      body: `{
  "id": 91,
  "status": "revoked",
  "revokedAt": "2026-05-21T10:30:00Z"
}`,
    },
    addedFromGap: true,
  },
  {
    id: 13,
    group: "PR 분석 API",
    entity: "pull_requests",
    method: "POST",
    endpoint: "/api/pr/analyze",
    summary: "PR 자동 분석",
    status: "in_progress",
    assignee: "AI팀",
    relatedIssue: 142,
    description: "PR 변경 파일을 분석해 위험도, 리뷰 포인트, 문서 업데이트 후보를 생성합니다.",
    request: {
      body: `{
  "prId": 234,
  "repositoryId": 7
}`,
    },
    response: {
      status: 200,
      body: `{
  "riskScore": 85,
  "summary": "인증 미들웨어가 추가되었습니다.",
  "checklist": [...]
}`,
    },
  },
];

const gapItems = [
  "사용자: DELETE /api/users/me 회원 탈퇴",
  "워크스페이스: PATCH/DELETE 이름 수정 및 삭제",
  "이슈: DELETE /api/issues/:issueId",
  "문서: PATCH/DELETE 수정 및 삭제",
  "스레드 댓글: PATCH/DELETE 댓글 수정 및 삭제",
  "리포지토리 연동: DELETE 명시적 연동 해제",
  "초대 링크: DELETE 링크 취소/만료",
];

type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
  };
};

function toOpenApiPath(endpoint: string) {
  return endpoint.replace(/:([A-Za-z_][\w]*)/g, "{$1}");
}

function getPathParameters(endpoint: string) {
  return Array.from(endpoint.matchAll(/:([A-Za-z_][\w]*)/g)).map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
    description: `${match[1]} identifier`,
  }));
}

function parseExample(payload?: string) {
  if (!payload || payload === "No Content") return undefined;

  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function createOpenApiSpec(apiList: ApiSpec[]): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};

  for (const api of apiList) {
    const path = toOpenApiPath(api.endpoint);
    const method = api.method.toLowerCase();
    const requestExample = parseExample(api.request?.body);
    const responseExample = parseExample(api.response.body);
    const operation: Record<string, unknown> = {
      tags: [api.group],
      summary: api.summary,
      description: api.description,
      operationId: `${api.method.toLowerCase()}-${api.entity}-${api.id}`,
      parameters: [
        ...getPathParameters(api.endpoint),
        ...(api.request?.headers
          ? [
              {
                name: "Authorization",
                in: "header",
                required: true,
                schema: { type: "string" },
                example: "Bearer {accessToken}",
              },
            ]
          : []),
      ],
      responses: {
        [api.response.status]: {
          description: api.response.status === 204 ? "No Content" : "Success response",
          content:
            responseExample === undefined
              ? undefined
              : {
                  "application/json": {
                    schema: { type: typeof responseExample === "string" ? "string" : "object" },
                    example: responseExample,
                  },
                },
        },
      },
    };

    if (requestExample !== undefined && api.method !== "GET") {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: { type: typeof requestExample === "string" ? "string" : "object" },
            example: requestExample,
          },
        },
      };
    }

    paths[path] = {
      ...(paths[path] ?? {}),
      [method]: operation,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "CodeDock API",
      version: "1.0.0",
      description: "OpenAPI document generated from the CodeDock API specification page.",
    },
    servers: [{ url: "https://api.codedock.dev", description: "Production" }],
    tags: Array.from(new Set(apiList.map((api) => api.group))).map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}

interface APISpecPageProps {
  embedded?: boolean;
  workspaceId?: number;
}

export function APISpecPage({ embedded = false, workspaceId }: APISpecPageProps) {
  const [selectedAPI, setSelectedAPI] = useState<number>(3);

  const selectedAPIData = apis.find((api) => api.id === selectedAPI) ?? apis[0];
  const openApiSpec = useMemo(() => createOpenApiSpec(apis), []);
  const groups = useMemo(() => {
    return Array.from(new Set(apis.map((api) => api.group))).map((name) => ({
      name,
      count: apis.filter((api) => api.group === name).length,
      gapCount: apis.filter((api) => api.group === name && api.addedFromGap).length,
    }));
  }, []);

  const methodCounts = useMemo(() => {
    return apis.reduce<Record<ApiMethod, number>>(
      (acc, api) => {
        acc[api.method] += 1;
        return acc;
      },
      { GET: 0, POST: 0, PATCH: 0, DELETE: 0 },
    );
  }, []);

  return (
    <div className={embedded ? "codedock-scrollbar-hidden h-full overflow-y-auto px-5 py-5" : "w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20"}>
      <div className={embedded ? "mb-5" : "mb-8"}>
        <div
          className={`inline-flex items-center gap-2 rounded-full ${embedded ? "mb-3 px-3 py-1.5" : "mb-4 px-4 py-2"}`}
          style={{
            background: "rgba(var(--codedock-primary-rgb), 0.09)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
            color: "var(--neon-cyan)",
          }}
        >
          <ShieldAlert size={16} strokeWidth={2.4} />
          <span className="text-sm font-black tracking-tight">누락 CRUD 보강 반영</span>
        </div>
        <h1
          className="m-0 mb-3 leading-[0.9] tracking-tight"
          style={{
            fontSize: embedded ? "clamp(30px, 3vw, 44px)" : "clamp(48px, 6vw, 72px)",
            fontWeight: 950,
            color: "var(--white)",
            textShadow: "0 0 22px rgba(var(--codedock-primary-rgb), 0.18)",
          }}
        >
          API 명세
        </h1>
        <p
          className="m-0 max-w-[760px] leading-8 tracking-tight"
          style={{
            fontSize: embedded ? "14px" : "18px",
            fontWeight: 700,
            color: "var(--muted)",
          }}
        >
          사용자 탈퇴, 워크스페이스 수정/삭제, 문서 수정/삭제, 스레드 댓글 수정/삭제처럼 빠져 있던 관리 기능을 명시적인 API로 추가했습니다.
        </p>
      </div>

      <div className={embedded ? "grid grid-cols-2 gap-3 mb-5 xl:grid-cols-4" : "grid gap-4 mb-9 md:grid-cols-4"}>
        <StatCard label="전체 엔드포인트" value={apis.length} color="var(--neon-cyan)" />
        <StatCard label="이번에 보강" value={apis.filter((api) => api.addedFromGap).length} color="var(--matrix-green)" />
        <StatCard label="PATCH" value={methodCounts.PATCH} color="#FFD93D" />
        <StatCard label="DELETE" value={methodCounts.DELETE} color="#FF6B6B" />
      </div>

      <section
        className={embedded ? "mb-5 rounded-2xl px-5 py-5" : "mb-6 rounded-[30px] px-6 py-6"}
        style={{
          background: "rgba(11, 22, 40, 0.82)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
          boxShadow: embedded ? "0 14px 36px rgba(0, 0, 0, 0.28)" : "0 20px 60px rgba(0, 0, 0, 0.32)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="m-0 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
              보강 체크리스트
            </h2>
            <p className="m-0 mt-2 text-sm font-bold leading-6 tracking-tight" style={{ color: "var(--muted)" }}>
              요청하신 누락 항목을 API 명세에 바로 추적 가능하게 넣었습니다.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:w-[720px]">
            {gapItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(234, 247, 255, 0.055)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                }}
              >
                <CheckCircle2 size={17} strokeWidth={2.6} style={{ color: "var(--matrix-green)", marginTop: 2 }} />
                <span className="text-sm font-bold leading-6 tracking-tight" style={{ color: "#DFFAFF" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={embedded ? "grid gap-5 xl:grid-cols-[340px_1fr]" : "grid gap-6 lg:grid-cols-[410px_1fr]"}>
        <section
          className={embedded ? "rounded-2xl px-5 py-5" : "rounded-[30px] px-6 py-6"}
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
            boxShadow: embedded ? "0 14px 36px rgba(0, 0, 0, 0.28)" : "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="m-0 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
              엔드포인트
            </h2>
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border-0"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                color: "#021014",
              }}
              type="button"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="mb-5 grid gap-2">
            {groups.map((group) => (
              <div
                key={group.name}
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(5, 11, 20, 0.42)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
                }}
              >
                <span className="text-sm font-black tracking-tight" style={{ color: "var(--white)" }}>
                  {group.name}
                </span>
                <span className="text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: group.gapCount ? "var(--matrix-green)" : "var(--muted)" }}>
                  {group.count}개 {group.gapCount ? `(+${group.gapCount})` : ""}
                </span>
              </div>
            ))}
          </div>

          <div className={`grid gap-2 overflow-y-auto pr-1 ${embedded ? "codedock-scrollbar-hidden max-h-[420px]" : "max-h-[650px]"}`}>
            {apis.map((api) => (
              <button
                key={api.id}
                onClick={() => setSelectedAPI(api.id)}
                className="w-full rounded-2xl px-4 py-4 text-left transition-all"
                style={{
                  background: selectedAPI === api.id ? "rgba(var(--codedock-primary-rgb), 0.15)" : "rgba(5, 11, 20, 0.42)",
                  border: selectedAPI === api.id ? "1px solid rgba(var(--codedock-primary-rgb), 0.32)" : "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
                  cursor: "pointer",
                }}
                type="button"
              >
                <div className="mb-2 flex items-center gap-2">
                  <MethodBadge method={api.method} />
                  <StatusBadge status={api.status} />
                  {api.addedFromGap && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[var(--krds-body-xsmall)] font-black tracking-tight"
                      style={{
                        background: "rgba(var(--codedock-secondary-rgb), 0.14)",
                        color: "var(--matrix-green)",
                      }}
                    >
                      추가
                    </span>
                  )}
                </div>
                <p className="m-0 mb-1 font-mono text-sm font-black tracking-tight" style={{ color: "var(--white)" }}>
                  {api.endpoint}
                </p>
                <p className="m-0 text-[var(--krds-body-xsmall)] font-bold leading-5 tracking-tight" style={{ color: "var(--muted)" }}>
                  {api.summary}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section
          className={embedded ? "rounded-2xl px-5 py-5" : "rounded-[30px] px-8 py-8"}
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
            boxShadow: embedded ? "0 14px 36px rgba(0, 0, 0, 0.28)" : "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <MethodBadge method={selectedAPIData.method} large />
                <StatusBadge status={selectedAPIData.status} />
                <span className="rounded-full px-3 py-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ background: "rgba(234, 247, 255, 0.055)", color: "var(--muted)" }}>
                  {selectedAPIData.group}
                </span>
              </div>
              <h2 className="m-0 font-mono text-2xl font-black leading-snug tracking-tight" style={{ color: "var(--white)" }}>
                {selectedAPIData.endpoint}
              </h2>
              <p className="m-0 mt-2 text-base font-bold leading-7 tracking-tight" style={{ color: "var(--muted)" }}>
                {selectedAPIData.summary}
              </p>
            </div>
            {selectedAPIData.method === "DELETE" && <Trash2 size={26} strokeWidth={2.4} style={{ color: "#FF6B6B" }} />}
          </div>

          <p className="mb-6 mt-0 text-sm font-semibold leading-7 tracking-tight" style={{ color: "#DFFAFF" }}>
            {selectedAPIData.description}
          </p>

          {selectedAPIData.note && (
            <div
              className="mb-6 flex items-start gap-3 rounded-2xl px-5 py-4"
              style={{
                background: "rgba(255, 107, 107, 0.09)",
                border: "1px solid rgba(255, 107, 107, 0.28)",
              }}
            >
              <AlertTriangle size={20} style={{ color: "#FF6B6B", flexShrink: 0, marginTop: 2 }} />
              <p className="m-0 text-sm font-bold leading-6 tracking-tight" style={{ color: "#FFB4B4" }}>
                {selectedAPIData.note}
              </p>
            </div>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <InfoBlock icon={Code} label="담당" value={selectedAPIData.assignee} />
            <InfoBlock icon={LinkIcon} label="관련 이슈" value={selectedAPIData.relatedIssue ? `Issue #${selectedAPIData.relatedIssue}` : "미지정"} />
            <InfoBlock icon={GitBranch} label="관련 PR" value={selectedAPIData.relatedPR ? `PR #${selectedAPIData.relatedPR}` : "미지정"} />
          </div>

          <div className="grid gap-5">
            <SpecBlock title="요청" payload={formatRequest(selectedAPIData)} />
            <SpecBlock title={`응답 ${selectedAPIData.response.status}`} payload={selectedAPIData.response.body} />
          </div>
        </section>
      </div>

      <section
        className={embedded ? "mt-5 overflow-hidden rounded-2xl" : "mt-7 overflow-hidden rounded-[30px]"}
        style={{
          background: "rgba(11, 22, 40, 0.86)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
          boxShadow: embedded ? "0 14px 36px rgba(0, 0, 0, 0.28)" : "0 20px 60px rgba(0, 0, 0, 0.32)",
          backdropFilter: "blur(16px)",
        }}
      >
        <style>
          {`
            .codedock-swagger .swagger-ui {
              color: #EAF7FF;
              font-family: Pretendard, ui-sans-serif, system-ui, sans-serif;
            }

            .codedock-swagger .swagger-ui .info,
            .codedock-swagger .swagger-ui .scheme-container,
            .codedock-swagger .swagger-ui section.models {
              background: transparent;
              box-shadow: none;
            }

            .codedock-swagger .swagger-ui .info .title,
            .codedock-swagger .swagger-ui .opblock-tag,
            .codedock-swagger .swagger-ui .opblock-summary-path,
            .codedock-swagger .swagger-ui .opblock-summary-description,
            .codedock-swagger .swagger-ui table thead tr td,
            .codedock-swagger .swagger-ui table thead tr th,
            .codedock-swagger .swagger-ui .parameter__name,
            .codedock-swagger .swagger-ui .parameter__type,
            .codedock-swagger .swagger-ui .response-col_status,
            .codedock-swagger .swagger-ui .response-col_description {
              color: #EAF7FF !important;
            }

            .codedock-swagger .swagger-ui .opblock {
              background: rgba(5, 11, 20, 0.50) !important;
              border-color: rgba(var(--codedock-primary-rgb), 0.18) !important;
              box-shadow: none;
            }

            .codedock-swagger .swagger-ui .opblock .opblock-summary {
              border-color: rgba(234, 247, 255, 0.08) !important;
            }

            .codedock-swagger .swagger-ui .opblock .opblock-section-header {
              background: rgba(234, 247, 255, 0.045);
              box-shadow: none;
            }

            .codedock-swagger .swagger-ui .opblock-description-wrapper p,
            .codedock-swagger .swagger-ui .responses-inner h4,
            .codedock-swagger .swagger-ui .responses-inner h5,
            .codedock-swagger .swagger-ui .markdown p,
            .codedock-swagger .swagger-ui .tab li,
            .codedock-swagger .swagger-ui .model-title,
            .codedock-swagger .swagger-ui .model {
              color: var(--soft-mint) !important;
            }

            .codedock-swagger .swagger-ui textarea,
            .codedock-swagger .swagger-ui .body-param__text,
            .codedock-swagger .swagger-ui .highlight-code {
              background: rgba(5, 11, 20, 0.76) !important;
              color: #EAF7FF !important;
            }
          `}
        </style>
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
            background: "linear-gradient(90deg, rgba(var(--codedock-primary-rgb), 0.10), rgba(var(--codedock-secondary-rgb), 0.045), rgba(5, 11, 20, 0.72))",
          }}
        >
          <div>
            <p className="m-0 mb-1 font-mono text-[var(--krds-body-xsmall)] font-black uppercase tracking-[0.14em]" style={{ color: "var(--neon-cyan)" }}>
              Swagger / OpenAPI 3.1
            </p>
            <h2 className="m-0 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
              Swagger UI 연동 미리보기
            </h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{
            background: "rgba(var(--codedock-secondary-rgb), 0.12)",
            border: "1px solid rgba(var(--codedock-secondary-rgb), 0.24)",
            color: "var(--matrix-green)",
          }}>
            OpenAPI paths {Object.keys(openApiSpec.paths).length}개
          </span>
        </div>
        <div className={`codedock-swagger codedock-scrollbar-hidden overflow-y-auto ${embedded ? "max-h-[520px]" : "max-h-[720px]"} px-4 py-4`}>
          <Suspense fallback={<SwaggerPreviewFallback />}>
            <SwaggerUI
              spec={openApiSpec}
              docExpansion="none"
              defaultModelsExpandDepth={0}
              displayRequestDuration
              tryItOutEnabled={false}
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function SwaggerPreviewFallback() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[320px] rounded-2xl"
      style={{
        background: "rgba(5, 11, 20, 0.58)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
      }}
    />
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-3xl px-5 py-5"
      style={{
        background: "rgba(11, 22, 40, 0.82)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
        backdropFilter: "blur(16px)",
      }}
    >
      <FileText size={20} style={{ color, marginBottom: 8 }} />
      <p className="m-0 mb-2 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="m-0 text-4xl font-black tracking-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function MethodBadge({ method, large = false }: { method: ApiMethod; large?: boolean }) {
  const color = getMethodColor(method);
  return (
    <span
      className="rounded-lg font-mono font-black tracking-tight"
      style={{
        background: colorAlpha(color, 13),
        border: `1px solid ${color}`,
        color,
        fontSize: large ? 14 : "var(--krds-body-xsmall)",
        padding: large ? "6px 10px" : "3px 8px",
      }}
    >
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: ApiStatus }) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[var(--krds-body-xsmall)] font-black tracking-tight"
      style={{
        background: colorAlpha(color, 13),
        color,
      }}
    >
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </span>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof Code; label: string; value: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: "rgba(5, 11, 20, 0.42)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
      }}
    >
      <p className="m-0 mb-2 flex items-center gap-2 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: "var(--neon-cyan)" }}>
        <Icon size={14} />
        {label}
      </p>
      <p className="m-0 text-sm font-bold tracking-tight" style={{ color: "var(--white)" }}>
        {value}
      </p>
    </div>
  );
}

function SpecBlock({ title, payload }: { title: string; payload: string }) {
  return (
    <div>
      <h3 className="m-0 mb-3 text-lg font-black tracking-tight" style={{ color: "var(--white)" }}>
        {title}
      </h3>
      <pre
        className="m-0 overflow-x-auto rounded-2xl p-4 font-mono text-sm leading-6"
        style={{
          background: "rgba(5, 11, 20, 0.62)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
          color: "var(--soft-mint)",
        }}
      >
        {payload || "No Body"}
      </pre>
    </div>
  );
}

function formatRequest(api: ApiSpec) {
  const lines = [];
  if (api.request?.pathParams) lines.push(`Path Params:\n${api.request.pathParams}`);
  if (api.request?.headers) lines.push(`Headers:\n${api.request.headers}`);
  if (api.request?.body) lines.push(`Body:\n${api.request.body}`);
  return lines.join("\n\n");
}

function getMethodColor(method: ApiMethod) {
  switch (method) {
    case "GET":
      return "#6BCF7F";
    case "POST":
      return "var(--neon-cyan)";
    case "PATCH":
      return "#FFD93D";
    case "DELETE":
      return "#FF6B6B";
    default:
      return "var(--muted)";
  }
}

function getStatusColor(status: ApiStatus) {
  switch (status) {
    case "completed":
      return "var(--matrix-green)";
    case "in_progress":
      return "var(--neon-cyan)";
    case "design":
      return "#FFD93D";
    default:
      return "var(--muted)";
  }
}

function getStatusLabel(status: ApiStatus) {
  switch (status) {
    case "completed":
      return "완료";
    case "in_progress":
      return "구현중";
    case "design":
      return "설계";
    default:
      return "미정";
  }
}

function getStatusIcon(status: ApiStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={14} />;
    case "in_progress":
      return <MessageSquare size={14} />;
    case "design":
      return <Code size={14} />;
    default:
      return null;
  }
}
