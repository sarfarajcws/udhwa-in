import { Hono } from "hono";
import type { CategoryKind } from "@/db";
import { pageParam, stringParam } from "@/lib/utils";
import type { AppEnv } from "../lib/context";
import { notFound } from "../lib/http";
import * as q from "../services/public";
import { search, SEARCH_KINDS, type SearchKind } from "../services/search";

/** /v1 — published content. No authentication; safe to cache. */
export const publicRoutes = new Hono<AppEnv>();

const KINDS: CategoryKind[] = ["PLACE", "BUSINESS", "SERVICE", "NEWS", "BLOG", "PHOTO"];
const list = (query: Record<string, string>) => ({ category: stringParam(query.category), q: stringParam(query.q)?.slice(0, 100), page: pageParam(query.page) });
const orNotFound = <T>(v: T | null | undefined) => {
  if (!v) throw notFound();
  return v;
};

publicRoutes.get("/site", async (c) => c.json({ locality: await q.getPrimaryLocality() }));
publicRoutes.get("/home", async (c) => {
  const [data, locality] = await Promise.all([q.getHomeData(), q.getPrimaryLocality()]);
  return c.json({ ...data, locality });
});

publicRoutes.get("/categories/:kind", async (c) => {
  const kind = c.req.param("kind").toUpperCase() as CategoryKind;
  if (!KINDS.includes(kind)) throw notFound();
  return c.json(await q.getCategories(kind));
});

publicRoutes.get("/places", async (c) => c.json(await q.listPlaces(list(c.req.query()))));
publicRoutes.get("/places/:slug", async (c) => c.json(orNotFound(await q.getPlace(c.req.param("slug")))));
publicRoutes.get("/businesses", async (c) => c.json(await q.listBusinesses(list(c.req.query()))));
publicRoutes.get("/businesses/:slug", async (c) => c.json(orNotFound(await q.getBusiness(c.req.param("slug")))));
publicRoutes.get("/services", async (c) => c.json(await q.listServices(list(c.req.query()))));
publicRoutes.get("/services/:slug", async (c) => c.json(orNotFound(await q.getService(c.req.param("slug")))));
publicRoutes.get("/news", async (c) => c.json(await q.listNews(list(c.req.query()))));
publicRoutes.get("/news/:slug", async (c) => c.json(orNotFound(await q.getNews(c.req.param("slug")))));
publicRoutes.get("/blogs", async (c) => c.json(await q.listBlogs({ ...list(c.req.query()), tag: stringParam(c.req.query("tag")) })));
publicRoutes.get("/blogs/:slug", async (c) => c.json(orNotFound(await q.getBlog(c.req.param("slug")))));
publicRoutes.get("/photos", async (c) =>
  c.json(await q.listPhotos({ page: pageParam(c.req.query("page")), place: stringParam(c.req.query("place")), service: stringParam(c.req.query("service")), category: stringParam(c.req.query("category")) })),
);
publicRoutes.get("/photos/:id", async (c) => c.json(orNotFound(await q.getPhoto(c.req.param("id")))));
publicRoutes.get("/authors/:slug", async (c) => c.json(orNotFound(await q.getAuthor(c.req.param("slug")))));

publicRoutes.get("/search", async (c) => {
  const text = stringParam(c.req.query("q"))?.slice(0, 100);
  const type = stringParam(c.req.query("type"));
  const kind = SEARCH_KINDS.some((k) => k.kind === type) ? (type as SearchKind) : undefined;
  return c.json({ q: text ?? "", kind: kind ?? null, hits: text ? await search(text, kind) : [] });
});

/** Old URL → new URL (slug changes, legacy udhwa.in .html paths). */
publicRoutes.get("/redirects/resolve", async (c) => {
  const path = c.req.query("path") ?? "";
  const r = path.startsWith("/") ? await q.findRedirect(path) : null;
  return c.json({ redirect: r ? { toPath: r.toPath, permanent: r.permanent } : null });
});

publicRoutes.get("/sitemap", async (c) => c.json(await q.getSitemapData()));
