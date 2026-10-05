import { Hono } from "hono";
import { CONTRIBUTION_TYPES, type ContributionTypeKey } from "@/lib/validation";
import { clientIp, requireUser, userOf, type AppEnv } from "../lib/context";
import { notFound } from "../lib/http";
import { ipHash } from "../lib/rate-limit";
import * as svc from "../services/community";
import { registerUpload, signForUser } from "../services/media";

const body = async (c: { req: { json: () => Promise<unknown> } }) => ((await c.req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

/** Accepts the URL slug ("place") or the enum ("PLACE"). */
function contributionType(v: string): ContributionTypeKey {
  const t = CONTRIBUTION_TYPES.find((x) => x.slug === v || x.type === v);
  if (!t) throw notFound("Unknown contribution type");
  return t.type;
}

// ── /v1/contributions, /v1/corrections, /v1/contact ─────────
export const communityRoutes = new Hono<AppEnv>();

communityRoutes.get("/contributions/options/:type", async (c) => c.json(await svc.contributionFormOptions(contributionType(c.req.param("type")))));
communityRoutes.post("/contributions/:type", requireUser, async (c) =>
  c.json(await svc.submitContribution(userOf(c), contributionType(c.req.param("type")), await body(c)), 201),
);

communityRoutes.get("/corrections/target", async (c) => {
  const target = c.req.query("target");
  const id = c.req.query("id");
  if (!svc.isCorrectionTarget(target) || !id) throw notFound();
  const t = await svc.correctionTarget(target, id);
  if (!t) throw notFound();
  return c.json(t);
});
communityRoutes.post("/corrections", requireUser, async (c) => c.json(await svc.submitCorrection(userOf(c), await body(c)), 201));

communityRoutes.post("/contact", async (c) => c.json(await svc.sendContactMessage(await body(c), ipHash(clientIp(c.req.raw.headers)), c.get("user")?.id ?? null)));

// ── /v1/media ────────────────────────────────────────────────
communityRoutes.post("/media/sign", requireUser, (c) => c.json(signForUser(userOf(c))));
communityRoutes.post("/media", requireUser, async (c) => c.json(await registerUpload(userOf(c), await body(c)), 201));

// ── /v1/me — the signed-in member ────────────────────────────
export const meRoutes = new Hono<AppEnv>();
meRoutes.use(requireUser);
meRoutes.get("/account", async (c) => c.json(await svc.getAccount(userOf(c))));
meRoutes.patch("/profile", async (c) => c.json(await svc.updateProfile(userOf(c), await body(c))));
meRoutes.get("/contributions/:id", async (c) => c.json(await svc.getMyContribution(userOf(c), c.req.param("id"))));
meRoutes.put("/contributions/:id", async (c) => c.json(await svc.resubmitContribution(userOf(c), c.req.param("id"), await body(c))));
meRoutes.post("/contributions/:id/withdraw", async (c) => c.json(await svc.withdrawContribution(userOf(c), c.req.param("id"))));
