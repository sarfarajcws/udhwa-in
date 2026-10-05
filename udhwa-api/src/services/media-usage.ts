import { db, type Prisma } from "@/db";

/**
 * MediaUsage bookkeeping (no env or HTTP dependencies, so scripts such as
 * the seed and media:reindex can use it).
 */
export type OwnerType = "place" | "business" | "service" | "news" | "blog" | "contribution";
/** field → media ids used in that field. */
export type UsageMap = Record<string, string[]>;

type Tx = Prisma.TransactionClient | typeof db;

/** Replaces the recorded rich-text usage for one owner. */
export async function syncMediaUsage(ownerType: OwnerType, ownerId: string, usage: UsageMap, tx: Tx = db) {
  await tx.mediaUsage.deleteMany({ where: { ownerType, ownerId } });
  const data = Object.entries(usage).flatMap(([field, ids]) => ids.map((mediaId) => ({ mediaId, ownerType, ownerId, field })));
  if (data.length) await tx.mediaUsage.createMany({ data, skipDuplicates: true });
}

export async function clearMediaUsage(ownerType: OwnerType, ownerId: string, tx: Tx = db) {
  await tx.mediaUsage.deleteMany({ where: { ownerType, ownerId } });
}
