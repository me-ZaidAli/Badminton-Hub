import type { Express } from "express";
import { db } from "./db";
import {
  debtCharges, debtPayments, playerDebtNotes,
  insertDebtChargeSchema, insertDebtPaymentSchema, insertPlayerDebtNoteSchema,
  users, clubs, playerProfiles, sessionSignups, sessions,
} from "@shared/schema";
import { eq, and, inArray, desc, sql, gte, lte, or } from "drizzle-orm";

async function getAdminClubIds(userId: number, userRole: string): Promise<number[]> {
  if (userRole === "OWNER" || userRole === "ADMIN") {
    const all = await db.select({ id: clubs.id }).from(clubs);
    return all.map(c => c.id);
  }
  const owned = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, userId));
  const adminProfiles = await db.select({ clubId: playerProfiles.clubId })
    .from(playerProfiles)
    .where(and(
      eq(playerProfiles.userId, userId),
      eq(playerProfiles.membershipStatus, "APPROVED"),
      inArray(playerProfiles.clubRole, ["OWNER", "ADMIN"])
    ));
  return [...new Set([...owned.map(c => c.id), ...adminProfiles.map(p => p.clubId)])];
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.isAuthenticated()) { res.sendStatus(401); return false; }
  const u = req.user as any;
  if (u.role === "OWNER" || u.role === "ADMIN") return true;
  const ids = await getAdminClubIds(u.id, u.role);
  if (ids.length === 0) { res.sendStatus(403); return false; }
  return true;
}

// Pulls outstanding session signups (UNPAID/PENDING + CONFIRMED + past or today + fee>0)
// and converts them into virtual "session charge" rows so they appear alongside manual debts.
async function getSessionCharges(filterClubIds: number[]) {
  if (filterClubIds.length === 0) return [] as Array<{ id: number; userId: number; clubId: number; amount: number; chargeDate: Date; description: string; category: string; sessionId: number }>;
  const now = new Date();
  const rows = await db.select({
    signupId: sessionSignups.id,
    userId: playerProfiles.userId,
    clubId: sessions.clubId,
    fee: sessionSignups.fee,
    sessionDate: sessions.date,
    sessionId: sessions.id,
    sessionTitle: sessions.title,
  })
    .from(sessionSignups)
    .innerJoin(sessions, eq(sessions.id, sessionSignups.sessionId))
    .innerJoin(playerProfiles, eq(playerProfiles.id, sessionSignups.playerId))
    .where(and(
      inArray(sessions.clubId, filterClubIds),
      sql`${sessionSignups.paymentStatus} != 'PAID'`,
      eq(sessionSignups.signupStatus, "CONFIRMED"),
      lte(sessions.date, now),
    ));
  return rows.filter(r => (r.fee ?? 0) > 0).map(r => ({
    id: r.signupId,
    userId: r.userId,
    clubId: r.clubId,
    amount: r.fee ?? 0,
    chargeDate: r.sessionDate,
    description: `Session: ${r.sessionTitle || `#${r.sessionId}`}`,
    category: "SESSION",
    sessionId: r.sessionId,
  }));
}

