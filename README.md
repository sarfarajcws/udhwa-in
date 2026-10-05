# Udhwa 2.0

**Your City’s Digital Home.** Udhwa is a digital community platform for a place and its people. It brings together places, businesses, services, news, blogs and photos. The community contributes, and the Udhwa team reviews and publishes.

The platform is three independent apps. Each has its own `package.json`, lockfile, `node_modules`, environment file and deployment. There is no workspace tooling.

```
udhwa-platform/
├── udhwa-next/    Public website        Next.js 16 · Vercel   · localhost:3000
├── udhwa-admin/   Admin / CMS           Next.js 16 · Vercel   · localhost:3001
├── udhwa-api/     Backend API           Hono + Prisma · Render · localhost:4000
└── .gitignore
```

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Hono 4 · Prisma 7 + PostgreSQL (Neon) · Google OAuth · Tiptap 3 · Cloudinary.

---

## How the apps fit together

```
 Browser ──► udhwa-next  (Vercel) ──┐  server-side fetch, Bearer token from the session cookie
 Browser ──► udhwa-admin (Vercel) ──┼─────────────────────────────►  udhwa-api (Render) ──► Postgres (Neon)
 Mobile app ────────────────────────┘  Bearer token                        │
                                                                           ├──► Cloudinary
  /api/v1/* on each front-end is a same-origin proxy to udhwa-api          ├──► Google (OAuth)
                                                                           └──► POST udhwa-next/api/revalidate
```

* **One backend.** `udhwa-api` is the only app with database credentials. It owns the Prisma schema, migrations and seed, and every business rule: auth, permissions, validation, moderation, publishing, search, media and audit logging. Both front-ends call it over HTTP. Their server actions are thin wrappers that forward to it.
* **Same-origin proxy.** Each front-end mounts the API at `/api/v1/*` (`src/app/api/v1/[...path]/route.ts`). Browser code talks only to its own site, so the session cookie is first-party. This works across unrelated domains such as `*.vercel.app` and `*.onrender.com`. The public site's proxy refuses `/v1/admin/*` outright.
* **Caching and SEO.** Public pages are server-rendered from API data held in Next's data cache under the tag `content`. Detail pages use ISR. When published content changes, the API calls `POST /api/revalidate` on udhwa-next, so updates appear on the next visit. Builds never need the API to be running.
* **Shared types without shared packages.** `udhwa-api` generates `src/contract.ts`, its response types as plain TypeScript with no imports. Each front-end keeps a committed copy at `src/lib/api-contract.ts`. After changing an API response, run `npm run contract` in `udhwa-api`; it rewrites both copies when the apps sit side by side. A mobile app can copy the same file.
* **Mobile-ready.** The API is versioned (`/v1`) and returns plain JSON, with dates as ISO strings. Native apps sign in with `POST /v1/auth/google/token` and send `Authorization: Bearer`.

### Authentication and admin access

* **Google is the only way to sign in.** The API runs the OAuth 2.0 code flow with PKCE, a signed state cookie and an ID-token nonce; it verifies the ID token's signature, issuer, audience, nonce and `email_verified`. There is no development or password login.
* **Sessions** are opaque random tokens; only their SHA-256 hash is stored (`Session` table), so they can be revoked. Browsers carry them in an httpOnly, SameSite=Lax cookie (Secure in production). Cookie-authenticated writes also need the `x-udhwa-client` header and an allowed origin (CSRF defence).
* **Admin access is decided on the server from `ADMIN_EMAILS` only.** The stored role is re-synced on every request, so removing an email from the list revokes admin access immediately. There is no "make admin" button. Every `/v1/admin/*` endpoint checks the role; the admin app's pages check it too, but they are not the security boundary.
* Suspending a user (admin → Users) signs them out everywhere.

### Media

