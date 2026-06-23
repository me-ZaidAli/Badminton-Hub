import { db } from "./db";
import { tournamentGroups, tournamentGroupPairs } from "@shared/schema";
import { inArray, sql } from "drizzle-orm";

// One-time, idempotent cleanup: remove duplicate tournament groups left behind by
// repeated "copy structure" runs before the copy idempotency guard existed.
// Two groups are duplicates when they share the same category, stage, and
// (case-insensitive) name. Per duplicate set we KEEP the copy with the most
// team-pairs (tie-break lowest id) and delete the rest along with their pair
// rows. Safe to run on every boot — it noops once no duplicates remain, and it
// only ever touches exact same-name/same-stage duplicates, which are never
// legitimate.
export async function dedupeTournamentGroups(): Promise<void> {
  const groups = await db.select({
    id: tournamentGroups.id,
    tournamentId: tournamentGroups.tournamentId,
    categoryId: tournamentGroups.categoryId,
    stageId: tournamentGroups.stageId,
    name: tournamentGroups.name,
  }).from(tournamentGroups);

  if (groups.length === 0) {
    console.log("[GROUP DEDUPE] No groups, skipping.");
    return;
  }

  const groupIds = groups.map(g => g.id);
  const pairCounts = new Map<number, number>();
  const counts = await db.select({ groupId: tournamentGroupPairs.groupId, c: sql<number>`count(*)::int` })
    .from(tournamentGroupPairs)
    .where(inArray(tournamentGroupPairs.groupId, groupIds))
    .groupBy(tournamentGroupPairs.groupId);
  for (const row of counts) pairCounts.set(row.groupId, Number(row.c));

  const buckets = new Map<string, typeof groups>();
  for (const g of groups) {
    // Scope by tournament so identically-named groups in DIFFERENT tournaments
    // are never treated as duplicates of each other.
    const key = `${g.tournamentId}|${g.categoryId ?? 0}|${g.stageId ?? 0}|${(g.name || "").trim().toLowerCase()}`;
    const arr = buckets.get(key);
    if (arr) arr.push(g); else buckets.set(key, [g]);
  }

  const deleteIds: number[] = [];
  let skippedNonEmpty = 0;
  for (const arr of Array.from(buckets.values())) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((a, b) => {
      const pa = pairCounts.get(a.id) ?? 0, pb = pairCounts.get(b.id) ?? 0;
      if (pb !== pa) return pb - pa;
      return a.id - b.id;
    });
    // Keep the first (most team-pairs, then lowest id). Only auto-delete extra
    // copies that have NO teams assigned — never silently drop a populated group.
    for (const g of sorted.slice(1)) {
      if ((pairCounts.get(g.id) ?? 0) === 0) deleteIds.push(g.id);
      else skippedNonEmpty++;
    }
  }
  if (skippedNonEmpty > 0) {
    console.warn(`[GROUP DEDUPE] Skipped ${skippedNonEmpty} duplicate group(s) that still have teams assigned (manual review needed).`);
  }

  if (deleteIds.length === 0) {
    console.log("[GROUP DEDUPE] No duplicate groups found.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, deleteIds));
    await tx.delete(tournamentGroups).where(inArray(tournamentGroups.id, deleteIds));
  });
  console.log(`[GROUP DEDUPE] Removed ${deleteIds.length} duplicate group(s).`);
}
