import { ChevronDown, Database, Download, FileCode, ImageIcon, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { getErd, getErdTables, generateErd, type ErdTable } from "../api/erd";
import { ApiClientError } from "../api/client";

interface ERDPageProps {
  embedded?: boolean;
  workspaceId?: number;
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
const minDiagramZoom = 0.1;
const maxDiagramZoom = 1.8;
const defaultDiagramZoom = 1;
const diagramZoomStep = 0.1;
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
const mermaidThemeColors = {
  background: "#050B14",
  panel: "#132338",
  panelAlt: "#0F1D30",
  canvas: "#07101D",
  text: "#EAF7FF",
  cyan: "#20E3FF",
  green: "#39FF88"
};
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
    background: mermaidThemeColors.background,
    mainBkg: mermaidThemeColors.panel,
    primaryColor: mermaidThemeColors.panel,
    primaryBorderColor: mermaidThemeColors.cyan,
    primaryTextColor: mermaidThemeColors.text,
    secondaryColor: mermaidThemeColors.panelAlt,
    tertiaryColor: mermaidThemeColors.canvas,
    lineColor: mermaidThemeColors.green,
    textColor: mermaidThemeColors.text,
    nodeBorder: mermaidThemeColors.cyan,
    nodeTextColor: mermaidThemeColors.text,
    edgeLabelBackground: mermaidThemeColors.canvas,
    erEdgeLabelBackground: mermaidThemeColors.canvas,
    attributeBackgroundColorOdd: "#101F34",
    attributeBackgroundColorEven: "#0B1829",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
  }
} as const;

let isMermaidInitialized = false;
let mermaidModulePromise: Promise<typeof import("mermaid").default> | null = null;

function clampDiagramZoom(value: number, minZoom = minDiagramZoom) {
  return Math.min(maxDiagramZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

async function getMermaidModule() {
  mermaidModulePromise ??= import("mermaid").then((module) => module.default);
  return mermaidModulePromise;
}

async function ensureMermaidInitialized() {
  const mermaid = await getMermaidModule();
  if (isMermaidInitialized) return mermaid;
  mermaid.initialize(mermaidConfig);
  isMermaidInitialized = true;
  return mermaid;
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
    .map((line) => line
      .replace(/\s+(nullable|optional)\b/gi, "")
      .replace(/^(\s*)([A-Za-z_][\w]*)\([^)]*\)(\s+)/, "$1$2$3"))
    .join("\n");
}

function isErdCode(code: string) {
  return code.trimStart().startsWith("erDiagram");
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
  result = result.replace(/style="([^"]*?)max-width:\s*[^;"]+;?\s*([^"]*)"/g, 'style="$1$2"');
  result = result.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, "$1");
  result = result.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, "$1");
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

