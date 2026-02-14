import { db } from "./db";
import { 
  playerProfiles, matches, sessions, sessionSignups, clubs,
  GRADE_ORDER, type Grade, type PlayerProfile
} from "@shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

const PROMOTION_WIN_RATE = 0.55;
const DEMOTION_WIN_RATE = 0.40;
const MIN_GAMES = 10;
const MIN_SESSIONS = 3;
const ROLLING_WINDOW_SESSIONS = 5;

export interface GradingStats {
  gamesPlayed: number;
  gamesWon: number;
  sessionsCounted: number;
  winRate: number;
  promotionEligible: boolean;
  demotionRisk: boolean;
  currentGrade: string;
  adminLocked: boolean;
}

function getGradeIndex(grade: string): number {
  return GRADE_ORDER.indexOf(grade as Grade);
}

function promoteOneGrade(currentGrade: string): string {
  const idx = getGradeIndex(currentGrade);
  if (idx < 0 || idx >= GRADE_ORDER.length - 1) return currentGrade;
  return GRADE_ORDER[idx + 1];
}

function demoteOneGrade(currentGrade: string): string {
  const idx = getGradeIndex(currentGrade);
  if (idx <= 0) return currentGrade;
  return GRADE_ORDER[idx - 1];
}

export async function computePlayerGradingStats(
  profileId: number,
  clubId: number,
  gradingResetAt?: Date | null
): Promise<GradingStats> {
  const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).then(r => r[0]);
  
  if (!profile) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      sessionsCounted: 0,
      winRate: 0,
      promotionEligible: false,
      demotionRisk: false,
      currentGrade: "C3",
      adminLocked: false,
    };
  }

  const recentSessions = await db
    .select({ id: sessions.id, date: sessions.date })
    .from(sessions)
    .innerJoin(sessionSignups, eq(sessionSignups.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.clubId, clubId),
        eq(sessionSignups.playerProfileId, profileId),
        gradingResetAt ? sql`${sessions.date} >= ${gradingResetAt}` : undefined
      )
    )
    .orderBy(desc(sessions.date))
    .limit(ROLLING_WINDOW_SESSIONS);

  if (recentSessions.length === 0) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      sessionsCounted: 0,
      winRate: 0,
      promotionEligible: false,
      demotionRisk: false,
      currentGrade: profile.grade || "C3",
      adminLocked: profile.adminLocked,
    };
  }

  const sessionIds = recentSessions.map(s => s.id);

  const completedMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        inArray(matches.sessionId, sessionIds),
        eq(matches.isCompleted, true)
      )
    );

  let gamesPlayed = 0;
  let gamesWon = 0;

  for (const match of completedMatches) {
    const isTeamA =
      match.teamAPlayer1Id === profileId || match.teamAPlayer2Id === profileId;
    const isTeamB =
      match.teamBPlayer1Id === profileId || match.teamBPlayer2Id === profileId;

    if (!isTeamA && !isTeamB) continue;

    gamesPlayed++;

    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;
    const setsWonA = match.setsWonA ?? 0;
    const setsWonB = match.setsWonB ?? 0;

    let teamAWon: boolean;
    if (match.numberOfSets > 1) {
      teamAWon = setsWonA > setsWonB;
    } else {
      teamAWon = scoreA > scoreB;
    }

    if ((isTeamA && teamAWon) || (isTeamB && !teamAWon)) {
      gamesWon++;
    }
  }

  const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;
  const sessionsCounted = recentSessions.length;

  const meetsThresholds = gamesPlayed >= MIN_GAMES && sessionsCounted >= MIN_SESSIONS;
  const promotionEligible = meetsThresholds && winRate >= PROMOTION_WIN_RATE && !profile.adminLocked;
  const demotionRisk = meetsThresholds && winRate <= DEMOTION_WIN_RATE && !profile.adminLocked;

  return {
    gamesPlayed,
    gamesWon,
    sessionsCounted,
    winRate,
    promotionEligible,
    demotionRisk,
    currentGrade: profile.grade || "C3",
    adminLocked: profile.adminLocked,
  };
}

export async function evaluatePlayerGrade(profileId: number, clubId: number): Promise<{ changed: boolean; oldGrade: string; newGrade: string } | null> {
  const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).then(r => r[0]);
  if (!profile) return null;

  if (profile.adminLocked) return { changed: false, oldGrade: profile.grade || "C3", newGrade: profile.grade || "C3" };

  const club = await db.select().from(clubs).where(eq(clubs.id, clubId)).then(r => r[0]);
  if (!club || !club.autoGradingEnabled) return { changed: false, oldGrade: profile.grade || "C3", newGrade: profile.grade || "C3" };

  const stats = await computePlayerGradingStats(profileId, clubId, profile.gradingResetAt);

  const currentGrade = profile.grade || "C3";
  let newGrade = currentGrade;

  if (stats.promotionEligible) {
    newGrade = promoteOneGrade(currentGrade);
  } else if (stats.demotionRisk) {
    newGrade = demoteOneGrade(currentGrade);
  }

  if (newGrade !== currentGrade) {
    await db.update(playerProfiles)
      .set({ grade: newGrade })
      .where(eq(playerProfiles.id, profileId));

    return { changed: true, oldGrade: currentGrade, newGrade };
  }

  return { changed: false, oldGrade: currentGrade, newGrade: currentGrade };
}

export async function evaluateClubGrades(clubId: number): Promise<{ profileId: number; oldGrade: string; newGrade: string }[]> {
  const club = await db.select().from(clubs).where(eq(clubs.id, clubId)).then(r => r[0]);
  if (!club || !club.autoGradingEnabled) return [];

  const profiles = await db
    .select()
    .from(playerProfiles)
    .where(
      and(
        eq(playerProfiles.clubId, clubId),
        eq(playerProfiles.adminLocked, false)
      )
    );

  const changes: { profileId: number; oldGrade: string; newGrade: string }[] = [];

  for (const profile of profiles) {
    const result = await evaluatePlayerGrade(profile.id, clubId);
    if (result && result.changed) {
      changes.push({ profileId: profile.id, oldGrade: result.oldGrade, newGrade: result.newGrade });
    }
  }

  return changes;
}

export async function evaluateAllClubsGrades(): Promise<void> {
  const allClubs = await db.select({ id: clubs.id, autoGradingEnabled: clubs.autoGradingEnabled }).from(clubs);

  for (const club of allClubs) {
    if (club.autoGradingEnabled) {
      await evaluateClubGrades(club.id);
    }
  }
}
