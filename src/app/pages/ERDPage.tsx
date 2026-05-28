import { ChevronDown, Database, Download, FileCode, ImageIcon, Minus, Plus, RefreshCw, RotateCcw, Sparkles, Table2, Trash2 } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";

interface ERDPageProps {
  embedded?: boolean;
  repositoryId?: string;
  repositoryName?: string;
}

interface DiagramColumn {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
  nullable: boolean;
}

interface DiagramEntity {
  name: string;
  columns: DiagramColumn[];
}

interface DiagramRelation {
  from: string;
  to: string;
  notation: string;
  label: string;
}

interface ErdDocument {
  id: string;
  title: string;
  description: string;
  code: string;
  updatedAt: string;
}

const defaultErdCode = `erDiagram
  users ||--o{ projects : owns
  projects ||--o{ repositories : has
  repositories ||--o{ pull_requests : tracks
  pull_requests ||--o{ comments : contains
  users ||--o{ comments : writes

  users {
    INTEGER id PK
    VARCHAR(255) email
    VARCHAR(100) username
    VARCHAR(100) github_id
    TIMESTAMP created_at
    TIMESTAMP updated_at nullable
  }

  projects {
    INTEGER id PK
    VARCHAR(255) name
    TEXT description nullable
    VARCHAR(500) repo_url
    INTEGER owner_id FK
    TIMESTAMP created_at
  }

  repositories {
    INTEGER id PK
    INTEGER project_id FK
    BIGINT github_repo_id
    VARCHAR(255) full_name
    BOOLEAN is_private
    TIMESTAMP synced_at
  }

  pull_requests {
    INTEGER id PK
    INTEGER repository_id FK
    INTEGER pr_number
    VARCHAR(500) title
    INTEGER author_id FK
  }

  comments {
    INTEGER id PK
    INTEGER pr_id FK
    INTEGER user_id FK
    TEXT content
    TIMESTAMP created_at
  }`;

const generatedErdCode = `erDiagram
  users ||--o{ workspaces : owns
  workspaces ||--o{ workspace_members : includes
  users ||--o{ workspace_members : joins
  workspaces ||--o{ invite_links : issues
  workspaces ||--o{ docs : stores
  docs ||--o{ doc_versions : versions

  users {
    BIGINT id PK
    VARCHAR(255) email
    VARCHAR(100) display_name
    VARCHAR(50) role
    TIMESTAMP deleted_at nullable
  }

  workspaces {
    BIGINT id PK
    VARCHAR(100) name
    VARCHAR(100) slug
    BIGINT owner_id FK
    TIMESTAMP created_at
  }

  workspace_members {
    BIGINT id PK
    BIGINT workspace_id FK
    BIGINT user_id FK
    VARCHAR(30) permission
  }

  invite_links {
    BIGINT id PK
    BIGINT workspace_id FK
    VARCHAR(255) token
    TIMESTAMP expires_at
    TIMESTAMP revoked_at nullable
  }

  docs {
    BIGINT id PK
    BIGINT workspace_id FK
    VARCHAR(255) title
    TEXT content
    TIMESTAMP updated_at
  }

  doc_versions {
    BIGINT id PK
    BIGINT doc_id FK
    INTEGER version_no
    TEXT snapshot
  }`;

const knownTypes = [
  "BIGINT",
  "INTEGER",
  "INT",
  "VARCHAR",
  "TEXT",
  "BOOLEAN",
  "TIMESTAMP",
  "DATE",
  "DATETIME",
  "UUID",
  "JSON",
  "DECIMAL",
  "FLOAT",
  "DOUBLE"
];

const diagramColumns = 3;
const entityCardWidth = 226;
const entityColumnWidth = 264;
const entityLeftInset = 24;
const diagramCanvasWidth = entityLeftInset * 2 + entityColumnWidth * (diagramColumns - 1) + entityCardWidth;
const minDiagramZoom = 0.06;
const maxDiagramZoom = 1.8;
const diagramZoomStep = 0.1;
const defaultRepositoryName = "codedock-backend";
const erdDocumentsStorageKey = "codedock-erd-documents";
const minWorldCanvasWidth = 7200;
const minWorldCanvasHeight = 5000;
const worldCanvasExtraWidth = 4600;
const worldCanvasExtraHeight = 3300;
const diagramFramePadding = 180;
const diagramFrameOffsetX = 540;
const diagramFrameOffsetY = 420;
const minDiagramRenderWidth = 480;
const maxDiagramRenderWidth = 840;
const diagramRenderScale = 0.42;
const mermaidConfig = {
  startOnLoad: false,
  suppressErrorRendering: true,
  securityLevel: "strict",
  theme: "base",
  er: {
    diagramPadding: 22,
    layoutDirection: "LR",
    minEntityWidth: 120,
    minEntityHeight: 75,
    entityPadding: 15
  },
  themeVariables: {
    background: "#050B14",
    mainBkg: "#132338",
    primaryColor: "#132338",
    primaryBorderColor: "#20E3FF",
    primaryTextColor: "#EAF7FF",
    secondaryColor: "#0F1D30",
    tertiaryColor: "#07101D",
    lineColor: "#39FF88",
    textColor: "#EAF7FF",
    nodeBorder: "#20E3FF",
    nodeTextColor: "#EAF7FF",
    edgeLabelBackground: "#07101D",
    erEdgeLabelBackground: "#07101D",
    attributeBackgroundColorOdd: "#101F34",
    attributeBackgroundColorEven: "#0B1829",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
  }
} as const;

