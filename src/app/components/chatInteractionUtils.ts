export type BookmarkMap = Record<number, boolean>;

export type MessageMetadata = {
  mentions?: string[];
};

export function readBookmarkMap(storageKey: string): BookmarkMap {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return {};

    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as BookmarkMap
      : {};
  } catch {
    return {};
  }
}

export function saveBookmarkMap(storageKey: string, bookmarkMap: BookmarkMap) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(bookmarkMap));
  } catch {
    // Embedded previews can block storage; bookmark state still works in memory.
  }
}

export function toggleBookmark(bookmarkMap: BookmarkMap, id: number): BookmarkMap {
  const nextMap = { ...bookmarkMap };

  if (nextMap[id]) {
    delete nextMap[id];
    return nextMap;
  }

  nextMap[id] = true;
  return nextMap;
}

export function extractMentionNames(text: string): string[] {
  const mentions = new Set<string>();
  const mentionPattern = /@([^\s@]+)/g;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(text)) !== null) {
    const mention = match[1].replace(/[.,!?;:)\]}]+$/g, "").trim();
    if (mention) {
      mentions.add(mention);
    }
  }

  return [...mentions];
}

export function appendMention(text: string, user?: string): string {
  const mention = user ? `@${user} ` : "@";
  return `${text}${text && !text.endsWith(" ") ? " " : ""}${mention}`;
}
