import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  userPushSubscriptions,
  userNotificationPrefs,
  users,
  clubMemberships,
  playerProfiles,
  bslPlayers,
  tournamentRegistrations,
  notificationRules,
  notificationSchedules,
  notificationSendMetrics,
  notifications,
} from "@shared/schema";
import { eq, and, inArray, sql, gte, desc } from "drizzle-orm";
import { sendPushBySegment } from "./oneSignal";
import { invalidateRuleCache, RULE_KEYS, type RuleKey, sendRulePush } from "./notificationRules";

export function registerNotificationRoutes(app: Express) {
  // Register OneSignal player ID for the current user
  app.post("/api/notifications/register", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { oneSignalPlayerId, platform } = req.body || {};
    if (!oneSignalPlayerId || typeof oneSignalPlayerId !== "string") {
      return res.status(400).json({ message: "oneSignalPlayerId required" });
    }
    const userId = req.user!.id;
    const ua = req.headers["user-agent"] || "";
    try {
      const existing = await db
        .select()
        .from(userPushSubscriptions)
        .where(
          and(
            eq(userPushSubscriptions.userId, userId),
            eq(userPushSubscriptions.oneSignalPlayerId, oneSignalPlayerId),
          ),
        );
      if (existing.length === 0) {
        await db.insert(userPushSubscriptions).values({
          userId,
          oneSignalPlayerId,
          platform: platform || null,
          userAgent: String(ua).slice(0, 500),
        }).onConflictDoNothing();
      } else {
        await db
          .update(userPushSubscriptions)
          .set({ lastSeenAt: new Date() })
          .where(eq(userPushSubscriptions.id, existing[0].id));
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[notif/register]", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Get current user's notification preferences (creates default row if missing)
  app.get("/api/notifications/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    let [pref] = await db
      .select()
      .from(userNotificationPrefs)
      .where(eq(userNotificationPrefs.userId, userId));
    if (!pref) {
      [pref] = await db.insert(userNotificationPrefs).values({ userId }).returning();
    }
    const [sub] = await db
      .select()
      .from(userPushSubscriptions)
      .where(eq(userPushSubscriptions.userId, userId))
      .limit(1);
    res.json({ ...pref, isSubscribed: !!sub });
  });

  // Update preferences. Accepts either legacy boolean flags OR a categoryPrefs
  // patch of shape { "<Category>": { push?: bool, inapp?: bool, email?: bool } }.
  app.patch("/api/notifications/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const ALLOWED_CHANNELS = new Set(["push", "inapp", "email"]);
    const allowed = [
      "paymentReceived",
      "waitlistPromoted",
      "newSessionMatchingLevel",
      "postSessionUnpaidReminder",
      "adminAnnouncement",
    ] as const;
    const patch: any = { updatedAt: new Date() };
    for (const k of allowed) {
      if (typeof req.body?.[k] === "boolean") patch[k] = req.body[k];
    }

    // Sanitize categoryPrefs payload — reject unknown channels, coerce bool only.
    let sanitizedCategoryPrefs: Record<string, Record<string, boolean>> | undefined;
    if (req.body?.categoryPrefs && typeof req.body.categoryPrefs === "object") {
      sanitizedCategoryPrefs = {};
      for (const [cat, channels] of Object.entries(req.body.categoryPrefs as Record<string, any>)) {
        if (!channels || typeof channels !== "object") continue;
        const cleaned: Record<string, boolean> = {};
        for (const [ch, v] of Object.entries(channels)) {
          if (!ALLOWED_CHANNELS.has(ch)) continue;
          if (typeof v === "boolean") cleaned[ch] = v;
        }
        if (Object.keys(cleaned).length > 0) sanitizedCategoryPrefs[cat] = cleaned;
      }
    }

    // Ensure the row exists, then atomically merge categoryPrefs at the DB level
    // using JSONB recursive concat (`||`). This avoids the read-modify-write
    // race when two PATCHes from the same user arrive concurrently.
    const existing = await db
      .select({ userId: userNotificationPrefs.userId })
      .from(userNotificationPrefs)
      .where(eq(userNotificationPrefs.userId, userId));
    if (existing.length === 0) {
      await db
        .insert(userNotificationPrefs)
        .values({ userId, ...patch, ...(sanitizedCategoryPrefs ? { categoryPrefs: sanitizedCategoryPrefs } : {}) })
        .onConflictDoNothing();
    }

    if (Object.keys(patch).length > 1) { // updatedAt is always there
      await db
        .update(userNotificationPrefs)
        .set(patch)
        .where(eq(userNotificationPrefs.userId, userId));
    }
    if (sanitizedCategoryPrefs) {
      await db
        .update(userNotificationPrefs)
        .set({
          categoryPrefs: sql`COALESCE(${userNotificationPrefs.categoryPrefs}, '{}'::jsonb) || ${JSON.stringify(sanitizedCategoryPrefs)}::jsonb`,
          updatedAt: new Date(),
        })
        .where(eq(userNotificationPrefs.userId, userId));
    }
    const [updated] = await db
      .select()
      .from(userNotificationPrefs)
      .where(eq(userNotificationPrefs.userId, userId));
    res.json(updated);
  });

  // Mute (or unmute) a single rule key for the current user. Powers the
  // "Don't ask again" / Stop these reminders button on in-app notifications.
  // Once muted, sendRulePush filters this user out across both push + in-app
  // channels for that specific rule (e.g. "profileIncomplete"). Other rules
  // are unaffected.
  app.post("/api/notifications/mute-rule", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const ruleKey: unknown = req.body?.ruleKey;
    const muted: boolean = req.body?.muted !== false; // default = mute
    if (typeof ruleKey !== "string" || !ruleKey || ruleKey.length > 80) {
      return res.status(400).json({ message: "ruleKey required" });
    }
    if (!(RULE_KEYS as readonly string[]).includes(ruleKey)) {
      return res.status(400).json({ message: "Unknown ruleKey" });
    }
    try {
      // Ensure prefs row exists
      await db.insert(userNotificationPrefs)
        .values({ userId, mutedRuleKeys: muted ? [ruleKey] : [] })
        .onConflictDoNothing();
      // Atomic array add/remove via SQL — avoids read-modify-write races.
      if (muted) {
        await db.update(userNotificationPrefs)
          .set({
            mutedRuleKeys: sql`(SELECT ARRAY(SELECT DISTINCT unnest(${userNotificationPrefs.mutedRuleKeys} || ARRAY[${ruleKey}]::text[])))`,
            updatedAt: new Date(),
          })
          .where(eq(userNotificationPrefs.userId, userId));
      } else {
        await db.update(userNotificationPrefs)
          .set({
            mutedRuleKeys: sql`array_remove(${userNotificationPrefs.mutedRuleKeys}, ${ruleKey})`,
            updatedAt: new Date(),
          })
          .where(eq(userNotificationPrefs.userId, userId));
      }
      // When muting, also clear any existing in-app rows of this type so the
      // bell clears immediately instead of forcing the user to dismiss each one.
      let cleared = 0;
      if (muted) {
        const del = await db
          .delete(notifications)
          .where(and(eq(notifications.userId, userId), eq(notifications.type, ruleKey)))
          .returning({ id: notifications.id });
        cleared = del.length;
      }
      const [row] = await db.select({ mutedRuleKeys: userNotificationPrefs.mutedRuleKeys })
        .from(userNotificationPrefs).where(eq(userNotificationPrefs.userId, userId));
      res.json({ ok: true, ruleKey, muted, cleared, mutedRuleKeys: row?.mutedRuleKeys || [] });
    } catch (err: any) {
      console.error("[notif/mute-rule]", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Public list of categories — drives the prefs UI grid
  app.get("/api/notifications/categories", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rows = await db
      .selectDistinct({ category: notificationRules.category })
      .from(notificationRules);
    res.json(rows.map(r => r.category).filter(Boolean).sort());
  });

  // Admin: list/edit notification rules (template + enabled toggle)
  app.get("/api/admin/notification-rules", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const rows = await db.select().from(notificationRules).orderBy(notificationRules.id);
    res.json(rows);
  });

  app.patch("/api/admin/notification-rules/:key", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const key = req.params.key;
    if (!(RULE_KEYS as readonly string[]).includes(key)) {
      return res.status(400).json({ message: "Unknown rule key" });
    }
    const patch: any = { updatedAt: new Date() };
    if (typeof req.body?.enabled === "boolean") patch.enabled = req.body.enabled;
    if (typeof req.body?.title === "string") {
      const t = req.body.title.trim();
      if (t.length === 0) return res.status(400).json({ message: "Title cannot be blank" });
      patch.title = t.slice(0, 200);
    }
    if (typeof req.body?.message === "string") {
      const m = req.body.message.trim();
      if (m.length === 0) return res.status(400).json({ message: "Message cannot be blank" });
      patch.message = m.slice(0, 600);
    }
    if (req.body?.settings && typeof req.body.settings === "object") patch.settings = req.body.settings;
    const [updated] = await db
      .update(notificationRules)
      .set(patch)
      .where(eq(notificationRules.ruleKey, key))
      .returning();
    if (!updated) return res.status(404).json({ message: "Rule not found" });
    invalidateRuleCache(key as RuleKey);
    res.json(updated);
  });

  // ─── Phase 4: Test send for a rule ──────────────────────────────────────────
  // Sends the rule (with provided vars) to the calling admin only — push + in-app.
  app.post("/api/admin/notification-rules/:key/test", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const key = req.params.key;
    if (!(RULE_KEYS as readonly string[]).includes(key)) {
      return res.status(400).json({ message: "Unknown rule key" });
    }
    const vars = (req.body?.vars && typeof req.body.vars === "object") ? req.body.vars : {};
    const url = typeof req.body?.url === "string" ? req.body.url : undefined;
    try {
      await sendRulePush(key as RuleKey, [req.user!.id], vars, { url, inApp: true });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Phase 5: Per-rule analytics ────────────────────────────────────────────
  app.get("/api/admin/notification-rules/:key/stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const key = req.params.key;
    const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        channel: notificationSendMetrics.channel,
        total: sql<number>`COALESCE(SUM(${notificationSendMetrics.recipientsCount}), 0)::int`,
        sends: sql<number>`COUNT(*)::int`,
      })
      .from(notificationSendMetrics)
      .where(and(eq(notificationSendMetrics.ruleKey, key), gte(notificationSendMetrics.sentAt, since)))
      .groupBy(notificationSendMetrics.channel);
    const out: Record<string, { total: number; sends: number }> = {
      push: { total: 0, sends: 0 },
      inapp: { total: 0, sends: 0 },
      email: { total: 0, sends: 0 },
    };
    for (const r of rows) out[r.channel] = { total: Number(r.total), sends: Number(r.sends) };
    res.json({ days, byChannel: out });
  });

  // ─── Phase 4: Scheduled notifications CRUD ─────────────────────────────────
  // Tenant scope: OWNER sees/manages everything; ADMIN is restricted to rows
  // they themselves created AND segments targeting clubs they administer.
  async function adminClubIds(userId: number): Promise<Set<number>> {
    // Admin/Owner club access lives on playerProfiles.clubRole, plus any clubs
    // the user directly owns via clubs.ownerId.
    const profs = await db
      .select({ clubId: playerProfiles.clubId })
      .from(playerProfiles)
      .where(and(
        eq(playerProfiles.userId, userId),
        inArray(playerProfiles.clubRole, ["OWNER", "ADMIN", "ORGANISER"]),
      ));
    const { clubs } = await import("@shared/schema");
    const owned = await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.ownerId, userId));
    return new Set([...profs.map(p => p.clubId), ...owned.map(c => c.id)]);
  }

  async function adminCanTargetSegment(userId: number, role: string, segment: any): Promise<boolean> {
    if (role === "OWNER") return true;
    if (!segment?.type) return false;
    switch (segment.type) {
      case "ALL": return false; // OWNER-only above
      case "USER": return Array.isArray(segment.userIds) && segment.userIds.length > 0;
      case "CLUB": {
        const ids = await adminClubIds(userId);
        return ids.has(Number(segment.clubId));
      }
      case "TEAM": {
        const teamId = Number(segment.teamId);
        if (!Number.isFinite(teamId)) return false;
        // Look up the team's club then verify admin owns it
        const [team] = await db.select({ clubId: bslPlayers.clubId })
          .from(bslPlayers).where(eq(bslPlayers.bslTeamId, teamId)).limit(1);
        if (!team?.clubId) return false;
        const ids = await adminClubIds(userId);
        return ids.has(team.clubId);
      }
      case "TOURNAMENT": {
        const tournamentId = Number(segment.tournamentId);
        if (!Number.isFinite(tournamentId)) return false;
        const ids = await adminClubIds(userId);
        // Tournaments include a clubId; only allow if admin owns that club
        const { tournaments } = await import("@shared/schema");
        const [t] = await db.select({ clubId: tournaments.clubId })
          .from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
        return !!t && ids.has(t.clubId);
      }
      default: return false;
    }
  }

  app.get("/api/admin/notification-schedules", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const userId = req.user!.id;
    const where = role === "OWNER" ? undefined : eq(notificationSchedules.createdBy, userId);
    const q = db.select().from(notificationSchedules);
    const rows = await (where ? q.where(where) : q)
      .orderBy(desc(notificationSchedules.scheduleAt))
      .limit(100);
    res.json(rows);
  });

  app.post("/api/admin/notification-schedules", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const { ruleKey, title, message, url, segment, vars, scheduleAt } = req.body || {};
    if (!segment?.type) return res.status(400).json({ message: "segment.type required" });
    if (segment.type === "ALL" && role !== "OWNER") return res.sendStatus(403);
    if (!scheduleAt) return res.status(400).json({ message: "scheduleAt required" });
    const when = new Date(scheduleAt);
    if (isNaN(when.getTime())) return res.status(400).json({ message: "Invalid scheduleAt" });
    if (ruleKey && !(RULE_KEYS as readonly string[]).includes(ruleKey)) {
      return res.status(400).json({ message: "Unknown rule key" });
    }
    if (!ruleKey && (!title || !message)) {
      return res.status(400).json({ message: "Provide ruleKey OR title+message" });
    }
    const allowed = await adminCanTargetSegment(req.user!.id, role, segment);
    if (!allowed) return res.status(403).json({ message: "Segment outside your admin scope" });
    const [row] = await db.insert(notificationSchedules).values({
      ruleKey: ruleKey || null,
      title: title || null,
      message: message || null,
      url: url || null,
      segment,
      vars: vars && typeof vars === "object" ? vars : {},
      scheduleAt: when,
      createdBy: req.user!.id,
    }).returning();
    res.json(row);
  });

  app.delete("/api/admin/notification-schedules/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);
    const id = parseInt(req.params.id, 10);
    const conds = [eq(notificationSchedules.id, id), eq(notificationSchedules.status, "pending")];
    if (role !== "OWNER") conds.push(eq(notificationSchedules.createdBy, req.user!.id));
    const [row] = await db.update(notificationSchedules)
      .set({ status: "cancelled" })
      .where(and(...conds))
      .returning();
    if (!row) return res.status(404).json({ message: "Not found, already sent, or outside scope" });
    res.json(row);
  });

  // Admin: send broadcast notification by segment
  app.post("/api/admin/notifications/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") return res.sendStatus(403);

    const { title, message, url, segment } = req.body || {};
    if (!title || !message || !segment?.type) {
      return res.status(400).json({ message: "title, message and segment.type required" });
    }

    let userIds: number[] = [];
    try {
      switch (segment.type) {
        case "USER": {
          if (!Array.isArray(segment.userIds)) return res.status(400).json({ message: "userIds required" });
          userIds = segment.userIds.map(Number).filter(Number.isFinite);
          break;
        }
        case "CLUB": {
          const clubId = Number(segment.clubId);
          if (!Number.isFinite(clubId)) return res.status(400).json({ message: "clubId required" });
          const rows = await db
            .select({ userId: clubMemberships.userId })
            .from(clubMemberships)
            .where(
              and(
                eq(clubMemberships.clubId, clubId),
                inArray(clubMemberships.status, ["ACTIVE", "EXPIRING", "PENDING"]),
              ),
            );
          const profiles = await db
            .select({ userId: playerProfiles.userId })
            .from(playerProfiles)
            .where(eq(playerProfiles.clubId, clubId));
          userIds = Array.from(new Set([...rows.map(r => r.userId), ...profiles.map(p => p.userId)]));
          break;
        }
        case "TEAM": {
          // BSL team
          const teamId = Number(segment.teamId);
          if (!Number.isFinite(teamId)) return res.status(400).json({ message: "teamId required" });
          const rows = await db
            .select({ userId: bslPlayers.userId })
            .from(bslPlayers)
            .where(eq(bslPlayers.bslTeamId, teamId));
          userIds = rows.map(r => r.userId).filter((x): x is number => !!x);
          break;
        }
        case "TOURNAMENT": {
          const tournamentId = Number(segment.tournamentId);
          if (!Number.isFinite(tournamentId)) return res.status(400).json({ message: "tournamentId required" });
          const regs = await db
            .select({ userId: tournamentRegistrations.userId })
            .from(tournamentRegistrations)
            .where(eq(tournamentRegistrations.tournamentId, tournamentId));
          userIds = Array.from(new Set(regs.map(r => r.userId).filter((x): x is number => !!x)));
          break;
        }
        case "ALL": {
          if (role !== "OWNER") return res.sendStatus(403);
          const rows = await db.select({ id: users.id }).from(users);
          userIds = rows.map(r => r.id);
          break;
        }
        default:
          return res.status(400).json({ message: "unknown segment.type" });
      }

      // Filter by adminAnnouncement preference
      if (userIds.length > 0) {
        const prefs = await db
          .select()
          .from(userNotificationPrefs)
          .where(inArray(userNotificationPrefs.userId, userIds));
        const optedOut = new Set(prefs.filter(p => p.adminAnnouncement === false).map(p => p.userId));
        userIds = userIds.filter(uid => !optedOut.has(uid));
      }

      if (userIds.length === 0) {
        return res.json({ ok: true, sent: 0, message: "No opted-in recipients" });
      }
      const result = await sendPushBySegment({ externalIds: userIds, title, message, url });
      res.json({ ok: true, sent: userIds.length, oneSignal: result });
    } catch (err: any) {
      console.error("[admin/notifications/send]", err);
      res.status(500).json({ message: err.message });
    }
  });
}
