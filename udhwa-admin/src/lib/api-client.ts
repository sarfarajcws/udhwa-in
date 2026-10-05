import { parseJson, type ApiErrorBody } from "@/lib/json";

/**
 * Minimal typed client for the Udhwa API. Used by the web and admin apps
 * (server and browser). Depends only on `fetch`, so a React Native app can
 * copy it as-is.
 *
 *   const api = createApiClient({ baseUrl: "https://api.udhwa.in", token: () => session.token });
 *   const home = await api.get<HomeData>("/v1/home");
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.error || `Request failed (${status})`);
  }
  get fieldErrors() {
    return this.body.fieldErrors;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
}

type HeaderMap = Record<string, string>;

export type ApiClientOptions = {
  /** e.g. http://localhost:4000 (server side) or "/api" (browser, via the app's proxy). */
  baseUrl: string;
  /** Session token, sent as a Bearer header (server-side calls, mobile apps). */
  token?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Extra headers per request (e.g. forwarded client IP). */
  headers?: () => HeaderMap | Promise<HeaderMap>;
  /** Default fetch init merged into every request (e.g. Next.js caching options). */
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };
  /** Identifies the caller; also satisfies the API's CSRF check for cookie auth. */
  client?: string;
};

export type RequestOptions = RequestInit & { next?: { revalidate?: number | false; tags?: string[] }; query?: Record<string, string | number | undefined | null> };

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, "");

  async function request<T>(method: string, path: string, body?: unknown, ro: RequestOptions = {}): Promise<T> {
    const { query, headers: extra, ...init } = ro;
    const qs = query
      ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString()
      : "";
    const headers: HeaderMap = { accept: "application/json", "x-udhwa-client": opts.client ?? "udhwa", ...(await opts.headers?.()) };
    const token = await opts.token?.();
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";

    const res = await fetch(`${base}${path}${qs ? `?${qs}` : ""}`, {
      ...opts.init,
      ...init,
      method,
      headers: { ...headers, ...(extra as HeaderMap | undefined) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? parseJson<unknown>(text) : null;
    if (!res.ok) {
      const errBody = (data && typeof data === "object" ? data : { error: text || res.statusText }) as ApiErrorBody;
      throw new ApiError(res.status, errBody);
    }
    return data as T;
  }

  return {
    get: <T>(path: string, ro?: RequestOptions) => request<T>("GET", path, undefined, ro),
    post: <T>(path: string, body?: unknown, ro?: RequestOptions) => request<T>("POST", path, body ?? {}, ro),
    put: <T>(path: string, body?: unknown, ro?: RequestOptions) => request<T>("PUT", path, body ?? {}, ro),
    patch: <T>(path: string, body?: unknown, ro?: RequestOptions) => request<T>("PATCH", path, body ?? {}, ro),
    delete: <T>(path: string, ro?: RequestOptions) => request<T>("DELETE", path, undefined, ro),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Normalises a base URL from the environment. Accepts a full URL or a bare
 * "host:port" and defaults to the
 * local API in development.
 */
export function apiBaseUrl(raw: string | undefined, fallback = "http://localhost:4000") {
  const v = (raw ?? "").trim() || fallback;
  return (/^https?:\/\//.test(v) ? v : `http://${v}`).replace(/\/$/, "");
}

/** Returns null for 404s, rethrows anything else. */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// API request/response types — a copy of udhwa-api/src/contract.ts (see README).
export type * from "./api-contract";
