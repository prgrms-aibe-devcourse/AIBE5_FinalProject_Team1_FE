const ACCESS_TOKEN_KEY = "codedock-access-token";
const REFRESH_TOKEN_KEY = "codedock-refresh-token";
export const PROFILE_STORAGE_KEY = "codedock-profile-v1";

let refreshTokenRequest: Promise<boolean> | null = null;

function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL ?? "";
}

function buildApiUrl(path: string) {
    const baseUrl = getApiBaseUrl().replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function redirectToLogin() {
    clearTokens();
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;
    window.location.href = "/login";
}

export function isAuthenticated(): boolean {
    return !!getAccessToken();
}

// 모든 API 요청에 붙일 Authorization 헤더
export function authHeader(): HeadersInit {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// GitHub 로그인 시작 — Vite proxy → BE → GitHub으로 리다이렉트
export function loginWithGithub() {
    window.location.href = buildApiUrl("/oauth2/authorization/github");
}

// 토큰 갱신
export async function refreshAccessToken(): Promise<boolean> {
    if (refreshTokenRequest) {
        return refreshTokenRequest;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    refreshTokenRequest = (async () => {
        try {
            const res = await fetch(buildApiUrl("/api/v1/auth/refresh"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) {
                clearTokens();
                return false;
            }
            const { data } = await res.json();
            if (!data?.accessToken || !data?.refreshToken) {
                clearTokens();
                return false;
            }
            setTokens(data.accessToken, data.refreshToken);
            return true;
        } catch {
            clearTokens();
            return false;
        }
    })();

    try {
        return await refreshTokenRequest;
    } finally {
        refreshTokenRequest = null;
    }
}

export async function logout() {
    const refreshToken = getRefreshToken();
    try {
        if (refreshToken) {
            await fetch(buildApiUrl("/api/v1/auth/logout"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
        }
    } finally {
        clearTokens();
    }
}
