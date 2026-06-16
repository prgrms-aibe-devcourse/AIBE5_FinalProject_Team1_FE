import { ExternalLink, FileText, Image as ImageIcon, Link2, LockKeyhole, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { getLinkPreviewInfo, getMessageAttachmentTypeLabel, type MessageAttachment } from "./messageAttachments";

interface MessageAttachmentCardProps {
  attachment: MessageAttachment;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onDelete?: (attachment: MessageAttachment) => void;
  deleteDisabled?: boolean;
}

function getAttachmentIcon(type: MessageAttachment["type"]) {
  if (type === "image") return ImageIcon;
  if (type === "link") return Link2;
  return FileText;
}

export function MessageAttachmentCard({ attachment, onClick, onDelete, deleteDisabled = false }: MessageAttachmentCardProps) {
  const Icon = getAttachmentIcon(attachment.type);
  const canOpen = Boolean(attachment.url);
  const imagePreviewUrl = attachment.previewUrl ?? attachment.url;
  const linkPreview = attachment.type === "link" && attachment.url
    ? getLinkPreviewInfo(attachment.url, attachment.title)
    : null;
  const linkInitial = linkPreview?.host.replace(/^www\./, "").slice(0, 1).toUpperCase() ?? "L";

  return (
    <div
      className="overflow-hidden rounded-lg"
      onClick={onClick}
      style={{
        background: "rgba(var(--codedock-primary-rgb), 0.08)",
        border: "1px solid rgba(var(--codedock-primary-rgb), 0.18)"
      }}
    >
      {attachment.type === "image" && imagePreviewUrl && (
        <div
          className="overflow-hidden"
          style={{
            background: "rgba(5, 11, 20, 0.62)",
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
          }}
        >
          <img
            src={imagePreviewUrl}
            alt={attachment.title}
            className="block max-h-56 w-full object-cover"
          />
        </div>
      )}

      {linkPreview && (
        <div
          className="grid gap-3 px-4 py-4 sm:grid-cols-[76px_1fr]"
          style={{
            background: `
              radial-gradient(circle at 15% 18%, rgba(var(--codedock-primary-rgb), 0.24), transparent 34%),
              linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.12), rgba(var(--codedock-secondary-rgb), 0.07)),
              rgba(5, 11, 20, 0.54)
            `,
            borderBottom: "1px solid rgba(var(--codedock-primary-rgb), 0.14)"
          }}
        >
          <div
            className="grid h-[70px] w-[76px] place-items-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.22), rgba(var(--codedock-secondary-rgb), 0.18))",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.26)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.13)"
            }}
          >
            <span style={{
              color: "var(--neon-cyan)",
              fontSize: 30,
              fontWeight: 950,
              lineHeight: 1
            }}>
              {linkInitial}
            </span>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 tracking-tight" style={{
                background: "rgba(5, 11, 20, 0.48)",
                border: "1px solid rgba(var(--codedock-primary-rgb), 0.16)",
                color: linkPreview.isSecure ? "var(--matrix-green)" : "var(--muted)",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 950
              }}>
                <LockKeyhole size={11} />
                {linkPreview.isSecure ? "HTTPS" : "LINK"}
              </span>
              <span className="truncate tracking-tight" style={{
                color: "var(--muted)",
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 850
              }}>
                {linkPreview.host}
              </span>
            </div>
            <p className="m-0 truncate tracking-tight" style={{
              color: "var(--white)",
              fontSize: 15,
              fontWeight: 950
            }}>
              {linkPreview.title}
            </p>
            <p className="m-0 mt-1 truncate font-mono" style={{
              color: "rgba(234, 247, 255, 0.62)",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 750
            }}>
              {linkPreview.displayUrl}
            </p>
          </div>
        </div>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 tracking-tight" style={{
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 950,
            color: "var(--neon-cyan)"
          }}>
            <Icon size={12} />
            {getMessageAttachmentTypeLabel(attachment.type)}
          </span>
          <span className="tracking-tight" style={{
            fontSize: "var(--krds-body-xsmall)",
            fontWeight: 800,
            color: "var(--muted)"
          }}>
            {attachment.meta}
          </span>
        </div>

        <p className="m-0 mt-1 break-words tracking-tight" style={{
          fontSize: "13px",
          fontWeight: 900,
          color: "var(--white)"
        }}>
          {attachment.title}
        </p>
        <p className="m-0 mt-1 break-words tracking-tight" style={{
          fontSize: "var(--krds-body-xsmall)",
          fontWeight: 700,
          color: "var(--muted)",
          lineHeight: 1.45
        }}>
          {attachment.detail}
        </p>

        {canOpen && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            download={attachment.type === "file" || attachment.type === "image" ? attachment.title : undefined}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 no-underline tracking-tight"
            style={{
              background: "rgba(5, 11, 20, 0.46)",
              border: "1px solid rgba(var(--codedock-primary-rgb), 0.14)",
              color: "var(--neon-cyan)",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 900
            }}
            onClick={(event) => event.stopPropagation()}
          >
            열기
            <ExternalLink size={12} />
          </a>
        )}

        {onDelete && (
          <button
            type="button"
            disabled={deleteDisabled}
            aria-label={`${attachment.title} 첨부파일 삭제`}
            title="첨부파일 삭제"
            className="mt-2 ml-2 inline-flex items-center gap-1.5 rounded-md border-0 px-2 py-1 tracking-tight"
            style={{
              background: "rgba(255, 107, 107, 0.10)",
              border: "1px solid rgba(255, 107, 107, 0.24)",
              color: "#FF6B6B",
              cursor: deleteDisabled ? "not-allowed" : "pointer",
              fontSize: "var(--krds-body-xsmall)",
              fontWeight: 900,
              opacity: deleteDisabled ? 0.55 : 1
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (!deleteDisabled) {
                onDelete(attachment);
              }
            }}
          >
            {deleteDisabled ? "삭제 중" : "삭제"}
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
