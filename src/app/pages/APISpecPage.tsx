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
  Trash2,
} from "lucide-react";
import { type ApiSpecResponse, type ApiSpecMethod, type ApiSpecStatus } from "../api/apiSpec";

const SwaggerUI = lazy(() => import("swagger-ui-react"));

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

interface APISpecPageProps {
  embedded?: boolean;
  workspaceId?: number;
}

export function APISpecPage({ embedded = false, workspaceId }: APISpecPageProps) {
  const [apis, setApis] = useState<ApiSpecResponse[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [swaggerUrl, setSwaggerUrl] = useState("");

  const selectedApiData = apis.find((api) => api.id === selectedApiId) ?? apis[0] ?? null;

  const groups = useMemo(() => {
    const groupNames = Array.from(
      new Set(apis.map((api) => api.groupName).filter((g): g is string => g !== null))
    );
    return groupNames.map((name) => ({
      name,
      count: apis.filter((api) => api.groupName === name).length,
    }));
  }, [apis]);

  const methodCounts = useMemo(() => {
    return apis.reduce<Record<ApiSpecMethod, number>>(
      (acc, api) => {
        acc[api.method] = (acc[api.method] ?? 0) + 1;
        return acc;
      },
      { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 },
    );
  }, [apis]);

  return (
    <div className={embedded ? "codedock-scrollbar-hidden h-full overflow-y-auto px-5 py-5" : "w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20"}>
      <div className={embedded ? "mb-5" : "mb-8"}>
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
      </div>

      <div className={embedded ? "grid grid-cols-2 gap-3 mb-5 xl:grid-cols-3" : "grid gap-4 mb-9 md:grid-cols-3"}>
        <StatCard label="전체 엔드포인트" value={apis.length} color="var(--neon-cyan)" />
        <StatCard label="PATCH" value={methodCounts.PATCH} color="#FFD93D" />
        <StatCard label="DELETE" value={methodCounts.DELETE} color="#FF6B6B" />
      </div>

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
                <span className="text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: "var(--muted)" }}>
                  {group.count}개
                </span>
              </div>
            ))}
          </div>

          {apis.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-8 text-center tracking-tight"
              style={{
                background: "rgba(234, 247, 255, 0.045)",
                border: "1px dashed rgba(var(--codedock-primary-rgb), 0.24)",
              }}
            >
              <p className="m-0 text-sm font-black" style={{ color: "var(--white)" }}>
                API 명세가 없습니다
              </p>
              <p className="m-0 mt-1 text-[var(--krds-body-xsmall)] font-bold" style={{ color: "var(--muted)" }}>
                추가 버튼으로 명세를 등록할 수 있어요.
              </p>
            </div>
          ) : (
            <div className={`grid gap-2 overflow-y-auto pr-1 ${embedded ? "codedock-scrollbar-hidden max-h-[420px]" : "max-h-[650px]"}`}>
              {apis.map((api) => (
                <button
                  key={api.id}
                  onClick={() => setSelectedApiId(api.id)}
                  className="w-full rounded-2xl px-4 py-4 text-left transition-all"
                  style={{
                    background: selectedApiData?.id === api.id ? "rgba(var(--codedock-primary-rgb), 0.15)" : "rgba(5, 11, 20, 0.42)",
                    border: selectedApiData?.id === api.id ? "1px solid rgba(var(--codedock-primary-rgb), 0.32)" : "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <MethodBadge method={api.method} />
                    <StatusBadge status={api.status} />
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
          )}
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
          {!selectedApiData ? (
            <div className="flex h-full min-h-[200px] items-center justify-center text-center">
              <p className="m-0 text-sm font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                왼쪽에서 API 명세를 선택하세요.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <MethodBadge method={selectedApiData.method} large />
                    <StatusBadge status={selectedApiData.status} />
                    {selectedApiData.groupName && (
                      <span className="rounded-full px-3 py-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ background: "rgba(234, 247, 255, 0.055)", color: "var(--muted)" }}>
                        {selectedApiData.groupName}
                      </span>
                    )}
                  </div>
                  <h2 className="m-0 font-mono text-2xl font-black leading-snug tracking-tight" style={{ color: "var(--white)" }}>
                    {selectedApiData.endpoint}
                  </h2>
                  <p className="m-0 mt-2 text-base font-bold leading-7 tracking-tight" style={{ color: "var(--muted)" }}>
                    {selectedApiData.summary}
                  </p>
                </div>
                {selectedApiData.method === "DELETE" && <Trash2 size={26} strokeWidth={2.4} style={{ color: "#FF6B6B" }} />}
              </div>

              <p className="mb-6 mt-0 text-sm font-semibold leading-7 tracking-tight" style={{ color: "#DFFAFF" }}>
                {selectedApiData.description}
              </p>

              {selectedApiData.note && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-2xl px-5 py-4"
                  style={{
                    background: "rgba(255, 107, 107, 0.09)",
                    border: "1px solid rgba(255, 107, 107, 0.28)",
                  }}
                >
                  <AlertTriangle size={20} style={{ color: "#FF6B6B", flexShrink: 0, marginTop: 2 }} />
                  <p className="m-0 text-sm font-bold leading-6 tracking-tight" style={{ color: "#FFB4B4" }}>
                    {selectedApiData.note}
                  </p>
                </div>
              )}

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <InfoBlock icon={Code} label="담당" value={selectedApiData.assigneeId ? String(selectedApiData.assigneeId) : "미지정"} />
                <InfoBlock icon={LinkIcon} label="관련 이슈" value={selectedApiData.relatedIssueId ? `Issue #${selectedApiData.relatedIssueId}` : "미지정"} />
                <InfoBlock icon={GitBranch} label="관련 PR" value={selectedApiData.relatedPrId ? `PR #${selectedApiData.relatedPrId}` : "미지정"} />
              </div>

              <div className="grid gap-5">
                <SpecBlock title="요청" payload={formatRequest(selectedApiData)} />
                <SpecBlock title={`응답 ${selectedApiData.responseStatus ?? ""}`} payload={selectedApiData.responseBody ?? ""} />
              </div>
            </>
          )}
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
        </div>
        <div className={`codedock-swagger codedock-scrollbar-hidden overflow-y-auto ${embedded ? "max-h-[520px]" : "max-h-[720px]"} px-4 py-4`}>
          {swaggerUrl ? (
            <SwaggerUI
              url={swaggerUrl}
              docExpansion="none"
              defaultModelsExpandDepth={0}
              displayRequestDuration
              tryItOutEnabled={false}
            />
          ) : (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="m-0 text-sm font-bold tracking-tight" style={{ color: "var(--muted)" }}>
                Swagger URL이 설정되지 않았습니다.
              </p>
            </div>
          )}
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

function MethodBadge({ method, large = false }: { method: ApiSpecMethod; large?: boolean }) {
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

function StatusBadge({ status }: { status: ApiSpecStatus }) {
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

function formatRequest(api: ApiSpecResponse) {
  const lines = [];
  if (api.pathParams) lines.push(`Path Params:\n${api.pathParams}`);
  if (api.headers) lines.push(`Headers:\n${api.headers}`);
  if (api.queryParams) lines.push(`Query Params:\n${api.queryParams}`);
  if (api.requestBody) lines.push(`Body:\n${api.requestBody}`);
  return lines.join("\n\n");
}

function getMethodColor(method: ApiSpecMethod) {
  switch (method) {
    case "GET":
      return "#6BCF7F";
    case "POST":
      return "var(--neon-cyan)";
    case "PUT":
      return "#A78BFA";
    case "PATCH":
      return "#FFD93D";
    case "DELETE":
      return "#FF6B6B";
    default:
      return "var(--muted)";
  }
}

function getStatusColor(status: ApiSpecStatus) {
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

function getStatusLabel(status: ApiSpecStatus) {
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

function getStatusIcon(status: ApiSpecStatus) {
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
