import { Express } from "express";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray, ne, isNull, gte } from "drizzle-orm";
import {
  tournaments, tournamentCategories, tournamentTeams, tournamentMatches,
  tournamentStandings, tournamentRegistrations, tournamentPairRequests,
  tournamentWaitlist, tournamentAdmins, tournamentPrizes,
  tournamentCourts, tournamentPlayerStats,
  tournamentGroups, tournamentGroupPairs, tournamentStages,
  users, clubs, venues, playerProfiles, matches,
  notifications, clubMemberships, internalMessages
} from "@shared/schema";

function generateRoundRobinSchedule(teamIds: number[]): [number, number][] {
  const n = teamIds.length;
  if (n < 2) return [];
  const ids = [...teamIds];
  if (n % 2 !== 0) ids.push(-1);
  const total = ids.length;
  const rounds: [number, number][] = [];
  const fixed = ids[0];
  const rotating = ids.slice(1);
  for (let r = 0; r < total - 1; r++) {
    const current = [fixed, ...rotating];
    for (let i = 0; i < total / 2; i++) {
      const a = current[i];
      const b = current[total - 1 - i];
      if (a !== -1 && b !== -1) {
        rounds.push([a, b]);
      }
    }
    rotating.push(rotating.shift()!);
  }
  return rounds;
}

// Removes any tournament_teams in this category whose two players are no longer in a
// valid mutual PAIR registration (doubles) or APPROVED registration (singles), along
// with their group slots, matches, and standings rows.
async function purgeOrphanTeamsForCategory(cat: any) {
  const isDoublesCat = (cat.playersPerSide || 1) >= 2;
  const allRegs = await db.select().from(tournamentRegistrations)
    .where(and(eq(tournamentRegistrations.tournamentId, cat.tournamentId), eq(tournamentRegistrations.status, "APPROVED")));
  const validProfilePairKeys = new Set<string>();
  const validSoloProfileIds = new Set<number>();
  if (isDoublesCat) {
    const pairRegsByUser = new Map<number, number>();
    for (const reg of allRegs) {
      if (reg.registrationType === "PAIR" && reg.partnerId) pairRegsByUser.set(reg.userId, reg.partnerId);
    }
    for (const [uid, pid] of pairRegsByUser.entries()) {
      if (pairRegsByUser.get(pid) !== uid) continue;
      const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, uid));
      const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pid));
      if (!p1 || !p2) continue;
      const [a, b] = [p1.id, p2.id].sort((x, y) => x - y);
      validProfilePairKeys.add(`${a}-${b}`);
    }
  } else {
    for (const reg of allRegs) {
      const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
      if (profile) validSoloProfileIds.add(profile.id);
    }
  }
  const teamsInCat = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, cat.id));
  const orphanIds: number[] = [];
  for (const t of teamsInCat) {
    let keep = false;
    if (isDoublesCat) {
      if (t.player1Id && t.player2Id) {
        const [a, b] = [t.player1Id, t.player2Id].sort((x, y) => x - y);
        keep = validProfilePairKeys.has(`${a}-${b}`);
      }
    } else {
      keep = !!(t.player1Id && validSoloProfileIds.has(t.player1Id));
    }
    if (!keep) orphanIds.push(t.id);
  }
  if (orphanIds.length > 0) {
    await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.teamId, orphanIds));
    await db.delete(tournamentMatches).where(or(
      inArray(tournamentMatches.teamAId, orphanIds),
      inArray(tournamentMatches.teamBId, orphanIds),
    ));
    await db.delete(tournamentStandings).where(inArray(tournamentStandings.teamId, orphanIds));
    await db.delete(tournamentTeams).where(inArray(tournamentTeams.id, orphanIds));
  }
}

// Server-side gender-restriction guard for tournament categories.
// Mirrors the UI filter in MyCategoriesTab so direct API calls cannot bypass
// category eligibility. Handles modern `ALL`/`FEMALE_ONLY` plus legacy
// `MALE_ONLY`/`FEMALE`/`MALE` values that may exist in old rows.
function genderAllowedForCategory(restriction: string | null | undefined, userGender: string | null | undefined): boolean {
  const r = (restriction || "ALL").toUpperCase();
  if (r === "ALL" || r === "MIXED" || r === "") return true;
  const g = (userGender || "").toUpperCase();
  if (r === "FEMALE_ONLY" || r === "FEMALE") return g === "FEMALE" || g === "F";
  if (r === "MALE_ONLY" || r === "MALE") return g === "MALE" || g === "M";
  return true;
}

