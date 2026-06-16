import { authHeader, refreshAccessToken, clearTokens } from "../auth";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function buildApiUrl(path: string) {
  const baseUrl = BASE.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 인증 헤더를 자동으로 추가하고, 401 응답 시 토큰을 갱신한 뒤 한 번 재시도합니다.
 * 갱신에도 실패하면 localStorage의 토큰을 제거하고 에러를 던집니다.
 */
export async function fetchWithAuth<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const doFetch = () =>
    fetch(buildApiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
        ...authHeader(), // 최신 토큰을 덮어씀
      },
    });

  let res = await doFetch();

  // 401: 토큰 갱신 후 1회 재시도
  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (ok) {
      res = await doFetch();
    } else {
      clearTokens();
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const message =
      typeof body?.message === "string"
        ? body.message
        : `요청 실패 (${res.status})`;
    throw new Error(message);
  }

  const json = await res.json() as { data?: T };
  return json.data as T;
}
