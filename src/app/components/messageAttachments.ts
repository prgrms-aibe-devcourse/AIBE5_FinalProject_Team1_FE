export type MessageAttachmentType = "pr" | "erd" | "issue" | "api" | "docs" | "file" | "image" | "link";
export const MAX_MESSAGE_ATTACHMENTS = 10;

export interface MessageAttachment {
  id: string;
  type: MessageAttachmentType;
  targetId?: number;
  title: string;
  detail: string;
  meta: string;
  url?: string;
  previewUrl?: string;
  mimeType?: string;
  size?: number;
}

export interface MessageAttachmentRequest {
  attachmentType: MessageAttachmentType;
  type: MessageAttachmentType;
  targetId?: number;
  url?: string;
  title?: string;
  detail?: string;
  meta?: string;
  previewUrl?: string;
  mimeType?: string;
  fileSize?: number;
  size?: number;
}

export interface MessageAttachmentResponse {
  id: number | string;
  attachmentType?: string;
  type?: string;
  targetId?: number | null;
  url?: string | null;
  title?: string | null;
  detail?: string | null;
  meta?: string | null;
  previewUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  size?: number | null;
  createdAt?: string;
}

export interface MessageAttachmentGroup {
  type: MessageAttachmentType;
  label: string;
  description: string;
  items: MessageAttachment[];
}

export interface LinkPreviewInfo {
  normalizedUrl: string;
  title: string;
  host: string;
  path: string;
  displayUrl: string;
  isSecure: boolean;
}

export const messageAttachmentTypeLabels: Record<MessageAttachmentType, string> = {
  pr: "PR",
  erd: "ERD",
  issue: "이슈",
  api: "API",
  docs: "문서",
  file: "파일",
  image: "사진",
  link: "링크"
};

export function getMessageAttachmentTypeLabel(type: MessageAttachmentType) {
  switch (type) {
    case "pr":
      return "PR";
    case "erd":
      return "ERD";
    case "issue":
      return "Issue";
    case "api":
      return "API";
    case "docs":
      return "Docs";
    case "file":
      return "File";
    case "image":
      return "Image";
    case "link":
      return "Link";
    default:
      return type;
  }
}

export function formatAttachmentSize(size?: number) {
  if (!size) return "0 B";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isLocalObjectUrl(value?: string) {
  return Boolean(value?.startsWith("blob:"));
}

export function requiresAttachmentUrl(type: MessageAttachmentType) {
  return type === "file" || type === "image" || type === "link";
}

export function isSendableMessageAttachment(attachment: MessageAttachment) {
  return !requiresAttachmentUrl(attachment.type)
    || Boolean(attachment.url && !isLocalObjectUrl(attachment.url));
}

function normalizeAttachmentType(type?: string | null): MessageAttachmentType {
  const normalized = (type ?? "").toLowerCase();
  const validTypes: MessageAttachmentType[] = ["pr", "erd", "issue", "api", "docs", "file", "image", "link"];
  return validTypes.includes(normalized as MessageAttachmentType)
    ? normalized as MessageAttachmentType
    : "file";
}

export function toMessageAttachmentRequest(attachment: MessageAttachment): MessageAttachmentRequest {
  // Binary upload is out of scope; local object URLs are only for optimistic previews.
  return {
    attachmentType: attachment.type,
    type: attachment.type,
    targetId: attachment.targetId,
    url: isLocalObjectUrl(attachment.url) ? undefined : attachment.url,
    title: attachment.title,
    detail: attachment.detail,
    meta: attachment.meta,
    previewUrl: isLocalObjectUrl(attachment.previewUrl) ? undefined : attachment.previewUrl,
    mimeType: attachment.mimeType,
    fileSize: attachment.size,
    size: attachment.size
  };
}

export function mapMessageAttachmentResponse(response: MessageAttachmentResponse): MessageAttachment {
  const type = normalizeAttachmentType(response.type ?? response.attachmentType);
  const size = response.size ?? response.fileSize ?? undefined;
  const typeLabel = getMessageAttachmentTypeLabel(type);
  const title = response.title?.trim() || typeLabel;

  return {
    id: String(response.id),
    type,
    targetId: response.targetId ?? undefined,
    title,
    detail: response.detail?.trim() || response.url || title,
    meta: response.meta?.trim() || (size ? formatAttachmentSize(size) : typeLabel),
    url: response.url ?? undefined,
    previewUrl: response.previewUrl ?? undefined,
    mimeType: response.mimeType ?? undefined,
    size
  };
}

export function createFileMessageAttachment(file: File, type: "file" | "image"): MessageAttachment {
  const objectUrl = URL.createObjectURL(file);
  const sizeLabel = formatAttachmentSize(file.size);
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: `${type}-${uniqueId}-${file.name}-${file.size}`,
    type,
    title: file.name,
    detail: file.type || (type === "image" ? "이미지 파일" : "첨부 파일"),
    meta: sizeLabel,
    url: objectUrl,
    previewUrl: type === "image" ? objectUrl : undefined,
    mimeType: file.type,
    size: file.size
  };
}

