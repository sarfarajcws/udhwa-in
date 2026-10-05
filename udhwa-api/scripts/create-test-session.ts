/**
 * Test helper — prints a session token for an email, creating the user if
 * needed. Used by the browser end-to-end suites to sign in without a real
 * Google round trip. It talks to the database directly (no HTTP endpoint
 * exists for this) and refuses to run in production or against a remote
 * database.
 *
 *   npm run -s test:session -- someone@example.com ["Display Name"]
 */
import "dotenv/config";
import { db } from "../src/db";
import { createSession, roleForEmail } from "../src/lib/auth";
import { assertLocalDatabase } from "./local-db-guard";

assertLocalDatabase("test:session");
const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run -s test:session -- <email> [name]");
  process.exit(2);
}
const name = process.argv[3] || email.split("@")[0];
const user = await db.user.upsert({
  where: { email },
  update: { role: roleForEmail(email) },
  create: { email, name, role: roleForEmail(email), emailVerified: new Date() },
});
const { token } = await createSession(user.id);
process.stdout.write(token);
await db.$disconnect();
process.exit(0);
