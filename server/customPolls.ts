import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { customPolls, customPollResponses, users, clubs, clubMemberships, notifications } from "@shared/schema";
import { and, desc, eq, gt, inArray, or, sql, isNull, ilike } from "drizzle-orm";

function isAdminish(u: any) { return u?.role === "OWNER" || u?.role === "ADMIN"; }
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
  next();
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
  if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
  next();
}

async function resolveRecipientIds(poll: any): Promise<number[]> {
  const ids = new Set<number>();
  if (poll.audience === "ALL") {
    const rows = await db.select({ id: users.id }).from(users);
    rows.forEach(r => ids.add(r.id));
    return Array.from(ids);
  }
  const tgtUsers = (poll.targetUserIds as number[] | null) || [];
  tgtUsers.forEach(id => ids.add(id));
  const tgtClubs = (poll.targetClubIds as number[] | null) || [];
  if (tgtClubs.length > 0) {
    const rows = await db.select({ userId: clubMemberships.userId })
      .from(clubMemberships)
      .where(and(inArray(clubMemberships.clubId, tgtClubs), eq(clubMemberships.status, "ACTIVE")));
    rows.forEach(r => ids.add(r.userId));
    const ownerRows = await db.select({ ownerId: clubs.ownerId }).from(clubs).where(inArray(clubs.id, tgtClubs));
    ownerRows.forEach(r => { if (r.ownerId) ids.add(r.ownerId); });
  }
  return Array.from(ids);
}

async function getUserClubIds(userId: number): Promise<number[]> {
  const ms = await db.select({ clubId: clubMemberships.clubId })
    .from(clubMemberships)
    .where(and(eq(clubMemberships.userId, userId), eq(clubMemberships.status, "ACTIVE")));
  const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, userId));
  const set = new Set<number>();
  ms.forEach(m => set.add(m.clubId));
  ownedClubs.forEach(c => set.add(c.id));
  return Array.from(set);
}

async function canManagePoll(user: any, poll: any): Promise<boolean> {
  if (!user) return false;
  if (isAdminish(user)) return true;
  if (poll.createdById === user.id) return true;
  // Club owners can manage polls scoped to their club
  if (poll.audience === "SELECTED" && Array.isArray(poll.targetClubIds)) {
    const owned = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
    const ownedIds = new Set(owned.map(c => c.id));
    return poll.targetClubIds.some((id: number) => ownedIds.has(id));
  }
  return false;
}

