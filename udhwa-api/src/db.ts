import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * The one Prisma client for the platform. Only udhwa-api talks to the
 * database; udhwa-next and udhwa-admin go through its HTTP API.
 */
const globalForPrisma = globalThis as unknown as { __udhwaPrisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client() {
  if (!globalForPrisma.__udhwaPrisma) globalForPrisma.__udhwaPrisma = createClient();
  return globalForPrisma.__udhwaPrisma;
}

// Created on first use, so modules (and unit tests) can import it without a database.
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const c = client();
    const v = Reflect.get(c, prop, c);
    return typeof v === "function" ? v.bind(c) : v;
  },
});

export * from "./generated/prisma/client";
