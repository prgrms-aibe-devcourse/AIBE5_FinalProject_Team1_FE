import { Database, Download, KeyRound, Link as LinkIcon, Minus, Plus, RefreshCw, RotateCcw, Sparkles, Table2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";

interface ERDPageProps {
  embedded?: boolean;
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
const entityRowHeight = 254;
const entityLeftInset = 24;
const entityTopInset = 44;
const diagramCanvasWidth = entityLeftInset * 2 + entityColumnWidth * (diagramColumns - 1) + entityCardWidth;
const minDiagramZoom = 0.55;
const maxDiagramZoom = 1.8;
const diagramZoomStep = 0.1;

function clampDiagramZoom(value: number) {
  return Math.min(maxDiagramZoom, Math.max(minDiagramZoom, Number(value.toFixed(2))));
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

function getEntityPosition(index: number) {
  const x = entityLeftInset + (index % diagramColumns) * entityColumnWidth;
  const y = entityTopInset + Math.floor(index / diagramColumns) * entityRowHeight;
  return { x, y };
}

export function ERDPage({ embedded = false }: ERDPageProps) {
  const diagramViewportRef = useRef<HTMLDivElement>(null);
  const [erdCode, setErdCode] = useState(defaultErdCode);
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState("");
  const diagram = useMemo(() => parseErdCode(erdCode), [erdCode]);
  const relationCount = diagram.relations.length;
  const columnCount = diagram.entities.reduce((sum, entity) => sum + entity.columns.length, 0);
  const canvasHeight = Math.max(560, Math.ceil(diagram.entities.length / diagramColumns) * entityRowHeight + 80);
  const mermaidCanvasWidth = Math.max(1100, diagramCanvasWidth + 240);
  const mermaidCanvasHeight = Math.max(720, diagram.entities.length * 440);
  const zoomPercent = Math.round(diagramZoom * 100);
  const positions = useMemo(() => {
    const nextPositions = new Map<string, { x: number; y: number }>();
    diagram.entities.forEach((entity, index) => {
      nextPositions.set(entity.name, getEntityPosition(index));
    });
    return nextPositions;
  }, [diagram.entities]);

  useEffect(() => {
    let cancelled = false;
    const renderId = `codedock-erd-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    mermaid.initialize({
      startOnLoad: false,
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
        primaryColor: "#0B1628",
        primaryBorderColor: "#20E3FF",
        primaryTextColor: "#EAF7FF",
        secondaryColor: "#093B45",
        tertiaryColor: "#07101D",
        lineColor: "#20E3FF",
        textColor: "#EAF7FF",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
      }
    });

    const renderDiagram = async () => {
      try {
        const result = await mermaid.render(renderId, toMermaidRenderableCode(erdCode));
        if (!cancelled) {
          setMermaidSvg(result.svg);
          setMermaidError("");
        }
      } catch (error) {
        if (!cancelled) {
          setMermaidSvg("");
          setMermaidError(error instanceof Error ? error.message : "Mermaid 렌더링 중 오류가 발생했습니다.");
        }
      }
    };

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [erdCode]);

  const handleExport = () => {
    const blob = new Blob([erdCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "codedock-erd.mmd";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomChange = (delta: number) => {
    setDiagramZoom((prev) => clampDiagramZoom(prev + delta));
  };

  useEffect(() => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;

    const handleDiagramWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const contentX = viewport.scrollLeft + pointerX;
      const contentY = viewport.scrollTop + pointerY;
      const delta = event.deltaY < 0 ? diagramZoomStep : -diagramZoomStep;

      setDiagramZoom((prev) => {
        const nextZoom = clampDiagramZoom(prev + delta);
        const zoomRatio = nextZoom / prev;

        window.requestAnimationFrame(() => {
          viewport.scrollLeft = contentX * zoomRatio - pointerX;
          viewport.scrollTop = contentY * zoomRatio - pointerY;
        });

        return nextZoom;
      });
    };

    viewport.addEventListener("wheel", handleDiagramWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleDiagramWheel);
    };
  }, []);

  return (
    <div
      className={embedded ? "flex h-full min-h-0 flex-col overflow-hidden px-5 py-5" : "w-[min(1500px,calc(100vw-36px))] mx-auto py-12 pb-20"}
    >
      <style>
        {`
          .codedock-mermaid-diagram {
            width: 100%;
            min-height: 560px;
            padding: 28px;
            color: #EAF7FF;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .codedock-mermaid-diagram svg {
            width: min(100%, 520px) !important;
            max-width: none !important;
            height: auto;
            filter: drop-shadow(0 22px 44px rgba(0, 0, 0, 0.34));
          }

          .codedock-mermaid-diagram .entityBox,
          .codedock-mermaid-diagram .er.entityBox {
            fill: rgba(11, 22, 40, 0.96) !important;
            stroke: #20E3FF !important;
          }

          .codedock-mermaid-diagram .attributeBoxOdd,
          .codedock-mermaid-diagram .attributeBoxEven {
            fill: rgba(5, 11, 20, 0.86) !important;
            stroke: rgba(32, 227, 255, 0.24) !important;
          }

          .codedock-mermaid-diagram text,
          .codedock-mermaid-diagram .entityLabel {
            fill: #EAF7FF !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
            font-weight: 800 !important;
          }

          .codedock-mermaid-diagram .relationshipLabelBox {
            fill: rgba(5, 11, 20, 0.92) !important;
            opacity: 1 !important;
          }

          .codedock-mermaid-diagram .relationshipLine {
            stroke: #39FF88 !important;
            stroke-width: 2px !important;
          }
        `}
      </style>
      <header className={embedded ? "mb-4 flex flex-wrap items-start justify-between gap-4" : "mb-7 flex flex-wrap items-start justify-between gap-4"}>
        <div className="flex items-start gap-3">
          <Database size={embedded ? 24 : 30} style={{ color: "var(--soft-mint)", marginTop: 3 }} />
          <div>
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
              coffeeting-backend
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full px-3 py-1.5 tracking-tight" style={{
                background: "rgba(234, 247, 255, 0.055)",
                border: "1px solid rgba(32, 227, 255, 0.14)",
                color: "var(--muted)",
                fontSize: "12px",
                fontWeight: 850
              }}>
                Ctrl + 휠로 확대/축소
              </span>
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
              >
                <Minus size={15} />
              </button>
              <button
                type="button"
                onClick={() => setDiagramZoom(1)}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border-0 px-3 font-mono transition-all hover:scale-105"
                style={{
                  background: "rgba(32, 227, 255, 0.10)",
                  border: "1px solid rgba(32, 227, 255, 0.24)",
                  color: "var(--neon-cyan)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 950
                }}
                aria-label="ERD 확대 비율 초기화"
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
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setErdCode(generatedErdCode)}
            className="inline-flex items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
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
            onClick={() => setErdCode(defaultErdCode)}
            className="inline-flex items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
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
            재생성
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border-0 px-3 py-2 tracking-tight"
            style={{
              background: "rgba(234, 247, 255, 0.06)",
              border: "1px solid rgba(32, 227, 255, 0.16)",
              color: "var(--white)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 900
            }}
          >
            <Download size={15} />
            내보내기
          </button>
        </div>
      </header>

      <div className={embedded ? "grid min-h-0 flex-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]" : "grid gap-5 xl:grid-cols-[430px_1fr]"}>
        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden rounded-2xl" : "rounded-2xl overflow-hidden"} style={{
          background: "rgba(11, 22, 40, 0.88)",
          border: "1px solid rgba(32, 227, 255, 0.16)",
          boxShadow: "0 18px 44px rgba(0, 0, 0, 0.30)"
        }}>
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
            <span className="tracking-tight" style={{
              color: "var(--muted)",
              fontSize: "11px",
              fontWeight: 800
            }}>
              실시간 렌더링
            </span>
          </div>

          <textarea
            value={erdCode}
            onChange={(event) => setErdCode(event.target.value)}
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
            <p className="m-0 tracking-tight" style={{
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 800
            }}>
              erDiagram 코드를 수정하면 아래 다이어그램이 바로 갱신됩니다.
            </p>
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
                width: mermaidCanvasWidth * diagramZoom,
                height: mermaidCanvasHeight * diagramZoom,
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
                  width: mermaidCanvasWidth,
                  minHeight: mermaidCanvasHeight,
                  transform: `scale(${diagramZoom})`,
                  transformOrigin: "0 0"
                }}
              >
                {mermaidError ? (
                  <div
                    className="m-6 rounded-2xl px-5 py-4"
                    style={{
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
                    className="codedock-mermaid-diagram"
                    dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                  />
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

function EntityCard({ entity, x, y }: { entity: DiagramEntity; x: number; y: number }) {
  return (
    <div
      className="absolute overflow-hidden rounded-xl"
      style={{
        left: x,
        top: y,
        width: entityCardWidth,
        background: "linear-gradient(145deg, rgba(11, 22, 40, 0.97), rgba(5, 11, 20, 0.92))",
        border: "1px solid rgba(32, 227, 255, 0.22)",
        boxShadow: entity.columns.length === 0
          ? "0 10px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(234, 247, 255, 0.08)"
          : "0 16px 30px rgba(0, 0, 0, 0.34), 0 0 24px rgba(32, 227, 255, 0.08), inset 0 1px 0 rgba(234, 247, 255, 0.08)"
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{
        background: "linear-gradient(135deg, rgba(32, 227, 255, 0.18), rgba(57, 255, 136, 0.10)), rgba(8, 17, 31, 0.94)",
        borderBottom: "1px solid rgba(32, 227, 255, 0.18)",
        color: "var(--white)"
      }}>
        <Table2 size={15} style={{ color: "var(--neon-cyan)" }} />
        <h3 className="m-0 font-mono tracking-tight" style={{
          fontSize: "16px",
          fontWeight: 950,
          textShadow: "0 0 18px rgba(32, 227, 255, 0.14)"
        }}>
          {entity.name}
        </h3>
      </div>
      <div>
        {entity.columns.length === 0 ? (
          <div className="px-4 py-5 tracking-tight" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
            컬럼 정의가 없습니다.
          </div>
        ) : (
          entity.columns.slice(0, 7).map((column) => (
            <div
              key={`${entity.name}-${column.name}`}
              className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-2"
              style={{
                borderBottom: "1px solid rgba(32, 227, 255, 0.10)"
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {column.pk ? (
                    <KeyRound size={13} style={{ color: "#FFD166" }} />
                  ) : column.fk ? (
                    <LinkIcon size={13} style={{ color: "var(--neon-cyan)" }} />
                  ) : null}
                  <span className="truncate font-mono" style={{
                    color: "var(--white)",
                    fontSize: "12px",
                    fontWeight: 900
                  }}>
                    {column.name}
                  </span>
                </div>
                {column.nullable && (
                  <p className="m-0 mt-0.5 pl-5 tracking-tight" style={{
                    color: "var(--muted)",
                    fontSize: "10px",
                    fontWeight: 700
                  }}>
                    nullable
                  </p>
                )}
              </div>
              <span className="font-mono" style={{
                color: "var(--soft-mint)",
                fontSize: "10px",
                fontWeight: 800
              }}>
                {column.type}
              </span>
            </div>
          ))
        )}
        {entity.columns.length > 7 && (
          <div className="px-4 py-2 tracking-tight" style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
            +{entity.columns.length - 7} more columns
          </div>
        )}
      </div>
    </div>
  );
}