export function getLinkPreviewInfo(rawUrl: string, rawTitle?: string): LinkPreviewInfo | null {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return null;

  const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return null;
  }

  const path = `${parsedUrl.pathname}${parsedUrl.search}`.replace(/\/$/, "") || "/";
  const title = rawTitle?.trim() || parsedUrl.hostname.replace(/^www\./, "");

  return {
    normalizedUrl,
    title,
    host: parsedUrl.hostname,
    path,
    displayUrl: `${parsedUrl.hostname}${path === "/" ? "" : path}`,
    isSecure: parsedUrl.protocol === "https:"
  };
}

export function createUrlMessageAttachment(
  rawUrl: string,
  rawTitle?: string,
  type: Extract<MessageAttachmentType, "file" | "image" | "link"> = "link"
): MessageAttachment | null {
  const preview = getLinkPreviewInfo(rawUrl, rawTitle);
  if (!preview) return null;

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fallbackTitle = preview.path === "/"
    ? preview.host.replace(/^www\./, "")
    : decodeURIComponent(preview.path.split("/").filter(Boolean).at(-1) ?? preview.host);
  const title = rawTitle?.trim() || (type === "link" ? preview.title : fallbackTitle);

  return {
    id: `${type}-${uniqueId}-${preview.normalizedUrl}`,
    type,
    title,
    detail: preview.displayUrl,
    meta: type === "link"
      ? (preview.isSecure ? "Secure link" : "Link")
      : `URL ${getMessageAttachmentTypeLabel(type)}`,
    url: preview.normalizedUrl,
    previewUrl: type === "image" ? preview.normalizedUrl : undefined
  };
}

export function createLinkMessageAttachment(rawUrl: string, rawTitle?: string): MessageAttachment | null {
  return createUrlMessageAttachment(rawUrl, rawTitle, "link");
}

function stripFencedCodeBlocks(text: string) {
  return text.replace(/```[\s\S]*?```/g, " ");
}

export function createLinkMessageAttachmentFromText(text: string): MessageAttachment | null {
  const searchableText = stripFencedCodeBlocks(text);
  const match = searchableText.match(/(?:https?:\/\/|www\.)[^\s<>()]+|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:\/[^\s<>()]*)?/);
  if (!match) return null;

  const url = match[0].replace(/[.,;:!?]+$/, "");
  return createLinkMessageAttachment(url);
}

export const messageAttachmentGroups: MessageAttachmentGroup[] = [
  {
    type: "pr",
    label: "PR",
    description: "리뷰할 변경 사항을 공유합니다.",
    items: [
      { id: "pr-142", type: "pr", title: "PR #142 JWT 인증 흐름 추가", detail: "보안 변경 포함 · 위험도 보통", meta: "리뷰 대기" },
      { id: "pr-141", type: "pr", title: "PR #141 WebSocket 메모리 누수 수정", detail: "성능 수정 · 테스트 통과", meta: "승인됨" }
    ]
  },
  {
    type: "issue",
    label: "이슈",
    description: "처리할 이슈를 대화에 연결합니다.",
    items: [
      { id: "issue-145", type: "issue", title: "Issue #145 요청 제한이 작동하지 않음", detail: "로그인 API 반복 요청 제한 확인 필요", meta: "높음" },
      { id: "issue-152", type: "issue", title: "Issue #152 문서 목록 스크롤 오류", detail: "문서 관리 화면에서 목록 일부가 잘림", meta: "보통" }
    ]
  },
  {
    type: "api",
    label: "API",
    description: "엔드포인트와 요청 형식을 공유합니다.",
    items: [
      { id: "api-user-delete", type: "api", title: "DELETE /api/users/me", detail: "회원 탈퇴 요청과 응답 형식", meta: "신규" },
      { id: "api-workspace-update", type: "api", title: "PATCH /api/workspaces/{id}", detail: "팀 이름 수정 요청과 권한 조건", meta: "수정됨" }
    ]
  },
  {
    type: "erd",
    label: "ERD",
    description: "데이터 구조와 관계도를 공유합니다.",
    items: [
      { id: "erd-auth", type: "erd", title: "사용자와 팀 권한 ERD", detail: "사용자, 팀, 초대, 권한 관계", meta: "업데이트됨" },
      { id: "erd-workspace", type: "erd", title: "워크스페이스와 저장소 관계도", detail: "워크스페이스, 저장소, PR, 이슈 연결", meta: "검토 필요" }
    ]
  },
  {
    type: "docs",
    label: "문서",
    description: "문서 초안과 결정 사항을 공유합니다.",
    items: [
      { id: "docs-auth-review", type: "docs", title: "인증 미들웨어 리뷰 문서", detail: "JWT 검증, 예외 응답, 요청 제한 정리", meta: "초안" },
      { id: "docs-api-v2", type: "docs", title: "API 명세 v2 초안", detail: "사용자, 팀, 문서, 댓글 API 반영", meta: "검토 중" }
    ]
  }
];
