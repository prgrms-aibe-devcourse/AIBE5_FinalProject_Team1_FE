import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "swagger-ui-react/swagger-ui.css";
import {
  CheckCircle2,
  Code,
  Edit2,
  FileText,
  GitBranch,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  getApiSpecs,
  getSwaggerUrl,
  registerSwaggerUrl,
  resyncSwagger,
  createApiSpec,
  updateApiSpec,
  deleteApiSpec,
  generateAiChecklist,
  type ApiSpecResponse,
  type ApiSpecMethod,
  type ApiSpecStatus,
  type ApiSpecSourceType,
} from "../api/apiSpec";
import { ApiClientError } from "../api/client";
import { useWorkspace } from "../contexts/WorkspaceContext";

const SwaggerUI = lazy(() => import("swagger-ui-react"));

const colorAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const inputStyle = {
  width: "100%",
  background: "rgba(5, 11, 20, 0.62)",
  border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
  borderRadius: 12,
  color: "var(--white)",
  fontSize: 14,
  padding: "9px 13px",
  outline: "none",
  fontFamily: "inherit",
} as const;

type FormMode = "view" | "create" | "edit";

type FormData = {
  title: string;
  method: ApiSpecMethod;
  endpoint: string;
  groupName: string;
  entityName: string;
  summary: string;
  description: string;
  status: ApiSpecStatus;
  pathParams: string;
  headers: string;
  queryParams: string;
  requestBody: string;
  responseBody: string;
  responseStatus: string;
  version: string;
  note: string;
};

const EMPTY_FORM: FormData = {
  title: "",
  method: "GET",
  endpoint: "",
  groupName: "",
  entityName: "",
  summary: "",
  description: "",
  status: "design",
  pathParams: "",
  headers: "",
  queryParams: "",
  requestBody: "",
  responseBody: "",
  responseStatus: "",
  version: "",
  note: "",
};

function apiToForm(api: ApiSpecResponse): FormData {
  return {
    title: api.title,
    method: api.method,
    endpoint: api.endpoint,
    groupName: api.groupName ?? "",
    entityName: api.entityName ?? "",
    summary: api.summary ?? "",
    description: api.description ?? "",
    status: api.status,
    pathParams: api.pathParams ?? "",
    headers: api.headers ?? "",
    queryParams: api.queryParams ?? "",
    requestBody: api.requestBody ?? "",
    responseBody: api.responseBody ?? "",
    responseStatus: api.responseStatus != null ? String(api.responseStatus) : "",
    version: api.version ?? "",
    note: api.note ?? "",
  };
}

interface APISpecPageProps {
  embedded?: boolean;
  workspaceId?: number;
}

