import { db } from "./db";
import {
  playerProfiles, matches, sessions, sessionSignups, clubs, gradeHistory,
  GRADE_ORDER, type Grade,
} from "@shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

/**
 * ==============================================================================
 * PLAYER GRADING ENGINE v2 — "Fair Play" rules
 * ==============================================================================
 * Designed to feel motivating, stable, and fair: encourages attendance, reduces
 * frustration after one bad night, and still separates skill levels accurately.
 *
 *  Window:        last 7 sessions, expanded to cover at least 20 matches
 *  Min activity:  12 games AND 3 sessions before any auto-movement
 *
 *  Promotion:
 *    • Weighted win rate ≥ 58%                                  → promote
 *    • Weighted win rate ≥ 55% on 2 consecutive evaluations     → promote
 *
 *  Demotion (only if not Protected / not Graced / not Locked):
 *    • Weighted win rate < 35%                                  → demote
 *    • Weighted win rate < 40% on 2 consecutive evaluations     → demote
 *
 *  Opponent strength weighting:
 *    weight = 1 + 0.10 × (opponentGradeIdx − selfGradeIdx)
 *    clamped to [0.6, 1.4]. A win over a stronger player counts more,
 *    a loss to a stronger player counts less, and vice-versa.
 *
 *  Protections:
 *    • Newly promoted: cannot be demoted for the next 2 sessions
 *    • Returning player: 60+ days inactive before this window → grace period
 *      (no demotion for first 2 sessions back)
 *
 *  Status labels (for UI):
 *    Locked, Protected, Ready to Move Up, Needs Review, Stable, Building Profile
 * ==============================================================================
 */

export const GRADING_CONFIG = {
  ROLLING_WINDOW_SESSIONS: 7,
  ROLLING_WINDOW_MIN_MATCHES: 20,
  MIN_GAMES: 12,
  MIN_SESSIONS: 3,
  PROMOTION_FAST: 0.58,
  PROMOTION_SLOW: 0.55,
  DEMOTION_FAST: 0.35,
  DEMOTION_SLOW: 0.40,
  PROMOTION_STREAK_REQUIRED: 2,
  DEMOTION_STREAK_REQUIRED: 2,
  PROTECTION_SESSIONS_AFTER_PROMOTION: 2,
  GRACE_DAYS_INACTIVE: 60,
  GRACE_SESSIONS_RETURNING: 2,
  OPPONENT_WEIGHT_PER_TIER: 0.10,
  OPPONENT_WEIGHT_MIN: 0.6,
  OPPONENT_WEIGHT_MAX: 1.4,
} as const;

export type GradingStatus =
  | "LOCKED"
  | "PROTECTED"
  | "READY_TO_MOVE_UP"
  | "NEEDS_REVIEW"
  | "STABLE"
  | "BUILDING_PROFILE";

export const GRADING_STATUS_LABEL: Record<GradingStatus, string> = {
  LOCKED: "Locked",
  PROTECTED: "Protected",
  READY_TO_MOVE_UP: "Ready to Move Up",
  NEEDS_REVIEW: "Needs Review",
  STABLE: "Stable",
  BUILDING_PROFILE: "Building Profile",
};

export interface GradingStats {
  gamesPlayed: number;
  gamesWon: number;
  sessionsCounted: number;
  winRate: number;            // weighted win rate (used for thresholds)
  rawWinRate: number;         // un-weighted, for reference / display
  promotionEligible: boolean;
  demotionRisk: boolean;
  currentGrade: string;
  adminLocked: boolean;
  isProtected: boolean;
  isReturning: boolean;
  status: GradingStatus;
  promotionStreak: number;
  demotionStreak: number;
}

const idx = (g: string) => GRADE_ORDER.indexOf(g as Grade);
const promote = (g: string) => idx(g) >= GRADE_ORDER.length - 1 ? g : GRADE_ORDER[idx(g) + 1];
const demote = (g: string) => idx(g) <= 0 ? g : GRADE_ORDER[idx(g) - 1];

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function deriveStatus(p: {
  adminLocked: boolean;
  isProtected: boolean;
  meetsMinActivity: boolean;
  promotionEligible: boolean;
  demotionRisk: boolean;
}): GradingStatus {
  if (p.adminLocked) return "LOCKED";
  if (p.isProtected) return "PROTECTED";
  if (!p.meetsMinActivity) return "BUILDING_PROFILE";
  if (p.promotionEligible) return "READY_TO_MOVE_UP";
  if (p.demotionRisk) return "NEEDS_REVIEW";
  return "STABLE";
}

/**
 * Compute the rolling-window stats used by the grading engine.
 * Window = last `ROLLING_WINDOW_SESSIONS` sessions, expanded backwards if
 * needed so that the player has at least `ROLLING_WINDOW_MIN_MATCHES` matches.
 */
