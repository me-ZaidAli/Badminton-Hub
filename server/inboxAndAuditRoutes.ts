import type { Express } from "express";
import { db } from "./db";
import {
  membershipRequests, playerProfiles, sessionSignups, sessions,
  merchandiseOrderItems, merchandiseProducts,
  tickets, incidentReports, playerRewardLedger, referrals,
  trialPlayers, lessonRequests,
  adminAuditLogs, users, clubs,
} from "@shared/schema";
import { eq, and, inArray, desc, sql, lte, isNull, or, ilike, gte } from "drizzle-orm";

async function getAdminClubIds(userId: number, userRole: string): Promise<number[]> {
  if (userRole === "OWNER" || userRole === "ADMIN") {
    const all = await db.select({ id: clubs.id }).from(clubs);
    return all.map((c) => c.id);
  }
  const owned = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, userId));
  const adminProfiles = await db.select({ clubId: playerProfiles.clubId })
    .from(playerProfiles)
    .where(and(
      eq(playerProfiles.userId, userId),
      eq(playerProfiles.membershipStatus, "APPROVED"),
      inArray(playerProfiles.clubRole, ["OWNER", "ADMIN"]),
    ));
  return [...new Set([...owned.map((c) => c.id), ...adminProfiles.map((p) => p.clubId)])];
}

async function requireAdmin(req: any, res: any): Promise<{ ok: boolean; allowed?: number[] }> {
  if (!req.isAuthenticated()) { res.sendStatus(401); return { ok: false }; }
  const u = req.user as any;
  const allowed = await getAdminClubIds(u.id, u.role);
  if (allowed.length === 0) { res.sendStatus(403); return { ok: false }; }
  return { ok: true, allowed };
}