export function ERDPage({ embedded = false, workspaceId }: ERDPageProps) {
  const diagramViewportRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const hasAutoFitCanvasRef = useRef(false);

  const [mermaidCode, setMermaidCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [tables, setTables] = useState<ErdTable[]>([]);
  const [isTablesLoading, setIsTablesLoading] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [diagramZoom, setDiagramZoom] = useState(defaultDiagramZoom);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const diagram = useMemo(() => parseErdCode(mermaidCode), [mermaidCode]);
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
    const viewport = diagramViewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewportSize);
      return () => {
        window.removeEventListener("resize", updateViewportSize);
      };
    }

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
      setDiagramZoom(defaultDiagramZoom);

      const viewport = diagramViewportRef.current;
      if (viewport) {
        window.requestAnimationFrame(() => {
          const insetX = Math.max(0, (viewportSize.width - worldCanvasWidth * defaultDiagramZoom) / 2);
          const insetY = Math.max(0, (viewportSize.height - worldCanvasHeight * defaultDiagramZoom) / 2);
          viewport.scrollLeft = (diagramFrameOffsetX + diagramFrameWidth / 2) * defaultDiagramZoom + insetX - viewportSize.width / 2;
          viewport.scrollTop = (diagramFrameOffsetY + diagramFrameHeight / 2) * defaultDiagramZoom + insetY - viewportSize.height / 2;
        });
      }
      return;
    }

    setDiagramZoom((prev) => clampDiagramZoom(prev, minDiagramZoom));
  }, [diagramFrameHeight, diagramFrameWidth, viewportSize.width, viewportSize.height, worldCanvasWidth, worldCanvasHeight]);

  useEffect(() => {
    if (!workspaceId) return;

    const controller = new AbortController();
    setIsLoading(true);
    setApiError("");

    getErd(workspaceId, { signal: controller.signal })
      .then((data) => {
        setMermaidCode(data.mermaidCode ?? "");
      })
      .catch((error) => {
        if (error instanceof ApiClientError && error.code === "ERD_NOT_FOUND") {
          setMermaidCode("");
        } else if (!(error instanceof DOMException && error.name === "AbortError")) {
          setApiError(error instanceof Error ? error.message : "ERD를 불러오지 못했습니다.");
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
    setIsTablesLoading(true);

    getErdTables(workspaceId, { signal: controller.signal })
      .then((data) => {
        setTables(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTables([]);
        }
      })
      .finally(() => {
        setIsTablesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!mermaidCode.trim()) {
      setMermaidSvg("");
      setMermaidError("");
      cleanupMermaidRenderArtifacts();
      return;
    }

    const renderableCode = toMermaidRenderableCode(mermaidCode);

    if (!isErdCode(renderableCode)) {
      setMermaidSvg("");
      setMermaidError("ERD 탭에서는 erDiagram 코드만 렌더링할 수 있습니다.");
      cleanupMermaidRenderArtifacts();
      return;
    }

    let cancelled = false;
    const renderId = `codedock-erd-${Date.now()}`;
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

    const renderDiagram = async () => {
      try {
        const mermaid = await ensureMermaidInitialized();
        cleanupMermaidRenderArtifacts();
        await mermaid.parse(renderableCode);
        const result = await mermaid.render(renderId, renderableCode, renderContainer);
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
  }, [mermaidCode]);

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
    anchor.download = "codedock-erd.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleExportMmd = () => {
    const blob = new Blob([mermaidCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "codedock-erd.mmd";
    anchor.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleGenerateErd = async () => {
    if (!workspaceId || isGenerating) return;

    setIsGenerating(true);
    setGenerateError("");

    try {
      const data = await generateErd(workspaceId);
      setMermaidCode(data.mermaidCode);

      setIsTablesLoading(true);
      getErdTables(workspaceId)
        .then((tableData) => setTables(tableData))
        .catch(() => setTables([]))
        .finally(() => setIsTablesLoading(false));
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === "GITHUB_REPO_NOT_FOUND") {
          setGenerateError("GitHub 레포지토리가 연결되지 않았습니다.");
        } else if (error.code === "WORKSPACE_MEMBER_NOT_FOUND") {
          setGenerateError("워크스페이스 멤버 정보를 찾을 수 없습니다.");
        } else if (error.code === "E002") {
          setGenerateError("연결된 레포에서 ERD 생성에 필요한 파일을 찾을 수 없습니다. 레포를 확인해주세요.");
        } else {
          setGenerateError(error.message || "ERD 생성에 실패했습니다.");
        }
      } else {
        setGenerateError("ERD 생성에 실패했습니다.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleZoomChange = (delta: number) => {
    setDiagramZoom((prev) => clampDiagramZoom(prev + delta, minDiagramZoom));
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
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
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
        onClick={() => setDiagramZoom(defaultDiagramZoom)}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border-0 px-3 font-mono transition-all hover:scale-105"
        style={{
          background: "rgba(var(--codedock-primary-rgb), 0.10)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
          color: "var(--neon-cyan)",
          cursor: "pointer",
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 950
        }}
        aria-label="ERD 100%로 보기"
        title="100%로 보기 · Ctrl + 휠로 확대/축소"
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
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
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
        const nextZoom = clampDiagramZoom(prev + delta, minDiagramZoom);
        if (nextZoom === prev) return prev;
        if (prev <= 0) return nextZoom;
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
  }, [viewportSize.width, viewportSize.height, worldCanvasWidth, worldCanvasHeight]);

  return (
    <div
      className={embedded ? "flex h-full min-h-0 flex-col overflow-hidden px-5 py-5" : "w-[min(1500px,calc(100vw-36px))] mx-auto py-12 pb-20"}
    >
      <header
        className={embedded ? "mb-4 flex flex-wrap items-start justify-between gap-4" : "mb-7 flex flex-wrap items-start justify-between gap-4"}
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
              ERD
            </h1>
          </div>
        </div>

        <div className={embedded ? "flex min-w-0 flex-wrap items-center justify-end gap-2 overflow-visible codedock-scrollbar-hidden" : "flex flex-wrap items-center gap-2"}>
          <div
            className={embedded ? "flex shrink-0 flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}
          >
            <button
              type="button"
              onClick={handleGenerateErd}
              disabled={isGenerating || !workspaceId}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border-0 px-3 py-2 tracking-tight transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(255, 145, 77, 0.10)",
                border: "1px solid rgba(255, 145, 77, 0.32)",
                color: "#ff9a5c",
                cursor: isGenerating || !workspaceId ? "not-allowed" : "pointer",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 950,
                opacity: isGenerating || !workspaceId ? 0.6 : 1
              }}
            >
              <Sparkles size={15} />
              {isGenerating ? "생성 중..." : "AI 자동 생성"}
            </button>
            <div className="relative shrink-0" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu((v) => !v)}
                className="inline-flex h-9 min-w-[104px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-3 tracking-tight"
                style={{
                  background: "rgba(234, 247, 255, 0.06)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                  color: "var(--white)",
                  cursor: "pointer",
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 900
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
                    border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)",
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
                      borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.10)",
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

      {generateError && (
        <div
          className="mb-4 rounded-xl px-4 py-2 tracking-tight"
          style={{
            background: "rgba(255, 107, 107, 0.10)",
            border: "1px solid rgba(255, 107, 107, 0.28)",
            color: "#FFB4B4",
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 800
          }}
        >
          {generateError}
        </div>
      )}

      <div className={embedded ? "grid min-h-0 flex-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]" : "grid gap-5 xl:grid-cols-[430px_1fr]"}>
        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden rounded-2xl" : "flex flex-col rounded-2xl overflow-hidden"} style={{
          background: "rgba(11, 22, 40, 0.88)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.30)"
        }}>
          <div className="px-4 py-4" style={{
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
          }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 tracking-tight" style={{
                color: "var(--white)",
                fontSize: "14px",
                fontWeight: 950
              }}>
                테이블 목록
              </h2>
              {!isTablesLoading && tables.length > 0 && (
                <span className="rounded-full px-2 py-1 font-mono tracking-tight" style={{
                  background: "rgba(var(--codedock-primary-rgb), 0.10)",
                  border: "1px solid rgba(var(--codedock-primary-rgb), 0.24)",
                  color: "var(--neon-cyan)",
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 950
                }}>
                  {tables.length}
                </span>
              )}
            </div>
          </div>

          <div className={`codedock-scrollbar-hidden overflow-y-auto ${embedded ? "flex-1" : ""}`} style={{ maxHeight: embedded ? "none" : 720 }}>
            {isTablesLoading ? (
              <div className="flex items-center justify-center px-4 py-8">
                <p className="m-0 tracking-tight" style={{
                  color: "var(--muted)",
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 800
                }}>
                  테이블 정보를 불러오는 중...
                </p>
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <Database size={22} style={{ color: "var(--neon-cyan)", marginBottom: 10 }} />
                <p className="m-0 tracking-tight" style={{
                  color: "var(--white)",
                  fontSize: "14px",
                  fontWeight: 950
                }}>
                  테이블이 없습니다
                </p>
                <p className="m-0 mt-1 tracking-tight" style={{
                  color: "var(--muted)",
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 800
                }}>
                  AI 자동 생성 후 테이블 정보가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 p-3">
                {tables.map((table) => {
                  const isExpanded = expandedTableId === table.id;
                  return (
                    <div
                      key={table.id}
                      className="rounded-xl tracking-tight"
                      style={{
                        background: isExpanded ? "rgba(var(--codedock-primary-rgb), 0.10)" : "rgba(234, 247, 255, 0.04)",
                        border: isExpanded ? "1px solid rgba(var(--codedock-primary-rgb), 0.28)" : "1px solid rgba(var(--codedock-primary-rgb), 0.12)"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTableId(isExpanded ? null : table.id)}
                        className="flex w-full items-start justify-between gap-2 border-0 bg-transparent px-3 py-3 text-left"
                        style={{ cursor: "pointer", color: "var(--white)" }}
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate" style={{ fontSize: "13px", fontWeight: 950 }}>
                            {table.tableName}
                          </p>
                          {table.description && (
                            <p className="m-0 mt-1 truncate" style={{
                              color: "var(--muted)",
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 800
                            }}>
                              {table.description}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          size={14}
                          style={{
                            color: "var(--muted)",
                            flexShrink: 0,
                            marginTop: 2,
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 0.15s"
                          }}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <pre className="m-0 overflow-x-auto rounded-lg p-3" style={{
                            background: "rgba(5, 11, 20, 0.60)",
                            border: "1px solid rgba(var(--codedock-primary-rgb), 0.12)",
                            color: "var(--soft-mint)",
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 800,
                            lineHeight: 1.7,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all"
                          }}>
                            {table.schemaDefinition}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden rounded-2xl" : "rounded-2xl overflow-hidden"} style={{
          background: "linear-gradient(145deg, rgba(11, 22, 40, 0.96), rgba(5, 11, 20, 0.90))",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(234, 247, 255, 0.08)"
        }}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
            background: "linear-gradient(90deg, rgba(var(--codedock-primary-rgb), 0.10), rgba(var(--codedock-secondary-rgb), 0.045), rgba(5, 11, 20, 0.72))"
          }}>
            <div className="flex items-center gap-4">
              <PreviewStat label="테이블" value={diagram.entities.length} />
              <PreviewStat label="컬럼" value={columnCount} />
              <PreviewStat label="관계" value={relationCount} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
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
                  radial-gradient(circle at 18% 12%, rgba(var(--codedock-primary-rgb), 0.16), transparent 28%),
                  radial-gradient(circle at 86% 8%, rgba(var(--codedock-secondary-rgb), 0.10), transparent 30%),
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
                {isLoading ? (
                  <div
                    className="absolute rounded-2xl px-5 py-5 text-center tracking-tight"
                    style={{
                      left: diagramFrameOffsetX,
                      top: diagramFrameOffsetY,
                      width: 320,
                      background: "rgba(11, 22, 40, 0.78)",
                      border: "1px dashed rgba(var(--codedock-primary-rgb), 0.28)",
                      color: "var(--muted)",
                      boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24)"
                    }}
                  >
                    <p className="m-0" style={{ fontSize: "var(--krds-body-xsmall)", fontWeight: 800 }}>
                      ERD를 불러오는 중...
                    </p>
                  </div>
                ) : apiError ? (
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
                      lineHeight: 1.7
                    }}
                  >
                    ERD 조회 실패: {apiError}
                  </div>
                ) : !mermaidCode ? (
                  <div
                    className="absolute rounded-2xl px-5 py-5 text-center tracking-tight"
                    style={{
                      left: diagramFrameOffsetX,
                      top: diagramFrameOffsetY,
                      width: 320,
                      background: "rgba(11, 22, 40, 0.78)",
                      border: "1px dashed rgba(var(--codedock-primary-rgb), 0.28)",
                      color: "var(--white)",
                      boxShadow: "0 18px 44px rgba(0, 0, 0, 0.24)"
                    }}
                  >
                    <Database size={26} style={{ color: "var(--neon-cyan)", margin: "0 auto 12px" }} />
                    <p className="m-0" style={{ fontSize: 15, fontWeight: 950 }}>
                      ERD가 없습니다
                    </p>
                    <p className="m-0 mt-2" style={{ color: "var(--muted)", fontSize: "var(--krds-body-xsmall)", fontWeight: 800, lineHeight: 1.6 }}>
                      AI 자동 생성 버튼으로 ERD를 생성할 수 있어요.
                    </p>
                  </div>
                ) : mermaidError ? (
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
        fontSize: "var(--krds-body-xsmall)",
        fontWeight: 900,
        textTransform: "uppercase"
      }}>
        {label}
      </p>
      <p className="m-0 tracking-tight" style={{
        color: "var(--neon-cyan)",
        fontSize: "18px",
        fontWeight: 950,
        textShadow: "0 0 18px rgba(var(--codedock-primary-rgb), 0.28)"
      }}>
        {value}
      </p>
    </div>
  );
}