let isMermaidInitialized = false;

function clampDiagramZoom(value: number, minZoom = minDiagramZoom) {
  return Math.min(maxDiagramZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

function ensureMermaidInitialized() {
  if (isMermaidInitialized) return;
  mermaid.initialize(mermaidConfig);
  isMermaidInitialized = true;
}

function cleanupMermaidRenderArtifacts() {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll('body > [id^="dcodedock-erd-"], body > [id^="icodedock-erd-"]')
    .forEach((node) => node.remove());
}

function isLikelyType(token: string) {
  const normalized = token.toUpperCase().replace(/\(.+\)/, "");
  return knownTypes.includes(normalized);
}

function normalizeEntityName(name: string) {
  return name.replace(/[`"]/g, "").trim();
}

function toMermaidRenderableCode(code: string) {
  return code
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+(nullable|optional)\b/gi, ""))
    .join("\n");
}

function parseErdCode(code: string) {
  const entities: DiagramEntity[] = [];
  const relations: DiagramRelation[] = [];
  const entityMap = new Map<string, DiagramEntity>();
  const lines = code.split(/\r?\n/);
  let currentEntity: DiagramEntity | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || line === "erDiagram") continue;

    const entityStart = line.match(/^([A-Za-z_][\w]*)\s*\{$/);
    if (entityStart) {
      currentEntity = {
        name: normalizeEntityName(entityStart[1]),
        columns: []
      };
      entityMap.set(currentEntity.name, currentEntity);
      entities.push(currentEntity);
      continue;
    }

    if (line === "}") {
      currentEntity = null;
      continue;
    }

    if (currentEntity) {
      const tokens = line.split(/\s+/);
      if (tokens.length < 2) continue;

      const firstTokenIsType = isLikelyType(tokens[0]);
      const type = firstTokenIsType ? tokens[0] : tokens[1];
      const name = firstTokenIsType ? tokens[1] : tokens[0];
      const flags = tokens.slice(2).join(" ").toUpperCase();

      currentEntity.columns.push({
        name: normalizeEntityName(name),
        type,
        pk: flags.includes("PK"),
        fk: flags.includes("FK"),
        nullable: flags.includes("NULL") || flags.includes("OPTIONAL")
      });
      continue;
    }

    const relation = line.match(/^([A-Za-z_][\w]*)\s+([|o}{\-.]+)\s+([A-Za-z_][\w]*)\s*:\s*(.+)$/);
    if (relation) {
      relations.push({
        from: normalizeEntityName(relation[1]),
        notation: relation[2],
        to: normalizeEntityName(relation[3]),
        label: relation[4].trim()
      });
    }
  }

  for (const relation of relations) {
    if (!entityMap.has(relation.from)) {
      const entity = { name: relation.from, columns: [] };
      entityMap.set(entity.name, entity);
      entities.push(entity);
    }
    if (!entityMap.has(relation.to)) {
      const entity = { name: relation.to, columns: [] };
      entityMap.set(entity.name, entity);
      entities.push(entity);
    }
  }

  return { entities, relations };
}

function getDownloadableSvg(svg: string) {
  const trimmedSvg = svg.trim();
  if (!trimmedSvg) return "";
  if (trimmedSvg.includes("xmlns=")) return trimmedSvg;
  return trimmedSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

function sanitizeRenderedSvg(svg: string) {
  if (!svg) return "";
  let result = svg;
  // Mermaid가 자동으로 넣는 inline max-width 제거 (CSS가 sizing을 제어하도록)
  result = result.replace(/style="([^"]*?)max-width:\s*[^;"]+;?\s*([^"]*)"/g, 'style="$1$2"');
  // SVG root의 width/height 속성 제거 — viewBox와 CSS만으로 크기 결정
  result = result.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, "$1");
  result = result.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, "$1");
  // preserveAspectRatio: top-left 정렬 — 컨테이너 비율 mismatch 시 오른쪽이 잘리지 않게
  if (!/preserveAspectRatio=/.test(result)) {
    result = result.replace(/<svg\b/, '<svg preserveAspectRatio="xMinYMin meet"');
  } else {
    result = result.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMinYMin meet"');
  }
  return result;
}

function parseSvgNaturalSize(svg: string): { width: number; height: number } | null {
  if (!svg) return null;
  const match = svg.match(/viewBox="(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)"/);
  if (!match) return null;
  const width = parseFloat(match[3]);
  const height = parseFloat(match[4]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function createInitialErdDocuments(repositoryName: string): ErdDocument[] {
  return [
    {
      id: "main-schema",
      title: `${repositoryName} 기본 ERD`,
      description: "사용자, 프로젝트, PR 흐름",
      code: defaultErdCode,
      updatedAt: "방금 전"
    },
    {
      id: "workspace-docs",
      title: "워크스페이스 문서 ERD",
      description: "팀, 문서, 초대 링크 흐름",
      code: generatedErdCode,
      updatedAt: "2분 전"
    }
  ];
}

function createBlankErdCode(repositoryName: string) {
  const normalizedName = normalizeEntityName(repositoryName.toLowerCase().replace(/[^\w]+/g, "_")) || "project";

  return `erDiagram
  ${normalizedName}_projects ||--o{ ${normalizedName}_items : contains
  ${normalizedName}_projects ||--o{ ${normalizedName}_members : includes

  ${normalizedName}_projects {
    BIGINT id PK
    VARCHAR(255) name
    TEXT description nullable
    TIMESTAMP created_at
  }

  ${normalizedName}_items {
    BIGINT id PK
    BIGINT project_id FK
    VARCHAR(255) title
    VARCHAR(50) status
    TIMESTAMP updated_at
  }

  ${normalizedName}_members {
    BIGINT id PK
    BIGINT project_id FK
    BIGINT user_id
    VARCHAR(30) role
  }`;
}

function getErdFileName(title: string) {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedTitle || "codedock-erd";
}

function getSavedErdDocuments() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(erdDocumentsStorageKey);
    if (!storedValue) return {};

    const parsed = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.filter((document): document is ErdDocument =>
          document
          && typeof document.id === "string"
          && typeof document.title === "string"
          && typeof document.description === "string"
          && typeof document.code === "string"
          && typeof document.updatedAt === "string"
        )
        : []
    ]).filter(([, documents]) => documents.length > 0));
  } catch {
    return {};
  }
}

function saveErdDocuments(documentsByRepository: Record<string, ErdDocument[]>) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(erdDocumentsStorageKey, JSON.stringify(documentsByRepository));
  } catch {
    // Local storage can be unavailable in previews; in-memory ERD state still works.
  }
}

export function ERDPage({ embedded = false, repositoryName = defaultRepositoryName, repositoryId }: ERDPageProps) {
  const diagramViewportRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const hasAutoFitCanvasRef = useRef(false);
  const repositoryKey = repositoryId ?? repositoryName;
  const [diagramZoom, setDiagramZoom] = useState(0.42);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [erdDocumentsByRepository, setErdDocumentsByRepository] = useState<Record<string, ErdDocument[]>>(() => getSavedErdDocuments());
  const [selectedErdIdByRepository, setSelectedErdIdByRepository] = useState<Record<string, string>>({});
  const erdDocuments = erdDocumentsByRepository[repositoryKey] ?? createInitialErdDocuments(repositoryName);
  const selectedErdId = selectedErdIdByRepository[repositoryKey] ?? erdDocuments[0]?.id;
  const selectedErd = erdDocuments.find((document) => document.id === selectedErdId) ?? erdDocuments[0];
  const erdCode = selectedErd?.code ?? defaultErdCode;
  const diagram = useMemo(() => parseErdCode(erdCode), [erdCode]);
  const erdDocumentSummaries = useMemo(() => erdDocuments.map((document) => ({
    document,
    diagram: parseErdCode(document.code)
  })), [erdDocuments]);
  const relationCount = diagram.relations.length;
  const columnCount = diagram.entities.reduce((sum, entity) => sum + entity.columns.length, 0);
  const fallbackDiagramWidth = Math.max(1100, diagramCanvasWidth + 240);
  const fallbackDiagramHeight = 760;
  const zoomPercent = Math.round(diagramZoom * 100);
  const canDownloadDiagram = Boolean(mermaidSvg) && !mermaidError;
  const renderableSvg = useMemo(() => sanitizeRenderedSvg(mermaidSvg), [mermaidSvg]);
  const naturalSvgSize = useMemo(() => parseSvgNaturalSize(renderableSvg), [renderableSvg]);
  const diagramRenderWidth = naturalSvgSize
    ? Math.min(maxDiagramRenderWidth, Math.max(minDiagramRenderWidth, Math.round(naturalSvgSize.width * diagramRenderScale)))
    : 860;
  const diagramRenderHeight = naturalSvgSize
    ? Math.max(420, Math.round(naturalSvgSize.height * (diagramRenderWidth / naturalSvgSize.width)))
    : 520;
  const diagramFrameWidth = Math.max(fallbackDiagramWidth, diagramRenderWidth + diagramFramePadding);
  const diagramFrameHeight = Math.max(fallbackDiagramHeight, diagramRenderHeight + diagramFramePadding);
  const worldCanvasWidth = Math.max(minWorldCanvasWidth, diagramFrameOffsetX + diagramFrameWidth + worldCanvasExtraWidth);
  const worldCanvasHeight = Math.max(minWorldCanvasHeight, diagramFrameOffsetY + diagramFrameHeight + worldCanvasExtraHeight);
  const fitCanvasZoom = viewportSize.width > 0 && viewportSize.height > 0
    ? Math.min(viewportSize.width / worldCanvasWidth, viewportSize.height / worldCanvasHeight)
    : minDiagramZoom;
  const minCanvasZoom = clampDiagramZoom(fitCanvasZoom);
  const scaledCanvasWidth = worldCanvasWidth * diagramZoom;
  const scaledCanvasHeight = worldCanvasHeight * diagramZoom;
  const canvasInsetX = Math.max(0, (viewportSize.width - scaledCanvasWidth) / 2);
  const canvasInsetY = Math.max(0, (viewportSize.height - scaledCanvasHeight) / 2);
  const diagramRenderStyle = {
    "--codedock-erd-diagram-width": `${diagramRenderWidth}px`
  } as CSSProperties;

  useEffect(() => {
    const initialDocuments = createInitialErdDocuments(repositoryName);
    setErdDocumentsByRepository((prev) => prev[repositoryKey]?.length ? prev : {
      ...prev,
      [repositoryKey]: initialDocuments
    });
    setSelectedErdIdByRepository((prev) => prev[repositoryKey] ? prev : {
      ...prev,
      [repositoryKey]: initialDocuments[0].id
    });
  }, [repositoryKey, repositoryName]);

  useEffect(() => {
    saveErdDocuments(erdDocumentsByRepository);
  }, [erdDocumentsByRepository]);

  useEffect(() => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight
      });
    };

    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;

    if (!hasAutoFitCanvasRef.current) {
      hasAutoFitCanvasRef.current = true;
      setDiagramZoom(minCanvasZoom);
      return;
    }

    setDiagramZoom((prev) => clampDiagramZoom(prev, minCanvasZoom));
  }, [minCanvasZoom, viewportSize.width, viewportSize.height]);

  const updateSelectedErdCode = (nextCode: string) => {
    setErdDocumentsByRepository((prev) => {
      const documents = prev[repositoryKey] ?? createInitialErdDocuments(repositoryName);
      const targetId = selectedErdId ?? documents[0]?.id;

      return {
        ...prev,
        [repositoryKey]: documents.map((document) => document.id === targetId
          ? { ...document, code: nextCode, updatedAt: "방금 전" }
          : document)
      };
    });
  };

  const handleSelectErd = (documentId: string) => {
    setSelectedErdIdByRepository((prev) => ({
      ...prev,
      [repositoryKey]: documentId
    }));
    setShowDownloadMenu(false);
  };

  const handleAddErd = () => {
    const nextIndex = erdDocuments.length + 1;
    const nextDocument: ErdDocument = {
      id: `erd-${Date.now()}`,
      title: `새 ERD ${nextIndex}`,
      description: `${repositoryName} 프로젝트 새 다이어그램`,
      code: createBlankErdCode(repositoryName),
      updatedAt: "방금 전"
    };

    setErdDocumentsByRepository((prev) => ({
      ...prev,
      [repositoryKey]: [...(prev[repositoryKey] ?? erdDocuments), nextDocument]
    }));
    setSelectedErdIdByRepository((prev) => ({
      ...prev,
      [repositoryKey]: nextDocument.id
    }));
  };

  const handleDeleteErd = (documentId: string) => {
    if (erdDocuments.length <= 1) return;

    const nextDocuments = erdDocuments.filter((document) => document.id !== documentId);
    const nextSelectedId = selectedErd?.id === documentId
      ? nextDocuments[0]?.id
      : selectedErd?.id;

    setErdDocumentsByRepository((prev) => ({
      ...prev,
      [repositoryKey]: nextDocuments
    }));

    if (nextSelectedId) {
      setSelectedErdIdByRepository((prev) => ({
        ...prev,
        [repositoryKey]: nextSelectedId
      }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const renderId = `codedock-erd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const renderContainer = document.createElement("div");
    renderContainer.setAttribute("aria-hidden", "true");
    Object.assign(renderContainer.style, {
      position: "fixed",
      left: "-10000px",
      top: "-10000px",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      opacity: "0",
      pointerEvents: "none"
    });
    document.body.appendChild(renderContainer);

    ensureMermaidInitialized();
    cleanupMermaidRenderArtifacts();

    const renderDiagram = async () => {
      try {
        const result = await mermaid.render(renderId, toMermaidRenderableCode(erdCode), renderContainer);
        if (!cancelled) {
          setMermaidSvg(result.svg);
          setMermaidError("");
        }
      } catch (error) {
        if (!cancelled) {
          setMermaidSvg("");
          setMermaidError(error instanceof Error ? error.message : "Mermaid 렌더링 중 오류가 발생했습니다.");
        }
      } finally {
        renderContainer.innerHTML = "";
        renderContainer.remove();
        cleanupMermaidRenderArtifacts();
      }
    };

    void renderDiagram();

    return () => {
      cancelled = true;
      renderContainer.innerHTML = "";
      renderContainer.remove();
      cleanupMermaidRenderArtifacts();
    };
  }, [erdCode]);

  useEffect(() => {
    if (!showDownloadMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!downloadMenuRef.current?.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDownloadMenu]);

  const handleExportSvg = () => {
    if (!canDownloadDiagram) return;

    const svgSource = getDownloadableSvg(mermaidSvg);
    const blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${getErdFileName(selectedErd?.title ?? "codedock-erd")}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleExportMmd = () => {
    const blob = new Blob([erdCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${getErdFileName(selectedErd?.title ?? "codedock-erd")}.mmd`;
    anchor.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleZoomChange = (delta: number) => {
    setDiagramZoom((prev) => clampDiagramZoom(prev + delta, minCanvasZoom));
  };

  const getCanvasInset = (zoom: number) => ({
    x: Math.max(0, (viewportSize.width - worldCanvasWidth * zoom) / 2),
    y: Math.max(0, (viewportSize.height - worldCanvasHeight * zoom) / 2)
  });

  const zoomControls = (
    <div
      className="flex shrink-0 flex-nowrap items-center justify-end gap-2"
      title="Ctrl + 휠로 확대/축소"
    >
      <button
        type="button"
        onClick={() => handleZoomChange(-diagramZoomStep)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-0 transition-all hover:scale-105"
        style={{
          background: "rgba(234, 247, 255, 0.06)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
          color: "var(--white)",
          cursor: "pointer"
        }}
        aria-label="ERD 축소"
        title="축소 · Ctrl + 휠로 확대/축소"
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        onClick={() => setDiagramZoom(minCanvasZoom)}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border-0 px-3 font-mono transition-all hover:scale-105"
        style={{
          background: "rgba(32, 227, 255, 0.10)",
          border: "1px solid rgba(32, 227, 255, 0.24)",
          color: "var(--neon-cyan)",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 950
        }}
        aria-label="ERD 캔버스 맞춤"
        title="캔버스 맞춤 · Ctrl + 휠로 확대/축소"
      >
        <RotateCcw size={14} />
        {zoomPercent}%
      </button>
      <button
        type="button"
        onClick={() => handleZoomChange(diagramZoomStep)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-0 transition-all hover:scale-105"
        style={{
          background: "rgba(234, 247, 255, 0.06)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
          color: "var(--white)",
          cursor: "pointer"
        }}
        aria-label="ERD 확대"
        title="확대 · Ctrl + 휠로 확대/축소"
      >
        <Plus size={15} />
      </button>
    </div>
  );

  useEffect(() => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;

    const handleDiagramWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const delta = event.deltaY < 0 ? diagramZoomStep : -diagramZoomStep;

      setDiagramZoom((prev) => {
        const nextZoom = clampDiagramZoom(prev + delta, minCanvasZoom);
        if (nextZoom === prev) return prev;
        const zoomRatio = nextZoom / prev;
        const currentInset = getCanvasInset(prev);
        const nextInset = getCanvasInset(nextZoom);
        const contentX = viewport.scrollLeft + pointerX - currentInset.x;
        const contentY = viewport.scrollTop + pointerY - currentInset.y;

        window.requestAnimationFrame(() => {
          viewport.scrollLeft = contentX * zoomRatio + nextInset.x - pointerX;
          viewport.scrollTop = contentY * zoomRatio + nextInset.y - pointerY;
        });

        return nextZoom;
      });
    };

    viewport.addEventListener("wheel", handleDiagramWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleDiagramWheel);
    };
  }, [minCanvasZoom, viewportSize.width, viewportSize.height, worldCanvasWidth, worldCanvasHeight]);

  return (
    <div
      className={embedded ? "flex h-full min-h-0 flex-col overflow-hidden px-5 py-5" : "w-[min(1500px,calc(100vw-36px))] mx-auto py-12 pb-20"}
    >
      <header
        className={embedded ? "mb-4 flex items-start justify-between gap-4 pr-36" : "mb-7 flex flex-wrap items-start justify-between gap-4"}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Database size={embedded ? 24 : 30} style={{ color: "var(--soft-mint)", marginTop: 3 }} />
          <div className="min-w-0">
            <h1 className="m-0 tracking-tight" style={{
              color: "var(--white)",
              fontSize: embedded ? "24px" : "32px",
              fontWeight: 950,
              lineHeight: 1.1
            }}>
              ERD (Entity Relationship Diagram)
            </h1>
            <p className="m-0 mt-1 tracking-tight" style={{
              color: "var(--muted)",
              fontSize: embedded ? "12px" : "14px",
              fontWeight: 800
            }}>
              {repositoryName}
            </p>
          </div>
        </div>

        <div className={embedded ? "flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto codedock-scrollbar-hidden" : "flex flex-wrap items-center gap-2"}>
          <div
            className={embedded ? "flex shrink-0 flex-nowrap items-center gap-2" : "flex flex-wrap items-center gap-2"}
          >
            <button
              type="button"
              onClick={() => updateSelectedErdCode(generatedErdCode)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
              style={{
                background: "rgba(255, 145, 77, 0.10)",
                border: "1px solid rgba(255, 145, 77, 0.32)",
                color: "#ff9a5c",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 950
              }}
            >
              <Sparkles size={15} />
              AI 자동 생성
            </button>
            <button
              type="button"
              onClick={() => updateSelectedErdCode(defaultErdCode)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
              style={{
                background: "rgba(234, 247, 255, 0.06)",
                border: "1px solid rgba(32, 227, 255, 0.16)",
                color: "var(--white)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 900
              }}
            >
              <RefreshCw size={15} />
              기본값
            </button>
            <button
              type="button"
              onClick={handleAddErd}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
              style={{
                background: "rgba(32, 227, 255, 0.10)",
                border: "1px solid rgba(32, 227, 255, 0.24)",
                color: "var(--neon-cyan)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 950
              }}
            >
              <Plus size={15} />
              생성
            </button>
            <button
              type="button"
              onClick={() => selectedErd?.id && handleDeleteErd(selectedErd.id)}
              disabled={erdDocuments.length <= 1}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
              style={{
                background: "rgba(255, 107, 107, 0.10)",
                border: "1px solid rgba(255, 107, 107, 0.22)",
                color: "#ff8f8f",
                cursor: erdDocuments.length > 1 ? "pointer" : "not-allowed",
                fontSize: "12px",
                fontWeight: 950,
                opacity: erdDocuments.length > 1 ? 1 : 0.42
              }}
              title={erdDocuments.length > 1 ? "현재 ERD 삭제" : "마지막 ERD는 삭제할 수 없어요"}
            >
              <Trash2 size={15} />
              삭제
            </button>
            <div className="relative shrink-0" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu((v) => !v)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border-0 px-3 tracking-tight"
                style={{
                  background: "rgba(234, 247, 255, 0.06)",
                  border: "1px solid rgba(32, 227, 255, 0.16)",
                  color: "var(--white)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
                aria-label="ERD 다운로드"
                aria-expanded={showDownloadMenu}
                aria-haspopup="menu"
                title="다운로드"
              >
                <Download size={15} />
                다운로드
                <ChevronDown size={12} style={{ opacity: 0.55 }} />
              </button>

              {showDownloadMenu && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-xl"
                  role="menu"
                  style={{
                    background: "rgba(11, 22, 40, 0.98)",
                    border: "1px solid rgba(32, 227, 255, 0.22)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                    minWidth: 168,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    disabled={!canDownloadDiagram}
                    className="flex w-full items-center gap-2.5 border-0 px-4 py-3 tracking-tight transition-colors hover:bg-white/5"
                    role="menuitem"
                    style={{
                      background: "transparent",
                      color: canDownloadDiagram ? "var(--white)" : "rgba(234,247,255,0.35)",
                      fontSize: "13px",
                      fontWeight: 850,
                      cursor: canDownloadDiagram ? "pointer" : "not-allowed",
                      borderBottom: "1px solid rgba(32, 227, 255, 0.10)",
                    }}
                    title={!canDownloadDiagram ? "다이어그램 렌더링 후 다운로드 가능" : undefined}
                  >
                    <ImageIcon size={14} style={{ color: canDownloadDiagram ? "var(--neon-cyan)" : "rgba(234,247,255,0.3)" }} />
                    SVG 이미지
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMmd}
                    className="flex w-full items-center gap-2.5 border-0 px-4 py-3 tracking-tight transition-colors hover:bg-white/5"
                    role="menuitem"
                    style={{
                      background: "transparent",
                      color: "var(--white)",
                      fontSize: "13px",
                      fontWeight: 850,
                      cursor: "pointer",
                    }}
                  >
                    <FileCode size={14} style={{ color: "var(--soft-mint)" }} />
                    Mermaid 소스 (.mmd)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={embedded ? "grid min-h-0 flex-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]" : "grid gap-5 xl:grid-cols-[430px_1fr]"}>
        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden rounded-2xl" : "rounded-2xl overflow-hidden"} style={{
          background: "rgba(11, 22, 40, 0.88)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.30)"
        }}>
          <div className="px-4 py-4" style={{
            borderBottom: "1px solid rgba(32, 227, 255, 0.14)"
          }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 tracking-tight" style={{
                  color: "var(--white)",
                  fontSize: "14px",
                  fontWeight: 950
                }}>
                  ERD 목록
                </h2>
                <p className="m-0 mt-1 truncate tracking-tight" style={{
                  color: "var(--muted)",
                  fontSize: "11px",
                  fontWeight: 800
                }}>
                  {repositoryName} 프로젝트 다이어그램
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddErd}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-0 px-3 py-2 tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(32, 227, 255, 0.10)",
                  border: "1px solid rgba(32, 227, 255, 0.24)",
                  color: "var(--neon-cyan)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 950
                }}
              >
                <Plus size={14} />
                추가
              </button>
            </div>

            <div
              className="codedock-scrollbar-hidden mt-3 grid gap-2 overflow-y-auto pr-1"
              style={{ maxHeight: embedded ? 190 : 250 }}
            >
              {erdDocumentSummaries.map(({ document: erdDoc, diagram: documentDiagram }) => {
                const isSelected = erdDoc.id === selectedErd?.id;
                const documentColumnCount = documentDiagram.entities.reduce((sum, entity) => sum + entity.columns.length, 0);
                const canDeleteErd = erdDocuments.length > 1;

                return (
                  <div
                    key={erdDoc.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 rounded-xl px-2 py-2 tracking-tight transition-all hover:translate-x-0.5"
                    style={{
                      background: isSelected ? "rgba(32, 227, 255, 0.12)" : "rgba(234, 247, 255, 0.045)",
                      border: isSelected ? "1px solid rgba(32, 227, 255, 0.34)" : "1px solid rgba(32, 227, 255, 0.12)",
                      color: "var(--white)",
                      boxShadow: isSelected ? "0 10px 28px rgba(32, 227, 255, 0.10)" : "none"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectErd(erdDoc.id)}
                      className="min-w-0 rounded-lg border-0 bg-transparent px-1 text-left tracking-tight"
                      style={{ color: "var(--white)", cursor: "pointer" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="m-0 truncate" style={{ fontSize: "13px", fontWeight: 950 }}>
                            {erdDoc.title}
                          </p>
                          <p className="m-0 mt-1 truncate" style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 800 }}>
                            {erdDoc.description}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 font-mono" style={{
                          background: isSelected ? "rgba(57, 255, 136, 0.12)" : "rgba(234, 247, 255, 0.06)",
                          color: isSelected ? "var(--soft-mint)" : "var(--muted)",
                          fontSize: "10px",
                          fontWeight: 950
                        }}>
                          {documentDiagram.entities.length}T
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2" style={{ color: "var(--muted)", fontSize: "10px", fontWeight: 850 }}>
                        <span>컬럼 {documentColumnCount}</span>
                        <span>관계 {documentDiagram.relations.length}</span>
                        <span>{erdDoc.updatedAt}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteErd(erdDoc.id)}
                      disabled={!canDeleteErd}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg border-0 transition-all hover:scale-105"
                      style={{
                        background: "rgba(255, 107, 107, 0.10)",
                        border: "1px solid rgba(255, 107, 107, 0.20)",
                        color: "#ff8f8f",
                        cursor: canDeleteErd ? "pointer" : "not-allowed",
                        opacity: canDeleteErd ? 1 : 0.38
                      }}
                      aria-label={`${erdDoc.title} 삭제`}
                      title={canDeleteErd ? "ERD 삭제" : "마지막 ERD는 삭제할 수 없어요"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3" style={{
            borderBottom: "1px solid rgba(32, 227, 255, 0.14)"
          }}>
            <div className="flex items-center gap-2">
              <Table2 size={17} style={{ color: "var(--neon-cyan)" }} />
              <h2 className="m-0 tracking-tight" style={{
                color: "var(--white)",
                fontSize: "14px",
                fontWeight: 950
              }}>
                Mermaid ERD 코드
              </h2>
            </div>
            <span className="max-w-[150px] truncate tracking-tight" style={{
              color: "var(--muted)",
              fontSize: "11px",
              fontWeight: 800
            }}>
              {selectedErd?.title ?? "실시간 렌더링"}
            </span>
          </div>

          {mermaidError && (
            <div
              className="mx-4 mt-4 rounded-2xl px-4 py-3 tracking-tight"
              style={{
                background: "rgba(255, 107, 107, 0.10)",
                border: "1px solid rgba(255, 107, 107, 0.30)",
                color: "#FFB4B4",
                fontSize: "12px",
                fontWeight: 850,
                lineHeight: 1.6
              }}
            >
              Mermaid 문법 오류: {mermaidError}
            </div>
          )}

          <textarea
            value={erdCode}
            onChange={(event) => updateSelectedErdCode(event.target.value)}
            spellCheck={false}
            className="codedock-scrollbar-hidden block w-full resize-none border-0 p-4 font-mono outline-none"
            style={{
              flex: embedded ? "1 1 0" : undefined,
              minHeight: embedded ? 0 : "720px",
              background: "rgba(5, 11, 20, 0.78)",
              color: "var(--soft-mint)",
              fontSize: "12px",
              fontWeight: 800,
              lineHeight: 1.7
            }}
          />
        </section>

        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden rounded-2xl" : "rounded-2xl overflow-hidden"} style={{
          background: "linear-gradient(145deg, rgba(11, 22, 40, 0.96), rgba(5, 11, 20, 0.90))",
          border: "1px solid rgba(32, 227, 255, 0.18)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(234, 247, 255, 0.08)"
        }}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{
            borderBottom: "1px solid rgba(32, 227, 255, 0.14)",
            background: "linear-gradient(90deg, rgba(32, 227, 255, 0.10), rgba(57, 255, 136, 0.045), rgba(5, 11, 20, 0.72))"
          }}>
            <div className="flex items-center gap-4">
              <PreviewStat label="테이블" value={diagram.entities.length} />
              <PreviewStat label="컬럼" value={columnCount} />
              <PreviewStat label="관계" value={relationCount} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
              <p className="m-0 min-w-0 tracking-tight" style={{
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 800
              }}>
                erDiagram 코드를 수정하면 아래 다이어그램이 바로 갱신됩니다.
              </p>
              {zoomControls}
            </div>
          </div>

          <div
            ref={diagramViewportRef}
            className="codedock-scrollbar-hidden overflow-auto"
            style={{
              flex: embedded ? "1 1 0" : undefined,
              background: "rgba(5, 11, 20, 0.48)",
              cursor: "default",
              maxHeight: embedded ? "none" : 720,
              minHeight: embedded ? 0 : 620
            }}
          >
            <div
              className="relative"
              style={{
                width: `max(100%, ${scaledCanvasWidth}px)`,
                height: `max(100%, ${scaledCanvasHeight}px)`,
                background: `
                  radial-gradient(circle at 18% 12%, rgba(32, 227, 255, 0.16), transparent 28%),
                  radial-gradient(circle at 86% 8%, rgba(57, 255, 136, 0.10), transparent 30%),
                  linear-gradient(rgba(234, 247, 255, 0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(234, 247, 255, 0.035) 1px, transparent 1px),
                  rgba(5, 11, 20, 0.72)
                `,
                backgroundSize: "100% 100%, 100% 100%, 34px 34px, 34px 34px, 100% 100%"
              }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  left: canvasInsetX,
                  top: canvasInsetY,
                  width: worldCanvasWidth,
                  minHeight: worldCanvasHeight,
                  transform: `scale(${diagramZoom})`,
                  transformOrigin: "0 0"
                }}
              >
                {mermaidError ? (
                  <div
                    className="absolute rounded-2xl px-5 py-4"
                    style={{
                      left: diagramFrameOffsetX,
                      top: diagramFrameOffsetY,
                      background: "rgba(255, 107, 107, 0.10)",
                      border: "1px solid rgba(255, 107, 107, 0.30)",
                      color: "#FFB4B4",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    Mermaid 렌더링 오류: {mermaidError}
                  </div>
                ) : (
                  <div
                    className="absolute rounded-[22px]"
                    style={{
                      left: diagramFrameOffsetX,
                      top: diagramFrameOffsetY,
                      width: diagramFrameWidth,
                      minHeight: diagramFrameHeight,
                      background: "rgba(11, 22, 40, 0.34)",
                      border: "1px solid transparent",
                      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.22)"
                    }}
                  >
                    <div
                      className="codedock-mermaid-diagram"
                      style={diagramRenderStyle}
                      dangerouslySetInnerHTML={{ __html: renderableSvg }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="m-0 tracking-tight" style={{
        color: "var(--muted)",
        fontSize: "10px",
        fontWeight: 900,
        textTransform: "uppercase"
      }}>
        {label}
      </p>
      <p className="m-0 tracking-tight" style={{
        color: "var(--neon-cyan)",
        fontSize: "18px",
        fontWeight: 950,
        textShadow: "0 0 18px rgba(32, 227, 255, 0.28)"
      }}>
        {value}
      </p>
    </div>
  );
}
