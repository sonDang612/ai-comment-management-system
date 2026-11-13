import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { ApiError } from "./errors";

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  query?: Query;
  /** JSON-serializable body. */
  body?: unknown;
  /** Resolve with the parsed body even for these non-2xx statuses (e.g. 503 from health). */
  acceptStatuses?: number[];
}

type MethodOptions = Omit<RequestOptions, "method" | "body">;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, env.apiUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, headers, acceptStatuses = [], ...init } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined) finalHeaders.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    const error = ApiError.network(cause);
    logger.warn("API network error", { path, message: error.message });
    throw error;
  }

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    const error = await ApiError.fromResponse(response);
    logger.warn("API request failed", {
      path,
      status: error.status,
      code: error.code,
      requestId: error.requestId,
    });
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Thin typed facade over `request`, used by feature modules. */
export const apiClient = {
  get: <T>(path: string, options?: MethodOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: MethodOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: MethodOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: MethodOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: MethodOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
