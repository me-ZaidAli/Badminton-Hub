import type { Express, Request, Response, NextFunction } from "express";
import { eq, desc, and, sql as dsql, inArray } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  bslLeagues, bslClubs, bslTeams, bslPlayers, bslLeagueDays,
  bslFixtures, bslRubbers, bslWalletTransactions,
} from "@shared/schema";

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
      const [updated] = await db.update(bslLeagues).set({ ...req.body, updatedAt: new Date() })
        .where(eq(bslLeagues.id, 1)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
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
      const { name, division, teamCount, logoUrl, clubId } = req.body;
      if (!name || !division) return res.status(400).json({ message: "Name and division required" });
      const paymentReference = genRef("BSL-CLUB");
      const [created] = await db.insert(bslClubs).values({
        name, division, teamCount: teamCount || 1, logoUrl: logoUrl || null,
        clubId: clubId || null, managerUserId: user.id, paymentReference,
      } as any).returning();
      // Auto-create team placeholders
      const teamRows = Array.from({ length: created.teamCount }, (_, i) => ({
        bslClubId: created.id, name: `${created.name} ${created.teamCount > 1 ? String.fromCharCode(65 + i) : ""}`.trim(),
        division: created.division,
      }));
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

  // === STANDINGS ===
  app.get("/api/bsl/standings", async (req, res) => {
    try {
      const division = req.query.division as string | undefined;
      const teamsQ = division
        ? db.select().from(bslTeams).where(eq(bslTeams.division, division))
        : db.select().from(bslTeams);
      const teams = await teamsQ;
      const clubs = await db.select().from(bslClubs);
      const clubMap = new Map(clubs.map(c => [c.id, c]));
      const enriched = teams.map(t => ({
        ...t,
        clubName: clubMap.get(t.bslClubId)?.name || "—",
        clubLogo: clubMap.get(t.bslClubId)?.logoUrl || null,
        rubberDiff: t.rubbersFor - t.rubbersAgainst,
      }));
      enriched.sort((a, b) => b.points - a.points || b.rubberDiff - a.rubberDiff || b.rubbersFor - a.rubbersFor);
      res.json(enriched.map((t, i) => ({ ...t, position: i + 1 })));
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
}
