import "dotenv/config"; // loads .env in development (no-op when the file is absent)
import { serve } from "@hono/node-server";
import { db } from "./db";
import { app } from "./app";
import { env } from "./env";

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`Udhwa API listening on http://localhost:${info.port} (${env.NODE_ENV})`);
});

// Graceful shutdown (Render sends SIGTERM on deploys): stop accepting
// connections, let in-flight requests finish, then close the database pool.
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      await db.$disconnect().catch(() => {});
      process.exit(0);
    });
  });
}

process.on("unhandledRejection", (reason) => console.error("[api] unhandled rejection", reason));