export function registerInboxAndAuditRoutes(app: Express) {
  // ---------- Admin Inbox: aggregate of pending things across the club ----------
  app.get("/api/admin/inbox", async (req, res) => {
    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;
    const allowed = auth.allowed!;

    try {
      const now = new Date();

      // 1. Pending join requests (membership_requests + playerProfiles PENDING)
      const memberReqRows = await db.select({
        id: membershipRequests.id,
        clubId: membershipRequests.clubId,
        userId: membershipRequests.userId,
        createdAt: membershipRequests.createdAt,
        userName: users.fullName,
        userEmail: users.email,
        clubName: clubs.name,
      }).from(membershipRequests)
        .innerJoin(users, eq(membershipRequests.userId, users.id))
        .innerJoin(clubs, eq(membershipRequests.clubId, clubs.id))
        .where(and(eq(membershipRequests.status, "PENDING"), inArray(membershipRequests.clubId, allowed)))
        .orderBy(desc(membershipRequests.createdAt))
        .limit(50);

      const joinRows = await db.select({
        id: playerProfiles.id,
        clubId: playerProfiles.clubId,
        userId: playerProfiles.userId,
        createdAt: playerProfiles.joinedAt,
        userName: users.fullName,
        userEmail: users.email,
        clubName: clubs.name,
      }).from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
        .where(and(eq(playerProfiles.membershipStatus, "PENDING"), inArray(playerProfiles.clubId, allowed)))
        .orderBy(desc(playerProfiles.joinedAt))
        .limit(50);

      // 2. Outstanding payments (player owes for confirmed past sessions)
      // sessionSignups.playerId -> playerProfiles.id -> playerProfiles.userId -> users.id
      const paymentRows = await db.select({
        id: sessionSignups.id,
        sessionId: sessions.id,
        sessionTitle: sessions.title,
        sessionDate: sessions.date,
        clubId: sessions.clubId,
        userId: playerProfiles.userId,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .innerJoin(clubs, eq(sessions.clubId, clubs.id))
        .where(and(
          inArray(sessions.clubId, allowed),
          sql`${sessionSignups.paymentStatus} != 'PAID'`,
          eq(sessionSignups.signupStatus, "CONFIRMED"),
          lte(sessions.date, now),
        ))
        .orderBy(desc(sessions.date))
        .limit(50);

      // 3. Pending credit/reward requests
      const rewardRows = await db.select({
        id: playerRewardLedger.id,
        clubId: playerRewardLedger.clubId,
        userId: playerRewardLedger.playerId,
        credits: playerRewardLedger.credits,
        description: playerRewardLedger.description,
        createdAt: playerRewardLedger.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(playerRewardLedger)
        .innerJoin(users, eq(playerRewardLedger.playerId, users.id))
        .innerJoin(clubs, eq(playerRewardLedger.clubId, clubs.id))
        .where(and(eq(playerRewardLedger.status, "REQUESTED"), inArray(playerRewardLedger.clubId, allowed)))
        .orderBy(desc(playerRewardLedger.createdAt))
        .limit(50);

      // 4. New (unviewed) merchandise orders
      const merchRows = await db.select({
        id: merchandiseOrderItems.id,
        clubId: merchandiseOrderItems.clubId,
        userId: merchandiseOrderItems.userId,
        quantity: merchandiseOrderItems.quantity,
        unitPrice: merchandiseOrderItems.unitPrice,
        createdAt: merchandiseOrderItems.createdAt,
        productName: merchandiseProducts.name,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(merchandiseOrderItems)
        .innerJoin(merchandiseProducts, eq(merchandiseOrderItems.productId, merchandiseProducts.id))
        .innerJoin(users, eq(merchandiseOrderItems.userId, users.id))
        .innerJoin(clubs, eq(merchandiseOrderItems.clubId, clubs.id))
        .where(and(
          isNull(merchandiseOrderItems.viewedByAdminAt),
          inArray(merchandiseOrderItems.clubId, allowed),
        ))
        .orderBy(desc(merchandiseOrderItems.createdAt))
        .limit(50);

      // 5. Open helpdesk tickets (tickets.clubId is NOT NULL)
      const ticketRows = await db.select({
        id: tickets.id,
        clubId: tickets.clubId,
        userId: tickets.createdByUserId,
        subject: tickets.subject,
        status: tickets.status,
        createdAt: tickets.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(tickets)
        .innerJoin(users, eq(tickets.createdByUserId, users.id))
        .innerJoin(clubs, eq(tickets.clubId, clubs.id))
        .where(and(
          inArray(tickets.status, ["SUBMITTED", "UNDER_REVIEW"]),
          isNull(tickets.deletedAt),
          eq(tickets.isArchived, false),
          inArray(tickets.clubId, allowed),
        ))
        .orderBy(desc(tickets.createdAt))
        .limit(50);

      // 6. Pending incident reports
      const incidentRows = await db.select({
        id: incidentReports.id,
        clubId: incidentReports.clubId,
        userId: incidentReports.reportedByUserId,
        incidentType: incidentReports.incidentType,
        severity: incidentReports.severity,
        createdAt: incidentReports.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(incidentReports)
        .innerJoin(users, eq(incidentReports.reportedByUserId, users.id))
        .innerJoin(clubs, eq(incidentReports.clubId, clubs.id))
        .where(and(
          eq(incidentReports.status, "PENDING_REVIEW"),
          eq(incidentReports.isArchived, false),
          inArray(incidentReports.clubId, allowed),
        ))
        .orderBy(desc(incidentReports.createdAt))
        .limit(50);

      // 7. Trials waiting for a decision (still in flight; valid enum values only)
      const trialRows = await db.select({
        id: trialPlayers.id,
        clubId: trialPlayers.clubId,
        userId: trialPlayers.userId,
        status: trialPlayers.status,
        createdAt: trialPlayers.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(trialPlayers)
        .innerJoin(users, eq(trialPlayers.userId, users.id))
        .innerJoin(clubs, eq(trialPlayers.clubId, clubs.id))
        .where(and(
          inArray(trialPlayers.status, ["PENDING", "SCHEDULED", "ATTENDED", "EVALUATED"] as any),
          inArray(trialPlayers.clubId, allowed),
        ))
        .orderBy(desc(trialPlayers.createdAt))
        .limit(50);

      // 8. Pending lesson requests — only show those scoped to this admin's clubs.
      // Global (clubId IS NULL) lesson requests are intentionally excluded to avoid
      // leaking unrelated requests to club-scoped admins.
      const lessonRows = await db.select({
        id: lessonRequests.id,
        clubId: lessonRequests.clubId,
        userId: lessonRequests.playerId,
        createdAt: lessonRequests.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(lessonRequests)
        .innerJoin(users, eq(lessonRequests.playerId, users.id))
        .innerJoin(clubs, eq(lessonRequests.clubId, clubs.id))
        .where(and(
          eq(lessonRequests.status, "PENDING"),
          inArray(lessonRequests.clubId, allowed),
        ))
        .orderBy(desc(lessonRequests.createdAt))
        .limit(50);

      // 9. Pending referrals (clubId is nullable on this table)
      const referralRows = await db.select({
        id: referrals.id,
        clubId: referrals.clubId,
        userId: referrals.referredUserId,
        referredName: referrals.referredName,
        referredEmail: referrals.referredEmail,
        createdAt: referrals.createdAt,
        userName: users.fullName,
        clubName: clubs.name,
      }).from(referrals)
        .leftJoin(users, eq(referrals.referredUserId, users.id))
        .leftJoin(clubs, eq(referrals.clubId, clubs.id))
        .where(and(eq(referrals.status, "PENDING"), inArray(referrals.clubId, allowed)))
        .orderBy(desc(referrals.createdAt))
        .limit(50);

      const groups = [
        {
          key: "joinRequests",
          label: "Join requests",
          link: "/admin/membership-board",
          items: [
            ...memberReqRows.map((r) => ({ ...r, kind: "membershipRequest" })),
            ...joinRows.map((r) => ({ ...r, kind: "playerProfile" })),
          ],
        },
        {
          key: "outstandingPayments",
          label: "Outstanding payments",
          link: "/financials",
          items: paymentRows,
        },
        {
          key: "creditRequests",
          label: "Credit requests",
          link: "/admin/rewards-dashboard",
          items: rewardRows,
        },
        {
          key: "newOrders",
          label: "New merchandise orders",
          link: "/admin/merchandise",
          items: merchRows,
        },
        {
          key: "tickets",
          label: "Open tickets",
          link: "/tickets",
          items: ticketRows,
        },
        {
          key: "incidents",
          label: "Incident reports",
          link: "/admin/incidents",
          items: incidentRows,
        },
        {
          key: "trials",
          label: "Trial decisions",
          link: "/admin/trials",
          items: trialRows,
        },
        {
          key: "lessons",
          label: "Lesson requests",
          link: "/coach/lessons",
          items: lessonRows,
        },
        {
          key: "referrals",
          label: "Pending referrals",
          link: "/admin/referrals",
          items: referralRows,
        },
      ].map((g) => ({ ...g, count: g.items.length }));

      const totalCount = groups.reduce((s, g) => s + g.count, 0);

      res.json({ totalCount, groups, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error("[/api/admin/inbox] error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ---------- Admin Audit Log Viewer (paginated, filterable) ----------
  app.get("/api/admin/audit-logs", async (req, res) => {
    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;
    const allowed = auth.allowed!;
    const u = req.user as any;
    const isPlatformAdmin = u.role === "OWNER" || u.role === "ADMIN";

    try {
      // Clamp paging + range params to safe bounds to keep this query cheap.
      const rawLimit = parseInt(String(req.query.limit ?? "50"), 10);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);
      const rawOffset = parseInt(String(req.query.offset ?? "0"), 10);
      const offset = Math.min(Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0), 10000);
      const action = typeof req.query.action === "string" ? req.query.action.trim().slice(0, 64) : "";
      const targetType = typeof req.query.targetType === "string" ? req.query.targetType.trim().slice(0, 64) : "";
      const actorIdQ = typeof req.query.actorId === "string" ? parseInt(req.query.actorId, 10) : NaN;
      const clubIdQ = typeof req.query.clubId === "string" ? parseInt(req.query.clubId, 10) : NaN;
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 64) : "";
      const rawSinceDays = parseInt(String(req.query.sinceDays ?? "30"), 10);
      const sinceDays = Math.min(Math.max(Number.isFinite(rawSinceDays) ? rawSinceDays : 30, 1), 365);
      const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

      const conditions: any[] = [gte(adminAuditLogs.createdAt, since)];

      // Scope: platform admins see everything; club admins see only logs for their clubs
      // (or logs they themselves created).
      if (!isPlatformAdmin) {
        conditions.push(or(
          inArray(adminAuditLogs.clubId, allowed),
          eq(adminAuditLogs.actorId, u.id),
        )!);
      }

      if (action) conditions.push(eq(adminAuditLogs.action, action));
      if (targetType) conditions.push(eq(adminAuditLogs.targetType, targetType));
      if (Number.isFinite(actorIdQ)) conditions.push(eq(adminAuditLogs.actorId, actorIdQ));
      if (Number.isFinite(clubIdQ)) {
        if (!isPlatformAdmin && !allowed.includes(clubIdQ)) {
          return res.status(403).json({ message: "Forbidden club filter" });
        }
        conditions.push(eq(adminAuditLogs.clubId, clubIdQ));
      }
      if (search) {
        // Escape ILIKE wildcards so user input is treated literally.
        const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`);
        conditions.push(or(
          ilike(adminAuditLogs.action, `%${escaped}%`),
          ilike(adminAuditLogs.targetType, `%${escaped}%`),
        )!);
      }

      const whereClause = and(...conditions);

      const [{ count: total }] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(adminAuditLogs).where(whereClause);

      const rows = await db.select({
        id: adminAuditLogs.id,
        actorId: adminAuditLogs.actorId,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        clubId: adminAuditLogs.clubId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
        actorName: users.fullName,
        actorEmail: users.email,
        clubName: clubs.name,
      }).from(adminAuditLogs)
        .leftJoin(users, eq(adminAuditLogs.actorId, users.id))
        .leftJoin(clubs, eq(adminAuditLogs.clubId, clubs.id))
        .where(whereClause)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Distinct facets to power dropdowns (scoped the same way)
      const actionFacets = await db.selectDistinct({ action: adminAuditLogs.action })
        .from(adminAuditLogs).where(whereClause).limit(100);
      const targetFacets = await db.selectDistinct({ targetType: adminAuditLogs.targetType })
        .from(adminAuditLogs).where(whereClause).limit(100);

      res.json({
        total,
        limit,
        offset,
        rows,
        facets: {
          actions: actionFacets.map((a) => a.action).filter(Boolean).sort(),
          targetTypes: targetFacets.map((t) => t.targetType).filter(Boolean).sort(),
        },
      });
    } catch (err: any) {
      console.error("[/api/admin/audit-logs] error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ---------- CSV export of audit logs (same scoping & filters) ----------
  app.get("/api/admin/audit-logs/export.csv", async (req, res) => {
    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;
    const allowed = auth.allowed!;
    const u = req.user as any;
    const isPlatformAdmin = u.role === "OWNER" || u.role === "ADMIN";

    try {
      const action = typeof req.query.action === "string" ? req.query.action.trim().slice(0, 64) : "";
      const targetType = typeof req.query.targetType === "string" ? req.query.targetType.trim().slice(0, 64) : "";
      const actorIdQ = typeof req.query.actorId === "string" ? parseInt(req.query.actorId, 10) : NaN;
      const clubIdQ = typeof req.query.clubId === "string" ? parseInt(req.query.clubId, 10) : NaN;
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 64) : "";
      const rawSinceDays = parseInt(String(req.query.sinceDays ?? "30"), 10);
      const sinceDays = Math.min(Math.max(Number.isFinite(rawSinceDays) ? rawSinceDays : 30, 1), 365);
      const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

      const conditions: any[] = [gte(adminAuditLogs.createdAt, since)];
      if (!isPlatformAdmin) {
        conditions.push(or(
          inArray(adminAuditLogs.clubId, allowed),
          eq(adminAuditLogs.actorId, u.id),
        )!);
      }
      if (action) conditions.push(eq(adminAuditLogs.action, action));
      if (targetType) conditions.push(eq(adminAuditLogs.targetType, targetType));
      if (Number.isFinite(actorIdQ)) conditions.push(eq(adminAuditLogs.actorId, actorIdQ));
      if (Number.isFinite(clubIdQ)) {
        if (!isPlatformAdmin && !allowed.includes(clubIdQ)) {
          return res.status(403).json({ message: "Forbidden club filter" });
        }
        conditions.push(eq(adminAuditLogs.clubId, clubIdQ));
      }
      if (search) {
        const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`);
        conditions.push(or(
          ilike(adminAuditLogs.action, `%${escaped}%`),
          ilike(adminAuditLogs.targetType, `%${escaped}%`),
        )!);
      }

      const rows = await db.select({
        id: adminAuditLogs.id,
        actorId: adminAuditLogs.actorId,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        clubId: adminAuditLogs.clubId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
        actorName: users.fullName,
        actorEmail: users.email,
        clubName: clubs.name,
      }).from(adminAuditLogs)
        .leftJoin(users, eq(adminAuditLogs.actorId, users.id))
        .leftJoin(clubs, eq(adminAuditLogs.clubId, clubs.id))
        .where(and(...conditions))
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(10000); // hard cap on export size

      // Quote a value for CSV per RFC 4180. Prefix any leading =,+,-,@ with a
      // single quote to neutralise spreadsheet formula injection.
      const csvCell = (val: unknown): string => {
        if (val === null || val === undefined) return "";
        let s = typeof val === "string" ? val : (val instanceof Date ? val.toISOString() : JSON.stringify(val));
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const header = ["id","createdAt","actorId","actorName","actorEmail","action","targetType","targetId","clubId","clubName","metadata"];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push([
          csvCell(r.id),
          csvCell(r.createdAt),
          csvCell(r.actorId),
          csvCell(r.actorName),
          csvCell(r.actorEmail),
          csvCell(r.action),
          csvCell(r.targetType),
          csvCell(r.targetId),
          csvCell(r.clubId),
          csvCell(r.clubName),
          csvCell(r.metadata),
        ].join(","));
      }

      const filename = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      // BOM so Excel opens it as UTF-8
      res.send("\uFEFF" + lines.join("\r\n"));
    } catch (err: any) {
      console.error("[/api/admin/audit-logs/export.csv] error:", err);
      res.status(500).json({ message: err.message });
    }
  });
}
