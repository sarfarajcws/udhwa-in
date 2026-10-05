/**
 * The API sends plain JSON (dates as ISO-8601 strings) so any client —
 * including a future mobile app — can consume it. Our TypeScript clients
 * revive those strings back into Date objects with this reviver, which is
 * what lets API response types keep `Date` fields.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function reviveDates(_key: string, value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value;
}

export function parseJson<T = unknown>(text: string): T {
  return JSON.parse(text, reviveDates) as T;
}

/** Error body returned by every API error response. */
export type ApiErrorBody = {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Shape returned by form-style mutations (server actions wrap this). */
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  id?: string;
  /** Echo of submitted values on failure (React resets forms after actions). */
  values?: Record<string, unknown>;
  /** Changes on every response so forms can remount with `values`. */
  ts?: number;
};