export function registerTournamentRoutes(app: Express) {

  app.get("/api/tournaments", async (req, res) => {
    try {
      const clubId = req.query.clubId ? Number(req.query.clubId) : undefined;
      const allTournaments = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));

      let userClubIds: number[] = [];
      let adminClubIds: number[] = [];
      let tournamentAdminIds: number[] = [];
      let isOwner = false;
      let userId: number | undefined;
      if (req.isAuthenticated()) {
        userId = req.user!.id;
        isOwner = (req.user as any).role === "OWNER";
        const memberships = await db.select({ clubId: clubMemberships.clubId })
          .from(clubMemberships).where(
            and(eq(clubMemberships.userId, userId), inArray(clubMemberships.status, ["ACTIVE", "EXPIRING", "PENDING"]))
          );
        const profileClubs = await db.select({ clubId: playerProfiles.clubId })
          .from(playerProfiles).where(eq(playerProfiles.userId, userId));
        userClubIds = Array.from(new Set([...memberships.map(m => m.clubId), ...profileClubs.map(p => p.clubId)]));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId })
          .from(playerProfiles)
          .where(and(eq(playerProfiles.userId, userId), eq(playerProfiles.clubRole, "ADMIN")));
        adminClubIds = adminProfiles.map(p => p.clubId);
        const tas = await db.select({ tournamentId: tournamentAdmins.tournamentId })
          .from(tournamentAdmins).where(eq(tournamentAdmins.userId, userId));
        tournamentAdminIds = tas.map(t => t.tournamentId);
      }

      const filtered = allTournaments.filter(t => {
        if (clubId && t.clubId !== clubId) return false;
        if (isOwner) return true;
        if (userId && t.createdBy === userId) return true;
        if (adminClubIds.includes(t.clubId)) return true;
        if (tournamentAdminIds.includes(t.id)) return true;
        if (t.type === "OPEN") return true;
        if (!t.allowedClubIds || t.allowedClubIds.length === 0) {
          return userClubIds.includes(t.clubId);
        }
        return userClubIds.some(cid => t.allowedClubIds!.includes(cid));
      });

      res.json(filtered);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
      if (!tournament) return res.status(404).json({ message: "Not found" });
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, id));
      const [club] = tournament.clubId ? await db.select().from(clubs).where(eq(clubs.id, tournament.clubId)) : [null];
      const [venue] = tournament.venueId ? await db.select().from(venues).where(eq(venues.id, tournament.venueId)) : [null];
      const regs = await db.select().from(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, id));
      res.json({ ...tournament, categories: cats, club, venue, registrationCount: regs.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/public/tournaments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
      if (!tournament) return res.status(404).json({ message: "Not found" });
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, id));
      const [club] = tournament.clubId ? await db.select().from(clubs).where(eq(clubs.id, tournament.clubId)) : [null];
      const [venue] = tournament.venueId ? await db.select().from(venues).where(eq(venues.id, tournament.venueId)) : [null];
      res.json({ ...tournament, categories: cats, club, venue });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { name, clubId, type, startDate, endDate, description, courtsAvailable,
        bannerUrl, logoUrl, maxPlayers, skillLevelMin, skillLevelMax, registrationDeadline,
        location, socialLinks, entryFee, externalEntryFee, prizeInfo, rules, groupsPerSide, pairsPerGroup } = req.body;
      const cleanLogoUrl = (typeof logoUrl === "string" && logoUrl.trim() && /^https?:\/\//i.test(logoUrl.trim()) && logoUrl.length <= 500) ? logoUrl.trim() : null;
      const [t] = await db.insert(tournaments).values({
        name, clubId, type, startDate: new Date(startDate), endDate: new Date(endDate),
        description, courtsAvailable: courtsAvailable || 4, createdBy: req.user!.id,
        bannerUrl, logoUrl: cleanLogoUrl, maxPlayers, skillLevelMin, skillLevelMax,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        location, socialLinks, entryFee, externalEntryFee, prizeInfo, rules, groupsPerSide, pairsPerGroup,
      }).returning();
      res.json(t);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournaments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, id);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const updates: any = {};
      const allowed = ["name", "status", "description", "courtsAvailable", "bannerUrl", "logoUrl", "maxPlayers",
        "skillLevelMin", "skillLevelMax", "location", "socialLinks", "isLocked",
        "entryFee", "externalEntryFee", "prizeInfo", "rules", "groupsPerSide", "pairsPerGroup", "type", "allowedClubIds"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.logoUrl !== undefined) {
        const v = updates.logoUrl;
        if (v === null || v === "") {
          updates.logoUrl = null;
        } else if (typeof v !== "string" || v.length > 500 || !/^https?:\/\//i.test(v.trim())) {
          return res.status(400).json({ message: "Logo URL must start with http:// or https:// (max 500 chars)" });
        } else {
          updates.logoUrl = v.trim();
        }
      }
      if (req.body.startDate) updates.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updates.endDate = new Date(req.body.endDate);
      if (req.body.registrationDeadline !== undefined) {
        updates.registrationDeadline = req.body.registrationDeadline ? new Date(req.body.registrationDeadline) : null;
      }
      const [t] = await db.update(tournaments).set(updates).where(eq(tournaments.id, id)).returning();
      res.json(t);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournaments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      const catIds = await db.select({ id: tournamentCategories.id }).from(tournamentCategories).where(eq(tournamentCategories.tournamentId, id));
      const catIdList = catIds.map(c => c.id);
      if (catIdList.length > 0) {
        await db.delete(tournamentStandings).where(inArray(tournamentStandings.categoryId, catIdList));
        await db.delete(tournamentMatches).where(inArray(tournamentMatches.categoryId, catIdList));
        await db.delete(tournamentTeams).where(inArray(tournamentTeams.categoryId, catIdList));
        await db.delete(tournamentCategories).where(inArray(tournamentCategories.tournamentId, [id]));
      }
      await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.tournamentId, id));
      await db.delete(tournamentPairRequests).where(eq(tournamentPairRequests.tournamentId, id));
      await db.delete(tournamentWaitlist).where(eq(tournamentWaitlist.tournamentId, id));
      await db.delete(tournaments).where(eq(tournaments.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const [cat] = await db.insert(tournamentCategories).values({ tournamentId, ...req.body }).returning();
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/categories", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, tournamentId));
      res.json(cats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [existing] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!existing) return res.status(404).json({ message: "Category not found" });
      const canManage = await isTournamentAdmin((req.user as any).id, existing.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });
      // Normalise fee fields so blanks/nulls fall back to the tournament-level fee
      // instead of being stored as the string "0" or "".
      const patch: any = { ...req.body };
      for (const k of ["entryFee", "externalEntryFee"]) {
        if (k in patch) {
          const v = patch[k];
          if (v === "" || v === null || v === undefined) patch[k] = null;
          else {
            const n = parseFloat(String(v));
            patch[k] = Number.isFinite(n) && n >= 0 ? String(n) : null;
          }
        }
      }
      const [cat] = await db.update(tournamentCategories).set(patch).where(eq(tournamentCategories.id, catId)).returning();
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const canManage = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });

      // Lifecycle guard: if any teams or matches already exist for this category,
      // refuse the destructive delete. The `?force=true` override is OWNER-only
      // (tournament admins cannot silently wipe player entries — they must
      // clear teams/matches first or escalate).
      const forceRequested = req.query.force === "true";
      const isOwner = (req.user as any).role === "OWNER";
      if (!forceRequested || !isOwner) {
        const [{ teamCount }] = await db.select({ teamCount: sql<number>`count(*)::int` })
          .from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
        const [{ matchCount }] = await db.select({ matchCount: sql<number>`count(*)::int` })
          .from(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
        if ((teamCount || 0) > 0 || (matchCount || 0) > 0) {
          if (forceRequested && !isOwner) {
            return res.status(403).json({ message: "Only an OWNER can force-delete a category with existing teams or matches." });
          }
          return res.status(409).json({
            message: `Cannot delete category: ${teamCount} team(s) and ${matchCount} match(es) exist. Remove teams and clear matches first.`,
          });
        }
      }

      await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.categoryId, catId));
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));
      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      const catGroups = await db.select({ id: tournamentGroups.id }).from(tournamentGroups).where(eq(tournamentGroups.categoryId, catId));
      if (catGroups.length > 0) {
        const groupIds = catGroups.map(g => g.id);
        await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, groupIds));
        await db.delete(tournamentGroups).where(eq(tournamentGroups.categoryId, catId));
      }
      await db.delete(tournamentPrizes).where(eq(tournamentPrizes.categoryId, catId));
      await db.delete(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
      await db.delete(tournamentCategories).where(eq(tournamentCategories.id, catId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournament-categories/:id/teams", async (req, res) => {
    try {
      const catId = Number(req.params.id);
      const teams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId)).orderBy(asc(tournamentTeams.seedNumber));
      const enriched = await Promise.all(teams.map(async (team) => {
        const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
        let p1User = null;
        if (p1) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, p1.userId));
          p1User = u;
        }
        let p2 = null, p2User = null;
        if (team.player2Id) {
          const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
          p2 = profile;
          if (p2) {
            const [u] = await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, p2.userId));
            p2User = u;
          }
        }
        return { ...team, player1: p1 ? { ...p1, user: p1User } : null, player2: p2 ? { ...p2, user: p2User } : null };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const categoryId = Number(req.params.id);
      const { player1Id, player2Id, seedNumber, groupNumber } = req.body;
      const [team] = await db.insert(tournamentTeams).values({
        categoryId, player1Id, player2Id: player2Id || null, seedNumber: seedNumber || null, groupNumber: groupNumber || null,
      }).returning();
      res.json(team);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-teams/bulk-assign-group", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { assignments } = req.body;
      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) return res.status(400).json({ message: "assignments array required" });
      const [firstTeam] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, assignments[0].teamId));
      if (!firstTeam) return res.status(404).json({ message: "Team not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, firstTeam.categoryId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const results = [];
      for (const a of assignments) {
        const [updated] = await db.update(tournamentTeams)
          .set({ groupNumber: a.groupNumber, subGroupNumber: a.subGroupNumber })
          .where(eq(tournamentTeams.id, a.teamId))
          .returning();
        results.push(updated);
      }
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const teamId = Number(req.params.id);
      if (isNaN(teamId)) return res.status(400).json({ message: "Invalid team ID" });
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const canManage = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });
      const { player1Id, player2Id, seedNumber } = req.body;
      const updates: any = {};
      if (player1Id !== undefined) updates.player1Id = player1Id;
      if (player2Id !== undefined) updates.player2Id = player2Id;
      if (seedNumber !== undefined) updates.seedNumber = seedNumber;
      const [updated] = await db.update(tournamentTeams).set(updates).where(eq(tournamentTeams.id, teamId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const teamId = Number(req.params.id);
      if (isNaN(teamId)) return res.status(400).json({ message: "Invalid team ID" });
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const canManage = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });
      await db.delete(tournamentStandings).where(eq(tournamentStandings.teamId, teamId));
      await db.delete(tournamentMatches).where(or(eq(tournamentMatches.teamAId, teamId), eq(tournamentMatches.teamBId, teamId)));
      await db.delete(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournament-categories/:id/matches", async (req, res) => {
    try {
      const catId = Number(req.params.id);
      const matchList = await db.select().from(tournamentMatches).where(eq(tournamentMatches.categoryId, catId))
        .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchOrder));

      const teams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
      const teamMap = new Map<number, any>();
      for (const team of teams) {
        const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
        let p1User = null;
        if (p1) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, p1.userId));
          p1User = u;
        }
        let p2 = null, p2User = null;
        if (team.player2Id) {
          const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
          p2 = profile;
          if (p2) {
            const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, p2.userId));
            p2User = u;
          }
        }
        teamMap.set(team.id, { ...team, player1: p1 ? { ...p1, user: p1User } : null, player2: p2 ? { ...p2, user: p2User } : null });
      }

      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      let courtMap = new Map<number, any>();
      if (cat) {
        const courts = await db.select().from(tournamentCourts).where(eq(tournamentCourts.tournamentId, cat.tournamentId));
        for (const c of courts) courtMap.set(c.id, c);
      }

      const enriched = matchList.map(m => ({
        ...m,
        teamA: m.teamAId ? teamMap.get(m.teamAId) || null : null,
        teamB: m.teamBId ? teamMap.get(m.teamBId) || null : null,
        court: m.courtId ? courtMap.get(m.courtId) || null : null,
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournament-categories/:id/standings", async (req, res) => {
    try {
      const catId = Number(req.params.id);
      const standingsList = await db.select().from(tournamentStandings).where(eq(tournamentStandings.categoryId, catId))
        .orderBy(asc(tournamentStandings.groupNumber), desc(tournamentStandings.points), desc(tournamentStandings.gamesWon));
      res.json(standingsList);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/auto-populate-teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const existingTeams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
      const existingPlayerIds = new Set<number>();
      for (const t of existingTeams) {
        existingPlayerIds.add(t.player1Id);
        if (t.player2Id) existingPlayerIds.add(t.player2Id);
      }

      const isDoubles = (cat.playersPerSide || 1) >= 2;
      let added = 0;

      if (isDoubles) {
        const pairs = await db.select().from(tournamentPairRequests)
          .where(and(eq(tournamentPairRequests.tournamentId, cat.tournamentId), eq(tournamentPairRequests.status, "ACCEPTED")));

        for (const pair of pairs) {
          const [p1Profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pair.fromUserId));
          const [p2Profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pair.toUserId));
          if (!p1Profile || !p2Profile) continue;
          if (existingPlayerIds.has(p1Profile.id) || existingPlayerIds.has(p2Profile.id)) continue;
          await db.insert(tournamentTeams).values({
            categoryId: catId, player1Id: p1Profile.id, player2Id: p2Profile.id,
          });
          existingPlayerIds.add(p1Profile.id);
          existingPlayerIds.add(p2Profile.id);
          added++;
        }
      } else {
        const regs = await db.select().from(tournamentRegistrations)
          .where(and(
            eq(tournamentRegistrations.tournamentId, cat.tournamentId),
            eq(tournamentRegistrations.status, "APPROVED"),
          ));
        for (const reg of regs) {
          const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
          if (!profile || existingPlayerIds.has(profile.id)) continue;
          await db.insert(tournamentTeams).values({ categoryId: catId, player1Id: profile.id });
          existingPlayerIds.add(profile.id);
          added++;
        }
      }

      res.json({ success: true, teamsAdded: added, totalTeams: existingTeams.length + added });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/reset-and-rebuild", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      // === PURGE ORPHAN TEAMS FIRST ===
      // Any team whose players are no longer in an ACCEPTED pair_request (doubles) or an
      // APPROVED registration (singles) is a ghost from a previous state. Wipe it (and any
      // group slot, match, or standing row pointing at it) BEFORE deciding whether to
      // preserve the remaining groups. This is what removes dissolved pairs like "Huy & Quan"
      // from the Groups/Standings views automatically.
      const isDoublesCat = (cat.playersPerSide || 1) >= 2;
      const validProfilePairKeys = new Set<string>();
      const validSoloProfileIds = new Set<number>();
      // SOURCE OF TRUTH = tournament_registrations. A pair is valid ONLY when BOTH players
      // have an APPROVED PAIR registration for this tournament with partnerId pointing at
      // each other. This catches ghosts even if the legacy pair_request row was never marked
      // DISSOLVED (which is what was keeping "Huy & Quan" stuck in the groups).
      const allRegs = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, cat.tournamentId), eq(tournamentRegistrations.status, "APPROVED")));
      if (isDoublesCat) {
        const pairRegsByUser = new Map<number, number>(); // userId -> partnerId
        for (const reg of allRegs) {
          if (reg.registrationType === "PAIR" && reg.partnerId) pairRegsByUser.set(reg.userId, reg.partnerId);
        }
        for (const [uid, pid] of pairRegsByUser.entries()) {
          // both sides must mutually point at each other
          if (pairRegsByUser.get(pid) !== uid) continue;
          const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, uid));
          const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pid));
          if (!p1 || !p2) continue;
          const [a, b] = [p1.id, p2.id].sort((x, y) => x - y);
          validProfilePairKeys.add(`${a}-${b}`);
        }
      } else {
        for (const reg of allRegs) {
          const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
          if (profile) validSoloProfileIds.add(profile.id);
        }
      }
      const allTeamsInCat = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
      const orphanTeamIds: number[] = [];
      for (const t of allTeamsInCat) {
        let keep = false;
        if (isDoublesCat) {
          if (t.player1Id && t.player2Id) {
            const [a, b] = [t.player1Id, t.player2Id].sort((x, y) => x - y);
            keep = validProfilePairKeys.has(`${a}-${b}`);
          }
        } else {
          keep = !!(t.player1Id && validSoloProfileIds.has(t.player1Id));
        }
        if (!keep) orphanTeamIds.push(t.id);
      }
      if (orphanTeamIds.length > 0) {
        await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.teamId, orphanTeamIds));
        await db.delete(tournamentMatches).where(or(
          inArray(tournamentMatches.teamAId, orphanTeamIds),
          inArray(tournamentMatches.teamBId, orphanTeamIds),
        ));
        await db.delete(tournamentStandings).where(inArray(tournamentStandings.teamId, orphanTeamIds));
        await db.delete(tournamentTeams).where(inArray(tournamentTeams.id, orphanTeamIds));
      }

      // === PROTECT EXISTING GROUP ASSIGNMENTS ===
      // If this category already has groups with assigned pairs (after orphan purge above),
      // DO NOT reshuffle those placements. Admins placed them intentionally. Only refresh
      // the derived matches/standings against the surviving group assignments.
      const existingGroups = await db.select().from(tournamentGroups)
        .where(eq(tournamentGroups.categoryId, catId))
        .orderBy(asc(tournamentGroups.groupOrder));
      const existingGroupIds = existingGroups.map(g => g.id);
      const existingGP = existingGroupIds.length > 0
        ? await db.select().from(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, existingGroupIds))
        : [];
      const hasLockedGroups = existingGP.length > 0;

      if (hasLockedGroups) {
        // Non-destructive refresh: wipe only derived data and regenerate matches + standings
        // from the EXACT group assignments already in place.
        await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
        await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));
        await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.categoryId, catId));

        let matchesCreated = 0;
        let order = 0;
        for (let gi = 0; gi < existingGroups.length; gi++) {
          const grp = existingGroups[gi];
          const gNum = gi + 1;
          const teamIdsInGroup = existingGP
            .filter(gp => gp.groupId === grp.id)
            .map(gp => gp.teamId)
            .filter((x): x is number => !!x);
          if (teamIdsInGroup.length < 2) continue;
          const sched = generateRoundRobinSchedule(teamIdsInGroup);
          for (const [aId, bId] of sched) {
            await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: aId, teamBId: bId,
              round: 1, matchOrder: order++, groupNumber: gNum, subGroupNumber: 1,
            });
            matchesCreated++;
          }
          for (const tid of teamIdsInGroup) {
            await db.insert(tournamentStandings).values({ categoryId: catId, teamId: tid, groupNumber: gNum, subGroupNumber: 1 });
          }
        }

        return res.json({
          success: true,
          teamsCreated: 0,
          groupsCreated: 0,
          matchesCreated,
          preservedGroups: true,
          message: `Preserved ${existingGroups.length} groups as-is. Refreshed ${matchesCreated} matches from current pair assignments.`,
        });
      }

      // === INITIAL BUILD ONLY ===
      // Reached only when there are no existing group assignments. Safe to build from scratch.
      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));
      await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.categoryId, catId));
      const oldGroups = await db.select({ id: tournamentGroups.id }).from(tournamentGroups)
        .where(or(eq(tournamentGroups.categoryId, catId), and(eq(tournamentGroups.tournamentId, cat.tournamentId), isNull(tournamentGroups.categoryId))));
      if (oldGroups.length > 0) {
        const ogIds = oldGroups.map(g => g.id);
        await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, ogIds));
        await db.delete(tournamentGroups).where(inArray(tournamentGroups.id, ogIds));
      }
      await db.delete(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));

      // Rebuild teams from ACCEPTED pair_requests (or APPROVED registrations for singles)
      const isDoubles = (cat.playersPerSide || 1) >= 2;
      const newTeams: any[] = [];
      const seenPlayerIds = new Set<number>();

      if (isDoubles) {
        const pairsRaw = await db.select().from(tournamentPairRequests)
          .where(and(eq(tournamentPairRequests.tournamentId, cat.tournamentId), eq(tournamentPairRequests.status, "ACCEPTED")))
          .orderBy(desc(tournamentPairRequests.createdAt));
        // Defensive dedup: if a player appears in multiple ACCEPTED pair_requests (legacy bad data),
        // keep only the MOST RECENT pair and dissolve the older ones so they never resurface.
        const usedUserIds = new Set<number>();
        const pairs: typeof pairsRaw = [];
        for (const pr of pairsRaw) {
          if (usedUserIds.has(pr.fromUserId) || usedUserIds.has(pr.toUserId)) {
            await db.update(tournamentPairRequests).set({ status: "DISSOLVED" })
              .where(eq(tournamentPairRequests.id, pr.id));
            continue;
          }
          pairs.push(pr);
          usedUserIds.add(pr.fromUserId);
          usedUserIds.add(pr.toUserId);
        }
        for (const pair of pairs) {
          const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pair.fromUserId));
          const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pair.toUserId));
          if (!p1 || !p2) continue;
          if (seenPlayerIds.has(p1.id) || seenPlayerIds.has(p2.id)) continue;
          const [team] = await db.insert(tournamentTeams).values({
            categoryId: catId, player1Id: p1.id, player2Id: p2.id,
          }).returning();
          newTeams.push(team);
          seenPlayerIds.add(p1.id);
          seenPlayerIds.add(p2.id);
        }
      } else {
        const regs = await db.select().from(tournamentRegistrations)
          .where(and(eq(tournamentRegistrations.tournamentId, cat.tournamentId), eq(tournamentRegistrations.status, "APPROVED")));
        for (const reg of regs) {
          const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
          if (!profile || seenPlayerIds.has(profile.id)) continue;
          const [team] = await db.insert(tournamentTeams).values({ categoryId: catId, player1Id: profile.id }).returning();
          newTeams.push(team);
          seenPlayerIds.add(profile.id);
        }
      }

      if (newTeams.length === 0) {
        return res.json({ success: true, teamsCreated: 0, groupsCreated: 0, message: "No accepted pairs/registrations found" });
      }

      // For GROUP_KNOCKOUT, create fresh groups and pack them full (no half-empty groups of 3)
      let groupsCreated = 0;
      if (cat.format === "GROUP_KNOCKOUT") {
        const targetSize = 4;
        const N = newTeams.length;
        // Use floor so all base groups are full at 4; leftover (1..3) gets spread across the first groups
        let numGroups = Math.max(1, Math.floor(N / targetSize));
        // Compute per-group sizes: first `remainder` groups are size targetSize+1, rest are targetSize
        const remainder = N - numGroups * targetSize;
        const sizes: number[] = [];
        if (N <= targetSize) {
          sizes.push(N); // single group with whatever we have
        } else {
          for (let g = 0; g < numGroups; g++) {
            sizes.push(targetSize + (g < remainder ? 1 : 0));
          }
        }
        const newGroups: any[] = [];
        for (let g = 0; g < sizes.length; g++) {
          const [grp] = await db.insert(tournamentGroups).values({
            tournamentId: cat.tournamentId,
            categoryId: catId,
            name: `Group ${String.fromCharCode(65 + g)}`,
            groupOrder: g + 1,
            maxPairs: sizes[g],
          }).returning();
          newGroups.push(grp);
        }
        groupsCreated = newGroups.length;
        // Fill each group sequentially to its size
        let teamIdx = 0;
        for (let g = 0; g < newGroups.length; g++) {
          for (let pos = 0; pos < sizes[g]; pos++) {
            if (teamIdx >= newTeams.length) break;
            await db.insert(tournamentGroupPairs).values({
              groupId: newGroups[g].id, teamId: newTeams[teamIdx].id, pairOrder: pos + 1,
            });
            teamIdx++;
          }
        }
      }

      // Auto-generate matches + standings so the standings/bracket views stay in sync immediately.
      // (Previously the user had to click "Regenerate Fixtures" separately, which left stale data
      // in the standings table if they forgot, causing different teams to appear in different views.)
      let matchesCreated = 0;
      if (cat.format === "GROUP_KNOCKOUT") {
        const tGroups = await db.select().from(tournamentGroups)
          .where(and(eq(tournamentGroups.tournamentId, cat.tournamentId), eq(tournamentGroups.categoryId, catId)))
          .orderBy(asc(tournamentGroups.groupOrder));
        const allGP = await db.select().from(tournamentGroupPairs)
          .where(inArray(tournamentGroupPairs.groupId, tGroups.map(g => g.id).length > 0 ? tGroups.map(g => g.id) : [-1]));
        let order = 0;
        for (let gi = 0; gi < tGroups.length; gi++) {
          const grp = tGroups[gi];
          const gNum = gi + 1;
          const teamIdsInGroup = allGP.filter(gp => gp.groupId === grp.id).map(gp => gp.teamId).filter((x): x is number => !!x);
          if (teamIdsInGroup.length < 2) continue;
          const sched = generateRoundRobinSchedule(teamIdsInGroup);
          for (const [aId, bId] of sched) {
            await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: aId, teamBId: bId,
              round: 1, matchOrder: order++, groupNumber: gNum, subGroupNumber: 1,
            });
            matchesCreated++;
          }
          for (const tid of teamIdsInGroup) {
            await db.insert(tournamentStandings).values({ categoryId: catId, teamId: tid, groupNumber: gNum, subGroupNumber: 1 });
          }
        }
      }

      res.json({ success: true, teamsCreated: newTeams.length, groupsCreated, matchesCreated, message: `Rebuilt ${newTeams.length} teams into ${groupsCreated} groups with ${matchesCreated} matches.` });
    } catch (e: any) {
      console.error("[RESET REBUILD]", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/clear-matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));
      await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.categoryId, catId));

      // Also purge any orphan teams (whose players are no longer in a valid mutual PAIR
      // registration) and their group slots, so dissolved pairs disappear automatically.
      await purgeOrphanTeamsForCategory(cat);

      res.json({ success: true, message: "All matches and standings cleared. Click Regenerate Fixtures to rebuild." });
    } catch (e: any) {
      console.error("[CLEAR MATCHES]", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Clear only the knockout stages (Quarter-Finals, Semi-Finals, Final), keeping
  // the round-robin group stage intact. Used by the "Regenerate Quarter-Finals"
  // workflow so admins can re-run KO generation after changing groups/standings.
  app.post("/api/tournament-categories/:id/clear-knockout", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      // Wipe matches with round >= 200 (QF=200, SF=300, Final=400) and any
      // standings rows belonging to those KO group buckets (groupNumber >= 200).
      await db.delete(tournamentMatches).where(
        and(
          eq(tournamentMatches.categoryId, catId),
          gte(tournamentMatches.round, 200),
        ),
      );
      await db.delete(tournamentStandings).where(
        and(
          eq(tournamentStandings.categoryId, catId),
          gte(tournamentStandings.groupNumber, 200),
        ),
      );

      res.json({ success: true, message: "Knockout stages cleared. Quarter-Finals can be regenerated." });
    } catch (e: any) {
      console.error("[CLEAR KNOCKOUT]", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/generate-matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });

      // Auto-purge orphan teams (whose players are no longer mutually paired) BEFORE
      // pulling the team list — otherwise the auto-fill below could re-seat a ghost pair.
      await purgeOrphanTeamsForCategory(cat);

      const teams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId)).orderBy(asc(tournamentTeams.seedNumber));
      if (teams.length < 2) return res.status(400).json({ message: "Need at least 2 teams" });

      const isDoubles = (cat.playersPerSide || 1) >= 2;
      if (isDoubles) {
        const incomplete = teams.filter(t => !t.player2Id);
        if (incomplete.length > 0) {
          return res.status(400).json({ message: `${incomplete.length} team(s) missing a partner. Doubles requires pairs (2 players per team).` });
        }
      }

      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));

      if (cat.format === "ROUND_ROBIN") {
        let order = 0;
        const rrSchedule = generateRoundRobinSchedule(teams.map(t => t.id));
        for (const [aId, bId] of rrSchedule) {
          await db.insert(tournamentMatches).values({
            categoryId: catId, teamAId: aId, teamBId: bId,
            round: 1, matchOrder: order++, groupNumber: 1,
          });
        }
        for (const team of teams) {
          await db.insert(tournamentStandings).values({ categoryId: catId, teamId: team.id, groupNumber: 1 });
        }
      } else if (cat.format === "GROUP_KNOCKOUT") {
        // Scope strictly to this category to avoid pulling in phantom groups from other categories/tournaments
        let tGroups = await db.select().from(tournamentGroups)
          .where(and(
            eq(tournamentGroups.tournamentId, cat.tournamentId),
            eq(tournamentGroups.categoryId, catId),
          ))
          .orderBy(asc(tournamentGroups.groupOrder));

        let allGroupPairs = await db.select().from(tournamentGroupPairs);
        const groupIds = new Set(tGroups.map(g => g.id));

        // Helper: resolve a group_pair entry to a teamId (creating a team if needed for pairRequestId pairs)
        const resolvePairToTeamId = async (gp: typeof allGroupPairs[number]): Promise<number | null> => {
          if (gp.teamId) return gp.teamId;
          if (!gp.pairRequestId) return null;
          const [pr] = await db.select().from(tournamentPairRequests).where(eq(tournamentPairRequests.id, gp.pairRequestId));
          if (!pr) return null;
          const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pr.fromUserId));
          const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, pr.toUserId));
          if (!p1 || !p2) return null;
          let team = teams.find(t =>
            (t.player1Id === p1.id && t.player2Id === p2.id) ||
            (t.player1Id === p2.id && t.player2Id === p1.id)
          );
          if (!team) {
            const [newTeam] = await db.insert(tournamentTeams).values({
              categoryId: catId, player1Id: p1.id, player2Id: p2.id,
            }).returning();
            teams.push(newTeam);
            team = newTeam;
          }
          // Persist the teamId on the group_pair so future runs find it directly
          await db.update(tournamentGroupPairs).set({ teamId: team.id }).where(eq(tournamentGroupPairs.id, gp.id));
          gp.teamId = team.id;
          return team.id;
        };

        // Build canonical group → team-ids map. If a team appears in multiple groups
        // (e.g., from prior duplicate auto-distribute runs), keep only the FIRST occurrence
        // and delete the duplicate pair entries from later groups.
        const groupTeamMap = new Map<number, number[]>();
        const assignedTeamIds = new Set<number>();
        for (const grp of tGroups) {
          const entries = allGroupPairs.filter(gp => gp.groupId === grp.id);
          const ids: number[] = [];
          for (const gp of entries) {
            const tid = await resolvePairToTeamId(gp);
            if (!tid) continue;
            if (assignedTeamIds.has(tid)) {
              // Team already in an earlier group — remove this duplicate entry
              await db.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.id, gp.id));
              continue;
            }
            ids.push(tid);
            assignedTeamIds.add(tid);
          }
          groupTeamMap.set(grp.id, ids);
        }

        // Remove any groups that ended up empty (typically leftover phantom auto-groups)
        const nonEmptyGroups: typeof tGroups = [];
        for (const grp of tGroups) {
          const ids = groupTeamMap.get(grp.id) || [];
          if (ids.length === 0) {
            await db.delete(tournamentGroups).where(eq(tournamentGroups.id, grp.id));
            groupTeamMap.delete(grp.id);
          } else {
            nonEmptyGroups.push(grp);
          }
        }
        tGroups = nonEmptyGroups;

        // Fill existing group slots ONLY (do NOT create new groups — that caused phantom duplicate groups).
        const unassignedTeams = teams.filter(t => !assignedTeamIds.has(t.id));
        if (unassignedTeams.length > 0 && tGroups.length > 0) {
          const defaultMax = tGroups[0].maxPairs || 4;
          let cursor = 0;
          for (const grp of tGroups) {
            if (cursor >= unassignedTeams.length) break;
            const currentIds = groupTeamMap.get(grp.id) || [];
            const slots = Math.max(0, (grp.maxPairs || defaultMax) - currentIds.length);
            for (let s = 0; s < slots && cursor < unassignedTeams.length; s++) {
              const t = unassignedTeams[cursor++];
              await db.insert(tournamentGroupPairs).values({
                groupId: grp.id, teamId: t.id, pairOrder: currentIds.length + s + 1,
              });
              currentIds.push(t.id);
              assignedTeamIds.add(t.id);
            }
            groupTeamMap.set(grp.id, currentIds);
          }
        }

        // If there are NO groups at all yet, create some fresh ones based on team count
        if (tGroups.length === 0) {
          const groupSize = 4;
          const numGroups = Math.max(1, Math.ceil(teams.length / groupSize));
          for (let g = 0; g < numGroups; g++) {
            const [newGrp] = await db.insert(tournamentGroups).values({
              tournamentId: cat.tournamentId,
              categoryId: catId,
              name: `Group ${String.fromCharCode(65 + g)}`,
              groupOrder: g + 1,
              maxPairs: groupSize,
            }).returning();
            tGroups.push(newGrp);
            groupTeamMap.set(newGrp.id, []);
          }
          teams.forEach((t, i) => {
            const grp = tGroups[i % numGroups];
            const ids = groupTeamMap.get(grp.id)!;
            ids.push(t.id);
            groupTeamMap.set(grp.id, ids);
          });
          for (const grp of tGroups) {
            const ids = groupTeamMap.get(grp.id) || [];
            for (let i = 0; i < ids.length; i++) {
              await db.insert(tournamentGroupPairs).values({
                groupId: grp.id, teamId: ids[i], pairOrder: i + 1,
              });
            }
          }
        }

        let order = 0;
        for (let gi = 0; gi < tGroups.length; gi++) {
          const group = tGroups[gi];
          const gNum = gi + 1;
          const teamIdsInGroup = groupTeamMap.get(group.id) || [];
          const groupTeams = teamIdsInGroup.map(id => teams.find(t => t.id === id)).filter(Boolean) as typeof teams;
          if (groupTeams.length < 2) continue;

          const grpSchedule = generateRoundRobinSchedule(groupTeams.map(t => t.id));
          for (const [aId, bId] of grpSchedule) {
            await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: aId, teamBId: bId,
              round: 1, matchOrder: order++, groupNumber: gNum, subGroupNumber: 1,
            });
          }
          for (const t of groupTeams) {
            await db.insert(tournamentStandings).values({ categoryId: catId, teamId: t.id, groupNumber: gNum, subGroupNumber: 1 });
          }
        }
      } else {
        const n = teams.length;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
        let round1Matches: any[] = [];
        let matchIdx = 0;

        for (let i = 0; i < totalSlots / 2; i++) {
          const tA = i < teams.length ? teams[i] : null;
          const tB = (totalSlots - 1 - i) < teams.length ? teams[totalSlots - 1 - i] : null;
          if (tA && tB) {
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: tA.id, teamBId: tB.id,
              round: 1, matchOrder: matchIdx++, bracketPosition: i,
            }).returning();
            round1Matches.push(m);
          } else if (tA) {
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: tA.id, teamBId: null,
              round: 1, matchOrder: matchIdx++, bracketPosition: i,
              isBye: true, winnerId: tA.id, status: "FINISHED",
            }).returning();
            round1Matches.push(m);
          }
        }

        let currentRoundMatches = round1Matches;
        let round = 2;
        while (currentRoundMatches.length > 1) {
          const nextRound: any[] = [];
          for (let i = 0; i < currentRoundMatches.length; i += 2) {
            const matchA = currentRoundMatches[i];
            const matchB = currentRoundMatches[i + 1];
            const advancedA = matchA?.winnerId || null;
            const advancedB = matchB?.winnerId || null;
            const onlyOneTeam = (advancedA && !advancedB) || (!advancedA && advancedB);
            const theTeam = advancedA || advancedB;
            if (onlyOneTeam && theTeam) {
              const [m] = await db.insert(tournamentMatches).values({
                categoryId: catId,
                teamAId: advancedA, teamBId: advancedB,
                round, matchOrder: i / 2, bracketPosition: i / 2,
                isBye: true, winnerId: theTeam, status: "FINISHED",
              }).returning();
              nextRound.push(m);
            } else {
              const [m] = await db.insert(tournamentMatches).values({
                categoryId: catId,
                teamAId: advancedA, teamBId: advancedB,
                round, matchOrder: i / 2, bracketPosition: i / 2,
              }).returning();
              nextRound.push(m);
            }
          }
          currentRoundMatches = nextRound;
          round++;
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/add-group-match", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      if (cat.format !== "GROUP_KNOCKOUT" && cat.format !== "ROUND_ROBIN") {
        return res.status(400).json({ message: "Manual matches can only be added to group/round-robin categories" });
      }
      const canManage = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });

      const { teamAId: rawTeamAId, teamBId: rawTeamBId, pairARequestId, pairBRequestId, groupNumber, subGroupNumber, round: roundOverride, stageId: rawStageId } = req.body;

      // Helper: resolve a pair-request to a team in this category, creating it if needed.
      // Throws with a descriptive reason on failure so the user sees exactly what went wrong
      // rather than a generic "Both pairs are required" message.
      const [tournamentForPair] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
      async function ensureProfile(userId: number, label: string): Promise<number> {
        const [existing] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
        if (existing) return existing.id;
        if (!tournamentForPair?.clubId) {
          throw new Error(`Tournament ${cat.tournamentId} has no club to create a profile for ${label} (user ${userId})`);
        }
        try {
          const [created] = await db.insert(playerProfiles).values({
            userId, clubId: tournamentForPair.clubId,
          }).returning();
          return created.id;
        } catch (err: any) {
          throw new Error(`Could not create player profile for ${label} (user ${userId}): ${err.message}`);
        }
      }
      async function resolvePairRequestToTeam(prId: number, sideLabel: string): Promise<number> {
        const [pr] = await db.select().from(tournamentPairRequests).where(eq(tournamentPairRequests.id, prId));
        if (!pr) throw new Error(`${sideLabel}: pair request #${prId} not found`);
        const p1Id = await ensureProfile(pr.fromUserId, `${sideLabel} player 1`);
        const p2Id = await ensureProfile(pr.toUserId, `${sideLabel} player 2`);
        const existing = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId));
        const found = existing.find(t =>
          (t.player1Id === p1Id && t.player2Id === p2Id) ||
          (t.player1Id === p2Id && t.player2Id === p1Id)
        );
        let teamId: number;
        if (found) {
          teamId = found.id;
        } else {
          try {
            const [created] = await db.insert(tournamentTeams).values({
              categoryId: catId, player1Id: p1Id, player2Id: p2Id,
            }).returning();
            teamId = created.id;
          } catch (err: any) {
            throw new Error(`${sideLabel}: could not create team in category ${catId}: ${err.message}`);
          }
        }
        // Backfill the group_pair row(s) that reference this pair-request so the standings
        // can match stats (keyed by teamId) to the pair displayed in the group.
        await db.update(tournamentGroupPairs)
          .set({ teamId })
          .where(eq(tournamentGroupPairs.pairRequestId, prId));
        return teamId;
      }

      let teamAId: number | null = rawTeamAId ? Number(rawTeamAId) : null;
      let teamBId: number | null = rawTeamBId ? Number(rawTeamBId) : null;
      try {
        if (!teamAId && pairARequestId) teamAId = await resolvePairRequestToTeam(Number(pairARequestId), "Pair A");
        if (!teamBId && pairBRequestId) teamBId = await resolvePairRequestToTeam(Number(pairBRequestId), "Pair B");
      } catch (err: any) {
        return res.status(400).json({ message: err.message });
      }

      if (!teamAId) return res.status(400).json({ message: "Pair A is required (no team or pair-request ID was provided)" });
      if (!teamBId) return res.status(400).json({ message: "Pair B is required (no team or pair-request ID was provided)" });
      if (teamAId === teamBId) return res.status(400).json({ message: "Pairs must be different" });

      const [teamA] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamAId));
      const [teamB] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamBId));
      if (!teamA || !teamB) return res.status(400).json({ message: "One or both pairs not found" });
      if (teamA.categoryId !== catId || teamB.categoryId !== catId) {
        return res.status(400).json({ message: "Both pairs must belong to this category" });
      }

      const gNum = groupNumber || teamA.groupNumber || 1;
      const sgNum = subGroupNumber || teamA.subGroupNumber || 1;
      // Round defaults to 1 (round-robin / group stage). Knockout stages pass
      // round = 200 (Quarter-Finals), 300 (Semi-Finals), or 400 (Final) so the
      // Matches view groups them under the correct stage banner.
      const matchRound = Number(roundOverride) > 0 ? Number(roundOverride) : 1;

      const existingMatches = await db.select().from(tournamentMatches)
        .where(eq(tournamentMatches.categoryId, catId));
      const maxOrder = existingMatches.reduce((max, m) => Math.max(max, m.matchOrder), -1);

      // Validate stageId belongs to this tournament before persisting (shared helper).
      const stageCheck = await validateStageBelongsToTournament(rawStageId, cat.tournamentId);
      if (!stageCheck.ok) return res.status(stageCheck.status).json({ message: stageCheck.message });

      const [match] = await db.insert(tournamentMatches).values({
        categoryId: catId,
        teamAId,
        teamBId,
        round: matchRound,
        matchOrder: maxOrder + 1,
        groupNumber: gNum,
        subGroupNumber: sgNum,
        stageId: stageCheck.value,
      }).returning();

      // Ensure standings rows exist for both pairs in this group, otherwise score updates are silently dropped.
      const existingStandings = await db.select().from(tournamentStandings)
        .where(and(eq(tournamentStandings.categoryId, catId), eq(tournamentStandings.groupNumber, gNum)));
      const haveTeam = new Set(existingStandings.map(s => s.teamId));
      const toInsert: any[] = [];
      if (!haveTeam.has(teamAId)) toInsert.push({ categoryId: catId, teamId: teamAId, groupNumber: gNum, subGroupNumber: sgNum });
      if (!haveTeam.has(teamBId)) toInsert.push({ categoryId: catId, teamId: teamBId, groupNumber: gNum, subGroupNumber: sgNum });
      if (toInsert.length) await db.insert(tournamentStandings).values(toInsert);

      res.json(match);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-matches/:id/score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [existingMatch] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!existingMatch) return res.status(404).json({ message: "Match not found" });
      const [scoreCat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, existingMatch.categoryId));
      if (!scoreCat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, scoreCat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { scores, winnerId } = req.body;
      const updates: any = { scores, status: "FINISHED" as const };
      if (winnerId) updates.winnerId = winnerId;

      // If the match was already FINISHED, reverse its previous effect on the standings
      // before applying the new score so editing doesn't double-count.
      if (existingMatch.status === "FINISHED" && existingMatch.winnerId && existingMatch.groupNumber) {
        const prevScores: any[] = (existingMatch.scores as any[]) || [];
        let pTotalA = 0, pTotalB = 0;
        for (const s of prevScores) { pTotalA += s.scoreA; pTotalB += s.scoreB; }
        const prevWinnerIsA = existingMatch.winnerId === existingMatch.teamAId;
        const prevLoserId = prevWinnerIsA ? existingMatch.teamBId : existingMatch.teamAId;
        const prevWinnerPF = prevWinnerIsA ? pTotalA : pTotalB;
        const prevWinnerPA = prevWinnerIsA ? pTotalB : pTotalA;
        const prevLoserPF = prevWinnerIsA ? pTotalB : pTotalA;
        const prevLoserPA = prevWinnerIsA ? pTotalA : pTotalB;
        const prevGamesByWinner = prevScores.filter((s: any) => prevWinnerIsA ? s.scoreA > s.scoreB : s.scoreB > s.scoreA).length;
        const prevGamesByLoser = prevScores.length - prevGamesByWinner;
        await db.execute(sql`
          UPDATE tournament_standings SET
            matches_played = matches_played - 1,
            matches_won = matches_won - 1,
            games_won = games_won - ${prevGamesByWinner},
            games_lost = games_lost - ${prevGamesByLoser},
            points_for = points_for - ${prevWinnerPF},
            points_against = points_against - ${prevWinnerPA},
            points = points - ${prevWinnerPF}
          WHERE category_id = ${existingMatch.categoryId} AND team_id = ${existingMatch.winnerId} AND group_number = ${existingMatch.groupNumber}
        `);
        if (prevLoserId) {
          await db.execute(sql`
            UPDATE tournament_standings SET
              matches_played = matches_played - 1,
              matches_lost = matches_lost - 1,
              games_won = games_won - ${prevGamesByLoser},
              games_lost = games_lost - ${prevGamesByWinner},
              points_for = points_for - ${prevLoserPF},
              points_against = points_against - ${prevLoserPA},
              points = points - ${prevLoserPF}
            WHERE category_id = ${existingMatch.categoryId} AND team_id = ${prevLoserId} AND group_number = ${existingMatch.groupNumber}
          `);
        }
      }

      const [match] = await db.update(tournamentMatches).set(updates).where(eq(tournamentMatches.id, matchId)).returning();

      if (match.groupNumber && match.winnerId) {
        const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
        let totalA = 0, totalB = 0;
        if (scores && scores.length > 0) {
          for (const s of scores) { totalA += s.scoreA; totalB += s.scoreB; }
        }
        const winnerPF = match.winnerId === match.teamAId ? totalA : totalB;
        const winnerPA = match.winnerId === match.teamAId ? totalB : totalA;
        const loserPF = match.winnerId === match.teamAId ? totalB : totalA;
        const loserPA = match.winnerId === match.teamAId ? totalA : totalB;
        const gamesWonByWinner = scores ? scores.filter((s: any) => (match.winnerId === match.teamAId ? s.scoreA > s.scoreB : s.scoreB > s.scoreA)).length : 1;
        const gamesWonByLoser = scores ? scores.length - gamesWonByWinner : 0;

        await db.execute(sql`
          UPDATE tournament_standings SET
            matches_played = matches_played + 1,
            matches_won = matches_won + 1,
            games_won = games_won + ${gamesWonByWinner},
            games_lost = games_lost + ${gamesWonByLoser},
            points_for = points_for + ${winnerPF},
            points_against = points_against + ${winnerPA},
            points = points + ${winnerPF}
          WHERE category_id = ${match.categoryId} AND team_id = ${match.winnerId} AND group_number = ${match.groupNumber}
        `);
        if (loserId) {
          await db.execute(sql`
            UPDATE tournament_standings SET
              matches_played = matches_played + 1,
              matches_lost = matches_lost + 1,
              games_won = games_won + ${gamesWonByLoser},
              games_lost = games_lost + ${gamesWonByWinner},
              points_for = points_for + ${loserPF},
              points_against = points_against + ${loserPA},
              points = points + ${loserPF}
            WHERE category_id = ${match.categoryId} AND team_id = ${loserId} AND group_number = ${match.groupNumber}
          `);
        }
      }

      if (match.winnerId && !match.groupNumber) {
        const allMatches = await db.select().from(tournamentMatches)
          .where(eq(tournamentMatches.categoryId, match.categoryId))
          .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchOrder));
        const nextRound = match.round + 1;
        const nextPos = Math.floor(match.bracketPosition! / 2);
        const nextMatch = allMatches.find(m => m.round === nextRound && m.bracketPosition === nextPos);
        if (nextMatch) {
          const isFirst = match.bracketPosition! % 2 === 0;
          const upd: any = isFirst ? { teamAId: match.winnerId } : { teamBId: match.winnerId };
          await db.update(tournamentMatches).set(upd).where(eq(tournamentMatches.id, nextMatch.id));
        }
      }

      const [matchCat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      if (matchCat) {
        try { await recalculatePlayerStats(matchCat.tournamentId, match.categoryId); } catch {}
      }

      res.json(match);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Delete an individual match. If the match was already FINISHED with a winner,
  // reverse its standings effect first so the table stays accurate.
  app.delete("/api/tournament-matches/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [m] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!m) return res.status(404).json({ message: "Match not found" });
      const [delCat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, m.categoryId));
      if (!delCat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin((req.user as any).id, delCat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      if (m.status === "FINISHED" && m.winnerId && m.groupNumber) {
        const prevScores: any[] = (m.scores as any[]) || [];
        let pTotalA = 0, pTotalB = 0;
        for (const s of prevScores) { pTotalA += s.scoreA; pTotalB += s.scoreB; }
        const winnerIsA = m.winnerId === m.teamAId;
        const loserId = winnerIsA ? m.teamBId : m.teamAId;
        const wPF = winnerIsA ? pTotalA : pTotalB;
        const wPA = winnerIsA ? pTotalB : pTotalA;
        const lPF = winnerIsA ? pTotalB : pTotalA;
        const lPA = winnerIsA ? pTotalA : pTotalB;
        const wGames = prevScores.filter((s: any) => winnerIsA ? s.scoreA > s.scoreB : s.scoreB > s.scoreA).length;
        const lGames = prevScores.length - wGames;
        await db.execute(sql`
          UPDATE tournament_standings SET
            matches_played = matches_played - 1,
            matches_won = matches_won - 1,
            games_won = games_won - ${wGames},
            games_lost = games_lost - ${lGames},
            points_for = points_for - ${wPF},
            points_against = points_against - ${wPA},
            points = points - ${wPF}
          WHERE category_id = ${m.categoryId} AND team_id = ${m.winnerId} AND group_number = ${m.groupNumber}
        `);
        if (loserId) {
          await db.execute(sql`
            UPDATE tournament_standings SET
              matches_played = matches_played - 1,
              matches_lost = matches_lost - 1,
              games_won = games_won - ${lGames},
              games_lost = games_lost - ${wGames},
              points_for = points_for - ${lPF},
              points_against = points_against - ${lPA},
              points = points - ${lPF}
            WHERE category_id = ${m.categoryId} AND team_id = ${loserId} AND group_number = ${m.groupNumber}
          `);
        }
      }

      await db.delete(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      try { await recalculatePlayerStats(delCat.tournamentId, m.categoryId); } catch {}
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/advance-winners", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const canManage = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });

      const sortStandings = (arr: any[]) => arr.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.pointsFor - a.pointsAgainst;
        const diffB = b.pointsFor - b.pointsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
        return a.gamesLost - b.gamesLost;
      });

      if (cat.format === "GROUP_KNOCKOUT") {
        const allMatches = await db.select().from(tournamentMatches)
          .where(eq(tournamentMatches.categoryId, catId));
        const allStandings = await db.select().from(tournamentStandings)
          .where(eq(tournamentStandings.categoryId, catId));

        const finalMatches = allMatches.filter(m => m.round === 400);
        if (finalMatches.length > 0) {
          return res.json({ message: "Final already generated" });
        }

        const semiMatches = allMatches.filter(m => m.round === 300);
        if (semiMatches.length > 0) {
          const unfinished = semiMatches.filter(m => m.status !== "FINISHED");
          if (unfinished.length > 0) {
            return res.status(400).json({ message: `Complete all semi-final matches first (${unfinished.length} remaining)` });
          }
          const semiGroupNums = Array.from(new Set(semiMatches.map(m => m.groupNumber).filter(Boolean)));
          const semiStandings = allStandings.filter(s => s.groupNumber >= 300 && s.groupNumber < 400);
          const semiGroupKeys = Array.from(new Set(semiStandings.map(s => s.groupNumber))).sort((a, b) => a - b);
          const finalists: number[] = [];
          for (const gNum of semiGroupKeys) {
            const gStandings = sortStandings(semiStandings.filter(s => s.groupNumber === gNum));
            if (gStandings.length > 0) finalists.push(gStandings[0].teamId);
          }
          if (finalists.length < 2) {
            const allSemiStandings = sortStandings(semiStandings);
            while (finalists.length < 2 && allSemiStandings.length > finalists.length) {
              const next = allSemiStandings.find(s => !finalists.includes(s.teamId));
              if (next) finalists.push(next.teamId);
              else break;
            }
          }
          if (finalists.length < 2) return res.status(400).json({ message: "Not enough teams for finals" });
          const top2 = finalists.slice(0, 2);
          const maxOrder = allMatches.reduce((max, m) => Math.max(max, m.matchOrder), -1);
          await db.insert(tournamentMatches).values({
            categoryId: catId, teamAId: top2[0], teamBId: top2[1],
            round: 400, matchOrder: maxOrder + 1, groupNumber: 400,
          });
          await db.insert(tournamentStandings).values({ categoryId: catId, teamId: top2[0], groupNumber: 400, subGroupNumber: 1 });
          await db.insert(tournamentStandings).values({ categoryId: catId, teamId: top2[1], groupNumber: 400, subGroupNumber: 1 });
          return res.json({ message: "Final generated" });
        }

        const qfMatches = allMatches.filter(m => m.round === 200);
        if (qfMatches.length > 0) {
          const unfinished = qfMatches.filter(m => m.status !== "FINISHED");
          if (unfinished.length > 0) {
            return res.status(400).json({ message: `Complete all quarter-final matches first (${unfinished.length} remaining)` });
          }
          const qfStandings = allStandings.filter(s => s.groupNumber >= 200 && s.groupNumber < 300);
          const qfGroupKeys = Array.from(new Set(qfStandings.map(s => s.groupNumber))).sort((a, b) => a - b);
          const semiQualifiers: number[] = [];
          const seenSemiIds = new Set<number>();
          for (const gNum of qfGroupKeys) {
            const gStandings = sortStandings(qfStandings.filter(s => s.groupNumber === gNum));
            if (gStandings.length > 0 && !seenSemiIds.has(gStandings[0].teamId)) {
              seenSemiIds.add(gStandings[0].teamId);
              semiQualifiers.push(gStandings[0].teamId);
            }
          }
          if (semiQualifiers.length < 2) return res.status(400).json({ message: "Not enough qualifiers for semi-finals" });
          let matchIdx = allMatches.reduce((max, m) => Math.max(max, m.matchOrder), -1) + 1;
          if (semiQualifiers.length <= 4) {
            const semiGNum = 300;
            const semiSchedule = generateRoundRobinSchedule(semiQualifiers);
            for (const [aId, bId] of semiSchedule) {
              await db.insert(tournamentMatches).values({
                categoryId: catId, teamAId: aId, teamBId: bId,
                round: 300, matchOrder: matchIdx++, groupNumber: semiGNum, subGroupNumber: 1,
              });
            }
            for (const teamId of semiQualifiers) {
              await db.insert(tournamentStandings).values({ categoryId: catId, teamId, groupNumber: semiGNum, subGroupNumber: 1 });
            }
          } else {
            const numSemiGroups = Math.max(2, Math.ceil(semiQualifiers.length / 4));
            const semiGroups: number[][] = Array.from({ length: numSemiGroups }, () => []);
            semiQualifiers.forEach((tid, i) => semiGroups[i % numSemiGroups].push(tid));
            for (let g = 0; g < semiGroups.length; g++) {
              const semiGNum = 300 + g + 1;
              const gTeams = semiGroups[g];
              const sgSchedule = generateRoundRobinSchedule(gTeams);
              for (const [aId, bId] of sgSchedule) {
                await db.insert(tournamentMatches).values({
                  categoryId: catId, teamAId: aId, teamBId: bId,
                  round: 300, matchOrder: matchIdx++, groupNumber: semiGNum, subGroupNumber: 1,
                });
              }
              for (const teamId of gTeams) {
                await db.insert(tournamentStandings).values({ categoryId: catId, teamId, groupNumber: semiGNum, subGroupNumber: 1 });
              }
            }
          }
          return res.json({ message: "Semi-finals generated", qualifiers: semiQualifiers.length });
        }

        const groupStageStandings = allStandings.filter(s => s.groupNumber < 100);
        const groupStageMatches = allMatches.filter(m => m.round === 1 && m.groupNumber && m.groupNumber < 100);
        const unfinishedGroupMatches = groupStageMatches.filter(m => m.status !== "FINISHED");
        if (unfinishedGroupMatches.length > 0) {
          return res.status(400).json({ message: `Complete all group stage matches first (${unfinishedGroupMatches.length} remaining)` });
        }

        // Always advance the top 2 pairs (by points) from each group stage group to the quarter-finals.
        const advancePerGroup = 2;
        const groupKeys = Array.from(new Set(groupStageStandings.map(s => s.groupNumber))).sort((a, b) => a - b);
        const qualifiersWithOrigin: { teamId: number; sourceGroup: number; rank: number }[] = [];
        const seenTeamIds = new Set<number>();
        for (const gNum of groupKeys) {
          const gStandings = sortStandings(groupStageStandings.filter(s => s.groupNumber === gNum));
          gStandings.slice(0, advancePerGroup).forEach((s, rank) => {
            if (!seenTeamIds.has(s.teamId)) {
              seenTeamIds.add(s.teamId);
              qualifiersWithOrigin.push({ teamId: s.teamId, sourceGroup: gNum, rank });
            }
          });
        }
        if (qualifiersWithOrigin.length < 4) return res.status(400).json({ message: "Not enough qualifiers for quarter-finals" });

        const totalQ = qualifiersWithOrigin.length;
        let numQFGroups: number;
        if (totalQ <= 4) numQFGroups = 1;
        else if (totalQ <= 8) numQFGroups = 2;
        else if (totalQ <= 12) numQFGroups = 3;
        else numQFGroups = 4;
        const targetSize = Math.ceil(totalQ / numQFGroups);

        const qfGroups: typeof qualifiersWithOrigin[] = Array.from({ length: numQFGroups }, () => []);
        const sorted = [...qualifiersWithOrigin].sort((a, b) => a.rank - b.rank);

        for (const q of sorted) {
          let bestGroup = -1;
          let bestScore = -Infinity;
          for (let g = 0; g < numQFGroups; g++) {
            if (qfGroups[g].length >= targetSize) continue;
            const hasSameSource = qfGroups[g].some(p => p.sourceGroup === q.sourceGroup);
            const sizeScore = targetSize - qfGroups[g].length;
            const sourceBonus = hasSameSource ? 0 : 10;
            const score = sizeScore + sourceBonus;
            if (score > bestScore) { bestScore = score; bestGroup = g; }
          }
          if (bestGroup === -1) {
            const smallest = qfGroups.reduce((minIdx, g, idx) =>
              g.length < qfGroups[minIdx].length ? idx : minIdx, 0);
            bestGroup = smallest;
          }
          qfGroups[bestGroup].push(q);
        }

        let matchIdx = allMatches.reduce((max, m) => Math.max(max, m.matchOrder), -1) + 1;
        for (let g = 0; g < qfGroups.length; g++) {
          const qfGNum = 200 + g + 1;
          const gTeamIds = qfGroups[g].map(q => q.teamId);
          const qfSchedule = generateRoundRobinSchedule(gTeamIds);
          for (const [aId, bId] of qfSchedule) {
            await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: aId, teamBId: bId,
              round: 200, matchOrder: matchIdx++, groupNumber: qfGNum, subGroupNumber: 1,
            });
          }
          for (const teamId of gTeamIds) {
            await db.insert(tournamentStandings).values({ categoryId: catId, teamId, groupNumber: qfGNum, subGroupNumber: 1 });
          }
        }
        return res.json({ message: "Quarter-finals generated", qualifiers: totalQ, groups: numQFGroups });
      }

      const allMatches = await db.select().from(tournamentMatches)
        .where(eq(tournamentMatches.categoryId, catId))
        .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchOrder));
      const maxRound = Math.max(...allMatches.map(m => m.round));
      const finalMatch = allMatches.find(m => m.round === maxRound);
      if (finalMatch?.winnerId) return res.json({ message: "Tournament complete" });
      res.json({ message: "Next round advanced" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/register", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const userId = req.user!.id;

      const existing = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, userId)));
      if (existing.length > 0) return res.status(400).json({ message: "Already registered" });

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      const regCount = await db.select({ count: sql<number>`count(*)::int` }).from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), ne(tournamentRegistrations.status, "REJECTED")));
      const currentCount = regCount[0]?.count || 0;

      let status: "PENDING" | "WAITLISTED" = "PENDING";
      if (tournament.maxPlayers && currentCount >= tournament.maxPlayers) {
        status = "WAITLISTED";
        const maxPos = await db.select({ maxPos: sql<number>`COALESCE(MAX(position), 0)::int` }).from(tournamentWaitlist)
          .where(eq(tournamentWaitlist.tournamentId, tournamentId));
        await db.insert(tournamentWaitlist).values({
          tournamentId, userId, position: (maxPos[0]?.maxPos || 0) + 1,
        });
      }

      // Multi-category partner flow (May 2026): registration is strictly
      // tournament-level. Partner + category selection happens later via the
      // per-category endpoints in MyCategoriesTab. Any legacy body fields are
      // intentionally ignored.
      const [reg] = await db.insert(tournamentRegistrations).values({
        tournamentId, userId, registrationType: "INDIVIDUAL",
        partnerId: null, partnerName: null,
        status, categoryId: null,
      }).returning();

      res.json(reg);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/registrations", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const regs = await db.select().from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, tournamentId))
        .orderBy(desc(tournamentRegistrations.createdAt));

      const enriched = await Promise.all(regs.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        let partner = null;
        if (reg.partnerId) {
          const [p] = await db.select({ id: users.id, fullName: users.fullName })
            .from(users).where(eq(users.id, reg.partnerId));
          partner = p;
        }
        const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        return { ...reg, user, partner, profile };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-registrations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { status, paymentConfirmed } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (paymentConfirmed !== undefined) updates.paymentConfirmed = paymentConfirmed;

      const [oldReg] = await db.select().from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.id, Number(req.params.id)));
      if (!oldReg) return res.status(404).json({ message: "Registration not found" });
      const previousStatus = oldReg.status;

      const [reg] = await db.update(tournamentRegistrations).set(updates)
        .where(eq(tournamentRegistrations.id, Number(req.params.id))).returning();

      if (previousStatus === "WAITLISTED" && (status === "APPROVED" || status === "REJECTED")) {
        await db.delete(tournamentWaitlist).where(
          and(eq(tournamentWaitlist.tournamentId, reg.tournamentId), eq(tournamentWaitlist.userId, reg.userId))
        );
      }

      if (status === "REJECTED" && previousStatus !== "WAITLISTED") {
        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, reg.tournamentId));
        if (tournament?.maxPlayers) {
          const waitlistEntries = await db.select().from(tournamentWaitlist)
            .where(and(
              eq(tournamentWaitlist.tournamentId, reg.tournamentId),
              ne(tournamentWaitlist.userId, reg.userId)
            ))
            .orderBy(asc(tournamentWaitlist.position)).limit(1);
          if (waitlistEntries.length > 0) {
            const entry = waitlistEntries[0];
            await db.update(tournamentRegistrations).set({ status: "PENDING" })
              .where(and(eq(tournamentRegistrations.tournamentId, reg.tournamentId), eq(tournamentRegistrations.userId, entry.userId)));
            await db.delete(tournamentWaitlist).where(eq(tournamentWaitlist.id, entry.id));
          }
        }
      }
      res.json(reg);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-registrations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const regId = Number(req.params.id);
      if (isNaN(regId)) return res.status(400).json({ message: "Invalid registration ID" });
      const [reg] = await db.select().from(tournamentRegistrations).where(eq(tournamentRegistrations.id, regId));
      if (!reg) return res.status(404).json({ message: "Registration not found" });
      const userId = (req.user as any).id;
      const isOwner = reg.userId === userId;
      const canManage = await isTournamentAdmin(userId, reg.tournamentId);
      if (!isOwner && !canManage) return res.status(403).json({ message: "Not authorized" });

      const removedUserId = reg.userId;
      const partnerUserId = reg.partnerId;

      const pairRequests = await db.select().from(tournamentPairRequests)
        .where(and(
          eq(tournamentPairRequests.tournamentId, reg.tournamentId),
          or(
            eq(tournamentPairRequests.fromUserId, removedUserId),
            eq(tournamentPairRequests.toUserId, removedUserId),
            ...(partnerUserId ? [eq(tournamentPairRequests.fromUserId, partnerUserId), eq(tournamentPairRequests.toUserId, partnerUserId)] : [])
          )
        ));

      if (pairRequests.length > 0) {
        const prIds = pairRequests.map(pr => pr.id);
        await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.pairRequestId!, prIds));
        await db.delete(tournamentPairRequests).where(inArray(tournamentPairRequests.id, prIds));
      }

      const profiles = await db.select().from(playerProfiles)
        .where(or(
          eq(playerProfiles.userId, removedUserId),
          ...(partnerUserId ? [eq(playerProfiles.userId, partnerUserId)] : [])
        ));
      const profileIds = profiles.map(p => p.id);

      if (profileIds.length > 0) {
        const categories = await db.select().from(tournamentCategories)
          .where(eq(tournamentCategories.tournamentId, reg.tournamentId));
        const catIds = categories.map(c => c.id);
        if (catIds.length > 0) {
          const teams = await db.select().from(tournamentTeams)
            .where(and(
              inArray(tournamentTeams.categoryId, catIds),
              or(
                inArray(tournamentTeams.player1Id, profileIds),
                inArray(tournamentTeams.player2Id!, profileIds)
              )
            ));

          if (teams.length > 0) {
            const teamIds = teams.map(t => t.id);
            await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.teamId!, teamIds));
            await db.delete(tournamentStandings).where(inArray(tournamentStandings.teamId, teamIds));
            await db.delete(tournamentMatches).where(or(
              inArray(tournamentMatches.teamAId!, teamIds),
              inArray(tournamentMatches.teamBId!, teamIds)
            ));
            await db.delete(tournamentTeams).where(inArray(tournamentTeams.id, teamIds));
          }
        }
      }

      await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.id, regId));

      if (partnerUserId) {
        await db.delete(tournamentRegistrations).where(and(
          eq(tournamentRegistrations.tournamentId, reg.tournamentId),
          or(
            eq(tournamentRegistrations.userId, partnerUserId),
            eq(tournamentRegistrations.partnerId!, partnerUserId)
          )
        ));
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Tournament Remove Registration] Error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/player-pool", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const individuals = await db.select().from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, "APPROVED"),
          or(
            eq(tournamentRegistrations.registrationType, "INDIVIDUAL"),
            and(eq(tournamentRegistrations.registrationType, "PAIR"), isNull(tournamentRegistrations.partnerId))
          ),
        ));
      const enriched = await Promise.all(individuals.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        let matchesPlayed = 0, matchesWon = 0;
        if (profile) {
          const playerTeams = await db.select().from(tournamentTeams)
            .where(or(eq(tournamentTeams.player1Id, profile.id), eq(tournamentTeams.player2Id, profile.id)));
          const teamIds = playerTeams.map(t => t.id);
          if (teamIds.length > 0) {
            const tMatches = await db.select().from(tournamentMatches)
              .where(and(
                eq(tournamentMatches.status, "FINISHED"),
                or(inArray(tournamentMatches.teamAId, teamIds), inArray(tournamentMatches.teamBId, teamIds))
              ));
            for (const m of tMatches) {
              if (m.isBye || m.isWalkover) continue;
              matchesPlayed++;
              if (m.winnerId && teamIds.includes(m.winnerId)) matchesWon++;
            }
          }
        }
        return {
          ...reg, user, profile, matchesPlayed, matchesWon,
          winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
        };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-teams/:id/assign-group", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const teamId = Number(req.params.id);
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const { groupNumber, subGroupNumber } = req.body;
      if (!groupNumber || !subGroupNumber) return res.status(400).json({ message: "groupNumber and subGroupNumber required" });
      const [updated] = await db.update(tournamentTeams)
        .set({ groupNumber, subGroupNumber })
        .where(eq(tournamentTeams.id, teamId))
        .returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });



  app.post("/api/tournaments/:id/admin-create-pair", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const { player1Id, player2Id, pairName, categoryId: rawCategoryId } = req.body;
      // Treat the field as "provided" if the caller sent anything other than undefined/null/empty.
      // When provided, it MUST be a positive integer — silently falling back to legacy mode on
      // garbage input would let bad calls bypass per-category validation.
      const categoryIdProvided = rawCategoryId !== undefined && rawCategoryId !== null && rawCategoryId !== "";
      let categoryId: number | null = null;
      if (categoryIdProvided) {
        const n = Number(rawCategoryId);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ message: "Invalid categoryId" });
        }
        categoryId = n;
      }
      if (!player1Id || !player2Id) return res.status(400).json({ message: "Two players required" });
      if (player1Id === player2Id) return res.status(400).json({ message: "Cannot pair a player with themselves" });
      const [reg1] = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, player1Id), eq(tournamentRegistrations.status, "APPROVED")));
      const [reg2] = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, player2Id), eq(tournamentRegistrations.status, "APPROVED")));
      if (!reg1 || !reg2) return res.status(400).json({ message: "Both players must be approved registrants in this tournament" });

      // Per-category mode: validate the category belongs to this tournament, is doubles,
      // satisfies gender restriction for both players, and materialise a paired team row
      // in `tournament_teams` (the new multi-category source of truth). Sibling solo rows
      // for either player in that category are collapsed inside one transaction.
      if (categoryId) {
        const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, categoryId));
        if (!cat || cat.tournamentId !== tournamentId) return res.status(400).json({ message: "Category does not belong to this tournament" });
        if ((cat as any).playersPerSide < 2) return res.status(400).json({ message: "Singles categories don't need a pair." });
        const [u1] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, player1Id));
        const [u2] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, player2Id));
        if (!genderAllowedForCategory((cat as any).genderRestriction, u1?.gender)) {
          return res.status(400).json({ message: "Player 1's gender does not match this category's restriction." });
        }
        if (!genderAllowedForCategory((cat as any).genderRestriction, u2?.gender)) {
          return res.status(400).json({ message: "Player 2's gender does not match this category's restriction." });
        }
        const [prof1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, player1Id));
        const [prof2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, player2Id));
        if (!prof1 || !prof2) return res.status(400).json({ message: "Both players must have a player profile." });
        try {
          await db.transaction(async (tx: any) => {
            // Dissolve sibling pair-requests in this category for either user.
            await tx.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
              eq(tournamentPairRequests.tournamentId, tournamentId),
              eq(tournamentPairRequests.categoryId, categoryId),
              eq(tournamentPairRequests.status, "PENDING"),
              or(
                eq(tournamentPairRequests.fromUserId, player1Id),
                eq(tournamentPairRequests.toUserId, player1Id),
                eq(tournamentPairRequests.fromUserId, player2Id),
                eq(tournamentPairRequests.toUserId, player2Id),
              ),
            ));
            // Collapse existing solo/partial team rows for these players in this category.
            const existing = await tx.select().from(tournamentTeams).where(and(
              eq(tournamentTeams.categoryId, categoryId),
              or(
                eq(tournamentTeams.player1Id, prof1.id),
                eq(tournamentTeams.player2Id, prof1.id),
                eq(tournamentTeams.player1Id, prof2.id),
                eq(tournamentTeams.player2Id, prof2.id),
              ),
            ));
            let p1FeeSnapshot: number | null = null;
            let p2FeeSnapshot: number | null = null;
            let p1PayStatus: "UNPAID" | "PENDING" | "PAID" = "UNPAID";
            let p2PayStatus: "UNPAID" | "PENDING" | "PAID" = "UNPAID";
            let p1PaidAt: Date | null = null;
            let p2PaidAt: Date | null = null;
            for (const team of existing) {
              if (team.player2Id !== null) {
                throw Object.assign(new Error("One of these players is already paired with someone else in this category. Unpair them first."), { httpStatus: 409 });
              }
              if (team.player1Id === prof1.id) {
                if (team.player1EntryFeePence != null) p1FeeSnapshot = team.player1EntryFeePence;
                if (team.player1PaymentStatus) p1PayStatus = team.player1PaymentStatus;
                if (team.player1PaidAt) p1PaidAt = team.player1PaidAt;
              }
              if (team.player1Id === prof2.id) {
                if (team.player1EntryFeePence != null) p2FeeSnapshot = team.player1EntryFeePence;
                if (team.player1PaymentStatus) p2PayStatus = team.player1PaymentStatus;
                if (team.player1PaidAt) p2PaidAt = team.player1PaidAt;
              }
              await tx.delete(tournamentStandings).where(eq(tournamentStandings.teamId, team.id));
              await tx.delete(tournamentMatches).where(or(eq(tournamentMatches.teamAId, team.id), eq(tournamentMatches.teamBId, team.id)));
              await tx.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.teamId, team.id));
              await tx.delete(tournamentTeams).where(eq(tournamentTeams.id, team.id));
            }
            if (p1FeeSnapshot == null) {
              const base1 = await resolveCategoryFeePence(categoryId, player1Id, tx);
              const count1 = await countExistingCategoryEntries(prof1.id, tournamentId, categoryId, tx);
              p1FeeSnapshot = applyMultiCategoryDiscount(base1, count1);
            }
            if (p2FeeSnapshot == null) {
              const base2 = await resolveCategoryFeePence(categoryId, player2Id, tx);
              const count2 = await countExistingCategoryEntries(prof2.id, tournamentId, categoryId, tx);
              p2FeeSnapshot = applyMultiCategoryDiscount(base2, count2);
            }
            try {
              await tx.insert(tournamentTeams).values({
                categoryId,
                player1Id: prof1.id,
                player2Id: prof2.id,
                player1EntryFeePence: p1FeeSnapshot,
                player2EntryFeePence: p2FeeSnapshot,
                player1PaymentStatus: p1PayStatus,
                player2PaymentStatus: p2PayStatus,
                player1PaidAt: p1PaidAt,
                player2PaidAt: p2PaidAt,
              });
            } catch (e: any) {
              if (/unique|duplicate/i.test(e?.message || "")) {
                throw Object.assign(new Error("One of these players is already paired in this category. Refresh and try again."), { httpStatus: 409 });
              }
              throw e;
            }
            // Record an audit pair-request row so the action shows in pair-request history.
            await tx.insert(tournamentPairRequests).values({
              tournamentId,
              categoryId,
              fromUserId: player1Id,
              toUserId: player2Id,
              status: "ACCEPTED",
              message: `Paired by admin`,
              pairName: pairName || null,
            });
          });
        } catch (e: any) {
          if (e?.httpStatus) return res.status(e.httpStatus).json({ message: e.message });
          throw e;
        }
        return res.json({ ok: true, categoryId, player1Id, player2Id });
      }

      // Legacy tournament-wide mode (no categoryId). Kept for back-compat.
      // Invalidate any prior ACCEPTED pair_requests involving either player so we never end up
      // with the same player tied to multiple "active" pairs.
      await db.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
        eq(tournamentPairRequests.tournamentId, tournamentId),
        eq(tournamentPairRequests.status, "ACCEPTED"),
        or(
          eq(tournamentPairRequests.fromUserId, player1Id),
          eq(tournamentPairRequests.toUserId, player1Id),
          eq(tournamentPairRequests.fromUserId, player2Id),
          eq(tournamentPairRequests.toUserId, player2Id),
        ),
      ));
      const [pr] = await db.insert(tournamentPairRequests).values({
        tournamentId,
        fromUserId: player1Id,
        toUserId: player2Id,
        status: "ACCEPTED",
        message: `Paired by admin`,
        pairName: pairName || null,
      }).returning();
      await db.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: player2Id })
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, player1Id)));
      await db.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: player1Id })
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, player2Id)));
      const enriched = {
        ...pr,
        fromUser: (await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, player1Id)))[0],
        toUser: (await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, player2Id)))[0],
      };
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/pair-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const { toUserId, message: pairMessage, pairName, categoryId: rawCategoryId } = req.body;
      const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

      // If a category is supplied, validate it belongs to this tournament and the
      // player isn't already partnered (in a team) for that category.
      if (categoryId) {
        const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, categoryId));
        if (!cat || cat.tournamentId !== tournamentId) return res.status(400).json({ message: "Category does not belong to this tournament" });
        if (cat.playersPerSide < 2) return res.status(400).json({ message: "Singles categories don't need a partner — use Join instead." });
        // Gender-restriction guard for BOTH players (server-side, so a direct
        // API call can't slip an ineligible user into a restricted category).
        const [meUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, req.user!.id));
        const [themUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, Number(toUserId)));
        if (!genderAllowedForCategory((cat as any).genderRestriction, meUser?.gender)) {
          return res.status(403).json({ message: "Your gender does not match this category's restriction." });
        }
        if (!genderAllowedForCategory((cat as any).genderRestriction, themUser?.gender)) {
          return res.status(400).json({ message: "That player's gender does not match this category's restriction." });
        }
        const [myProfile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, req.user!.id));
        const [theirProfile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, Number(toUserId)));
        if (myProfile) {
          const myTeams = await db.select().from(tournamentTeams)
            .where(and(
              eq(tournamentTeams.categoryId, categoryId),
              or(eq(tournamentTeams.player1Id, myProfile.id), eq(tournamentTeams.player2Id, myProfile.id))
            ));
          // Only block when I'm already in a *complete* team (i.e. has a partner).
          if (myTeams.some(t => t.player1Id && t.player2Id)) {
            return res.status(400).json({ message: "You already have a partner in this category. Leave the team first." });
          }
        }
        if (theirProfile) {
          const theirTeams = await db.select().from(tournamentTeams)
            .where(and(
              eq(tournamentTeams.categoryId, categoryId),
              or(eq(tournamentTeams.player1Id, theirProfile.id), eq(tournamentTeams.player2Id, theirProfile.id))
            ));
          if (theirTeams.some(t => t.player1Id && t.player2Id)) {
            return res.status(400).json({ message: "That player already has a partner in this category." });
          }
        }
      }

      // Both players must be registered for this tournament before a pair-request can be created.
      const meReg = await db.select().from(tournamentRegistrations).where(and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.userId, req.user!.id),
      ));
      if (meReg.length === 0) return res.status(400).json({ message: "Register for the tournament first" });
      const themReg = await db.select().from(tournamentRegistrations).where(and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.userId, Number(toUserId)),
      ));
      if (themReg.length === 0) return res.status(400).json({ message: "That player isn't registered for this tournament" });

      // Dedupe pending requests in *either direction* for the same (pair, category) so the
      // same two players can't generate competing PENDING invites.
      const existing = await db.select().from(tournamentPairRequests)
        .where(and(
          eq(tournamentPairRequests.tournamentId, tournamentId),
          eq(tournamentPairRequests.status, "PENDING"),
          or(
            and(eq(tournamentPairRequests.fromUserId, req.user!.id), eq(tournamentPairRequests.toUserId, Number(toUserId))),
            and(eq(tournamentPairRequests.fromUserId, Number(toUserId)), eq(tournamentPairRequests.toUserId, req.user!.id)),
          ),
          categoryId ? eq(tournamentPairRequests.categoryId, categoryId) : isNull(tournamentPairRequests.categoryId),
        ));
      if (existing.length > 0) return res.status(400).json({ message: "A pair request between you two is already pending for this category" });

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      const tournamentName = tournament?.name || "a tournament";

      const [pr] = await db.insert(tournamentPairRequests).values({
        tournamentId, fromUserId: req.user!.id, toUserId, message: pairMessage, pairName: pairName || null, categoryId,
      }).returning();

      await db.insert(notifications).values({
        userId: toUserId, type: "tournament_pair_request",
        title: "🏸 Pair Request Received",
        message: `${req.user!.fullName} wants to pair up with you for "${tournamentName}"!${pairName ? ` Team name: "${pairName}"` : ""}${pairMessage ? ` Message: "${pairMessage}"` : ""}`,
        linkUrl: `/tournaments/${tournamentId}`,
      });

      await db.insert(internalMessages).values({
        senderId: req.user!.id,
        recipientId: toUserId,
        subject: `Pair Request for ${tournamentName}`,
        body: `Hi! I'd like to pair up with you for the tournament "${tournamentName}".${pairMessage ? `\n\n"${pairMessage}"` : ""}\n\nYou can accept or decline this request on the tournament page.`,
        clubId: tournament?.clubId || null,
        messageCategory: "GENERAL",
      });

      res.json(pr);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Unified inbox: all PENDING pair requests the current user has received
  // across every tournament they're involved in. Grouped by tournament →
  // category on the client. Cheap-to-poll (single user filter + small joins).
  app.get("/api/me/pair-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const prs = await db.select().from(tournamentPairRequests).where(and(
        eq(tournamentPairRequests.toUserId, userId),
        eq(tournamentPairRequests.status, "PENDING"),
      )).orderBy(desc(tournamentPairRequests.createdAt));
      if (prs.length === 0) return res.json([]);

      const fromUserIds = [...new Set(prs.map(pr => pr.fromUserId))];
      const tournamentIds = [...new Set(prs.map(pr => pr.tournamentId))];
      const categoryIds = [...new Set(prs.map(pr => pr.categoryId).filter(Boolean) as number[])];

      const [fromUsers, ts, cats] = await Promise.all([
        db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, fromUserIds)),
        db.select({ id: tournaments.id, name: tournaments.name }).from(tournaments).where(inArray(tournaments.id, tournamentIds)),
        categoryIds.length > 0
          ? db.select({ id: tournamentCategories.id, name: tournamentCategories.name }).from(tournamentCategories).where(inArray(tournamentCategories.id, categoryIds))
          : Promise.resolve([]),
      ]);
      const uMap = new Map(fromUsers.map(u => [u.id, u]));
      const tMap = new Map(ts.map(t => [t.id, t]));
      const cMap = new Map(cats.map(c => [c.id, c]));

      const enriched = prs.map(pr => ({
        id: pr.id,
        tournamentId: pr.tournamentId,
        tournamentName: tMap.get(pr.tournamentId)?.name || null,
        categoryId: pr.categoryId,
        categoryName: pr.categoryId ? (cMap.get(pr.categoryId)?.name || null) : null,
        fromUserId: pr.fromUserId,
        fromUserName: uMap.get(pr.fromUserId)?.fullName || "Unknown",
        message: (pr as any).message ?? null,
        createdAt: pr.createdAt,
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/pair-requests", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const prs = await db.select().from(tournamentPairRequests)
        .where(eq(tournamentPairRequests.tournamentId, tournamentId));
      const enriched = await Promise.all(prs.map(async (pr) => {
        const [fromUser] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, pr.fromUserId));
        const [toUser] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, pr.toUserId));
        return { ...pr, fromUser, toUser };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-pair-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { status } = req.body;
      const prId = Number(req.params.id);
      const userId = (req.user as any).id;
      // Load the request first so we can authorize the action against it.
      const [existingPr] = await db.select().from(tournamentPairRequests).where(eq(tournamentPairRequests.id, prId));
      if (!existingPr) return res.status(404).json({ message: "Pair request not found" });
      if (existingPr.status !== "PENDING") return res.status(400).json({ message: `Pair request is already ${existingPr.status}` });

      // Authorization:
      //  • Recipient (toUserId) may ACCEPT or DECLINE.
      //  • Sender (fromUserId) may cancel by transitioning to DECLINED/DISSOLVED.
      //  • Tournament admins may force any transition.
      // Status allowlist — applied uniformly (including admins) so callers can
      // never push the request into an unsupported state.
      if (status !== "ACCEPTED" && status !== "DECLINED" && status !== "DISSOLVED") {
        return res.status(400).json({ message: "Invalid status" });
      }
      const isAdmin = await isTournamentAdmin(userId, existingPr.tournamentId);
      const isRecipient = userId === existingPr.toUserId;
      const isSender = userId === existingPr.fromUserId;
      if (!isAdmin) {
        if (status === "ACCEPTED" && !isRecipient) return res.status(403).json({ message: "Only the recipient can accept this request" });
        if ((status === "DECLINED" || status === "DISSOLVED") && !isRecipient && !isSender) return res.status(403).json({ message: "Not authorized" });
      }

      // Re-check gender restriction at accept-time too — the category's rule
      // could have been tightened after the invite was sent, and we shouldn't
      // materialise an ineligible team.
      if (status === "ACCEPTED" && existingPr.categoryId) {
        const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, existingPr.categoryId));
        if (cat) {
          const [fromUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, existingPr.fromUserId));
          const [toUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, existingPr.toUserId));
          if (!genderAllowedForCategory((cat as any).genderRestriction, fromUser?.gender) ||
              !genderAllowedForCategory((cat as any).genderRestriction, toUser?.gender)) {
            return res.status(403).json({ message: "One of the players no longer meets this category's gender restriction." });
          }
        }
      }

      // All state mutations run inside one transaction so the status change,
      // sibling-request dissolution, and team materialisation are atomic and
      // protected by row-level locks. Re-checks the PENDING status after the
      // FOR UPDATE so a concurrent LEAVE can't dissolve under us.
      const [t] = await db.select().from(tournaments).where(eq(tournaments.id, existingPr.tournamentId));
      let pr: typeof existingPr;
      try {
        pr = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT id FROM tournament_pair_requests WHERE id = ${prId} FOR UPDATE`);
          const [latest] = await tx.select().from(tournamentPairRequests).where(eq(tournamentPairRequests.id, prId));
          if (latest.status !== "PENDING") {
            throw Object.assign(new Error(`Pair request is already ${latest.status}`), { httpStatus: 409 });
          }
          const [updated] = await tx.update(tournamentPairRequests).set({ status })
            .where(eq(tournamentPairRequests.id, prId)).returning();

          if (status === "ACCEPTED") {
            // Per-category accept: dissolve only colliding ACCEPTED requests in the same category.
            if (updated.categoryId) {
              await tx.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
                eq(tournamentPairRequests.tournamentId, updated.tournamentId),
                eq(tournamentPairRequests.categoryId, updated.categoryId),
                eq(tournamentPairRequests.status, "ACCEPTED"),
                or(
                  eq(tournamentPairRequests.fromUserId, updated.fromUserId),
                  eq(tournamentPairRequests.toUserId, updated.fromUserId),
                  eq(tournamentPairRequests.fromUserId, updated.toUserId),
                  eq(tournamentPairRequests.toUserId, updated.toUserId),
                ),
                ne(tournamentPairRequests.id, updated.id),
              ));
            } else {
              // Legacy tournament-wide pair (categoryId NULL): preserve old behaviour and mutate registrations.
              await tx.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
                eq(tournamentPairRequests.tournamentId, updated.tournamentId),
                isNull(tournamentPairRequests.categoryId),
                eq(tournamentPairRequests.status, "ACCEPTED"),
                or(
                  eq(tournamentPairRequests.fromUserId, updated.fromUserId),
                  eq(tournamentPairRequests.toUserId, updated.fromUserId),
                  eq(tournamentPairRequests.fromUserId, updated.toUserId),
                  eq(tournamentPairRequests.toUserId, updated.toUserId),
                ),
                ne(tournamentPairRequests.id, updated.id),
              ));
              await tx.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: updated.toUserId })
                .where(and(eq(tournamentRegistrations.tournamentId, updated.tournamentId), eq(tournamentRegistrations.userId, updated.fromUserId)));
              await tx.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: updated.fromUserId })
                .where(and(eq(tournamentRegistrations.tournamentId, updated.tournamentId), eq(tournamentRegistrations.userId, updated.toUserId)));
            }

            // Materialise the paired team in this category.
            if (updated.categoryId) {
              async function ensureProfileTx(uid: number): Promise<number | null> {
                const [existing] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, uid));
                if (existing) return existing.id;
                if (!t?.clubId) return null;
                try {
                  const [created] = await tx.insert(playerProfiles).values({ userId: uid, clubId: t.clubId }).returning();
                  return created.id;
                } catch { return null; }
              }
              const p1 = await ensureProfileTx(updated.fromUserId);
              const p2 = await ensureProfileTx(updated.toUserId);
              if (p1 && p2) {
                // Advisory locks (sorted to avoid deadlock with concurrent
                // join-solo for either player) serialise fee-snapshot decisions
                // across all join/accept paths for these two players in this
                // tournament.
                const [lockA, lockB] = p1 < p2 ? [p1, p2] : [p2, p1];
                await tx.execute(sql`SELECT pg_advisory_xact_lock(${t.id}, ${lockA})`);
                await tx.execute(sql`SELECT pg_advisory_xact_lock(${t.id}, ${lockB})`);
                const myTeams = await tx.select().from(tournamentTeams)
                  .where(and(
                    eq(tournamentTeams.categoryId, updated.categoryId!),
                    or(
                      eq(tournamentTeams.player1Id, p1),
                      eq(tournamentTeams.player1Id, p2),
                      eq(tournamentTeams.player2Id, p1),
                      eq(tournamentTeams.player2Id, p2),
                    )
                  ));
                const alreadyPaired = myTeams.find(t => t.player2Id !== null && (
                  (t.player1Id === p1 && t.player2Id === p2) ||
                  (t.player1Id === p2 && t.player2Id === p1)
                ));
                if (!alreadyPaired) {
                  // Preserve any prior solo-join fee + payment snapshots so a
                  // player who already joined-solo (and possibly already paid)
                  // and is now pairing up isn't re-priced or re-marked unpaid
                  // when their solo row is collapsed into the paired team.
                  let p1FeeSnapshot: number | null = null;
                  let p2FeeSnapshot: number | null = null;
                  let p1PayStatus: "UNPAID" | "PENDING" | "PAID" = "UNPAID";
                  let p2PayStatus: "UNPAID" | "PENDING" | "PAID" = "UNPAID";
                  let p1PaidAt: Date | null = null;
                  let p2PaidAt: Date | null = null;
                  for (const team of myTeams) {
                    if (team.player2Id !== null) continue;
                    if (team.player1Id === p1) {
                      if (team.player1EntryFeePence != null) p1FeeSnapshot = team.player1EntryFeePence;
                      if (team.player1PaymentStatus) p1PayStatus = team.player1PaymentStatus;
                      if (team.player1PaidAt) p1PaidAt = team.player1PaidAt;
                    }
                    if (team.player1Id === p2) {
                      if (team.player1EntryFeePence != null) p2FeeSnapshot = team.player1EntryFeePence;
                      if (team.player1PaymentStatus) p2PayStatus = team.player1PaymentStatus;
                      if (team.player1PaidAt) p2PaidAt = team.player1PaidAt;
                    }
                    await tx.delete(tournamentStandings).where(eq(tournamentStandings.teamId, team.id));
                    await tx.delete(tournamentMatches).where(or(eq(tournamentMatches.teamAId, team.id), eq(tournamentMatches.teamBId, team.id)));
                    await tx.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.teamId, team.id));
                    await tx.delete(tournamentTeams).where(eq(tournamentTeams.id, team.id));
                  }
                  if (p1FeeSnapshot == null) {
                    const base1 = await resolveCategoryFeePence(updated.categoryId!, updated.fromUserId, tx);
                    const count1 = await countExistingCategoryEntries(p1, t.id, updated.categoryId!, tx);
                    p1FeeSnapshot = applyMultiCategoryDiscount(base1, count1);
                  }
                  if (p2FeeSnapshot == null) {
                    const base2 = await resolveCategoryFeePence(updated.categoryId!, updated.toUserId, tx);
                    const count2 = await countExistingCategoryEntries(p2, t.id, updated.categoryId!, tx);
                    p2FeeSnapshot = applyMultiCategoryDiscount(base2, count2);
                  }
                  try {
                    await tx.insert(tournamentTeams).values({
                      categoryId: updated.categoryId!,
                      player1Id: p1,
                      player2Id: p2,
                      player1EntryFeePence: p1FeeSnapshot,
                      player2EntryFeePence: p2FeeSnapshot,
                      player1PaymentStatus: p1PayStatus,
                      player2PaymentStatus: p2PayStatus,
                      player1PaidAt: p1PaidAt,
                      player2PaidAt: p2PaidAt,
                    });
                  } catch (e: any) {
                    // Unique-index violation → another player paired with one of these two
                    // first. Roll back the whole accept and surface a 409 to the client so
                    // they see a clear "already paired" message instead of a silent success.
                    if (/unique|duplicate/i.test(e?.message || "")) {
                      throw Object.assign(new Error("One of you is already paired in this category. Refresh and try again."), { httpStatus: 409 });
                    }
                    throw e;
                  }
                }
              }
            }
          }
          return updated;
        });
      } catch (e: any) {
        if (e?.httpStatus) return res.status(e.httpStatus).json({ message: e.message });
        throw e;
      }

      if (status === "ACCEPTED") {
        // Side-effects only: status change, sibling-dissolution, and team
        // materialisation already ran atomically inside the transaction above.
        const tournament = t;
        const tournamentName = tournament?.name || "a tournament";
        const accepterName = req.user!.fullName || "Your partner";

        await db.insert(notifications).values({
          userId: pr.fromUserId, type: "tournament_pair_accepted",
          title: "🎉 Pair Request Accepted!",
          message: `${accepterName} accepted your pair request for "${tournamentName}"! You're now partnered up.`,
          linkUrl: `/tournaments/${pr.tournamentId}`,
        });

        await db.insert(internalMessages).values({
          senderId: pr.toUserId,
          recipientId: pr.fromUserId,
          subject: `Pair Confirmed for ${tournamentName}`,
          body: `Great news! I've accepted your pair request for "${tournamentName}". We're now partnered up. Let's do this! 💪`,
          clubId: tournament?.clubId || null,
          messageCategory: "GENERAL",
        });
      }

      if (status === "DECLINED") {
        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, pr.tournamentId));
        const tournamentName = tournament?.name || "a tournament";

        await db.insert(notifications).values({
          userId: pr.fromUserId, type: "tournament_pair_declined",
          title: "Pair Request Declined",
          message: `Your pair request for "${tournamentName}" was declined. You can try pairing with someone else.`,
          linkUrl: `/tournaments/${pr.tournamentId}`,
        });
      }
      res.json(pr);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-category participation (May 2026): a player registers once for the
  // tournament, then joins individual categories with a different partner per
  // category. Each category entry is materialised as a `tournament_teams` row
  // (player2Id NULL for solo/singles or "looking for partner" placeholders).
  // ─────────────────────────────────────────────────────────────────────────
  // Resolve the entry fee a player owes for a category at this point in time,
  // in pence. Used to snapshot fees onto tournament_teams rows so admin edits
  // to category fees later do not retroactively change what existing entrants
  // owe. Returns 0 if everything is free, NULL semantics not used.
  async function resolveCategoryFeePence(
    categoryId: number,
    userId: number,
    txn?: any,
  ): Promise<number> {
    const exec = txn || db;
    const [cat] = await exec.select().from(tournamentCategories).where(eq(tournamentCategories.id, categoryId));
    if (!cat) return 0;
    const [tour] = await exec.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
    if (!tour) return 0;
    const tournamentInternal = parseFloat((tour as any).entryFee || "0") || 0;
    const tournamentExternal = parseFloat((tour as any).externalEntryFee || (tour as any).entryFee || "0") || 0;
    const hasOwnInternal = (cat as any).entryFee != null && (cat as any).entryFee !== "";
    const hasOwnExternal = (cat as any).externalEntryFee != null && (cat as any).externalEntryFee !== "";
    const internal = hasOwnInternal ? parseFloat((cat as any).entryFee) : tournamentInternal;
    const external = hasOwnExternal
      ? parseFloat((cat as any).externalEntryFee)
      : (hasOwnInternal ? parseFloat((cat as any).entryFee) : tournamentExternal);
    let isMember = false;
    if ((tour as any).clubId) {
      const [m] = await exec.select({ id: playerProfiles.id }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, userId), eq(playerProfiles.clubId, (tour as any).clubId)));
      isMember = !!m;
    }
    const fee = isMember ? internal : external;
    return Math.round((Number.isFinite(fee) ? fee : 0) * 100);
  }

  // Multi-category discount (May 2026): a player pays the full fee for their
  // FIRST category in a tournament, then every additional category is
  // discounted 50%. The discount is applied at join time and snapshotted onto
  // the team row, so later leaves/joins do not retroactively re-price.
  // Returns the number of existing team rows the player already has across the
  // tournament (excluding the category they're about to join, since we're
  // about to insert/replace it).
  async function countExistingCategoryEntries(
    profileId: number,
    tournamentId: number,
    excludeCategoryId: number,
    txn?: any,
  ): Promise<number> {
    const exec = txn || db;
    const rows = await exec
      .select({ id: tournamentTeams.id })
      .from(tournamentTeams)
      .innerJoin(tournamentCategories, eq(tournamentCategories.id, tournamentTeams.categoryId))
      .where(and(
        eq(tournamentCategories.tournamentId, tournamentId),
        sql`${tournamentTeams.categoryId} <> ${excludeCategoryId}`,
        or(eq(tournamentTeams.player1Id, profileId), eq(tournamentTeams.player2Id, profileId)),
      ));
    return rows.length;
  }

  function applyMultiCategoryDiscount(feePence: number, existingCount: number): number {
    if (existingCount <= 0) return feePence;
    return Math.round(feePence * 0.5);
  }

  async function ensureProfileForUser(userId: number, tournamentId: number): Promise<number | null> {
    const [existing] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
    if (existing) return existing.id;
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
    if (!t?.clubId) return null;
    try {
      const [created] = await db.insert(playerProfiles).values({ userId, clubId: t.clubId }).returning();
      return created.id;
    } catch { return null; }
  }

  app.post("/api/tournament-categories/:id/join-solo", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const userId = (req.user as any).id;
      // Gender-restriction guard: prevent direct API calls from bypassing the
      // UI's eligibility filter (e.g. a male user POSTing to a FEMALE_ONLY cat).
      const [meUser] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId));
      if (!genderAllowedForCategory((cat as any).genderRestriction, meUser?.gender)) {
        return res.status(403).json({ message: "Your gender does not match this category's restriction." });
      }
      const [myReg] = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, cat.tournamentId), eq(tournamentRegistrations.userId, userId)));
      if (!myReg) return res.status(400).json({ message: "Register for the tournament first" });
      const profileId = await ensureProfileForUser(userId, cat.tournamentId);
      if (!profileId) return res.status(400).json({ message: "Could not create your player profile (tournament has no club)" });
      // Wrap join in a transaction with a per-(tournament,profile) advisory
      // lock so concurrent joins across categories by the same player can't
      // both read existingCount=0 and both charge full fee. Also catches the
      // unique-index race (same player POSTing twice to the same category)
      // and returns the existing row idempotently instead of a 500.
      const team = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${cat.tournamentId}, ${profileId})`);
        const mine = await tx.select().from(tournamentTeams)
          .where(and(
            eq(tournamentTeams.categoryId, catId),
            or(eq(tournamentTeams.player1Id, profileId), eq(tournamentTeams.player2Id, profileId)),
          ));
        if (mine.length > 0) return mine[0];
        // Multi-category discount: full fee for the first category, 50% off
        // for every additional category. Snapshot at join time so later
        // admin fee edits do NOT retroactively change what this entrant owes.
        const baseFeePence = await resolveCategoryFeePence(catId, userId, tx);
        const existingCount = await countExistingCategoryEntries(profileId, cat.tournamentId, catId, tx);
        const feePence = applyMultiCategoryDiscount(baseFeePence, existingCount);
        try {
          const [inserted] = await tx.insert(tournamentTeams).values({
            categoryId: catId,
            player1Id: profileId,
            player1EntryFeePence: feePence,
          }).returning();
          return inserted;
        } catch (e: any) {
          if (/unique|duplicate/i.test(e?.message || "")) {
            const [existing] = await tx.select().from(tournamentTeams)
              .where(and(
                eq(tournamentTeams.categoryId, catId),
                or(eq(tournamentTeams.player1Id, profileId), eq(tournamentTeams.player2Id, profileId)),
              ));
            if (existing) return existing;
          }
          throw e;
        }
      });
      res.json(team);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-categories/:id/leave", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const userId = (req.user as any).id;
      // Validate category exists (so destructive deletes can't be aimed at junk IDs).
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
      if (!profile) return res.status(404).json({ message: "No player profile" });
      // Lifecycle guard: once matches exist in this category, leaving would orphan
      // brackets/standings. Block the leave and tell the player to contact the admin.
      const matchCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      if ((matchCount[0]?.count || 0) > 0) {
        return res.status(409).json({ message: "Matches have already been generated for this category — ask an admin to withdraw you." });
      }
      // Wrap leave in a transaction so the team delete and pair-request dissolution
      // are atomic against concurrent accept/join calls.
      const removed = await db.transaction(async (tx) => {
        const mine = await tx.select().from(tournamentTeams)
          .where(and(
            eq(tournamentTeams.categoryId, catId),
            or(eq(tournamentTeams.player1Id, profile.id), eq(tournamentTeams.player2Id, profile.id)),
          ));
        for (const team of mine) {
          await tx.execute(sql`SELECT id FROM tournament_teams WHERE id = ${team.id} FOR UPDATE`);
          // If team was a paired team and the leaver was only one of the two
          // players, demote the team to a solo entry for the remaining partner
          // (so they keep their category slot and can find a new partner).
          // Only fully wipe the team when the leaver was the sole occupant.
          const remainingProfileId =
            team.player2Id != null
              ? (team.player1Id === profile.id ? team.player2Id : (team.player2Id === profile.id ? team.player1Id : null))
              : null;
          if (remainingProfileId != null) {
            // Remove any group-pair link tied to the now-solo team (groups are
            // for paired matchups). Keep the team row itself, but demote it.
            // Preserve the remaining player's original fee + payment snapshots
            // so admin edits between join and leave don't retroactively
            // re-price or reset what they've already paid.
            const remainingIsP1 = team.player1Id === remainingProfileId;
            const remainingFeeSnapshot = remainingIsP1 ? team.player1EntryFeePence : team.player2EntryFeePence;
            const remainingPayStatus = (remainingIsP1 ? team.player1PaymentStatus : team.player2PaymentStatus) || "UNPAID";
            const remainingPaidAt = remainingIsP1 ? team.player1PaidAt : team.player2PaidAt;
            await tx.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.teamId, team.id));
            await tx.update(tournamentTeams)
              .set({
                player1Id: remainingProfileId,
                player2Id: null,
                player1EntryFeePence: remainingFeeSnapshot ?? null,
                player2EntryFeePence: null,
                player1PaymentStatus: remainingPayStatus,
                player2PaymentStatus: null,
                player1PaidAt: remainingPaidAt ?? null,
                player2PaidAt: null,
              })
              .where(eq(tournamentTeams.id, team.id));
          } else {
            await tx.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.teamId, team.id));
            await tx.delete(tournamentTeams).where(eq(tournamentTeams.id, team.id));
          }
        }
        // Also dissolve any ACCEPTED per-category pair requests so the partner is freed up.
        await tx.update(tournamentPairRequests).set({ status: "DISSOLVED" })
          .where(and(
            eq(tournamentPairRequests.categoryId, catId),
            eq(tournamentPairRequests.status, "ACCEPTED"),
            or(eq(tournamentPairRequests.fromUserId, userId), eq(tournamentPairRequests.toUserId, userId)),
          ));
        return mine.length;
      });
      res.json({ success: true, removed });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Per-category payment (May 2026): players pay their fee one category at
  // a time instead of one lump sum on the tournament registration. Each
  // tournament_teams row has independent paymentStatus per slot (player1 /
  // player2). Players confirm their own slot; admins can set any slot.
  // ───────────────────────────────────────────────────────────────────────
  app.post("/api/tournament-teams/:teamId/confirm-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const teamId = Number(req.params.teamId);
      const userId = (req.user as any).id;
      const { paymentMethod } = req.body || {};
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
      if (!profile) return res.status(404).json({ message: "No player profile" });
      const isP1 = team.player1Id === profile.id;
      const isP2 = team.player2Id === profile.id;
      if (!isP1 && !isP2) return res.status(403).json({ message: "You are not on this team" });
      const currentStatus = isP1 ? team.player1PaymentStatus : team.player2PaymentStatus;
      if (currentStatus === "PAID") return res.status(400).json({ message: "Already marked paid" });
      const patch: any = isP1
        ? { player1PaymentStatus: "PENDING" as const }
        : { player2PaymentStatus: "PENDING" as const };
      const [updated] = await db.update(tournamentTeams).set(patch)
        .where(eq(tournamentTeams.id, teamId)).returning();

      // Notify tournament admins (mirrors the tournament-level confirm flow).
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      const [tournament] = cat ? await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId)) : [null];
      const [player] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
      if (tournament) {
        const adminUsers = await db.select({ userId: tournamentAdmins.userId }).from(tournamentAdmins)
          .where(eq(tournamentAdmins.tournamentId, tournament.id));
        const adminIds = new Set<number>(adminUsers.map(a => a.userId));
        if (tournament.createdBy) adminIds.add(tournament.createdBy);
        const ownerUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "OWNER"));
        ownerUsers.forEach(u => adminIds.add(u.id));
        for (const adminId of adminIds) {
          await db.insert(notifications).values({
            userId: adminId,
            type: "GENERAL",
            title: "Category Payment Submitted",
            message: `${player?.fullName} has confirmed payment for "${cat?.name}" in "${tournament.name}". Method: ${paymentMethod || "Bank Transfer"}.`,
            linkUrl: `/tournaments/${tournament.id}`,
          });
        }
        await db.insert(notifications).values({
          userId,
          type: "GENERAL",
          title: "Payment Submitted",
          message: `Your payment for "${cat?.name}" in "${tournament.name}" has been submitted and is awaiting admin verification.`,
          linkUrl: `/tournaments/${tournament.id}`,
        });
      }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-teams/:teamId/payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const teamId = Number(req.params.teamId);
      const { slot, paymentStatus } = req.body || {};
      if (slot !== 1 && slot !== 2) return res.status(400).json({ message: "slot must be 1 or 2" });
      if (!["UNPAID", "PENDING", "PAID"].includes(paymentStatus)) return res.status(400).json({ message: "Invalid paymentStatus" });
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      if (!cat) return res.status(404).json({ message: "Category not found" });
      const isAdmin = await isTournamentAdmin((req.user as any).id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      if (slot === 2 && team.player2Id == null) return res.status(400).json({ message: "Team has no player 2" });
      const now = paymentStatus === "PAID" ? new Date() : null;
      const patch: any = slot === 1
        ? { player1PaymentStatus: paymentStatus, player1PaidAt: now }
        : { player2PaymentStatus: paymentStatus, player2PaidAt: now };
      const [updated] = await db.update(tournamentTeams).set(patch)
        .where(eq(tournamentTeams.id, teamId)).returning();

      if (paymentStatus === "PAID") {
        const targetProfileId = slot === 1 ? team.player1Id : team.player2Id;
        if (targetProfileId) {
          const [tp] = await db.select({ userId: playerProfiles.userId }).from(playerProfiles).where(eq(playerProfiles.id, targetProfileId));
          if (tp) {
            const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
            await db.insert(notifications).values({
              userId: tp.userId,
              type: "GENERAL",
              title: "Payment Confirmed",
              message: `Your payment for "${cat.name}" in "${tournament?.name}" has been confirmed. You're all set!`,
              linkUrl: `/tournaments/${cat.tournamentId}`,
            });
          }
        }
      }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/my-categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const userId = (req.user as any).id;
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, tournamentId));
      const [myProfile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
      const myTeams = myProfile ? await db.select().from(tournamentTeams)
        .where(or(eq(tournamentTeams.player1Id, myProfile.id), eq(tournamentTeams.player2Id, myProfile.id))) : [];
      const allMyPairRequests = await db.select().from(tournamentPairRequests)
        .where(and(
          eq(tournamentPairRequests.tournamentId, tournamentId),
          or(eq(tournamentPairRequests.fromUserId, userId), eq(tournamentPairRequests.toUserId, userId)),
          eq(tournamentPairRequests.status, "PENDING"),
        ));

      // Load every team for every category in this tournament so we can return
      // per-category occupant userIds — the partner picker uses this to hide
      // players whose slot is already taken.
      const catIds = cats.map(c => c.id);
      const allTeams = catIds.length
        ? await db.select().from(tournamentTeams).where(inArray(tournamentTeams.categoryId, catIds))
        : [];
      const profileIdSet = new Set<number>();
      for (const t of allTeams) {
        if (t.player1Id) profileIdSet.add(t.player1Id);
        if (t.player2Id) profileIdSet.add(t.player2Id);
      }
      const teamProfiles = profileIdSet.size
        ? await db.select({ id: playerProfiles.id, userId: playerProfiles.userId }).from(playerProfiles).where(inArray(playerProfiles.id, Array.from(profileIdSet)))
        : [];
      const profileIdToUserId = new Map<number, number>(teamProfiles.map(p => [p.id, p.userId]));

      const result: any[] = [];
      for (const cat of cats) {
        const team = myTeams.find(t => t.categoryId === cat.id);
        // Only confirmed-pair players (teams with player2Id set) are "occupied"
        // for the partner picker. Solo entrants ("looking for partner") MUST
        // still be selectable — that is the entire point of joining solo first.
        const occupantUserIds = Array.from(new Set(
          allTeams
            .filter(t => t.categoryId === cat.id && !!t.player2Id)
            .flatMap(t => [t.player1Id, t.player2Id])
            .filter((pid): pid is number => pid !== null && pid !== undefined)
            .map(pid => profileIdToUserId.get(pid))
            .filter((uid): uid is number => typeof uid === "number")
        ));
        let partner: any = null;
        if (team) {
          const partnerProfileId = team.player1Id === myProfile?.id ? team.player2Id : team.player1Id;
          if (partnerProfileId) {
            const [pp] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, partnerProfileId));
            if (pp) {
              const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, pp.userId));
              partner = u || null;
            }
          }
        }
        const pendingRequests = allMyPairRequests.filter((pr: any) => pr.categoryId === cat.id);
        const enrichedPending = await Promise.all(pendingRequests.map(async (pr: any) => {
          const otherUserId = pr.fromUserId === userId ? pr.toUserId : pr.fromUserId;
          const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, otherUserId));
          return { ...pr, direction: pr.fromUserId === userId ? "OUTGOING" : "INCOMING", otherUser: u };
        }));
        // Category-level pair-count breakdown for the My Categories cards.
        const teamsHere = allTeams.filter(t => t.categoryId === cat.id);
        const confirmedPairCount = teamsHere.filter(t => !!t.player2Id).length;
        const soloCount = teamsHere.filter(t => !t.player2Id).length;
        // Per-category caller-facing payment state. The caller's slot (player1
        // vs player2 on their team) drives the "Pay £X for [category]" button:
        // we expose both the snapshot fee owed in pence and the per-slot
        // status so the My Categories tab can render Pay / Awaiting / Paid.
        let mySlot: 1 | 2 | null = null;
        let myPaymentStatus: "UNPAID" | "PENDING" | "PAID" | null = null;
        let myFeePence: number | null = null;
        let myPaidAt: Date | null = null;
        if (team && myProfile) {
          if (team.player1Id === myProfile.id) {
            mySlot = 1;
            myPaymentStatus = team.player1PaymentStatus || "UNPAID";
            myFeePence = team.player1EntryFeePence ?? null;
            myPaidAt = team.player1PaidAt ?? null;
          } else if (team.player2Id === myProfile.id) {
            mySlot = 2;
            myPaymentStatus = team.player2PaymentStatus || "UNPAID";
            myFeePence = team.player2EntryFeePence ?? null;
            myPaidAt = team.player2PaidAt ?? null;
          }
        }
        result.push({
          category: cat,
          teamId: team?.id || null,
          isSolo: !!team && !team.player2Id,
          isPaired: !!team && !!team.player2Id,
          partner,
          pendingRequests: enrichedPending,
          mySlot,
          myPaymentStatus,
          myFeePence,
          myPaidAt,
          occupantUserIds,
          confirmedPairCount,
          soloCount,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Multi-category partner flow: returns confirmed/solo teams grouped by category
  // for the per-tournament admin view, sourced from `tournament_teams` (the new
  // model). Replaces the registration-derived /pairs read for admins who need a
  // category-aware breakdown.
  app.get("/api/tournaments/:id/teams-by-category", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Authentication required" });
    try {
      const tournamentId = Number(req.params.id);
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, tournamentId));
      const catIds = cats.map(c => c.id);
      const teams = catIds.length
        ? await db.select().from(tournamentTeams).where(inArray(tournamentTeams.categoryId, catIds))
        : [];
      const profileIds = Array.from(new Set(teams.flatMap(t => [t.player1Id, t.player2Id]).filter((x): x is number => !!x)));
      const profs = profileIds.length
        ? await db.select({
            id: playerProfiles.id,
            userId: playerProfiles.userId,
            grade: playerProfiles.grade,
            matchesPlayed: playerProfiles.matchesPlayed,
            matchesWon: playerProfiles.matchesWon,
          }).from(playerProfiles).where(inArray(playerProfiles.id, profileIds))
        : [];
      const userIds = Array.from(new Set(profs.map(p => p.userId)));
      // PII-min: only return id + fullName for member display (no email).
      const usrs = userIds.length
        ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIds))
        : [];
      const profileToUser = new Map<number, any>();
      const profileById = new Map<number, any>();
      for (const p of profs) {
        const u = usrs.find(u => u.id === p.userId);
        if (u) profileToUser.set(p.id, u);
        profileById.set(p.id, p);
      }
      const result = cats.map(cat => {
        const catTeams = teams.filter(t => t.categoryId === cat.id).map(t => ({
          id: t.id,
          player1: t.player1Id ? profileToUser.get(t.player1Id) || null : null,
          player2: t.player2Id ? profileToUser.get(t.player2Id) || null : null,
          profile1: t.player1Id ? profileById.get(t.player1Id) || null : null,
          profile2: t.player2Id ? profileById.get(t.player2Id) || null : null,
          createdAt: t.createdAt,
          isPaired: !!t.player2Id,
        }));
        return {
          category: cat,
          confirmedPairs: catTeams.filter(t => t.isPaired),
          soloEntries: catTeams.filter(t => !t.isPaired),
        };
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/pairs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const pairs = await db.select().from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.registrationType, "PAIR"),
          eq(tournamentRegistrations.status, "APPROVED"),
        ));

      const seen = new Set<string>();
      const uniquePairs: any[] = [];
      const allPairRequests = await db.select().from(tournamentPairRequests)
        .where(and(eq(tournamentPairRequests.tournamentId, tournamentId), eq(tournamentPairRequests.status, "ACCEPTED")));
      for (const reg of pairs) {
        if (!reg.partnerId) continue;
        const key = [Math.min(reg.userId, reg.partnerId), Math.max(reg.userId, reg.partnerId)].join("-");
        if (seen.has(key)) continue;
        seen.add(key);
        const [user1] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, reg.userId));
        const [user2] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, reg.partnerId));
        const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.partnerId));
        const matchingPR = allPairRequests.find(pr =>
          (pr.fromUserId === reg.userId && pr.toUserId === reg.partnerId) ||
          (pr.fromUserId === reg.partnerId && pr.toUserId === reg.userId)
        );
        uniquePairs.push({ id: reg.id, pairRequestId: matchingPR?.id || null, categoryId: matchingPR?.categoryId ?? null, user1, user2, profile1: p1, profile2: p2, pairName: matchingPR?.pairName || null, createdAt: reg.createdAt });
      }
      res.json(uniquePairs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/unpair", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const tournamentId = Number(req.params.id);
      const myRegs = await db.select().from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, userId),
          eq(tournamentRegistrations.registrationType, "PAIR"),
          eq(tournamentRegistrations.status, "APPROVED"),
        ));
      if (myRegs.length === 0) return res.status(404).json({ message: "You are not in an approved pair for this tournament" });
      const myReg = myRegs[0];
      const partnerId = myReg.partnerId;
      if (!partnerId) return res.status(400).json({ message: "No partner found" });

      await db.update(tournamentRegistrations)
        .set({ registrationType: "INDIVIDUAL", partnerId: null, partnerName: null })
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, userId),
        ));

      await db.update(tournamentRegistrations)
        .set({ registrationType: "INDIVIDUAL", partnerId: null, partnerName: null })
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, partnerId),
        ));

      // CRITICAL: also dissolve any ACCEPTED pair_requests linking these two users so
      // Reset & Rebuild won't resurrect this defunct pair.
      await db.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
        eq(tournamentPairRequests.tournamentId, tournamentId),
        eq(tournamentPairRequests.status, "ACCEPTED"),
        or(
          and(eq(tournamentPairRequests.fromUserId, userId), eq(tournamentPairRequests.toUserId, partnerId)),
          and(eq(tournamentPairRequests.fromUserId, partnerId), eq(tournamentPairRequests.toUserId, userId)),
        ),
      ));

      // Also tear down any existing team + group assignment for this pair, otherwise the
      // old team row keeps showing the dissolved pair in the Groups/Standings views forever.
      const [p1Profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
      const [p2Profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, partnerId));
      if (p1Profile && p2Profile) {
        const tournCats = await db.select({ id: tournamentCategories.id }).from(tournamentCategories)
          .where(eq(tournamentCategories.tournamentId, tournamentId));
        const catIds = tournCats.map(c => c.id);
        if (catIds.length > 0) {
          const staleTeams = await db.select().from(tournamentTeams).where(and(
            inArray(tournamentTeams.categoryId, catIds),
            or(
              and(eq(tournamentTeams.player1Id, p1Profile.id), eq(tournamentTeams.player2Id, p2Profile.id)),
              and(eq(tournamentTeams.player1Id, p2Profile.id), eq(tournamentTeams.player2Id, p1Profile.id)),
            ),
          ));
          if (staleTeams.length > 0) {
            const teamIds = staleTeams.map(t => t.id);
            await db.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.teamId, teamIds));
            await db.delete(tournamentMatches).where(or(
              inArray(tournamentMatches.teamAId, teamIds),
              inArray(tournamentMatches.teamBId, teamIds),
            ));
            await db.delete(tournamentStandings).where(inArray(tournamentStandings.teamId, teamIds));
            await db.delete(tournamentTeams).where(inArray(tournamentTeams.id, teamIds));
          }
        }
      }

      res.json({ message: "Pair has been dissolved. Both players are now registered as individuals, and removed from any groups." });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin-only dissolve of a legacy (tournament-wide) pair.
  // Mirrors POST /unpair but takes a userId in the body so an admin can free up
  // both players. Used by the "Legacy Tournament-Wide Pairs" admin panel to
  // clear out pairs created before per-category pairing existed.
  app.post("/api/tournaments/:id/admin-dissolve-pair", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const userId = Number(req.body?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "userId is required" });
      }
      // Wrap the whole teardown in a single transaction so partial failures
      // never leave a half-dissolved pair (e.g. registrations reset but stale
      // team rows still pointing to the old pair, which would break unique
      // indexes for future per-category pairing).
      await db.transaction(async (tx) => {
        const myRegs = await tx.select().from(tournamentRegistrations)
          .where(and(
            eq(tournamentRegistrations.tournamentId, tournamentId),
            eq(tournamentRegistrations.userId, userId),
            eq(tournamentRegistrations.registrationType, "PAIR"),
          ));
        if (myRegs.length === 0) {
          const err: any = new Error("Player is not in a pair for this tournament");
          err.status = 404;
          throw err;
        }
        const partnerId = myRegs[0].partnerId;
        if (!partnerId) {
          const err: any = new Error("No partner found");
          err.status = 400;
          throw err;
        }

        await tx.update(tournamentRegistrations)
          .set({ registrationType: "INDIVIDUAL", partnerId: null, partnerName: null })
          .where(and(
            eq(tournamentRegistrations.tournamentId, tournamentId),
            eq(tournamentRegistrations.userId, userId),
          ));

        await tx.update(tournamentRegistrations)
          .set({ registrationType: "INDIVIDUAL", partnerId: null, partnerName: null })
          .where(and(
            eq(tournamentRegistrations.tournamentId, tournamentId),
            eq(tournamentRegistrations.userId, partnerId),
          ));

        await tx.update(tournamentPairRequests).set({ status: "DISSOLVED" }).where(and(
          eq(tournamentPairRequests.tournamentId, tournamentId),
          eq(tournamentPairRequests.status, "ACCEPTED"),
          or(
            and(eq(tournamentPairRequests.fromUserId, userId), eq(tournamentPairRequests.toUserId, partnerId)),
            and(eq(tournamentPairRequests.fromUserId, partnerId), eq(tournamentPairRequests.toUserId, userId)),
          ),
        ));

        const [p1Profile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
        const [p2Profile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, partnerId));
        if (p1Profile && p2Profile) {
          const tournCats = await tx.select({ id: tournamentCategories.id }).from(tournamentCategories)
            .where(eq(tournamentCategories.tournamentId, tournamentId));
          const catIds = tournCats.map(c => c.id);
          if (catIds.length > 0) {
            const staleTeams = await tx.select().from(tournamentTeams).where(and(
              inArray(tournamentTeams.categoryId, catIds),
              or(
                and(eq(tournamentTeams.player1Id, p1Profile.id), eq(tournamentTeams.player2Id, p2Profile.id)),
                and(eq(tournamentTeams.player1Id, p2Profile.id), eq(tournamentTeams.player2Id, p1Profile.id)),
              ),
            ));
            if (staleTeams.length > 0) {
              const teamIds = staleTeams.map(t => t.id);
              await tx.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.teamId, teamIds));
              await tx.delete(tournamentMatches).where(or(
                inArray(tournamentMatches.teamAId, teamIds),
                inArray(tournamentMatches.teamBId, teamIds),
              ));
              await tx.delete(tournamentStandings).where(inArray(tournamentStandings.teamId, teamIds));
              await tx.delete(tournamentTeams).where(inArray(tournamentTeams.id, teamIds));
            }
          }
        }
      });

      res.json({ message: "Pair dissolved. Both players are back to individual entries and free to be paired per category." });
    } catch (e: any) {
      res.status(e?.status || 500).json({ message: e.message });
    }
  });

  app.patch("/api/tournaments/:id/pair-name", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;
      const tournamentId = Number(req.params.id);
      const { pairId, pairName } = req.body;
      if (typeof pairName !== "string") return res.status(400).json({ message: "pairName is required" });
      const trimmed = pairName.trim().slice(0, 50);

      const [reg] = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.id, pairId), eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.registrationType, "PAIR")));
      if (!reg || !reg.partnerId) return res.status(404).json({ message: "Pair not found" });

      const isMember = reg.userId === userId || reg.partnerId === userId;
      const isAdmin = userRole === "OWNER" || userRole === "ADMIN";
      let isTournamentAdmin = false;
      if (!isMember && !isAdmin) {
        const [ta] = await db.select().from(tournamentAdmins).where(and(eq(tournamentAdmins.tournamentId, tournamentId), eq(tournamentAdmins.userId, userId)));
        isTournamentAdmin = !!ta;
      }
      if (!isMember && !isAdmin && !isTournamentAdmin) return res.status(403).json({ message: "Only pair members or admins can change the team name" });

      const matchingPRs = await db.select().from(tournamentPairRequests)
        .where(and(
          eq(tournamentPairRequests.tournamentId, tournamentId),
          or(
            and(eq(tournamentPairRequests.fromUserId, reg.userId), eq(tournamentPairRequests.toUserId, reg.partnerId)),
            and(eq(tournamentPairRequests.fromUserId, reg.partnerId), eq(tournamentPairRequests.toUserId, reg.userId))
          )
        ));
      for (const pr of matchingPRs) {
        await db.update(tournamentPairRequests).set({ pairName: trimmed || null })
          .where(eq(tournamentPairRequests.id, pr.id));
      }

      res.json({ message: "Team name updated", pairName: trimmed || null });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  async function getPairComparisonData(tournamentId: number, pairId: number) {
    let user1Id: number | null = null;
    let user2Id: number | null = null;
    let profile1: any = null;
    let profile2: any = null;

    // Try category-pair lookup first (new system: pairId = tournament_teams.id).
    const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, pairId));
    if (team && team.player1Id && team.player2Id) {
      // Validate the team belongs to a category in this tournament.
      const [cat] = await db.select().from(tournamentCategories).where(and(
        eq(tournamentCategories.id, team.categoryId),
        eq(tournamentCategories.tournamentId, tournamentId),
      ));
      if (cat) {
        [profile1] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
        [profile2] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
        user1Id = profile1?.userId ?? null;
        user2Id = profile2?.userId ?? null;
      }
    }

    // Fallback: legacy registration-based pair lookup (pairId = tournamentRegistrations.id).
    if (!user1Id || !user2Id) {
      const [reg] = await db.select().from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.id, pairId),
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.registrationType, "PAIR"),
        ));
      if (!reg || !reg.partnerId) return null;
      user1Id = reg.userId;
      user2Id = reg.partnerId;
      [profile1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
      [profile2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.partnerId));
    }

    if (!user1Id || !user2Id) return null;
    const [user1] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, user1Id));
    const [user2] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, user2Id));

    async function getPlayerMatchStats(profileId: number) {
      if (!profileId) return { played: 0, won: 0, lost: 0, avgScoreFor: 0, avgScoreAgainst: 0, recentForm: [] as string[] };
      const allMatches = await db.select().from(matches)
        .where(and(
          eq(matches.isCompleted, true),
          or(
            eq(matches.teamAPlayer1Id, profileId),
            eq(matches.teamAPlayer2Id, profileId),
            eq(matches.teamBPlayer1Id, profileId),
            eq(matches.teamBPlayer2Id, profileId),
          )
        ));

      let won = 0, lost = 0, totalScoreFor = 0, totalScoreAgainst = 0;
      const recentForm: string[] = [];
      const sorted = allMatches.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
      for (const m of sorted) {
        const onTeamA = m.teamAPlayer1Id === profileId || m.teamAPlayer2Id === profileId;
        const scoreFor = onTeamA ? (m.scoreA || 0) : (m.scoreB || 0);
        const scoreAgainst = onTeamA ? (m.scoreB || 0) : (m.scoreA || 0);
        totalScoreFor += scoreFor;
        totalScoreAgainst += scoreAgainst;
        if (scoreFor > scoreAgainst) { won++; if (recentForm.length < 10) recentForm.push("W"); }
        else { lost++; if (recentForm.length < 10) recentForm.push("L"); }
      }
      const played = won + lost;
      return {
        played, won, lost,
        avgScoreFor: played > 0 ? Math.round(totalScoreFor / played * 10) / 10 : 0,
        avgScoreAgainst: played > 0 ? Math.round(totalScoreAgainst / played * 10) / 10 : 0,
        recentForm,
      };
    }

    const stats1 = await getPlayerMatchStats(profile1?.id);
    const stats2 = await getPlayerMatchStats(profile2?.id);

    let pairPlayed = 0, pairWon = 0;
    if (profile1?.id && profile2?.id) {
      const pairMatches = await db.select().from(matches)
        .where(and(
          eq(matches.isCompleted, true),
          or(
            and(eq(matches.teamAPlayer1Id, profile1.id), eq(matches.teamAPlayer2Id, profile2.id)),
            and(eq(matches.teamAPlayer1Id, profile2.id), eq(matches.teamAPlayer2Id, profile1.id)),
            and(eq(matches.teamBPlayer1Id, profile1.id), eq(matches.teamBPlayer2Id, profile2.id)),
            and(eq(matches.teamBPlayer1Id, profile2.id), eq(matches.teamBPlayer2Id, profile1.id)),
          )
        ));
      for (const m of pairMatches) {
        pairPlayed++;
        const onTeamA = (m.teamAPlayer1Id === profile1.id || m.teamAPlayer1Id === profile2.id) && (m.teamAPlayer2Id === profile1.id || m.teamAPlayer2Id === profile2.id);
        if ((onTeamA && (m.scoreA || 0) > (m.scoreB || 0)) || (!onTeamA && (m.scoreB || 0) > (m.scoreA || 0))) pairWon++;
      }
    }

    return {
      player1: { user: user1, grade: profile1?.grade || "—", matchesPlayed: stats1.played, matchesWon: stats1.won, rankingPoints: profile1?.rankingPoints || 0, stats: stats1 },
      player2: { user: user2, grade: profile2?.grade || "—", matchesPlayed: stats2.played, matchesWon: stats2.won, rankingPoints: profile2?.rankingPoints || 0, stats: stats2 },
      pairStats: { played: pairPlayed, won: pairWon, winRate: pairPlayed > 0 ? Math.round(pairWon / pairPlayed * 100) : 0 },
    };
  }

  app.get("/api/tournaments/:id/pair-comparison/:pairId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const data = await getPairComparisonData(Number(req.params.id), Number(req.params.pairId));
      if (!data) return res.status(404).json({ message: "Pair not found" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/pair-analysis/:pairId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const data = await getPairComparisonData(Number(req.params.id), Number(req.params.pairId));
      if (!data) return res.status(404).json({ message: "Pair not found" });

      const p1 = data.player1;
      const p2 = data.player2;
      const ps = data.pairStats;

      const prompt = `You are a professional racket sports analyst. Analyse this doubles pair and provide a brief, insightful report (4-5 sentences) about their partnership strengths and potential weaknesses. Be respectful and constructive. Use the real data below.

Player 1: ${p1.user.fullName}
- Grade: ${p1.grade}, Ranking Points: ${p1.rankingPoints}
- Overall: ${p1.matchesPlayed} matches played, ${p1.matchesWon} won (${p1.matchesPlayed > 0 ? Math.round(p1.matchesWon / p1.matchesPlayed * 100) : 0}% win rate)
- Recent match stats: Avg score for ${p1.stats.avgScoreFor}, Avg score against ${p1.stats.avgScoreAgainst}
- Recent form (last 10): ${p1.stats.recentForm.join(", ") || "No recent matches"}

Player 2: ${p2.user.fullName}
- Grade: ${p2.grade}, Ranking Points: ${p2.rankingPoints}
- Overall: ${p2.matchesPlayed} matches played, ${p2.matchesWon} won (${p2.matchesPlayed > 0 ? Math.round(p2.matchesWon / p2.matchesPlayed * 100) : 0}% win rate)
- Recent match stats: Avg score for ${p2.stats.avgScoreFor}, Avg score against ${p2.stats.avgScoreAgainst}
- Recent form (last 10): ${p2.stats.recentForm.join(", ") || "No recent matches"}

As a pair:
- Matches played together: ${ps.played}, Won: ${ps.won} (${ps.winRate}% win rate)

Provide a brief analysis covering: 1) Overall pair compatibility, 2) Strengths of the pairing, 3) Areas to watch or improve. Keep it encouraging and constructive.`;

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
      });
      const analysis = completion.choices[0]?.message?.content || "Unable to generate analysis.";
      res.json({ analysis, ...data });
    } catch (e: any) {
      console.error("AI pair analysis error:", e);
      res.status(500).json({ message: "Failed to generate pair analysis" });
    }
  });

  app.get("/api/tournaments/:id/waitlist", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const wl = await db.select().from(tournamentWaitlist)
        .where(eq(tournamentWaitlist.tournamentId, tournamentId))
        .orderBy(asc(tournamentWaitlist.position));
      const enriched = await Promise.all(wl.map(async (w) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, w.userId));
        return { ...w, user };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/all-players", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const regs = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), ne(tournamentRegistrations.status, "REJECTED")));

      const cats = await db.select().from(tournamentCategories)
        .where(eq(tournamentCategories.tournamentId, tournamentId));
      const catIds = cats.map(c => c.id);

      const enriched = await Promise.all(regs.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        let matchesPlayed = 0, matchesWon = 0, gamesWon = 0, gamesLost = 0, pointsScored = 0, pointsConceded = 0;
        if (profile && catIds.length > 0) {
          const playerTeams = await db.select().from(tournamentTeams)
            .where(and(
              inArray(tournamentTeams.categoryId, catIds),
              or(eq(tournamentTeams.player1Id, profile.id), eq(tournamentTeams.player2Id, profile.id))
            ));
          const teamIds = playerTeams.map(t => t.id);
          if (teamIds.length > 0) {
            const tMatches = await db.select().from(tournamentMatches)
              .where(and(
                eq(tournamentMatches.status, "FINISHED"),
                or(inArray(tournamentMatches.teamAId, teamIds), inArray(tournamentMatches.teamBId, teamIds))
              ));
            for (const m of tMatches) {
              if (m.isBye || m.isWalkover) continue;
              matchesPlayed++;
              const isTeamA = teamIds.includes(m.teamAId!);
              if (m.winnerId && teamIds.includes(m.winnerId)) matchesWon++;
              if (m.scores && Array.isArray(m.scores)) {
                for (const set of m.scores as Array<{scoreA: number; scoreB: number}>) {
                  if (isTeamA) {
                    pointsScored += set.scoreA || 0;
                    pointsConceded += set.scoreB || 0;
                    if (set.scoreA > set.scoreB) gamesWon++;
                    else if (set.scoreB > set.scoreA) gamesLost++;
                  } else {
                    pointsScored += set.scoreB || 0;
                    pointsConceded += set.scoreA || 0;
                    if (set.scoreB > set.scoreA) gamesWon++;
                    else if (set.scoreA > set.scoreB) gamesLost++;
                  }
                }
              }
            }
          }
        }
        return {
          ...reg, user, profile, matchesPlayed, matchesWon, gamesWon, gamesLost, pointsScored, pointsConceded,
          matchesLost: matchesPlayed - matchesWon,
          winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
        };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  async function isTournamentAdmin(userId: number, tournamentId: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;
    if (user.role === "OWNER") return true;
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
    if (!tournament) return false;
    const clubAdmin = await db.select().from(playerProfiles).where(
      and(eq(playerProfiles.userId, userId), eq(playerProfiles.clubId, tournament.clubId), eq(playerProfiles.clubRole, "ADMIN"))
    );
    if (clubAdmin.length > 0) return true;
    const [ta] = await db.select().from(tournamentAdmins).where(
      and(eq(tournamentAdmins.tournamentId, tournamentId), eq(tournamentAdmins.userId, userId))
    );
    return !!ta;
  }

  app.get("/api/tournaments/:id/admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const admins = await db.select({
        id: tournamentAdmins.id,
        tournamentId: tournamentAdmins.tournamentId,
        userId: tournamentAdmins.userId,
        grantedBy: tournamentAdmins.grantedBy,
        createdAt: tournamentAdmins.createdAt,
        userName: users.fullName,
        userEmail: users.email,
      }).from(tournamentAdmins)
        .innerJoin(users, eq(tournamentAdmins.userId, users.id))
        .where(eq(tournamentAdmins.tournamentId, tournamentId));
      res.json(admins);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/is-admin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      res.json({ isAdmin });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const canManage = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      const existing = await db.select().from(tournamentAdmins).where(
        and(eq(tournamentAdmins.tournamentId, tournamentId), eq(tournamentAdmins.userId, userId))
      );
      if (existing.length > 0) return res.status(400).json({ message: "User is already a tournament admin" });
      const [admin] = await db.insert(tournamentAdmins).values({
        tournamentId, userId, grantedBy: req.user!.id,
      }).returning();
      res.json(admin);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournaments/:id/admins/:adminId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const adminId = Number(req.params.adminId);
      const canManage = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!canManage) return res.status(403).json({ message: "Not authorized" });
      await db.delete(tournamentAdmins).where(eq(tournamentAdmins.id, adminId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/eligible-admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (!tournament) return res.status(404).json({ message: "Not found" });
      const members = await db.select({
        userId: playerProfiles.userId,
        fullName: users.fullName,
        email: users.email,
      }).from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(and(
          eq(playerProfiles.clubId, tournament.clubId),
          eq(playerProfiles.membershipStatus, "APPROVED"),
        ));
      const existingAdmins = await db.select().from(tournamentAdmins)
        .where(eq(tournamentAdmins.tournamentId, tournamentId));
      const existingIds = new Set(existingAdmins.map(a => a.userId));
      const eligible = members.filter(m => !existingIds.has(m.userId));
      res.json(eligible);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  const DEMO_FIRST = ["Alex","Jordan","Sam","Morgan","Taylor","Casey","Riley","Avery","Quinn","Jamie","Blake","Drew","Skyler","Reese","Kai","Phoenix","Rowan","Finley","Harper","Sage"];
  const DEMO_LAST = ["Chen","Patel","Kim","Garcia","Tanaka","Nguyen","Singh","Muller","Santos","Ali","Okafor","Johansson","Rivera","Park","Ivanov","Petrov","Williams","Brown","Dubois","Fischer"];
  const DEMO_GRADES = ["A1","A2","A3","B1","B2","B3","C1","C2","C3"];

  app.post("/api/tournaments/:id/seed-demo-players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      const count = Math.min(Math.max(Number(req.body.count) || 20, 1), 50);
      const created: any[] = [];

      for (let i = 0; i < count; i++) {
        const firstName = DEMO_FIRST[i % DEMO_FIRST.length];
        const lastName = DEMO_LAST[i % DEMO_LAST.length];
        const suffix = Date.now().toString(36) + i;
        const fullName = `${firstName} ${lastName}`;
        const email = `demo.${firstName.toLowerCase()}.${suffix}@demo.tournament`;

        const [demoUser] = await db.insert(users).values({
          fullName,
          email,
          password: "DEMO_ACCOUNT_NO_LOGIN",
          role: "PLAYER",
          accountStatus: "APPROVED",
        }).returning();

        const grade = DEMO_GRADES[Math.floor(Math.random() * DEMO_GRADES.length)];
        await db.insert(playerProfiles).values({
          userId: demoUser.id,
          clubId: tournament.clubId,
          membershipStatus: "APPROVED",
          clubRole: "PLAYER",
          currentGrade: grade,
        });

        const [reg] = await db.insert(tournamentRegistrations).values({
          tournamentId,
          userId: demoUser.id,
          registrationType: "INDIVIDUAL",
          status: "APPROVED",
        }).returning();

        created.push({ id: reg.id, userId: demoUser.id, fullName, grade });
      }

      res.json({ message: `${created.length} demo players added`, players: created });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournaments/:id/demo-players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const demoRegs = await db.select({
        regId: tournamentRegistrations.id,
        userId: tournamentRegistrations.userId,
        email: users.email,
      })
        .from(tournamentRegistrations)
        .innerJoin(users, eq(users.id, tournamentRegistrations.userId))
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          sql`${users.email} LIKE '%@demo.tournament'`,
        ));

      if (demoRegs.length === 0) return res.json({ message: "No demo players to remove", removed: 0 });

      const regIds = demoRegs.map(r => r.regId);
      const userIds = demoRegs.map(r => r.userId);

      await db.delete(tournamentRegistrations).where(inArray(tournamentRegistrations.id, regIds));
      if (userIds.length > 0) {
        await db.delete(playerProfiles).where(inArray(playerProfiles.userId, userIds));
        await db.delete(users).where(inArray(users.id, userIds));
      }

      res.json({ message: `${demoRegs.length} demo players removed`, removed: demoRegs.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/finances", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      if (!tournament) return res.status(404).json({ message: "Not found" });

      const regs = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), ne(tournamentRegistrations.status, "REJECTED")));

      const tournamentInternalFee = parseFloat(tournament.entryFee || "0");
      const tournamentExternalFee = parseFloat(tournament.externalEntryFee || tournament.entryFee || "0");

      // Per-category fees: each category overrides the tournament-level fee.
      // Players who join a category owe the category's fee (member vs external rate).
      const cats = await db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, tournamentId));
      const catFeeMap = new Map<number, { name: string; internalFee: number; externalFee: number; usesTournamentFee: boolean }>();
      for (const c of cats) {
        const hasOwnInternal = c.entryFee != null && c.entryFee !== "";
        const hasOwnExternal = c.externalEntryFee != null && c.externalEntryFee !== "";
        const internal = hasOwnInternal ? parseFloat(c.entryFee as string) : tournamentInternalFee;
        const external = hasOwnExternal ? parseFloat(c.externalEntryFee as string) : (hasOwnInternal ? parseFloat(c.entryFee as string) : tournamentExternalFee);
        catFeeMap.set(c.id, {
          name: c.name,
          internalFee: Number.isFinite(internal) ? internal : 0,
          externalFee: Number.isFinite(external) ? external : 0,
          usesTournamentFee: !hasOwnInternal && !hasOwnExternal,
        });
      }

      const clubMemberIds = new Set<number>();
      if (tournament.clubId) {
        const members = await db.select({ userId: playerProfiles.userId }).from(playerProfiles)
          .where(eq(playerProfiles.clubId, tournament.clubId));
        members.forEach(m => clubMemberIds.add(m.userId));
      }

      // Load every team in this tournament, mapping each profile back to its userId
      // so we can compute per-player category memberships.
      const catIds = Array.from(catFeeMap.keys());
      const allTeams = catIds.length
        ? await db.select().from(tournamentTeams).where(inArray(tournamentTeams.categoryId, catIds))
        : [];
      const profileIds = Array.from(new Set(allTeams.flatMap(t => [t.player1Id, t.player2Id]).filter((x): x is number => x != null)));
      const profiles = profileIds.length
        ? await db.select({ id: playerProfiles.id, userId: playerProfiles.userId }).from(playerProfiles).where(inArray(playerProfiles.id, profileIds))
        : [];
      const profileToUserId = new Map<number, number>(profiles.map(p => [p.id, p.userId]));
      // userId -> Array<{ catId, fee }>
      // For each player on a team we prefer the per-player fee snapshot
      // (captured at join/accept time, stored in pence on tournament_teams).
      // Fall back to dynamic calculation only for legacy rows where the
      // snapshot is NULL (created before per-category fees existed).
      // userId -> Array<{ catId, fee, status, teamId, slot }>
      // Per-team-slot payment status (May 2026) is the source of truth.
      // Each entry represents one paid/unpaid line on the player's row.
      const userCategories = new Map<number, Array<{
        catId: number; fee: number; categoryName: string;
        status: "UNPAID" | "PENDING" | "PAID"; teamId: number; slot: 1 | 2;
        paidAt: Date | null;
      }>>();
      for (const t of allTeams) {
        const cFees = catFeeMap.get(t.categoryId);
        if (!cFees) continue;
        const slots: Array<{ pid: number | null; snapshot: number | null; status: any; paidAt: Date | null; slot: 1 | 2 }> = [
          { pid: t.player1Id, snapshot: (t as any).player1EntryFeePence ?? null, status: (t as any).player1PaymentStatus, paidAt: (t as any).player1PaidAt ?? null, slot: 1 },
          { pid: t.player2Id, snapshot: (t as any).player2EntryFeePence ?? null, status: (t as any).player2PaymentStatus, paidAt: (t as any).player2PaidAt ?? null, slot: 2 },
        ];
        for (const { pid, snapshot, status, paidAt, slot } of slots) {
          if (pid == null) continue;
          const uid = profileToUserId.get(pid);
          if (uid == null) continue;
          const fee = snapshot != null
            ? snapshot / 100
            : (clubMemberIds.has(uid) ? cFees.internalFee : cFees.externalFee);
          const arr = userCategories.get(uid) || [];
          // Don't double-count if a player somehow appears twice in the same cat.
          if (!arr.some(e => e.catId === t.categoryId)) arr.push({
            catId: t.categoryId,
            fee,
            categoryName: cFees.name,
            status: (status as any) || "UNPAID",
            teamId: t.id,
            slot,
            paidAt,
          });
          userCategories.set(uid, arr);
        }
      }

      const enriched = await Promise.all(regs.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        const isInternal = clubMemberIds.has(reg.userId);
        const tournamentLevelFee = isInternal ? tournamentInternalFee : tournamentExternalFee;
        const catEntries = userCategories.get(reg.userId) || [];
        // Fallback: a registered player not yet in any category still owes the
        // tournament-level fee (back-compat with legacy single-category flow).
        const playerFee = catEntries.length > 0
          ? catEntries.reduce((s, e) => s + e.fee, 0)
          : tournamentLevelFee;
        // Aggregate per-team-slot statuses into a single label for the row.
        // PAID only if every category entry is PAID; PENDING if any is PENDING
        // (or mixed paid/unpaid); UNPAID if all are unpaid. When the player
        // hasn't joined any category, fall back to the legacy tournament-level
        // paymentStatus column (back-compat for old single-category flow).
        let aggregatedStatus: "UNPAID" | "PENDING" | "PAID" = "UNPAID";
        if (catEntries.length === 0) {
          aggregatedStatus = (reg.paymentStatus as any) || "UNPAID";
        } else {
          const allPaid = catEntries.every(e => e.status === "PAID");
          const anyPaid = catEntries.some(e => e.status === "PAID");
          const anyPending = catEntries.some(e => e.status === "PENDING");
          if (allPaid) aggregatedStatus = "PAID";
          else if (anyPending || anyPaid) aggregatedStatus = "PENDING";
          else aggregatedStatus = "UNPAID";
        }
        const collectedFee = catEntries.filter(e => e.status === "PAID").reduce((s, e) => s + e.fee, 0);
        const pendingFee = catEntries.filter(e => e.status === "PENDING").reduce((s, e) => s + e.fee, 0);
        return {
          ...reg,
          user,
          isInternal,
          playerFee,
          collectedFee,
          pendingFee,
          paymentStatus: aggregatedStatus,
          categoryFees: catEntries,
        };
      }));

      const approvedPlayers = enriched.filter(r => r.status === "APPROVED");
      const totalExpected = approvedPlayers.reduce((sum, r) => sum + r.playerFee, 0);
      // Sum per-team-slot collected/pending fees across approved players so the
      // dashboard numbers reflect per-category settlement (e.g. a player who
      // paid 2 of 3 categories shows 2/3 of their total in Collected, not 0).
      const totalCollected = approvedPlayers.reduce((sum, r) => sum + r.collectedFee, 0);
      const totalPending = approvedPlayers.reduce((sum, r) => sum + r.pendingFee, 0);
      const unpaidCount = approvedPlayers.filter(r => r.paymentStatus !== "PAID").length;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      // Per-category revenue breakdown — driven by per-slot payment status.
      const approvedUserIds = new Set(approvedPlayers.map(r => r.userId));
      const byCategory = Array.from(catFeeMap.entries()).map(([catId, info]) => {
        const teamsHere = allTeams.filter(t => t.categoryId === catId);
        let playerCount = 0;
        let expected = 0;
        let collected = 0;
        let pending = 0;
        for (const t of teamsHere) {
          const slots: Array<{ pid: number | null; snapshot: number | null; status: any }> = [
            { pid: t.player1Id, snapshot: (t as any).player1EntryFeePence ?? null, status: (t as any).player1PaymentStatus },
            { pid: t.player2Id, snapshot: (t as any).player2EntryFeePence ?? null, status: (t as any).player2PaymentStatus },
          ];
          for (const { pid, snapshot, status } of slots) {
            if (pid == null) continue;
            const uid = profileToUserId.get(pid);
            if (uid == null) continue;
            const fee = snapshot != null
              ? snapshot / 100
              : (clubMemberIds.has(uid) ? info.internalFee : info.externalFee);
            playerCount++;
            if (approvedUserIds.has(uid)) expected += fee;
            if (status === "PAID") collected += fee;
            if (status === "PENDING") pending += fee;
          }
        }
        return {
          categoryId: catId,
          categoryName: info.name,
          internalFee: info.internalFee,
          externalFee: info.externalFee,
          usesTournamentFee: info.usesTournamentFee,
          playerCount,
          expected,
          collected,
          pending,
        };
      });

      res.json({
        entryFee: tournamentInternalFee,
        externalEntryFee: tournamentExternalFee,
        totalExpected,
        totalCollected,
        totalPending,
        unpaidCount,
        collectionRate,
        playerCount: approvedPlayers.length,
        players: enriched,
        byCategory,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/confirm-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const userId = req.user!.id;
      const { paymentMethod } = req.body;

      const [reg] = await db.select().from(tournamentRegistrations)
        .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.userId, userId)));
      if (!reg) return res.status(404).json({ message: "Registration not found" });

      const [updated] = await db.update(tournamentRegistrations)
        .set({ paymentStatus: "PENDING", paymentMethod: paymentMethod || "BANK_TRANSFER", paymentConfirmed: true })
        .where(eq(tournamentRegistrations.id, reg.id)).returning();

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      const [player] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));

      const adminUsers = await db.select({ userId: tournamentAdmins.userId }).from(tournamentAdmins)
        .where(eq(tournamentAdmins.tournamentId, tournamentId));
      const [creator] = tournament?.createdBy ? await db.select({ id: users.id }).from(users).where(eq(users.id, tournament.createdBy)) : [null];
      const adminIds = new Set([...adminUsers.map(a => a.userId), ...(creator ? [creator.id] : [])]);
      const ownerUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "OWNER"));
      ownerUsers.forEach(u => adminIds.add(u.id));

      for (const adminId of adminIds) {
        await db.insert(notifications).values({
          userId: adminId,
          type: "GENERAL",
          title: "Tournament Payment Submitted",
          message: `${player?.fullName} has confirmed payment for "${tournament?.name}". Method: ${paymentMethod || "Bank Transfer"}.`,
          linkUrl: `/tournaments/${tournamentId}`,
        });
        await db.insert(internalMessages).values({
          senderId: userId,
          recipientId: adminId,
          subject: `Tournament Payment - ${tournament?.name}`,
          body: `${player?.fullName} has confirmed their payment for "${tournament?.name}". Payment method: ${paymentMethod || "Bank Transfer"}. Please verify and approve.`,
          messageCategory: "PAYMENT",
        });
      }

      await db.insert(notifications).values({
        userId,
        type: "GENERAL",
        title: "Payment Submitted",
        message: `Your payment for "${tournament?.name}" has been submitted and is awaiting admin verification.`,
        linkUrl: `/tournaments/${tournamentId}`,
      });

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournaments/:id/payment/:regId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const regId = Number(req.params.regId);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { paymentStatus } = req.body;
      const updateData: any = { paymentStatus };
      if (paymentStatus === "PAID") {
        updateData.paidAt = new Date();
        updateData.paymentConfirmed = true;
      } else if (paymentStatus === "UNPAID") {
        updateData.paidAt = null;
        updateData.paymentConfirmed = false;
      }

      const [updated] = await db.update(tournamentRegistrations)
        .set(updateData).where(and(eq(tournamentRegistrations.id, regId), eq(tournamentRegistrations.tournamentId, tournamentId))).returning();
      if (!updated) return res.status(404).json({ message: "Registration not found" });

      if (paymentStatus === "PAID" && updated) {
        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
        const [player] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, updated.userId));
        await db.insert(notifications).values({
          userId: updated.userId,
          type: "GENERAL",
          title: "Payment Confirmed",
          message: `Your payment for "${tournament?.name}" has been confirmed. You're all set!`,
          linkUrl: `/tournaments/${tournamentId}`,
        });
        await db.insert(internalMessages).values({
          senderId: req.user!.id,
          recipientId: updated.userId,
          subject: `Payment Confirmed - ${tournament?.name}`,
          body: `Hi ${player?.fullName}, your payment for "${tournament?.name}" has been confirmed by the admin. You're all set for the tournament!`,
          messageCategory: "PAYMENT",
        });
      }

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/prizes", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const prizes = await db.select().from(tournamentPrizes)
        .where(eq(tournamentPrizes.tournamentId, tournamentId))
        .orderBy(asc(tournamentPrizes.placement));
      res.json(prizes);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/prizes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { title, description, categoryId, placement, prizeValue, prizeType, iconType } = req.body;
      const [prize] = await db.insert(tournamentPrizes).values({
        tournamentId,
        categoryId: categoryId || null,
        title,
        description: description || null,
        placement: placement || 1,
        prizeValue: prizeValue || null,
        prizeType: prizeType || "trophy",
        iconType: iconType || "trophy",
      }).returning();
      res.json(prize);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-prizes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const prizeId = Number(req.params.id);
      const [existing] = await db.select().from(tournamentPrizes).where(eq(tournamentPrizes.id, prizeId));
      if (!existing) return res.status(404).json({ message: "Not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, existing.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { title, description, placement, prizeValue, prizeType, iconType, categoryId } = req.body;
      const [updated] = await db.update(tournamentPrizes).set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(placement !== undefined && { placement }),
        ...(prizeValue !== undefined && { prizeValue }),
        ...(prizeType !== undefined && { prizeType }),
        ...(iconType !== undefined && { iconType }),
        ...(categoryId !== undefined && { categoryId }),
      }).where(eq(tournamentPrizes.id, prizeId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-prizes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const prizeId = Number(req.params.id);
      const [existing] = await db.select().from(tournamentPrizes).where(eq(tournamentPrizes.id, prizeId));
      if (!existing) return res.status(404).json({ message: "Not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, existing.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      await db.delete(tournamentPrizes).where(eq(tournamentPrizes.id, prizeId));
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === COURT MANAGEMENT ===

  app.get("/api/tournaments/:id/courts", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const courts = await db.select().from(tournamentCourts)
        .where(eq(tournamentCourts.tournamentId, tournamentId))
        .orderBy(asc(tournamentCourts.courtOrder));
      res.json(courts);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/courts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { name } = req.body;
      const existing = await db.select().from(tournamentCourts)
        .where(eq(tournamentCourts.tournamentId, tournamentId));
      const courtOrder = existing.length + 1;

      const [court] = await db.insert(tournamentCourts).values({
        tournamentId,
        name: name || `Court ${courtOrder}`,
        courtOrder,
      }).returning();
      res.json(court);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-courts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const courtId = Number(req.params.id);
      const [court] = await db.select().from(tournamentCourts).where(eq(tournamentCourts.id, courtId));
      if (!court) return res.status(404).json({ message: "Court not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, court.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { name, isActive } = req.body;
      const [updated] = await db.update(tournamentCourts).set({
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      }).where(eq(tournamentCourts.id, courtId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-courts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const courtId = Number(req.params.id);
      const [court] = await db.select().from(tournamentCourts).where(eq(tournamentCourts.id, courtId));
      if (!court) return res.status(404).json({ message: "Court not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, court.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      await db.update(tournamentMatches).set({ courtId: null }).where(eq(tournamentMatches.courtId, courtId));
      await db.delete(tournamentCourts).where(eq(tournamentCourts.id, courtId));
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === MATCH COURT ASSIGNMENT & CONTROLS ===

  app.patch("/api/tournament-matches/:id/assign-court", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!match) return res.status(404).json({ message: "Match not found" });

      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
      const isAdmin = await isTournamentAdmin(req.user!.id, tournament.id);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { courtId } = req.body;
      if (courtId) {
        const [court] = await db.select().from(tournamentCourts)
          .where(and(eq(tournamentCourts.id, courtId), eq(tournamentCourts.tournamentId, tournament.id)));
        if (!court) return res.status(400).json({ message: "Court does not belong to this tournament" });
      }
      const [updated] = await db.update(tournamentMatches).set({
        courtId: courtId || null,
      }).where(eq(tournamentMatches.id, matchId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-matches/:id/team-names", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!match) return res.status(404).json({ message: "Match not found" });

      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
      const isAdmin = await isTournamentAdmin(req.user!.id, tournament.id);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { teamAName, teamBName } = req.body;
      const [updated] = await db.update(tournamentMatches).set({
        ...(teamAName !== undefined && { teamAName }),
        ...(teamBName !== undefined && { teamBName }),
      }).where(eq(tournamentMatches.id, matchId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-matches/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!match) return res.status(404).json({ message: "Match not found" });

      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
      const isAdmin = await isTournamentAdmin(req.user!.id, tournament.id);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { status } = req.body;
      if (!["UPCOMING", "LIVE", "FINISHED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const [updated] = await db.update(tournamentMatches).set({ status })
        .where(eq(tournamentMatches.id, matchId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-matches/:id/scheduled-time", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!match) return res.status(404).json({ message: "Match not found" });
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      const isAdmin = await isTournamentAdmin(req.user!.id, cat.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });
      const { scheduledTime } = req.body;
      const value = scheduledTime ? new Date(scheduledTime) : null;
      const [updated] = await db.update(tournamentMatches).set({ scheduledTime: value })
        .where(eq(tournamentMatches.id, matchId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Bulk update scheduled time across many matches at once.
  // Body: { matchIds: number[], scheduledTime: string | null }
  app.post("/api/tournament-matches/bulk-scheduled-time", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { matchIds, scheduledTime } = req.body || {};
      if (!Array.isArray(matchIds) || matchIds.length === 0) {
        return res.status(400).json({ message: "matchIds required" });
      }
      const ids = matchIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
      if (ids.length === 0) return res.status(400).json({ message: "matchIds required" });
      // Authorize via the first match's tournament
      const rows = await db.select().from(tournamentMatches).where(inArray(tournamentMatches.id, ids));
      if (rows.length === 0) return res.status(404).json({ message: "No matches found" });
      const catIds = Array.from(new Set(rows.map(r => r.categoryId)));
      const cats = await db.select().from(tournamentCategories).where(inArray(tournamentCategories.id, catIds));
      const tournamentIds = Array.from(new Set(cats.map(c => c.tournamentId)));
      for (const tid of tournamentIds) {
        const ok = await isTournamentAdmin(req.user!.id, tid);
        if (!ok) return res.status(403).json({ message: "Not authorized" });
      }
      const value = scheduledTime ? new Date(scheduledTime) : null;
      await db.update(tournamentMatches).set({ scheduledTime: value })
        .where(inArray(tournamentMatches.id, ids));
      res.json({ success: true, updated: ids.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-matches/:id/swap-players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId));
      if (!match) return res.status(404).json({ message: "Match not found" });

      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, cat.tournamentId));
      const isAdmin = await isTournamentAdmin(req.user!.id, tournament.id);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { teamAId, teamBId } = req.body;
      const [updated] = await db.update(tournamentMatches).set({
        ...(teamAId !== undefined && { teamAId }),
        ...(teamBId !== undefined && { teamBId }),
      }).where(eq(tournamentMatches.id, matchId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === LIVE COURT VIEW ===

  app.get("/api/tournaments/:id/court-view-all", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const allCourts = await db.select().from(tournamentCourts)
        .where(and(eq(tournamentCourts.tournamentId, tournamentId), eq(tournamentCourts.isActive, true)))
        .orderBy(asc(tournamentCourts.courtOrder));
      if (allCourts.length === 0) return res.json([]);

      const courtIds = allCourts.map(c => c.id);
      const allCourtMatches = courtIds.length > 0 ? await db.select().from(tournamentMatches)
        .where(inArray(tournamentMatches.courtId, courtIds))
        .orderBy(asc(tournamentMatches.matchOrder)) : [];

      const teamIds = new Set<number>();
      allCourtMatches.forEach(m => { if (m.teamAId) teamIds.add(m.teamAId); if (m.teamBId) teamIds.add(m.teamBId); });
      const teamIdArr = Array.from(teamIds);
      const teamsRaw = teamIdArr.length > 0 ? await db.select().from(tournamentTeams).where(inArray(tournamentTeams.id, teamIdArr)) : [];

      const profileIds = new Set<number>();
      teamsRaw.forEach(t => { profileIds.add(t.player1Id); if (t.player2Id) profileIds.add(t.player2Id); });
      const profileIdArr = Array.from(profileIds);
      const profiles = profileIdArr.length > 0 ? await db.select().from(playerProfiles).where(inArray(playerProfiles.id, profileIdArr)) : [];
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      const userIds = new Set<number>();
      profiles.forEach(p => userIds.add(p.userId));
      const userIdArr = Array.from(userIds);
      const usersList = userIdArr.length > 0 ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIdArr)) : [];
      const userMap = new Map(usersList.map(u => [u.id, u]));

      function getPlayerName(profileId: number): string {
        const p = profileMap.get(profileId);
        if (!p) return "Unknown";
        const u = userMap.get(p.userId);
        return u?.fullName || "Unknown";
      }

      const teamNameMap = new Map<number, string[]>();
      teamsRaw.forEach(t => {
        const names: string[] = [getPlayerName(t.player1Id)];
        if (t.player2Id) names.push(getPlayerName(t.player2Id));
        teamNameMap.set(t.id, names);
      });

      const catIds = new Set<number>();
      allCourtMatches.forEach(m => catIds.add(m.categoryId));
      const catIdArr = Array.from(catIds);
      const cats = catIdArr.length > 0 ? await db.select().from(tournamentCategories).where(inArray(tournamentCategories.id, catIdArr)) : [];
      const catMap = new Map(cats.map(c => [c.id, c.name]));

      const result = allCourts.map(court => {
        const matches = allCourtMatches.filter(m => m.courtId === court.id);
        const enriched = matches.map(m => ({
          ...m,
          categoryName: catMap.get(m.categoryId) || "Unknown",
          teamAPlayers: m.teamAId ? teamNameMap.get(m.teamAId) || [] : [],
          teamBPlayers: m.teamBId ? teamNameMap.get(m.teamBId) || [] : [],
        }));
        const liveMatch = enriched.find(m => m.status === "LIVE") || null;
        const nextMatch = enriched.find(m => m.status === "UPCOMING" || m.status === "PENDING") || null;
        return { court, liveMatch, nextMatch, allMatches: enriched };
      });

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/court-view/:courtId", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const courtId = Number(req.params.courtId);

      const [court] = await db.select().from(tournamentCourts)
        .where(and(eq(tournamentCourts.id, courtId), eq(tournamentCourts.tournamentId, tournamentId)));
      if (!court) return res.status(404).json({ message: "Court not found" });

      const courtMatches = await db.select().from(tournamentMatches)
        .where(eq(tournamentMatches.courtId, courtId))
        .orderBy(asc(tournamentMatches.matchOrder));

      const enrichedMatches = await Promise.all(courtMatches.map(async (m) => {
        const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, m.categoryId));
        let teamAPlayers: any[] = [];
        let teamBPlayers: any[] = [];
        if (m.teamAId) {
          const [teamA] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, m.teamAId));
          if (teamA) {
            const p1 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, teamA.player1Id));
            if (p1[0]) {
              const [u1] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p1[0].userId));
              teamAPlayers.push(u1?.fullName || "Unknown");
            }
            if (teamA.player2Id) {
              const p2 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, teamA.player2Id));
              if (p2[0]) {
                const [u2] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p2[0].userId));
                teamAPlayers.push(u2?.fullName || "Unknown");
              }
            }
          }
        }
        if (m.teamBId) {
          const [teamB] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, m.teamBId));
          if (teamB) {
            const p1 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, teamB.player1Id));
            if (p1[0]) {
              const [u1] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p1[0].userId));
              teamBPlayers.push(u1?.fullName || "Unknown");
            }
            if (teamB.player2Id) {
              const p2 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, teamB.player2Id));
              if (p2[0]) {
                const [u2] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p2[0].userId));
                teamBPlayers.push(u2?.fullName || "Unknown");
              }
            }
          }
        }
        return {
          ...m,
          categoryName: cat?.name || "Unknown",
          teamAPlayers,
          teamBPlayers,
        };
      }));

      const liveMatch = enrichedMatches.find(m => m.status === "LIVE");
      const nextMatch = enrichedMatches.find(m => m.status === "UPCOMING");

      const standingsMap: Record<number, any[]> = {};
      for (const m of courtMatches) {
        if (m.groupNumber && !standingsMap[m.groupNumber]) {
          const groupStandings = await db.select().from(tournamentStandings)
            .where(and(
              eq(tournamentStandings.categoryId, m.categoryId),
              eq(tournamentStandings.groupNumber, m.groupNumber)
            ));

          const enrichedStandings = await Promise.all(groupStandings.map(async (s) => {
            const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, s.teamId));
            let playerNames: string[] = [];
            if (team) {
              const p1 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
              if (p1[0]) {
                const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p1[0].userId));
                playerNames.push(u?.fullName || "Unknown");
              }
              if (team.player2Id) {
                const p2 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
                if (p2[0]) {
                  const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, p2[0].userId));
                  playerNames.push(u?.fullName || "Unknown");
                }
              }
            }
            return { ...s, playerNames };
          }));

          standingsMap[m.groupNumber] = enrichedStandings.sort((a, b) =>
            b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor
          );
        }
      }

      res.json({
        court,
        liveMatch,
        nextMatch,
        allMatches: enrichedMatches,
        standings: standingsMap,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === PLAYER TOURNAMENT STATS ===

  async function recalculatePlayerStats(tournamentId: number, categoryId: number) {
    const categoryMatches = await db.select().from(tournamentMatches)
      .where(and(eq(tournamentMatches.categoryId, categoryId), eq(tournamentMatches.status, "FINISHED")));

    await db.delete(tournamentPlayerStats).where(
      and(eq(tournamentPlayerStats.tournamentId, tournamentId), eq(tournamentPlayerStats.categoryId, categoryId))
    );

    const statsMap: Record<number, { played: number; won: number; lost: number; scored: number; conceded: number }> = {};

    const getPlayerUserIds = async (teamId: number): Promise<number[]> => {
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return [];
      const userIds: number[] = [];
      const p1 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
      if (p1[0]) userIds.push(p1[0].userId);
      if (team.player2Id) {
        const p2 = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
        if (p2[0]) userIds.push(p2[0].userId);
      }
      return userIds;
    };

    for (const m of categoryMatches) {
      if (!m.teamAId || !m.teamBId || m.isBye || m.isWalkover) continue;
      const teamAUsers = await getPlayerUserIds(m.teamAId);
      const teamBUsers = await getPlayerUserIds(m.teamBId);
      const scores = m.scores || [];
      const totalScoreA = scores.reduce((s, g) => s + g.scoreA, 0);
      const totalScoreB = scores.reduce((s, g) => s + g.scoreB, 0);
      const isTeamAWinner = m.winnerId === m.teamAId;

      for (const uid of teamAUsers) {
        if (!statsMap[uid]) statsMap[uid] = { played: 0, won: 0, lost: 0, scored: 0, conceded: 0 };
        statsMap[uid].played++;
        statsMap[uid].scored += totalScoreA;
        statsMap[uid].conceded += totalScoreB;
        if (isTeamAWinner) statsMap[uid].won++; else statsMap[uid].lost++;
      }
      for (const uid of teamBUsers) {
        if (!statsMap[uid]) statsMap[uid] = { played: 0, won: 0, lost: 0, scored: 0, conceded: 0 };
        statsMap[uid].played++;
        statsMap[uid].scored += totalScoreB;
        statsMap[uid].conceded += totalScoreA;
        if (!isTeamAWinner) statsMap[uid].won++; else statsMap[uid].lost++;
      }
    }

    const inserts = Object.entries(statsMap).map(([userId, s]) => ({
      tournamentId,
      categoryId,
      userId: Number(userId),
      matchesPlayed: s.played,
      matchesWon: s.won,
      matchesLost: s.lost,
      pointsScored: s.scored,
      pointsConceded: s.conceded,
      pointDifference: s.scored - s.conceded,
    }));

    if (inserts.length > 0) {
      await db.insert(tournamentPlayerStats).values(inserts);
    }
  }

  app.get("/api/tournaments/:id/player-stats", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;

      let statsQuery = db.select().from(tournamentPlayerStats)
        .where(eq(tournamentPlayerStats.tournamentId, tournamentId));

      const allStats = categoryId
        ? await db.select().from(tournamentPlayerStats).where(
            and(eq(tournamentPlayerStats.tournamentId, tournamentId), eq(tournamentPlayerStats.categoryId, categoryId))
          )
        : await db.select().from(tournamentPlayerStats).where(eq(tournamentPlayerStats.tournamentId, tournamentId));

      const enriched = await Promise.all(allStats.map(async (s) => {
        const [user] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, s.userId));
        return { ...s, playerName: user?.fullName || "Unknown" };
      }));

      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Cross-tournament aggregated stats for ONE player (by playerProfile id).
  // Used by the Player Stats popup to show "Tournaments" totals + a per-
  // tournament breakdown alongside the existing club-match stats.
  app.get("/api/players/:profileId/tournament-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profileId = Number(req.params.profileId);
      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.status(400).json({ message: "Invalid profileId" });
      }
      const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId));
      if (!profile) return res.status(404).json({ message: "Player not found" });
      const userId = profile.userId;

      const rows = await db.select().from(tournamentPlayerStats).where(eq(tournamentPlayerStats.userId, userId));
      const tIds = Array.from(new Set(rows.map(r => r.tournamentId)));
      const ts = tIds.length
        ? await db.select({ id: tournaments.id, name: tournaments.name, startDate: tournaments.startDate, endDate: tournaments.endDate, status: tournaments.status })
            .from(tournaments).where(inArray(tournaments.id, tIds))
        : [];
      const tById = new Map<number, any>(ts.map(t => [t.id, t]));

      const perTournament = new Map<number, { tournamentId: number; tournamentName: string; startDate: any; endDate: any; status: string | null; matchesPlayed: number; matchesWon: number; matchesLost: number; pointsScored: number; pointsConceded: number; categories: number; }>();
      for (const r of rows) {
        const t = tById.get(r.tournamentId);
        const cur = perTournament.get(r.tournamentId) || {
          tournamentId: r.tournamentId,
          tournamentName: t?.name || `Tournament #${r.tournamentId}`,
          startDate: t?.startDate || null,
          endDate: t?.endDate || null,
          status: t?.status || null,
          matchesPlayed: 0, matchesWon: 0, matchesLost: 0, pointsScored: 0, pointsConceded: 0, categories: 0,
        };
        cur.matchesPlayed += r.matchesPlayed || 0;
        cur.matchesWon += r.matchesWon || 0;
        cur.matchesLost += r.matchesLost || 0;
        cur.pointsScored += r.pointsScored || 0;
        cur.pointsConceded += r.pointsConceded || 0;
        cur.categories += 1;
        perTournament.set(r.tournamentId, cur);
      }

      const tournamentsBreakdown = Array.from(perTournament.values()).sort((a, b) => {
        const ad = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bd - ad;
      });

      const totals = tournamentsBreakdown.reduce((acc, t) => ({
        matchesPlayed: acc.matchesPlayed + t.matchesPlayed,
        matchesWon: acc.matchesWon + t.matchesWon,
        matchesLost: acc.matchesLost + t.matchesLost,
        pointsScored: acc.pointsScored + t.pointsScored,
        pointsConceded: acc.pointsConceded + t.pointsConceded,
      }), { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, pointsScored: 0, pointsConceded: 0 });

      const winRate = totals.matchesPlayed > 0 ? Math.round((totals.matchesWon / totals.matchesPlayed) * 100) : 0;

      res.json({
        tournamentsPlayed: tournamentsBreakdown.length,
        ...totals,
        pointDifference: totals.pointsScored - totals.pointsConceded,
        winRate,
        tournaments: tournamentsBreakdown,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Global tournaments leaderboard — aggregates tournament_player_stats across
  // every tournament, one row per user. Sorted by matches won desc by default.
  app.get("/api/tournaments-leaderboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const rows = await db.select().from(tournamentPlayerStats);
      const userIds = Array.from(new Set(rows.map(r => r.userId)));
      if (userIds.length === 0) return res.json([]);
      const usersList = await db.select({ id: users.id, fullName: users.fullName, gender: users.gender }).from(users).where(inArray(users.id, userIds));
      const profiles = await db.select({ id: playerProfiles.id, userId: playerProfiles.userId, grade: playerProfiles.grade, clubId: playerProfiles.clubId })
        .from(playerProfiles).where(inArray(playerProfiles.userId, userIds));
      const uMap = new Map<number, any>(usersList.map(u => [u.id, u]));
      const pMap = new Map<number, any>(profiles.map(p => [p.userId, p]));

      const agg = new Map<number, { userId: number; profileId: number | null; fullName: string; gender: string | null; grade: string | null; clubId: number | null; tournamentIds: Set<number>; matchesPlayed: number; matchesWon: number; matchesLost: number; pointsScored: number; pointsConceded: number; }>();
      for (const r of rows) {
        const u = uMap.get(r.userId);
        const p = pMap.get(r.userId);
        const cur = agg.get(r.userId) || {
          userId: r.userId,
          profileId: p?.id ?? null,
          fullName: u?.fullName || `Player #${r.userId}`,
          gender: u?.gender ?? null,
          grade: p?.grade ?? null,
          clubId: p?.clubId ?? null,
          tournamentIds: new Set<number>(),
          matchesPlayed: 0, matchesWon: 0, matchesLost: 0, pointsScored: 0, pointsConceded: 0,
        };
        cur.tournamentIds.add(r.tournamentId);
        cur.matchesPlayed += r.matchesPlayed || 0;
        cur.matchesWon += r.matchesWon || 0;
        cur.matchesLost += r.matchesLost || 0;
        cur.pointsScored += r.pointsScored || 0;
        cur.pointsConceded += r.pointsConceded || 0;
        agg.set(r.userId, cur);
      }
      const out = Array.from(agg.values()).map(a => ({
        userId: a.userId,
        profileId: a.profileId,
        fullName: a.fullName,
        gender: a.gender,
        grade: a.grade,
        clubId: a.clubId,
        tournamentsPlayed: a.tournamentIds.size,
        matchesPlayed: a.matchesPlayed,
        matchesWon: a.matchesWon,
        matchesLost: a.matchesLost,
        pointsScored: a.pointsScored,
        pointsConceded: a.pointsConceded,
        pointDifference: a.pointsScored - a.pointsConceded,
        winRate: a.matchesPlayed > 0 ? Math.round((a.matchesWon / a.matchesPlayed) * 100) : 0,
      }));
      out.sort((a, b) => (b.matchesWon - a.matchesWon) || (b.pointDifference - a.pointDifference) || (b.winRate - a.winRate));
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/recalculate-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const categories = await db.select().from(tournamentCategories)
        .where(eq(tournamentCategories.tournamentId, tournamentId));

      for (const cat of categories) {
        await recalculatePlayerStats(tournamentId, cat.id);
      }
      res.json({ message: "Stats recalculated" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/restart", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const cats = await db.select({ id: tournamentCategories.id }).from(tournamentCategories)
        .where(eq(tournamentCategories.tournamentId, tournamentId));
      const catIds = cats.map(c => c.id);

      await db.transaction(async (trx) => {
        if (catIds.length > 0) {
          await trx.delete(tournamentPlayerStats).where(
            and(eq(tournamentPlayerStats.tournamentId, tournamentId), inArray(tournamentPlayerStats.categoryId, catIds))
          );
          await trx.delete(tournamentStandings).where(inArray(tournamentStandings.categoryId, catIds));
          await trx.delete(tournamentMatches).where(inArray(tournamentMatches.categoryId, catIds));

          for (const catId of catIds) {
            await trx.update(tournamentTeams).set({ groupNumber: null, subGroupNumber: null })
              .where(eq(tournamentTeams.categoryId, catId));
          }
        }

        const groups = await trx.select({ id: tournamentGroups.id }).from(tournamentGroups)
          .where(eq(tournamentGroups.tournamentId, tournamentId));
        const groupIds = groups.map(g => g.id);
        if (groupIds.length > 0) {
          await trx.delete(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, groupIds));
        }
        await trx.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, tournamentId));

        await trx.update(tournaments).set({ status: "DRAFT" }).where(eq(tournaments.id, tournamentId));
      });

      res.json({ message: "Tournament restarted. All matches, standings, stats, and groups cleared." });
    } catch (e: any) {
      console.error("Error restarting tournament:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/groups", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const groups = await db.select().from(tournamentGroups)
        .where(eq(tournamentGroups.tournamentId, tournamentId))
        .orderBy(asc(tournamentGroups.groupOrder));

      const groupIds = groups.map(g => g.id);
      let pairs: any[] = [];
      if (groupIds.length > 0) {
        pairs = await db.select().from(tournamentGroupPairs)
          .where(inArray(tournamentGroupPairs.groupId, groupIds))
          .orderBy(asc(tournamentGroupPairs.pairOrder));
      }

      const teamIds = [...new Set(pairs.map(p => p.teamId).filter(Boolean))] as number[];
      let teams: any[] = [];
      if (teamIds.length > 0) {
        teams = await db.select().from(tournamentTeams).where(inArray(tournamentTeams.id, teamIds));
      }
      const profileIds = [...new Set(teams.flatMap(t => [t.player1Id, t.player2Id].filter(Boolean)))];
      let profiles: any[] = [];
      if (profileIds.length > 0) {
        profiles = await db.select({ id: playerProfiles.id, userId: playerProfiles.userId })
          .from(playerProfiles).where(inArray(playerProfiles.id, profileIds));
      }
      const userIds = profiles.map(p => p.userId);
      let userMap: Record<number, string> = {};
      if (userIds.length > 0) {
        const usersData = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIds));
        usersData.forEach(u => { userMap[u.id] = u.fullName; });
      }
      const profileMap: Record<number, string> = {};
      profiles.forEach(p => { profileMap[p.id] = userMap[p.userId] || "Unknown"; });

      const pairRequestIds = [...new Set(pairs.map(p => p.pairRequestId).filter(Boolean))] as number[];
      let pairRequests: any[] = [];
      if (pairRequestIds.length > 0) {
        pairRequests = await db.select().from(tournamentPairRequests).where(inArray(tournamentPairRequests.id, pairRequestIds));
      }
      const prUserIds = [...new Set(pairRequests.flatMap(pr => [pr.fromUserId, pr.toUserId].filter(Boolean)))] as number[];
      let prUserMap: Record<number, string> = {};
      if (prUserIds.length > 0) {
        const prUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, prUserIds));
        prUsers.forEach(u => { prUserMap[u.id] = u.fullName; });
      }

      // SELF-HEAL: for any group_pair that only references a pairRequest, try to find an
      // existing team in the same category whose two players match the pair-request's two users,
      // and back-fill the teamId. This keeps standings (which key by teamId) in sync with the groups.
      const groupPairsNeedingTeamId = pairs.filter(p => !p.teamId && p.pairRequestId);
      if (groupPairsNeedingTeamId.length > 0) {
        const categoryIds = [...new Set(groups.map(g => g.categoryId).filter(Boolean))] as number[];
        if (categoryIds.length > 0) {
          const allCategoryTeams = await db.select().from(tournamentTeams).where(inArray(tournamentTeams.categoryId, categoryIds));
          const allTeamProfileIds = [...new Set(allCategoryTeams.flatMap(t => [t.player1Id, t.player2Id].filter(Boolean)))] as number[];
          const teamProfiles = allTeamProfileIds.length > 0
            ? await db.select({ id: playerProfiles.id, userId: playerProfiles.userId }).from(playerProfiles).where(inArray(playerProfiles.id, allTeamProfileIds))
            : [];
          const profileToUser: Record<number, number> = {};
          for (const pp of teamProfiles) profileToUser[pp.id] = pp.userId;

          const groupIdToCategoryId = new Map(groups.map(g => [g.id, g.categoryId]));

          for (const gp of groupPairsNeedingTeamId) {
            const pr = pairRequests.find(r => r.id === gp.pairRequestId);
            if (!pr) continue;
            const wanted = new Set([pr.fromUserId, pr.toUserId].filter(Boolean));
            if (wanted.size < 2) continue;
            const targetCatId = groupIdToCategoryId.get(gp.groupId);
            const match = allCategoryTeams.find(t => {
              if (t.categoryId !== targetCatId) return false;
              const u1 = profileToUser[t.player1Id];
              const u2 = t.player2Id ? profileToUser[t.player2Id] : null;
              return u1 && u2 && wanted.has(u1) && wanted.has(u2);
            });
            if (match) {
              await db.update(tournamentGroupPairs).set({ teamId: match.id }).where(eq(tournamentGroupPairs.id, gp.id));
              gp.teamId = match.id;
              if (!teams.some(t => t.id === match.id)) teams.push(match);
            }
          }

          // Re-resolve profile names for any newly added teams.
          const newProfileIds = teams.flatMap(t => [t.player1Id, t.player2Id].filter(Boolean)).filter(id => !(id in profileMap)) as number[];
          if (newProfileIds.length > 0) {
            const extraProfiles = await db.select({ id: playerProfiles.id, userId: playerProfiles.userId })
              .from(playerProfiles).where(inArray(playerProfiles.id, newProfileIds));
            const extraUserIds = extraProfiles.map(p => p.userId).filter(uid => !(uid in userMap));
            if (extraUserIds.length > 0) {
              const extraUsers = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, extraUserIds));
              extraUsers.forEach(u => { userMap[u.id] = u.fullName; });
            }
            extraProfiles.forEach(p => { profileMap[p.id] = userMap[p.userId] || "Unknown"; });
          }
        }
      }

      let venueIds = [...new Set(groups.map(g => g.venueId).filter(Boolean))] as number[];
      let venueMap: Record<number, any> = {};
      if (venueIds.length > 0) {
        const venuesData = await db.select().from(venues).where(inArray(venues.id, venueIds));
        venuesData.forEach(v => { venueMap[v.id] = v; });
      }

      const enriched = groups.map(g => {
        const groupPairs = pairs.filter(p => p.groupId === g.id).map(p => {
          if (p.pairRequestId) {
            const pr = pairRequests.find(r => r.id === p.pairRequestId);
            return {
              ...p,
              pairRequest: pr ? {
                ...pr,
                fromUserName: prUserMap[pr.fromUserId] || "Unknown",
                toUserName: prUserMap[pr.toUserId] || "Unknown",
                pairName: pr.pairName || null,
              } : null,
              team: null,
            };
          }
          const team = teams.find(t => t.id === p.teamId);
          return {
            ...p,
            team: team ? {
              ...team,
              player1Name: profileMap[team.player1Id] || "Unknown",
              player2Name: team.player2Id ? (profileMap[team.player2Id] || "Unknown") : null,
            } : null,
            pairRequest: null,
          };
        });
        return {
          ...g,
          pairs: groupPairs,
          venue: g.venueId ? venueMap[g.venueId] || null : null,
        };
      });

      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === TOURNAMENT STAGES ===
  // Stages let admins group rounds (e.g. "Group Stage", "Quarter-Finals", "Final")
  // and assign each tournament_group / tournament_match to a stage.
  app.get("/api/tournaments/:id/stages", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const stages = await db.select().from(tournamentStages)
        .where(eq(tournamentStages.tournamentId, tournamentId))
        .orderBy(tournamentStages.displayOrder);
      res.json(stages);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/stages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const name = (req.body?.name || "").toString().trim();
      if (!name) return res.status(400).json({ message: "Stage name is required" });

      // Auto-assign next display order if not provided.
      let displayOrder = Number(req.body?.displayOrder);
      if (!Number.isFinite(displayOrder) || displayOrder <= 0) {
        const existing = await db.select().from(tournamentStages)
          .where(eq(tournamentStages.tournamentId, tournamentId));
        displayOrder = existing.reduce((m, s) => Math.max(m, s.displayOrder), 0) + 1;
      }

      const [stage] = await db.insert(tournamentStages).values({
        tournamentId, name, displayOrder,
      }).returning();
      res.json(stage);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-stages/:stageId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const stageId = Number(req.params.stageId);
      if (!Number.isFinite(stageId) || stageId <= 0) return res.status(400).json({ message: "Invalid stage id" });
      const [stage] = await db.select().from(tournamentStages).where(eq(tournamentStages.id, stageId));
      if (!stage) return res.status(404).json({ message: "Stage not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, stage.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const updates: any = {};
      if (req.body.name !== undefined) {
        const trimmed = String(req.body.name).trim();
        if (!trimmed) return res.status(400).json({ message: "Stage name cannot be empty" });
        updates.name = trimmed;
      }
      if (req.body.displayOrder !== undefined) {
        const n = Number(req.body.displayOrder);
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
          return res.status(400).json({ message: "displayOrder must be a positive integer" });
        }
        updates.displayOrder = n;
      }

      const [updated] = await db.update(tournamentStages).set(updates).where(eq(tournamentStages.id, stageId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-stages/:stageId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const stageId = Number(req.params.stageId);
      if (!Number.isFinite(stageId) || stageId <= 0) return res.status(400).json({ message: "Invalid stage id" });
      const [stage] = await db.select().from(tournamentStages).where(eq(tournamentStages.id, stageId));
      if (!stage) return res.status(404).json({ message: "Stage not found" });
      const isAdmin = await isTournamentAdmin(req.user!.id, stage.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      // Detach groups and matches still linked to this stage so deletion is non-destructive.
      await db.update(tournamentGroups).set({ stageId: null }).where(eq(tournamentGroups.stageId, stageId));
      await db.update(tournamentMatches).set({ stageId: null }).where(eq(tournamentMatches.stageId, stageId));
      await db.delete(tournamentStages).where(eq(tournamentStages.id, stageId));
      res.json({ message: "Stage deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Helper: ensure a stageId exists and belongs to the given tournament.
  async function validateStageBelongsToTournament(stageId: any, tournamentId: number): Promise<{ ok: true; value: number | null } | { ok: false; status: number; message: string }> {
    if (stageId === undefined || stageId === null || stageId === "") return { ok: true, value: null };
    const n = Number(stageId);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, status: 400, message: "Invalid stageId" };
    const [s] = await db.select().from(tournamentStages).where(eq(tournamentStages.id, n));
    if (!s) return { ok: false, status: 400, message: "Stage not found" };
    if (s.tournamentId !== tournamentId) return { ok: false, status: 400, message: "Stage does not belong to this tournament" };
    return { ok: true, value: n };
  }

  app.post("/api/tournaments/:id/groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const isAdmin = await isTournamentAdmin(req.user!.id, tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { name, categoryId, maxPairs, startTime, venueId, hallName, courtName, groupOrder, stageId } = req.body;
      if (!name) return res.status(400).json({ message: "Group name is required" });

      const stageCheck = await validateStageBelongsToTournament(stageId, tournamentId);
      if (!stageCheck.ok) return res.status(stageCheck.status).json({ message: stageCheck.message });

      const [group] = await db.insert(tournamentGroups).values({
        tournamentId,
        categoryId: categoryId || null,
        stageId: stageCheck.value,
        name,
        groupOrder: groupOrder || 1,
        maxPairs: maxPairs || 4,
        startTime: startTime ? new Date(startTime) : null,
        venueId: venueId || null,
        hallName: hallName || null,
        courtName: courtName || null,
      }).returning();

      res.json(group);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tournament-groups/:groupId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const groupId = Number(req.params.groupId);
      const [group] = await db.select().from(tournamentGroups).where(eq(tournamentGroups.id, groupId));
      if (!group) return res.status(404).json({ message: "Group not found" });

      const isAdmin = await isTournamentAdmin(req.user!.id, group.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.maxPairs !== undefined) updates.maxPairs = req.body.maxPairs;
      if (req.body.startTime !== undefined) updates.startTime = req.body.startTime ? new Date(req.body.startTime) : null;
      if (req.body.venueId !== undefined) updates.venueId = req.body.venueId || null;
      if (req.body.hallName !== undefined) updates.hallName = req.body.hallName || null;
      if (req.body.courtName !== undefined) updates.courtName = req.body.courtName || null;
      if (req.body.groupOrder !== undefined) updates.groupOrder = req.body.groupOrder;
      if (req.body.categoryId !== undefined) updates.categoryId = req.body.categoryId || null;
      if (req.body.stageId !== undefined) {
        const stageCheck = await validateStageBelongsToTournament(req.body.stageId, group.tournamentId);
        if (!stageCheck.ok) return res.status(stageCheck.status).json({ message: stageCheck.message });
        updates.stageId = stageCheck.value;
      }

      const [updated] = await db.update(tournamentGroups).set(updates).where(eq(tournamentGroups.id, groupId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-groups/:groupId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const groupId = Number(req.params.groupId);
      const [group] = await db.select().from(tournamentGroups).where(eq(tournamentGroups.id, groupId));
      if (!group) return res.status(404).json({ message: "Group not found" });

      const isAdmin = await isTournamentAdmin(req.user!.id, group.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      await db.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.groupId, groupId));
      await db.delete(tournamentGroups).where(eq(tournamentGroups.id, groupId));
      res.json({ message: "Group deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournament-groups/:groupId/pairs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const groupId = Number(req.params.groupId);
      const [group] = await db.select().from(tournamentGroups).where(eq(tournamentGroups.id, groupId));
      if (!group) return res.status(404).json({ message: "Group not found" });

      const isAdmin = await isTournamentAdmin(req.user!.id, group.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      const { teamId, pairRequestId } = req.body;
      if (!teamId && !pairRequestId) return res.status(400).json({ message: "Team ID or Pair Request ID required" });

      const existingPairs = await db.select().from(tournamentGroupPairs).where(eq(tournamentGroupPairs.groupId, groupId));
      if (existingPairs.length >= group.maxPairs) {
        return res.status(400).json({ message: `Group is full (max ${group.maxPairs} pairs)` });
      }

      if (pairRequestId) {
        const [pr] = await db.select().from(tournamentPairRequests).where(eq(tournamentPairRequests.id, pairRequestId));
        if (!pr) return res.status(404).json({ message: "Pair not found" });
        if (pr.tournamentId !== group.tournamentId) return res.status(400).json({ message: "Pair does not belong to this tournament" });
        if (pr.status !== "ACCEPTED") return res.status(400).json({ message: "Pair request must be accepted before adding to a group" });

        const alreadyInGroup = existingPairs.find(p => p.pairRequestId === pairRequestId);
        if (alreadyInGroup) return res.status(400).json({ message: "Pair already in this group" });

        // Note: a pair may be in multiple groups (e.g. round-robin + Quarter-Final + Semi-Final),
        // so we intentionally do NOT block based on membership in other groups.

        const [pair] = await db.insert(tournamentGroupPairs).values({
          groupId,
          pairRequestId,
          pairOrder: existingPairs.length + 1,
        }).returning();
        return res.json(pair);
      }

      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });

      const [teamCat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, team.categoryId));
      if (!teamCat || teamCat.tournamentId !== group.tournamentId) {
        return res.status(400).json({ message: "Team does not belong to this tournament" });
      }
      if (group.categoryId && team.categoryId !== group.categoryId) {
        return res.status(400).json({ message: "Team category does not match group category" });
      }

      const alreadyInGroup = existingPairs.find(p => p.teamId === teamId);
      if (alreadyInGroup) return res.status(400).json({ message: "Team already in this group" });

      // Note: a team may be in multiple groups (round-robin + Quarter-Final + Semi-Final),
      // so we intentionally do NOT block based on membership in other groups.

      const [pair] = await db.insert(tournamentGroupPairs).values({
        groupId,
        teamId,
        pairOrder: existingPairs.length + 1,
      }).returning();

      res.json(pair);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-group-pairs/:pairId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const pairId = Number(req.params.pairId);
      const [pair] = await db.select().from(tournamentGroupPairs).where(eq(tournamentGroupPairs.id, pairId));
      if (!pair) return res.status(404).json({ message: "Pair assignment not found" });

      const [group] = await db.select().from(tournamentGroups).where(eq(tournamentGroups.id, pair.groupId));
      if (!group) return res.status(404).json({ message: "Group not found" });

      const isAdmin = await isTournamentAdmin(req.user!.id, group.tournamentId);
      if (!isAdmin) return res.status(403).json({ message: "Not authorized" });

      await db.delete(tournamentGroupPairs).where(eq(tournamentGroupPairs.id, pairId));
      res.json({ message: "Pair removed from group" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/my-tournament-dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = req.user!.id;

      const regs = await db.select().from(tournamentRegistrations)
        .where(and(
          or(eq(tournamentRegistrations.userId, userId), eq(tournamentRegistrations.partnerId!, userId)),
          eq(tournamentRegistrations.status, "APPROVED")
        ));

      if (regs.length === 0) return res.json([]);

      const tournamentIds = [...new Set(regs.map(r => r.tournamentId))];
      if (tournamentIds.length === 0) return res.json([]);

      const allTournaments = await db.select().from(tournaments).where(inArray(tournaments.id, tournamentIds));
      // A tournament should disappear from dashboard banners after 12:00 AM on the day after it ends.
      // Compare endDate against start-of-today so a tournament ending today (any time) still shows.
      const now = new Date();
      const dashboardCutoff = new Date();
      dashboardCutoff.setHours(0, 0, 0, 0);
      const activeTournaments = allTournaments.filter(t =>
        t.status !== "CANCELLED" && t.status !== "COMPLETED" && new Date(t.endDate) >= dashboardCutoff
      );

      if (activeTournaments.length === 0) return res.json([]);

      const activeTournamentIds = activeTournaments.map(t => t.id);

      const venueIds = activeTournaments.map(t => t.venueId).filter(Boolean) as number[];
      const allVenues = venueIds.length > 0
        ? await db.select().from(venues).where(inArray(venues.id, venueIds))
        : [];

      const allCategories = await db.select().from(tournamentCategories)
        .where(inArray(tournamentCategories.tournamentId, activeTournamentIds));
      const categoryIds = allCategories.map(c => c.id);

      const allTeams = categoryIds.length > 0
        ? await db.select().from(tournamentTeams).where(inArray(tournamentTeams.categoryId, categoryIds))
        : [];

      const allPairRequests = await db.select().from(tournamentPairRequests)
        .where(inArray(tournamentPairRequests.tournamentId, activeTournamentIds));

      const teamProfileIds = [...new Set(allTeams.flatMap(t => [t.player1Id, t.player2Id].filter(Boolean) as number[]))];
      const allProfiles = teamProfileIds.length > 0
        ? await db.select().from(playerProfiles).where(inArray(playerProfiles.id, teamProfileIds))
        : [];

      const pairRequestUserIds = [...new Set(allPairRequests.flatMap(pr => [pr.fromUserId, pr.toUserId].filter(Boolean) as number[]))];
      const allRelevantUserIds = [...new Set([
        ...allProfiles.map(p => p.userId),
        ...pairRequestUserIds,
        userId,
      ])];
      const allUsers = allRelevantUserIds.length > 0
        ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, allRelevantUserIds))
        : [];

      const userMap = new Map(allUsers.map(u => [u.id, u.fullName]));
      const profileMap = new Map(allProfiles.map(p => [p.id, p]));
      const pairRequestMap = new Map(allPairRequests.map(pr => [pr.id, pr]));

      const getPlayerNameByProfileId = (profileId: number | null | undefined): string | null => {
        if (!profileId) return null;
        const profile = profileMap.get(profileId);
        if (!profile) return null;
        return userMap.get(profile.userId) || null;
      };

      const userProfileIds = allProfiles.filter(p => p.userId === userId).map(p => p.id);

      const myTeamIds = allTeams
        .filter(t => userProfileIds.includes(t.player1Id) || (t.player2Id && userProfileIds.includes(t.player2Id)))
        .map(t => t.id);

      const myPairRequestIds = allPairRequests
        .filter(pr => pr.fromUserId === userId || pr.toUserId === userId)
        .map(pr => pr.id);

      const allGroups = activeTournamentIds.length > 0
        ? await db.select().from(tournamentGroups).where(inArray(tournamentGroups.tournamentId, activeTournamentIds))
        : [];
      const groupIds = allGroups.map(g => g.id);

      const allGroupPairs = groupIds.length > 0
        ? await db.select().from(tournamentGroupPairs).where(inArray(tournamentGroupPairs.groupId, groupIds))
        : [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Stage tier: 1 = Group Stage, 2 = Quarter-Finals, 3 = Semi-Finals, 4 = Final
      const stageTierForOrder = (groupOrder: number): number => {
        if (groupOrder >= 400) return 4;
        if (groupOrder >= 300) return 3;
        if (groupOrder >= 200) return 2;
        return 1;
      };

      const stageNameForOrder = (groupOrder: number): string => {
        if (groupOrder >= 400) return "Final";
        if (groupOrder >= 300) return "Semi-Finals";
        if (groupOrder >= 200) return "Quarter-Finals";
        return "Group Stage";
      };
      const opponentLabelForOrder = (groupOrder: number): string => {
        if (groupOrder >= 400) return "Your opponents in the final";
        if (groupOrder >= 300) return "Your opponents at semi-finals";
        if (groupOrder >= 200) return "Your opponents at quarter-finals";
        return "Your opponents at group stage";
      };

      const result = activeTournaments.map(tournament => {
        const venue = allVenues.find(v => v.id === tournament.venueId);
        const tCategories = allCategories.filter(c => c.tournamentId === tournament.id);
        const tGroups = allGroups.filter(g => g.tournamentId === tournament.id);

        const myGroupInfo: any[] = [];

        for (const group of tGroups) {
          const groupPairs = allGroupPairs.filter(gp => gp.groupId === group.id);
          const isMyGroup = groupPairs.some(gp =>
            (gp.teamId && myTeamIds.includes(gp.teamId)) ||
            (gp.pairRequestId && myPairRequestIds.includes(gp.pairRequestId))
          );

          if (isMyGroup) {
            // Skip groups whose startTime has already passed.
            // Past stages (e.g. completed group stage) should not block the banner.
            if (group.startTime && new Date(group.startTime) < now) {
              continue;
            }

            const pairsInGroup = groupPairs.map(gp => {
              if (gp.teamId) {
                const team = allTeams.find(t => t.id === gp.teamId);
                if (!team) return null;
                return {
                  teamId: team.id,
                  player1: getPlayerNameByProfileId(team.player1Id),
                  player2: getPlayerNameByProfileId(team.player2Id),
                  isMe: userProfileIds.includes(team.player1Id) || (team.player2Id ? userProfileIds.includes(team.player2Id) : false),
                  seedNumber: team.seedNumber,
                };
              }
              if (gp.pairRequestId) {
                const pr = pairRequestMap.get(gp.pairRequestId);
                if (!pr) return null;
                return {
                  teamId: `pr-${pr.id}`,
                  player1: userMap.get(pr.fromUserId) || null,
                  player2: userMap.get(pr.toUserId) || null,
                  isMe: pr.fromUserId === userId || pr.toUserId === userId,
                  seedNumber: null,
                  pairName: pr.pairName || null,
                };
              }
              return null;
            }).filter(Boolean);

            const category = tCategories.find(c => c.id === group.categoryId);

            myGroupInfo.push({
              groupId: group.id,
              groupName: group.name,
              groupOrder: group.groupOrder,
              stageName: stageNameForOrder(group.groupOrder),
              opponentLabel: opponentLabelForOrder(group.groupOrder),
              startTime: group.startTime,
              hallName: group.hallName,
              courtName: group.courtName,
              categoryName: category?.name || null,
              pairs: pairsInGroup,
            });
          }
        }

        // If the player has progressed to a later stage (QF / SF / Final),
        // hide the earlier-stage entries so the banner only shows their current stage.
        const maxTier = myGroupInfo.reduce((m: number, g: any) => Math.max(m, stageTierForOrder(g.groupOrder)), 0);
        const stageFilteredGroups = maxTier > 0
          ? myGroupInfo.filter((g: any) => stageTierForOrder(g.groupOrder) === maxTier)
          : myGroupInfo;

        const sortedGroups = stageFilteredGroups.sort((a: any, b: any) => a.groupOrder - b.groupOrder);
        const nextStageStartTime = sortedGroups.find((g: any) => g.startTime)?.startTime || null;

        return {
          tournamentId: tournament.id,
          name: tournament.name,
          type: tournament.type,
          status: tournament.status,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          nextStageStartTime,
          location: tournament.location || venue?.address || venue?.name || null,
          venueName: venue?.name || null,
          bannerUrl: tournament.bannerUrl,
          myGroups: sortedGroups,
        };
      });

      // Hide tournaments whose start date has passed and where the user has no remaining stages.
      const filtered = result.filter(t => {
        const tournamentStarted = new Date(t.startDate) < startOfToday;
        if (!tournamentStarted) return true;
        return t.myGroups.length > 0;
      });

      res.json(filtered);
    } catch (e: any) {
      console.error("[My Tournament Dashboard] Error:", e);
      res.status(500).json({ message: e.message });
    }
  });
}
