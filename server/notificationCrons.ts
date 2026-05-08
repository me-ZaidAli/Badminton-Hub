import { db } from "./db";
import {
  users, playerProfiles, pushSendLog,
  notificationSchedules, clubMemberships, bslPlayers, tournamentRegistrations,
} from "@shared/schema";
import { and, eq, isNull, lte, lt, inArray, sql } from "drizzle-orm";
import { sendRulePush } from "./notificationRules";
import { getOptedInUserIdsByCategory } from "./oneSignal";

// ─── Phase 2: Smart "missing-info" targeting ─────────────────────────────────
// Weekly nag for users whose profile is incomplete. Each (user, field) pair is
// reminded at most once via push_send_log dedupe (refType prefixed).

const PROFILE_FIELDS: { name: string; label: string; cta: string }[] = [
  { name: "phone",  label: "phone number",     cta: "/profile" },
  { name: "gender", label: "gender",           cta: "/profile" },
];

export async function runProfileIncompleteReminder(): Promise<void> {
  let total = 0;

  // Phone: stored on users.phone
  try {
    const usersMissingPhone = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.phone), eq(users.role, "PLAYER")));
    for (const u of usersMissingPhone) {
      try {
        await sendRulePush("profileIncomplete", [u.id], { field: "phone number" }, {
          url: "/profile",
          inApp: true,
          dedupe: { refType: "profile-missing-phone", refId: u.id },
        });
        total++;
      } catch (e) { console.error("[profileIncomplete phone]", e); }
    }
  } catch (e) {
    console.error("[profileIncomplete] users.phone scan failed", e);
  }

  // Gender: stored on player_profiles.gender (only nag the most recent profile)
  try {
    const profsMissingGender = await db
      .selectDistinct({ userId: playerProfiles.userId })
      .from(playerProfiles)
      .where(isNull(playerProfiles.gender));
    for (const p of profsMissingGender) {
      try {
        await sendRulePush("profileIncomplete", [p.userId], { field: "gender" }, {
          url: "/profile",
          inApp: true,
          dedupe: { refType: "profile-missing-gender", refId: p.userId },
        });
        total++;
      } catch (e) { console.error("[profileIncomplete gender]", e); }
    }
  } catch (e) {
    console.error("[profileIncomplete] gender scan failed", e);
  }

  if (total > 0) console.log(`[push] sent ${total} profile-incomplete reminder(s)`);
}

// ─── Phase 4: Scheduled notifications cron ───────────────────────────────────

async function resolveSegmentUserIds(segment: any): Promise<number[]> {
  if (!segment?.type) return [];
  switch (segment.type) {
    case "USER": {
      if (!Array.isArray(segment.userIds)) return [];
      return segment.userIds.map(Number).filter(Number.isFinite);
    }
    case "CLUB": {
      const clubId = Number(segment.clubId);
      if (!Number.isFinite(clubId)) return [];
      const rows = await db.select({ userId: clubMemberships.userId })
        .from(clubMemberships)
        .where(and(eq(clubMemberships.clubId, clubId), inArray(clubMemberships.status, ["ACTIVE", "EXPIRING", "PENDING"])));
      const profs = await db.select({ userId: playerProfiles.userId })
        .from(playerProfiles).where(eq(playerProfiles.clubId, clubId));
      return Array.from(new Set([...rows.map(r => r.userId), ...profs.map(p => p.userId)]));
    }
    case "TEAM": {
      const teamId = Number(segment.teamId);
      if (!Number.isFinite(teamId)) return [];
      const rows = await db.select({ userId: bslPlayers.userId })
        .from(bslPlayers).where(eq(bslPlayers.bslTeamId, teamId));
      return rows.map(r => r.userId).filter((x): x is number => !!x);
    }
    case "TOURNAMENT": {
      const tournamentId = Number(segment.tournamentId);
      if (!Number.isFinite(tournamentId)) return [];
      const regs = await db.select({ userId: tournamentRegistrations.userId })
        .from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, tournamentId));
      return Array.from(new Set(regs.map(r => r.userId).filter((x): x is number => !!x)));
    }
    case "ALL": {
      const rows = await db.select({ id: users.id }).from(users);
      return rows.map(r => r.id);
    }
    default: return [];
  }
}

export async function runScheduledNotifications(): Promise<void> {
  const now = new Date();

  // Reaper: any row stuck in `sending` for >10 min is presumed crashed mid-flight
  // and gets flipped back to `pending` so the next tick retries it. Avoids
  // permanent silent drops if the process died between claim and dispatch.
  const stuckCutoff = new Date(now.getTime() - 10 * 60 * 1000);
  await db
    .update(notificationSchedules)
    .set({ status: "pending" })
    .where(and(eq(notificationSchedules.status, "sending"), lt(notificationSchedules.scheduleAt, stuckCutoff)));

  // Atomically claim due rows by flipping status pending → sending so concurrent
  // ticks (or multi-instance) don't double-send.
  const due = await db
    .update(notificationSchedules)
    .set({ status: "sending" })
    .where(and(eq(notificationSchedules.status, "pending"), lte(notificationSchedules.scheduleAt, now)))
    .returning();

  for (const row of due) {
    try {
      const userIds = await resolveSegmentUserIds(row.segment as any);
      if (userIds.length === 0) {
        await db.update(notificationSchedules)
          .set({ status: "sent", sentAt: new Date(), errorMessage: "No recipients" })
          .where(eq(notificationSchedules.id, row.id));
        continue;
      }
      if (row.ruleKey) {
        await sendRulePush(row.ruleKey, userIds, (row.vars as any) || {}, {
          url: row.url || undefined,
          inApp: true,
        });
      } else if (row.title && row.message) {
        // Ad-hoc broadcast — honor recipient preferences (Communication category)
        // before fanning out via OneSignal. Mirrors /api/admin/notifications/send.
        const optedIn = await getOptedInUserIdsByCategory(
          userIds, "Communication", "adminAnnouncement", "push",
        );
        if (optedIn.length > 0) {
          const { sendPushBySegment } = await import("./oneSignal");
          await sendPushBySegment({
            externalIds: optedIn,
            title: row.title,
            message: row.message,
            url: row.url || undefined,
          });
        }
      }
      await db.update(notificationSchedules)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(notificationSchedules.id, row.id));
    } catch (e: any) {
      console.error("[scheduled-notif] failed", row.id, e);
      await db.update(notificationSchedules)
        .set({ status: "failed", errorMessage: String(e?.message || e).slice(0, 500), sentAt: new Date() })
        .where(eq(notificationSchedules.id, row.id));
    }
  }
  if (due.length > 0) console.log(`[scheduled-notif] dispatched ${due.length}`);
}
