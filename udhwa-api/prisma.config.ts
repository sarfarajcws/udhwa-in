import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations use the direct (non-pooled) connection. `prisma generate` needs no
// database, so a fresh `npm install` works before .env exists.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://localhost:5432/udhwa" },
});
