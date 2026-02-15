import { db } from "./db";
import { users, playerProfiles, clubs } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function ensureOwnerProfilesInAllClubs(userId: number) {
  const allClubs = await db.select().from(clubs).where(eq(clubs.isActive, true));
  const existingProfiles = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
  const existingClubIds = new Set(existingProfiles.map(p => p.clubId));

  for (const club of allClubs) {
    if (!existingClubIds.has(club.id)) {
      await db.insert(playerProfiles).values({
        userId,
        clubId: club.id,
        clubRole: "ADMIN",
        membershipStatus: "APPROVED",
        playerStatus: "ACTIVE",
        category: "D",
        grade: "C3",
        rankingPoints: 0,
      });
      console.log(`[SYNC] Auto-added OWNER user ${userId} as ADMIN in club ${club.id} (${club.name})`);
    } else {
      const profile = existingProfiles.find(p => p.clubId === club.id);
      if (profile && profile.membershipStatus !== "APPROVED") {
        await db.update(playerProfiles).set({ membershipStatus: "APPROVED", clubRole: "ADMIN" }).where(eq(playerProfiles.id, profile.id));
        console.log(`[SYNC] Auto-approved OWNER user ${userId} in club ${club.id} (${club.name})`);
      }
    }
  }
}

export async function ensureAllOwnersInClub(clubId: number) {
  const owners = await db.select().from(users).where(eq(users.role, "OWNER"));
  for (const owner of owners) {
    const existing = await db.select().from(playerProfiles).where(and(eq(playerProfiles.userId, owner.id), eq(playerProfiles.clubId, clubId)));
    if (existing.length === 0) {
      await db.insert(playerProfiles).values({
        userId: owner.id,
        clubId,
        clubRole: "ADMIN",
        membershipStatus: "APPROVED",
        playerStatus: "ACTIVE",
        category: "D",
        grade: "C3",
        rankingPoints: 0,
      });
      console.log(`[SYNC] Auto-added OWNER user ${owner.id} as ADMIN in new club ${clubId}`);
    }
  }
}
