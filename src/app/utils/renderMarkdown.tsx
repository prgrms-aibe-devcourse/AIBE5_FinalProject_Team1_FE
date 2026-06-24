import React from "react";

export function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i} style={{ fontWeight: 1000, color: "var(--white)" }}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
      if (part.length > 2)
        return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code
          key={i}
          style={{
            background: "rgba(var(--codedock-primary-rgb), 0.12)",
            color: "var(--neon-cyan)",
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "0.9em",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4)
      return <s key={i}>{part.slice(2, -2)}</s>;
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch)
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--neon-cyan)", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          {linkMatch[1]}
        </a>
      );
    return part;
  });
}

export function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={`code-${i}`}
          style={{
            background: "rgba(var(--codedock-primary-rgb), 0.08)",
            border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)",
            borderRadius: "12px",
            padding: "16px 20px",
            overflowX: "auto",
            margin: 0,
          }}
        >
          <code
            style={{
              color: "var(--soft-mint)",
              fontSize: "14px",
              fontWeight: 800,
              lineHeight: 1.65,
              fontFamily: "monospace",
            }}
          >
            {codeLines.join("\n")}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      nodes.push(
        <hr
          key={i}
          style={{
            border: "none",
            borderTop: "1px solid rgba(234, 247, 255, 0.12)",
            margin: "4px 0",
          }}
        />
      );
    } else if (trimmed.startsWith("> ")) {
      nodes.push(
        <div
          key={i}
          className="px-4 py-3 tracking-tight"
          style={{
            borderLeft: "3px solid rgba(var(--codedock-primary-rgb), 0.5)",
            background: "rgba(var(--codedock-primary-rgb), 0.06)",
            borderRadius: "0 8px 8px 0",
            color: "rgba(234, 247, 255, 0.65)",
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: 1.75,
          }}
        >
          {parseInline(trimmed.replace(/^>\s*/, ""))}
        </div>
      );
    } else if (trimmed.startsWith("#### ")) {
      nodes.push(
        <h4
          key={i}
          className="m-0 mt-2 leading-[1.4] tracking-tight"
          style={{ color: "rgba(234, 247, 255, 0.88)", fontSize: "20px", fontWeight: 950 }}
        >
          {parseInline(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
    } else if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={i}
          className="m-0 mt-3 leading-[1.3] tracking-[-0.025em]"
          style={{ color: "var(--neon-cyan)", fontSize: "24px", fontWeight: 950 }}
        >
          {parseInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2
          key={i}
          className="m-0 mt-4 leading-[1.2] tracking-[-0.035em]"
          style={{ color: "var(--soft-mint)", fontSize: "28px", fontWeight: 950 }}
        >
          {parseInline(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1
          key={i}
          className="m-0 leading-[1.1] tracking-[-0.055em]"
          style={{ color: "var(--white)", fontSize: "32px", fontWeight: 950 }}
        >
          {parseInline(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
    } else if (trimmed.startsWith("- [")) {
      const checked = trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]");
      const label = trimmed.replace(/^- \[[xX ]\]\s*/, "");
      nodes.push(
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl px-4 py-3 tracking-tight"
          style={{
            background: checked ? "rgba(var(--codedock-secondary-rgb), 0.08)" : "rgba(234, 247, 255, 0.045)",
            border: checked ? "1px solid rgba(var(--codedock-secondary-rgb), 0.22)" : "1px solid rgba(234, 247, 255, 0.08)",
            color: checked ? "rgba(234, 247, 255, 0.45)" : "rgba(234, 247, 255, 0.88)",
            fontSize: "16px",
            fontWeight: 800,
            lineHeight: 1.65,
          }}
        >
          <span
            className="flex-shrink-0 grid place-items-center rounded"
            style={{
              width: 18,
              height: 18,
              background: checked ? "var(--matrix-green)" : "transparent",
              border: checked ? "none" : "2px solid rgba(234, 247, 255, 0.3)",
              color: "#021014",
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            {checked ? "✓" : ""}
          </span>
          <span style={{ textDecoration: checked ? "line-through" : "none" }}>
            {parseInline(label)}
          </span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\.\s*/)?.[1] ?? "";
      nodes.push(
        <div
          key={i}
          className="flex gap-3 rounded-xl px-4 py-3 tracking-tight"
          style={{
            background: "rgba(234, 247, 255, 0.035)",
            border: "1px solid rgba(234, 247, 255, 0.07)",
            color: "rgba(234, 247, 255, 0.82)",
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: 1.65,
          }}
        >
          <span style={{ color: "var(--neon-cyan)", fontWeight: 950, flexShrink: 0 }}>{num}.</span>
          <span>{parseInline(trimmed.replace(/^\d+\.\s*/, ""))}</span>
        </div>
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      nodes.push(
        <div
          key={i}
          className="flex gap-3 rounded-xl px-4 py-3 tracking-tight"
          style={{
            background: "rgba(234, 247, 255, 0.035)",
            border: "1px solid rgba(234, 247, 255, 0.07)",
            color: "rgba(234, 247, 255, 0.82)",
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: 1.65,
          }}
        >
          <span style={{ color: "var(--neon-cyan)", fontWeight: 950 }}>•</span>
          <span>{parseInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
        </div>
      );
    } else if (!trimmed) {
      nodes.push(<div key={i} className="h-2" />);
    } else {
      nodes.push(
        <p
          key={i}
          className="m-0 tracking-tight"
          style={{
            color: "rgba(234, 247, 255, 0.82)",
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: 1.85,
          }}
        >
          {parseInline(trimmed)}
        </p>
      );
    }

    i++;
  }

  return nodes;
}
