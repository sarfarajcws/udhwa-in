import { createHash } from "node:crypto";
import { sessionSecret } from "../env";

/**
 * Small, dependency-free abuse protection.
 * - Per-process sliding window for quick bursts.
 * - Services also apply DB-backed quotas (e.g. contributions per day), which
 *   hold across restarts and instances.
 */
const buckets = new Map<string, number[]>();

export function hitLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return true;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 10_000) buckets.clear();
  return false;
}

/** Hashed client IP (never stored raw). */
export function ipHash(ip: string) {
  return createHash("sha256").update(`${ip}:${sessionSecret}`).digest("hex").slice(0, 32);
}