* **Cloudinary only, nothing stored on our servers.** The browser uploads directly to Cloudinary with a short-lived signature from `POST /v1/media/sign`. The signature pins the folder (`<CLOUDINARY_FOLDER>/library` for admins, `…/contributions/<userId>` for contributors), the allowed formats and an incoming resize (longest edge 4000 px). `POST /v1/media` then fetches the asset from Cloudinary's Admin API and checks folder, type, format, size (≤ 10 MB) and dimensions before creating a `Media` row; anything that fails is destroyed. Limits live in one place (`udhwa-api/src/lib/cloudinary.ts`) and are sent to the browser with each signature.
* **Delivery is optimised** by Cloudinary (`f_auto,q_auto`, responsive widths via next/image).
* **Every use of an image is tracked:** covers and photos through foreign keys, and images inside rich text (Tiptap) through `MediaUsage` rows — each image node carries its `mediaId`, and the API rebuilds the usage on every save (rejecting images that aren't library media). Pending contributions hold their uploads the same way.
* **Safe deletion.** An image can be deleted only when nothing uses it; the admin is told where it is used otherwise. The database enforces the same rule (`ON DELETE RESTRICT`). Deleting a photo also deletes its image; withdrawn or rejected contributions release their uploads, which are deleted when nothing else uses them. Deletion removes the database row first, then the Cloudinary asset (failures are logged and audited for manual cleanup, never breaking content).

### API surface (`/v1`)

| Area | Endpoints |
|---|---|
| Public (no auth, cacheable) | `GET /home` `/site` `/categories/:kind` `/places[/:slug]` `/businesses[/:slug]` `/services[/:slug]` `/news[/:slug]` `/blogs[/:slug]` `/photos[/:id]` (`?category=` `?place=` `?service=`) `/authors/:slug` `/search` `/sitemap` `/redirects/resolve` |
| Auth | `GET /auth/providers` `/auth/me` `/auth/google` `/auth/google/callback` · `POST /auth/google/token` `/auth/logout` |
| Member | `GET /me/account` · `PATCH /me/profile` · `GET/PUT /me/contributions/:id` · `POST /me/contributions/:id/withdraw` |
| Community | `GET /contributions/options/:type` · `POST /contributions/:type` · `GET /corrections/target` · `POST /corrections` · `POST /contact` · `POST /media/sign` · `POST /media` |
| Admin (ADMIN_EMAILS) | `/admin/counts` `/admin/dashboard` `/admin/seo` · `/admin/contributions[/:id[/:action]]` · `/admin/corrections[/:id]` · `/admin/entities/:entity[/new\|/:id[/status\|/preview]]` · `/admin/categories` `/tags` `/authors` `/localities` · `/admin/media[/:id[/usage]]` · `/admin/users` `/messages` `/redirects` `/activity` |

Errors are always `{ error, code?, fieldErrors? }` with a meaningful status (422 validation, 401/403 auth, 404, 409 conflicts/in use, 413 too large, 429 rate limited, 503 database or upstream unavailable).

---

## Local development

You need Node 20.9+ (22 recommended) and PostgreSQL, either local or a Neon branch.

**1. API** (terminal 1)

```bash
cd udhwa-api
cp .env.example .env        # DATABASE_URL / DIRECT_URL, ADMIN_EMAILS, Google + Cloudinary keys
npm install                 # also generates the Prisma client
npm run db:migrate          # create/update tables
npm run db:seed             # Udhwa content (+ sample listings on a local database)
npm run dev                 # http://localhost:4000  (GET /health)
```

**2. Public website** (terminal 2)

```bash
cd udhwa-next
cp .env.example .env.local  # REVALIDATE_SECRET must match udhwa-api
npm install
npm run dev                 # http://localhost:3000
```

**3. Admin / CMS** (terminal 3)

```bash
cd udhwa-admin
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3001
```

* **Signing in locally** uses real Google OAuth: create an OAuth client (Web application) with the redirect URIs `http://localhost:3000/api/v1/auth/google/callback` and `http://localhost:3001/api/v1/auth/google/callback` (Google allows plain `http://localhost`). Put your own Google email in `ADMIN_EMAILS` to use the admin app.
* **Offline alternative:** `npm run mock:providers` in `udhwa-api` starts local stand-ins for Google and Cloudinary on :4100 (an account chooser that accepts any email, and a Cloudinary-compatible upload API). Set `GOOGLE_TEST_BASE_URL` and `CLOUDINARY_API_BASE_URL` as shown at the bottom of `.env.example`. These overrides are ignored when `NODE_ENV=production`.
* **Without Cloudinary keys** everything works except uploads; bundled seed photos still display.
* `npm run db:seed -- --reset` wipes content tables and reseeds. It only runs against a local database (never in production or against a remote host such as Neon).

### Checks (in each app)

| | udhwa-api | udhwa-next | udhwa-admin |
|---|---|---|---|
| Types | `npm run typecheck` | `npm run typecheck` | `npm run typecheck` |
| Lint | — | `npm run lint` | `npm run lint` |
| Unit tests | `npm test` (OAuth/ID tokens, Cloudinary signing and verification, media ids in rich text, admin role rules, production config, DB error mapping, sanitizer, search, validation, form parsing) | `npm test` (API client, proxy incl. admin-path blocking) | `npm test` (same) |
| Build | `npm run build` (tsup) | `npm run build` | `npm run build` |

### Browser end-to-end suites

They exercise the real flows in a browser, including the Google OAuth round trip and Cloudinary uploads (against the mock providers), and fail on the first broken check.

```bash
# udhwa-api/.env must contain the test overrides (GOOGLE_TEST_BASE_URL, CLOUDINARY_API_BASE_URL)
cd udhwa-api && npm run db:seed -- --reset && npm run mock:providers   # terminal 4
# with all three apps running:
cd udhwa-next  && npm run e2e    # user flow, public pages + SEO audit, mobile nav + responsive layouts
cd udhwa-admin && npm run e2e    # admin flow: review → publish, content, media, SEO, users, corrections
```

Playwright needs Chromium (`npx playwright install chromium` once, or set `CHROMIUM_PATH`). Sessions for non-OAuth steps are minted by `npm run test:session` in udhwa-api, which talks to the local database directly and refuses to run in production or against a remote database.

---

## Deployment

| App | Host | Root directory | Notes |
|---|---|---|---|
| udhwa-api | Render (Web Service) | `udhwa-api` | Blueprint: `udhwa-api/render.yaml`. Build runs `prisma migrate deploy` and `media:reindex`. Health check `/health`. |
| udhwa-next | Vercel | `udhwa-next` | Framework preset Next.js; no custom build settings. |
| udhwa-admin | Vercel | `udhwa-admin` | Framework preset Next.js; no custom build settings. |
| Database | Neon | — | Pooled URL → `DATABASE_URL`; direct URL → `DIRECT_URL` (both with `sslmode=require`). |
| Media | Cloudinary | — | Signed direct uploads; unsigned uploads stay disabled. |

### Production variables

| App | Variable | What it is |
|---|---|---|
| API | `NODE_ENV=production` | Turns on strict startup checks (missing or weak settings stop the server). |
| API | `DATABASE_URL`, `DIRECT_URL` | Neon pooled and direct connection strings. Optional `DATABASE_POOL_MAX` (default 10). |
| API | `WEB_URL`, `ADMIN_URL` | The two Vercel domains (https). Optional `ALLOWED_ORIGINS` for preview URLs. |
| API | `SESSION_SECRET` (≥ 32 chars), `REVALIDATE_SECRET` (≥ 24 chars) | Random secrets: `openssl rand -base64 48`. |
| API | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client. Optional `GOOGLE_MOBILE_CLIENT_IDS` for native apps. |
| API | `ADMIN_EMAILS` | Comma-separated Google emails with admin access. |
| API | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary API credentials. Optional `CLOUDINARY_FOLDER` (default `udhwa`). |
| Website | `API_URL` | The Render URL of the API (server-side only). |
| Website | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | Public URLs and contact address. |
| Website | `REVALIDATE_SECRET` | Same value as on the API (server-side only). |
| Admin | `API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_URL` | As above. Admin access itself is configured on the API. |

No secret is ever exposed to the browser: only `NEXT_PUBLIC_*` values (URLs and the contact email) reach client code.

### Steps

1. **Neon:** create a project and copy the pooled and direct connection strings.
2. **Cloudinary:** copy the cloud name, API key and secret (Settings → API Keys). No upload preset is needed.
3. **Google Cloud:** configure the OAuth consent screen (app name, support email, authorised domains: your two front-end domains), then create an OAuth client of type *Web application* with one authorised redirect URI per front-end: `https://<web-domain>/api/v1/auth/google/callback` and `https://<admin-domain>/api/v1/auth/google/callback`. Publish the consent screen so any Google account can sign in.
4. **Render:** create the API from `udhwa-api/render.yaml` (New → Blueprint → Blueprint Path `udhwa-api/render.yaml`), or a Web Service with root directory `udhwa-api` and the same commands. Fill in the variables above.
5. **Vercel:** import the repo twice, with root directory `udhwa-next` and `udhwa-admin`, and set their variables.
6. **Seed once** against Neon from `udhwa-api` (the Render pre-deploy step has already created the tables):
   * Empty launch (structure only — localities, categories, bylines; add all content yourself in the admin): `NODE_ENV=production DATABASE_URL=… DIRECT_URL=… ADMIN_EMAILS=… npm run db:seed -- --minimal`
   * Or with the migrated udhwa.in content: the same command without `--minimal`.
   Seeding only fills an empty database (it never deletes) and adds no sample data outside a local database.
7. Sign in to the admin app with a Google account listed in `ADMIN_EMAILS`.

To sign in on Vercel preview deployments, add their origins to `ALLOWED_ORIGINS` on the API and their callback URLs in Google Cloud.

### Old URLs

Legacy `udhwa.in/*.html` pages redirect to their new pages (308), the old ICT article (still a draft) temporarily redirects to `/news` (307), links that never had content (`/downloads.html`, `/important-numbers.html`, …) return a proper 404, old `/images/…` files with an identical replacement redirect to `/seed/…`, slug changes create 308 redirects automatically (chain-free), deleted content 404s (its redirects are removed), and `/admin/*` on the website redirects to the admin app.

---

## Where things live

| Need to… | Go to |
|---|---|
| Change a business rule or permission | `udhwa-api/src/services/*` |
| Add an endpoint | `udhwa-api/src/routes/*`, plus its response type in `src/types.ts`, then `npm run contract` |
| Change the data model | `udhwa-api/prisma/schema.prisma`, then `npm run db:migrate` |
| Add a field to an admin form | `udhwa-api/src/lib/entities.ts`, which drives validation and saving, and the copy in `udhwa-admin/src/lib/entities.ts`, which drives the form |
| Change submission validation | `udhwa-api/src/lib/validation.ts` (form labels: `udhwa-next/src/lib/contribution-types.ts`) |
| Change upload limits | `udhwa-api/src/lib/cloudinary.ts` (`UPLOAD_LIMITS`; mirror the client copy in `src/components/ui/image-upload.tsx`) |
| Change public pages | `udhwa-next/src/app/(public)/*`, with data in `src/lib/queries.ts` |
| Change structured data / metadata | `udhwa-next/src/lib/jsonld.ts` and `src/lib/seo.ts` |
| Change admin screens | `udhwa-admin/src/app/(cms)/*`, with actions in `src/server/*` |
| Change look and feel | `src/app/globals.css` and `src/components/ui/*` in each front-end |

A few small files are intentionally duplicated rather than shared through a package: the rich-text schema and extensions, utils, the API client/proxy and the UI components. Keep the copies in step when you change one.

## Notes

* **Rate limits.** Bursts are limited in memory per API instance; the limits that matter are durable and database-backed (contributions + corrections per user per day, uploads per user per day, contact messages per IP and globally per hour), so they hold across restarts and multiple instances.
* **Structured data** is built only from data on the page: addresses come from the entity's own address and its locality tree (locality → district → state → country, managed in admin → Localities), never from hard-coded values.
* **Migrated content.** The legacy ICT Championship article is imported as a draft until its quotes are verified. Placeholder phone numbers from the old site were not carried over. Service listings are development samples only.
* **Restricted networks.** If Prisma's engine binaries can't be downloaded, use `node scripts/migrate-diff.mjs` / `node scripts/migrate-apply.mjs` in `udhwa-api`, which use the Wasm schema engine.
