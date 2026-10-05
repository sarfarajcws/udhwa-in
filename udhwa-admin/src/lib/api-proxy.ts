/**
 * Same-origin proxy: mounts the API under a front-end's own origin
 * (e.g. https://udhwa.in/api/v1/* → API /v1/*). Browsers then talk to
 * "their" site only, so session cookies are first-party and no CORS is
 * needed — which also works when web, admin and API live on unrelated
 * domains (e.g. separate *.onrender.com services).
 *
 * Uses only the Web Fetch API, so it fits any framework's route handler.
 */
const HOP_BY_HOP = ["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length", "accept-encoding"];

export async function proxyToApi(req: Request, opts: { apiUrl: string; prefix?: string; client: string; blockPaths?: string[] }) {
  const prefix = opts.prefix ?? "/api";
  const url = new URL(req.url);
  const apiPath = url.pathname.slice(prefix.length);
  // e.g. the public site never needs the admin API: keep it unreachable from there.
  let normalised = apiPath;
  try {
    normalised = decodeURIComponent(apiPath);
  } catch {
    return Response.json({ error: "Bad request", code: "bad_request" }, { status: 400 });
  }
  normalised = normalised.replace(/\/{2,}/g, "/").toLowerCase();
  if (opts.blockPaths?.some((p) => normalised === p || normalised.startsWith(`${p}/`))) {
    return Response.json({ error: "Not found", code: "not_found" }, { status: 404 });
  }
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const origin = `${proto}://${host}`;

  // Writes must come from this site (defence in depth on top of SameSite cookies).
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const reqOrigin = req.headers.get("origin");
    if (reqOrigin && reqOrigin !== origin) {
      return Response.json({ error: "Cross-site request blocked.", code: "csrf" }, { status: 403 });
    }
  }

  const headers = new Headers(req.headers);
  for (const h of HOP_BY_HOP) headers.delete(h);
  headers.set("x-forwarded-host", host);
  headers.set("x-forwarded-proto", proto);
  headers.set("x-udhwa-prefix", prefix);
  headers.set("x-udhwa-client", opts.client);

  const target = `${opts.apiUrl.replace(/\/$/, "")}${apiPath}${url.search}`;
  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "The Udhwa API is not reachable right now.", code: "api_unreachable" }, { status: 502 });
  }

  const out = new Headers();
  res.headers.forEach((value, key) => {
    // fetch() already decoded the body; drop encoding/length and re-add cookies individually.
    if (!["content-encoding", "content-length", "set-cookie", "transfer-encoding", "connection"].includes(key)) out.set(key, value);
  });
  for (const cookie of res.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
