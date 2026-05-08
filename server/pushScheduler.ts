import { db } from "./db";
import { sessions, sessionSignups, playerProfiles, users } from "@shared/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { sendPushToUsers } from "./oneSignal";

function parseSessionEnd(sess: { date: Date; startTime: string | null; durationMinutes: number | null }): Date {
  const d = new Date(sess.date);
  const time = sess.startTime || "00:00";
  const [hh, mm] = time.split(":").map(n => parseInt(n, 10));
  if (Number.isFinite(hh)) d.setHours(hh, Number.isFinite(mm) ? mm : 0, 0, 0);
  d.setMinutes(d.getMinutes() + (sess.durationMinutes || 0));
  return d;
}

// Run periodically: notify users whose payment is still UNPAID for sessions
// that have already ended (within the last 7 days). Each user is notified at
// most once per signup thanks to push_send_log dedupe.
export async function runPostSessionUnpaidReminder(): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Candidate sessions: started in last 7 days
  const candidates = await db
    .select()
    .from(sessions)
    .where(and(lt(sessions.date, now), lt(sevenDaysAgo, sessions.date)));

  let totalReminders = 0;
  for (const sess of candidates) {
    const end = parseSessionEnd(sess as any);
    if (end > now) continue; // session not finished yet

    const unpaid = await db
      .select()
      .from(sessionSignups)
      .where(
        and(
          eq(sessionSignups.sessionId, sess.id),
          eq(sessionSignups.paymentStatus, "UNPAID"),
          inArray(sessionSignups.signupStatus, ["CONFIRMED"]),
        ),
      );
    if (unpaid.length === 0) continue;

    const playerIds = unpaid.map(s => s.playerId);
    const profs = await db
      .select({ id: playerProfiles.id, userId: playerProfiles.userId })
      .from(playerProfiles)
      .where(inArray(playerProfiles.id, playerIds));
    const profByPlayerId = new Map(profs.map(p => [p.id, p.userId]));

    const dateStr = new Date(sess.date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });

    for (const su of unpaid) {
      const userId = profByPlayerId.get(su.playerId);
      if (!userId) continue;
      try {
        await sendPushToUsers(
          [userId],
          "postSessionUnpaidReminder",
          {
            title: "Payment outstanding",
            message: `Your fee for "${sess.title}" on ${dateStr} hasn't been paid yet. Please settle it as soon as possible.`,
            url: `/sessions/${sess.id}`,
          },
          { refType: "unpaid-after-session", refId: su.id },
        );
        totalReminders++;
      } catch (e) {
        console.error("[unpaid reminder] push failed", e);
      }
    }
  }
  if (totalReminders > 0) {
    console.log(`[push] sent ${totalReminders} post-session unpaid reminder(s)`);
  }
}
