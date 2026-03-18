import { Express } from "express";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray, ne } from "drizzle-orm";
import {
  tournaments, tournamentCategories, tournamentTeams, tournamentMatches,
  tournamentStandings, tournamentRegistrations, tournamentPairRequests,
  tournamentWaitlist, tournamentAdmins, tournamentPrizes,
  users, clubs, venues, playerProfiles, matches,
  notifications, clubMemberships, internalMessages
} from "@shared/schema";

export function registerTournamentRoutes(app: Express) {

  app.get("/api/tournaments", async (req, res) => {
    try {
      const clubId = req.query.clubId ? Number(req.query.clubId) : undefined;
      const where = clubId ? eq(tournaments.clubId, clubId) : undefined;
      const result = await db.select().from(tournaments).where(where).orderBy(desc(tournaments.createdAt));
      res.json(result);
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
        bannerUrl, maxPlayers, skillLevelMin, skillLevelMax, registrationDeadline,
        location, socialLinks, entryFee, prizeInfo, rules, groupsPerSide, pairsPerGroup } = req.body;
      const [t] = await db.insert(tournaments).values({
        name, clubId, type, startDate: new Date(startDate), endDate: new Date(endDate),
        description, courtsAvailable: courtsAvailable || 4, createdBy: req.user!.id,
        bannerUrl, maxPlayers, skillLevelMin, skillLevelMax,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        location, socialLinks, entryFee, prizeInfo, rules, groupsPerSide, pairsPerGroup,
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
      const updates: any = {};
      const allowed = ["name", "status", "description", "courtsAvailable", "bannerUrl", "maxPlayers",
        "skillLevelMin", "skillLevelMax", "location", "socialLinks", "isLocked",
        "entryFee", "prizeInfo", "rules", "groupsPerSide", "pairsPerGroup", "type"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (req.body.startDate) updates.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updates.endDate = new Date(req.body.endDate);
      if (req.body.registrationDeadline) updates.registrationDeadline = new Date(req.body.registrationDeadline);
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
      const [cat] = await db.update(tournamentCategories).set(req.body).where(eq(tournamentCategories.id, Number(req.params.id))).returning();
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tournament-categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));
      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
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

      const enriched = matchList.map(m => ({
        ...m,
        teamA: m.teamAId ? teamMap.get(m.teamAId) || null : null,
        teamB: m.teamBId ? teamMap.get(m.teamBId) || null : null,
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

  app.post("/api/tournament-categories/:id/generate-matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const catId = Number(req.params.id);
      const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, catId));
      if (!cat) return res.status(404).json({ message: "Category not found" });

      const teams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, catId)).orderBy(asc(tournamentTeams.seedNumber));
      if (teams.length < 2) return res.status(400).json({ message: "Need at least 2 teams" });

      await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, catId));
      await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, catId));

      if (cat.format === "ROUND_ROBIN") {
        let order = 0;
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: teams[i].id, teamBId: teams[j].id,
              round: 1, matchOrder: order++, groupNumber: 1,
            });
          }
        }
        for (const team of teams) {
          await db.insert(tournamentStandings).values({ categoryId: catId, teamId: team.id, groupNumber: 1 });
        }
      } else if (cat.format === "GROUP_KNOCKOUT") {
        const groupCount = cat.groupCount || 2;
        const teamsPerGroup = Math.ceil(teams.length / groupCount);
        const groups: typeof teams[] = Array.from({ length: groupCount }, () => []);
        teams.forEach((t, i) => groups[i % groupCount].push(t));

        let order = 0;
        for (let g = 0; g < groups.length; g++) {
          const groupTeams = groups[g];
          const gNum = g + 1;
          for (const t of groupTeams) {
            await db.update(tournamentTeams).set({ groupNumber: gNum }).where(eq(tournamentTeams.id, t.id));
          }
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              await db.insert(tournamentMatches).values({
                categoryId: catId, teamAId: groupTeams[i].id, teamBId: groupTeams[j].id,
                round: 1, matchOrder: order++, groupNumber: gNum,
              });
            }
          }
          for (const t of groupTeams) {
            await db.insert(tournamentStandings).values({ categoryId: catId, teamId: t.id, groupNumber: gNum });
          }
        }
      } else {
        const n = teams.length;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
        const byes = totalSlots - n;
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
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: null, teamBId: null,
              round, matchOrder: i / 2, bracketPosition: i / 2,
            }).returning();
            nextRound.push(m);
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

  app.patch("/api/tournament-matches/:id/score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const matchId = Number(req.params.id);
      const { scores, winnerId } = req.body;
      const updates: any = { scores, status: "FINISHED" as const };
      if (winnerId) updates.winnerId = winnerId;

      const [match] = await db.update(tournamentMatches).set(updates).where(eq(tournamentMatches.id, matchId)).returning();

      if (match.groupNumber && match.winnerId) {
        const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
        const [cat] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, match.categoryId));
        const ppw = cat?.pointsPerWin || 2;
        const ppl = cat?.pointsPerLoss || 0;
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
            points = points + ${ppw}
          WHERE category_id = ${match.categoryId} AND team_id = ${match.winnerId}
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
              points = points + ${ppl}
            WHERE category_id = ${match.categoryId} AND team_id = ${loserId}
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

      res.json(match);
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

      if (cat.format === "GROUP_KNOCKOUT") {
        const standingsList = await db.select().from(tournamentStandings).where(eq(tournamentStandings.categoryId, catId))
          .orderBy(asc(tournamentStandings.groupNumber), desc(tournamentStandings.points), desc(tournamentStandings.gamesWon));
        const groupCount = cat.groupCount || 2;
        const advancePerGroup = cat.advancePerGroup || 2;
        const qualifiers: number[] = [];
        for (let g = 1; g <= groupCount; g++) {
          const groupStandings = standingsList.filter(s => s.groupNumber === g);
          qualifiers.push(...groupStandings.slice(0, advancePerGroup).map(s => s.teamId));
        }
        if (qualifiers.length < 2) return res.status(400).json({ message: "Not enough qualifiers" });

        const existingKO = await db.select().from(tournamentMatches)
          .where(and(eq(tournamentMatches.categoryId, catId), sql`${tournamentMatches.groupNumber} IS NULL`));
        if (existingKO.length > 0) return res.json({ message: "Knockout already generated" });

        const n = qualifiers.length;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
        let matchIdx = 0;
        const round1: any[] = [];
        for (let i = 0; i < totalSlots / 2; i++) {
          const tA = i < qualifiers.length ? qualifiers[i] : null;
          const tB = (totalSlots - 1 - i) < qualifiers.length ? qualifiers[totalSlots - 1 - i] : null;
          if (tA && tB) {
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: tA, teamBId: tB,
              round: 100, matchOrder: matchIdx++, bracketPosition: i,
            }).returning();
            round1.push(m);
          } else if (tA) {
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: tA, teamBId: null,
              round: 100, matchOrder: matchIdx++, bracketPosition: i,
              isBye: true, winnerId: tA, status: "FINISHED",
            }).returning();
            round1.push(m);
          }
        }
        let currentRound = round1;
        let roundNum = 101;
        while (currentRound.length > 1) {
          const nextRound: any[] = [];
          for (let i = 0; i < currentRound.length; i += 2) {
            const [m] = await db.insert(tournamentMatches).values({
              categoryId: catId, teamAId: null, teamBId: null,
              round: roundNum, matchOrder: i / 2, bracketPosition: i / 2,
            }).returning();
            nextRound.push(m);
          }
          currentRound = nextRound;
          roundNum++;
        }
        for (const m of round1) {
          if (m.winnerId) {
            const nextPos = Math.floor(m.bracketPosition! / 2);
            const nextMatch = await db.select().from(tournamentMatches)
              .where(and(eq(tournamentMatches.categoryId, catId), eq(tournamentMatches.round, 101), eq(tournamentMatches.bracketPosition, nextPos)));
            if (nextMatch[0]) {
              const isFirst = m.bracketPosition! % 2 === 0;
              const upd: any = isFirst ? { teamAId: m.winnerId } : { teamBId: m.winnerId };
              await db.update(tournamentMatches).set(upd).where(eq(tournamentMatches.id, nextMatch[0].id));
            }
          }
        }
        return res.json({ message: "Knockout stage generated", qualifiers: qualifiers.length });
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
      const { registrationType, partnerId, partnerName, categoryId } = req.body;

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

      const [reg] = await db.insert(tournamentRegistrations).values({
        tournamentId, userId, registrationType: registrationType || "INDIVIDUAL",
        partnerId: partnerId || null, partnerName: partnerName || null,
        status, categoryId: categoryId || null,
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
      const [reg] = await db.update(tournamentRegistrations).set(updates)
        .where(eq(tournamentRegistrations.id, Number(req.params.id))).returning();

      if (status === "REJECTED") {
        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, reg.tournamentId));
        if (tournament?.maxPlayers) {
          const waitlistEntries = await db.select().from(tournamentWaitlist)
            .where(eq(tournamentWaitlist.tournamentId, reg.tournamentId))
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
      await db.delete(tournamentRegistrations).where(eq(tournamentRegistrations.id, regId));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tournaments/:id/player-pool", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      const individuals = await db.select().from(tournamentRegistrations)
        .where(and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.registrationType, "INDIVIDUAL"),
          eq(tournamentRegistrations.status, "APPROVED"),
        ));
      const enriched = await Promise.all(individuals.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        const totalMatches = profile ? await db.select({ count: sql<number>`count(*)::int` }).from(matches)
          .where(and(eq(matches.isCompleted, true), or(
            eq(matches.teamAPlayer1Id, profile.id), eq(matches.teamAPlayer2Id, profile.id),
            eq(matches.teamBPlayer1Id, profile.id), eq(matches.teamBPlayer2Id, profile.id),
          ))) : [{ count: 0 }];
        const wonMatches = profile ? await db.select({ count: sql<number>`count(*)::int` }).from(matches)
          .where(and(eq(matches.isCompleted, true), or(
            and(or(eq(matches.teamAPlayer1Id, profile.id), eq(matches.teamAPlayer2Id, profile.id)), sql`${matches.scoreA} > ${matches.scoreB}`),
            and(or(eq(matches.teamBPlayer1Id, profile.id), eq(matches.teamBPlayer2Id, profile.id)), sql`${matches.scoreB} > ${matches.scoreA}`),
          ))) : [{ count: 0 }];
        return {
          ...reg, user, profile,
          matchesPlayed: totalMatches[0]?.count || 0,
          matchesWon: wonMatches[0]?.count || 0,
          winRate: (totalMatches[0]?.count || 0) > 0 ? Math.round(((wonMatches[0]?.count || 0) / (totalMatches[0]?.count || 1)) * 100) : 0,
        };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tournaments/:id/pair-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournamentId = Number(req.params.id);
      const { toUserId, message: pairMessage, pairName } = req.body;
      const existing = await db.select().from(tournamentPairRequests)
        .where(and(
          eq(tournamentPairRequests.tournamentId, tournamentId),
          eq(tournamentPairRequests.fromUserId, req.user!.id),
          eq(tournamentPairRequests.toUserId, toUserId),
          eq(tournamentPairRequests.status, "PENDING"),
        ));
      if (existing.length > 0) return res.status(400).json({ message: "Request already sent" });

      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
      const tournamentName = tournament?.name || "a tournament";

      const [pr] = await db.insert(tournamentPairRequests).values({
        tournamentId, fromUserId: req.user!.id, toUserId, message: pairMessage, pairName: pairName || null,
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
      const [pr] = await db.update(tournamentPairRequests).set({ status })
        .where(eq(tournamentPairRequests.id, Number(req.params.id))).returning();

      if (status === "ACCEPTED") {
        await db.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: pr.toUserId })
          .where(and(eq(tournamentRegistrations.tournamentId, pr.tournamentId), eq(tournamentRegistrations.userId, pr.fromUserId)));
        await db.update(tournamentRegistrations).set({ registrationType: "PAIR", partnerId: pr.fromUserId })
          .where(and(eq(tournamentRegistrations.tournamentId, pr.tournamentId), eq(tournamentRegistrations.userId, pr.toUserId)));

        const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, pr.tournamentId));
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

  app.get("/api/tournaments/:id/pairs", async (req, res) => {
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
      for (const reg of pairs) {
        if (!reg.partnerId) continue;
        const key = [Math.min(reg.userId, reg.partnerId), Math.max(reg.userId, reg.partnerId)].join("-");
        if (seen.has(key)) continue;
        seen.add(key);
        const [user1] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, reg.userId));
        const [user2] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, reg.partnerId));
        const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.partnerId));
        uniquePairs.push({ id: reg.id, user1, user2, profile1: p1, profile2: p2 });
      }
      res.json(uniquePairs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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

      const enriched = await Promise.all(regs.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, reg.userId));
        let matchesPlayed = 0, matchesWon = 0;
        if (profile) {
          const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(matches)
            .where(and(eq(matches.isCompleted, true), or(
              eq(matches.teamAPlayer1Id, profile.id), eq(matches.teamAPlayer2Id, profile.id),
              eq(matches.teamBPlayer1Id, profile.id), eq(matches.teamBPlayer2Id, profile.id),
            )));
          matchesPlayed = total?.count || 0;
          const [won] = await db.select({ count: sql<number>`count(*)::int` }).from(matches)
            .where(and(eq(matches.isCompleted, true), or(
              and(or(eq(matches.teamAPlayer1Id, profile.id), eq(matches.teamAPlayer2Id, profile.id)), sql`${matches.scoreA} > ${matches.scoreB}`),
              and(or(eq(matches.teamBPlayer1Id, profile.id), eq(matches.teamBPlayer2Id, profile.id)), sql`${matches.scoreB} > ${matches.scoreA}`),
            )));
          matchesWon = won?.count || 0;
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

      const enriched = await Promise.all(regs.map(async (reg) => {
        const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users).where(eq(users.id, reg.userId));
        return { ...reg, user };
      }));

      const entryFee = parseFloat(tournament.entryFee || "0");
      const totalExpected = enriched.filter(r => r.status === "APPROVED").length * entryFee;
      const totalCollected = enriched.filter(r => r.paymentStatus === "PAID").length * entryFee;
      const totalPending = enriched.filter(r => r.paymentStatus === "PENDING").length * entryFee;
      const unpaidCount = enriched.filter(r => r.paymentStatus === "UNPAID" && r.status === "APPROVED").length;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      res.json({
        entryFee,
        totalExpected,
        totalCollected,
        totalPending,
        unpaidCount,
        collectionRate,
        playerCount: enriched.filter(r => r.status === "APPROVED").length,
        players: enriched,
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
          body: `${player?.fullName} has confirmed their payment of £${tournament?.entryFee || "0"} for "${tournament?.name}". Payment method: ${paymentMethod || "Bank Transfer"}. Please verify and approve.`,
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
          message: `Your payment of £${tournament?.entryFee || "0"} for "${tournament?.name}" has been confirmed. You're all set!`,
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
}
