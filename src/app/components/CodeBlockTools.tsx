import { Check, ChevronDown, Copy } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export const CODE_BLOCK_LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
] as const;

export type CodeBlockLanguage = (typeof CODE_BLOCK_LANGUAGES)[number]["value"];

const LANGUAGE_ALIASES: Record<string, CodeBlockLanguage> = {
  text: "plaintext",
  plain: "plaintext",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  kt: "kotlin",
  "c++": "cpp",
  sh: "bash",
  shell: "bash",
};

const KEYWORDS: Record<CodeBlockLanguage, string[]> = {
  plaintext: [],
  javascript: [
    "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "else",
    "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "let",
    "new", "return", "switch", "throw", "try", "typeof", "var", "while", "yield", "true",
    "false", "null", "undefined"
  ],
  typescript: [
    "abstract", "any", "as", "async", "await", "boolean", "break", "case", "catch", "class",
    "const", "continue", "default", "else", "enum", "export", "extends", "false", "finally",
    "for", "from", "function", "if", "implements", "import", "in", "interface", "let", "new",
    "null", "number", "private", "protected", "public", "readonly", "return", "string", "switch",
    "throw", "true", "try", "type", "typeof", "undefined", "var", "void", "while"
  ],
  java: [
    "abstract", "boolean", "break", "case", "catch", "class", "continue", "default", "do",
    "double", "else", "enum", "extends", "false", "final", "finally", "float", "for", "if",
    "implements", "import", "int", "interface", "long", "new", "null", "package", "private",
    "protected", "public", "return", "static", "String", "switch", "this", "throw", "throws",
    "true", "try", "void", "while"
  ],
  c: [
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else",
    "enum", "extern", "float", "for", "goto", "if", "include", "int", "long", "return", "short",
    "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "while"
  ],
  cpp: [
    "auto", "bool", "break", "case", "catch", "class", "const", "constexpr", "continue",
    "default", "delete", "do", "double", "else", "enum", "false", "float", "for", "if", "include",
    "int", "long", "namespace", "new", "nullptr", "private", "protected", "public", "return",
    "std", "struct", "switch", "template", "this", "throw", "true", "try", "typedef", "using",
    "virtual", "void", "while"
  ],
  python: [
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif",
    "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while",
    "with", "yield"
  ],
  kotlin: [
    "as", "break", "class", "companion", "continue", "data", "do", "else", "false", "for", "fun",
    "if", "import", "in", "interface", "is", "null", "object", "override", "package", "private",
    "protected", "public", "return", "sealed", "super", "this", "throw", "true", "try", "typealias",
    "val", "var", "when", "while"
  ],
  sql: [
    "alter", "and", "as", "asc", "between", "by", "case", "create", "delete", "desc", "distinct",
    "drop", "else", "end", "from", "group", "having", "in", "inner", "insert", "into", "is",
    "join", "left", "like", "limit", "not", "null", "on", "or", "order", "outer", "right",
    "select", "set", "table", "then", "union", "update", "values", "when", "where"
  ],
  json: ["true", "false", "null"],
  bash: [
    "case", "cd", "do", "done", "echo", "elif", "else", "esac", "export", "fi", "for", "function",
    "if", "in", "local", "read", "then", "while"
  ],
};

