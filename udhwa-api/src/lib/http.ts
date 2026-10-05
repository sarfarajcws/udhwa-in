import type { ZodError } from "zod";
import { z } from "zod";

/** Thrown by services; turned into a JSON error response by the app's error handler. */
export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
    message: string,
    public fieldErrors?: Record<string, string[] | undefined>,
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, fieldErrors?: Record<string, string[] | undefined>) => new HttpError(422, msg, fieldErrors, "invalid");
export const notFound = (msg = "Not found") => new HttpError(404, msg, undefined, "not_found");
export const forbidden = (msg = "Not allowed") => new HttpError(403, msg, undefined, "forbidden");

export function zodError(err: ZodError, fallback = "Please check the highlighted fields.") {
  const flat = z.flattenError(err);
  return badRequest(flat.formErrors[0] ?? fallback, flat.fieldErrors as Record<string, string[] | undefined>);
}

/** Parse with zod or throw a 422 with field errors. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw zodError(r.error);
  return r.data;
}
