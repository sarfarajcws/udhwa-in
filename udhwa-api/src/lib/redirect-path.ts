/**
 * Redirect paths are compared exactly, so the incoming path has to be put in the
 * same shape an admin would have typed it. Browsers, crawlers and Search Console
 * send percent-encoded paths, trailing slashes and different letter case; the
 * Redirects table holds the readable form.
 */

/** "/news/a.html/" → "/news/a.html"; "/" stays "/". */
export function trimTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

function safeDecode(path: string) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Exact-match candidates for an incoming path, most specific first (no duplicates). */
export function redirectCandidates(raw: string) {
  const path = raw.trim();
  const decoded = safeDecode(path);
  return [...new Set([path, decoded, trimTrailingSlash(path), trimTrailingSlash(decoded)])].filter((p) => p.startsWith("/"));
}