export function registerCustomPollRoutes(app: Express): void {
  // === PLAYER-FACING: list active polls visible to me + my responses ===
  app.get("/api/custom-polls/active", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const myClubIds = await getUserClubIds(user.id);
      const now = new Date();

      const all = await db.select().from(customPolls)
        .where(and(
          eq(customPolls.isActive, true),
          or(isNull(customPolls.expiresAt), gt(customPolls.expiresAt, now)),
        ))
        .orderBy(desc(customPolls.createdAt));

      const visible = all.filter(p => {
        if (p.audience === "ALL") return true;
        const tgtClubs = (p.targetClubIds as number[] | null) || [];
        const tgtUsers = (p.targetUserIds as number[] | null) || [];
        if (tgtUsers.includes(user.id)) return true;
        return tgtClubs.some(id => myClubIds.includes(id));
      });

      const ids = visible.map(p => p.id);
      const myResponses = ids.length > 0
        ? await db.select().from(customPollResponses)
            .where(and(eq(customPollResponses.userId, user.id), inArray(customPollResponses.pollId, ids)))
        : [];
      const myMap = new Map(myResponses.map(r => [r.pollId, r.optionIndices as number[]]));

      // Per-poll counts
      const counts: Record<number, { total: number; perOption: number[] }> = {};
      if (ids.length > 0) {
        const allResp = await db.select().from(customPollResponses).where(inArray(customPollResponses.pollId, ids));
        for (const p of visible) {
          const opts = (p.options as string[]) || [];
          const arr = new Array(opts.length).fill(0);
          let total = 0;
          for (const r of allResp.filter(x => x.pollId === p.id)) {
            total++;
            for (const idx of (r.optionIndices as number[])) if (arr[idx] !== undefined) arr[idx]++;
          }
          counts[p.id] = { total, perOption: arr };
        }
      }

      res.json(visible.map(p => ({
        id: p.id,
        title: p.title,
        question: p.question,
        options: p.options,
        allowMultiple: p.allowMultiple,
        audience: p.audience,
        expiresAt: p.expiresAt,
        myVote: myMap.get(p.id) ?? null,
        counts: counts[p.id]?.perOption || [],
        total: counts[p.id]?.total || 0,
      })));
    } catch (e: any) {
      console.error("[CUSTOM POLLS] active failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === SUBMIT RESPONSE ===
  app.post("/api/custom-polls/:id/respond", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const pollId = Number(req.params.id);
      const indices: number[] = Array.isArray(req.body?.optionIndices) ? req.body.optionIndices.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0) : [];
      if (indices.length === 0) return res.status(400).json({ message: "Pick at least one option" });

      const [poll] = await db.select().from(customPolls).where(eq(customPolls.id, pollId)).limit(1);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (!poll.isActive) return res.status(400).json({ message: "Poll closed" });
      if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) return res.status(400).json({ message: "Poll expired" });
      const opts = (poll.options as string[]) || [];
      const valid = indices.every(i => i < opts.length);
      if (!valid) return res.status(400).json({ message: "Invalid option" });
      if (!poll.allowMultiple && indices.length > 1) return res.status(400).json({ message: "Only one option allowed" });

      // Visibility check
      if (poll.audience === "SELECTED") {
        const myClubIds = await getUserClubIds(user.id);
        const tgtClubs = (poll.targetClubIds as number[] | null) || [];
        const tgtUsers = (poll.targetUserIds as number[] | null) || [];
        const inAudience = tgtUsers.includes(user.id) || tgtClubs.some(id => myClubIds.includes(id));
        if (!inAudience) return res.status(403).json({ message: "Not in audience" });
      }

      // Upsert (one row per user per poll)
      const dedup = Array.from(new Set(indices));
      await db.insert(customPollResponses).values({ pollId, userId: user.id, optionIndices: dedup })
        .onConflictDoUpdate({ target: [customPollResponses.pollId, customPollResponses.userId], set: { optionIndices: dedup, updatedAt: new Date() } });

      res.json({ ok: true, optionIndices: dedup });
    } catch (e: any) {
      console.error("[CUSTOM POLLS] respond failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN: list all polls (with totals) ===
  app.get("/api/admin/custom-polls", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      let rows: any[];
      if (isAdminish(user)) {
        rows = await db.select().from(customPolls).orderBy(desc(customPolls.createdAt));
      } else {
        // Club managers see polls they created or polls scoped to clubs they own
        const owned = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const ownedIds = owned.map(c => c.id);
        if (ownedIds.length === 0) {
          rows = await db.select().from(customPolls).where(eq(customPolls.createdById, user.id)).orderBy(desc(customPolls.createdAt));
        } else {
          const all = await db.select().from(customPolls).orderBy(desc(customPolls.createdAt));
          rows = all.filter(p => {
            if (p.createdById === user.id) return true;
            const tgt = (p.targetClubIds as number[] | null) || [];
            return p.audience === "SELECTED" && Array.isArray(tgt) && tgt.some(id => ownedIds.includes(id));
          });
        }
      }
      const ids = rows.map(r => r.id);
      const allResp = ids.length > 0 ? await db.select().from(customPollResponses).where(inArray(customPollResponses.pollId, ids)) : [];
      const totals = new Map<number, number>();
      for (const r of allResp) totals.set(r.pollId, (totals.get(r.pollId) || 0) + 1);
      res.json(rows.map(r => ({ ...r, totalResponses: totals.get(r.id) || 0 })));
    } catch (e: any) {
      console.error("[CUSTOM POLLS] admin list failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN: create poll ===
  app.post("/api/admin/custom-polls", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdmin = isAdminish(user);
      const owned = isAdmin ? [] : (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
      if (!isAdmin && owned.length === 0) return res.status(403).json({ message: "You must own a club to create polls" });

      const title = String(req.body?.title || "").trim().slice(0, 120);
      const question = String(req.body?.question || "").trim().slice(0, 500);
      const optionsRaw: string[] = Array.isArray(req.body?.options) ? req.body.options : [];
      const options = optionsRaw.map(o => String(o || "").trim().slice(0, 100)).filter(Boolean).slice(0, 12);
      const allowMultiple = !!req.body?.allowMultiple;
      const audience: "ALL" | "SELECTED" = req.body?.audience === "ALL" ? "ALL" : "SELECTED";
      let targetClubIds: number[] = Array.isArray(req.body?.targetClubIds) ? req.body.targetClubIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0) : [];
      let targetUserIds: number[] = Array.isArray(req.body?.targetUserIds) ? req.body.targetUserIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0) : [];
      const sendAsMessage = !!req.body?.sendAsMessage;
      const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

      if (!title || !question || options.length < 2) return res.status(400).json({ message: "Title, question, and at least 2 options required" });

      // ALL audience is OWNER/ADMIN only
      if (audience === "ALL" && !isAdmin) return res.status(403).json({ message: "Only platform admins can target all clubs" });
      // Club managers can only target their own clubs + members of those clubs
      if (!isAdmin) {
        targetClubIds = targetClubIds.filter(id => owned.includes(id));
        if (targetUserIds.length > 0 && owned.length > 0) {
          const memberRows = await db.select({ userId: clubMemberships.userId })
            .from(clubMemberships)
            .where(and(inArray(clubMemberships.clubId, owned), inArray(clubMemberships.userId, targetUserIds)));
          const allowed = new Set(memberRows.map(m => m.userId));
          targetUserIds = targetUserIds.filter(id => allowed.has(id));
        } else {
          targetUserIds = [];
        }
      }
      if (audience === "SELECTED" && targetClubIds.length === 0 && targetUserIds.length === 0) {
        return res.status(400).json({ message: "Pick at least one club or user" });
      }

      const [created] = await db.insert(customPolls).values({
        title, question, options, allowMultiple,
        audience,
        targetClubIds: audience === "ALL" ? [] : targetClubIds,
        targetUserIds: audience === "ALL" ? [] : targetUserIds,
        sendAsMessage,
        isActive: true, expiresAt, createdById: user.id,
      }).returning();

      // Optional: drop an in-app message into every recipient's inbox right now
      if (sendAsMessage) {
        try {
          const recipientIds = await resolveRecipientIds(created);
          if (recipientIds.length > 0) {
            await db.insert(notifications).values(recipientIds.map(uid => ({
              userId: uid,
              type: "customPoll",
              title: `New poll: ${created.title}`,
              message: created.question,
              linkUrl: "/",
            })));
          }
        } catch (e) {
          console.error("[CUSTOM POLLS] inbox fanout failed:", e);
        }
      }

      res.json(created);
    } catch (e: any) {
      console.error("[CUSTOM POLLS] create failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN: update poll ===
  app.patch("/api/admin/custom-polls/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const pollId = Number(req.params.id);
      const [existing] = await db.select().from(customPolls).where(eq(customPolls.id, pollId)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!await canManagePoll(user, existing)) return res.status(403).json({ message: "Forbidden" });

      const patch: any = {};
      if (typeof req.body?.title === "string") patch.title = String(req.body.title).trim().slice(0, 120);
      if (typeof req.body?.question === "string") patch.question = String(req.body.question).trim().slice(0, 500);
      if (Array.isArray(req.body?.options)) patch.options = req.body.options.map((o: any) => String(o || "").trim().slice(0, 100)).filter(Boolean).slice(0, 12);
      if (typeof req.body?.allowMultiple === "boolean") patch.allowMultiple = req.body.allowMultiple;
      if (typeof req.body?.isActive === "boolean") patch.isActive = req.body.isActive;
      if (req.body?.expiresAt !== undefined) patch.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

      // Audience can be changed during edit
      const newAudience: "ALL" | "SELECTED" | undefined =
        req.body?.audience === "ALL" ? "ALL" : req.body?.audience === "SELECTED" ? "SELECTED" : undefined;
      if (newAudience) {
        if (newAudience === "ALL" && !isAdminish(user)) {
          return res.status(403).json({ message: "Only platform admins can target all clubs" });
        }
        patch.audience = newAudience;
      }
      const effectiveAudience = newAudience || existing.audience;
      if (Array.isArray(req.body?.targetClubIds)) {
        let ids = req.body.targetClubIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0);
        if (!isAdminish(user)) {
          const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
          ids = ids.filter((id: number) => owned.includes(id));
        }
        patch.targetClubIds = effectiveAudience === "ALL" ? [] : ids;
      } else if (newAudience === "ALL") {
        patch.targetClubIds = [];
      }
      if (Array.isArray(req.body?.targetUserIds)) {
        let uids = req.body.targetUserIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0);
        if (!isAdminish(user)) {
          const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
          if (uids.length > 0 && owned.length > 0) {
            const memberRows = await db.select({ userId: clubMemberships.userId })
              .from(clubMemberships)
              .where(and(inArray(clubMemberships.clubId, owned), inArray(clubMemberships.userId, uids)));
            const allowed = new Set(memberRows.map(m => m.userId));
            uids = uids.filter((id: number) => allowed.has(id));
          } else { uids = []; }
        }
        patch.targetUserIds = effectiveAudience === "ALL" ? [] : uids;
      } else if (newAudience === "ALL") {
        patch.targetUserIds = [];
      }
      if (typeof req.body?.sendAsMessage === "boolean") patch.sendAsMessage = req.body.sendAsMessage;
      if (effectiveAudience === "SELECTED") {
        const finalClubs = patch.targetClubIds ?? (existing.targetClubIds as number[] | null) ?? [];
        const finalUsers = patch.targetUserIds ?? (existing.targetUserIds as number[] | null) ?? [];
        if ((!Array.isArray(finalClubs) || finalClubs.length === 0) && (!Array.isArray(finalUsers) || finalUsers.length === 0)) {
          return res.status(400).json({ message: "Pick at least one club or user" });
        }
      }

      const [updated] = await db.update(customPolls).set(patch).where(eq(customPolls.id, pollId)).returning();
      res.json(updated);
    } catch (e: any) {
      console.error("[CUSTOM POLLS] update failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN: delete poll ===
  app.delete("/api/admin/custom-polls/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const pollId = Number(req.params.id);
      const [existing] = await db.select().from(customPolls).where(eq(customPolls.id, pollId)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!await canManagePoll(user, existing)) return res.status(403).json({ message: "Forbidden" });
      await db.delete(customPollResponses).where(eq(customPollResponses.pollId, pollId));
      await db.delete(customPolls).where(eq(customPolls.id, pollId));
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[CUSTOM POLLS] delete failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === ADMIN: full results with per-respondent breakdown ===
  app.get("/api/admin/custom-polls/:id/results", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const pollId = Number(req.params.id);
      const [poll] = await db.select().from(customPolls).where(eq(customPolls.id, pollId)).limit(1);
      if (!poll) return res.status(404).json({ message: "Not found" });
      if (!await canManagePoll(user, poll)) return res.status(403).json({ message: "Forbidden" });

      const responses = await db.select({
        id: customPollResponses.id,
        userId: customPollResponses.userId,
        optionIndices: customPollResponses.optionIndices,
        createdAt: customPollResponses.createdAt,
        updatedAt: customPollResponses.updatedAt,
        userName: users.fullName,
        userEmail: users.email,
        userPhotoUrl: users.profilePictureUrl,
      })
        .from(customPollResponses)
        .leftJoin(users, eq(users.id, customPollResponses.userId))
        .where(eq(customPollResponses.pollId, pollId))
        .orderBy(desc(customPollResponses.updatedAt));

      const opts = (poll.options as string[]) || [];
      const perOption = new Array(opts.length).fill(0);
      for (const r of responses) {
        for (const idx of (r.optionIndices as number[])) if (perOption[idx] !== undefined) perOption[idx]++;
      }

      // Resolve target club names
      const tgt = (poll.targetClubIds as number[] | null) || [];
      const tgtClubs = tgt.length > 0 ? await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(inArray(clubs.id, tgt)) : [];

      res.json({
        poll: { ...poll, targetClubs: tgtClubs },
        totalResponses: responses.length,
        perOption,
        responses,
      });
    } catch (e: any) {
      console.error("[CUSTOM POLLS] results failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Helper: search users the current admin/club-owner can target
  app.get("/api/custom-polls/targetable-users", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const q = String(req.query.q || "").trim().slice(0, 60);
      const isAdmin = isAdminish(user);
      let allowedIds: number[] | null = null;
      if (!isAdmin) {
        const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
        if (owned.length === 0) return res.json([]);
        const members = await db.select({ userId: clubMemberships.userId })
          .from(clubMemberships).where(inArray(clubMemberships.clubId, owned));
        allowedIds = Array.from(new Set(members.map(m => m.userId)));
        if (allowedIds.length === 0) return res.json([]);
      }
      const where: any[] = [];
      if (q) where.push(or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`)));
      if (allowedIds) where.push(inArray(users.id, allowedIds));
      const rows = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(where.length > 0 ? and(...where) : undefined as any)
        .orderBy(users.fullName)
        .limit(30);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Helper: hydrate a list of selected user ids back to {id, fullName, email}
  // Authorisation matches /targetable-users: OWNER/ADMIN see anyone; club owners
  // only see members of clubs they own; everyone else is denied. Ids capped at 200.
  app.post("/api/custom-polls/hydrate-users", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdmin = isAdminish(user);
      const rawIds: number[] = Array.isArray(req.body?.ids)
        ? req.body.ids.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      const ids = Array.from(new Set(rawIds)).slice(0, 200);
      if (ids.length === 0) return res.json([]);

      let allowed = ids;
      if (!isAdmin) {
        const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
        if (owned.length === 0) return res.json([]);
        const memberRows = await db.select({ userId: clubMemberships.userId })
          .from(clubMemberships)
          .where(and(inArray(clubMemberships.clubId, owned), inArray(clubMemberships.userId, ids)));
        const ok = new Set(memberRows.map(m => m.userId));
        allowed = ids.filter(id => ok.has(id));
        if (allowed.length === 0) return res.json([]);
      }

      const rows = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users).where(inArray(users.id, allowed));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // List members of a single club (admin or club owner only) for the broadcast picker
  app.get("/api/custom-polls/clubs/:clubId/members", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const clubId = Number(req.params.clubId);
      if (!Number.isInteger(clubId)) return res.status(400).json({ message: "Bad club id" });
      if (!isAdminish(user)) {
        const owns = await db.select({ id: clubs.id }).from(clubs).where(and(eq(clubs.id, clubId), eq(clubs.ownerId, user.id))).limit(1);
        if (owns.length === 0) return res.status(403).json({ message: "Not your club" });
      }
      const rows = await db.select({
          userId: clubMemberships.userId,
          status: clubMemberships.status,
          fullName: users.fullName,
          email: users.email,
        })
        .from(clubMemberships)
        .innerJoin(users, eq(users.id, clubMemberships.userId))
        .where(eq(clubMemberships.clubId, clubId))
        .orderBy(users.fullName);
      const seen = new Set<number>();
      const out = rows.filter(r => { if (seen.has(r.userId)) return false; seen.add(r.userId); return true; })
        .map(r => ({ id: r.userId, fullName: r.fullName, email: r.email, status: r.status }));
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Manual broadcast — re-send the poll to a fresh recipient set as in-app messages.
  // Body: { userIds?: number[], clubIds?: number[], includePollAudience?: boolean }
  // Admin/owner authorisation matches the rest of the module.
  app.post("/api/admin/custom-polls/:id/send-message", requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = (req as any).user;
      const isAdmin = isAdminish(user);
      const pollId = Number(req.params.id);
      if (!Number.isInteger(pollId)) return res.status(400).json({ message: "Bad poll id" });
      const [poll] = await db.select().from(customPolls).where(eq(customPolls.id, pollId)).limit(1);
      if (!poll) return res.status(404).json({ message: "Poll not found" });

      // Owner-of-club may only broadcast polls they created OR polls scoped to their clubs.
      if (!isAdmin) {
        const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
        const targetClubs = (poll.targetClubIds as number[] | null) || [];
        const ok = poll.createdById === user.id || targetClubs.some(id => owned.includes(id));
        if (!ok) return res.status(403).json({ message: "Not allowed to broadcast this poll" });
      }

      const overrideUserIds: number[] = Array.isArray(req.body?.userIds)
        ? req.body.userIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      const overrideClubIds: number[] = Array.isArray(req.body?.clubIds)
        ? req.body.clubIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      const includePollAudience = !!req.body?.includePollAudience;

      // Authorisation: club owners can only target their own clubs + members of those clubs.
      let safeUserIds = overrideUserIds;
      let safeClubIds = overrideClubIds;
      if (!isAdmin) {
        const owned = (await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id))).map(c => c.id);
        safeClubIds = safeClubIds.filter(id => owned.includes(id));
        if (safeUserIds.length > 0 && owned.length > 0) {
          const memberRows = await db.select({ userId: clubMemberships.userId })
            .from(clubMemberships)
            .where(and(inArray(clubMemberships.clubId, owned), inArray(clubMemberships.userId, safeUserIds)));
          const allowed = new Set(memberRows.map(m => m.userId));
          safeUserIds = safeUserIds.filter(id => allowed.has(id));
        } else { safeUserIds = []; }
      }

      // Build recipient set
      const recipients = new Set<number>();
      safeUserIds.forEach(id => recipients.add(id));
      if (safeClubIds.length > 0) {
        const rows = await db.select({ userId: clubMemberships.userId })
          .from(clubMemberships).where(inArray(clubMemberships.clubId, safeClubIds));
        rows.forEach(r => recipients.add(r.userId));
      }
      if (includePollAudience) {
        const fromPoll = await resolveRecipientIds(poll);
        fromPoll.forEach(id => recipients.add(id));
      }

      const ids = Array.from(recipients);
      if (ids.length === 0) return res.status(400).json({ message: "No recipients selected" });

      // Cache-buster query param so each send produces a fresh notification row
      const sentAt = Date.now();
      await db.insert(notifications).values(ids.map(uid => ({
        userId: uid,
        type: "customPoll",
        title: `Poll: ${poll.title}`,
        message: `${poll.question} — tap to vote`,
        linkUrl: `/?poll=${poll.id}&t=${sentAt}`,
      })));

      res.json({ sent: ids.length });
    } catch (e: any) {
      console.error("[CUSTOM POLLS] broadcast failed:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Helper: list clubs the current user can target
  app.get("/api/custom-polls/targetable-clubs", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (isAdminish(user)) {
        const all = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).orderBy(clubs.name);
        return res.json({ canTargetAll: true, clubs: all });
      }
      const owned = await db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(eq(clubs.ownerId, user.id)).orderBy(clubs.name);
      res.json({ canTargetAll: false, clubs: owned });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}
