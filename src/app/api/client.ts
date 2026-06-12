import type { ApiErrorResponse, ApiResponse } from "./types";
import { authHeader, refreshAccessToken, clearTokens, getAccessToken } from "../auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiRequestOptions = {
  headers?: HeadersInit;
  query?: Record<string, boolean | number | string | null | undefined>;
  signal?: AbortSignal;
};

export type ApiClientOptions = {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  fetcher?: typeof fetch;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly response?: ApiErrorResponse;

  constructor(message: string, status: number, response?: ApiErrorResponse) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = response?.code;
    this.response = response;
  }
}

function getDefaultBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

function buildUrl(baseUrl: string, path: string, query?: ApiRequestOptions["query"]) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function mergeHeaders(...headersList: Array<HeadersInit | undefined>) {
  const headers = new Headers();

  headersList.forEach((headersInit) => {
    if (!headersInit) return;
    new Headers(headersInit).forEach((value, key) => {
      headers.set(key, value);
    });
  });

  return headers;
}

function getResponseMessage(status: number, fallback?: string) {
  return fallback || `API request failed with status ${status}`;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResponse<T> | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      message: "Invalid JSON response"
    };
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? getDefaultBaseUrl();
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(
      method: HttpMethod,
      path: string,
      body?: unknown,
      requestOptions: ApiRequestOptions = {},
      isRetry = false
  ): Promise<T> {
    const headers = mergeHeaders(
        { Accept: "application/json" },
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
        authHeader(),
        options.defaultHeaders,
        requestOptions.headers
    );

    const response = await fetcher(buildUrl(baseUrl, path, requestOptions.query), {
      method,
      headers,
      signal: requestOptions.signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (response.status === 401 && !isRetry && getAccessToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(method, path, body, requestOptions, true);
      }
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const payload = await parseJsonResponse<T>(response);

    if (!response.ok || payload?.success === false) {
      const errorPayload = payload as ApiErrorResponse | null;
      throw new ApiClientError(
          getResponseMessage(response.status, errorPayload?.message),
          response.status,
          errorPayload ?? undefined
      );
    }

    return payload?.data as T;
  }

  return {
    get<T>(path: string, options?: ApiRequestOptions) {
      return request<T>("GET", path, undefined, options);
    },
    post<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
      return request<T>("POST", path, body, options);
    },
    patch<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
      return request<T>("PATCH", path, body, options);
    },
    put<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
      return request<T>("PUT", path, body, options);
    },
    delete<T>(path: string, options?: ApiRequestOptions) {
      return request<T>("DELETE", path, undefined, options);
    }
  };
}

export const apiClient = createApiClient();

