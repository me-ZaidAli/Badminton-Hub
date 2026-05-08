import type { Express, Request, Response, NextFunction } from "express";
import { eq, desc, and, sql as dsql, inArray } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  bslLeagues, bslClubs, bslTeams, bslPlayers, bslLeagueDays,
  bslFixtures, bslRubbers, bslWalletTransactions, bslAuditLog, bslMedia, users,
  bslTeamMembers,
} from "@shared/schema";
import { sendRulePush } from "./notificationRules";

async function audit(req: Request, action: string, entity: string, entityId: number | null, detail?: any) {
  try {
    const u = (req as any).user;
    await db.insert(bslAuditLog).values({
      actorUserId: u?.id ?? null,
      actorRole: u?.role ?? null,
      action, entity, entityId: entityId ?? null,
      detail: detail ?? null,
    });
  } catch { /* never block on audit */ }
}

function authed(req: Request): req is Request & { user: any } {
  return !!(req as any).isAuthenticated?.() && !!(req as any).user;
}
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!authed(req)) return res.status(401).json({ message: "Not authenticated" });
  next();
}
function isOwner(user: any) { return user?.role === "OWNER"; }
function isAdminish(user: any) { return user?.role === "OWNER" || user?.role === "ADMIN"; }
function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!authed(req)) return res.status(401).json({ message: "Not authenticated" });
  if (!isOwner((req as any).user)) return res.status(403).json({ message: "Owner only" });
  next();
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!authed(req)) return res.status(401).json({ message: "Not authenticated" });
  if (!isAdminish((req as any).user)) return res.status(403).json({ message: "Admin only" });
  next();
}

function genRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function genInvite() {
  return Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ========== UPLOADS ==========
const bslUploadDir = path.join(process.cwd(), "public", "uploads", "bsl");
if (!fs.existsSync(bslUploadDir)) fs.mkdirSync(bslUploadDir, { recursive: true });
const bslStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, bslUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `bsl-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const bslUpload = multer({
  storage: bslStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ========== STANDINGS RECOMPUTE ==========
async function recomputeStandings(leagueId = 1) {
  const teams = await db.select().from(bslTeams);
  const fixtures = await db.select().from(bslFixtures);
  const finished = fixtures.filter(f => f.status === "FINISHED");
  const stats: Record<number, { p: number; w: number; d: number; l: number; rf: number; ra: number; pts: number }> = {};
  teams.forEach(t => { stats[t.id] = { p: 0, w: 0, d: 0, l: 0, rf: 0, ra: 0, pts: 0 }; });
  for (const f of finished) {
    const h = stats[f.homeTeamId]; const a = stats[f.awayTeamId];
    if (!h || !a) continue;
    h.p++; a.p++;
    h.rf += f.homeRubbers; h.ra += f.awayRubbers;
    a.rf += f.awayRubbers; a.ra += f.homeRubbers;
    if (f.homeRubbers > f.awayRubbers) { h.w++; a.l++; h.pts += 3; }
    else if (f.homeRubbers < f.awayRubbers) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  for (const t of teams) {
    const s = stats[t.id];
    await db.update(bslTeams).set({
      played: s.p, won: s.w, drawn: s.d, lost: s.l,
      rubbersFor: s.rf, rubbersAgainst: s.ra, points: s.pts,
    }).where(eq(bslTeams.id, t.id));
  }
}

export function registerBslRoutes(app: Express) {
  // === LEAGUE CONFIG ===
  app.get("/api/bsl/league", async (_req, res) => {
    try {
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      if (!league) return res.status(404).json({ message: "League not configured" });
      res.json(league);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/league", requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const allowedStr = ["name", "tagline", "venueName", "bankAccountName", "bankSortCode", "bankAccountNumber", "matchFormat", "brandingPrimary", "brandingAccent"];
      const allowedInt = ["clubFee", "playerFee", "pointsWin", "pointsDraw", "pointsLoss", "courtCount"];
      const update: Record<string, any> = { updatedAt: new Date() };
      for (const k of allowedStr) {
        if (k in body) update[k] = body[k] === null ? null : String(body[k] ?? "");
      }
      for (const k of allowedInt) {
        if (k in body) {
          const n = Number(body[k]);
          if (Number.isFinite(n)) update[k] = Math.max(0, Math.round(n));
        }
      }
      if ("notificationsEnabled" in body) update.notificationsEnabled = !!body.notificationsEnabled;
      // Per-category player fees (pence). Only accept known cats, coerce to non-negative ints.
      if ("categoryFees" in body && body.categoryFees && typeof body.categoryFees === "object") {
        const cleaned: Record<string, number> = {};
        for (const cat of ["MD", "WD", "XD"]) {
          const n = Number((body.categoryFees as any)[cat]);
          if (Number.isFinite(n)) cleaned[cat] = Math.max(0, Math.round(n));
        }
        if (Object.keys(cleaned).length > 0) update.categoryFees = cleaned;
      }
      if ("nextLeagueDay" in body) {
        const v = body.nextLeagueDay;
        if (!v) update.nextLeagueDay = null;
        else {
          const d = v instanceof Date ? v : new Date(v);
          if (!isNaN(d.getTime())) update.nextLeagueDay = d;
        }
      }
      const [updated] = await db.update(bslLeagues).set(update as any)
        .where(eq(bslLeagues.id, 1)).returning();
      if (!updated) {
        // No row with id=1 — seed one and retry
        const [created] = await db.insert(bslLeagues).values({ id: 1, ...update } as any).returning();
        return res.json(created);
      }
      res.json(updated);
    } catch (err: any) {
      console.error("[BSL PATCH /api/bsl/league] failed:", err);
      res.status(500).json({ message: err.message || "Failed to save settings" });
    }
  });

  // === CLUBS ===
  app.get("/api/bsl/clubs", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const all = await db.select().from(bslClubs).orderBy(desc(bslClubs.createdAt));
      const filtered = isAdminish(user) ? all : all.filter(c => c.managerUserId === user.id || c.status === "ACTIVE");
      res.json(filtered);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/bsl/clubs/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!club) return res.status(404).json({ message: "Not found" });
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, id));
      res.json({ ...club, teams });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/clubs", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, division, categoryPairs, categories, logoUrl, clubId } = req.body;
      if (!name || !division) return res.status(400).json({ message: "Name and division required" });
      const ALLOWED_CATEGORIES = ["MD", "WD", "XD"];
      const CATEGORY_LABEL: Record<string, string> = { MD: "Men's Doubles", WD: "Women's Doubles", XD: "Mixed Doubles" };
      const CATEGORY_SHORT: Record<string, string> = { MD: "MD", WD: "WD", XD: "XD" };
      // Normalise pairs map: { MD: 2, WD: 1, XD: 0 } — allow legacy `categories` array (1 pair each)
      const pairs: Record<string, number> = {};
      if (categoryPairs && typeof categoryPairs === "object") {
        for (const cat of ALLOWED_CATEGORIES) {
          const n = Number((categoryPairs as any)[cat]);
          if (Number.isFinite(n) && n > 0) pairs[cat] = Math.min(8, Math.floor(n));
        }
      } else if (Array.isArray(categories)) {
        for (const c of categories) if (typeof c === "string" && ALLOWED_CATEGORIES.includes(c)) pairs[c] = 1;
      }
      const totalPairs = Object.values(pairs).reduce((s, n) => s + n, 0);
      if (totalPairs === 0) {
        return res.status(400).json({ message: "Register at least one pair across Men's, Women's, or Mixed Doubles" });
      }
      const paymentReference = genRef("BSL-CLUB");
      const [created] = await db.insert(bslClubs).values({
        name, division,
        teamCount: totalPairs,
        categories: Object.keys(pairs),
        categoryPairs: pairs,
        logoUrl: logoUrl || null,
        clubId: clubId || null, managerUserId: user.id, paymentReference,
      } as any).returning();
      // Auto-create one team per pair, lettered A/B/C... within each category
      const teamRows: any[] = [];
      for (const cat of ALLOWED_CATEGORIES) {
        const count = pairs[cat] || 0;
        for (let i = 0; i < count; i++) {
          const letter = String.fromCharCode(65 + i);
          const suffix = count > 1 ? ` Pair ${letter}` : "";
          teamRows.push({
            bslClubId: created.id,
            name: `${created.name} ${CATEGORY_SHORT[cat]}${suffix}`,
            division: created.division,
            category: cat,
            pairNumber: i + 1,
          });
        }
      }
      if (teamRows.length) await db.insert(bslTeams).values(teamRows as any);
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/clubs/:id/payment-proof", requireAuth, bslUpload.single("proof"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const proofUrl = `/uploads/bsl/${file.filename}`;
      const [updated] = await db.update(bslClubs)
        .set({ paymentProofUrl: proofUrl, status: "PENDING_VERIFICATION" })
        .where(eq(bslClubs.id, id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/clubs/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.status === "ACTIVE") return res.status(409).json({ message: "Club already active", club: existing });
      if (existing.status === "REJECTED") return res.status(409).json({ message: "Club is REJECTED — cannot approve" });
      const inviteCode = existing.inviteCode || genInvite();
      const [updated] = await db.update(bslClubs).set({
        status: "ACTIVE", inviteCode, approvedAt: new Date(), approvedById: user.id,
      }).where(and(eq(bslClubs.id, id), eq(bslClubs.status, existing.status))).returning();
      if (!updated) return res.status(409).json({ message: "Status changed during approval, please retry" });
      await audit(req, "club.approved", "bsl_club", id, { from: existing.status, to: "ACTIVE", inviteCode });
      // Notify the club's primary contact
      try {
        if (updated.contactUserId) {
          sendRulePush(
            "bslClubApproved",
            [updated.contactUserId],
            { inviteCode: updated.inviteCode || "" },
            { url: "/bsl", dedupe: { refType: "bsl-club-approved", refId: updated.id } },
          ).catch(e => console.error("[push bslClubApproved]", e));
        }
      } catch {}
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/clubs/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.status === "ACTIVE") return res.status(409).json({ message: "Cannot reject an ACTIVE club" });
      if (existing.status === "REJECTED") return res.json(existing);
      const [updated] = await db.update(bslClubs).set({
        status: "REJECTED", rejectionReason: req.body.reason || "Rejected by admin",
      }).where(and(eq(bslClubs.id, id), eq(bslClubs.status, existing.status))).returning();
      await audit(req, "club.rejected", "bsl_club", id, { from: existing.status, reason: req.body.reason || null });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin toggle a club's registration payment between MARKED-PAID (ACTIVE) and
  // PENDING_PAYMENT. PENDING_PAYMENT removes the club from the public list
  // (the public `/api/bsl/clubs` filter only returns ACTIVE clubs to non-admins).
  // Both transitions are recorded in the BSL audit log.
  app.patch("/api/bsl/admin/clubs/:id/payment-status", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = (req as any).user;
      const target = String(req.body?.status || "").toUpperCase();
      if (target !== "ACTIVE" && target !== "PENDING_PAYMENT") {
        return res.status(400).json({ message: "status must be ACTIVE or PENDING_PAYMENT" });
      }
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (existing.status === target) return res.status(409).json({ message: `Club already ${target}`, club: existing });

      if (target === "ACTIVE") {
        const inviteCode = existing.inviteCode || genInvite();
        const [updated] = await db.update(bslClubs).set({
          status: "ACTIVE",
          inviteCode,
          approvedAt: new Date(),
          approvedById: u.id,
          rejectionReason: null,
        }).where(and(eq(bslClubs.id, id), eq(bslClubs.status, existing.status))).returning();
        if (!updated) return res.status(409).json({ message: "Status changed during update, please retry" });
        await audit(req, "club.payment.marked-paid", "bsl_club", id, {
          from: existing.status, to: "ACTIVE", inviteCode, reason: req.body?.reason || null,
        });
        // Reuse the same notification as a regular approval
        try {
          if ((updated as any).contactUserId) {
            sendRulePush(
              "bslClubApproved",
              [(updated as any).contactUserId],
              { inviteCode: updated.inviteCode || "" },
              { url: "/bsl", dedupe: { refType: "bsl-club-approved", refId: updated.id } },
            ).catch(e => console.error("[push bslClubApproved]", e));
          }
        } catch {}
        return res.json(updated);
      }

      // target === "PENDING_PAYMENT" — flip the club back to awaiting payment.
      // We deliberately keep inviteCode/approvedAt so re-marking paid restores
      // the same invite code; the public list filter already hides the club.
      const [updated] = await db.update(bslClubs).set({
        status: "PENDING_PAYMENT",
      }).where(and(eq(bslClubs.id, id), eq(bslClubs.status, existing.status))).returning();
      if (!updated) return res.status(409).json({ message: "Status changed during update, please retry" });
      await audit(req, "club.payment.marked-pending", "bsl_club", id, {
        from: existing.status, to: "PENDING_PAYMENT", reason: req.body?.reason || null,
      });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === PLAYERS ===
  app.get("/api/bsl/players/me", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, user.id)).limit(1);
      res.json(p || null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/players/join", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { inviteCode, teamId } = req.body;
      if (!inviteCode) return res.status(400).json({ message: "Invite code required" });
      const [club] = await db.select().from(bslClubs).where(and(eq(bslClubs.inviteCode, inviteCode), eq(bslClubs.status, "ACTIVE"))).limit(1);
      if (!club) return res.status(404).json({ message: "Invalid or inactive invite code" });
      const existing = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, user.id)).limit(1);
      if (existing.length) return res.status(400).json({ message: "Already registered as BSL player" });
      const paymentReference = genRef("BSL-PLR");
      const [created] = await db.insert(bslPlayers).values({
        userId: user.id, bslClubId: club.id, bslTeamId: teamId || null, paymentReference,
      } as any).returning();
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/players/:id/payment-proof", requireAuth, bslUpload.single("proof"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const proofUrl = `/uploads/bsl/${file.filename}`;
      const [updated] = await db.update(bslPlayers).set({
        paymentProofUrl: proofUrl, status: "PENDING_VERIFICATION",
      }).where(eq(bslPlayers.id, id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/players/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const [updated] = await db.update(bslPlayers).set({
        status: "ACTIVE", approvedAt: new Date(), approvedById: user.id,
      }).where(eq(bslPlayers.id, id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/players/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(bslPlayers).set({
        status: "REJECTED", rejectionReason: req.body.reason || "Rejected by admin",
      }).where(eq(bslPlayers.id, id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === STANDINGS (one row per club; stats aggregated across all the club's pairs) ===
  app.get("/api/bsl/standings", async (req, res) => {
    try {
      const division = req.query.division as string | undefined;
      const teamsQ = division
        ? db.select().from(bslTeams).where(eq(bslTeams.division, division))
        : db.select().from(bslTeams);
      const teams = await teamsQ;
      const clubs = await db.select().from(bslClubs);
      const clubMap = new Map(clubs.map(c => [c.id, c]));
      // Aggregate by club
      type Row = { id: number; name: string; clubName: string; clubLogo: string | null; division: string; played: number; won: number; drawn: number; lost: number; rubbersFor: number; rubbersAgainst: number; points: number; rubberDiff: number; categories: string[] };
      const byClub = new Map<number, Row>();
      for (const t of teams) {
        const club = clubMap.get(t.bslClubId);
        if (!club) continue;
        if (division && club.division !== division && t.division !== division) continue;
        let row = byClub.get(t.bslClubId);
        if (!row) {
          row = {
            id: t.bslClubId,
            name: club.name,
            clubName: club.name,
            clubLogo: club.logoUrl || null,
            division: club.division || t.division,
            played: 0, won: 0, drawn: 0, lost: 0,
            rubbersFor: 0, rubbersAgainst: 0, points: 0,
            rubberDiff: 0,
            categories: [],
          };
          byClub.set(t.bslClubId, row);
        }
        row.played += t.played || 0;
        row.won += t.won || 0;
        row.drawn += t.drawn || 0;
        row.lost += t.lost || 0;
        row.rubbersFor += t.rubbersFor || 0;
        row.rubbersAgainst += t.rubbersAgainst || 0;
        row.points += t.points || 0;
        if (t.category && !row.categories.includes(t.category)) row.categories.push(t.category);
      }
      const enriched = Array.from(byClub.values()).map(r => ({ ...r, rubberDiff: r.rubbersFor - r.rubbersAgainst }));
      enriched.sort((a, b) => b.points - a.points || b.rubberDiff - a.rubberDiff || b.rubbersFor - a.rubbersFor);
      res.json(enriched.map((r, i) => ({ ...r, position: i + 1 })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === FIXTURES ===
  app.get("/api/bsl/fixtures", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const all = await db.select().from(bslFixtures).orderBy(bslFixtures.startTime);
      const teams = await db.select().from(bslTeams);
      const clubs = await db.select().from(bslClubs);
      const tMap = new Map(teams.map(t => [t.id, t]));
      const cMap = new Map(clubs.map(c => [c.id, c]));
      const enriched = all.map(f => {
        const ht = tMap.get(f.homeTeamId);
        const at = tMap.get(f.awayTeamId);
        return {
          ...f,
          homeTeamName: ht?.name || "TBD",
          awayTeamName: at?.name || "TBD",
          homeClubLogo: ht ? cMap.get(ht.bslClubId)?.logoUrl : null,
          awayClubLogo: at ? cMap.get(at.bslClubId)?.logoUrl : null,
        };
      });
      const filtered = status ? enriched.filter(f => f.status === status) : enriched;
      res.json(filtered);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/bsl/fixtures/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [fixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, id)).limit(1);
      if (!fixture) return res.status(404).json({ message: "Not found" });
      const rubbers = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, id)).orderBy(bslRubbers.rubberNumber);
      const teams = await db.select().from(bslTeams).where(inArray(bslTeams.id, [fixture.homeTeamId, fixture.awayTeamId]));
      res.json({ ...fixture, rubbers, teams });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/fixtures", requireAdmin, async (req, res) => {
    try {
      const { homeTeamId, awayTeamId, court, startTime, bslLeagueDayId } = req.body;
      const [created] = await db.insert(bslFixtures).values({
        homeTeamId, awayTeamId, court: court || null,
        startTime: startTime ? new Date(startTime) : null,
        bslLeagueDayId: bslLeagueDayId || null,
      } as any).returning();
      // Seed 6 standard rubbers
      const types = ["MS1", "MS2", "WS", "MD", "WD", "XD"] as const;
      await db.insert(bslRubbers).values(
        types.map((t, i) => ({ bslFixtureId: created.id, rubberNumber: i + 1, rubberType: t }))
      );
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/fixtures/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { court, status, startTime } = req.body;
      const patch: any = {};
      if (court !== undefined) patch.court = court;
      if (status) patch.status = status;
      if (startTime) patch.startTime = new Date(startTime);
      const [updated] = await db.update(bslFixtures).set(patch).where(eq(bslFixtures.id, id)).returning();
      if (status === "FINISHED") await recomputeStandings();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/rubbers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { homeScore, awayScore, status } = req.body;
      const patch: any = {};
      if (homeScore !== undefined) patch.homeScore = homeScore;
      if (awayScore !== undefined) patch.awayScore = awayScore;
      if (status) patch.status = status;
      const [updated] = await db.update(bslRubbers).set(patch).where(eq(bslRubbers.id, id)).returning();
      // Recompute fixture rubber tally
      const allRubbers = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, updated.bslFixtureId));
      const homeR = allRubbers.filter(r => r.homeScore > r.awayScore).length;
      const awayR = allRubbers.filter(r => r.awayScore > r.homeScore).length;
      await db.update(bslFixtures).set({ homeRubbers: homeR, awayRubbers: awayR })
        .where(eq(bslFixtures.id, updated.bslFixtureId));
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === MVP / TOP PERFORMERS ===
  app.get("/api/bsl/mvp", async (_req, res) => {
    try {
      const players = await db.select().from(bslPlayers).where(eq(bslPlayers.status, "ACTIVE"));
      const top = players
        .sort((a, b) => b.matchesWon - a.matchesWon || b.pointsScored - a.pointsScored)
        .slice(0, 5);
      res.json(top);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === WALLET ===
  app.get("/api/bsl/wallet/me", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, user.id)).limit(1);
      if (!p) return res.json({ balance: 0, transactions: [] });
      const txs = await db.select().from(bslWalletTransactions)
        .where(eq(bslWalletTransactions.bslPlayerId, p.id)).orderBy(desc(bslWalletTransactions.createdAt));
      res.json({ balance: p.walletBalance, playerId: p.id, transactions: txs });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/wallet/topup", requireAuth, bslUpload.single("proof"), async (req, res) => {
    try {
      const user = (req as any).user;
      const amount = Math.trunc(Number(req.body.amount));
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0 || amount > 1_000_000)
        return res.status(400).json({ message: "Amount must be a positive integer in pence (max £10,000)" });
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, user.id)).limit(1);
      if (!p) return res.status(404).json({ message: "BSL player not found" });
      const file = (req as any).file;
      const reference = genRef("BSL-TOPUP");
      const [tx] = await db.insert(bslWalletTransactions).values({
        bslPlayerId: p.id, type: "TOPUP", amount, reference,
        proofUrl: file ? `/uploads/bsl/${file.filename}` : null,
        description: req.body.description || "Wallet top-up",
      } as any).returning();
      res.json(tx);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/wallet/transactions/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      // Idempotency: only flip PENDING -> APPROVED in a single conditional UPDATE, then mutate balance only if we
      // actually changed a row. Prevents double-credit on rapid clicks / race conditions.
      const [tx] = await db.select().from(bslWalletTransactions).where(eq(bslWalletTransactions.id, id)).limit(1);
      if (!tx) return res.status(404).json({ message: "Not found" });
      if (tx.status === "APPROVED") return res.json(tx);
      if (tx.status === "REJECTED") return res.status(409).json({ message: "Transaction already REJECTED" });
      const updatedRows = await db.update(bslWalletTransactions).set({
        status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(),
      }).where(and(eq(bslWalletTransactions.id, id), eq(bslWalletTransactions.status, "PENDING"))).returning();
      if (!updatedRows.length) {
        // Race: someone else flipped status in the meantime — refetch and return current state.
        const [latest] = await db.select().from(bslWalletTransactions).where(eq(bslWalletTransactions.id, id)).limit(1);
        return res.status(409).json({ message: "Transaction state changed", tx: latest });
      }
      const delta = tx.type === "TOPUP" ? tx.amount : -tx.amount;
      await db.update(bslPlayers).set({ walletBalance: dsql`${bslPlayers.walletBalance} + ${delta}` })
        .where(eq(bslPlayers.id, tx.bslPlayerId));
      try {
        const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, tx.bslPlayerId)).limit(1);
        if (player?.userId && tx.type === "TOPUP") {
          const amountStr = `£${(tx.amount / 100).toFixed(2)}`;
          sendRulePush(
            "bslWalletApproved",
            [player.userId],
            { amount: amountStr },
            { url: "/bsl/wallet", dedupe: { refType: "bsl-wallet-approved", refId: tx.id } },
          ).catch(e => console.error("[push bslWalletApproved]", e));
        }
      } catch {}
      res.json(updatedRows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/wallet/transactions/:id/reject", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const [tx] = await db.select().from(bslWalletTransactions).where(eq(bslWalletTransactions.id, id)).limit(1);
      if (!tx) return res.status(404).json({ message: "Not found" });
      if (tx.status === "APPROVED") return res.status(409).json({ message: "Cannot reject an APPROVED transaction" });
      if (tx.status === "REJECTED") return res.json(tx);
      const updatedRows = await db.update(bslWalletTransactions).set({
        status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(),
      }).where(and(eq(bslWalletTransactions.id, id), eq(bslWalletTransactions.status, "PENDING"))).returning();
      if (!updatedRows.length) return res.status(409).json({ message: "Transaction state changed" });
      res.json(updatedRows[0]);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === ADMIN PENDING QUEUE ===
  app.get("/api/bsl/admin/pending", requireAdmin, async (_req, res) => {
    try {
      const clubs = await db.select().from(bslClubs).where(eq(bslClubs.status, "PENDING_VERIFICATION"));
      const players = await db.select().from(bslPlayers).where(eq(bslPlayers.status, "PENDING_VERIFICATION"));
      const wallets = await db.select().from(bslWalletTransactions).where(eq(bslWalletTransactions.status, "PENDING"));
      res.json({ clubs, players, wallets });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === TEAMS (for join flow) ===
  app.get("/api/bsl/clubs/:id/teams", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, id));
      res.json(teams);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ========================================================================
  // ====== ADMIN CONTROL PANEL =============================================
  // ========================================================================

  // --- DASHBOARD: aggregate stats + alerts ---
  app.get("/api/bsl/admin/dashboard", requireAdmin, async (_req, res) => {
    try {
      const [allClubs, allPlayers, allFixtures, allTx] = await Promise.all([
        db.select().from(bslClubs),
        db.select().from(bslPlayers),
        db.select().from(bslFixtures),
        db.select().from(bslWalletTransactions),
      ]);
      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
      const todaysFixtures = allFixtures.filter(f => f.startTime && f.startTime >= today && f.startTime < tomorrow);
      const liveCourts = new Set(allFixtures.filter(f => f.status === "LIVE" && f.court != null).map(f => f.court));
      const pendingPayments = allClubs.filter(c => c.status === "PENDING_VERIFICATION").length
        + allPlayers.filter(p => p.status === "PENDING_VERIFICATION").length
        + allTx.filter(t => t.status === "PENDING").length;
      res.json({
        activeClubs: allClubs.filter(c => c.status === "ACTIVE" && !c.isSuspended).length,
        totalClubs: allClubs.length,
        flaggedClubs: allClubs.filter(c => c.isFlagged).length,
        suspendedClubs: allClubs.filter(c => c.isSuspended).length,
        activePlayers: allPlayers.filter(p => p.status === "ACTIVE" && !p.isSuspended).length,
        totalPlayers: allPlayers.length,
        suspendedPlayers: allPlayers.filter(p => p.isSuspended).length,
        todaysMatches: todaysFixtures.length,
        liveMatches: allFixtures.filter(f => f.status === "LIVE").length,
        liveCourts: liveCourts.size,
        completedMatches: allFixtures.filter(f => f.status === "FINISHED").length,
        pendingPayments,
        pendingClubApprovals: allClubs.filter(c => c.status === "PENDING_VERIFICATION").length,
        pendingPlayerApprovals: allPlayers.filter(p => p.status === "PENDING_VERIFICATION").length,
        pendingWalletTopups: allTx.filter(t => t.status === "PENDING").length,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: list ALL clubs (with filters) ---
  app.get("/api/bsl/admin/clubs", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const division = req.query.division as string | undefined;
      const q = (req.query.q as string | undefined)?.toLowerCase().trim();
      let rows = await db.select().from(bslClubs).orderBy(desc(bslClubs.createdAt));
      if (status) rows = rows.filter(r => r.status === status);
      if (division) rows = rows.filter(r => r.division === division);
      if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.paymentReference.toLowerCase().includes(q));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: list ALL players (with filters + user info) ---
  app.get("/api/bsl/admin/players", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const clubId = req.query.clubId ? Number(req.query.clubId) : undefined;
      const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
      const q = (req.query.q as string | undefined)?.toLowerCase().trim();
      let rows = await db.select().from(bslPlayers).orderBy(desc(bslPlayers.createdAt));
      if (status) rows = rows.filter(r => r.status === status);
      if (clubId) rows = rows.filter(r => r.bslClubId === clubId);
      if (teamId) rows = rows.filter(r => r.bslTeamId === teamId);
      // Hydrate with user displayName
      const userIds = Array.from(new Set(rows.map(r => r.userId)));
      const usersList = userIds.length
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(usersList.map(u => [u.id, u]));
      const hydrated = rows.map(r => {
        const u = userMap.get(r.userId);
        return { ...r, displayName: u?.fullName || u?.username || `Player #${r.userId}`, email: u?.email };
      }).filter(r => !q || r.displayName.toLowerCase().includes(q) || (r.email||"").toLowerCase().includes(q));
      res.json(hydrated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: edit/suspend/flag club ---
  app.patch("/api/bsl/admin/clubs/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const allow = ["name", "division", "teamCount", "logoUrl", "isFlagged", "isSuspended", "adminNotes"];
      const patch: any = {};
      for (const k of allow) if (k in req.body) patch[k] = req.body[k];
      if (Object.keys(patch).length === 0) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslClubs).set(patch).where(eq(bslClubs.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Club not found" });
      await audit(req, "UPDATE_CLUB", "bsl_club", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: edit player (team assign, discipline, stat correction) ---
  app.patch("/api/bsl/admin/players/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const allow = ["bslTeamId", "bslClubId", "warnings", "isSuspended", "matchBanCount", "disciplineNotes",
                     "matchesPlayed", "matchesWon", "pointsScored", "walletBalance"];
      const patch: any = {};
      for (const k of allow) if (k in req.body) patch[k] = req.body[k];
      if (Object.keys(patch).length === 0) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslPlayers).set(patch).where(eq(bslPlayers.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Player not found" });
      await audit(req, "UPDATE_PLAYER", "bsl_player", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: round-robin fixture generation per division ---
  app.post("/api/bsl/admin/fixtures/generate", requireAdmin, async (req, res) => {
    try {
      const { division, leagueDayId } = req.body as { division: string; leagueDayId?: number };
      if (!division) return res.status(400).json({ message: "division required" });
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.division, division));
      if (teams.length < 2) return res.status(400).json({ message: "Need ≥2 teams in division" });
      // Round-robin (circle method)
      const list = teams.slice();
      if (list.length % 2 === 1) list.push({ id: -1 } as any); // bye marker
      const n = list.length;
      const rounds = n - 1;
      const half = n / 2;
      const created: any[] = [];
      const arr = list.slice();
      for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < half; i++) {
          const home = arr[i]; const away = arr[n - 1 - i];
          if (home.id === -1 || away.id === -1) continue;
          const [f] = await db.insert(bslFixtures).values({
            bslLeagueDayId: leagueDayId ?? null,
            homeTeamId: r % 2 === 0 ? home.id : away.id,
            awayTeamId: r % 2 === 0 ? away.id : home.id,
            court: null,
            startTime: null,
          }).returning();
          // seed 6 rubbers
          const types: any[] = ["MS1","MS2","WS","MD","WD","XD"];
          for (let k = 0; k < types.length; k++) {
            await db.insert(bslRubbers).values({
              bslFixtureId: f.id, rubberNumber: k+1, rubberType: types[k],
            });
          }
          created.push(f);
        }
        // rotate (keep first fixed)
        arr.splice(1, 0, arr.pop()!);
      }
      await audit(req, "GENERATE_FIXTURES", "bsl_division", null, { division, leagueDayId, count: created.length });
      res.json({ created: created.length, fixtures: created });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: control match status (start/pause/end/delay) ---
  app.patch("/api/bsl/admin/fixtures/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body.status as string;
      const allowed = ["SCHEDULED", "WARMUP", "LIVE", "FINISHED"];
      if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
      const [updated] = await db.update(bslFixtures).set({ status: status as any }).where(eq(bslFixtures.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Fixture not found" });
      if (status === "FINISHED") await recomputeStandings();
      await audit(req, "UPDATE_FIXTURE_STATUS", "bsl_fixture", id, { status });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: league days CRUD ---
  app.get("/api/bsl/admin/league-days", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(bslLeagueDays).orderBy(desc(bslLeagueDays.date));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/admin/league-days", requireAdmin, async (req, res) => {
    try {
      const { date, status } = req.body;
      if (!date) return res.status(400).json({ message: "date required" });
      const [row] = await db.insert(bslLeagueDays).values({
        bslLeagueId: 1, date: new Date(date), status: status || "UPCOMING",
      }).returning();
      await audit(req, "CREATE_LEAGUE_DAY", "bsl_league_day", row.id, { date });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/bsl/admin/league-days/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(bslLeagueDays).where(eq(bslLeagueDays.id, id));
      await audit(req, "DELETE_LEAGUE_DAY", "bsl_league_day", id, null);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- PAYMENTS: list all transactions + CSV export ---
  app.get("/api/bsl/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      let rows = await db.select().from(bslWalletTransactions).orderBy(desc(bslWalletTransactions.createdAt));
      if (status) rows = rows.filter(r => r.status === status);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/bsl/admin/payments/export.csv", requireAdmin, async (_req, res) => {
    try {
      const [clubs, players, txs] = await Promise.all([
        db.select().from(bslClubs),
        db.select().from(bslPlayers),
        db.select().from(bslWalletTransactions),
      ]);
      const lines: string[] = ["type,id,reference,amount_pence,status,subject_id,created_at"];
      clubs.forEach(c => lines.push(`CLUB_FEE,${c.id},${c.paymentReference},50000,${c.status},${c.id},${c.createdAt.toISOString()}`));
      players.forEach(p => lines.push(`PLAYER_FEE,${p.id},${p.paymentReference},2500,${p.status},${p.id},${p.createdAt.toISOString()}`));
      txs.forEach(t => lines.push(`WALLET_${t.type},${t.id},${t.reference},${t.amount},${t.status},${t.bslPlayerId},${t.createdAt.toISOString()}`));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="bsl-payments-${Date.now()}.csv"`);
      res.send(lines.join("\n"));
      await audit(_req as any, "EXPORT_PAYMENTS_CSV", "bsl_payments", null, { rows: lines.length - 1 });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- AUDIT LOG ---
  app.get("/api/bsl/admin/audit", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const rows = await db.select().from(bslAuditLog).orderBy(desc(bslAuditLog.createdAt)).limit(limit);
      const userIds = Array.from(new Set(rows.map(r => r.actorUserId).filter(Boolean) as number[]));
      const usersList = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
      const userMap = new Map(usersList.map(u => [u.id, u]));
      res.json(rows.map(r => ({
        ...r,
        actorName: r.actorUserId ? (userMap.get(r.actorUserId)?.fullName || userMap.get(r.actorUserId)?.username || `User #${r.actorUserId}`) : "system",
      })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- MEDIA ---
  app.get("/api/bsl/admin/media", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(bslMedia).orderBy(desc(bslMedia.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/admin/media", requireAdmin, bslUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "file required" });
      const url = `/uploads/bsl/${req.file.filename}`;
      const taggedClubId = req.body.taggedClubId ? Number(req.body.taggedClubId) : null;
      const taggedPlayerId = req.body.taggedPlayerId ? Number(req.body.taggedPlayerId) : null;
      const [row] = await db.insert(bslMedia).values({
        url, caption: req.body.caption || null, taggedClubId, taggedPlayerId,
        isMvp: req.body.isMvp === "true", isFeatured: req.body.isFeatured === "true",
        uploadedById: (req as any).user.id,
      }).returning();
      await audit(req, "UPLOAD_MEDIA", "bsl_media", row.id, { url });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/admin/media/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const allow = ["caption", "taggedClubId", "taggedPlayerId", "isMvp", "isFeatured"];
      const patch: any = {};
      for (const k of allow) if (k in req.body) patch[k] = req.body[k];
      const [row] = await db.update(bslMedia).set(patch).where(eq(bslMedia.id, id)).returning();
      await audit(req, "UPDATE_MEDIA", "bsl_media", id, patch);
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/bsl/admin/media/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(bslMedia).where(eq(bslMedia.id, id));
      await audit(req, "DELETE_MEDIA", "bsl_media", id, null);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ============================================================
  // CLUB-OWNER CONTROL CENTER  (manager of bslClubs.managerUserId)
  // ============================================================
  const ALLOWED_CATS = ["MD", "WD", "XD"] as const;
  type Cat = typeof ALLOWED_CATS[number];

  async function loadOwnedClub(req: Request): Promise<{ club: any | null; canManage: boolean }> {
    const u = (req as any).user;
    if (!u) return { club: null, canManage: false };
    const [club] = await db.select().from(bslClubs).where(eq(bslClubs.managerUserId, u.id)).limit(1);
    return { club: club ?? null, canManage: !!club || isAdminish(u) };
  }

  async function loadClubForManager(req: Request, clubId: number): Promise<{ club: any | null; reason?: string }> {
    const u = (req as any).user;
    const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, clubId)).limit(1);
    if (!club) return { club: null, reason: "Club not found" };
    if (club.managerUserId !== u.id && !isAdminish(u)) return { club: null, reason: "Not your club" };
    return { club };
  }

  // Manager dashboard: club + teams (with members) + roster + pending join requests
  app.get("/api/bsl/my-club", requireAuth, async (req, res) => {
    try {
      const { club } = await loadOwnedClub(req);
      if (!club) return res.json({ club: null });
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, club.id));
      const teamIds = teams.map(t => t.id);
      const members = teamIds.length
        ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds))
        : [];
      // Confirmed roster = players linked to this club
      const roster = await db.select().from(bslPlayers).where(eq(bslPlayers.bslClubId, club.id));
      // Pending join requests = players who joined via invite code but not confirmed
      const pending = roster.filter(p => p.confirmedByOwnerAt == null);
      const confirmed = roster.filter(p => p.confirmedByOwnerAt != null);
      // Hydrate user names
      const userIds = Array.from(new Set(roster.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName, email: users.email }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(r => [r.id, r]));
      const hydrate = (p: any) => ({ ...p, user: userMap.get(p.userId) || null });
      res.json({
        club,
        teams: teams.map(t => ({ ...t, members: members.filter(m => m.bslTeamId === t.id).map(m => m.bslPlayerId) })),
        pending: pending.map(hydrate),
        confirmed: confirmed.map(hydrate),
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager (or admin) edits club details
  app.patch("/api/bsl/clubs/:id/manage", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const allow = ["name", "logoUrl", "division", "adminNotes"];
      const patch: any = {};
      for (const k of allow) if (k in req.body) patch[k] = req.body[k];
      if (!Object.keys(patch).length) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslClubs).set(patch).where(eq(bslClubs.id, id)).returning();
      await audit(req, "MANAGER_UPDATE_CLUB", "bsl_clubs", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager withdraws their club from the league (sets withdrawnAt + isSuspended)
  app.post("/api/bsl/clubs/:id/withdraw", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      if (club.withdrawnAt) return res.status(400).json({ message: "Club already withdrawn" });
      const [updated] = await db.update(bslClubs).set({
        withdrawnAt: new Date(), isSuspended: true,
        adminNotes: [club.adminNotes, `Withdrawn by manager ${new Date().toISOString()}: ${req.body.reason || "(no reason)"}`].filter(Boolean).join("\n"),
      }).where(eq(bslClubs.id, id)).returning();
      await audit(req, "MANAGER_WITHDRAW_CLUB", "bsl_clubs", id, { reason: req.body.reason });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin can reinstate a withdrawn club
  app.post("/api/bsl/clubs/:id/reinstate", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(bslClubs).set({
        withdrawnAt: null, isSuspended: false,
      }).where(eq(bslClubs.id, id)).returning();
      await audit(req, "REINSTATE_CLUB", "bsl_clubs", id, null);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager confirms a pending player onto the roster
  app.post("/api/bsl/clubs/:id/players/:playerId/confirm", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const playerId = Number(req.params.playerId);
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const [player] = await db.select().from(bslPlayers).where(and(eq(bslPlayers.id, playerId), eq(bslPlayers.bslClubId, id))).limit(1);
      if (!player) return res.status(404).json({ message: "Player not in your club" });
      const [updated] = await db.update(bslPlayers).set({
        confirmedByOwnerAt: new Date(),
      }).where(eq(bslPlayers.id, playerId)).returning();
      await audit(req, "MANAGER_CONFIRM_PLAYER", "bsl_players", playerId, null);
      try {
        await sendRulePush("bslClubApproved", [player.userId], { clubName: club.name }, { url: "/bsl", dedupe: { refType: "bsl-player-confirmed", refId: playerId } });
      } catch {}
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager removes a player from the roster (also strips them from any pairs)
  app.delete("/api/bsl/clubs/:id/players/:playerId", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const playerId = Number(req.params.playerId);
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const [player] = await db.select().from(bslPlayers).where(and(eq(bslPlayers.id, playerId), eq(bslPlayers.bslClubId, id))).limit(1);
      if (!player) return res.status(404).json({ message: "Player not in your club" });
      await db.delete(bslTeamMembers).where(eq(bslTeamMembers.bslPlayerId, playerId));
      await db.update(bslPlayers).set({
        bslClubId: null, bslTeamId: null, confirmedByOwnerAt: null,
      }).where(eq(bslPlayers.id, playerId));
      await audit(req, "MANAGER_REMOVE_PLAYER", "bsl_players", playerId, { fromClub: id });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager creates an extra pair within a category
  app.post("/api/bsl/clubs/:id/teams", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const category = String(req.body.category || "");
      if (!ALLOWED_CATS.includes(category as Cat)) return res.status(400).json({ message: "Invalid category" });
      const existing = await db.select().from(bslTeams).where(and(eq(bslTeams.bslClubId, id), eq(bslTeams.category, category)));
      const pairNumber = (existing.reduce((m, t) => Math.max(m, t.pairNumber || 0), 0) || 0) + 1;
      const letter = String.fromCharCode(64 + pairNumber); // A, B, C…
      const [created] = await db.insert(bslTeams).values({
        bslClubId: id,
        name: `${club.name} ${category} Pair ${letter}`,
        division: club.division,
        category, pairNumber,
      } as any).returning();
      await audit(req, "MANAGER_CREATE_PAIR", "bsl_teams", created.id, { category, pairNumber });
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager deletes an empty pair
  app.delete("/api/bsl/teams/:id/manage", requireAuth, async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      const [team] = await db.select().from(bslTeams).where(eq(bslTeams.id, teamId)).limit(1);
      if (!team) return res.status(404).json({ message: "Team not found" });
      const { club, reason } = await loadClubForManager(req, team.bslClubId);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      // Detach all members and delete
      await db.delete(bslTeamMembers).where(eq(bslTeamMembers.bslTeamId, teamId));
      await db.delete(bslTeams).where(eq(bslTeams.id, teamId));
      await audit(req, "MANAGER_DELETE_PAIR", "bsl_teams", teamId, null);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager assigns a confirmed player into a pair (max 2 per pair)
  app.post("/api/bsl/teams/:id/members", requireAuth, async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      const playerId = Number(req.body.bslPlayerId);
      if (!Number.isFinite(playerId)) return res.status(400).json({ message: "bslPlayerId required" });
      const [team] = await db.select().from(bslTeams).where(eq(bslTeams.id, teamId)).limit(1);
      if (!team) return res.status(404).json({ message: "Team not found" });
      const { club, reason } = await loadClubForManager(req, team.bslClubId);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, playerId)).limit(1);
      if (!player || player.bslClubId !== club.id) return res.status(400).json({ message: "Player not in this club" });
      if (!player.confirmedByOwnerAt) return res.status(400).json({ message: "Confirm the player first" });
      // Player must be registered for this category
      if (team.category && !(player.categories || []).includes(team.category)) {
        return res.status(400).json({ message: `Player has not registered for ${team.category}` });
      }
      const existing = await db.select().from(bslTeamMembers).where(eq(bslTeamMembers.bslTeamId, teamId));
      if (existing.length >= 2) return res.status(400).json({ message: "Pair is full (2 players max)" });
      if (existing.some(m => m.bslPlayerId === playerId)) return res.status(400).json({ message: "Already in pair" });
      // One player can only be in one pair per category — pull them off siblings first
      if (team.category) {
        const siblings = await db.select().from(bslTeams).where(and(eq(bslTeams.bslClubId, club.id), eq(bslTeams.category, team.category)));
        if (siblings.length) {
          await db.delete(bslTeamMembers).where(and(
            inArray(bslTeamMembers.bslTeamId, siblings.map(s => s.id)),
            eq(bslTeamMembers.bslPlayerId, playerId),
          ));
        }
      }
      const [row] = await db.insert(bslTeamMembers).values({ bslTeamId: teamId, bslPlayerId: playerId }).returning();
      // Mirror primary team for legacy code paths
      await db.update(bslPlayers).set({ bslTeamId: teamId }).where(eq(bslPlayers.id, playerId));
      await audit(req, "MANAGER_ADD_PAIR_MEMBER", "bsl_team_members", row.id, { teamId, playerId });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager removes a player from a pair
  app.delete("/api/bsl/teams/:id/members/:playerId", requireAuth, async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      const playerId = Number(req.params.playerId);
      const [team] = await db.select().from(bslTeams).where(eq(bslTeams.id, teamId)).limit(1);
      if (!team) return res.status(404).json({ message: "Team not found" });
      const { club, reason } = await loadClubForManager(req, team.bslClubId);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      await db.delete(bslTeamMembers).where(and(eq(bslTeamMembers.bslTeamId, teamId), eq(bslTeamMembers.bslPlayerId, playerId)));
      await audit(req, "MANAGER_REMOVE_PAIR_MEMBER", "bsl_team_members", null, { teamId, playerId });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ============================================================
  // PLAYER PROFILE  (the player themselves, not the manager)
  // ============================================================

  // Update display name + bio on /api/bsl/players/me
  app.patch("/api/bsl/players/me", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const [me] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, u.id)).limit(1);
      if (!me) return res.status(404).json({ message: "No BSL player profile yet" });
      const allow = ["displayName", "bio"];
      const patch: any = {};
      for (const k of allow) if (k in req.body) patch[k] = req.body[k];
      if (typeof patch.displayName === "string" && patch.displayName.length > 80) return res.status(400).json({ message: "Display name too long" });
      if (typeof patch.bio === "string" && patch.bio.length > 600) return res.status(400).json({ message: "Bio too long" });
      const [updated] = await db.update(bslPlayers).set(patch).where(eq(bslPlayers.id, me.id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Player registers for a category — debits the per-category fee from wallet balance
  app.post("/api/bsl/players/me/categories", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const category = String(req.body.category || "").toUpperCase();
      if (!ALLOWED_CATS.includes(category as Cat)) return res.status(400).json({ message: "Invalid category (MD/WD/XD)" });
      const [me] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, u.id)).limit(1);
      if (!me) return res.status(404).json({ message: "Join a club first" });
      if (me.status !== "ACTIVE") return res.status(400).json({ message: "Pay your league fee first" });
      const cur = me.categories || [];
      if (cur.includes(category)) return res.status(400).json({ message: "Already registered for this category" });
      const [league] = await db.select().from(bslLeagues).limit(1);
      const fees = (league?.categoryFees || {}) as Record<string, number>;
      const baseFee = Number.isFinite(fees[category]) ? fees[category] : (league?.playerFee ?? 2500);
      // Multi-category loyalty discount: 1st cat full price, 2nd cat 50% off,
      // 3rd cat 70% off. Tier is decided in SQL from the current array length
      // so concurrent registrations can never both claim the same tier.
      // Pence stay integer: `fee * 50 / 100` uses Postgres int division.
      const discountedFeeSql = dsql`CASE COALESCE(array_length(${bslPlayers.categories}, 1), 0)
        WHEN 0 THEN ${baseFee}
        WHEN 1 THEN (${baseFee} * 50 / 100)
        ELSE (${baseFee} * 30 / 100) END`;
      // Atomic conditional update — guards against double-click double-spend AND
      // a concurrent registration for the same category. Both balance and the
      // "category not yet present" predicate are checked at the SQL level.
      const [updated] = await db.update(bslPlayers).set({
        walletBalance: dsql`${bslPlayers.walletBalance} - (${discountedFeeSql})`,
        categories: dsql`array_append(${bslPlayers.categories}, ${category})`,
      }).where(and(
        eq(bslPlayers.id, me.id),
        dsql`${bslPlayers.walletBalance} >= (${discountedFeeSql})`,
        dsql`NOT (${category} = ANY(${bslPlayers.categories}))`,
      )).returning();
      if (!updated) {
        // Either the balance dropped below the fee or another request claimed the category first.
        const [fresh] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, me.id)).limit(1);
        if (fresh && (fresh.categories || []).includes(category)) {
          return res.status(400).json({ message: "Already registered for this category" });
        }
        // Quote the worst-case (lowest) price they would pay had they qualified.
        const tierCount = (fresh?.categories || []).length;
        const wouldPay = tierCount === 0 ? baseFee : tierCount === 1 ? Math.floor(baseFee * 50 / 100) : Math.floor(baseFee * 30 / 100);
        return res.status(402).json({ message: `Need £${(wouldPay/100).toFixed(2)} in your wallet — top up first.`, fee: wouldPay, balance: fresh?.walletBalance ?? me.walletBalance });
      }
      // Compute the actual amount charged from the balance delta — robust to
      // whatever tier the SQL CASE picked.
      const charged = (me.walletBalance ?? 0) - (updated.walletBalance ?? 0);
      const tierLabel = cur.length === 0 ? "" : cur.length === 1 ? " (50% multi-cat discount)" : " (70% multi-cat discount)";
      await db.insert(bslWalletTransactions).values({
        bslPlayerId: me.id, type: "DEBIT", amount: charged, status: "APPROVED",
        reference: `CAT-${category}-${Date.now().toString(36).toUpperCase()}`,
        description: `Registered for ${category}${tierLabel}`,
        reviewedById: u.id, reviewedAt: new Date(),
      } as any);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Player unregisters from a category (no automatic refund — admin handles refunds)
  app.delete("/api/bsl/players/me/categories/:cat", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const category = String(req.params.cat || "").toUpperCase();
      const [me] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, u.id)).limit(1);
      if (!me) return res.status(404).json({ message: "No BSL player profile yet" });
      const cur = me.categories || [];
      if (!cur.includes(category)) return res.status(400).json({ message: "Not registered for this category" });
      // Pull off any pair in this category
      const myTeams = await db.select().from(bslTeams).where(eq(bslTeams.category, category));
      if (myTeams.length) {
        await db.delete(bslTeamMembers).where(and(
          inArray(bslTeamMembers.bslTeamId, myTeams.map(t => t.id)),
          eq(bslTeamMembers.bslPlayerId, me.id),
        ));
      }
      const [updated] = await db.update(bslPlayers).set({
        categories: cur.filter(c => c !== category),
      }).where(eq(bslPlayers.id, me.id)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