export function registerDebtRoutes(app: Express) {
  // -------- Summary cards --------
  app.get("/api/debts/summary", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (allowedClubIds.length === 0) return res.json({ totalOutstanding: 0, totalCollectedThisMonth: 0, totalOverdue: 0, playersWithDebt: 0, averageDebt: 0 });

      const clubFilterId = req.query.clubId ? Number(req.query.clubId) : null;
      const overdueDays = Number(req.query.overdueDays || 14);

      const filterClubIds = clubFilterId && allowedClubIds.includes(clubFilterId)
        ? [clubFilterId] : allowedClubIds;
      if (filterClubIds.length === 0) return res.json({ totalOutstanding: 0, totalCollectedThisMonth: 0, totalOverdue: 0, playersWithDebt: 0, averageDebt: 0 });

      const manualCharges = await db.select().from(debtCharges).where(inArray(debtCharges.clubId, filterClubIds));
      const sessionCharges = await getSessionCharges(filterClubIds);
      const charges = [...manualCharges, ...sessionCharges];
      const payments = await db.select().from(debtPayments).where(inArray(debtPayments.clubId, filterClubIds));

      const balanceByPlayer = new Map<string, { charges: number; payments: number; overdue: number }>();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - overdueDays);

      for (const c of charges) {
        const k = `${c.userId}-${c.clubId}`;
        if (!balanceByPlayer.has(k)) balanceByPlayer.set(k, { charges: 0, payments: 0, overdue: 0 });
        const b = balanceByPlayer.get(k)!;
        b.charges += c.amount;
        if (new Date(c.chargeDate) < cutoff) b.overdue += c.amount;
      }
      for (const p of payments) {
        const k = `${p.userId}-${p.clubId}`;
        if (!balanceByPlayer.has(k)) balanceByPlayer.set(k, { charges: 0, payments: 0, overdue: 0 });
        balanceByPlayer.get(k)!.payments += p.amount;
      }

      let totalOutstanding = 0, totalOverdue = 0, playersWithDebt = 0;
      for (const b of balanceByPlayer.values()) {
        const owed = b.charges - b.payments;
        if (owed > 0) {
          totalOutstanding += owed;
          totalOverdue += Math.min(owed, Math.max(0, b.overdue - b.payments));
          playersWithDebt++;
        }
      }

      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const totalCollectedThisMonth = payments
        .filter(p => new Date(p.paymentDate) >= monthStart)
        .reduce((s, p) => s + p.amount, 0);

      res.json({
        totalOutstanding,
        totalCollectedThisMonth,
        totalOverdue,
        playersWithDebt,
        averageDebt: playersWithDebt > 0 ? Math.round(totalOutstanding / playersWithDebt) : 0,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Players list with debt --------
  app.get("/api/debts/players", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (allowedClubIds.length === 0) return res.json([]);

      const clubFilterId = req.query.clubId ? Number(req.query.clubId) : null;
      const overdueDays = Number(req.query.overdueDays || 14);
      const filterClubIds = clubFilterId && allowedClubIds.includes(clubFilterId)
        ? [clubFilterId] : allowedClubIds;
      if (filterClubIds.length === 0) return res.json([]);

      const manualCharges = await db.select().from(debtCharges).where(inArray(debtCharges.clubId, filterClubIds));
      const sessionCharges = await getSessionCharges(filterClubIds);
      const charges = [...manualCharges, ...sessionCharges];
      const payments = await db.select().from(debtPayments).where(inArray(debtPayments.clubId, filterClubIds));

      const map = new Map<string, { userId: number; clubId: number; charges: number; payments: number; overdueAmount: number; lastPaymentDate: Date | null; lastChargeDate: Date | null }>();
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - overdueDays);

      for (const c of charges) {
        const k = `${c.userId}-${c.clubId}`;
        if (!map.has(k)) map.set(k, { userId: c.userId, clubId: c.clubId, charges: 0, payments: 0, overdueAmount: 0, lastPaymentDate: null, lastChargeDate: null });
        const b = map.get(k)!;
        b.charges += c.amount;
        if (new Date(c.chargeDate) < cutoff) b.overdueAmount += c.amount;
        if (!b.lastChargeDate || new Date(c.chargeDate) > b.lastChargeDate) b.lastChargeDate = new Date(c.chargeDate);
      }
      for (const p of payments) {
        const k = `${p.userId}-${p.clubId}`;
        if (!map.has(k)) map.set(k, { userId: p.userId, clubId: p.clubId, charges: 0, payments: 0, overdueAmount: 0, lastPaymentDate: null, lastChargeDate: null });
        const b = map.get(k)!;
        b.payments += p.amount;
        if (!b.lastPaymentDate || new Date(p.paymentDate) > b.lastPaymentDate) b.lastPaymentDate = new Date(p.paymentDate);
      }

      const userIds = [...new Set([...map.values()].map(b => b.userId))];
      const clubIds = [...new Set([...map.values()].map(b => b.clubId))];
      const userRows = userIds.length > 0 ? await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(inArray(users.id, userIds)) : [];
      const clubRows = clubIds.length > 0 ? await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, clubIds)) : [];
      const userById = new Map(userRows.map(r => [r.id, r]));
      const clubById = new Map(clubRows.map(r => [r.id, r]));

      const results = [...map.values()].map(b => {
        const totalOwed = Math.max(0, b.charges - b.payments);
        const overdueRemaining = Math.min(totalOwed, Math.max(0, b.overdueAmount - b.payments));
        let status: "PAID" | "PARTIAL" | "OVERDUE" = "PAID";
        if (overdueRemaining > 0) status = "OVERDUE";
        else if (totalOwed > 0) status = "PARTIAL";
        const user = userById.get(b.userId);
        const club = clubById.get(b.clubId);
        return {
          userId: b.userId,
          clubId: b.clubId,
          playerName: user?.fullName || `User ${b.userId}`,
          playerEmail: user?.email || "",
          clubName: club?.name || `Club ${b.clubId}`,
          totalCharges: b.charges,
          totalPayments: b.payments,
          totalOwed,
          overdueAmount: overdueRemaining,
          lastPaymentDate: b.lastPaymentDate,
          lastChargeDate: b.lastChargeDate,
          status,
        };
      }).filter(r => r.totalCharges > 0 || r.totalPayments > 0);

      res.json(results);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Player detail --------
  app.get("/api/debts/players/:userId/:clubId", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      const userId = Number(req.params.userId);
      const clubId = Number(req.params.clubId);
      if (!allowedClubIds.includes(clubId)) return res.sendStatus(403);

      // Confirm the requested player actually belongs to this club (prevents cross-club lookup).
      const [membership] = await db.select({ id: playerProfiles.id }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, userId), eq(playerProfiles.clubId, clubId)));
      if (!membership) {
        // Allow if there are existing charges/payments tied to this user+club, otherwise reject.
        const [hasCharge] = await db.select({ id: debtCharges.id }).from(debtCharges)
          .where(and(eq(debtCharges.userId, userId), eq(debtCharges.clubId, clubId)));
        const [hasPayment] = await db.select({ id: debtPayments.id }).from(debtPayments)
          .where(and(eq(debtPayments.userId, userId), eq(debtPayments.clubId, clubId)));
        if (!hasCharge && !hasPayment) return res.sendStatus(404);
      }

      const [manualChargesRows, payments, notes, [user], [club], sessionChargesAll] = await Promise.all([
        db.select().from(debtCharges).where(and(eq(debtCharges.userId, userId), eq(debtCharges.clubId, clubId))).orderBy(desc(debtCharges.chargeDate)),
        db.select().from(debtPayments).where(and(eq(debtPayments.userId, userId), eq(debtPayments.clubId, clubId))).orderBy(desc(debtPayments.paymentDate)),
        db.select().from(playerDebtNotes).where(and(eq(playerDebtNotes.userId, userId), eq(playerDebtNotes.clubId, clubId))).orderBy(desc(playerDebtNotes.createdAt)),
        db.select().from(users).where(eq(users.id, userId)),
        db.select().from(clubs).where(eq(clubs.id, clubId)),
        getSessionCharges([clubId]),
      ]);
      const sessionChargesForPlayer = sessionChargesAll.filter(s => s.userId === userId);
      const charges = [
        ...manualChargesRows,
        ...sessionChargesForPlayer.map(s => ({
          id: -s.id, // negative to avoid id collision with manual charges
          userId: s.userId,
          clubId: s.clubId,
          amount: s.amount,
          chargeDate: s.chargeDate,
          description: s.description,
          category: s.category,
          notes: null,
          createdBy: null,
          createdAt: s.chargeDate,
          isSessionCharge: true,
          sessionId: s.sessionId,
        } as any)),
      ].sort((a: any, b: any) => new Date(b.chargeDate).getTime() - new Date(a.chargeDate).getTime());

      const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
      const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

      res.json({
        user: user ? { id: user.id, fullName: user.fullName, email: user.email } : null,
        club: club ? { id: club.id, name: club.name } : null,
        charges, payments, notes,
        totalCharges, totalPayments,
        outstandingBalance: Math.max(0, totalCharges - totalPayments),
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Add charge --------
  app.post("/api/debts/charges", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const parsed = insertDebtChargeSchema.parse({
        ...req.body,
        chargeDate: req.body.chargeDate ? new Date(req.body.chargeDate) : new Date(),
      });
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(parsed.clubId)) return res.sendStatus(403);
      const [row] = await db.insert(debtCharges).values({ ...parsed, createdById: u.id }).returning();
      res.json(row);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.patch("/api/debts/charges/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const id = Number(req.params.id);
      const [existing] = await db.select().from(debtCharges).where(eq(debtCharges.id, id));
      if (!existing) return res.sendStatus(404);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(existing.clubId)) return res.sendStatus(403);
      const updates: any = {};
      if (req.body.amount !== undefined) updates.amount = Number(req.body.amount);
      if (req.body.description !== undefined) updates.description = String(req.body.description);
      if (req.body.category !== undefined) updates.category = String(req.body.category);
      if (req.body.chargeDate !== undefined) updates.chargeDate = new Date(req.body.chargeDate);
      const [row] = await db.update(debtCharges).set(updates).where(eq(debtCharges.id, id)).returning();
      res.json(row);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.delete("/api/debts/charges/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const id = Number(req.params.id);
      const [existing] = await db.select().from(debtCharges).where(eq(debtCharges.id, id));
      if (!existing) return res.sendStatus(404);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(existing.clubId)) return res.sendStatus(403);
      await db.delete(debtCharges).where(eq(debtCharges.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Add payment --------
  app.post("/api/debts/payments", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const parsed = insertDebtPaymentSchema.parse({
        ...req.body,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      });
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(parsed.clubId)) return res.sendStatus(403);
      const [row] = await db.insert(debtPayments).values({ ...parsed, createdById: u.id }).returning();
      res.json(row);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.patch("/api/debts/payments/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const id = Number(req.params.id);
      const [existing] = await db.select().from(debtPayments).where(eq(debtPayments.id, id));
      if (!existing) return res.sendStatus(404);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(existing.clubId)) return res.sendStatus(403);
      const updates: any = {};
      if (req.body.amount !== undefined) updates.amount = Number(req.body.amount);
      if (req.body.method !== undefined) updates.method = String(req.body.method);
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.paymentDate !== undefined) updates.paymentDate = new Date(req.body.paymentDate);
      const [row] = await db.update(debtPayments).set(updates).where(eq(debtPayments.id, id)).returning();
      res.json(row);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.delete("/api/debts/payments/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const id = Number(req.params.id);
      const [existing] = await db.select().from(debtPayments).where(eq(debtPayments.id, id));
      if (!existing) return res.sendStatus(404);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(existing.clubId)) return res.sendStatus(403);
      await db.delete(debtPayments).where(eq(debtPayments.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Mark all paid (settle outstanding) --------
  app.post("/api/debts/players/:userId/:clubId/settle", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const userId = Number(req.params.userId);
      const clubId = Number(req.params.clubId);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(clubId)) return res.sendStatus(403);
      const charges = await db.select().from(debtCharges).where(and(eq(debtCharges.userId, userId), eq(debtCharges.clubId, clubId)));
      const payments = await db.select().from(debtPayments).where(and(eq(debtPayments.userId, userId), eq(debtPayments.clubId, clubId)));
      const owed = charges.reduce((s, c) => s + c.amount, 0) - payments.reduce((s, p) => s + p.amount, 0);
      if (owed <= 0) return res.json({ message: "Already settled", inserted: null });
      const method = (req.body?.method as string) || "OTHER";
      const [row] = await db.insert(debtPayments).values({
        userId, clubId, amount: owed, method,
        paymentDate: new Date(),
        notes: "Marked as paid by admin",
        createdById: u.id,
      }).returning();
      res.json({ inserted: row, settled: owed });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Notes --------
  app.post("/api/debts/notes", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const parsed = insertPlayerDebtNoteSchema.parse(req.body);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(parsed.clubId)) return res.sendStatus(403);
      const [row] = await db.insert(playerDebtNotes).values({ ...parsed, createdById: u.id }).returning();
      res.json(row);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.delete("/api/debts/notes/:id", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const id = Number(req.params.id);
      const [existing] = await db.select().from(playerDebtNotes).where(eq(playerDebtNotes.id, id));
      if (!existing) return res.sendStatus(404);
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (!allowedClubIds.includes(existing.clubId)) return res.sendStatus(403);
      await db.delete(playerDebtNotes).where(eq(playerDebtNotes.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Bulk actions --------
  app.post("/api/debts/bulk", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const { action, targets, payload } = req.body as { action: string; targets: { userId: number; clubId: number }[]; payload?: any };
      if (!Array.isArray(targets) || targets.length === 0) return res.status(400).json({ message: "No targets" });
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      const valid = targets.filter(t => allowedClubIds.includes(t.clubId));
      if (valid.length === 0) return res.sendStatus(403);

      if (action === "ADD_CHARGE") {
        const amount = Number(payload?.amount);
        if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
        const rows = valid.map(t => ({
          userId: t.userId, clubId: t.clubId, amount,
          description: payload?.description || "Bulk charge",
          category: payload?.category || "OTHER",
          chargeDate: payload?.chargeDate ? new Date(payload.chargeDate) : new Date(),
          createdById: u.id,
        }));
        await db.insert(debtCharges).values(rows);
        return res.json({ ok: true, count: rows.length });
      }

      if (action === "MARK_PAID") {
        const count = await db.transaction(async (trx) => {
          let n = 0;
          for (const t of valid) {
            const charges = await trx.select().from(debtCharges).where(and(eq(debtCharges.userId, t.userId), eq(debtCharges.clubId, t.clubId)));
            const payments = await trx.select().from(debtPayments).where(and(eq(debtPayments.userId, t.userId), eq(debtPayments.clubId, t.clubId)));
            const owed = charges.reduce((s, c) => s + c.amount, 0) - payments.reduce((s, p) => s + p.amount, 0);
            if (owed > 0) {
              await trx.insert(debtPayments).values({
                userId: t.userId, clubId: t.clubId, amount: owed,
                method: payload?.method || "OTHER",
                paymentDate: new Date(), notes: "Bulk mark-as-paid",
                createdById: u.id,
              });
              n++;
            }
          }
          return n;
        });
        return res.json({ ok: true, count });
      }

      if (action === "SEND_REMINDER") {
        // Hook only — messaging integration not wired here.
        console.log(`[DEBT REMINDER] Queued ${valid.length} reminders by user ${u.id}`);
        return res.json({ ok: true, count: valid.length, queued: true });
      }

      res.status(400).json({ message: "Unknown action" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- All transactions feed --------
  app.get("/api/debts/transactions", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (allowedClubIds.length === 0) return res.json([]);
      const clubFilterId = req.query.clubId ? Number(req.query.clubId) : null;
      const filterClubIds = clubFilterId && allowedClubIds.includes(clubFilterId) ? [clubFilterId] : allowedClubIds;
      if (filterClubIds.length === 0) return res.json([]);

      const manualCharges = await db.select().from(debtCharges).where(inArray(debtCharges.clubId, filterClubIds));
      const sessionCharges = await getSessionCharges(filterClubIds);
      const charges = [...manualCharges, ...sessionCharges];
      const payments = await db.select().from(debtPayments).where(inArray(debtPayments.clubId, filterClubIds));
      const userIds = [...new Set([...charges.map(c => c.userId), ...payments.map(p => p.userId)])];
      const userRows = userIds.length > 0 ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIds)) : [];
      const userById = new Map(userRows.map(r => [r.id, r.fullName]));
      const clubRows = filterClubIds.length > 0 ? await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, filterClubIds)) : [];
      const clubById = new Map(clubRows.map(r => [r.id, r.name]));

      const out = [
        ...manualCharges.map(c => ({ id: `c-${c.id}`, type: "CHARGE", date: c.chargeDate, amount: c.amount, userId: c.userId, clubId: c.clubId, playerName: userById.get(c.userId) || `User ${c.userId}`, clubName: clubById.get(c.clubId) || `Club ${c.clubId}`, description: c.description, category: c.category, method: null, refId: c.id })),
        ...sessionCharges.map(c => ({ id: `s-${c.id}`, type: "CHARGE", date: c.chargeDate, amount: c.amount, userId: c.userId, clubId: c.clubId, playerName: userById.get(c.userId) || `User ${c.userId}`, clubName: clubById.get(c.clubId) || `Club ${c.clubId}`, description: c.description, category: c.category, method: null, refId: c.id })),
        ...payments.map(p => ({ id: `p-${p.id}`, type: "PAYMENT", date: p.paymentDate, amount: p.amount, userId: p.userId, clubId: p.clubId, playerName: userById.get(p.userId) || `User ${p.userId}`, clubName: clubById.get(p.clubId) || `Club ${p.clubId}`, description: p.notes || "Payment", category: null, method: p.method, refId: p.id })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(out);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Available members for "add charge" picker --------
  app.get("/api/debts/eligible-players", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (allowedClubIds.length === 0) return res.json([]);
      const clubFilterId = req.query.clubId ? Number(req.query.clubId) : null;
      const filterClubIds = clubFilterId && allowedClubIds.includes(clubFilterId) ? [clubFilterId] : allowedClubIds;
      if (filterClubIds.length === 0) return res.json([]);
      const profiles = await db.select({
        userId: playerProfiles.userId,
        clubId: playerProfiles.clubId,
        fullName: users.fullName,
        email: users.email,
        clubName: clubs.name,
      })
        .from(playerProfiles)
        .innerJoin(users, eq(users.id, playerProfiles.userId))
        .innerJoin(clubs, eq(clubs.id, playerProfiles.clubId))
        .where(and(
          inArray(playerProfiles.clubId, filterClubIds),
          eq(playerProfiles.membershipStatus, "APPROVED"),
        ));
      res.json(profiles);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // -------- Admin's accessible clubs (for filters) --------
  app.get("/api/debts/clubs", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
      const u = req.user as any;
      const allowedClubIds = await getAdminClubIds(u.id, u.role);
      if (allowedClubIds.length === 0) return res.json([]);
      const rows = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, allowedClubIds));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
