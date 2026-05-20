import type { Express, Request, Response, NextFunction } from "express";
import { eq, desc, and, or, sql as dsql, inArray, ilike, asc } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  bslLeagues, bslClubs, bslTeams, bslPlayers, bslLeagueDays, bslChallenges,
  bslFixtures, bslRubbers, bslWalletTransactions, bslAuditLog, bslMedia, users,
  bslTeamMembers, bslCategorySettings, bslFixtureVersions, bslPrizes,
} from "@shared/schema";
import { sendRulePush } from "./notificationRules";
import { hashPassword } from "./auth";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import { saveBufferToBucket } from "./uploadStorage";

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
const bslUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ========== STANDINGS RECOMPUTE ==========
// Two fixture flavours feed standings:
//   1. Legacy pair-vs-pair (homeTeamId/awayTeamId on the fixture itself).
//   2. New club-vs-club (homeClubId/awayClubId on fixture, each rubber records
//      which pair from each club played via bslRubbers.homeTeamId/awayTeamId).
// For #2 we credit each pair's stats per-rubber (they only play one rubber in
// the fixture), so "played" reflects matches played by that pair, not by the
// club — which keeps the bslTeams table the single source of truth for the
// per-club aggregation downstream (`/api/bsl/standings`).
async function recomputeStandings(_leagueId = 1) {
  const teams = await db.select().from(bslTeams);
  const fixtures = await db.select().from(bslFixtures);
  const finished = fixtures.filter(f => f.status === "FINISHED");
  // Per-category settings drive points-per-result. We honour per-category
  // pointsWin/Draw/Loss when the fixture has a snapshot; otherwise fall back
  // to the league-wide defaults from bslLeagues for legacy fixtures.
  let categorySettings: Record<string, any> = {};
  try {
    const rows = await db.select().from(bslCategorySettings);
    categorySettings = Object.fromEntries(rows.map(r => [r.category, r]));
  } catch { /* table absent → defaults */ }
  const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
  const defaultPts = { win: league?.pointsWin ?? 3, draw: league?.pointsDraw ?? 1, loss: league?.pointsLoss ?? 0 };

  const stats: Record<number, { p: number; w: number; d: number; l: number; rf: number; ra: number; pts: number }> = {};
  teams.forEach(t => { stats[t.id] = { p: 0, w: 0, d: 0, l: 0, rf: 0, ra: 0, pts: 0 }; });

  function pointsFor(f: any) {
    const snap = (f?.rulesSnapshot as any) || (f?.category ? categorySettings[f.category] : null);
    return {
      win: Number(snap?.pointsWin ?? defaultPts.win),
      draw: Number(snap?.pointsDraw ?? defaultPts.draw),
      loss: Number(snap?.pointsLoss ?? defaultPts.loss),
    };
  }

  for (const f of finished) {
    if (f.homeTeamId != null && f.awayTeamId != null) {
      const h = stats[f.homeTeamId]; const a = stats[f.awayTeamId];
      if (!h || !a) continue;
      const P = pointsFor(f);
      h.p++; a.p++;
      h.rf += f.homeRubbers; h.ra += f.awayRubbers;
      a.rf += f.awayRubbers; a.ra += f.homeRubbers;
      if (f.homeRubbers > f.awayRubbers) { h.w++; a.l++; h.pts += P.win; a.pts += P.loss; }
      else if (f.homeRubbers < f.awayRubbers) { a.w++; h.l++; a.pts += P.win; h.pts += P.loss; }
      else { h.d++; a.d++; h.pts += P.draw; a.pts += P.draw; }
    }
  }

  // Club-vs-club: credit per-rubber for any finished club fixture.
  const finishedClubFixtures = finished.filter(f => f.homeClubId != null && f.awayClubId != null);
  const finishedClubFixtureIds = finishedClubFixtures.map(f => f.id);
  const fixtureById = new Map(finishedClubFixtures.map(f => [f.id, f]));
  if (finishedClubFixtureIds.length) {
    const rubbers = await db.select().from(bslRubbers).where(inArray(bslRubbers.bslFixtureId, finishedClubFixtureIds));
    for (const r of rubbers) {
      if (r.homeTeamId == null || r.awayTeamId == null) continue;
      const h = stats[r.homeTeamId]; const a = stats[r.awayTeamId];
      if (!h || !a) continue;
      const P = pointsFor(fixtureById.get(r.bslFixtureId));
      h.p++; a.p++;
      h.rf += r.homeScore; h.ra += r.awayScore;
      a.rf += r.awayScore; a.ra += r.homeScore;
      if (r.homeScore > r.awayScore) { h.w++; a.l++; h.pts += P.win; a.pts += P.loss; }
      else if (r.homeScore < r.awayScore) { a.w++; h.l++; a.pts += P.win; h.pts += P.loss; }
      else { h.d++; a.d++; h.pts += P.draw; a.pts += P.draw; }
    }
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
      // Auto-derive countdown target from the soonest non-CLOSED league day in
      // the future. Stored `nextLeagueDay` is kept as a manual override — only
      // used when no upcoming league day exists, OR when the stored value is
      // itself still in the future. Otherwise the public page would show
      // 00:00:00:00 forever after an admin forgot to update it.
      // We want any non-CLOSED day to count — including one happening today
      // whose timestamp is technically in the past (the countdown will just
      // show 00:00:00:00 which is correct for "live now"). Only fall through
      // to the manual override when there's no scheduled day at all.
      const now = new Date();
      const upcoming = await db.select().from(bslLeagueDays)
        .where(eq(bslLeagueDays.bslLeagueId, 1))
        .orderBy(bslLeagueDays.date);
      const futureDay = upcoming.find(d => d.date && d.state !== "CLOSED" && new Date(d.date).getTime() > now.getTime());
      const liveDay = upcoming.find(d => d.date && d.state !== "CLOSED");
      const stored = league.nextLeagueDay ? new Date(league.nextLeagueDay) : null;
      const storedStillFuture = stored && stored.getTime() > now.getTime();
      const effectiveNext = futureDay?.date
        ? new Date(futureDay.date)
        : (storedStillFuture ? stored : (liveDay?.date ? new Date(liveDay.date) : null));
      res.json({ ...league, nextLeagueDay: effectiveNext });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.patch("/api/bsl/league", requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const allowedStr = ["name", "tagline", "venueName", "bankAccountName", "bankSortCode", "bankAccountNumber", "matchFormat", "brandingPrimary", "brandingAccent"];
      const allowedInt = ["clubFee", "playerFee", "pointsWin", "pointsDraw", "pointsLoss", "courtCount", "divisionJoinFeePence"];
      const update: Record<string, any> = { updatedAt: new Date() };
      // Divisions: free-form list managed from /bsl/admin/league. Sanitised
      // string array (trimmed, ≤56 chars, deduped, max 32 entries) so the UI
      // can add/rename/delete. Without this, deletes silently no-op.
      if ("divisions" in body) {
        const raw = Array.isArray(body.divisions) ? body.divisions : [];
        const cleaned = Array.from(new Set(
          raw.map((s: any) => String(s ?? "").trim().slice(0, 56)).filter((s: string) => s.length > 0)
        )).slice(0, 32);
        update.divisions = cleaned;
      }
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
      // Player grade catalogue — admin-defined grade codes (e.g. A1/A2/B1…).
      // Sanitised: code 1-12 chars (uppercased), label ≤24 chars, dedupe by code, max 32 entries.
      if ("playerGrades" in body) {
        const raw = Array.isArray(body.playerGrades) ? body.playerGrades : [];
        const seen = new Set<string>();
        const cleaned: Array<{ code: string; label: string; sortOrder: number }> = [];
        for (const r of raw) {
          if (!r || typeof r !== "object") continue;
          const code = String((r as any).code ?? "").trim().toUpperCase().slice(0, 12);
          if (!code || seen.has(code)) continue;
          seen.add(code);
          const label = String((r as any).label ?? code).trim().slice(0, 24) || code;
          const sortOrder = Number.isFinite(Number((r as any).sortOrder)) ? Number((r as any).sortOrder) : cleaned.length;
          cleaned.push({ code, label, sortOrder });
          if (cleaned.length >= 32) break;
        }
        cleaned.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        update.playerGrades = cleaned;
      }
      // Per-division allowed-grade restrictions — { divisionName: ["A1","A2"] }.
      // Drops unknown division keys against the current divisions list, dedupes
      // grades, caps to 32 grades per division.
      if ("divisionGrades" in body && body.divisionGrades && typeof body.divisionGrades === "object") {
        const [current] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
        const knownDivisions = new Set<string>([...(current?.divisions || []), ...((Array.isArray(body.divisions) ? body.divisions : []) as string[])].map((s) => String(s)));
        const out: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(body.divisionGrades as Record<string, any>)) {
          if (knownDivisions.size && !knownDivisions.has(k)) continue;
          if (!Array.isArray(v)) continue;
          out[k] = Array.from(new Set(v.map((g: any) => String(g).trim().toUpperCase()).filter((g: string) => g.length))).slice(0, 32);
        }
        update.divisionGrades = out;
      }
      // Top-up packages — array of { id, label, amountPence, sortOrder }.
      // Sanitise to prevent admin from injecting weird shapes that break the
      // wallet pricing engine. Max 24 packages, label ≤56 chars, amount ≤£10k.
      if ("topupPackages" in body) {
        const raw = Array.isArray(body.topupPackages) ? body.topupPackages : [];
        const seen = new Set<string>();
        const cleaned: any[] = [];
        for (const r of raw) {
          if (!r || typeof r !== "object") continue;
          const id = String(r.id ?? "").trim().slice(0, 40) || `pkg_${cleaned.length + 1}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const label = String(r.label ?? "").trim().slice(0, 56);
          const amt = Math.max(0, Math.min(1_000_000, Math.round(Number(r.amountPence))));
          if (!label || !Number.isFinite(amt)) continue;
          const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : cleaned.length;
          cleaned.push({ id, label, amountPence: amt, sortOrder });
          if (cleaned.length >= 24) break;
        }
        cleaned.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        update.topupPackages = cleaned;
      }
      // Discount tiers — array of percent-off values for the Nth selection.
      // Clamp each to 0..100. Empty array = no discounts ever.
      if ("topupDiscountPcts" in body) {
        const raw = Array.isArray(body.topupDiscountPcts) ? body.topupDiscountPcts : [];
        update.topupDiscountPcts = raw.slice(0, 12).map((v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
        });
      }
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
        additionalDivisions: [],
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
  // Self-declared bank-transfer details (no picture upload). Admin will cross-check against the bank statement on approval.
  app.post("/api/bsl/clubs/:id/payment-proof", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      const owns = club.managerUserId === user.id || (club as any).contactUserId === user.id || (Array.isArray((club as any).adminUserIds) && (club as any).adminUserIds.includes(user.id));
      if (!owns && !isAdminish(user)) return res.status(403).json({ message: "Not your club" });
      const amount = Math.trunc(Number(req.body.paymentAmountPence));
      const paymentDate = String(req.body.paymentDate || "").trim();
      const payerAccountName = String(req.body.payerAccountName || "").trim().slice(0, 120);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a positive payment amount." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return res.status(400).json({ message: "Enter the date you sent the transfer (YYYY-MM-DD)." });
      if (payerAccountName.length < 2) return res.status(400).json({ message: "Enter the bank account name you paid from." });
      const [updated] = await db.update(bslClubs)
        .set({ paymentAmountPence: amount, paymentDate, payerAccountName, status: "PENDING_VERIFICATION" })
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

  // === SUPER-ADMIN: Put to sleep / Wake up ===
  // Sets sleepingAt timestamp (or clears it). The club + all data stay visible
  // but a "Sleeping" badge is shown publicly. OWNER-only.
  app.patch("/api/bsl/admin/clubs/:id/sleep", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const sleeping = req.body?.sleeping !== false; // default true
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const [updated] = await db.update(bslClubs)
        .set({ sleepingAt: sleeping ? new Date() : null })
        .where(eq(bslClubs.id, id))
        .returning();
      await audit(req, sleeping ? "club.sleep" : "club.wake", "bsl_club", id, {
        from: existing.sleepingAt, to: updated.sleepingAt, reason: req.body?.reason || null,
      });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === SUPER-ADMIN: Wipe out (hard delete) ===
  // Deletes the club AND every related row (fixtures, rubbers, teams, team
  // members, wallet transactions, players link). OWNER-only, requires the
  // confirmation phrase to match the club name to prevent fat-finger wipes.
  app.delete("/api/bsl/admin/clubs/:id/wipe", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const confirmName = String(req.body?.confirmName || "").trim();
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (confirmName !== existing.name) {
        return res.status(400).json({ message: `Confirmation phrase must exactly match the club name: "${existing.name}"` });
      }

      const summary = await db.transaction(async (tx) => {
        // 1) Delete fixtures where this club is home or away (no FK cascade
        //    from bslClubs to bslFixtures, so we must clear them ourselves).
        //    bsl_rubbers cascades from bslFixtures.
        const deletedFixtures = await tx.delete(bslFixtures)
          .where(or(eq(bslFixtures.homeClubId, id), eq(bslFixtures.awayClubId, id)))
          .returning({ id: bslFixtures.id });

        // 2) Delete the club row. Cascades: bsl_teams (CASCADE),
        //    bsl_team_members via teams (CASCADE). Set-NULL: bsl_players,
        //    bsl_media.tagged_club_id, bsl_audit_log.tagged_club_id.
        //    Players' wallet history (bsl_wallet_transactions keyed by
        //    bsl_player_id) is preserved with the player.
        await tx.delete(bslClubs).where(eq(bslClubs.id, id));

        return { fixtures: deletedFixtures.length };
      });

      await audit(req, "club.wipe", "bsl_club", id, {
        clubName: existing.name,
        deletedFixtures: summary.fixtures,
        reason: req.body?.reason || null,
      });
      res.json({ ok: true, ...summary });
    } catch (err: any) {
      console.error("[bsl wipe]", err);
      res.status(500).json({ message: err.message });
    }
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
      // Eligibility: if the destination division has grade restrictions, the
      // joining user can't have a record yet — but the player record may have
      // been pre-graded by an admin via /api/bsl/players/:id/grade or carried
      // over from a previous club. Check both. Ungraded users joining a
      // restricted division get a clear error pointing at the allowed list.
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      const allowedGrades = (league?.divisionGrades as any)?.[club.division] || [];
      if (allowedGrades.length > 0) {
        return res.status(400).json({ message: `${club.division} requires a player grade in [${allowedGrades.join(", ")}]. Ask the league admin to set your grade before joining.` });
      }
      const paymentReference = genRef("BSL-PLR");
      const [created] = await db.insert(bslPlayers).values({
        userId: user.id, bslClubId: club.id, bslTeamId: teamId || null, paymentReference,
      } as any).returning();
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/bsl/players/:id/payment-proof", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!player) return res.status(404).json({ message: "Player not found" });
      if (player.userId !== user.id && !isAdminish(user)) return res.status(403).json({ message: "Not your player record" });
      const amount = Math.trunc(Number(req.body.paymentAmountPence));
      const paymentDate = String(req.body.paymentDate || "").trim();
      const payerAccountName = String(req.body.payerAccountName || "").trim().slice(0, 120);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a positive payment amount." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return res.status(400).json({ message: "Enter the date you sent the transfer (YYYY-MM-DD)." });
      if (payerAccountName.length < 2) return res.status(400).json({ message: "Enter the bank account name you paid from." });
      const [updated] = await db.update(bslPlayers).set({
        paymentAmountPence: amount, paymentDate, payerAccountName, status: "PENDING_VERIFICATION",
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

  // === PUBLIC LEAGUE DAYS (read-only metadata for results archive) ===
  app.get("/api/bsl/league-days", async (_req, res) => {
    try {
      const rows = await db.select().from(bslLeagueDays).orderBy(desc(bslLeagueDays.date));
      res.json(rows.map(r => ({ id: r.id, date: r.date, venue: r.venue || null, state: (r as any).state || null })));
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
        const ht = f.homeTeamId != null ? tMap.get(f.homeTeamId) : null;
        const at = f.awayTeamId != null ? tMap.get(f.awayTeamId) : null;
        const hc = f.homeClubId != null ? cMap.get(f.homeClubId) : (ht ? cMap.get(ht.bslClubId) : null);
        const ac = f.awayClubId != null ? cMap.get(f.awayClubId) : (at ? cMap.get(at.bslClubId) : null);
        return {
          ...f,
          // For club-vs-club fixtures (no team set yet) show the club name as
          // the headline. Pair-vs-pair fixtures keep the original team name.
          homeTeamName: ht?.name || hc?.name || "TBD",
          awayTeamName: at?.name || ac?.name || "TBD",
          homeClubName: hc?.name || null,
          awayClubName: ac?.name || null,
          homeClubLogo: hc?.logoUrl || null,
          awayClubLogo: ac?.logoUrl || null,
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
      const teamIds = [fixture.homeTeamId, fixture.awayTeamId].filter((x): x is number => x != null);
      const teams = teamIds.length
        ? await db.select().from(bslTeams).where(inArray(bslTeams.id, teamIds))
        : [];
      // Hydrate club info too so club-vs-club fixtures (no team set on the
      // fixture itself) still render names + logos in MatchDetail.
      const clubIds = [fixture.homeClubId, fixture.awayClubId].filter((x): x is number => x != null);
      const clubRows = clubIds.length
        ? await db.select().from(bslClubs).where(inArray(bslClubs.id, clubIds))
        : [];
      const cMap = new Map(clubRows.map(c => [c.id, c]));
      const homeClub = fixture.homeClubId != null ? cMap.get(fixture.homeClubId) || null : null;
      const awayClub = fixture.awayClubId != null ? cMap.get(fixture.awayClubId) || null : null;
      res.json({ ...fixture, rubbers, teams, homeClub, awayClub });
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
      const { court, status, startTime, homeClubId, awayClubId, bslLeagueDayId, division } = req.body;
      // Lifecycle guard — block edits on CLOSED days; allow ONLY pure status
      // changes when LIVE. A mixed payload (status + court/startTime) during
      // LIVE is rejected so we don't silently sneak forbidden edits in.
      const structural = homeClubId !== undefined || awayClubId !== undefined || bslLeagueDayId !== undefined;
      const hasNonStatus = court !== undefined || startTime !== undefined || structural;
      const action = hasNonStatus ? "edit" : (status ? "status" : "edit");
      const block = await assertFixtureMutable(id, new Set(["status"]), action);
      if (block) return res.status(409).json({ message: block });
      const patch: any = {};
      if (court !== undefined) patch.court = court;
      if (status) patch.status = status;
      if (startTime) patch.startTime = new Date(startTime);
      if (homeClubId !== undefined) patch.homeClubId = homeClubId == null ? null : Number(homeClubId);
      if (awayClubId !== undefined) patch.awayClubId = awayClubId == null ? null : Number(awayClubId);
      if (bslLeagueDayId !== undefined) patch.bslLeagueDayId = bslLeagueDayId == null ? null : Number(bslLeagueDayId);
      if (division !== undefined) patch.division = division == null ? null : String(division).trim().slice(0, 56) || null;
      if (patch.homeClubId != null && patch.awayClubId != null && patch.homeClubId === patch.awayClubId) {
        return res.status(400).json({ message: "Home and away clubs must differ" });
      }
      const [updated] = await db.update(bslFixtures).set(patch).where(eq(bslFixtures.id, id)).returning();
      if (status === "FINISHED") await recomputeStandings();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  // Match-day "details" endpoint — returns the day plus all its fixtures with
  // hydrated home/away club names + logos and rubber counts. Powers the new
  // /bsl/admin/match-days hub so a single round-trip backs the editor modal.
  app.get("/api/bsl/admin/league-days/:id/details", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, id)).limit(1);
      if (!day) return res.status(404).json({ message: "League day not found" });
      const fixtures = await db.select().from(bslFixtures).where(eq(bslFixtures.bslLeagueDayId, id)).orderBy(bslFixtures.startTime);
      const fixtureIds = fixtures.map(f => f.id);
      const clubIds = Array.from(new Set(fixtures.flatMap(f => [f.homeClubId, f.awayClubId]).filter((x): x is number => x != null)));
      const teamIds = Array.from(new Set(fixtures.flatMap(f => [f.homeTeamId, f.awayTeamId]).filter((x): x is number => x != null)));
      const [clubs, teams, rubbers] = await Promise.all([
        clubIds.length ? db.select().from(bslClubs).where(inArray(bslClubs.id, clubIds)) : Promise.resolve([] as any[]),
        teamIds.length ? db.select().from(bslTeams).where(inArray(bslTeams.id, teamIds)) : Promise.resolve([] as any[]),
        fixtureIds.length ? db.select().from(bslRubbers).where(inArray(bslRubbers.bslFixtureId, fixtureIds)) : Promise.resolve([] as any[]),
      ]);
      const cMap = new Map(clubs.map(c => [c.id, c]));
      const tMap = new Map(teams.map(t => [t.id, t]));
      const rubberCount = new Map<number, number>();
      for (const r of rubbers) rubberCount.set(r.bslFixtureId!, (rubberCount.get(r.bslFixtureId!) || 0) + 1);
      const enriched = fixtures.map(f => {
        const ht = f.homeTeamId != null ? tMap.get(f.homeTeamId) : null;
        const at = f.awayTeamId != null ? tMap.get(f.awayTeamId) : null;
        const hc = f.homeClubId != null ? cMap.get(f.homeClubId) : (ht ? cMap.get(ht.bslClubId) : null);
        const ac = f.awayClubId != null ? cMap.get(f.awayClubId) : (at ? cMap.get(at.bslClubId) : null);
        return {
          ...f,
          rubberCount: rubberCount.get(f.id) || 0,
          homeClubName: hc?.name || ht?.name || null,
          awayClubName: ac?.name || at?.name || null,
          homeClubLogo: hc?.logoUrl || null,
          awayClubLogo: ac?.logoUrl || null,
        };
      });
      res.json({ day, fixtures: enriched });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  // === ADMIN: club-vs-club fixture creation + drag-drop pair assignment ===
  // Default rubber lineup for a club-vs-club fixture: 6 doubles slots split
  // 2× MD, 2× WD, 2× XD. Admin can override via body.types if they want a
  // different mix (must be 6 entries from MD/WD/XD).
  const DEFAULT_CVC_TYPES: any[] = ["MD", "MD", "WD", "WD", "XD", "XD"];
  app.post("/api/bsl/admin/club-fixtures", requireAdmin, async (req, res) => {
    try {
      const { homeClubId, awayClubId, leagueDayId, court, startTime, types, category, division } = req.body as {
        homeClubId: number; awayClubId: number; leagueDayId?: number;
        court?: number | null; startTime?: string; types?: string[]; category?: string; division?: string | null;
      };
      if (!homeClubId || !awayClubId) return res.status(400).json({ message: "homeClubId + awayClubId required" });
      if (homeClubId === awayClubId) return res.status(400).json({ message: "Home and away must differ" });
      const cat = category ? String(category).toUpperCase() : null;
      // Resolve lineup: explicit body.types > category settings > legacy default.
      let settings: any = null;
      if (cat) {
        const [row] = await db.select().from(bslCategorySettings)
          .where(and(eq(bslCategorySettings.bslLeagueId, 1), eq(bslCategorySettings.category, cat))).limit(1);
        settings = row || null;
      }
      const allowed = new Set(["MS1", "MS2", "WS", "MD", "WD", "XD"]);
      const lineup: string[] = Array.isArray(types) && types.length > 0
        ? types
        : (settings?.rubberLineup && settings.rubberLineup.length)
          ? settings.rubberLineup
          : DEFAULT_CVC_TYPES;
      // Same league-day-level override as the auto-generator: lets the admin
      // choose how many rubbers a day's fixtures contain when they create the
      // day, and edit it later.
      let dayOverride: number | null = null;
      if (leagueDayId != null) {
        const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, leagueDayId)).limit(1);
        if (day && day.rubbersPerFixture && day.rubbersPerFixture > 0) dayOverride = day.rubbersPerFixture;
      }
      const rubbersPerFixture = dayOverride || settings?.rubbersPerFixture || lineup.length;
      for (const t of lineup) if (!allowed.has(t)) return res.status(400).json({ message: `Invalid rubber type: ${t}` });
      const clubs = await db.select().from(bslClubs).where(inArray(bslClubs.id, [homeClubId, awayClubId]));
      if (clubs.length !== 2) return res.status(404).json({ message: "Club(s) not found" });
      // Persist division so standings/filters know which division this fixture
      // counts toward. Multi-division clubs make this required — otherwise a
      // single club-vs-club fixture would silently count in both divisions.
      const div = division ? String(division).trim().slice(0, 56) : null;
      const [f] = await db.insert(bslFixtures).values({
        bslLeagueDayId: leagueDayId ?? null,
        category: cat,
        division: div,
        rulesSnapshot: settings as any,
        homeClubId, awayClubId,
        homeTeamId: null, awayTeamId: null,
        court: court ?? null,
        startTime: startTime ? new Date(startTime) : null,
      }).returning();
      for (let k = 0; k < rubbersPerFixture; k++) {
        await db.insert(bslRubbers).values({
          bslFixtureId: f.id, rubberNumber: k + 1, rubberType: (lineup[k % lineup.length] || "MD") as any,
        });
      }
      await audit(req, "CREATE_CLUB_FIXTURE", "bsl_fixture", f.id, { homeClubId, awayClubId, category: cat, types: lineup });
      res.json(f);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Returns everything the admin pair-assignment UI needs in one round trip:
  // the fixture + both clubs (logo/name/division), all 6 rubbers, and each
  // side's confirmed pairs grouped by category with member names hydrated.
  app.get("/api/bsl/admin/fixtures/:id/setup", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [fixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, id)).limit(1);
      if (!fixture) return res.status(404).json({ message: "Fixture not found" });
      const rubbers = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, id)).orderBy(bslRubbers.rubberNumber);
      const clubIds = [fixture.homeClubId, fixture.awayClubId].filter((x): x is number => x != null);
      const clubs = clubIds.length ? await db.select().from(bslClubs).where(inArray(bslClubs.id, clubIds)) : [];
      const teams = clubIds.length ? await db.select().from(bslTeams).where(inArray(bslTeams.bslClubId, clubIds)) : [];
      const teamIds = teams.map(t => t.id);
      const memberRows = teamIds.length
        ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds))
        : [];
      const playerIds = Array.from(new Set(memberRows.map(m => m.bslPlayerId)));
      const players = playerIds.length
        ? await db.select().from(bslPlayers).where(inArray(bslPlayers.id, playerIds))
        : [];
      const userIds = Array.from(new Set(players.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));
      const playerMap = new Map(players.map(p => [p.id, {
        ...p,
        name: p.displayName || userMap.get(p.userId)?.name || `Player #${p.id}`,
      }]));
      const teamWithMembers = teams.map(t => ({
        ...t,
        members: memberRows
          .filter(m => m.bslTeamId === t.id)
          .map(m => playerMap.get(m.bslPlayerId))
          .filter(Boolean),
      }));
      const sideOf = (clubId: number) => teamWithMembers.filter(t => t.bslClubId === clubId);
      res.json({
        fixture,
        rubbers,
        homeClub: clubs.find(c => c.id === fixture.homeClubId) || null,
        awayClub: clubs.find(c => c.id === fixture.awayClubId) || null,
        homePairs: fixture.homeClubId ? sideOf(fixture.homeClubId) : [],
        awayPairs: fixture.awayClubId ? sideOf(fixture.awayClubId) : [],
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Assign (or clear) one side of a rubber to a pair. The pair must belong to
  // the rubber's fixture's corresponding club. Pair members are mirrored into
  // homePlayer1/2 / awayPlayer1/2 so existing scoring + perspective resolution
  // continues to work without touching MatchDetail.
  app.patch("/api/bsl/admin/rubbers/:id/assign", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { side, bslTeamId } = req.body as { side: "home" | "away"; bslTeamId: number | null };
      if (side !== "home" && side !== "away") return res.status(400).json({ message: "side must be 'home' or 'away'" });
      const [rubber] = await db.select().from(bslRubbers).where(eq(bslRubbers.id, id)).limit(1);
      if (!rubber) return res.status(404).json({ message: "Rubber not found" });
      const [fixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, rubber.bslFixtureId)).limit(1);
      if (!fixture) return res.status(404).json({ message: "Fixture not found" });
      // Lifecycle guard — pair assignment forbidden once the day is LIVE/CLOSED.
      const block = await assertFixtureMutable(fixture.id, new Set(), "assign");
      if (block) return res.status(409).json({ message: block });
      const targetClubId = side === "home" ? fixture.homeClubId : fixture.awayClubId;
      const patch: any = {};
      if (bslTeamId == null) {
        if (side === "home") { patch.homeTeamId = null; patch.homePlayer1Id = null; patch.homePlayer2Id = null; }
        else { patch.awayTeamId = null; patch.awayPlayer1Id = null; patch.awayPlayer2Id = null; }
      } else {
        const [team] = await db.select().from(bslTeams).where(eq(bslTeams.id, bslTeamId)).limit(1);
        if (!team) return res.status(404).json({ message: "Pair not found" });
        if (targetClubId == null) return res.status(400).json({ message: "Fixture has no club on that side" });
        if (team.bslClubId !== targetClubId) return res.status(400).json({ message: "Pair does not belong to this club" });
        // Category check only matters when rubber type is a doubles type.
        if (["MD", "WD", "XD"].includes(rubber.rubberType) && team.category !== rubber.rubberType) {
          return res.status(400).json({ message: `This rubber is ${rubber.rubberType} — pair is ${team.category}` });
        }
        // Block double-booking the same pair in two rubbers of the same fixture
        // (a pair can't physically play two rubbers at once).
        const sibling = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, rubber.bslFixtureId));
        const conflict = sibling.find(r =>
          r.id !== rubber.id &&
          ((side === "home" && r.homeTeamId === bslTeamId) ||
           (side === "away" && r.awayTeamId === bslTeamId))
        );
        if (conflict) return res.status(400).json({ message: `This pair is already in rubber ${conflict.rubberNumber}` });
        const members = await db.select().from(bslTeamMembers).where(eq(bslTeamMembers.bslTeamId, bslTeamId));
        const [p1, p2] = members.map(m => m.bslPlayerId);
        if (side === "home") { patch.homeTeamId = bslTeamId; patch.homePlayer1Id = p1 ?? null; patch.homePlayer2Id = p2 ?? null; }
        else { patch.awayTeamId = bslTeamId; patch.awayPlayer1Id = p1 ?? null; patch.awayPlayer2Id = p2 ?? null; }
      }
      const [updated] = await db.update(bslRubbers).set(patch).where(eq(bslRubbers.id, id)).returning();
      await audit(req, "ASSIGN_RUBBER", "bsl_rubber", id, { side, bslTeamId });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === ADMIN: extend a club fixture with extra rubbers / auto-generate vs all ===
  // Append a single empty rubber slot of the requested doubles category to an
  // existing club-vs-club fixture. Useful when you need a 7th/8th/etc. match
  // beyond the snapshot lineup. Lifecycle-guarded so you can't add slots once
  // the day is LIVE/CLOSED.
  // Helper: structural changes (add/delete/auto-generate rubbers) are forbidden
  // once the fixture has progressed past SCHEDULED/WARMUP. Only DRAFT fixtures
  // can have their slate restructured — we never silently rewrite a LIVE or
  // FINISHED fixture's rubber list.
  const STRUCTURAL_OK_STATUSES = new Set(["SCHEDULED", "WARMUP"]);
  function assertFixtureStructural(fixture: any) {
    if (!STRUCTURAL_OK_STATUSES.has(fixture.status)) {
      return `Fixture is ${fixture.status} — structural changes are only allowed on SCHEDULED/WARMUP fixtures. Reset the fixture first.`;
    }
    return null;
  }

  app.post("/api/bsl/admin/fixtures/:id/add-rubber", requireAdmin, async (req, res) => {
    try {
      const fixtureId = Number(req.params.id);
      const rubberType = String(req.body?.rubberType || "").toUpperCase();
      const allowed = new Set(["MS1", "MS2", "WS", "MD", "WD", "XD"]);
      if (!allowed.has(rubberType)) return res.status(400).json({ message: "rubberType must be MS1|MS2|WS|MD|WD|XD" });
      const [fixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, fixtureId)).limit(1);
      if (!fixture) return res.status(404).json({ message: "Fixture not found" });
      // This endpoint targets club-vs-club fixtures only.
      if (!fixture.homeClubId || !fixture.awayClubId) {
        return res.status(400).json({ message: "add-rubber only supports club-vs-club fixtures" });
      }
      // Allow adding rubbers during the score-entry workflow (LIVE) as well as
      // pre-match (SCHEDULED/WARMUP). Only FINISHED fixtures are blocked here —
      // reset the fixture first if more rubbers are needed after it was closed.
      if (fixture.status === "FINISHED") {
        return res.status(409).json({ message: "Fixture is FINISHED — reset it before adding more rubbers." });
      }
      const block = await assertFixtureMutable(fixtureId, new Set(), "add-rubber");
      if (block) return res.status(409).json({ message: block });
      // Atomic: lock the fixture row + compute nextNum + insert in one tx so
      // concurrent add/auto-generate calls can't collide on rubberNumber.
      const created = await db.transaction(async (tx) => {
        await tx.execute(dsql`SELECT id FROM bsl_fixtures WHERE id = ${fixtureId} FOR UPDATE`);
        const existing = await tx.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, fixtureId));
        const nextNum = existing.reduce((m, r) => Math.max(m, r.rubberNumber), 0) + 1;
        const [row] = await tx.insert(bslRubbers).values({
          bslFixtureId: fixtureId, rubberNumber: nextNum, rubberType: rubberType as any,
        }).returning();
        return row;
      });
      await audit(req, "ADD_RUBBER", "bsl_fixture", fixtureId, { rubberType, rubberNumber: created.rubberNumber });
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Delete a single rubber slot. Refuses if the rubber has scores or assignments
  // (force=true bypasses for cleanup). Renumbers remaining rubbers to stay 1..N.
  app.delete("/api/bsl/admin/rubbers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const force = String(req.query.force || "") === "true";
      const [r] = await db.select().from(bslRubbers).where(eq(bslRubbers.id, id)).limit(1);
      if (!r) return res.status(404).json({ message: "Rubber not found" });
      const [parent] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, r.bslFixtureId)).limit(1);
      if (!parent) return res.status(404).json({ message: "Fixture not found" });
      const structBlock = assertFixtureStructural(parent);
      if (structBlock) return res.status(409).json({ message: structBlock });
      const block = await assertFixtureMutable(r.bslFixtureId, new Set(), "delete-rubber");
      if (block) return res.status(409).json({ message: block });
      const hasContent = r.homeTeamId || r.awayTeamId || (r.homeScore || 0) > 0 || (r.awayScore || 0) > 0;
      if (hasContent && !force) return res.status(400).json({ message: "Rubber has assignments or scores — pass ?force=true to remove anyway" });
      await db.transaction(async (tx) => {
        await tx.execute(dsql`SELECT id FROM bsl_fixtures WHERE id = ${r.bslFixtureId} FOR UPDATE`);
        await tx.delete(bslRubbers).where(eq(bslRubbers.id, id));
        // Renumber the remaining rubbers in order to keep them 1..N for display.
        const remaining = await tx.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, r.bslFixtureId)).orderBy(bslRubbers.rubberNumber);
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].rubberNumber !== i + 1) {
            await tx.update(bslRubbers).set({ rubberNumber: i + 1 }).where(eq(bslRubbers.id, remaining[i].id));
          }
        }
        // Recompute fixture rubber tally inside the same tx so totals reflect
        // the current rubber set (matters when force-deleting a scored rubber).
        const homeR = remaining.filter(x => (x.homeScore || 0) > (x.awayScore || 0)).length;
        const awayR = remaining.filter(x => (x.awayScore || 0) > (x.homeScore || 0)).length;
        await tx.update(bslFixtures).set({ homeRubbers: homeR, awayRubbers: awayR })
          .where(eq(bslFixtures.id, r.bslFixtureId));
      });
      await audit(req, "DELETE_RUBBER", "bsl_rubber", id, { force, fixtureId: r.bslFixtureId });
      res.json({ deleted: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Auto-generate the rubber slate for a club-vs-club fixture from the pairs
  // each side has registered. Two modes:
  //   - vs_all:   Cartesian product (every home pair vs every away pair) per category.
  //               Useful for "round-robin within the fixture" style ties.
  //   - parallel: Pair index-by-index (Pair A vs Pair A, Pair B vs Pair B, ...).
  // Optional `categories` filter restricts which pair categories are expanded
  // (defaults to MD + WD + XD). Existing rubbers can be wiped via `replace:true`.
  app.post("/api/bsl/admin/fixtures/:id/auto-generate-rubbers", requireAdmin, async (req, res) => {
    try {
      const fixtureId = Number(req.params.id);
      const mode = String(req.body?.mode || "vs_all").toLowerCase();
      const replace = !!req.body?.replace;
      const wantedCats = Array.isArray(req.body?.categories) && req.body.categories.length
        ? (req.body.categories as string[]).map(c => c.toUpperCase())
        : ["MD", "WD", "XD"];
      if (!["vs_all", "parallel"].includes(mode)) return res.status(400).json({ message: "mode must be vs_all|parallel" });
      const [fixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, fixtureId)).limit(1);
      if (!fixture) return res.status(404).json({ message: "Fixture not found" });
      if (!fixture.homeClubId || !fixture.awayClubId) return res.status(400).json({ message: "Auto-generate only supports club-vs-club fixtures" });
      const structBlock = assertFixtureStructural(fixture);
      if (structBlock) return res.status(409).json({ message: structBlock });
      const block = await assertFixtureMutable(fixtureId, new Set(), "auto-generate");
      if (block) return res.status(409).json({ message: block });

      // Pull both sides' pairs grouped by category.
      const teams = await db.select().from(bslTeams).where(inArray(bslTeams.bslClubId, [fixture.homeClubId, fixture.awayClubId]));
      const homeByCat: Record<string, any[]> = {};
      const awayByCat: Record<string, any[]> = {};
      for (const t of teams) {
        if (!wantedCats.includes(t.category)) continue;
        const bucket = t.bslClubId === fixture.homeClubId ? homeByCat : awayByCat;
        (bucket[t.category] ||= []).push(t);
      }
      // Sort by pairNumber so "Pair A vs Pair A" is deterministic in parallel mode.
      for (const m of [homeByCat, awayByCat]) for (const k of Object.keys(m)) m[k].sort((a, b) => (a.pairNumber || 0) - (b.pairNumber || 0));

      // Precompute member lookup so each generated rubber can mirror player ids
      // into homePlayer1/2 + awayPlayer1/2 (existing scoring needs this).
      const teamIds = teams.map(t => t.id);
      const memberRows = teamIds.length ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds)) : [];
      const membersByTeam = new Map<number, number[]>();
      for (const m of memberRows) {
        const arr = membersByTeam.get(m.bslTeamId) || [];
        arr.push(m.bslPlayerId);
        membersByTeam.set(m.bslTeamId, arr);
      }
      function makeRubberValues(cat: string, num: number, home: any, away: any) {
        const [hp1, hp2] = membersByTeam.get(home.id) || [];
        const [ap1, ap2] = membersByTeam.get(away.id) || [];
        return {
          bslFixtureId: fixtureId, rubberNumber: num, rubberType: cat as any,
          homeTeamId: home.id, awayTeamId: away.id,
          homePlayer1Id: hp1 ?? null, homePlayer2Id: hp2 ?? null,
          awayPlayer1Id: ap1 ?? null, awayPlayer2Id: ap2 ?? null,
        };
      }

      let createdCount = 0;
      let skipped = 0;
      await db.transaction(async (tx) => {
        // Lock the fixture row so concurrent add/auto-generate can't race on rubberNumber.
        await tx.execute(dsql`SELECT id FROM bsl_fixtures WHERE id = ${fixtureId} FOR UPDATE`);
        if (replace) {
          await tx.delete(bslRubbers).where(eq(bslRubbers.bslFixtureId, fixtureId));
          // Reset the fixture rubber tally; standings will reconcile if/when the day closes.
          await tx.update(bslFixtures).set({ homeRubbers: 0, awayRubbers: 0 })
            .where(eq(bslFixtures.id, fixtureId));
        }
        const existing = await tx.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, fixtureId));
        let nextNum = existing.reduce((m, r) => Math.max(m, r.rubberNumber), 0) + 1;
        for (const cat of wantedCats) {
          const homes = homeByCat[cat] || [];
          const aways = awayByCat[cat] || [];
          if (!homes.length || !aways.length) { skipped++; continue; }
          if (mode === "vs_all") {
            for (const h of homes) for (const a of aways) {
              await tx.insert(bslRubbers).values(makeRubberValues(cat, nextNum++, h, a));
              createdCount++;
            }
          } else {
            const n = Math.min(homes.length, aways.length);
            for (let i = 0; i < n; i++) {
              await tx.insert(bslRubbers).values(makeRubberValues(cat, nextNum++, homes[i], aways[i]));
              createdCount++;
            }
          }
        }
      });
      await audit(req, "AUTO_GENERATE_RUBBERS", "bsl_fixture", fixtureId, { mode, replace, categories: wantedCats, created: createdCount });
      res.json({ created: createdCount, skipped, mode, replace });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin delete a fixture (and cascade its rubbers). Lifecycle-guarded: CLOSED
  // and LIVE league-days block the delete (use the lifecycle to reopen first).
  // Without `?force=true`, FINISHED fixtures or ones with any rubber scores are
  // protected so a mis-click doesn't wipe completed match history.
  app.delete("/api/bsl/admin/fixtures/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid fixture id" });
      const force = String(req.query.force || "") === "true";
      const [fx] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, id)).limit(1);
      if (!fx) return res.status(404).json({ message: "Fixture not found" });
      const block = await assertFixtureMutable(id, new Set(), "delete-fixture");
      if (block) return res.status(409).json({ message: block });
      const rubbers = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, id));
      const hasScores = rubbers.some(r => (r.homeScore || 0) > 0 || (r.awayScore || 0) > 0);
      const isFinished = fx.status === "FINISHED";
      if ((hasScores || isFinished) && !force) {
        return res.status(400).json({
          message: `Fixture has ${isFinished ? "FINISHED status" : "rubber scores"} — pass ?force=true to delete anyway. Standings will recompute.`,
        });
      }
      await db.transaction(async (tx) => {
        await tx.execute(dsql`SELECT id FROM bsl_fixtures WHERE id = ${id} FOR UPDATE`);
        await tx.delete(bslRubbers).where(eq(bslRubbers.bslFixtureId, id));
        await tx.delete(bslFixtures).where(eq(bslFixtures.id, id));
      });
      // If we tore down a FINISHED fixture, the league table needs a refresh.
      if (isFinished) await recomputeStandings();
      await audit(req, "DELETE_FIXTURE", "bsl_fixture", id, { force, hadScores: hasScores, wasFinished: isFinished });
      res.json({ deleted: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/bsl/rubbers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { homeScore, awayScore, status } = req.body;
      // Lifecycle guard — score entry is allowed when LIVE; pure status
      // mutation or mixed (status+score) payloads must wait for DRAFT/PUBLISHED.
      const isPureScore = (homeScore !== undefined || awayScore !== undefined) && status === undefined;
      const action = isPureScore ? "score" : "edit";
      const [rubberRow] = await db.select().from(bslRubbers).where(eq(bslRubbers.id, id)).limit(1);
      if (rubberRow) {
        const block = await assertFixtureMutable(rubberRow.bslFixtureId, new Set(["score"]), action);
        if (block) return res.status(409).json({ message: block });
      }
      const patch: any = {};
      if (homeScore !== undefined) patch.homeScore = homeScore;
      if (awayScore !== undefined) patch.awayScore = awayScore;
      if (status) patch.status = status;
      // Mark rubber FINISHED only when the caller provides BOTH score sides in
      // this PATCH and at least one is > 0 — that's the "Save all" path from
      // the Quick Results form. A one-sided in-progress edit (e.g. typing
      // 21 into home before away) won't trip the auto-finish. We never
      // downgrade a status that's already FINISHED/explicit.
      const bothScoresProvided = homeScore !== undefined && awayScore !== undefined;
      const anyNonZero = (Number(homeScore) || 0) > 0 || (Number(awayScore) || 0) > 0;
      if (bothScoresProvided && anyNonZero && !status) {
        patch.status = "FINISHED";
      }
      const [updated] = await db.update(bslRubbers).set(patch).where(eq(bslRubbers.id, id)).returning();
      // Recompute fixture rubber tally + auto-finish only when every rubber is
      // explicitly FINISHED (or has a walkover winner). Without auto-finish
      // the fixture sits in LIVE/SCHEDULED forever and recomputeStandings()
      // (which only counts FINISHED fixtures) never picks up the result.
      const allRubbers = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, updated.bslFixtureId));
      const homeR = allRubbers.filter(r => r.homeScore > r.awayScore).length;
      const awayR = allRubbers.filter(r => r.awayScore > r.homeScore).length;
      const everyRubberFinished = allRubbers.length > 0 && allRubbers.every(r => r.status === "FINISHED" || r.walkoverWinner);
      const [currentFixture] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, updated.bslFixtureId)).limit(1);
      const fixturePatch: any = { homeRubbers: homeR, awayRubbers: awayR };
      let didFinish = false;
      if (everyRubberFinished && currentFixture && currentFixture.status !== "FINISHED") {
        fixturePatch.status = "FINISHED";
        didFinish = true;
      }
      await db.update(bslFixtures).set(fixturePatch).where(eq(bslFixtures.id, updated.bslFixtureId));
      // Recompute only on transitions or when editing an already-FINISHED
      // fixture (score correction). Skipping recompute on every keystroke
      // avoids the race where two overlapping PATCHes overwrite each other's
      // standings snapshot with stale data.
      if (didFinish || currentFixture?.status === "FINISHED") {
        await recomputeStandings();
      }
      res.json({ ...updated, fixtureAutoFinished: didFinish });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === MVP / TOP PERFORMERS ===
  // Only surface players who have actually played at least one match — empty
  // stat rows make the leaderboard look broken. Names are hydrated from
  // bslPlayers.displayName, falling back to the linked user's full name.
  app.get("/api/bsl/mvp", async (_req, res) => {
    try {
      const players = await db.select().from(bslPlayers).where(eq(bslPlayers.status, "ACTIVE"));
      const active = players.filter(p => (p.matchesPlayed || 0) > 0);
      const top = active
        .sort((a, b) => b.matchesWon - a.matchesWon || b.pointsScored - a.pointsScored)
        .slice(0, 5);
      const userIds = Array.from(new Set(top.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));
      res.json(top.map(p => ({
        ...p,
        displayName: p.displayName || userMap.get(p.userId)?.name || `Player #${p.id}`,
      })));
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
  app.post("/api/bsl/wallet/topup", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, user.id)).limit(1);
      if (!p) return res.status(404).json({ message: "BSL player not found" });

      // Authoritative recompute. Client may submit either:
      //   - clickHistory (JSON array of package ids, in click order) + customAmountPence
      //   - amount (legacy fallback — single integer pence)
      // We always recompute via the shared pricing engine so the charged
      // amount cannot be tampered with from the client.
      const { computeTopup } = await import("@shared/topupPricing");
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      const packages = (league?.topupPackages || []) as Array<{ id: string; label: string; amountPence: number }>;
      const discountPcts = (league?.topupDiscountPcts || [0, 50, 70]) as number[];

      let clickHistory: string[] = [];
      const rawHistory = req.body.clickHistory;
      if (typeof rawHistory === "string" && rawHistory.length) {
        try { const parsed = JSON.parse(rawHistory); if (Array.isArray(parsed)) clickHistory = parsed.map((s: any) => String(s)).slice(0, 200); } catch { /* ignore */ }
      } else if (Array.isArray(rawHistory)) {
        clickHistory = rawHistory.map((s: any) => String(s)).slice(0, 200);
      }
      const customRaw = Number(req.body.customAmountPence);
      const customPence = Number.isFinite(customRaw) ? Math.max(0, Math.min(1_000_000, Math.round(customRaw))) : 0;

      let amount: number;
      let description: string;
      if (clickHistory.length || customPence > 0) {
        const summary = computeTopup(clickHistory, packages, discountPcts, customPence);
        amount = summary.totalPence;
        const partsByPkg = new Map<string, number>();
        for (const l of summary.lines) partsByPkg.set(l.packageId, (partsByPkg.get(l.packageId) || 0) + 1);
        const labelById = new Map(packages.map((p) => [p.id, p.label]));
        const parts = Array.from(partsByPkg.entries()).map(([id, qty]) => `${qty}× ${labelById.get(id) ?? id}`);
        if (customPence > 0) parts.push(`Custom £${(customPence / 100).toFixed(2)}`);
        if (summary.discountPence > 0) parts.push(`(−£${(summary.discountPence / 100).toFixed(2)} discount)`);
        description = parts.join(" · ") || "Wallet top-up";
      } else {
        // Legacy single-amount path
        amount = Math.trunc(Number(req.body.amount));
        description = req.body.description || "Wallet top-up";
      }
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
        return res.status(400).json({ message: "Total must be a positive integer in pence (max £10,000)" });
      }

      const reference = genRef("BSL-TOPUP");
      const paymentDate = String(req.body.paymentDate || "").trim();
      const payerAccountName = String(req.body.payerAccountName || "").trim().slice(0, 120);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return res.status(400).json({ message: "Enter the date you sent the transfer (YYYY-MM-DD)." });
      if (payerAccountName.length < 2) return res.status(400).json({ message: "Enter the bank account name you paid from." });
      const [tx] = await db.insert(bslWalletTransactions).values({
        bslPlayerId: p.id, type: "TOPUP", amount, reference,
        paymentDate, payerAccountName,
        description,
      } as any).returning();
      res.json(tx);
    } catch (err: any) {
      console.error("[bsl topup]", err);
      res.status(500).json({ message: err.message });
    }
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

  // ========================================================================
  // ====== SUPER-ADMIN POWERS: create clubs/players, adjust wallets, =======
  // ====== assign categories, force-activate. All audit-logged. ============
  // ========================================================================

  // Search users by name/email (for picking a user when creating a player on
  // their behalf). Returns up to 20 lightweight rows.
  app.get("/api/bsl/admin/users/search", requireAdmin, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      // Use SQL ILIKE so the search hits ALL users — the previous approach
      // pulled `desc(users.id) LIMIT 500` then JS-filtered, so older accounts
      // (Mikey Hewitt, Pawan, etc.) were silently chopped off the bottom and
      // never appeared in the admin "Create player" dropdown. Empty query
      // returns 50 alphabetical names so the picker still has content on open.
      const baseSel = db.select({
        id: users.id, fullName: users.fullName, email: users.email,
      }).from(users);
      const rows = q.length === 0
        ? await baseSel.orderBy(asc(users.fullName)).limit(50)
        : await baseSel
            .where(or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`))!)
            .orderBy(asc(users.fullName))
            .limit(50);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin creates a brand-new user account from inside the BSL "Create player"
  // dialog. Returns the lightweight shape the search endpoint uses so the UI can
  // pre-pick the freshly created user without an extra round-trip.
  app.post("/api/bsl/admin/users", requireAdmin, async (req, res) => {
    try {
      const fullName = String(req.body?.fullName || "").trim();
      const emailRaw = String(req.body?.email || "").trim().toLowerCase();
      const passwordRaw = String(req.body?.password || "").trim();
      if (!fullName) return res.status(400).json({ message: "Full name is required" });
      if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const existing = await storage.getUserByUsername(emailRaw);
      if (existing) {
        return res.status(409).json({
          message: "A user with this email already exists",
          user: { id: existing.id, fullName: existing.fullName, email: existing.email, username: existing.username },
        });
      }
      // Use CSPRNG for the auto-generated temp password so it can't be guessed.
      const password = passwordRaw.length >= 6
        ? passwordRaw
        : `BSL-${randomBytes(6).toString("base64url")}`;
      const hashed = await hashPassword(password);
      const created = await storage.createUser({
        fullName, email: emailRaw, password: hashed,
        role: "PLAYER", emailVerified: false, lastActivityAt: new Date(),
      } as any);
      await audit(req, "ADMIN_CREATE_USER", "user", created.id, { fullName, email: emailRaw });
      res.json({
        id: created.id,
        fullName: created.fullName,
        email: created.email,
        tempPassword: passwordRaw.length >= 6 ? null : password,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin creates a new club from scratch — bypasses the public registration
  // wizard. Optionally set the managerUserId (otherwise the admin themselves
  // becomes manager). Auto-marked ACTIVE with a fresh invite code.
  app.post("/api/bsl/admin/clubs", requireAdmin, async (req, res) => {
    try {
      const u = (req as any).user;
      const { name, division, categoryPairs, logoUrl, managerUserId, status, additionalDivisions } = req.body;
      if (!name || !division) return res.status(400).json({ message: "Name and division required" });
      const ALLOWED = ["MD", "WD", "XD"];
      const SHORT: Record<string, string> = { MD: "MD", WD: "WD", XD: "XD" };
      const pairs: Record<string, number> = {};
      if (categoryPairs && typeof categoryPairs === "object") {
        for (const cat of ALLOWED) {
          const n = Number((categoryPairs as any)[cat]);
          if (Number.isFinite(n) && n > 0) pairs[cat] = Math.min(8, Math.floor(n));
        }
      }
      const totalPairs = Object.values(pairs).reduce((s, n) => s + n, 0);
      if (totalPairs === 0) return res.status(400).json({ message: "Add at least one pair" });
      let manager = managerUserId ? Number(managerUserId) : u.id;
      if (managerUserId) {
        const [mgr] = await db.select().from(users).where(eq(users.id, manager)).limit(1);
        if (!mgr) return res.status(400).json({ message: "Manager user not found" });
      }
      const targetStatus = status === "PENDING_PAYMENT" ? "PENDING_PAYMENT" : "ACTIVE";
      const inviteCode = targetStatus === "ACTIVE" ? genInvite() : null;
      const paymentReference = genRef("BSL-CLUB");
      // Optional secondary divisions a club joins at create time. Sanitised
      // the same way as the PATCH allowlist (trim, dedupe, drop primary, ≤8).
      const extraDivs: string[] = Array.isArray(additionalDivisions)
        ? Array.from(new Set(additionalDivisions
            .map((s: any) => String(s || "").trim())
            .filter((s: string) => s.length > 0 && s !== division)
          )).slice(0, 8)
        : [];
      const [created] = await db.insert(bslClubs).values({
        name, division,
        additionalDivisions: extraDivs,
        teamCount: totalPairs,
        categories: Object.keys(pairs),
        categoryPairs: pairs,
        logoUrl: logoUrl || null,
        managerUserId: manager,
        paymentReference,
        status: targetStatus as any,
        inviteCode,
        approvedAt: targetStatus === "ACTIVE" ? new Date() : null,
        approvedById: targetStatus === "ACTIVE" ? u.id : null,
      } as any).returning();
      const teamRows: any[] = [];
      for (const cat of ALLOWED) {
        const count = pairs[cat] || 0;
        for (let i = 0; i < count; i++) {
          const letter = String.fromCharCode(65 + i);
          const suffix = count > 1 ? ` Pair ${letter}` : "";
          teamRows.push({
            bslClubId: created.id,
            name: `${created.name} ${SHORT[cat]}${suffix}`,
            division: created.division, category: cat, pairNumber: i + 1,
          });
        }
      }
      if (teamRows.length) await db.insert(bslTeams).values(teamRows as any);
      await audit(req, "ADMIN_CREATE_CLUB", "bsl_club", created.id, { name, division, totalPairs, status: targetStatus, manager });
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin creates a BSL player record on behalf of an existing user.
  // Auto-confirms by manager + skips approval flow when activate=true.
  app.post("/api/bsl/admin/players", requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).user;
      const { userId, bslClubId, displayName, activate } = req.body;
      const uid = Number(userId);
      const cid = Number(bslClubId);
      if (!Number.isFinite(uid)) return res.status(400).json({ message: "userId required" });
      if (!Number.isFinite(cid)) return res.status(400).json({ message: "bslClubId required" });
      const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
      if (!user) return res.status(404).json({ message: "User not found" });
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, cid)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      const existing = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, uid)).limit(1);
      if (existing.length) return res.status(400).json({ message: "User already has a BSL player profile", player: existing[0] });
      // Pick which division (within the club) the player is joining. Falls back
      // to the club's primary division. Must be one of the club's joined divisions
      // (primary ∪ additionalDivisions).
      const clubDivisions = [
        club.division,
        ...(Array.isArray((club as any).additionalDivisions) ? (club as any).additionalDivisions : []),
      ].filter(Boolean);
      const requestedDivision = req.body.division ? String(req.body.division).trim() : club.division;
      if (!clubDivisions.includes(requestedDivision)) {
        return res.status(400).json({ message: `${club.name} is not in division "${requestedDivision}". Joined: ${clubDivisions.join(", ")}` });
      }
      // Optional grade at create-time. If the chosen division has
      // restrictions, enforce — admins still need to respect the rules they set.
      const grade = req.body.grade ? String(req.body.grade).trim().toUpperCase().slice(0, 12) : null;
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      if (!isGradeAllowedInDivision(grade, requestedDivision, league?.divisionGrades as any)) {
        const allowed = (league?.divisionGrades as any)?.[requestedDivision] || [];
        return res.status(400).json({ message: `Grade "${grade || "ungraded"}" is not allowed in ${requestedDivision}. Allowed: ${allowed.join(", ")}` });
      }
      const paymentReference = genRef("BSL-PLR");
      const [created] = await db.insert(bslPlayers).values({
        userId: uid,
        bslClubId: cid,
        displayName: displayName || null,
        grade,
        division: requestedDivision,
        paymentReference,
        status: activate ? "ACTIVE" : "PENDING_PAYMENT",
        approvedAt: activate ? new Date() : null,
        approvedById: activate ? adminUser.id : null,
        confirmedByOwnerAt: new Date(),
      } as any).returning();
      await audit(req, "ADMIN_CREATE_PLAYER", "bsl_player", created.id, { userId: uid, bslClubId: cid, activate: !!activate });
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Force-activate a player without requiring payment proof or wallet balance.
  app.post("/api/bsl/admin/players/:id/activate", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const adminUser = (req as any).user;
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!p) return res.status(404).json({ message: "Player not found" });
      if (p.status === "ACTIVE") return res.json(p);
      const [updated] = await db.update(bslPlayers).set({
        status: "ACTIVE", approvedAt: new Date(), approvedById: adminUser.id,
        confirmedByOwnerAt: p.confirmedByOwnerAt || new Date(),
      }).where(eq(bslPlayers.id, id)).returning();
      await audit(req, "ADMIN_FORCE_ACTIVATE_PLAYER", "bsl_player", id, { previousStatus: p.status });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Adjust wallet balance with a proper ledger entry. Positive amount = credit
  // (TOPUP), negative = deduction. Atomic via transaction.
  app.post("/api/bsl/admin/players/:id/wallet/adjust", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const adminUser = (req as any).user;
      const amount = Math.trunc(Number(req.body.amount));
      const note = String(req.body.note || "").slice(0, 200);
      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
        return res.status(400).json({ message: "amount must be a non-zero integer (pence)" });
      }
      if (Math.abs(amount) > 1_000_000) return res.status(400).json({ message: "amount too large (max £10,000)" });
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!p) return res.status(404).json({ message: "Player not found" });
      const newBalance = (p.walletBalance ?? 0) + amount;
      if (newBalance < 0) return res.status(400).json({ message: `Cannot deduct — would leave balance negative (current £${(p.walletBalance/100).toFixed(2)})` });
      const txType = amount > 0 ? "TOPUP" : "DEDUCTION";
      const reference = genRef(amount > 0 ? "ADM-CREDIT" : "ADM-DEBIT");
      const result = await db.transaction(async (tx) => {
        const [row] = await tx.update(bslPlayers).set({
          walletBalance: dsql`${bslPlayers.walletBalance} + ${amount}`,
        }).where(and(eq(bslPlayers.id, id), eq(bslPlayers.walletBalance, p.walletBalance ?? 0))).returning();
        if (!row) return null;
        await tx.insert(bslWalletTransactions).values({
          bslPlayerId: id, type: txType as any, amount: Math.abs(amount), status: "APPROVED",
          reference, description: note || (amount > 0 ? "Admin credit" : "Admin deduction"),
          reviewedById: adminUser.id, reviewedAt: new Date(),
        } as any);
        return row;
      });
      if (!result) return res.status(409).json({ message: "Balance changed during update — refresh and retry" });
      await audit(req, "ADMIN_WALLET_ADJUST", "bsl_player", id, { amount, note, reference });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin assigns a category to a player (no fee, no balance check). Used to
  // override the self-service registration when needed.
  app.post("/api/bsl/admin/players/:id/categories", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const category = String(req.body.category || "").toUpperCase();
      if (!ALLOWED_CATS.includes(category as Cat)) return res.status(400).json({ message: "Invalid category" });
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!p) return res.status(404).json({ message: "Player not found" });
      if ((p.categories || []).includes(category)) return res.status(400).json({ message: "Already registered" });
      const [updated] = await db.update(bslPlayers).set({
        categories: dsql`array_append(${bslPlayers.categories}, ${category})`,
      }).where(eq(bslPlayers.id, id)).returning();
      await audit(req, "ADMIN_ASSIGN_CATEGORY", "bsl_player", id, { category });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/bsl/admin/players/:id/categories/:cat", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const category = String(req.params.cat || "").toUpperCase();
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!p) return res.status(404).json({ message: "Player not found" });
      if (!(p.categories || []).includes(category)) return res.status(400).json({ message: "Not registered for that category" });
      // Strip from any pair in this category
      const teamsInCat = await db.select().from(bslTeams).where(and(eq(bslTeams.bslClubId, p.bslClubId || 0), eq(bslTeams.category, category)));
      if (teamsInCat.length) {
        await db.delete(bslTeamMembers).where(and(
          inArray(bslTeamMembers.bslTeamId, teamsInCat.map(t => t.id)),
          eq(bslTeamMembers.bslPlayerId, id),
        ));
      }
      const [updated] = await db.update(bslPlayers).set({
        categories: (p.categories || []).filter(c => c !== category),
      }).where(eq(bslPlayers.id, id)).returning();
      await audit(req, "ADMIN_REMOVE_CATEGORY", "bsl_player", id, { category });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin pair-manager view: returns the same shape as /api/bsl/my-club but
  // for any clubId. Used to manage roster + pairs of any club from /bsl/admin.
  app.get("/api/bsl/admin/clubs/:id/manager-view", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, club.id));
      const teamIds = teams.map(t => t.id);
      const members = teamIds.length
        ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds))
        : [];
      const roster = await db.select().from(bslPlayers).where(eq(bslPlayers.bslClubId, club.id));
      const pending = roster.filter(p => p.confirmedByOwnerAt == null);
      const confirmed = roster.filter(p => p.confirmedByOwnerAt != null);
      const userIds = Array.from(new Set(roster.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName, email: users.email, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(r => [r.id, r]));
      const playerIds = roster.map(p => p.id);
      const txRows = playerIds.length
        ? await db.select().from(bslWalletTransactions).where(inArray(bslWalletTransactions.bslPlayerId, playerIds))
        : [];
      const [league] = await db.select().from(bslLeagues).limit(1);
      const leagueFee = league?.playerFee || 0;
      const topupByPlayer = new Map<number, number>();
      const debitByPlayer = new Map<number, number>();
      for (const tx of txRows) {
        if (tx.type === "TOPUP" && tx.status === "APPROVED") topupByPlayer.set(tx.bslPlayerId, (topupByPlayer.get(tx.bslPlayerId) || 0) + tx.amount);
        else if (tx.type === "DEDUCTION") debitByPlayer.set(tx.bslPlayerId, (debitByPlayer.get(tx.bslPlayerId) || 0) + tx.amount);
      }
      const hydrate = (p: any) => ({
        ...p,
        user: userMap.get(p.userId) || null,
        paidTotal: (topupByPlayer.get(p.id) || 0) + (p.status === "ACTIVE" ? leagueFee : 0),
        spentTotal: debitByPlayer.get(p.id) || 0,
      });
      res.json({
        club,
        teams: teams.map(t => ({ ...t, members: members.filter(m => m.bslTeamId === t.id).map(m => m.bslPlayerId) })),
        pending: pending.map(hydrate),
        confirmed: confirmed.map(hydrate),
        summary: {
          roster: confirmed.length,
          pending: pending.length,
          matchesPlayed: confirmed.reduce((s, p) => s + (p.matchesPlayed || 0), 0),
          matchesWon: confirmed.reduce((s, p) => s + (p.matchesWon || 0), 0),
          moneyIn: confirmed.reduce((s, p) => s + (topupByPlayer.get(p.id) || 0) + (p.status === "ACTIVE" ? leagueFee : 0), 0),
          pairs: teams.length,
        },
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === ADMIN PENDING QUEUE ===
  app.get("/api/bsl/admin/pending", requireAdmin, async (_req, res) => {
    try {
      const clubs = await db.select().from(bslClubs).where(eq(bslClubs.status, "PENDING_VERIFICATION"));
      const players = await db.select().from(bslPlayers).where(eq(bslPlayers.status, "PENDING_VERIFICATION"));
      const wallets = await db.select().from(bslWalletTransactions).where(eq(bslWalletTransactions.status, "PENDING"));

      // Hydrate displayName + email on pending players via linked user.
      const playerUserIds = [...new Set(players.map(p => p.userId).filter(Boolean))] as number[];
      const playerUserRows = playerUserIds.length
        ? await db.select({ id: users.id, name: users.fullName, email: users.email }).from(users).where(inArray(users.id, playerUserIds))
        : [];
      const playerUserMap = new Map(playerUserRows.map(u => [u.id, u]));
      const hydratedPlayers = players.map(p => ({
        ...p,
        displayName: p.displayName || playerUserMap.get(p.userId)?.name || `Player #${p.id}`,
        email: playerUserMap.get(p.userId)?.email || null,
      }));

      // Hydrate wallet top-up rows with bslPlayer + user displayName.
      const txPlayerIds = [...new Set(wallets.map(w => w.bslPlayerId).filter(Boolean))] as number[];
      const txPlayerRows = txPlayerIds.length
        ? await db.select().from(bslPlayers).where(inArray(bslPlayers.id, txPlayerIds))
        : [];
      const txUserIds = [...new Set(txPlayerRows.map(p => p.userId).filter(Boolean))] as number[];
      const txUserRows = txUserIds.length
        ? await db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, txUserIds))
        : [];
      const txUserMap = new Map(txUserRows.map(u => [u.id, u]));
      const txPlayerMap = new Map(txPlayerRows.map(p => [p.id, p]));
      const hydratedWallets = wallets.map(w => {
        const bp = w.bslPlayerId ? txPlayerMap.get(w.bslPlayerId) : null;
        const u = bp?.userId ? txUserMap.get(bp.userId) : null;
        return {
          ...w,
          playerName: bp?.displayName || u?.name || (w.bslPlayerId ? `Player #${w.bslPlayerId}` : null),
        };
      });

      res.json({ clubs, players: hydratedPlayers, wallets: hydratedWallets });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === TEAMS (for join flow) ===
  app.get("/api/bsl/clubs/:id/teams", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, id));
      // Hydrate each pair with its players' display names so pair pickers in
      // the admin UI can show "Pair name — Player A & Player B" instead of
      // just the pair label (which is often opaque like "MD-1").
      const teamIds = teams.map(t => t.id);
      if (teamIds.length === 0) return res.json(teams);
      const members = await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds));
      const playerIds = Array.from(new Set(members.map(m => m.bslPlayerId)));
      const players = playerIds.length
        ? await db.select().from(bslPlayers).where(inArray(bslPlayers.id, playerIds))
        : [];
      const userIds = Array.from(new Set(players.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));
      const playerNameById = new Map(players.map(p => [
        p.id,
        p.displayName || userMap.get(p.userId)?.fullName || userMap.get(p.userId)?.email || `Player #${p.id}`,
      ]));
      const membersByTeam = new Map<number, string[]>();
      for (const m of members) {
        const arr = membersByTeam.get(m.bslTeamId) || [];
        const name = playerNameById.get(m.bslPlayerId);
        if (name) arr.push(name);
        membersByTeam.set(m.bslTeamId, arr);
      }
      const hydrated = teams.map(t => ({ ...t, playerNames: membersByTeam.get(t.id) || [] }));
      res.json(hydrated);
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
      const allow = ["name", "division", "additionalDivisions", "teamCount", "logoUrl", "isFlagged", "isSuspended", "adminNotes"];
      const patch: any = {};
      // Load existing club so additionalDivisions sanitisation can fall back
      // to the persisted primary when the caller patches extras only — without
      // this the primary could slip into the additional list.
      const [existing] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!existing) return res.status(404).json({ message: "Club not found" });
      for (const k of allow) {
        if (!(k in req.body)) continue;
        let v = req.body[k];
        // Sanitise additionalDivisions: trim, drop empties, dedupe, drop the
        // primary if accidentally included, cap at 8.
        if (k === "additionalDivisions") {
          if (!Array.isArray(v)) continue;
          const primary = req.body.division ?? existing.division;
          const cleaned = Array.from(new Set(v
            .map((s: any) => String(s || "").trim())
            .filter((s: string) => s.length > 0 && s !== primary)
          )).slice(0, 8);
          v = cleaned;
        }
        patch[k] = v;
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslClubs).set(patch).where(eq(bslClubs.id, id)).returning();
      await audit(req, "UPDATE_CLUB", "bsl_club", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: edit player (team assign, discipline, stat correction) ---
  app.patch("/api/bsl/admin/players/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      // NOTE: bslClubId is intentionally excluded — cross-club moves must go
      // through POST /api/bsl/admin/players/:id/transfer which enforces the
      // "no results / no pair lineup" lock + division grade-eligibility check
      // + clears captain references. Allowing it here would silently bypass
      // those guards. bslTeamId (pair within same club) is still allowed.
      const allow = ["bslTeamId", "warnings", "isSuspended", "matchBanCount", "disciplineNotes",
                     "matchesPlayed", "matchesWon", "pointsScored", "walletBalance"];
      const nullableInts = new Set(["bslTeamId"]);
      const patch: any = {};
      for (const k of allow) {
        if (!(k in req.body)) continue;
        let v = req.body[k];
        // Coerce "" → null for nullable FK ints so Postgres doesn't choke.
        if (nullableInts.has(k) && (v === "" || v === undefined)) v = null;
        patch[k] = v;
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslPlayers).set(patch).where(eq(bslPlayers.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Player not found" });
      await audit(req, "UPDATE_PLAYER", "bsl_player", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // --- ADMIN: round-robin fixture generation per division ---
  // Pulls per-category settings (rubbersPerFixture + lineup + full snapshot)
  // so generated fixtures aren't tied to the old hardcoded MS1/MS2/WS/MD/WD/XD.
  app.post("/api/bsl/admin/fixtures/generate", requireAdmin, async (req, res) => {
    try {
      const { division, leagueDayId, category } = req.body as { division: string; leagueDayId?: number; category?: string };
      if (!division) return res.status(400).json({ message: "division required" });
      const cat = category ? String(category).toUpperCase() : null;
      const teams = cat
        ? await db.select().from(bslTeams).where(and(eq(bslTeams.division, division), eq(bslTeams.category, cat)))
        : await db.select().from(bslTeams).where(eq(bslTeams.division, division));
      if (teams.length < 2) return res.status(400).json({ message: "Need ≥2 teams in division" });
      // Resolve settings: per-category override → fallback to legacy 6-rubber lineup.
      let settings: any = null;
      if (cat) {
        const [row] = await db.select().from(bslCategorySettings)
          .where(and(eq(bslCategorySettings.bslLeagueId, 1), eq(bslCategorySettings.category, cat))).limit(1);
        settings = row || null;
      }
      const lineup: string[] = (settings?.rubberLineup && settings.rubberLineup.length)
        ? settings.rubberLineup
        : ["MS1","MS2","WS","MD","WD","XD"];
      // League-day-level override beats the category default — lets admins
      // pick the rubbers count when they create the day.
      let dayOverride: number | null = null;
      if (leagueDayId != null) {
        const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, leagueDayId)).limit(1);
        if (day && day.rubbersPerFixture && day.rubbersPerFixture > 0) dayOverride = day.rubbersPerFixture;
      }
      const rubbersPerFixture = dayOverride || settings?.rubbersPerFixture || lineup.length;
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
            category: cat,
            rulesSnapshot: settings as any,
            homeTeamId: r % 2 === 0 ? home.id : away.id,
            awayTeamId: r % 2 === 0 ? away.id : home.id,
            court: null,
            startTime: null,
          }).returning();
          for (let k = 0; k < rubbersPerFixture; k++) {
            const t = (lineup[k % lineup.length] || "MD") as any;
            await db.insert(bslRubbers).values({
              bslFixtureId: f.id, rubberNumber: k+1, rubberType: t,
            });
          }
          created.push(f);
        }
        // rotate (keep first fixed)
        arr.splice(1, 0, arr.pop()!);
      }
      await audit(req, "GENERATE_FIXTURES", "bsl_division", null, { division, leagueDayId, category: cat, count: created.length });
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
      // Lifecycle guard — status changes always allowed when LIVE; CLOSED locks all.
      const block = await assertFixtureMutable(id, new Set(["status"]), "status");
      if (block) return res.status(409).json({ message: block });
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
      const { date, status, rubbersPerFixture, division, category } = req.body || {};
      if (!date) return res.status(400).json({ message: "date required" });
      const rpf = rubbersPerFixture == null || rubbersPerFixture === ""
        ? null
        : Math.max(1, Math.min(60, Math.round(Number(rubbersPerFixture))));
      const venueIn = req.body?.venue;
      const notesIn = req.body?.notes;
      const [row] = await db.insert(bslLeagueDays).values({
        bslLeagueId: 1,
        date: new Date(date),
        status: status || "UPCOMING",
        rubbersPerFixture: rpf,
        division: division ? String(division).trim().slice(0, 56) || null : null,
        category: category ? String(category).trim().toUpperCase().slice(0, 16) || null : null,
        venue: typeof venueIn === "string" && venueIn.trim() ? venueIn.trim().slice(0, 240) : null,
        notes: typeof notesIn === "string" && notesIn.trim() ? notesIn.trim().slice(0, 2000) : null,
      } as any).returning();
      await audit(req, "CREATE_LEAGUE_DAY", "bsl_league_day", row.id, { date, rubbersPerFixture: rpf, division, category });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  // Generic PATCH for league-day details (date, division, category, rubbers
  // per fixture, legacy status). Use the dedicated /:id/state route for
  // lifecycle transitions — that one runs the DRAFT→PUBLISHED→LIVE→CLOSED
  // guards which we don't want to duplicate here.
  app.patch("/api/bsl/admin/league-days/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      const patch: Record<string, any> = {};
      if ("date" in body) {
        const d = body.date ? new Date(body.date) : null;
        if (!d || isNaN(d.getTime())) return res.status(400).json({ message: "Invalid date" });
        patch.date = d;
      }
      if ("status" in body && body.status) patch.status = String(body.status);
      if ("division" in body) {
        const v = body.division == null ? null : String(body.division).trim().slice(0, 56);
        patch.division = v && v.length > 0 ? v : null;
      }
      if ("category" in body) {
        const v = body.category == null ? null : String(body.category).trim().toUpperCase().slice(0, 16);
        patch.category = v && v.length > 0 ? v : null;
      }
      if ("rubbersPerFixture" in body) {
        const v = body.rubbersPerFixture;
        patch.rubbersPerFixture = v == null || v === ""
          ? null
          : Math.max(1, Math.min(60, Math.round(Number(v))));
      }
      if ("venue" in body) {
        const v = body.venue;
        patch.venue = typeof v === "string" && v.trim() ? v.trim().slice(0, 240) : null;
      }
      if ("notes" in body) {
        const v = body.notes;
        patch.notes = typeof v === "string" && v.trim() ? v.trim().slice(0, 2000) : null;
      }
      if ("maxMatches" in body) {
        const v = body.maxMatches;
        patch.maxMatches = v == null || v === ""
          ? null
          : Math.max(0, Math.min(200, Math.round(Number(v))));
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ message: "Nothing to update" });
      // Lifecycle guard. Date can be edited any time. Structural fields
      // (division/category/rubbersPerFixture/status) would desync from already-
      // snapshotted fixtures, so refuse them once the day is LIVE or CLOSED.
      const structuralKeys = ["division", "category", "rubbersPerFixture", "status"];
      const touchesStructural = structuralKeys.some(k => k in patch);
      if (touchesStructural) {
        const [existing] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, id)).limit(1);
        if (!existing) return res.status(404).json({ message: "League day not found" });
        const state = (existing.state || "DRAFT").toUpperCase();
        if (state === "LIVE" || state === "CLOSED") {
          return res.status(409).json({
            message: `League day is ${state} — only the date can be edited at this stage. Move it back to DRAFT or PUBLISHED to change division/category/rubbers, then Regenerate fixtures.`,
          });
        }
      }
      const [updated] = await db.update(bslLeagueDays).set(patch).where(eq(bslLeagueDays.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "League day not found" });
      await audit(req, "UPDATE_LEAGUE_DAY", "bsl_league_day", id, patch);
      res.json(updated);
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

      const playerIds = [...new Set(rows.map(r => r.bslPlayerId).filter(Boolean))] as number[];
      const playerRows = playerIds.length
        ? await db.select().from(bslPlayers).where(inArray(bslPlayers.id, playerIds))
        : [];
      const userIds = [...new Set(playerRows.map(p => p.userId).filter(Boolean))] as number[];
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));
      const playerMap = new Map(playerRows.map(p => [p.id, p]));
      const hydrated = rows.map(r => {
        const bp = r.bslPlayerId ? playerMap.get(r.bslPlayerId) : null;
        const u = bp?.userId ? userMap.get(bp.userId) : null;
        return {
          ...r,
          playerName: bp?.displayName || u?.name || (r.bslPlayerId ? `Player #${r.bslPlayerId}` : null),
        };
      });
      res.json(hydrated);
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
      const url = await saveBufferToBucket(req.file.buffer, "bsl", req.file.originalname);
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
    // Multi-admin parity: a user is the "owner" of a club from a manager-API
    // perspective if they are the listed managerUserId OR appear in the
    // club's adminUserIds[] additional-admin list. Same source-of-truth as
    // loadClubForManager() so /api/bsl/my-club gives club admins the full
    // owner-equivalent dashboard.
    const [club] = await db.select().from(bslClubs).where(
      or(eq(bslClubs.managerUserId, u.id), dsql`${bslClubs.adminUserIds} @> ARRAY[${u.id}]::int[]`)
    ).limit(1);
    return { club: club ?? null, canManage: !!club || isAdminish(u) };
  }

  async function loadClubForManager(req: Request, clubId: number): Promise<{ club: any | null; reason?: string }> {
    const u = (req as any).user;
    const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, clubId)).limit(1);
    if (!club) return { club: null, reason: "Club not found" };
    // Owner OR additional club admin OR super admin can manage. adminUserIds
    // is the multi-admin extension — they get the same permissions as the
    // managerUserId on every endpoint that funnels through this helper.
    const isOwner = club.managerUserId === u.id;
    const isClubAdmin = Array.isArray((club as any).adminUserIds) && (club as any).adminUserIds.includes(u.id);
    if (!isOwner && !isClubAdmin && !isAdminish(u)) return { club: null, reason: "Not your club" };
    return { club };
  }

  // Division eligibility: returns true when the player's grade is allowed in
  // the given division. Empty/missing restriction list = no restriction.
  // An ungraded player is blocked from any division that DOES have a list.
  function isGradeAllowedInDivision(grade: string | null | undefined, division: string | null | undefined, divisionGrades: Record<string, string[]> | null | undefined): boolean {
    if (!division) return true;
    const map = divisionGrades || {};
    const allowed = Array.isArray(map[division]) ? map[division] : [];
    if (allowed.length === 0) return true; // no restriction set
    if (!grade) return false;
    return allowed.includes(grade);
  }

  // ---------------------------------------------------------------------------
  // PERMISSION & GRADING ENDPOINTS
  // ---------------------------------------------------------------------------

  // Rename a division everywhere it's referenced. Divisions are stored as
  // string names across `bsl_clubs.division`, `bsl_teams.division`,
  // `bsl_league_days.division`, `bsl_prizes.division`, and the league's own
  // `divisions` array, so we wrap the cascade in a single transaction. No row
  // IDs change — only the label propagates atomically. Idempotent: renaming
  // to the same name is a no-op.
  app.post("/api/bsl/admin/divisions/rename", requireAdmin, async (req, res) => {
    try {
      const from = String(req.body?.from ?? "").trim();
      const to = String(req.body?.to ?? "").trim().slice(0, 56);
      if (!from || !to) return res.status(400).json({ message: "from and to required" });
      if (from === to) return res.json({ ok: true, noop: true });
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      if (!league) return res.status(404).json({ message: "League not configured" });
      const divisions = league.divisions || [];
      if (!divisions.includes(from)) return res.status(404).json({ message: `Division "${from}" not found` });
      if (divisions.includes(to)) return res.status(409).json({ message: `Division "${to}" already exists` });
      await db.transaction(async (tx) => {
        await tx.update(bslClubs).set({ division: to }).where(eq(bslClubs.division, from));
        await tx.update(bslTeams).set({ division: to }).where(eq(bslTeams.division, from));
        await tx.execute(dsql`UPDATE bsl_league_days SET division = ${to} WHERE division = ${from}`);
        await tx.execute(dsql`UPDATE bsl_prizes SET division = ${to} WHERE division = ${from}`);
        // Rename inside additional_divisions[] arrays too. Two-step: replace
        // `from` → `to` element-wise, then dedupe via unnest+array_agg, then
        // strip any entry that now duplicates the primary division (which
        // happens when the club already had `to` as primary and `from` as an
        // extra — after rename the extra would alias the primary).
        await tx.execute(dsql`
          UPDATE bsl_clubs
             SET additional_divisions = COALESCE(
               (SELECT array_agg(DISTINCT x ORDER BY x)
                  FROM unnest(array_replace(additional_divisions, ${from}, ${to})) AS x
                 WHERE x <> division),
               ARRAY[]::text[]
             )
           WHERE ${from} = ANY(additional_divisions)
              OR ${to}   = ANY(additional_divisions)`);
        const newDivisions = divisions.map((d) => (d === from ? to : d));
        // Move the divisionGrades key over so the eligibility list follows the rename.
        const dg = { ...((league.divisionGrades || {}) as Record<string, string[]>) };
        if (from in dg) { dg[to] = dg[from]; delete dg[from]; }
        await tx.update(bslLeagues).set({ divisions: newDivisions, divisionGrades: dg, updatedAt: new Date() }).where(eq(bslLeagues.id, 1));
      });
      await audit(req, "DIVISION_RENAME", "bsl_leagues", 1, { from, to });
      res.json({ ok: true, from, to });
    } catch (err: any) {
      console.error("[bsl divisions rename]", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Set / clear a player's grade. Permission: super admin OR club admin/owner
  // of the player's current club. Sending grade:null clears the grade.
  app.patch("/api/bsl/players/:id/grade", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = (req as any).user;
      const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!player) return res.status(404).json({ message: "Player not found" });
      let allowed = isAdminish(u);
      if (!allowed && player.bslClubId) {
        const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, player.bslClubId)).limit(1);
        if (club && (club.managerUserId === u.id || (Array.isArray((club as any).adminUserIds) && (club as any).adminUserIds.includes(u.id)))) {
          allowed = true;
        }
      }
      if (!allowed) return res.status(403).json({ message: "Not allowed to edit this player's grade" });
      const raw = req.body?.grade;
      let grade: string | null = null;
      if (raw === null || raw === "" || raw === undefined) grade = null;
      else {
        grade = String(raw).trim().toUpperCase().slice(0, 12) || null;
        // Validate against the league's grade catalogue (when configured)
        const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
        const known = (league?.playerGrades || []).map((g: any) => String(g.code));
        if (grade && known.length && !known.includes(grade)) {
          return res.status(400).json({ message: `Unknown grade "${grade}". Known: ${known.join(", ")}` });
        }
      }
      const [updated] = await db.update(bslPlayers).set({ grade }).where(eq(bslPlayers.id, id)).returning();
      await audit(req, "PLAYER_SET_GRADE", "bsl_players", id, { grade });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Transfer a player to another club (which may belong to a different
  // division). Locked once the player has any results / appearances in their
  // current division during the active season. Super-admin only — divisions
  // are competitive boundaries and crossing them mid-season is high-impact.
  app.post("/api/bsl/admin/players/:id/transfer", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const toBslClubId = Number(req.body?.toBslClubId);
      if (!Number.isFinite(toBslClubId)) return res.status(400).json({ message: "toBslClubId required" });
      const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, id)).limit(1);
      if (!player) return res.status(404).json({ message: "Player not found" });
      const [toClub] = await db.select().from(bslClubs).where(eq(bslClubs.id, toBslClubId)).limit(1);
      if (!toClub) return res.status(404).json({ message: "Destination club not found" });
      if (player.bslClubId === toBslClubId) return res.status(400).json({ message: "Player already in that club" });
      // Lock check: any played matches OR active pair assignment counts as
      // "played or has recorded results" for the current season.
      if (player.matchesPlayed > 0) {
        return res.status(409).json({ message: "Player has match records this season. Transfer locked until next season." });
      }
      const memberships = await db.select().from(bslTeamMembers).where(eq(bslTeamMembers.bslPlayerId, id)).limit(1);
      if (memberships.length > 0) {
        return res.status(409).json({ message: "Player is currently in a pair lineup. Remove from pair first." });
      }
      // Eligibility check against destination division.
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      if (!isGradeAllowedInDivision(player.grade, toClub.division, league?.divisionGrades as any)) {
        const allowed = (league?.divisionGrades as any)?.[toClub.division] || [];
        return res.status(400).json({ message: `Player grade "${player.grade || "ungraded"}" is not allowed in ${toClub.division}. Allowed: ${allowed.join(", ")}` });
      }
      const updated = await db.transaction(async (tx) => {
        // Clear captain slots that referenced this player on the old club's
        // teams — captain integrity must not drift across the move. The new
        // club's owner can re-assign captains afterwards.
        await tx.update(bslTeams).set({ captainPlayerId: null } as any).where(eq(bslTeams.captainPlayerId, id));
        const [row] = await tx.update(bslPlayers).set({
          bslClubId: toBslClubId,
          bslTeamId: null,
          confirmedByOwnerAt: null, // requires re-confirmation by new club owner
        }).where(eq(bslPlayers.id, id)).returning();
        return row;
      });
      await audit(req, "PLAYER_TRANSFER", "bsl_players", id, { fromClubId: player.bslClubId, toClubId: toBslClubId });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Replace the additional-admin list on a club. Only the current
  // managerUserId or super admin may edit. Each id must be an ACTIVE player
  // of the club. Owner is implicitly an admin and is removed from the list
  // if accidentally included.
  app.patch("/api/bsl/clubs/:id/admins", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = (req as any).user;
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      if (club.managerUserId !== u.id && !isAdminish(u)) return res.status(403).json({ message: "Only the owner or super admin can change club admins" });
      const raw = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
      const wantedIds = Array.from(new Set(raw.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n !== club.managerUserId))).slice(0, 16) as number[];
      // Each wanted user must be an ACTIVE player of this club.
      let validatedIds: number[] = [];
      if (wantedIds.length) {
        const players = await db.select().from(bslPlayers).where(and(eq(bslPlayers.bslClubId, id), eq(bslPlayers.status, "ACTIVE")));
        const activeUserIds = new Set(players.map((p) => p.userId));
        validatedIds = wantedIds.filter((uid) => activeUserIds.has(uid));
        if (validatedIds.length !== wantedIds.length) {
          return res.status(400).json({ message: "All admins must be ACTIVE players of this club" });
        }
      }
      const [updated] = await db.update(bslClubs).set({ adminUserIds: validatedIds } as any).where(eq(bslClubs.id, id)).returning();
      await audit(req, "CLUB_SET_ADMINS", "bsl_clubs", id, { adminUserIds: validatedIds });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Reassign club ownership (managerUserId). OWNER-only. The new owner must
  // be an existing user. Any existing additional-admin entry for them is
  // pruned (they no longer need to be in the secondary list).
  app.patch("/api/bsl/admin/clubs/:id/owner", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = Number(req.body?.userId);
      if (!Number.isFinite(userId)) return res.status(400).json({ message: "userId required" });
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, id)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return res.status(404).json({ message: "User not found" });
      const newAdmins = (Array.isArray((club as any).adminUserIds) ? (club as any).adminUserIds : []).filter((x: number) => x !== userId);
      const [updated] = await db.update(bslClubs).set({ managerUserId: userId, adminUserIds: newAdmins } as any).where(eq(bslClubs.id, id)).returning();
      await audit(req, "CLUB_REASSIGN_OWNER", "bsl_clubs", id, { from: club.managerUserId, to: userId });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Set / clear the captain for a team (per division). Allowed for the
  // owning club's manager, additional club admin, or super admin. Captain
  // must be an ACTIVE player of the same club. Pass playerId:null to clear.
  app.patch("/api/bsl/teams/:id/captain", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const u = (req as any).user;
      const [team] = await db.select().from(bslTeams).where(eq(bslTeams.id, id)).limit(1);
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, team.bslClubId)).limit(1);
      if (!club) return res.status(404).json({ message: "Club not found" });
      const isOwner = club.managerUserId === u.id;
      const isClubAdmin = Array.isArray((club as any).adminUserIds) && (club as any).adminUserIds.includes(u.id);
      if (!isOwner && !isClubAdmin && !isAdminish(u)) return res.status(403).json({ message: "Not allowed" });
      const raw = req.body?.playerId;
      let captainPlayerId: number | null = null;
      if (raw !== null && raw !== "" && raw !== undefined) {
        const pid = Number(raw);
        if (!Number.isFinite(pid)) return res.status(400).json({ message: "playerId must be a number or null" });
        const [player] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, pid)).limit(1);
        if (!player) return res.status(404).json({ message: "Captain player not found" });
        if (player.bslClubId !== team.bslClubId) return res.status(400).json({ message: "Captain must belong to the same club" });
        if (player.status !== "ACTIVE") return res.status(400).json({ message: "Captain must be an ACTIVE player" });
        captainPlayerId = pid;
      }
      const [updated] = await db.update(bslTeams).set({ captainPlayerId } as any).where(eq(bslTeams.id, id)).returning();
      await audit(req, "TEAM_SET_CAPTAIN", "bsl_teams", id, { captainPlayerId });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Manager dashboard: club + teams (with members) + roster + pending join
  // requests + per-player paid totals + club-wide stats.
  app.get("/api/bsl/my-club", requireAuth, async (req, res) => {
    try {
      const { club } = await loadOwnedClub(req);
      if (!club) return res.json({ club: null });
      const teams = await db.select().from(bslTeams).where(eq(bslTeams.bslClubId, club.id));
      const teamIds = teams.map(t => t.id);
      const members = teamIds.length
        ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, teamIds))
        : [];
      const roster = await db.select().from(bslPlayers).where(eq(bslPlayers.bslClubId, club.id));
      const pending = roster.filter(p => p.confirmedByOwnerAt == null);
      const confirmed = roster.filter(p => p.confirmedByOwnerAt != null);

      const userIds = Array.from(new Set(roster.map(p => p.userId)));
      const userRows = userIds.length
        ? await db.select({ id: users.id, name: users.fullName, email: users.email, phone: users.phone }).from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(r => [r.id, r]));

      // Money in: sum of APPROVED TOPUPs per player + the one-off player league
      // fee they had to clear to reach status=ACTIVE.
      const playerIds = roster.map(p => p.id);
      const txRows = playerIds.length
        ? await db.select().from(bslWalletTransactions).where(inArray(bslWalletTransactions.bslPlayerId, playerIds))
        : [];
      const [league] = await db.select().from(bslLeagues).limit(1);
      const leagueFee = league?.playerFee || 0;
      const topupByPlayer = new Map<number, number>();
      const debitByPlayer = new Map<number, number>();
      for (const tx of txRows) {
        if (tx.type === "TOPUP" && tx.status === "APPROVED") {
          topupByPlayer.set(tx.bslPlayerId, (topupByPlayer.get(tx.bslPlayerId) || 0) + tx.amount);
        } else if (tx.type === "DEBIT") {
          debitByPlayer.set(tx.bslPlayerId, (debitByPlayer.get(tx.bslPlayerId) || 0) + tx.amount);
        }
      }
      const hydrate = (p: any) => {
        const topupTotal = topupByPlayer.get(p.id) || 0;
        const spent = debitByPlayer.get(p.id) || 0;
        const leagueFeePaid = p.status === "ACTIVE" ? leagueFee : 0;
        return {
          ...p,
          user: userMap.get(p.userId) || null,
          paidTotal: topupTotal + leagueFeePaid, // money the player has put into BSL
          spentTotal: spent,                     // money debited (cat fees etc.)
        };
      };

      const summary = {
        roster: confirmed.length,
        pending: pending.length,
        matchesPlayed: confirmed.reduce((s, p) => s + (p.matchesPlayed || 0), 0),
        matchesWon: confirmed.reduce((s, p) => s + (p.matchesWon || 0), 0),
        moneyIn: confirmed.reduce((s, p) => {
          const topup = topupByPlayer.get(p.id) || 0;
          return s + topup + (p.status === "ACTIVE" ? leagueFee : 0);
        }, 0),
        pairs: teams.length,
      };

      res.json({
        club,
        teams: teams.map(t => ({ ...t, members: members.filter(m => m.bslTeamId === t.id).map(m => m.bslPlayerId) })),
        pending: pending.map(hydrate),
        confirmed: confirmed.map(hydrate),
        summary,
        // Hydrated league bits the Club Manager UI needs (division catalogue
        // + the join-another-division fee). Avoids a second round-trip.
        league: league ? {
          divisions: league.divisions || [],
          divisionJoinFeePence: (league as any).divisionJoinFeePence ?? 2500,
        } : null,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ---------------------------------------------------------------------------
  // Club joins an ADDITIONAL division (pay-per-division). The flat fee comes
  // from `bsl_leagues.divisionJoinFeePence` and is deducted from the *calling*
  // user's player wallet (the manager / club admin pressing the button must be
  // a confirmed BSL player in this club). Atomic txn with FOR UPDATE on the
  // wallet row so two simultaneous clicks can't double-charge or under-charge.
  // ---------------------------------------------------------------------------
  app.post("/api/bsl/clubs/:id/join-division", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const division = String(req.body?.division ?? "").trim();
      if (!division) return res.status(400).json({ message: "division required" });
      const { club, reason } = await loadClubForManager(req, id);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const [league] = await db.select().from(bslLeagues).where(eq(bslLeagues.id, 1)).limit(1);
      if (!league) return res.status(500).json({ message: "League not configured" });
      const knownDivisions: string[] = (league as any).divisions || [];
      if (knownDivisions.length && !knownDivisions.includes(division)) {
        return res.status(400).json({ message: `Division "${division}" doesn't exist in this league` });
      }
      if (division === club.division) return res.status(400).json({ message: "Already your primary division" });
      const u: any = (req as any).user;
      const fee = Math.max(0, Number((league as any).divisionJoinFeePence ?? 2500));

      // Everything race-sensitive happens inside the txn: lock the club row
      // first, re-read additionalDivisions under that lock, then lock the
      // caller's player wallet (when a fee applies). Two concurrent join
      // requests will queue on the club row instead of double-charging or
      // losing one of the divisions to a last-write-wins overwrite.
      const result = await db.transaction(async (tx) => {
        const clubLock = await tx.execute(dsql`
          SELECT id, name, division, additional_divisions
            FROM bsl_clubs WHERE id = ${club.id} LIMIT 1 FOR UPDATE`);
        const cRow: any = (clubLock as any).rows?.[0];
        if (!cRow) throw Object.assign(new Error("Club not found"), { status: 404 });
        const currentExtras: string[] = Array.isArray(cRow.additional_divisions) ? cRow.additional_divisions : [];
        if (division === cRow.division) {
          throw Object.assign(new Error("Already your primary division"), { status: 400 });
        }
        if (currentExtras.includes(division)) {
          throw Object.assign(new Error("Already joined that division"), { status: 409 });
        }
        if (currentExtras.length >= 8) {
          throw Object.assign(new Error("Maximum of 8 additional divisions reached"), { status: 400 });
        }

        let chargedPlayerId: number | null = null;
        let walletAfter: number | null = null;
        let txRow: any = null;
        if (fee > 0) {
          // Lock the caller's player row so the deduction is race-safe.
          const lockedRows = await tx.execute(dsql`
            SELECT id, wallet_balance FROM bsl_players
             WHERE user_id = ${u.id} AND bsl_club_id = ${club.id}
             LIMIT 1 FOR UPDATE`);
          const row: any = (lockedRows as any).rows?.[0];
          if (!row) {
            throw Object.assign(new Error("You must be a confirmed BSL player in this club to pay the join fee"), { status: 400 });
          }
          const balance = Number(row.wallet_balance ?? 0);
          if (balance < fee) {
            throw Object.assign(new Error(`Insufficient wallet balance — need £${(fee/100).toFixed(2)}, have £${(balance/100).toFixed(2)}. Top up first.`), { status: 400 });
          }
          chargedPlayerId = row.id;
          walletAfter = balance - fee;
          await tx.update(bslPlayers)
            .set({ walletBalance: walletAfter })
            .where(eq(bslPlayers.id, row.id));
          [txRow] = await tx.insert(bslWalletTransactions).values({
            bslPlayerId: row.id,
            type: "DEDUCTION",
            amount: fee,
            status: "APPROVED",
            reference: genRef("BSL-DIV"),
            description: `Division join · ${division} · ${cRow.name}`,
            reviewedById: u.id,
            reviewedAt: new Date(),
          }).returning();
        }
        const [updated] = await tx.update(bslClubs)
          .set({ additionalDivisions: [...currentExtras, division] })
          .where(eq(bslClubs.id, club.id))
          .returning();
        return { updated, chargedPlayerId, walletAfter, txRow };
      });

      await audit(req, "CLUB_JOIN_DIVISION", "bsl_club", club.id, {
        division,
        feePence: fee,
        chargedPlayerId: result.chargedPlayerId,
        walletAfterPence: result.walletAfter,
      });
      res.json({
        ok: true,
        club: result.updated,
        feePence: fee,
        walletAfterPence: result.walletAfter,
        transaction: result.txRow,
      });
    } catch (err: any) {
      const status = err?.status || 500;
      if (status === 500) console.error("[bsl join-division]", err);
      res.status(status).json({ message: err.message || "Failed to join division" });
    }
  });

  // Manager edits a player's profile fields (display name + bio). Same fields
  // the player can edit themselves on /bsl/profile — keeps scope tight.
  app.patch("/api/bsl/clubs/:clubId/players/:playerId", requireAuth, async (req, res) => {
    try {
      const clubId = Number(req.params.clubId);
      const playerId = Number(req.params.playerId);
      const { club, reason } = await loadClubForManager(req, clubId);
      if (!club) return res.status(reason === "Not your club" ? 403 : 404).json({ message: reason || "Not found" });
      const [p] = await db.select().from(bslPlayers).where(eq(bslPlayers.id, playerId)).limit(1);
      if (!p) return res.status(404).json({ message: "Player not found" });
      if (p.bslClubId !== clubId) return res.status(403).json({ message: "Player not in this club" });
      const patch: any = {};
      if (typeof req.body.displayName === "string") patch.displayName = req.body.displayName.slice(0, 80);
      if (typeof req.body.bio === "string") patch.bio = req.body.bio.slice(0, 600);
      if (!Object.keys(patch).length) return res.status(400).json({ message: "Nothing to update" });
      const [updated] = await db.update(bslPlayers).set(patch).where(eq(bslPlayers.id, playerId)).returning();
      await audit(req, "MANAGER_UPDATE_PLAYER", "bsl_players", playerId, patch);
      res.json(updated);
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
      // Division the pair belongs to. Defaults to the club's primary division
      // for backwards-compatible callers that only send `category`. When the
      // caller specifies an explicit division, validate it against the set of
      // divisions this club has actually joined (primary + extras).
      const requestedDivision = req.body.division ? String(req.body.division).trim() : "";
      const joinedDivisions = new Set<string>([
        club.division,
        ...(Array.isArray((club as any).additionalDivisions) ? (club as any).additionalDivisions : []),
      ]);
      const division = requestedDivision || club.division;
      if (!joinedDivisions.has(division)) {
        return res.status(400).json({ message: `Club hasn't joined division "${division}". Join it first from the Divisions panel.` });
      }
      // pairNumber is per (division, category) so MD-A in Premier and MD-A in
      // Social are independent and start their own A/B/C lettering sequence.
      const existing = await db.select().from(bslTeams).where(and(
        eq(bslTeams.bslClubId, id),
        eq(bslTeams.division, division),
        eq(bslTeams.category, category),
      ));
      const pairNumber = (existing.reduce((m, t) => Math.max(m, t.pairNumber || 0), 0) || 0) + 1;
      const letter = String.fromCharCode(64 + pairNumber); // A, B, C…
      const [created] = await db.insert(bslTeams).values({
        bslClubId: id,
        name: `${club.name} ${division} ${category} Pair ${letter}`,
        division,
        category, pairNumber,
      } as any).returning();
      await audit(req, "MANAGER_CREATE_PAIR", "bsl_teams", created.id, { division, category, pairNumber });
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
      // One player can only be in one pair per (DIVISION, category). With the
      // multi-division-club model in place, the same player is allowed to be in
      // the same category across different divisions (e.g. play MD in Premier
      // AND in Social) — siblings are only the pairs in the same division+cat.
      if (team.category) {
        const siblings = await db.select().from(bslTeams).where(and(
          eq(bslTeams.bslClubId, club.id),
          eq(bslTeams.division, team.division),
          eq(bslTeams.category, team.category),
        ));
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

  // Rich player dashboard: profile + club + per-category team + partner +
  // match history + next fixture. One round-trip for the /bsl/profile screen.
  app.get("/api/bsl/players/me/dashboard", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const [me] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, u.id)).limit(1);
      if (!me) return res.json({ player: null });
      const [league] = await db.select().from(bslLeagues).limit(1);
      const club = me.bslClubId
        ? (await db.select().from(bslClubs).where(eq(bslClubs.id, me.bslClubId)).limit(1))[0] || null
        : null;

      // Teams I belong to (via the join table) — gives partner + category context.
      const myMemberships = await db.select().from(bslTeamMembers).where(eq(bslTeamMembers.bslPlayerId, me.id));
      const myTeamIds = myMemberships.map(m => m.bslTeamId);
      const myTeams = myTeamIds.length
        ? await db.select().from(bslTeams).where(inArray(bslTeams.id, myTeamIds))
        : [];
      // All other members of those teams = my partners
      const allMembers = myTeamIds.length
        ? await db.select().from(bslTeamMembers).where(inArray(bslTeamMembers.bslTeamId, myTeamIds))
        : [];
      const partnerPlayerIds = Array.from(new Set(allMembers.map(m => m.bslPlayerId).filter(id => id !== me.id)));
      const partnerPlayers = partnerPlayerIds.length
        ? await db.select().from(bslPlayers).where(inArray(bslPlayers.id, partnerPlayerIds))
        : [];
      const partnerUserIds = Array.from(new Set(partnerPlayers.map(p => p.userId)));
      const partnerUserRows = partnerUserIds.length
        ? await db.select({ id: users.id, name: users.fullName, nickname: users.nickname, avatarUrl: users.profilePictureUrl }).from(users).where(inArray(users.id, partnerUserIds))
        : [];
      const userMap = new Map(partnerUserRows.map(r => [r.id, r]));
      const playerMap = new Map(partnerPlayers.map(p => [p.id, p]));
      const teamPartners: Record<number, any[]> = {};
      for (const m of allMembers) {
        if (m.bslPlayerId === me.id) continue;
        const p = playerMap.get(m.bslPlayerId);
        const u2 = p ? userMap.get(p.userId) : null;
        if (!teamPartners[m.bslTeamId]) teamPartners[m.bslTeamId] = [];
        teamPartners[m.bslTeamId].push({
          playerId: m.bslPlayerId,
          displayName: p?.displayName || u2?.name || u2?.nickname || `Player #${m.bslPlayerId}`,
          avatarUrl: u2?.avatarUrl || null,
        });
      }
      const categories = (me.categories || []).map((cat: string) => {
        const team = myTeams.find(t => t.category === cat) || null;
        return {
          category: cat,
          team: team ? { id: team.id, name: team.name, division: team.division, pairNumber: team.pairNumber } : null,
          partners: team ? (teamPartners[team.id] || []) : [],
        };
      });

      // Match history + upcoming match: pull rubbers where I'm assigned, join
      // back to fixtures + teams. Cap to last 20 for the profile view.
      const myRubbers = await db.select().from(bslRubbers).where(or(
        eq(bslRubbers.homePlayer1Id, me.id),
        eq(bslRubbers.homePlayer2Id, me.id),
        eq(bslRubbers.awayPlayer1Id, me.id),
        eq(bslRubbers.awayPlayer2Id, me.id),
      ));
      const fixtureIds = Array.from(new Set(myRubbers.map(r => r.bslFixtureId)));
      const myFixtures = fixtureIds.length
        ? await db.select().from(bslFixtures).where(inArray(bslFixtures.id, fixtureIds))
        : [];
      const fxTeamIds = Array.from(new Set(myFixtures.flatMap(f => [f.homeTeamId, f.awayTeamId])));
      const fxTeams = fxTeamIds.length
        ? await db.select().from(bslTeams).where(inArray(bslTeams.id, fxTeamIds))
        : [];
      const fxClubIds = Array.from(new Set(fxTeams.map(t => t.bslClubId)));
      const fxClubs = fxClubIds.length
        ? await db.select().from(bslClubs).where(inArray(bslClubs.id, fxClubIds))
        : [];
      const fxTeamMap = new Map(fxTeams.map(t => [t.id, t]));
      const fxClubMap = new Map(fxClubs.map(c => [c.id, c]));
      const myTeamIdSet = new Set(myTeamIds);
      // Authoritative side per fixture = where the player actually appears in
      // a rubber slot. Falls back to team-membership / bslTeamId if the player
      // hasn't been slotted yet so upcoming fixtures still render correctly.
      const sideByFixture = new Map<number, "HOME" | "AWAY">();
      for (const r of myRubbers) {
        if (sideByFixture.has(r.bslFixtureId)) continue;
        if (r.homePlayer1Id === me.id || r.homePlayer2Id === me.id) sideByFixture.set(r.bslFixtureId, "HOME");
        else if (r.awayPlayer1Id === me.id || r.awayPlayer2Id === me.id) sideByFixture.set(r.bslFixtureId, "AWAY");
      }
      const enrichFixture = (f: any) => {
        const ht = fxTeamMap.get(f.homeTeamId);
        const at = fxTeamMap.get(f.awayTeamId);
        const hc = ht ? fxClubMap.get(ht.bslClubId) : null;
        const ac = at ? fxClubMap.get(at.bslClubId) : null;
        const slot = sideByFixture.get(f.id);
        const myIsHome = slot
          ? slot === "HOME"
          : (ht && (myTeamIdSet.has(ht.id) || ht.id === me.bslTeamId)) ? true
          : (at && (myTeamIdSet.has(at.id) || at.id === me.bslTeamId)) ? false
          : false;
        const us = myIsHome ? hc : ac;
        const them = myIsHome ? ac : hc;
        const usRubbers = myIsHome ? f.homeRubbers : f.awayRubbers;
        const themRubbers = myIsHome ? f.awayRubbers : f.homeRubbers;
        let outcome: "WIN" | "LOSS" | "DRAW" | null = null;
        if (f.status === "FINISHED") {
          if (usRubbers > themRubbers) outcome = "WIN";
          else if (usRubbers < themRubbers) outcome = "LOSS";
          else outcome = "DRAW";
        }
        return {
          id: f.id, status: f.status, court: f.court, startTime: f.startTime,
          us: { name: us?.name || "We", logoUrl: us?.logoUrl || null, rubbers: usRubbers },
          them: { name: them?.name || "Opponent", logoUrl: them?.logoUrl || null, rubbers: themRubbers },
          outcome,
        };
      };
      const finished = myFixtures.filter(f => f.status === "FINISHED")
        .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
        .slice(0, 20)
        .map(enrichFixture);
      const upcoming = myFixtures.filter(f => f.status !== "FINISHED")
        .sort((a, b) => (a.startTime?.getTime() || Infinity) - (b.startTime?.getTime() || Infinity))
        .slice(0, 5)
        .map(enrichFixture);

      // Wallet activity (last 8) for the profile snapshot
      const walletTx = await db.select().from(bslWalletTransactions)
        .where(eq(bslWalletTransactions.bslPlayerId, me.id))
        .orderBy(desc(bslWalletTransactions.createdAt))
        .limit(8);

      res.json({
        player: me,
        club,
        league: league ? {
          name: league.name,
          venueName: league.venueName,
          nextLeagueDay: league.nextLeagueDay,
          categoryFees: league.categoryFees,
          playerFee: league.playerFee,
        } : null,
        categories,
        nextMatch: upcoming[0] || null,
        upcoming,
        history: finished,
        walletTx,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Player pays the BSL league fee from their wallet balance — flips them to ACTIVE.
  // Used when a player has been topping up their wallet but hasn't completed the
  // separate £league-fee bank-transfer flow. Atomic conditional update prevents
  // double-charging and races.
  app.post("/api/bsl/players/me/pay-league-fee-from-wallet", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const [me] = await db.select().from(bslPlayers).where(eq(bslPlayers.userId, u.id)).limit(1);
      if (!me) return res.status(404).json({ message: "Join a club first" });
      if (me.status === "ACTIVE") return res.status(400).json({ message: "League fee already paid" });
      if (me.status === "REJECTED") return res.status(400).json({ message: "Your registration was rejected — contact an admin" });
      if (me.status === "PENDING_VERIFICATION") return res.status(400).json({ message: "Your bank-transfer proof is already in the admin queue. Wait for verification instead of paying twice." });
      const [league] = await db.select().from(bslLeagues).limit(1);
      const fee = league?.playerFee ?? 900;
      if ((me.walletBalance ?? 0) < fee) {
        return res.status(402).json({ message: `Need £${(fee/100).toFixed(2)} in your wallet — top up first.`, fee, balance: me.walletBalance ?? 0 });
      }
      // Atomic: deduct + flip status + write ledger row in ONE DB transaction.
      const reference = `LEAGUE-FEE-${Date.now().toString(36).toUpperCase()}`;
      const updated = await db.transaction(async (tx) => {
        const [row] = await tx.update(bslPlayers).set({
          walletBalance: dsql`${bslPlayers.walletBalance} - ${fee}`,
          status: "ACTIVE",
          approvedAt: new Date(),
          approvedById: u.id,
        }).where(and(
          eq(bslPlayers.id, me.id),
          dsql`${bslPlayers.walletBalance} >= ${fee}`,
          dsql`${bslPlayers.status} <> 'ACTIVE'`,
          dsql`${bslPlayers.status} <> 'PENDING_VERIFICATION'`,
        )).returning();
        if (!row) return null;
        await tx.insert(bslWalletTransactions).values({
          bslPlayerId: me.id, type: "DEDUCTION", amount: fee, status: "APPROVED",
          reference, description: "League fee paid from wallet",
          reviewedById: u.id, reviewedAt: new Date(),
        } as any);
        return row;
      });
      if (!updated) {
        return res.status(409).json({ message: "Couldn't activate — balance or status changed. Refresh and try again." });
      }
      await audit(req, "PLAYER_SELF_ACTIVATE_FROM_WALLET", "bsl_player", me.id, { fee, reference, previousStatus: me.status });
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
        bslPlayerId: me.id, type: "DEDUCTION", amount: charged, status: "APPROVED",
        reference: `CAT-${category}-${Date.now().toString(36).toUpperCase()}`,
        description: `Registered for ${category}${tierLabel}`,
        reviewedById: u.id, reviewedAt: new Date(),
      } as any);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ==========================================================================
  // === CATEGORY COMPETITION SETTINGS (per-category rules, snapshot-aware) ===
  // ==========================================================================

  const ALLOWED_RUBBER_TYPES = new Set(["MS1","MS2","WS","MD","WD","XD"]);
  const ALLOWED_SCORING = new Set(["DEUCE","GOLDEN_POINT","RALLY"]);
  const ALLOWED_FORMAT = new Set(["ROUND_ROBIN","KNOCKOUT","GROUPS"]);
  const ALLOWED_TIEBREAKS = new Set(["POINTS","RUBBER_DIFF","RUBBERS_FOR","HEAD_TO_HEAD","MATCHES_WON"]);
  const ALLOWED_LIFECYCLE_STATES = new Set(["DRAFT","PUBLISHED","LIVE","CLOSED"]);

  function clampInt(v: any, min: number, max: number, fallback: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function sanitiseSettings(body: any, base?: any) {
    const merged: any = { ...(base || {}) };
    if ("rubbersPerFixture" in body) merged.rubbersPerFixture = clampInt(body.rubbersPerFixture, 1, 20, base?.rubbersPerFixture ?? 6);
    if ("setsPerMatch" in body) merged.setsPerMatch = clampInt(body.setsPerMatch, 1, 7, base?.setsPerMatch ?? 3);
    if ("pointsPerSet" in body) merged.pointsPerSet = clampInt(body.pointsPerSet, 1, 99, base?.pointsPerSet ?? 21);
    if ("deuceCap" in body) merged.deuceCap = clampInt(body.deuceCap, 1, 99, base?.deuceCap ?? 30);
    if ("walkoverScore" in body) merged.walkoverScore = clampInt(body.walkoverScore, 0, 99, base?.walkoverScore ?? 21);
    if ("pointsWin" in body) merged.pointsWin = clampInt(body.pointsWin, 0, 99, base?.pointsWin ?? 3);
    if ("pointsDraw" in body) merged.pointsDraw = clampInt(body.pointsDraw, 0, 99, base?.pointsDraw ?? 1);
    if ("pointsLoss" in body) merged.pointsLoss = clampInt(body.pointsLoss, 0, 99, base?.pointsLoss ?? 0);
    if ("scoringRule" in body && ALLOWED_SCORING.has(body.scoringRule)) merged.scoringRule = body.scoringRule;
    if ("format" in body && ALLOWED_FORMAT.has(body.format)) merged.format = body.format;
    if ("walkoverPolicy" in body && typeof body.walkoverPolicy === "string") merged.walkoverPolicy = body.walkoverPolicy.slice(0, 32);
    if ("notes" in body) merged.notes = body.notes ? String(body.notes).slice(0, 1000) : null;
    if ("rubberLineup" in body && Array.isArray(body.rubberLineup)) {
      const cleaned = body.rubberLineup
        .map((t: any) => String(t || "").toUpperCase())
        .filter((t: string) => ALLOWED_RUBBER_TYPES.has(t));
      if (cleaned.length > 0) merged.rubberLineup = cleaned;
    }
    if ("tiebreakOrder" in body && Array.isArray(body.tiebreakOrder)) {
      const cleaned = body.tiebreakOrder
        .map((t: any) => String(t || "").toUpperCase())
        .filter((t: string) => ALLOWED_TIEBREAKS.has(t));
      if (cleaned.length > 0) merged.tiebreakOrder = cleaned;
    }
    if ("courtPool" in body && Array.isArray(body.courtPool)) {
      const cleaned = body.courtPool
        .map((c: any) => Number(c))
        .filter((c: number) => Number.isFinite(c) && c >= 1 && c <= 99)
        .map((c: number) => Math.round(c));
      merged.courtPool = Array.from(new Set(cleaned));
    }
    return merged;
  }

  app.get("/api/bsl/admin/category-settings", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(bslCategorySettings).orderBy(bslCategorySettings.category);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Upsert (create-or-replace) per category. Body = settings; param = category.
  app.put("/api/bsl/admin/category-settings/:category", requireAdmin, async (req, res) => {
    try {
      const category = String(req.params.category || "").toUpperCase();
      if (!category) return res.status(400).json({ message: "category required" });
      const [existing] = await db.select().from(bslCategorySettings)
        .where(and(eq(bslCategorySettings.bslLeagueId, 1), eq(bslCategorySettings.category, category))).limit(1);
      const merged = sanitiseSettings(req.body || {}, existing || {});
      merged.updatedAt = new Date();
      let row;
      if (existing) {
        [row] = await db.update(bslCategorySettings).set(merged)
          .where(eq(bslCategorySettings.id, existing.id)).returning();
      } else {
        [row] = await db.insert(bslCategorySettings).values({
          bslLeagueId: 1, category, ...merged,
        } as any).returning();
      }
      await audit(req, existing ? "UPDATE_CATEGORY_SETTINGS" : "CREATE_CATEGORY_SETTINGS", "bsl_category_settings", row.id, { category });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/bsl/admin/category-settings/:category", requireAdmin, async (req, res) => {
    try {
      const category = String(req.params.category || "").toUpperCase();
      const result = await db.delete(bslCategorySettings)
        .where(and(eq(bslCategorySettings.bslLeagueId, 1), eq(bslCategorySettings.category, category)));
      await audit(req, "DELETE_CATEGORY_SETTINGS", "bsl_category_settings", null, { category });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Helper used by every fixture-creation path so generated fixtures always
  // carry a fresh rules snapshot + the right number of rubbers from settings.
  async function loadCategorySettings(category: string | null | undefined) {
    if (!category) return null;
    const [row] = await db.select().from(bslCategorySettings)
      .where(and(eq(bslCategorySettings.bslLeagueId, 1), eq(bslCategorySettings.category, category))).limit(1);
    return row || null;
  }

  // ==========================================================================
  // === REGENERATE FIXTURES (archives previous batch + uses snapshot rules) ==
  // ==========================================================================
  app.post("/api/bsl/admin/fixtures/regenerate", requireAdmin, async (req, res) => {
    try {
      const { division, leagueDayId, category, reason } = req.body as {
        division: string; leagueDayId?: number; category?: string; reason?: string;
      };
      if (!division) return res.status(400).json({ message: "division required" });
      const cat = category ? String(category).toUpperCase() : null;

      // Resolve which team + club ids belong to this division so regenerate
      // can NEVER touch fixtures outside the requested slice.
      const divisionTeams = await db.select().from(bslTeams).where(eq(bslTeams.division, division));
      const divisionTeamIds = new Set(divisionTeams.map(t => t.id));
      const divisionClubIds = new Set(divisionTeams.map(t => t.bslClubId));

      // Block regenerate when the league-day is locked (LIVE/CLOSED).
      if (leagueDayId != null) {
        const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, leagueDayId)).limit(1);
        if (day && (day.state === "LIVE" || day.state === "CLOSED")) {
          return res.status(400).json({ message: `League day is ${day.state} — cannot regenerate. Move it back to DRAFT first.` });
        }
      }

      // Pull fixtures matching this slice that haven't been finished yet
      // (FINISHED ones are preserved as historical records — only SCHEDULED
      //  / WARMUP fixtures are eligible for regeneration).
      const allCandidates = await db.select().from(bslFixtures);
      const matching = allCandidates.filter(f => {
        if (leagueDayId != null && f.bslLeagueDayId !== leagueDayId) return false;
        if (cat && f.category !== cat) return false;
        // STRICT division match: BOTH sides of the fixture must belong to the
        // requested division (cross-division fixtures are never archived).
        // Resolve via teams when present, else via clubs (club-vs-club fixtures).
        if (f.homeTeamId != null && f.awayTeamId != null) {
          return divisionTeamIds.has(f.homeTeamId) && divisionTeamIds.has(f.awayTeamId);
        }
        if (f.homeClubId != null && f.awayClubId != null) {
          return divisionClubIds.has(f.homeClubId) && divisionClubIds.has(f.awayClubId);
        }
        return false;
      });
      const editable = matching.filter(f => f.status === "SCHEDULED" || f.status === "WARMUP");
      const editableIds = editable.map(f => f.id);
      const lastVersion = editable.reduce((m, f) => Math.max(m, f.version || 1), 0) || 1;
      const nextVersion = lastVersion + 1;

      // Compute generation inputs OUTSIDE the transaction (read-only).
      const settings = cat ? await loadCategorySettings(cat) : null;
      const lineup = (settings?.rubberLineup || ["MD","MD","WD","WD","XD","XD"]) as string[];
      const rubbersPerFixture = settings?.rubbersPerFixture || lineup.length;
      const teamRows = await db.select().from(bslTeams)
        .where(cat ? and(eq(bslTeams.division, division), eq(bslTeams.category, cat)) : eq(bslTeams.division, division));
      if (teamRows.length < 2) return res.status(400).json({ message: "Need ≥2 teams in division" });

      let createdCount = 0;
      // ATOMIC: archive + delete + recreate happen in one transaction so a
      // mid-flight failure or a concurrent regenerate can't leave the DB in
      // a half-rebuilt state.
      await db.transaction(async (tx) => {
        if (editableIds.length > 0) {
          const rubbers = await tx.select().from(bslRubbers).where(inArray(bslRubbers.bslFixtureId, editableIds));
          await tx.insert(bslFixtureVersions).values({
            bslLeagueId: 1, bslLeagueDayId: leagueDayId ?? null,
            division, category: cat, version: lastVersion,
            reason: reason || null,
            payload: { fixtures: editable, rubbers } as any,
            archivedById: (req as any).user?.id ?? null,
          });
          await tx.delete(bslFixtures).where(inArray(bslFixtures.id, editableIds));
        }
        const list: any[] = teamRows.slice();
        if (list.length % 2 === 1) list.push({ id: -1 });
        const n = list.length;
        const rounds = n - 1;
        const half = n / 2;
        const arr = list.slice();
        for (let r = 0; r < rounds; r++) {
          for (let i = 0; i < half; i++) {
            const home = arr[i]; const away = arr[n - 1 - i];
            if (home.id === -1 || away.id === -1) continue;
            const [f] = await tx.insert(bslFixtures).values({
              bslLeagueDayId: leagueDayId ?? null,
              category: cat, version: nextVersion,
              rulesSnapshot: settings as any,
              homeTeamId: r % 2 === 0 ? home.id : away.id,
              awayTeamId: r % 2 === 0 ? away.id : home.id,
              court: null, startTime: null,
            }).returning();
            for (let k = 0; k < rubbersPerFixture; k++) {
              const t = (lineup[k % lineup.length] || "MD") as any;
              await tx.insert(bslRubbers).values({
                bslFixtureId: f.id, rubberNumber: k + 1, rubberType: t,
              });
            }
            createdCount++;
          }
          arr.splice(1, 0, arr.pop()!);
        }
      });
      await audit(req, "REGENERATE_FIXTURES", "bsl_division", null, { division, category: cat, leagueDayId, archived: editable.length, created: createdCount, version: nextVersion, reason });
      res.json({ archived: editable.length, created: createdCount, version: nextVersion });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/bsl/admin/fixture-versions", requireAdmin, async (req, res) => {
    try {
      const leagueDayId = req.query.leagueDayId ? Number(req.query.leagueDayId) : null;
      const division = req.query.division ? String(req.query.division) : null;
      const category = req.query.category ? String(req.query.category).toUpperCase() : null;
      let rows = await db.select().from(bslFixtureVersions).orderBy(desc(bslFixtureVersions.archivedAt));
      if (leagueDayId != null) rows = rows.filter(r => r.bslLeagueDayId === leagueDayId);
      if (division) rows = rows.filter(r => r.division === division);
      if (category) rows = rows.filter(r => r.category === category);
      // Strip heavy payload from list view
      res.json(rows.map(r => ({ ...r, payload: undefined, fixtureCount: (r.payload as any)?.fixtures?.length || 0 })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/bsl/admin/fixture-versions/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [row] = await db.select().from(bslFixtureVersions).where(eq(bslFixtureVersions.id, id)).limit(1);
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ==========================================================================
  // === LEAGUE DAY LIFECYCLE STATE ===========================================
  // ==========================================================================
  // Allowed transitions in the lifecycle state machine. Skipping forward is
  // OK (e.g. DRAFT → LIVE), but going backwards from CLOSED is blocked unless
  // explicitly reopening (CLOSED → PUBLISHED) — never silently.
  const STATE_TRANSITIONS: Record<string, Set<string>> = {
    DRAFT:     new Set(["DRAFT","PUBLISHED","LIVE","CLOSED"]),
    PUBLISHED: new Set(["DRAFT","PUBLISHED","LIVE","CLOSED"]),
    LIVE:      new Set(["LIVE","PUBLISHED","CLOSED"]),
    CLOSED:    new Set(["CLOSED","PUBLISHED"]),
  };

  app.patch("/api/bsl/admin/league-days/:id/state", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const next = String(req.body?.state || "").toUpperCase();
      if (!ALLOWED_LIFECYCLE_STATES.has(next)) {
        return res.status(400).json({ message: `state must be one of ${[...ALLOWED_LIFECYCLE_STATES].join(", ")}` });
      }
      const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, id)).limit(1);
      if (!day) return res.status(404).json({ message: "League day not found" });
      const cur = (day.state || "DRAFT").toUpperCase();
      const allowedNext = STATE_TRANSITIONS[cur] || new Set([cur]);
      if (!allowedNext.has(next)) {
        return res.status(400).json({ message: `Illegal transition ${cur} → ${next}` });
      }
      if (next === "LIVE") {
        const fx = await db.select().from(bslFixtures).where(eq(bslFixtures.bslLeagueDayId, id));
        if (fx.length === 0) return res.status(400).json({ message: "Cannot go LIVE: no fixtures scheduled for this day" });
      }
      const [updated] = await db.update(bslLeagueDays).set({ state: next })
        .where(eq(bslLeagueDays.id, id)).returning();
      if (next === "CLOSED") await recomputeStandings();
      await audit(req, "UPDATE_LEAGUE_DAY_STATE", "bsl_league_day", id, { from: cur, to: next });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Helper: legacy mutation routes call this to ensure they don't bypass the
  // state machine when a fixture's parent league-day is LIVE / CLOSED.
  async function assertFixtureMutable(fixtureId: number, allowedActions: Set<string>, action: string) {
    const [f] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, fixtureId)).limit(1);
    if (!f || f.bslLeagueDayId == null) return null;
    const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, f.bslLeagueDayId)).limit(1);
    if (!day) return null;
    const state = (day.state || "DRAFT").toUpperCase();
    if (state === "CLOSED") return `League day is CLOSED — no edits allowed`;
    if (state === "LIVE" && !allowedActions.has(action)) return `League day is LIVE — only ${[...allowedActions].join("/")} allowed`;
    return null;
  }
  // Expose to the rest of the file for legacy guards.
  (app as any)._bslAssertFixtureMutable = assertFixtureMutable;

  // ==========================================================================
  // === LIVE MATCH CONTROLS (start/pause/resume/finish + walkover) ==========
  // ==========================================================================
  app.post("/api/bsl/admin/fixtures/:id/live", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const action = String(req.body?.action || "").toLowerCase();
      const [fx] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, id)).limit(1);
      if (!fx) return res.status(404).json({ message: "Fixture not found" });
      // Lifecycle guard — live controls always allowed when LIVE; CLOSED locks them.
      const block = await assertFixtureMutable(id, new Set(["status","start","pause","resume","finish","warmup","reset"]), action);
      if (block) return res.status(409).json({ message: block });
      const patch: any = {};
      const now = new Date();
      switch (action) {
        case "start":
          patch.status = "LIVE"; patch.liveStartedAt = now; patch.livePausedAt = null; break;
        case "pause":
          if (fx.status !== "LIVE") return res.status(400).json({ message: "Can only pause a LIVE fixture" });
          patch.livePausedAt = now; break;
        case "resume":
          patch.status = "LIVE"; patch.livePausedAt = null;
          if (!fx.liveStartedAt) patch.liveStartedAt = now;
          break;
        case "finish":
          patch.status = "FINISHED"; patch.livePausedAt = null; break;
        case "warmup":
          patch.status = "WARMUP"; break;
        case "reset":
          patch.status = "SCHEDULED"; patch.liveStartedAt = null; patch.livePausedAt = null; break;
        default:
          return res.status(400).json({ message: "action must be start|pause|resume|finish|warmup|reset" });
      }
      const [updated] = await db.update(bslFixtures).set(patch).where(eq(bslFixtures.id, id)).returning();
      if (patch.status === "FINISHED") await recomputeStandings();
      await audit(req, `LIVE_${action.toUpperCase()}`, "bsl_fixture", id, patch);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/bsl/admin/rubbers/:id/walkover", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const winner = String(req.body?.winner || "").toUpperCase();
      if (!["HOME","AWAY","NONE"].includes(winner)) return res.status(400).json({ message: "winner must be HOME|AWAY|NONE" });
      const [r] = await db.select().from(bslRubbers).where(eq(bslRubbers.id, id)).limit(1);
      if (!r) return res.status(404).json({ message: "Rubber not found" });
      // Lifecycle guard — walkover is a score event, allowed when LIVE.
      const block = await assertFixtureMutable(r.bslFixtureId, new Set(["score","walkover"]), "walkover");
      if (block) return res.status(409).json({ message: block });
      const [fx] = await db.select().from(bslFixtures).where(eq(bslFixtures.id, r.bslFixtureId)).limit(1);
      const snap: any = fx?.rulesSnapshot || {};
      const wScore = clampInt(snap.walkoverScore, 0, 99, 21);
      const patch: any = { walkoverWinner: winner === "NONE" ? null : winner, status: "FINISHED" };
      if (winner === "HOME") { patch.homeScore = wScore; patch.awayScore = 0; }
      else if (winner === "AWAY") { patch.homeScore = 0; patch.awayScore = wScore; }
      else { patch.homeScore = 0; patch.awayScore = 0; patch.status = "SCHEDULED"; }
      const [updated] = await db.update(bslRubbers).set(patch).where(eq(bslRubbers.id, id)).returning();
      // Recompute fixture rubber tally
      const all = await db.select().from(bslRubbers).where(eq(bslRubbers.bslFixtureId, r.bslFixtureId));
      const homeR = all.filter(rr => rr.homeScore > rr.awayScore).length;
      const awayR = all.filter(rr => rr.awayScore > rr.homeScore).length;
      await db.update(bslFixtures).set({ homeRubbers: homeR, awayRubbers: awayR }).where(eq(bslFixtures.id, r.bslFixtureId));
      await audit(req, "RUBBER_WALKOVER", "bsl_rubber", id, { winner });
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

  // ===================== YEAR-END PRIZES =====================
  // Public read — only published rows for non-admins
  app.get("/api/bsl/prizes", async (req, res) => {
    try {
      const u: any = (req as any).user;
      const rows = await db.select().from(bslPrizes).orderBy(
        bslPrizes.division, bslPrizes.category, bslPrizes.sortOrder, bslPrizes.rank,
      );
      const filtered = isAdminish(u) ? rows : rows.filter(r => r.isPublished);
      res.json(filtered);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Admin CRUD
  app.post("/api/bsl/admin/prizes", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.title || !b.prizeText) return res.status(400).json({ message: "title and prizeText required" });
      const tier = String(b.tier || "GOLD").toUpperCase();
      const allowedTiers = ["DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "MYTHIC", "EPIC"];
      const [defaultLeague] = await db.select().from(bslLeagues).limit(1);
      if (!defaultLeague) return res.status(400).json({ message: "No BSL league configured yet" });
      const [row] = await db.insert(bslPrizes).values({
        bslLeagueId: defaultLeague.id,
        season: b.season ? String(b.season).slice(0, 32) : null,
        division: b.division ? String(b.division).slice(0, 56) : null,
        category: b.category ? String(b.category).toUpperCase().slice(0, 12) : null,
        rank: Math.max(1, Math.min(99, Number(b.rank ?? 1))),
        tier: allowedTiers.includes(tier) ? tier : "GOLD",
        title: String(b.title).slice(0, 120),
        subtitle: b.subtitle ? String(b.subtitle).slice(0, 240) : null,
        prizeText: String(b.prizeText).slice(0, 240),
        prizeAmountPence: b.prizeAmountPence != null ? Math.max(0, Math.round(Number(b.prizeAmountPence))) : null,
        icon: b.icon ? String(b.icon).slice(0, 40) : null,
        accentColor: b.accentColor ? String(b.accentColor).slice(0, 40) : null,
        sortOrder: Math.max(0, Math.min(9999, Number(b.sortOrder ?? 0))),
        isPublished: b.isPublished !== false,
      }).returning();
      await audit(req, "prize.created", "bsl_prize", row.id, { title: row.title });
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/bsl/admin/prizes/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const patch: any = { updatedAt: new Date() };
      if (b.season !== undefined) patch.season = b.season ? String(b.season).slice(0, 32) : null;
      if (b.division !== undefined) patch.division = b.division ? String(b.division).slice(0, 56) : null;
      if (b.category !== undefined) patch.category = b.category ? String(b.category).toUpperCase().slice(0, 12) : null;
      if (b.rank !== undefined) patch.rank = Math.max(1, Math.min(99, Number(b.rank)));
      if (b.tier !== undefined) {
        const t = String(b.tier).toUpperCase();
        if (["DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE", "MYTHIC", "EPIC"].includes(t)) patch.tier = t;
      }
      if (b.title !== undefined) patch.title = String(b.title).slice(0, 120);
      if (b.subtitle !== undefined) patch.subtitle = b.subtitle ? String(b.subtitle).slice(0, 240) : null;
      if (b.prizeText !== undefined) patch.prizeText = String(b.prizeText).slice(0, 240);
      if (b.prizeAmountPence !== undefined) patch.prizeAmountPence = b.prizeAmountPence == null ? null : Math.max(0, Math.round(Number(b.prizeAmountPence)));
      if (b.icon !== undefined) patch.icon = b.icon ? String(b.icon).slice(0, 40) : null;
      if (b.accentColor !== undefined) patch.accentColor = b.accentColor ? String(b.accentColor).slice(0, 40) : null;
      if (b.sortOrder !== undefined) patch.sortOrder = Math.max(0, Math.min(9999, Number(b.sortOrder)));
      if (b.isPublished !== undefined) patch.isPublished = !!b.isPublished;
      const [row] = await db.update(bslPrizes).set(patch).where(eq(bslPrizes.id, id)).returning();
      if (!row) return res.status(404).json({ message: "Prize not found" });
      await audit(req, "prize.updated", "bsl_prize", id, patch);
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/bsl/admin/prizes/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(bslPrizes).where(eq(bslPrizes.id, id));
      await audit(req, "prize.deleted", "bsl_prize", id, {});
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Seed a sensible default grid: per division × MD/WD/XD × top-3
  app.post("/api/bsl/admin/prizes/seed", requireAdmin, async (req, res) => {
    try {
      const [league] = await db.select().from(bslLeagues).limit(1);
      if (!league) return res.status(400).json({ message: "No BSL league configured yet — visit Settings first." });
      const leagueId = league.id;
      const divisions: string[] = (league.divisions as any) || ["Premier", "Championship", "Division 1"];
      const cats = [
        { c: "MD", label: "Men's Doubles" },
        { c: "WD", label: "Women's Doubles" },
        { c: "XD", label: "Mixed Doubles" },
      ];
      const tierByRank = ["DIAMOND", "GOLD", "BRONZE"];
      const trophyByRank = ["Champions", "Runners-Up", "Bronze Medal"];
      const moneyByRank = [50000, 25000, 10000]; // pence
      const replace = !!req.body?.replace;
      if (replace) await db.delete(bslPrizes);
      const rows: any[] = [];
      let order = 0;
      for (const div of divisions) {
        for (const cat of cats) {
          for (let i = 0; i < 3; i++) {
            rows.push({
              bslLeagueId: leagueId,
              division: div,
              category: cat.c,
              rank: i + 1,
              tier: tierByRank[i],
              title: `${div} · ${cat.label} ${trophyByRank[i]}`,
              subtitle: `Year-end prize for ${cat.label} pairs in ${div}`,
              prizeText: i === 0
                ? `£${(moneyByRank[i] / 100).toFixed(0)} cash + Engraved trophy + Champion jackets`
                : i === 1
                  ? `£${(moneyByRank[i] / 100).toFixed(0)} cash + Silver medals + BSL hoodies`
                  : `£${(moneyByRank[i] / 100).toFixed(0)} cash + Bronze medals`,
              prizeAmountPence: moneyByRank[i],
              sortOrder: order++,
              isPublished: true,
            });
          }
        }
      }
      const inserted = await db.insert(bslPrizes).values(rows).returning();
      await audit(req, "prize.seeded", "bsl_prize", null, { count: inserted.length, replace });
      res.json({ ok: true, count: inserted.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // =============================================================
  //  CHALLENGE ZONE — inter-club challenge requests
  // =============================================================

  // Permission: club manager, in adminUserIds, captain of any team in the club,
  // OR platform OWNER/ADMIN.
  async function canManageBslClub(req: Request, clubId: number): Promise<boolean> {
    const user = (req as any).user;
    if (!user) return false;
    if (user.role === "OWNER" || user.role === "ADMIN") return true;
    const [club] = await db.select().from(bslClubs).where(eq(bslClubs.id, clubId)).limit(1);
    if (!club) return false;
    if (club.managerUserId === user.id) return true;
    if (Array.isArray((club as any).adminUserIds) && (club as any).adminUserIds.includes(user.id)) return true;
    // captain check
    const teams = await db.select().from(bslTeams)
      .where(and(eq(bslTeams.bslClubId, clubId), dsql`${bslTeams.captainPlayerId} IS NOT NULL`));
    const capIds = teams.map(t => t.captainPlayerId as number).filter(Boolean);
    if (capIds.length === 0) return false;
    const caps = await db.select().from(bslPlayers).where(inArray(bslPlayers.id, capIds));
    return caps.some(c => c.userId === user.id);
  }

  async function slotsUsedForDay(leagueDayId: number, excludeChallengeId?: number): Promise<number> {
    const rows = await db.select().from(bslChallenges)
      .where(and(
        eq(bslChallenges.leagueDayId, leagueDayId),
        inArray(bslChallenges.status, ["PENDING", "ACCEPTED"]),
      ));
    return rows
      .filter(r => excludeChallengeId == null || r.id !== excludeChallengeId)
      .reduce((s, r) => s + (r.numMatches || 0), 0);
  }

  // List of clubs visible in the Challenge Zone (any logged-in user can view).
  // Includes ranking (aggregated like /standings), W/L/MP, teams + member names.
  app.get("/api/bsl/challenge-zone/clubs", requireAuth, async (_req, res) => {
    try {
      const clubs = await db.select().from(bslClubs)
        .where(and(eq(bslClubs.status, "APPROVED"), dsql`${bslClubs.sleepingAt} IS NULL`));
      const teams = await db.select().from(bslTeams);
      const clubIds = clubs.map(c => c.id);
      const members = clubIds.length
        ? await db.select({
            teamId: bslTeamMembers.bslTeamId,
            playerId: bslPlayers.id,
            displayName: bslPlayers.displayName,
            fullName: users.fullName,
          })
          .from(bslTeamMembers)
          .leftJoin(bslPlayers, eq(bslTeamMembers.bslPlayerId, bslPlayers.id))
          .leftJoin(users, eq(bslPlayers.userId, users.id))
          .where(inArray(bslPlayers.bslClubId, clubIds))
        : [];
      const membersByTeam = new Map<number, Array<{ playerId: number; name: string }>>();
      for (const m of members as any[]) {
        if (!m.teamId) continue;
        const arr = membersByTeam.get(m.teamId) || [];
        arr.push({ playerId: m.playerId, name: m.displayName || m.fullName || `Player #${m.playerId}` });
        membersByTeam.set(m.teamId, arr);
      }
      // Aggregate stats per club
      type Agg = { played: number; won: number; lost: number; drawn: number; points: number; rubberDiff: number };
      const agg = new Map<number, Agg>();
      for (const t of teams) {
        const a = agg.get(t.bslClubId) || { played: 0, won: 0, lost: 0, drawn: 0, points: 0, rubberDiff: 0 };
        a.played += t.played || 0; a.won += t.won || 0; a.lost += t.lost || 0; a.drawn += t.drawn || 0;
        a.points += t.points || 0; a.rubberDiff += (t.rubbersFor || 0) - (t.rubbersAgainst || 0);
        agg.set(t.bslClubId, a);
      }
      const ranked = clubs.map(c => ({ id: c.id, a: agg.get(c.id) || { played: 0, won: 0, lost: 0, drawn: 0, points: 0, rubberDiff: 0 } }))
        .sort((x, y) => y.a.points - x.a.points || y.a.rubberDiff - x.a.rubberDiff);
      const rankById = new Map<number, number>();
      ranked.forEach((r, i) => rankById.set(r.id, i + 1));

      const out = clubs.map(c => {
        const a = agg.get(c.id) || { played: 0, won: 0, lost: 0, drawn: 0, points: 0, rubberDiff: 0 };
        const clubTeams = teams
          .filter(t => t.bslClubId === c.id)
          .map(t => ({
            id: t.id,
            name: t.name,
            division: t.division,
            category: t.category,
            pairNumber: t.pairNumber,
            members: membersByTeam.get(t.id) || [],
          }));
        return {
          id: c.id,
          name: c.name,
          logoUrl: c.logoUrl,
          division: c.division,
          additionalDivisions: c.additionalDivisions || [],
          managerUserId: c.managerUserId,
          adminUserIds: c.adminUserIds || [],
          rank: rankById.get(c.id) ?? null,
          played: a.played,
          won: a.won,
          lost: a.lost,
          drawn: a.drawn,
          points: a.points,
          rubberDiff: a.rubberDiff,
          teams: clubTeams,
          teamCount: clubTeams.length,
        };
      });
      out.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
      res.json(out);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Upcoming match days exposed to the Challenge Zone with live slot counts.
  app.get("/api/bsl/challenge-zone/match-days", requireAuth, async (_req, res) => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = await db.select().from(bslLeagueDays)
        .where(dsql`${bslLeagueDays.date} >= ${today}`)
        .orderBy(asc(bslLeagueDays.date));
      const ids = days.map(d => d.id);
      const challenges = ids.length
        ? await db.select().from(bslChallenges).where(and(
            inArray(bslChallenges.leagueDayId, ids),
            inArray(bslChallenges.status, ["PENDING", "ACCEPTED"]),
          ))
        : [];
      const usedByDay = new Map<number, number>();
      for (const c of challenges) usedByDay.set(c.leagueDayId, (usedByDay.get(c.leagueDayId) || 0) + (c.numMatches || 0));
      res.json(days.map(d => {
        const used = usedByDay.get(d.id) || 0;
        const max = (d as any).maxMatches ?? null;
        return {
          id: d.id,
          date: d.date,
          state: (d as any).state || "DRAFT",
          status: d.status,
          venue: (d as any).venue,
          notes: (d as any).notes,
          division: d.division,
          category: d.category,
          maxMatches: max,
          slotsUsed: used,
          slotsRemaining: max == null ? null : Math.max(0, max - used),
        };
      }));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // List challenges. Default: every challenge in the league. ?clubId= filters
  // to one club (inbox + outbox).
  app.get("/api/bsl/challenges", requireAuth, async (req, res) => {
    try {
      const clubId = req.query.clubId ? Number(req.query.clubId) : null;
      const where = clubId
        ? or(eq(bslChallenges.challengerClubId, clubId), eq(bslChallenges.opponentClubId, clubId))
        : undefined;
      const rows = await (where ? db.select().from(bslChallenges).where(where) : db.select().from(bslChallenges))
        .orderBy(desc(bslChallenges.createdAt));
      const clubIds = Array.from(new Set(rows.flatMap(r => [r.challengerClubId, r.opponentClubId])));
      const dayIds = Array.from(new Set(rows.map(r => r.leagueDayId)));
      const [clubs, days] = await Promise.all([
        clubIds.length ? db.select().from(bslClubs).where(inArray(bslClubs.id, clubIds)) : Promise.resolve([] as any[]),
        dayIds.length ? db.select().from(bslLeagueDays).where(inArray(bslLeagueDays.id, dayIds)) : Promise.resolve([] as any[]),
      ]);
      const clubMap = new Map(clubs.map(c => [c.id, c]));
      const dayMap = new Map(days.map(d => [d.id, d]));
      res.json(rows.map(r => ({
        ...r,
        challengerClub: clubMap.get(r.challengerClubId) ? { id: r.challengerClubId, name: clubMap.get(r.challengerClubId)!.name, logoUrl: clubMap.get(r.challengerClubId)!.logoUrl } : null,
        opponentClub: clubMap.get(r.opponentClubId) ? { id: r.opponentClubId, name: clubMap.get(r.opponentClubId)!.name, logoUrl: clubMap.get(r.opponentClubId)!.logoUrl } : null,
        leagueDay: dayMap.get(r.leagueDayId) ? {
          id: r.leagueDayId,
          date: dayMap.get(r.leagueDayId)!.date,
          venue: (dayMap.get(r.leagueDayId)! as any).venue,
        } : null,
      })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Create a challenge. Only manageable-club users can send on behalf of their club.
  app.post("/api/bsl/challenges", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const challengerClubId = Number(req.body?.challengerClubId);
      const opponentClubId = Number(req.body?.opponentClubId);
      const leagueDayId = Number(req.body?.leagueDayId);
      const numMatches = Math.max(1, Math.min(20, Math.round(Number(req.body?.numMatches ?? 1))));
      const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 500) : null;
      if (!challengerClubId || !opponentClubId || !leagueDayId) return res.status(400).json({ message: "challengerClubId, opponentClubId and leagueDayId required" });
      if (challengerClubId === opponentClubId) return res.status(400).json({ message: "Cannot challenge your own club" });
      if (!(await canManageBslClub(req, challengerClubId))) return res.status(403).json({ message: "You don't have permission to send challenges on behalf of this club" });
      const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, leagueDayId)).limit(1);
      if (!day) return res.status(404).json({ message: "Match day not found" });
      const [opp] = await db.select().from(bslClubs).where(eq(bslClubs.id, opponentClubId)).limit(1);
      if (!opp) return res.status(404).json({ message: "Opponent club not found" });
      const maxMatches = (day as any).maxMatches as number | null;
      if (maxMatches != null) {
        const used = await slotsUsedForDay(leagueDayId);
        if (used + numMatches > maxMatches) {
          return res.status(409).json({ message: `Not enough slots — ${Math.max(0, maxMatches - used)} of ${maxMatches} remaining on this match day.` });
        }
      }
      const [row] = await db.insert(bslChallenges).values({
        bslLeagueId: 1,
        challengerClubId, opponentClubId, leagueDayId,
        numMatches, message,
        status: "PENDING",
        createdById: user.id,
      }).returning();
      await audit(req, "CREATE_CHALLENGE", "bsl_challenge", row.id, { opponentClubId, leagueDayId, numMatches });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Respond to a challenge: accept / decline / cancel / complete.
  app.patch("/api/bsl/challenges/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      const action = String(req.body?.action || "").toLowerCase();
      if (!["accept", "decline", "cancel", "complete"].includes(action)) return res.status(400).json({ message: "Invalid action" });
      const [ch] = await db.select().from(bslChallenges).where(eq(bslChallenges.id, id)).limit(1);
      if (!ch) return res.status(404).json({ message: "Challenge not found" });
      const isPlatformAdmin = user.role === "OWNER" || user.role === "ADMIN";
      let allowed = isPlatformAdmin;
      if (!allowed) {
        if (action === "accept" || action === "decline") {
          allowed = await canManageBslClub(req, ch.opponentClubId);
        } else if (action === "cancel") {
          allowed = await canManageBslClub(req, ch.challengerClubId);
        } else if (action === "complete") {
          allowed = (await canManageBslClub(req, ch.challengerClubId)) || (await canManageBslClub(req, ch.opponentClubId));
        }
      }
      if (!allowed) return res.status(403).json({ message: "You don't have permission to perform this action" });

      if (action === "accept") {
        if (ch.status !== "PENDING") return res.status(409).json({ message: `Cannot accept — challenge is ${ch.status}` });
        const [day] = await db.select().from(bslLeagueDays).where(eq(bslLeagueDays.id, ch.leagueDayId)).limit(1);
        const maxMatches = (day as any)?.maxMatches as number | null;
        if (maxMatches != null) {
          const used = await slotsUsedForDay(ch.leagueDayId, ch.id);
          if (used + (ch.numMatches || 0) > maxMatches) {
            return res.status(409).json({ message: `Match day has filled up — only ${Math.max(0, maxMatches - used)} of ${maxMatches} slots left.` });
          }
        }
        const [updated] = await db.update(bslChallenges).set({
          status: "ACCEPTED", respondedById: user.id, respondedAt: new Date(),
        }).where(eq(bslChallenges.id, id)).returning();
        await audit(req, "ACCEPT_CHALLENGE", "bsl_challenge", id, {});
        return res.json(updated);
      }
      if (action === "decline") {
        if (ch.status !== "PENDING") return res.status(409).json({ message: `Cannot decline — challenge is ${ch.status}` });
        const [updated] = await db.update(bslChallenges).set({
          status: "DECLINED", respondedById: user.id, respondedAt: new Date(),
        }).where(eq(bslChallenges.id, id)).returning();
        await audit(req, "DECLINE_CHALLENGE", "bsl_challenge", id, {});
        return res.json(updated);
      }
      if (action === "cancel") {
        if (ch.status !== "PENDING") return res.status(409).json({ message: `Cannot cancel — challenge is ${ch.status}` });
        const [updated] = await db.update(bslChallenges).set({
          status: "CANCELLED", respondedById: user.id, respondedAt: new Date(),
        }).where(eq(bslChallenges.id, id)).returning();
        await audit(req, "CANCEL_CHALLENGE", "bsl_challenge", id, {});
        return res.json(updated);
      }
      // complete
      if (ch.status !== "ACCEPTED") return res.status(409).json({ message: `Cannot complete — challenge is ${ch.status}` });
      const [updated] = await db.update(bslChallenges).set({
        status: "COMPLETED", respondedById: user.id, respondedAt: new Date(),
      }).where(eq(bslChallenges.id, id)).returning();
      await audit(req, "COMPLETE_CHALLENGE", "bsl_challenge", id, {});
      return res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
