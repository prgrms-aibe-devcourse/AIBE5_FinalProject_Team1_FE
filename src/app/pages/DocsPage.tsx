import { FileText, Sparkles, BookOpen, HelpCircle, Package, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  aiGenerateDocument,
  type DocumentResponse,
  type DocumentCategory,
} from "../api/document";

interface DocsPageProps {
  embedded?: boolean;
  workspaceId?: number;
}

interface DocumentItem {
  id: number;
  category: DocumentCategory | null;
  title: string;
  generatedBy: 'AI' | 'Manual';
  createdAt: string;
  updatedAt: string;
  createdByMemberId: number;
  content: string | null;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Intl.DateTimeFormat('ko-KR').format(date);
}

function mapDocumentResponse(doc: DocumentResponse): DocumentItem {
  return {
    id: doc.id,
    category: doc.category,
    title: doc.title,
    generatedBy: doc.generatedBy,
    createdAt: formatRelativeTime(doc.createdAt),
    updatedAt: formatRelativeTime(doc.updatedAt),
    createdByMemberId: doc.createdByMemberId,
    content: doc.content,
  };
}


export function DocsPage({ embedded = false, workspaceId: workspaceIdProp }: DocsPageProps) {
  const { language } = useLanguage();
  const { workspaceId: contextWorkspaceId, getMemberName, myMemberId } = useWorkspace();
  const workspaceId = contextWorkspaceId ?? workspaceIdProp ?? null;

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftCategory, setDraftCategory] = useState<DocumentCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'none' | null>(null);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<DocumentCategory | null>(null);
  const [isAiTypeModalOpen, setIsAiTypeModalOpen] = useState(false);
  const [aiSelectedType, setAiSelectedType] = useState<DocumentCategory | null>(null);

  const loadDocs = useCallback(async () => {
    if (workspaceId === null) return;
    setIsLoading(true);
    try {
      const data = await getDocuments(workspaceId);
      const mapped = data.map(mapDocumentResponse);
      setDocs(mapped);
      setSelectedDoc((prev) => prev ?? mapped[0]?.id ?? null);
    } catch {
      setDocs([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const categories: { id: DocumentCategory; name: string; nameEn: string; icon: typeof FileText; color: string }[] = [
    { id: 'manual', name: '사용설명서', nameEn: 'Manual', icon: BookOpen, color: 'var(--matrix-green)' },
    { id: 'faq', name: 'FAQ', nameEn: 'FAQ', icon: HelpCircle, color: '#FFD93D' },
    { id: 'release', name: '릴리즈 노트', nameEn: 'Release Notes', icon: Package, color: 'var(--electric-blue)' },
  ];



  const selectedDocData = docs.find(doc => doc.id === selectedDoc);
  const selectedDocContent = selectedDocData?.content ?? "";

  const filteredDocs = selectedCategory === 'none'
    ? docs.filter(d => d.category === null)
    : selectedCategory
      ? docs.filter(d => d.category === selectedCategory)
      : docs;

  const getCategoryLabel = (category: typeof categories[number]) => (
    language === "en" ? category.nameEn : category.name
  );

  const handleStartWriting = () => {
    setIsWriting(true);
    setDraftTitle("");
    setDraftContent("");
    setDraftCategory(null);
    setSelectedDoc(null);
    setEditingDocId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleCancelDraft = () => {
    setIsWriting(false);
    setDraftTitle("");
    setDraftContent("");
    setDraftCategory(null);
    setSelectedDoc(docs[0]?.id ?? null);
  };

  const handleRegisterDraft = async () => {
    if (!draftTitle.trim() || workspaceId === null) return;

    try {
      const created = await createDocument(workspaceId, {
        createdByMemberId: myMemberId ?? 0,
        title: draftTitle.trim(),
        content: draftContent.trim() || undefined,
        category: draftCategory ?? undefined,
        visibility: 'workspace',
      });
      const newDoc = mapDocumentResponse(created);
      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(created.id);
      setIsWriting(false);
      setEditingDocId(null);
      setDraftTitle("");
      setDraftContent("");
      setDraftCategory(null);
    } catch {
      // 실패 시 상태 유지
    }
  };

  const handleGenerateAiDocument = async (category: DocumentCategory) => {
    if (workspaceId === null) return;
    setIsAiTypeModalOpen(false);
    setAiSelectedType(null);
    setIsAiGenerating(true);
    try {
      const created = await aiGenerateDocument(workspaceId, category);
      const newDoc = mapDocumentResponse(created);
      setDocs((prev) => [newDoc, ...prev]);
      setSelectedDoc(created.id);
      setIsWriting(false);
      setEditingDocId(null);
      setDraftTitle("");
      setDraftContent("");
      setDraftCategory(null);
    } catch {
      // 실패 시 상태 유지
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleStartEditDocument = (doc: DocumentItem) => {
    setIsWriting(false);
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content ?? "");
    setEditCategory(doc.category);
  };

  const handleCancelEditDocument = () => {
    setEditingDocId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory(null);
  };

  const handleSaveEditDocument = async () => {
    if (!editingDocId || !editTitle.trim() || !editContent.trim()) return;

    try {
      const updated = await updateDocument(workspaceId, editingDocId, {
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory ?? undefined,
      });
      const updatedDoc = mapDocumentResponse(updated);
      setDocs((prev) => prev.map((d) => d.id === editingDocId ? updatedDoc : d));
      handleCancelEditDocument();
    } catch {
      // 실패 시 상태 유지
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await deleteDocument(workspaceId, docId);
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== docId);
        if (selectedDoc === docId) setSelectedDoc(next[0]?.id ?? null);
        return next;
      });
      handleCancelEditDocument();
    } catch {
      // 실패 시 상태 유지
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : FileText;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : 'var(--muted)';
  };

  const renderDocumentPreview = (content: string) => (
    <div className="grid w-full gap-4">
      {content.split("\n").map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return <div key={`spacer-${index}`} className="h-2" />;
        }

        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 key={index} className="m-0 leading-[1.1] tracking-[-0.055em]" style={{
              color: 'var(--white)',
              fontSize: embedded ? '28px' : '36px',
              fontWeight: 950
            }}>
              {trimmedLine.replace(/^#\s+/, "")}
            </h1>
          );
        }

        if (trimmedLine.startsWith("## ")) {
          return (
            <h2 key={index} className="m-0 mt-4 leading-[1.2] tracking-[-0.035em]" style={{
              color: 'var(--soft-mint)',
              fontSize: embedded ? '18px' : '22px',
              fontWeight: 950
            }}>
              {trimmedLine.replace(/^##\s+/, "")}
            </h2>
          );
        }

        if (trimmedLine.startsWith("- [")) {
          return (
            <div key={index} className="rounded-xl px-4 py-3 tracking-tight" style={{
              background: 'rgba(234, 247, 255, 0.045)',
              border: '1px solid rgba(234, 247, 255, 0.08)',
              color: 'rgba(234, 247, 255, 0.88)',
              fontSize: '14px',
              fontWeight: 800,
              lineHeight: 1.65
            }}>
              {trimmedLine}
            </div>
          );
        }

        if (trimmedLine.startsWith("- ")) {
          return (
            <div key={index} className="flex gap-3 rounded-xl px-4 py-3 tracking-tight" style={{
              background: 'rgba(234, 247, 255, 0.035)',
              border: '1px solid rgba(234, 247, 255, 0.07)',
              color: 'rgba(234, 247, 255, 0.86)',
              fontSize: '14px',
              fontWeight: 780,
              lineHeight: 1.65
            }}>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 950 }}>•</span>
              <span>{trimmedLine.replace(/^-\s+/, "")}</span>
            </div>
          );
        }

        if (trimmedLine.startsWith("```")) {
          return null;
        }

        return (
          <p key={index} className="m-0 tracking-tight" style={{
            color: 'rgba(234, 247, 255, 0.86)',
            fontSize: '15px',
            fontWeight: 760,
            lineHeight: 1.85
          }}>
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );

  return (
    <div className={embedded ? "codedock-scrollbar-hidden flex h-full min-h-0 flex-col overflow-hidden px-5 py-5" : "w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20"}>
      <div className={embedded ? "mb-5" : "mb-8"}>
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: embedded ? 'clamp(30px, 3vw, 44px)' : 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(var(--codedock-primary-rgb), 0.18)'
        }}>
          문서 관리
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: embedded ? '14px' : '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          AI가 자동으로 생성한 문서와 매뉴얼을 관리합니다
        </p>
      </div>

      <div className={embedded ? "grid grid-cols-4 gap-3 mb-5" : "grid md:grid-cols-4 gap-4 mb-9"}>
        {categories.map((category) => {
          const Icon = category.icon;
          const categoryCount = docs.filter((doc) => doc.category === category.id).length;
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(isActive ? null : category.id)}
              className={embedded ? "px-4 py-4 rounded-2xl border-0 text-left transition-all hover:translate-y-[-1px]" : "px-5 py-5 rounded-3xl border-0 text-left transition-all hover:translate-y-[-1px]"}
              style={{
                background: isActive ? `rgba(var(--codedock-primary-rgb), 0.12)` : 'rgba(11, 22, 40, 0.82)',
                border: isActive ? `1px solid rgba(var(--codedock-primary-rgb), 0.34)` : '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                boxShadow: embedded ? '0 12px 30px rgba(0, 0, 0, 0.26)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
                backdropFilter: 'blur(16px)',
                cursor: 'pointer'
              }}
            >
              <Icon size={20} style={{ color: category.color, marginBottom: '8px' }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 900
              }}>
                {getCategoryLabel(category)}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: '32px',
                fontWeight: 950,
                color: category.color
              }}>
                {categoryCount}
              </p>
            </button>
          );
        })}
        {(() => {
          const noneCount = docs.filter(d => d.category === null).length;
          const isActive = selectedCategory === 'none';
          return (
            <button
              type="button"
              onClick={() => setSelectedCategory(isActive ? null : 'none')}
              className={embedded ? "px-4 py-4 rounded-2xl border-0 text-left transition-all hover:translate-y-[-1px]" : "px-5 py-5 rounded-3xl border-0 text-left transition-all hover:translate-y-[-1px]"}
              style={{
                background: isActive ? `rgba(var(--codedock-primary-rgb), 0.12)` : 'rgba(11, 22, 40, 0.82)',
                border: isActive ? `1px solid rgba(var(--codedock-primary-rgb), 0.34)` : '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                boxShadow: embedded ? '0 12px 30px rgba(0, 0, 0, 0.26)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
                backdropFilter: 'blur(16px)',
                cursor: 'pointer'
              }}
            >
              <FileText size={20} style={{ color: 'var(--muted)', marginBottom: '8px' }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 900
              }}>
                {language === "en" ? "General" : "일반 문서"}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: '32px',
                fontWeight: 950,
                color: 'var(--muted)'
              }}>
                {noneCount}
              </p>
            </button>
          );
        })()}
      </div>

      <div className={embedded ? "grid min-h-0 flex-1 gap-5 xl:grid-cols-[330px_1fr]" : "grid lg:grid-cols-[360px_1fr] gap-6"}>
        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "flex max-h-[calc(100vh-170px)] min-h-[620px] flex-col overflow-hidden px-6 py-6 rounded-[30px]"} style={{
          background: 'rgba(11, 22, 40, 0.82)',
          border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
          boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(16px)'
        }}>
          <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-2">
            <h2 className="m-0 flex shrink-0 items-center gap-2 whitespace-nowrap leading-none tracking-[-0.075em]" style={{ fontSize: '20px', fontWeight: 950 }}>
              {language === "en" ? "Documents" : "문서 목록"}
              <span
                className="shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 font-black tracking-tight"
                style={{
                  fontSize: '13px',
                  background: selectedCategory !== null
                    ? `color-mix(in srgb, ${getCategoryColor(selectedCategory)} 15%, transparent)`
                    : "rgba(234, 247, 255, 0.08)",
                  color: selectedCategory !== null ? getCategoryColor(selectedCategory) : "var(--muted)",
                }}
              >
                {selectedCategory !== null ? `${filteredDocs.length} / ${docs.length}` : docs.length}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAiSelectedType(null); setIsAiTypeModalOpen(true); }}
                disabled={isAiGenerating}
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border-0 px-3 py-2 tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.20), rgba(var(--codedock-secondary-rgb), 0.12))',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.28)',
                  color: 'var(--neon-cyan)',
                  cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                  opacity: isAiGenerating ? 0.6 : 1,
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 950
                }}
              >
                <Sparkles size={13} strokeWidth={2.6} />
                {language === "en" ? "AI" : "AI 생성"}
              </button>
              <button
                type="button"
                onClick={handleStartWriting}
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border-0 px-3 py-2 tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                  color: '#021014',
                  cursor: 'pointer',
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 950
                }}
              >
                <Plus size={13} strokeWidth={3} />
                {language === "en" ? "New" : "작성"}
              </button>
            </div>
          </div>

          <div className="codedock-scrollbar-hidden grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
            {filteredDocs.map((doc) => {
              const Icon = getCategoryIcon(doc.category);
              const color = getCategoryColor(doc.category);
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setIsWriting(false);
                    setEditingDocId(null);
                    setEditTitle("");
                    setEditContent("");
                    setSelectedDoc(doc.id);
                  }}
                  className="w-full px-3 py-3 rounded-xl border-0 text-left transition-all hover:translate-y-[-1px]"
                  style={{
                    background: selectedDoc === doc.id ? 'rgba(var(--codedock-primary-rgb), 0.15)' : 'rgba(5, 11, 20, 0.42)',
                    border: selectedDoc === doc.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.3)' : '1px solid rgba(var(--codedock-primary-rgb), 0.10)',
                    cursor: 'pointer'
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Icon size={16} style={{ color }} />
                      {doc.generatedBy === 'AI' && (
                        <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
                      )}
                    </span>
                    <span className="rounded-full px-2 py-0.5 tracking-tight" style={{
                      background: doc.generatedBy === 'AI' ? 'rgba(var(--codedock-primary-rgb), 0.11)' : 'rgba(var(--codedock-secondary-rgb), 0.10)',
                      color: doc.generatedBy === 'AI' ? 'var(--neon-cyan)' : 'var(--soft-mint)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {doc.generatedBy === 'AI' ? 'AI' : (language === "en" ? "Manual" : "직접 작성")}
                    </span>
                  </div>
                  <p className="m-0 mb-2 leading-[1.3] tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: 'var(--white)'
                  }}>
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="tracking-tight" style={{
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {getMemberName(doc.createdByMemberId)}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>•</span>
                    <span className="tracking-tight" style={{
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {doc.createdAt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {isWriting && (
          <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "px-8 py-8 rounded-[30px]"} style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="mb-5 flex-shrink-0">
              <h2 className="m-0 mb-1 leading-[1.2] tracking-[-0.065em]" style={{
                color: 'var(--white)',
                fontSize: embedded ? '24px' : '30px',
                fontWeight: 950
              }}>
                {language === "en" ? "New Document" : "새 문서 작성"}
              </h2>
              <p className="m-0 mt-2 tracking-tight" style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}>
                {language === "en" ? "Write directly and save to document list." : "직접 내용을 작성하고 문서 목록에 저장합니다."}
              </p>
            </div>

            <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : ""}>
              <div className="mx-auto w-full max-w-[980px]">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <span className="tracking-tight" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {language === "en" ? "Category" : "카테고리"}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((cat) => {
                        const CatIcon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setDraftCategory(draftCategory === cat.id ? null : cat.id)}
                            className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight transition-all"
                            style={{
                              background: draftCategory === cat.id ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'rgba(5, 11, 20, 0.62)',
                              border: draftCategory === cat.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.34)' : '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                              color: draftCategory === cat.id ? cat.color : 'var(--muted)',
                              cursor: 'pointer',
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}
                          >
                            <CatIcon size={13} />
                            {language === "en" ? cat.nameEn : cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="tracking-tight" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {language === "en" ? "Title" : "제목"}
                    </span>
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder={language === "en" ? "Enter document title" : "문서 제목을 입력하세요"}
                      className="rounded-2xl border-0 px-4 py-3 outline-none tracking-tight"
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '15px',
                        fontWeight: 850
                      }}
                    />
                  </label>

                  <label className="grid min-h-0 gap-2">
                    <span className="tracking-tight" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {language === "en" ? "Body" : "본문"}
                      <span className="ml-1" style={{ color: 'var(--muted)', fontWeight: 700 }}>{language === "en" ? "(Markdown supported)" : "(마크다운 지원)"}</span>
                    </span>
                    <textarea
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder={language === "en" ? "Write content in Markdown..." : "마크다운으로 내용을 작성하세요..."}
                      className={`codedock-scrollbar-hidden min-h-[360px] resize-none rounded-2xl border-0 px-5 py-5 font-mono outline-none ${embedded ? "h-[min(48vh,520px)]" : "h-[500px]"}`}
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '13px',
                        fontWeight: 750,
                        lineHeight: 1.7
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDraft}
                className="rounded-xl border-0 px-4 py-3 tracking-tight"
                style={{
                  background: 'rgba(234, 247, 255, 0.06)',
                  border: '1px solid rgba(234, 247, 255, 0.12)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 950
                }}
              >
                {language === "en" ? "Cancel" : "취소"}
              </button>
              <button
                type="button"
                onClick={() => void handleRegisterDraft()}
                disabled={!draftTitle.trim()}
                className="inline-flex items-center gap-2 rounded-xl border-0 px-5 py-3 tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                  color: '#021014',
                  cursor: draftTitle.trim() ? 'pointer' : 'not-allowed',
                  opacity: draftTitle.trim() ? 1 : 0.48,
                  fontSize: '13px',
                  fontWeight: 950
                }}
              >
                <Plus size={16} strokeWidth={3} />
                {language === "en" ? "Save" : "저장"}
              </button>
            </div>
          </section>
        )}

        {!isWriting && selectedDocData && (
          <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "flex min-h-0 flex-col px-8 py-8 rounded-[30px]"} style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="flex flex-shrink-0 items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {selectedDocData.generatedBy === 'AI' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                      background: 'rgba(var(--codedock-primary-rgb), 0.15)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.3)'
                    }}>
                      <Sparkles size={16} style={{ color: 'var(--neon-cyan)' }} />
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900,
                        color: 'var(--neon-cyan)'
                      }}>
                        AI 자동생성
                      </span>
                    </div>
                  )}
                  {selectedDocData.generatedBy === 'Manual' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                      background: 'rgba(var(--codedock-secondary-rgb), 0.12)',
                      border: '1px solid rgba(var(--codedock-secondary-rgb), 0.24)'
                    }}>
                      <Plus size={15} style={{ color: 'var(--soft-mint)' }} />
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900,
                        color: 'var(--soft-mint)'
                      }}>
                        {language === "en" ? "Manual" : "직접 작성"}
                      </span>
                    </div>
                  )}
                  {(() => {
                    const cat = categories.find(c => c.id === selectedDocData.category);
                    if (cat) {
                      const CatIcon = cat.icon;
                      return (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                          background: 'rgba(234, 247, 255, 0.06)',
                          border: '1px solid rgba(234, 247, 255, 0.12)'
                        }}>
                          <CatIcon size={13} style={{ color: cat.color }} />
                          <span className="tracking-tight" style={{
                            fontSize: "var(--krds-body-xsmall)",
                            fontWeight: 900,
                            color: cat.color
                          }}>
                            {language === "en" ? cat.nameEn : cat.name}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                        background: 'rgba(234, 247, 255, 0.06)',
                        border: '1px solid rgba(234, 247, 255, 0.12)'
                      }}>
                        <FileText size={13} style={{ color: 'var(--muted)' }} />
                        <span className="tracking-tight" style={{
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 900,
                          color: 'var(--muted)'
                        }}>
                          {language === "en" ? "General" : "일반 문서"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <h2 className="m-0 mb-3 leading-[1.2] tracking-[-0.065em]" style={{
                  fontSize: '28px',
                  fontWeight: 950,
                  color: 'var(--white)'
                }}>
                  {selectedDocData.title}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--muted)'
                  }}>
                    {language === "en" ? "Author" : "작성"}: {getMemberName(selectedDocData.createdByMemberId)}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>•</span>
                  <span className="tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--muted)'
                  }}>
                    {selectedDocData.createdAt}
                  </span>
                  {selectedDocData.updatedAt !== selectedDocData.createdAt && (
                    <>
                      <span style={{ color: 'var(--muted)' }}>•</span>
                      <span className="tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                        {language === "en" ? "Updated" : "수정"}: {selectedDocData.updatedAt}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="ml-4 flex flex-shrink-0 flex-wrap justify-end gap-2">
                  {editingDocId === selectedDocData.id ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEditDocument}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(234, 247, 255, 0.06)',
                          border: '1px solid rgba(234, 247, 255, 0.12)',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <X size={15} strokeWidth={2.7} />
                        {language === "en" ? "Cancel" : "취소"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditDocument}
                        disabled={!editTitle.trim() || !editContent.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                          color: '#021014',
                          cursor: editTitle.trim() && editContent.trim() ? 'pointer' : 'not-allowed',
                          opacity: editTitle.trim() && editContent.trim() ? 1 : 0.48,
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Check size={15} strokeWidth={3} />
                        {language === "en" ? "Save" : "저장"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEditDocument(selectedDocData)}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(var(--codedock-primary-rgb), 0.10)',
                          border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                          color: 'var(--neon-cyan)',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Pencil size={15} strokeWidth={2.5} />
                        {language === "en" ? "Edit" : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(selectedDocData.id)}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(255, 107, 107, 0.10)',
                          border: '1px solid rgba(255, 107, 107, 0.22)',
                          color: '#FF9C9C',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Trash2 size={15} strokeWidth={2.5} />
                        {language === "en" ? "Delete" : "삭제"}
                      </button>
                    </>
                  )}
                </div>
            </div>

            {editingDocId === selectedDocData.id ? (
              <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1"}>
                <div className="mx-auto grid w-full max-w-[980px] gap-4">
                  <div className="grid gap-2">
                    <span className="tracking-tight" style={{ color: 'var(--muted)', fontSize: "var(--krds-body-xsmall)", fontWeight: 950 }}>
                      {language === "en" ? "Category" : "카테고리"}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((cat) => {
                        const CatIcon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setEditCategory(editCategory === cat.id ? null : cat.id)}
                            className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight transition-all"
                            style={{
                              background: editCategory === cat.id ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'rgba(5, 11, 20, 0.62)',
                              border: editCategory === cat.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.34)' : '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                              color: editCategory === cat.id ? cat.color : 'var(--muted)',
                              cursor: 'pointer',
                              fontSize: "var(--krds-body-xsmall)",
                              fontWeight: 950
                            }}
                          >
                            <CatIcon size={13} />
                            {language === "en" ? cat.nameEn : cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="grid gap-2">
                    <span className="tracking-tight" style={{
                      color: 'var(--muted)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {language === "en" ? "Title" : "제목"}
                    </span>
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="rounded-2xl border-0 px-4 py-3 outline-none tracking-tight"
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '15px',
                        fontWeight: 850
                      }}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="tracking-tight" style={{
                      color: 'var(--muted)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {language === "en" ? "Body" : "본문"}
                    </span>
                    <textarea
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className={`codedock-scrollbar-hidden min-h-[360px] resize-none rounded-2xl border-0 px-5 py-5 font-mono outline-none ${embedded ? "h-[min(48vh,520px)]" : "h-[500px]"}`}
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '13px',
                        fontWeight: 750,
                        lineHeight: 1.7
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-2"}>
                {embedded ? (
                  <div className="min-h-full rounded-3xl px-5 py-5" style={{
                    background: 'rgba(5, 11, 20, 0.46)',
                    border: '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                    boxShadow: 'inset 0 1px 0 rgba(234, 247, 255, 0.06)'
                  }}>
                    {renderDocumentPreview(selectedDocContent)}
                  </div>
                ) : (
                  renderDocumentPreview(selectedDocContent)
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {isAiTypeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsAiTypeModalOpen(false)}
        >
          <div
            className="rounded-3xl p-6 grid gap-5 w-full"
            style={{
              maxWidth: '400px',
              background: 'rgba(8, 16, 30, 0.98)',
              border: '1px solid rgba(var(--codedock-primary-rgb), 0.24)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid gap-1">
              <h3 className="m-0 tracking-tight" style={{ color: 'var(--white)', fontSize: '18px', fontWeight: 950 }}>
                {language === 'en' ? 'Select Document Type' : '문서 타입 선택'}
              </h3>
              <p className="m-0 tracking-tight" style={{ color: 'var(--muted)', fontSize: 'var(--krds-body-xsmall)', fontWeight: 800 }}>
                {language === 'en' ? 'AI will generate based on the selected type.' : 'AI가 선택한 타입을 기반으로 문서를 생성합니다.'}
              </p>
            </div>
            <div className="grid gap-2">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = aiSelectedType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAiSelectedType(cat.id)}
                    className="flex items-center gap-3 rounded-2xl border-0 px-4 py-3 text-left transition-all"
                    style={{
                      background: isSelected ? `color-mix(in srgb, ${cat.color} 12%, rgba(5,11,20,0.8))` : 'rgba(5,11,20,0.6)',
                      border: isSelected ? `1px solid color-mix(in srgb, ${cat.color} 40%, transparent)` : '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
                      cursor: 'pointer',
                    }}
                  >
                    <CatIcon size={16} style={{ color: cat.color, flexShrink: 0 }} />
                    <span className="tracking-tight" style={{ color: isSelected ? cat.color : 'var(--white)', fontSize: 'var(--krds-body-xsmall)', fontWeight: 950 }}>
                      {language === 'en' ? cat.nameEn : cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAiTypeModalOpen(false)}
                className="rounded-xl border-0 px-4 py-2 tracking-tight"
                style={{ background: 'rgba(234,247,255,0.06)', color: 'var(--muted)', cursor: 'pointer', fontSize: 'var(--krds-body-xsmall)', fontWeight: 950 }}
              >
                {language === 'en' ? 'Cancel' : '취소'}
              </button>
              <button
                type="button"
                onClick={() => { if (aiSelectedType) void handleGenerateAiDocument(aiSelectedType); }}
                disabled={!aiSelectedType}
                className="inline-flex items-center gap-1.5 rounded-xl border-0 px-4 py-2 tracking-tight"
                style={{
                  background: aiSelectedType ? 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.30), rgba(var(--codedock-secondary-rgb), 0.18))' : 'rgba(234,247,255,0.04)',
                  border: aiSelectedType ? '1px solid rgba(var(--codedock-primary-rgb), 0.36)' : '1px solid rgba(234,247,255,0.08)',
                  color: aiSelectedType ? 'var(--neon-cyan)' : 'var(--muted)',
                  cursor: aiSelectedType ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--krds-body-xsmall)',
                  fontWeight: 950,
                }}
              >
                <Sparkles size={13} strokeWidth={2.6} />
                {language === 'en' ? 'Generate' : 'AI 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
