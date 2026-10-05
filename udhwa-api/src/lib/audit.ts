import { db, type Prisma } from "@/db";

/** Append-only record of who changed what. Never throws. */
export async function audit(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({ data: { ...entry, entityId: entry.entityId ?? null } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
