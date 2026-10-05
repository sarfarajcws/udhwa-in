/**
 * Guard for destructive or test-only scripts (seed --reset, test sessions).
 * They only ever run against a local development database: never with
 * NODE_ENV=production, and never against a remote host (e.g. Neon) unless
 * ALLOW_REMOTE_DB_SCRIPTS=true is set explicitly for a disposable database.
 */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]", "postgres", "db"];

/** Hosts of every configured connection string (DATABASE_URL and DIRECT_URL). */
function dbHosts() {
  return [process.env.DATABASE_URL, process.env.DIRECT_URL].filter(Boolean).map((u) => {
    try {
      return new URL(u!).hostname;
    } catch {
      return "";
    }
  });
}

/** True only when every configured connection points at a local database. */
export function isLocalDatabase() {
  const hosts = dbHosts();
  return hosts.length > 0 && hosts.every((h) => LOCAL_HOSTS.includes(h));
}

export function assertLocalDatabase(action: string) {
  const hosts = dbHosts();
  if (!hosts.length || hosts.some((h) => !h)) throw new Error(`${action}: DATABASE_URL / DIRECT_URL is missing or not a valid URL.`);
  const host = hosts.find((h) => !LOCAL_HOSTS.includes(h)) ?? hosts[0];
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${action} is disabled when NODE_ENV=production.`);
  }
  if (!isLocalDatabase() && process.env.ALLOW_REMOTE_DB_SCRIPTS !== "true") {
    throw new Error(`${action} refused: database host "${host}" is not local. Set ALLOW_REMOTE_DB_SCRIPTS=true only for a disposable database.`);
  }
}
