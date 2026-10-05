# udhwa-api

The Udhwa backend: a Hono 4 API on Node. It is the only service that talks to PostgreSQL (Neon), through Prisma 7, and to Cloudinary and Google. It serves udhwa-next, udhwa-admin and future mobile apps.

```bash
cp .env.example .env
npm install            # installs deps and generates the Prisma client (src/generated)
npm run db:migrate     # dev migrations      (production: npm run db:deploy)
npm run db:seed        # seed content         (--reset wipes content tables; local databases only)
npm run dev            # http://localhost:4000, GET /health
```

| Script | |
|---|---|
| `npm run build` / `npm start` | Bundle with tsup to `dist/`, then run it (Render) |
| `npm test` | Unit tests (OAuth/ID tokens, Cloudinary signing/verification, media ids, admin roles, production config, DB errors, sanitizer, search, validation, form parsing) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run contract` | Regenerate `src/contract.ts` (response types) and copy it to `../udhwa-next` and `../udhwa-admin` |
| `npm run media:reindex` | Rebuild rich-text media usage from stored content (idempotent, safe on production; runs on every Render build) |
| `npm run db:studio` | Prisma Studio |
| `npm run mock:providers` | Test-only stand-ins for Google OAuth and Cloudinary on :4100 (used by the e2e suites) |
| `npm run -s test:session -- <email>` | Test-only: prints a session token for an email (local databases only) |

**Layout:** `src/routes/*` are the HTTP routes (`/v1/...`), `src/services/*` the business logic (`media.ts` holds uploads, rich-text image tracking and safe deletion), `src/lib/*` auth, validation, rich text, Cloudinary, rate limits and audit, and `prisma/` the schema, migrations and seed.

**Production safety:** with `NODE_ENV=production` the API refuses to start unless Google, Cloudinary, the session/revalidation secrets, `ADMIN_EMAILS` and https front-end URLs are configured. Test-only overrides (`GOOGLE_TEST_BASE_URL`, `CLOUDINARY_API_BASE_URL`) are ignored in production, and `db:seed --reset` / `test:session` refuse to run in production or against a remote database.

**Deploy:** Render, using `render.yaml` (root directory `udhwa-api`). The build runs `prisma migrate deploy` and `media:reindex`. See the root README for the environment variables.