export function APISpecPage({ embedded = false, workspaceId }: APISpecPageProps) {
  const { myMemberId, getMemberName } = useWorkspace();

  const [apis, setApis] = useState<ApiSpecResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [swaggerUrl, setSwaggerUrl] = useState("");

  const [mode, setMode] = useState<FormMode>("view");
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [swaggerUrlInput, setSwaggerUrlInput] = useState("");
  const [isSwaggerSyncing, setIsSwaggerSyncing] = useState(false);
  const [swaggerSyncError, setSwaggerSyncError] = useState("");
  const [filterMethod, setFilterMethod] = useState<ApiSpecMethod | null>(null);

  const filteredApis = filterMethod ? apis.filter((api) => api.method === filterMethod) : apis;
  const selectedApiData = apis.find((api) => api.id === selectedApiId) ?? apis[0] ?? null;

  const methodCounts = useMemo(() => {
    return apis.reduce<Record<ApiSpecMethod, number>>(
      (acc, api) => {
        acc[api.method] = (acc[api.method] ?? 0) + 1;
        return acc;
      },
      { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 },
    );
  }, [apis]);

  useEffect(() => {
    if (!workspaceId) return;

    const controller = new AbortController();
    setIsLoading(true);
    setApiError("");

    getApiSpecs(workspaceId, undefined, { signal: controller.signal })
      .then((data) => {
        setApis(data);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setApiError(
            error instanceof ApiClientError
              ? error.message
              : "API 명세를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    const controller = new AbortController();

    getSwaggerUrl(workspaceId, { signal: controller.signal })
      .then((url) => {
        setSwaggerUrl(url);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSwaggerUrl("");
        }
      });

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  function openCreateForm() {
    setFormData(EMPTY_FORM);
    setFormError("");
    setMode("create");
  }

  function openEditForm() {
    if (!selectedApiData) return;
    setFormData(apiToForm(selectedApiData));
    setFormError("");
    setMode("edit");
  }

  function cancelForm() {
    setMode("view");
    setFormError("");
  }

  function handleFormChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!workspaceId || !myMemberId) return;
    if (!formData.title.trim() || !formData.endpoint.trim()) {
      setFormError("제목과 엔드포인트는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      if (mode === "create") {
        const created = await createApiSpec(workspaceId, {
          createdByMemberId: myMemberId,
          title: formData.title,
          method: formData.method,
          endpoint: formData.endpoint,
          groupName: formData.groupName || undefined,
          entityName: formData.entityName || undefined,
          summary: formData.summary || undefined,
          description: formData.description || undefined,
          status: formData.status,
          pathParams: formData.pathParams || undefined,
          headers: formData.headers || undefined,
          queryParams: formData.queryParams || undefined,
          requestBody: formData.requestBody || undefined,
          responseBody: formData.responseBody || undefined,
          responseStatus: formData.responseStatus ? Number(formData.responseStatus) : undefined,
          version: formData.version || undefined,
          note: formData.note || undefined,
        });
        setApis((prev) => [...prev, created]);
        setSelectedApiId(created.id);
      } else if (mode === "edit" && selectedApiData) {
        const updated = await updateApiSpec(workspaceId, selectedApiData.id, {
          title: formData.title,
          method: formData.method,
          endpoint: formData.endpoint,
          groupName: formData.groupName || undefined,
          entityName: formData.entityName || undefined,
          summary: formData.summary || undefined,
          description: formData.description || undefined,
          status: formData.status,
          pathParams: formData.pathParams || undefined,
          headers: formData.headers || undefined,
          queryParams: formData.queryParams || undefined,
          requestBody: formData.requestBody || undefined,
          responseBody: formData.responseBody || undefined,
          responseStatus: formData.responseStatus ? Number(formData.responseStatus) : undefined,
          version: formData.version || undefined,
          note: formData.note || undefined,
        });
        setApis((prev) => prev.map((api) => (api.id === updated.id ? updated : api)));
      }
      setMode("view");
    } catch (error) {
      setFormError(
        error instanceof ApiClientError ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateAiChecklist() {
    if (!workspaceId || isGenerating) return;

    setIsGenerating(true);
    setGenerateError("");

    try {
      const generated = await generateAiChecklist(workspaceId);
      setApis((prev) => [...prev, ...generated]);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === "GITHUB_REPO_NOT_FOUND") {
          setGenerateError("GitHub 레포지토리가 연결되지 않았습니다.");
        } else {
          setGenerateError(error.message || "AI 체크리스트 생성에 실패했습니다.");
        }
      } else {
        setGenerateError("AI 체크리스트 생성에 실패했습니다.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRegisterSwaggerUrl() {
    if (!workspaceId || !swaggerUrlInput.trim()) return;

    setIsSwaggerSyncing(true);
    setSwaggerSyncError("");

    try {
      const result = await registerSwaggerUrl(workspaceId, swaggerUrlInput.trim());
      setSwaggerUrl(result.swaggerUrl);
      setSwaggerUrlInput("");
      const updated = await getApiSpecs(workspaceId);
      setApis(updated);
    } catch (error) {
      setSwaggerSyncError(
        error instanceof ApiClientError ? error.message : "Swagger URL 등록에 실패했습니다.",
      );
    } finally {
      setIsSwaggerSyncing(false);
    }
  }

  async function handleResyncSwagger() {
    if (!workspaceId) return;

    setIsSwaggerSyncing(true);
    setSwaggerSyncError("");

    try {
      const result = await resyncSwagger(workspaceId);
      setSwaggerUrl(result.swaggerUrl);
      const updated = await getApiSpecs(workspaceId);
      setApis(updated);
    } catch (error) {
      setSwaggerSyncError(
        error instanceof ApiClientError ? error.message : "재동기화에 실패했습니다.",
      );
    } finally {
      setIsSwaggerSyncing(false);
    }
  }

  async function handleDelete() {
    if (!workspaceId || !selectedApiData) return;
    if (!window.confirm(`"${selectedApiData.title}" 명세를 삭제할까요?`)) return;

    try {
      await deleteApiSpec(workspaceId, selectedApiData.id);
      setApis((prev) => prev.filter((api) => api.id !== selectedApiData.id));
      setSelectedApiId(null);
      setMode("view");
    } catch (error) {
      alert(error instanceof ApiClientError ? error.message : "삭제하지 못했습니다.");
    }
  }

  return (
    <div className={embedded ? "codedock-scrollbar-hidden h-full overflow-y-auto px-5 py-5" : "w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20"}>
      <div className={embedded ? "mb-5" : "mb-8"}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1
            className="m-0 leading-[0.9] tracking-tight"
            style={{
              fontSize: embedded ? "clamp(30px, 3vw, 44px)" : "clamp(48px, 6vw, 72px)",
              fontWeight: 950,
              color: "var(--white)",
              textShadow: "0 0 22px rgba(var(--codedock-primary-rgb), 0.18)",
            }}
          >
            API 명세
          </h1>
          <button
            onClick={handleGenerateAiChecklist}
            disabled={isGenerating || !workspaceId}
            className="flex items-center gap-2 rounded-2xl border-0 px-4 py-2.5 text-sm font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.22), rgba(var(--codedock-secondary-rgb), 0.12))",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.32)",
              color: "var(--neon-cyan)",
              cursor: isGenerating || !workspaceId ? "not-allowed" : "pointer",
              opacity: isGenerating || !workspaceId ? 0.6 : 1,
            }}
            type="button"
          >
            <Sparkles size={15} />
            {isGenerating ? "생성 중..." : "AI 체크리스트 생성"}
          </button>
        </div>
        {generateError && (
          <div
            className="mt-3 rounded-xl px-4 py-2 tracking-tight"
            style={{
              background: "rgba(255, 107, 107, 0.10)",
              border: "1px solid rgba(255, 107, 107, 0.28)",
              color: "#FFB4B4",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 800,
            }}
          >
            {generateError}
          </div>
        )}
      </div>

      <div className={embedded ? "grid grid-cols-3 gap-3 mb-5 xl:grid-cols-5" : "grid gap-4 mb-9 grid-cols-3 md:grid-cols-5"}>
        <StatCard label="GET" value={methodCounts.GET} color="#6BCF7F" active={filterMethod === "GET"} onClick={() => setFilterMethod(filterMethod === "GET" ? null : "GET")} />
        <StatCard label="POST" value={methodCounts.POST} color="var(--neon-cyan)" active={filterMethod === "POST"} onClick={() => setFilterMethod(filterMethod === "POST" ? null : "POST")} />
        <StatCard label="PUT" value={methodCounts.PUT} color="#A78BFA" active={filterMethod === "PUT"} onClick={() => setFilterMethod(filterMethod === "PUT" ? null : "PUT")} />
        <StatCard label="PATCH" value={methodCounts.PATCH} color="#FFD93D" active={filterMethod === "PATCH"} onClick={() => setFilterMethod(filterMethod === "PATCH" ? null : "PATCH")} />
        <StatCard label="DELETE" value={methodCounts.DELETE} color="#FF6B6B" active={filterMethod === "DELETE"} onClick={() => setFilterMethod(filterMethod === "DELETE" ? null : "DELETE")} />
      </div>

      <div className={embedded ? "grid gap-5 xl:grid-cols-[340px_1fr]" : "grid gap-6 lg:grid-cols-[410px_1fr]"}>
        {/* 왼쪽: 엔드포인트 목록 */}
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
            <h2 className="m-0 flex items-center gap-2 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
              엔드포인트
              <span
                className="rounded-lg px-2 py-0.5 text-sm font-black tracking-tight"
                style={{
                  background: filterMethod ? colorAlpha(getMethodColor(filterMethod), 15) : "rgba(234, 247, 255, 0.08)",
                  color: filterMethod ? getMethodColor(filterMethod) : "var(--muted)",
                }}
              >
                {filterMethod ? `${filteredApis.length} / ${apis.length}` : apis.length}
              </span>
            </h2>
            <button
              onClick={openCreateForm}
              className="grid h-9 w-9 place-items-center rounded-xl border-0"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                color: "#021014",
                cursor: "pointer",
              }}
              type="button"
            >
              <Plus size={18} />
            </button>
          </div>


          {isLoading ? (
            <div className="rounded-2xl px-4 py-8 text-center tracking-tight" style={{ background: "rgba(234, 247, 255, 0.045)", border: "1px dashed rgba(var(--codedock-primary-rgb), 0.24)" }}>
              <p className="m-0 text-sm font-bold" style={{ color: "var(--muted)" }}>불러오는 중...</p>
            </div>
          ) : apiError ? (
            <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(255, 107, 107, 0.09)", border: "1px solid rgba(255, 107, 107, 0.28)" }}>
              <p className="m-0 text-sm font-bold tracking-tight" style={{ color: "#FFB4B4" }}>{apiError}</p>
            </div>
          ) : filteredApis.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-8 text-center tracking-tight"
              style={{
                background: "rgba(234, 247, 255, 0.045)",
                border: "1px dashed rgba(var(--codedock-primary-rgb), 0.24)",
              }}
            >
              <p className="m-0 text-sm font-black" style={{ color: "var(--white)" }}>
                {filterMethod ? `${filterMethod} 명세가 없습니다` : "API 명세가 없습니다"}
              </p>
              <p className="m-0 mt-1 text-[var(--krds-body-xsmall)] font-bold" style={{ color: "var(--muted)" }}>
                {filterMethod ? "다른 메서드를 선택하거나 추가 버튼으로 등록하세요." : "추가 버튼으로 명세를 등록할 수 있어요."}
              </p>
            </div>
          ) : (
            <div className={`grid gap-2 overflow-y-auto pr-1 ${embedded ? "codedock-scrollbar-hidden max-h-[420px]" : "max-h-[650px]"}`}>
              {filteredApis.map((api) => (
                <button
                  key={api.id}
                  onClick={() => { setSelectedApiId(api.id); setMode("view"); }}
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
                    <SourceBadge sourceType={api.sourceType} />
                  </div>
                  <p className="m-0 mb-1 break-all font-mono text-sm font-black tracking-tight" style={{ color: "var(--white)" }}>
                    {api.endpoint}
                  </p>
                  <p className="m-0 text-[var(--krds-body-xsmall)] font-bold leading-5 tracking-tight" style={{ color: "var(--muted)" }}>
                    {api.title}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 오른쪽: 상세 / 폼 */}
        <section
          className={embedded ? "rounded-2xl px-5 py-5" : "rounded-[30px] px-8 py-8"}
          style={{
            background: "rgba(11, 22, 40, 0.82)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
            boxShadow: embedded ? "0 14px 36px rgba(0, 0, 0, 0.28)" : "0 20px 60px rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
          }}
        >
          {mode === "create" || mode === "edit" ? (
            <ApiSpecForm
              mode={mode}
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              onCancel={cancelForm}
              isSubmitting={isSubmitting}
              formError={formError}
            />
          ) : !selectedApiData ? (
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
                    <SourceBadge sourceType={selectedApiData.sourceType} />
                    {selectedApiData.groupName && (
                      <span className="rounded-full px-3 py-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ background: "rgba(234, 247, 255, 0.055)", color: "var(--muted)" }}>
                        {selectedApiData.groupName}
                      </span>
                    )}
                    {selectedApiData.entityName && (
                      <span className="rounded-full px-3 py-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ background: "rgba(234, 247, 255, 0.055)", color: "var(--muted)" }}>
                        {selectedApiData.entityName}
                      </span>
                    )}
                  </div>
                  <h2 className="m-0 text-2xl font-black leading-snug tracking-tight" style={{ color: "var(--white)" }}>
                    {selectedApiData.title}
                  </h2>
                  <p className="m-0 mt-1 font-mono text-sm font-bold tracking-tight" style={{ color: "var(--neon-cyan)" }}>
                    {selectedApiData.endpoint}
                  </p>
                  <p className="m-0 mt-2 text-base font-bold leading-7 tracking-tight" style={{ color: "var(--muted)" }}>
                    {selectedApiData.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedApiData.sourceType !== "swagger" && (
                    <button
                      onClick={openEditForm}
                      className="flex items-center gap-1.5 rounded-xl border-0 px-3 py-2 text-sm font-black tracking-tight"
                      style={{ background: "rgba(var(--codedock-primary-rgb), 0.12)", color: "var(--neon-cyan)", cursor: "pointer" }}
                      type="button"
                    >
                      <Edit2 size={14} />
                      편집
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-xl border-0 px-3 py-2 text-sm font-black tracking-tight"
                    style={{ background: "rgba(255, 107, 107, 0.10)", color: "#FF6B6B", cursor: "pointer" }}
                    type="button"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>

              <p className="mb-6 mt-0 text-sm font-semibold leading-7 tracking-tight" style={{ color: "#DFFAFF" }}>
                {selectedApiData.description}
              </p>

              {selectedApiData.note && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-2xl px-5 py-4"
                  style={{
                    background: "rgba(234, 247, 255, 0.045)",
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
                  }}
                >
                  <MessageSquare size={16} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
                  <p className="m-0 text-sm font-bold leading-6 tracking-tight" style={{ color: "var(--muted)" }}>
                    {selectedApiData.note}
                  </p>
                </div>
              )}

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <InfoBlock icon={Code} label="담당" value={selectedApiData.assigneeId != null ? getMemberName(selectedApiData.assigneeId) : "미지정"} />
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

      {/* Swagger 섹션 */}
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
          className="flex flex-col gap-4 px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
            background: "linear-gradient(90deg, rgba(var(--codedock-primary-rgb), 0.10), rgba(var(--codedock-secondary-rgb), 0.045), rgba(5, 11, 20, 0.72))",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 mb-1 font-mono text-[var(--krds-body-xsmall)] font-black uppercase tracking-[0.14em]" style={{ color: "var(--neon-cyan)" }}>
                Swagger / OpenAPI 3.1
              </p>
              <h2 className="m-0 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
                Swagger UI 연동 미리보기
              </h2>
            </div>
            {swaggerUrl && (
              <button
                onClick={handleResyncSwagger}
                disabled={isSwaggerSyncing}
                className="flex items-center gap-2 rounded-xl border-0 px-4 py-2 text-sm font-black tracking-tight"
                style={{
                  background: "rgba(var(--codedock-primary-rgb), 0.12)",
                  color: "var(--neon-cyan)",
                  cursor: isSwaggerSyncing ? "not-allowed" : "pointer",
                  opacity: isSwaggerSyncing ? 0.6 : 1,
                }}
                type="button"
              >
                {isSwaggerSyncing ? "동기화 중..." : "재동기화"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={swaggerUrlInput}
              onChange={(e) => setSwaggerUrlInput(e.target.value)}
              placeholder={swaggerUrl || "Swagger URL을 입력하세요 (https://...)"}
              onKeyDown={(e) => e.key === "Enter" && handleRegisterSwaggerUrl()}
            />
            <button
              onClick={handleRegisterSwaggerUrl}
              disabled={isSwaggerSyncing || !swaggerUrlInput.trim()}
              className="shrink-0 rounded-xl border-0 px-4 py-2 text-sm font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
                color: "#021014",
                cursor: isSwaggerSyncing || !swaggerUrlInput.trim() ? "not-allowed" : "pointer",
                opacity: isSwaggerSyncing || !swaggerUrlInput.trim() ? 0.6 : 1,
              }}
              type="button"
            >
              {isSwaggerSyncing ? "등록 중..." : "등록"}
            </button>
          </div>
          {swaggerSyncError && (
            <p className="m-0 text-[var(--krds-body-xsmall)] font-bold tracking-tight" style={{ color: "#FFB4B4" }}>
              {swaggerSyncError}
            </p>
          )}
        </div>
        <div className={`codedock-swagger codedock-scrollbar-hidden overflow-y-auto ${embedded ? "max-h-[520px]" : "max-h-[720px]"} px-4 py-4`}>
          {swaggerUrl ? (
            <Suspense fallback={<SwaggerPreviewFallback />}>
              <SwaggerUI
                url={swaggerUrl}
                docExpansion="none"
                defaultModelsExpandDepth={0}
                displayRequestDuration
                tryItOutEnabled={false}
              />
            </Suspense>
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

// ─── 폼 컴포넌트 ──────────────────────────────────────────────────────────────

interface ApiSpecFormProps {
  mode: "create" | "edit";
  formData: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  formError: string;
}

function ApiSpecForm({ mode, formData, onChange, onSubmit, onCancel, isSubmitting, formError }: ApiSpecFormProps) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-xl font-black tracking-tight" style={{ color: "var(--white)" }}>
          {mode === "create" ? "새 API 명세 추가" : "API 명세 편집"}
        </h2>
        <button
          onClick={onCancel}
          className="grid h-8 w-8 place-items-center rounded-xl border-0"
          style={{ background: "rgba(234, 247, 255, 0.07)", color: "var(--muted)", cursor: "pointer" }}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="제목 *">
            <input
              style={inputStyle}
              value={formData.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="API 제목"
            />
          </FormField>
          <FormField label="엔드포인트 *">
            <input
              style={{ ...inputStyle, fontFamily: "monospace" }}
              value={formData.endpoint}
              onChange={(e) => onChange("endpoint", e.target.value)}
              placeholder="/api/..."
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="메서드">
            <select style={inputStyle} value={formData.method} onChange={(e) => onChange("method", e.target.value as ApiSpecMethod)}>
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as ApiSpecMethod[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>
          <FormField label="상태">
            <select style={inputStyle} value={formData.status} onChange={(e) => onChange("status", e.target.value as ApiSpecStatus)}>
              <option value="design">설계</option>
              <option value="in_progress">구현중</option>
              <option value="completed">완료</option>
            </select>
          </FormField>
          <FormField label="버전">
            <input style={inputStyle} value={formData.version} onChange={(e) => onChange("version", e.target.value)} placeholder="v1.0" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="그룹명">
            <input style={inputStyle} value={formData.groupName} onChange={(e) => onChange("groupName", e.target.value)} placeholder="사용자 관리" />
          </FormField>
          <FormField label="엔티티명">
            <input style={inputStyle} value={formData.entityName} onChange={(e) => onChange("entityName", e.target.value)} placeholder="User" />
          </FormField>
        </div>

        <FormField label="요약">
          <input style={inputStyle} value={formData.summary} onChange={(e) => onChange("summary", e.target.value)} placeholder="한 줄 요약" />
        </FormField>

        <FormField label="설명">
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
            value={formData.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="API 상세 설명"
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Path Params">
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64, fontFamily: "monospace" }} value={formData.pathParams} onChange={(e) => onChange("pathParams", e.target.value)} placeholder='{"id": "number"}' />
          </FormField>
          <FormField label="Query Params">
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64, fontFamily: "monospace" }} value={formData.queryParams} onChange={(e) => onChange("queryParams", e.target.value)} placeholder='{"page": "number"}' />
          </FormField>
        </div>

        <FormField label="Headers">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64, fontFamily: "monospace" }} value={formData.headers} onChange={(e) => onChange("headers", e.target.value)} placeholder='{"Authorization": "Bearer ..."}' />
        </FormField>

        <FormField label="Request Body">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "monospace" }} value={formData.requestBody} onChange={(e) => onChange("requestBody", e.target.value)} placeholder="{}" />
        </FormField>

        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <FormField label="Response Body">
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 80, fontFamily: "monospace" }} value={formData.responseBody} onChange={(e) => onChange("responseBody", e.target.value)} placeholder="{}" />
          </FormField>
          <FormField label="응답 상태코드">
            <input style={inputStyle} value={formData.responseStatus} onChange={(e) => onChange("responseStatus", e.target.value)} placeholder="200" type="number" />
          </FormField>
        </div>

        <FormField label="메모">
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} value={formData.note} onChange={(e) => onChange("note", e.target.value)} placeholder="주의사항 등" />
        </FormField>
      </div>

      {formError && (
        <p className="mt-4 mb-0 text-sm font-bold tracking-tight" style={{ color: "#FFB4B4" }}>
          {formError}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl border-0 px-5 py-2.5 text-sm font-black tracking-tight"
          style={{ background: "rgba(234, 247, 255, 0.07)", color: "var(--muted)", cursor: "pointer" }}
          type="button"
        >
          취소
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-xl border-0 px-5 py-2.5 text-sm font-black tracking-tight"
          style={{
            background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))",
            color: "#021014",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
          }}
          type="button"
        >
          {isSubmitting ? "저장 중..." : mode === "create" ? "추가" : "저장"}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black tracking-tight" style={{ color: "var(--neon-cyan)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── 헬퍼 컴포넌트 ────────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-3xl px-4 py-4"
      style={{
        background: active ? `color-mix(in srgb, ${color} 12%, rgba(11, 22, 40, 0.95))` : "rgba(11, 22, 40, 0.82)",
        border: active ? `1px solid ${color}` : "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.32)",
        backdropFilter: "blur(16px)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <FileText size={18} style={{ color, marginBottom: 6 }} />
      <p className="m-0 mb-1 text-[var(--krds-body-xsmall)] font-black tracking-tight" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="m-0 text-3xl font-black tracking-tight" style={{ color }}>
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

function SwaggerPreviewFallback() {
  return (
    <div
      aria-hidden="true"
      className="min-h-[320px] rounded-2xl"
      style={{
        background: "rgba(5, 11, 20, 0.58)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
      }}
    />
  );
}

function SourceBadge({ sourceType }: { sourceType: ApiSpecSourceType }) {
  const isAuto = sourceType !== "manual";
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-[var(--krds-body-xsmall)] font-black tracking-tight"
      style={{
        background: isAuto ? "rgba(var(--codedock-primary-rgb), 0.12)" : "rgba(234, 247, 255, 0.06)",
        color: isAuto ? "var(--neon-cyan)" : "var(--muted)",
      }}
    >
      {isAuto ? "자동 작성" : "직접 작성"}
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
        className="m-0 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl p-4 font-mono text-sm leading-6"
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