export async function computePlayerGradingStats(
  profileId: number,
  clubId: number,
  gradingResetAt?: Date | null,
): Promise<GradingStats> {
  const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).then(r => r[0]);

  if (!profile) {
    return {
      gamesPlayed: 0, gamesWon: 0, sessionsCounted: 0,
      winRate: 0, rawWinRate: 0,
      promotionEligible: false, demotionRisk: false,
      currentGrade: "C3", adminLocked: false,
      isProtected: false, isReturning: false,
      status: "BUILDING_PROFILE",
      promotionStreak: 0, demotionStreak: 0,
    };
  }

  const currentGrade = profile.grade || "C3";
  const selfGradeIdx = idx(currentGrade);

  // Pull recent sessions (signed up to) — first try the configured window;
  // expand if we don't have enough matches yet.
  const allSignedUpSessions = await db
    .select({ id: sessions.id, date: sessions.date })
    .from(sessions)
    .innerJoin(sessionSignups, eq(sessionSignups.sessionId, sessions.id))
    .where(and(
      eq(sessions.clubId, clubId),
      eq(sessionSignups.playerId, profileId),
      gradingResetAt ? sql`${sessions.date} >= ${gradingResetAt}` : undefined,
    ))
    .orderBy(desc(sessions.date));

  if (allSignedUpSessions.length === 0) {
    const meets = false;
    return {
      gamesPlayed: 0, gamesWon: 0, sessionsCounted: 0,
      winRate: 0, rawWinRate: 0,
      promotionEligible: false, demotionRisk: false,
      currentGrade, adminLocked: profile.adminLocked,
      isProtected: false, isReturning: false,
      status: deriveStatus({ adminLocked: profile.adminLocked, isProtected: false, meetsMinActivity: meets, promotionEligible: false, demotionRisk: false }),
      promotionStreak: profile.promotionStreak ?? 0,
      demotionStreak: profile.demotionStreak ?? 0,
    };
  }

  // Step 1: take the last N sessions
  let window = allSignedUpSessions.slice(0, GRADING_CONFIG.ROLLING_WINDOW_SESSIONS);
  let sessionIds = window.map(s => s.id);

  // Pull completed matches in those sessions where this player participated
  let playerMatches = sessionIds.length > 0 ? await fetchPlayerMatches(profileId, sessionIds) : [];

  // Step 2: expand window if we don't yet have enough matches
  let cursor = GRADING_CONFIG.ROLLING_WINDOW_SESSIONS;
  while (playerMatches.length < GRADING_CONFIG.ROLLING_WINDOW_MIN_MATCHES && cursor < allSignedUpSessions.length) {
    const next = allSignedUpSessions[cursor];
    cursor++;
    window.push(next);
    sessionIds = [...sessionIds, next.id];
    const more = await fetchPlayerMatches(profileId, [next.id]);
    playerMatches = [...playerMatches, ...more];
  }

  // Compute weighted + raw stats
  let gamesPlayed = 0;
  let gamesWon = 0;
  let weightedWinScore = 0;
  let weightedTotal = 0;

  // Pre-fetch grades of opponents (and partners ignored) in one go
  const oppIds = new Set<number>();
  for (const m of playerMatches) {
    for (const id of m.opponents) if (id != null) oppIds.add(id);
  }
  const oppGradeMap = new Map<number, string>();
  if (oppIds.size > 0) {
    const rows = await db.select({ id: playerProfiles.id, grade: playerProfiles.grade })
      .from(playerProfiles)
      .where(inArray(playerProfiles.id, [...oppIds]));
    for (const r of rows) oppGradeMap.set(r.id, r.grade || "C3");
  }

  for (const m of playerMatches) {
    if (m.tied) continue; // ignore tied matches
    gamesPlayed++;
    if (m.won) gamesWon++;

    // Average opponent grade index
    const opps = m.opponents.filter((x): x is number => x != null);
    if (opps.length === 0) continue;
    const avgOppIdx = opps.reduce((s, id) => s + idx(oppGradeMap.get(id) || currentGrade), 0) / opps.length;
    const tierDiff = avgOppIdx - selfGradeIdx; // +ve = stronger opponents
    const weight = clamp(
      1 + GRADING_CONFIG.OPPONENT_WEIGHT_PER_TIER * tierDiff,
      GRADING_CONFIG.OPPONENT_WEIGHT_MIN,
      GRADING_CONFIG.OPPONENT_WEIGHT_MAX,
    );

    weightedTotal += weight;
    if (m.won) weightedWinScore += weight;
  }

  const sessionsCounted = window.length;
  const rawWinRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;
  const winRate = weightedTotal > 0 ? weightedWinScore / weightedTotal : rawWinRate;

  // ---------- Protections ----------
  const promotionStreak = profile.promotionStreak ?? 0;
  const demotionStreak = profile.demotionStreak ?? 0;

  const lastChange = await db.select()
    .from(gradeHistory)
    .where(and(eq(gradeHistory.profileId, profileId), eq(gradeHistory.clubId, clubId)))
    .orderBy(desc(gradeHistory.createdAt))
    .limit(1)
    .then(r => r[0]);

  let isProtected = false;
  if (lastChange && lastChange.direction === "PROMOTION") {
    // Count this player's distinct sessions since the promotion date
    const sessionsSincePromo = allSignedUpSessions.filter(s => new Date(s.date) > new Date(lastChange.createdAt)).length;
    if (sessionsSincePromo < GRADING_CONFIG.PROTECTION_SESSIONS_AFTER_PROMOTION) {
      isProtected = true;
    }
  }

  // Returning player grace: prior to this window the player had a long absence
  let isReturning = false;
  if (allSignedUpSessions.length > sessionsCounted) {
    const earliestInWindow = window[window.length - 1];
    const justBefore = allSignedUpSessions[sessionsCounted];
    if (earliestInWindow && justBefore) {
      const gapDays = (new Date(earliestInWindow.date).getTime() - new Date(justBefore.date).getTime()) / 86_400_000;
      if (gapDays >= GRADING_CONFIG.GRACE_DAYS_INACTIVE && sessionsCounted < GRADING_CONFIG.GRACE_SESSIONS_RETURNING + 1) {
        isReturning = true;
      }
    }
  }

  // ---------- Eligibility ----------
  const meetsMinActivity = gamesPlayed >= GRADING_CONFIG.MIN_GAMES && sessionsCounted >= GRADING_CONFIG.MIN_SESSIONS;

  const fastPromote = winRate >= GRADING_CONFIG.PROMOTION_FAST;
  const slowPromoteNow = winRate >= GRADING_CONFIG.PROMOTION_SLOW;
  const slowPromoteReady = slowPromoteNow && (promotionStreak + 1) >= GRADING_CONFIG.PROMOTION_STREAK_REQUIRED;
  const promotionEligible = !profile.adminLocked && meetsMinActivity && (fastPromote || slowPromoteReady);

  const fastDemote = winRate < GRADING_CONFIG.DEMOTION_FAST;
  const slowDemoteNow = winRate < GRADING_CONFIG.DEMOTION_SLOW;
  const slowDemoteReady = slowDemoteNow && (demotionStreak + 1) >= GRADING_CONFIG.DEMOTION_STREAK_REQUIRED;
  const demotionRisk = !profile.adminLocked && !isProtected && !isReturning && meetsMinActivity && (fastDemote || slowDemoteReady);

  return {
    gamesPlayed, gamesWon, sessionsCounted,
    winRate, rawWinRate,
    promotionEligible, demotionRisk,
    currentGrade, adminLocked: profile.adminLocked,
    isProtected, isReturning,
    status: deriveStatus({
      adminLocked: profile.adminLocked,
      isProtected,
      meetsMinActivity,
      promotionEligible,
      demotionRisk,
    }),
    promotionStreak, demotionStreak,
  };
}

