import { Hono } from "hono";
import type { MessageStatus } from "@/db";
import type { EntityKey } from "@/lib/entities";
import { pageParam, stringParam } from "@/lib/utils";
import { requireAdmin, userOf, type AppEnv } from "../lib/context";
import * as content from "../services/admin/content";
import * as manage from "../services/admin/manage";
import * as moderation from "../services/admin/moderation";
import * as review from "../services/admin/review";
import { seoReport } from "../services/admin/seo";

/** /v1/admin — Team/Admin only. Every route requires an ADMIN session. */
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use(requireAdmin);

const body = async (c: { req: { json: () => Promise<unknown> } }) => ((await c.req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
const entity = (v: string) => content.entityDef(v).key as EntityKey;

// Dashboard & review queues
adminRoutes.get("/counts", async (c) => c.json(await review.adminCounts()));
adminRoutes.get("/dashboard", async (c) => c.json(await review.dashboard()));
adminRoutes.get("/seo", async (c) => c.json(await seoReport()));
adminRoutes.get("/contributions", async (c) =>
  c.json(await review.listContributions({ tab: c.req.query("tab"), type: c.req.query("type"), page: pageParam(c.req.query("page")) })),
);
adminRoutes.get("/contributions/:id", async (c) => c.json(await review.getContribution(c.req.param("id"))));
adminRoutes.post("/contributions/:id/:action", async (c) =>
  c.json(await moderation.moderateContribution(userOf(c), c.req.param("id"), c.req.param("action"), await body(c))),
);
adminRoutes.get("/corrections", async (c) => c.json(await review.listCorrections({ closed: c.req.query("view") === "closed", page: pageParam(c.req.query("page")) })));
adminRoutes.post("/corrections/:id", async (c) => c.json(await moderation.updateCorrection(userOf(c), c.req.param("id"), await body(c))));

// Content (places, businesses, services, news, blogs, photos)
adminRoutes.get("/entities/:entity", async (c) => {
  const qy = c.req.query();
  return c.json(await content.listEntities(entity(c.req.param("entity")), { q: stringParam(qy.q), status: stringParam(qy.status), missing: stringParam(qy.missing), stale: qy.stale === "1", page: pageParam(qy.page) }));
});
adminRoutes.get("/entities/:entity/new", async (c) => c.json(await content.newEntityMeta(entity(c.req.param("entity")))));
adminRoutes.post("/entities/:entity", async (c) => c.json(await content.saveEntity(userOf(c), entity(c.req.param("entity")), null, await body(c)), 201));
adminRoutes.get("/entities/:entity/:id", async (c) => c.json(await content.getEntity(entity(c.req.param("entity")), c.req.param("id"))));
adminRoutes.put("/entities/:entity/:id", async (c) => c.json(await content.saveEntity(userOf(c), entity(c.req.param("entity")), c.req.param("id"), await body(c))));
adminRoutes.post("/entities/:entity/:id/status", async (c) =>
  c.json(await content.setEntityStatus(userOf(c), entity(c.req.param("entity")), c.req.param("id"), String((await body(c)).transition ?? ""))),
);
adminRoutes.delete("/entities/:entity/:id", async (c) => c.json(await content.deleteEntity(userOf(c), entity(c.req.param("entity")), c.req.param("id"))));
adminRoutes.get("/entities/:entity/:id/preview", async (c) => c.json(await content.previewEntity(entity(c.req.param("entity")), c.req.param("id"))));

// Taxonomy
adminRoutes.get("/categories", async (c) => c.json(await manage.listCategories()));
adminRoutes.post("/categories", async (c) => c.json(await manage.saveCategory(userOf(c), null, await body(c)), 201));
adminRoutes.put("/categories/:id", async (c) => c.json(await manage.saveCategory(userOf(c), c.req.param("id"), await body(c))));
adminRoutes.delete("/categories/:id", async (c) => c.json(await manage.deleteCategory(userOf(c), c.req.param("id"))));
adminRoutes.get("/tags", async (c) => c.json(await manage.listTags()));
adminRoutes.put("/tags/:id", async (c) => c.json(await manage.renameTag(userOf(c), c.req.param("id"), await body(c))));
adminRoutes.delete("/tags/:id", async (c) => c.json(await manage.deleteTag(userOf(c), c.req.param("id"))));
adminRoutes.get("/authors", async (c) => c.json(await manage.listAuthors()));
adminRoutes.post("/authors", async (c) => c.json(await manage.saveAuthor(userOf(c), null, await body(c)), 201));
adminRoutes.put("/authors/:id", async (c) => c.json(await manage.saveAuthor(userOf(c), c.req.param("id"), await body(c))));
adminRoutes.get("/localities", async (c) => c.json(await manage.listLocalities()));
adminRoutes.post("/localities", async (c) => c.json(await manage.saveLocality(userOf(c), null, await body(c)), 201));
adminRoutes.put("/localities/:id", async (c) => c.json(await manage.saveLocality(userOf(c), c.req.param("id"), await body(c))));

// Media library
adminRoutes.get("/media", async (c) =>
  c.json(await manage.listMedia({ q: stringParam(c.req.query("q")), missingAlt: c.req.query("missing") === "alt", unused: c.req.query("unused") === "1", page: pageParam(c.req.query("page")) })),
);
adminRoutes.get("/media/:id/usage", async (c) => c.json(await manage.mediaUsage(c.req.param("id"))));
adminRoutes.put("/media/:id", async (c) => c.json(await manage.updateMedia(userOf(c), c.req.param("id"), await body(c))));
adminRoutes.delete("/media/:id", async (c) => c.json(await manage.deleteMedia(userOf(c), c.req.param("id"))));

// Users, messages, redirects, activity
adminRoutes.get("/users", async (c) => c.json(await manage.listUsers({ q: stringParam(c.req.query("q")), page: pageParam(c.req.query("page")) })));
adminRoutes.post("/users/:id/status", async (c) => c.json(await manage.setUserStatus(userOf(c), c.req.param("id"), (await body(c)).status)));
adminRoutes.get("/messages", async (c) => {
  const s = (c.req.query("status") ?? "NEW").toUpperCase();
  return c.json(await manage.listMessages((["NEW", "READ", "ARCHIVED"].includes(s) ? s : "NEW") as MessageStatus));
});
adminRoutes.post("/messages/:id/status", async (c) => c.json(await manage.setMessageStatus(userOf(c), c.req.param("id"), (await body(c)).status)));
adminRoutes.get("/redirects", async (c) => c.json(await manage.listRedirects()));
adminRoutes.post("/redirects", async (c) => c.json(await manage.saveRedirect(userOf(c), await body(c)), 201));
adminRoutes.delete("/redirects/:id", async (c) => c.json(await manage.deleteRedirect(userOf(c), c.req.param("id"))));
adminRoutes.get("/activity", async (c) => c.json(await manage.listActivity(pageParam(c.req.query("page")))));