const TOKEN_COLORS = {
  comment: "#78909C",
  string: "#B7FFE3",
  keyword: "var(--neon-cyan)",
  number: "#FFD166",
  punctuation: "#A78BFA",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCodeLanguage(language?: string): CodeBlockLanguage {
  const raw = String(language ?? "plaintext").trim().toLowerCase();
  const normalized = LANGUAGE_ALIASES[raw] ?? raw;
  return CODE_BLOCK_LANGUAGES.some((item) => item.value === normalized)
    ? normalized as CodeBlockLanguage
    : "plaintext";
}

export function getCodeLanguageLabel(language?: string) {
  const normalized = normalizeCodeLanguage(language);
  return CODE_BLOCK_LANGUAGES.find((item) => item.value === normalized)?.label ?? "Plain Text";
}

export function createFencedCodeBlock(code: string, language: string) {
  const normalized = normalizeCodeLanguage(language);
  const fenceLanguage = normalized === "plaintext" ? "" : normalized;
  return `\`\`\`${fenceLanguage}\n${code.trimEnd()}\n\`\`\``;
}

function getCodeTokenRegex(language: CodeBlockLanguage) {
  const keywords = KEYWORDS[language].map(escapeRegExp).join("|");
  const commentPattern = language === "python" || language === "bash"
    ? "#.*$"
    : language === "sql"
      ? "--.*$|/\\*[\\s\\S]*?\\*/"
      : "//.*$|/\\*[\\s\\S]*?\\*/|#include\\b.*$";
  const keywordPattern = keywords ? `\\b(?:${keywords})\\b` : "(?!)";
  return new RegExp(
    `${commentPattern}|` +
    "`(?:\\\\.|[^`])*`|'(?:\\\\.|[^'])*'|\"(?:\\\\.|[^\"])*\"|" +
    `${keywordPattern}|` +
    "\\b\\d+(?:\\.\\d+)?\\b|" +
    "[{}()[\\];,.]",
    "gm"
  );
}

function getTokenStyle(token: string, language: CodeBlockLanguage) {
  if (/^(?:\/\/|\/\*|#|--)/.test(token)) return { color: TOKEN_COLORS.comment, fontStyle: "italic" };
  if (/^(?:`|'|")/.test(token)) return { color: TOKEN_COLORS.string };
  if (/^\d/.test(token)) return { color: TOKEN_COLORS.number };
  if (/^[{}()[\];,.]$/.test(token)) return { color: TOKEN_COLORS.punctuation };
  if (KEYWORDS[language].some((keyword) => keyword.toLowerCase() === token.toLowerCase())) {
    return { color: TOKEN_COLORS.keyword, fontWeight: 900 };
  }
  return undefined;
}

function highlightCode(code: string, language?: string) {
  const normalized = normalizeCodeLanguage(language);
  if (normalized === "plaintext") return code;

  const regex = getCodeTokenRegex(normalized);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }
    nodes.push(
      <span key={`${match.index}-${match[0]}`} style={getTokenStyle(match[0], normalized)}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : code;
}

type ParsedCodeBlock = { type: "text" | "code"; content: string; language?: string };

function parseCodeBlocks(text: string) {
  const blocks: ParsedCodeBlock[] = [];
  const codeFencePattern = /```([a-zA-Z0-9_+#.-]+)?[^\S\r\n]*(?:\r?\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeFencePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    blocks.push({
      type: "code",
      language: normalizeCodeLanguage(match[1]),
      content: match[2].replace(/^\r?\n/, "").trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    blocks.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (blocks.length === 0) blocks.push({ type: "text", content: text });
  return blocks;
}

function CodeBlockPreview({ block, index }: { block: ParsedCodeBlock; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div key={`code-${index}`} className="mb-3 overflow-hidden rounded-xl" style={{
      background: "rgba(5, 11, 20, 0.88)",
      border: "1px solid rgba(var(--codedock-primary-rgb), 0.20)"
    }}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{
        background: "rgba(var(--codedock-primary-rgb), 0.08)",
        borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
      }}>
        <span className="font-mono tracking-tight" style={{
          color: "var(--neon-cyan)",
          fontSize: "11px",
          fontWeight: 950
        }}>
          {getCodeLanguageLabel(block.language)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border-0 px-2.5 tracking-tight transition-all"
          style={{
            background: copied ? "rgba(57, 255, 136, 0.14)" : "rgba(5, 11, 20, 0.68)",
            border: copied ? "1px solid rgba(57, 255, 136, 0.28)" : "1px solid rgba(var(--codedock-primary-rgb), 0.20)",
            color: copied ? "var(--matrix-green)" : "var(--neon-cyan)",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 950
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre
        className="m-0 overflow-x-auto px-3 py-3 tracking-tight"
        style={{
          color: "var(--soft-mint)",
          fontSize: "13px",
          fontWeight: 750,
          lineHeight: 1.62,
          whiteSpace: "pre"
        }}
      >
        <code>{highlightCode(block.content, block.language)}</code>
      </pre>
    </div>
  );
}

export function MessageTextWithCodeBlocks({ text, color }: { text: string; color: string }) {
  return (
    <>
      {parseCodeBlocks(text).map((block, index) => block.type === "code" ? (
        <CodeBlockPreview key={`code-${index}`} block={block} index={index} />
      ) : (
        <p
          key={`text-${index}`}
          className="m-0 mb-3 leading-[1.5] tracking-tight"
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color,
            whiteSpace: "pre-wrap"
          }}
        >
          {block.content}
        </p>
      ))}
    </>
  );
}

export function CodeBlockComposer({
  value,
  language,
  onChange,
  onLanguageChange
}: {
  value: string;
  language: CodeBlockLanguage;
  onChange: (value: string) => void;
  onLanguageChange: (value: CodeBlockLanguage) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTextChange = (nextValue: string, selectionStart: number, selectionEnd = selectionStart) => {
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]", "\"": "\"", "'": "'" };

    if (event.key === "Tab") {
      event.preventDefault();
      applyTextChange(`${before}    ${after}`, start + 4);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const lineStart = before.lastIndexOf("\n") + 1;
      const currentLine = before.slice(lineStart);
      const indent = currentLine.match(/^[\t ]*/)?.[0] ?? "";
      const lastChar = before.trimEnd().slice(-1);
      const closingChar = pairs[lastChar];
      const extraIndent = closingChar && !["\"", "'"].includes(lastChar) ? "    " : "";
      const nextNonSpace = after.trimStart().charAt(0);

      if (closingChar && nextNonSpace === closingChar && extraIndent) {
        const insertion = `\n${indent}${extraIndent}\n${indent}`;
        applyTextChange(`${before}${insertion}${after}`, start + 1 + indent.length + extraIndent.length);
        return;
      }

      const insertion = `\n${indent}${extraIndent}`;
      applyTextChange(`${before}${insertion}${after}`, start + insertion.length);
      return;
    }

    if (event.key === "Backspace" && start === end && start > 0 && pairs[value[start - 1]] === value[start]) {
      event.preventDefault();
      applyTextChange(`${value.slice(0, start - 1)}${value.slice(start + 1)}`, start - 1);
      return;
    }

    if (pairs[event.key]) {
      event.preventDefault();
      const close = pairs[event.key];
      const wrapped = selected ? `${event.key}${selected}${close}` : `${event.key}${close}`;
      applyTextChange(`${before}${wrapped}${after}`, selected ? start + wrapped.length : start + 1, selected ? start + wrapped.length : start + 1);
    }
  };

  return (
    <div className="mb-3 rounded-xl px-4 py-3" style={{
      background: "rgba(var(--codedock-primary-rgb), 0.08)",
      border: "1px solid rgba(var(--codedock-primary-rgb), 0.22)"
    }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 tracking-tight" style={{
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 900,
          color: "var(--neon-cyan)"
        }}>
          코드 블록 모드
        </p>
        <label className="flex items-center gap-2 tracking-tight" style={{
          color: "var(--muted)",
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 850
        }}>
          언어
          <span className="relative inline-flex items-center">
            <select
              value={language}
              onChange={(event) => onLanguageChange(normalizeCodeLanguage(event.target.value))}
              className="appearance-none rounded-full py-1.5 pl-3 pr-8 font-black tracking-tight outline-none"
              style={{
                background: "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.14), rgba(5, 11, 20, 0.76))",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.30)",
                color: "var(--white)",
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)"
              }}
            >
              {CODE_BLOCK_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5"
              style={{ color: "var(--neon-cyan)" }}
            />
          </span>
        </label>
      </div>
      <textarea
        ref={textareaRef}
        placeholder="코드를 입력하세요... Tab은 4칸 들여쓰기, 괄호는 자동완성됩니다."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-lg border-0 px-3 py-2 font-mono tracking-tight outline-none"
        rows={6}
        spellCheck={false}
        style={{
          background: "rgba(5, 11, 20, 0.64)",
          border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
          color: "var(--white)",
          fontSize: "13px",
          fontWeight: 700,
          lineHeight: 1.62,
          tabSize: 4,
          whiteSpace: "pre",
          overflowX: "auto"
        }}
      />
    </div>
  );
}