/**
 * Returns the player's matches inside the given session ids, in
 * chronological-desc order, with W/L marker, tied flag and opponent ids.
 */
async function fetchPlayerMatches(profileId: number, sessionIds: number[]) {
  if (sessionIds.length === 0) return [];
  const rows = await db
    .select()
    .from(matches)
    .where(and(inArray(matches.sessionId, sessionIds), eq(matches.isCompleted, true)));

  return rows
    .map(m => {
      const isTeamA = m.teamAPlayer1Id === profileId || m.teamAPlayer2Id === profileId;
      const isTeamB = m.teamBPlayer1Id === profileId || m.teamBPlayer2Id === profileId;
      if (!isTeamA && !isTeamB) return null;
      const useSets = (m.numberOfSets || 1) > 1;
      const aSide = useSets ? (m.setsWonA ?? 0) : (m.scoreA ?? 0);
      const bSide = useSets ? (m.setsWonB ?? 0) : (m.scoreB ?? 0);
      const tied = aSide === bSide;
      const teamAWon = aSide > bSide;
      const won = (isTeamA && teamAWon) || (isTeamB && !teamAWon);
      const opponents = isTeamA
        ? [m.teamBPlayer1Id, m.teamBPlayer2Id]
        : [m.teamAPlayer1Id, m.teamAPlayer2Id];
      return { id: m.id, won, tied, opponents };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Evaluate one player against current rules. Mutates promotion/demotion streak
 * counters on the profile so consecutive-check rules work over time. Performs
 * the actual grade change (and writes a gradeHistory row) when applicable.
 */
export async function evaluatePlayerGrade(profileId: number, clubId: number): Promise<{ changed: boolean; oldGrade: string; newGrade: string } | null> {
  const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).then(r => r[0]);
  if (!profile) return null;

  const currentGrade = profile.grade || "C3";

  if (profile.adminLocked) return { changed: false, oldGrade: currentGrade, newGrade: currentGrade };

  const club = await db.select().from(clubs).where(eq(clubs.id, clubId)).then(r => r[0]);
  if (!club || !club.autoGradingEnabled) return { changed: false, oldGrade: currentGrade, newGrade: currentGrade };

  const stats = await computePlayerGradingStats(profileId, clubId, profile.gradingResetAt);

  const meetsMinActivity = stats.gamesPlayed >= GRADING_CONFIG.MIN_GAMES && stats.sessionsCounted >= GRADING_CONFIG.MIN_SESSIONS;

  // ---------- Streak bookkeeping (only counted when min activity met) ----------
  let nextPromotionStreak = profile.promotionStreak ?? 0;
  let nextDemotionStreak = profile.demotionStreak ?? 0;

  if (meetsMinActivity) {
    if (stats.winRate >= GRADING_CONFIG.PROMOTION_SLOW) nextPromotionStreak = nextPromotionStreak + 1;
    else nextPromotionStreak = 0;

    if (stats.winRate < GRADING_CONFIG.DEMOTION_SLOW) nextDemotionStreak = nextDemotionStreak + 1;
    else nextDemotionStreak = 0;
  }

  // ---------- Decide change ----------
  let newGrade = currentGrade;
  let direction: "PROMOTION" | "DEMOTION" | null = null;

  if (meetsMinActivity && !profile.adminLocked) {
    const fastPromote = stats.winRate >= GRADING_CONFIG.PROMOTION_FAST;
    const slowPromote = stats.winRate >= GRADING_CONFIG.PROMOTION_SLOW &&
      nextPromotionStreak >= GRADING_CONFIG.PROMOTION_STREAK_REQUIRED;

    const canDemote = !stats.isProtected && !stats.isReturning;
    const fastDemote = canDemote && stats.winRate < GRADING_CONFIG.DEMOTION_FAST;
    const slowDemote = canDemote && stats.winRate < GRADING_CONFIG.DEMOTION_SLOW &&
      nextDemotionStreak >= GRADING_CONFIG.DEMOTION_STREAK_REQUIRED;

    if (fastPromote || slowPromote) {
      newGrade = promote(currentGrade);
      direction = "PROMOTION";
    } else if (fastDemote || slowDemote) {
      newGrade = demote(currentGrade);
      direction = "DEMOTION";
    }
  }

  // Always persist updated streak counters (cheap)
  if (nextPromotionStreak !== (profile.promotionStreak ?? 0) || nextDemotionStreak !== (profile.demotionStreak ?? 0)) {
    await db.update(playerProfiles)
      .set({ promotionStreak: nextPromotionStreak, demotionStreak: nextDemotionStreak })
      .where(eq(playerProfiles.id, profileId));
  }

  if (newGrade !== currentGrade && direction) {
    await db.update(playerProfiles)
      .set({
        grade: newGrade,
        gradingResetAt: new Date(),
        promotionStreak: 0,
        demotionStreak: 0,
      })
      .where(eq(playerProfiles.id, profileId));

    await db.insert(gradeHistory).values({
      profileId,
      clubId,
      oldGrade: currentGrade,
      newGrade,
      direction,
      trigger: "AUTO",
      winRate: Math.round(stats.winRate * 100),
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      sessionsCounted: stats.sessionsCounted,
      note: direction === "PROMOTION"
        ? (stats.winRate >= GRADING_CONFIG.PROMOTION_FAST
          ? `Auto promotion — ${(stats.winRate * 100).toFixed(0)}% (≥${GRADING_CONFIG.PROMOTION_FAST * 100}%)`
          : `Auto promotion — ${(stats.winRate * 100).toFixed(0)}% on ${nextPromotionStreak} consecutive checks`)
        : (stats.winRate < GRADING_CONFIG.DEMOTION_FAST
          ? `Auto demotion — ${(stats.winRate * 100).toFixed(0)}% (<${GRADING_CONFIG.DEMOTION_FAST * 100}%)`
          : `Auto demotion — ${(stats.winRate * 100).toFixed(0)}% on ${nextDemotionStreak} consecutive checks`),
    });

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
    .where(and(
      eq(playerProfiles.clubId, clubId),
      eq(playerProfiles.adminLocked, false),
    ));

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
    if (club.autoGradingEnabled) await evaluateClubGrades(club.id);
  }
}
