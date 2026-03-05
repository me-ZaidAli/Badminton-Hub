import { GRADE_ORDER } from "@shared/schema";
import { generateSmartMatches, buildPairingHistory, getGradeRank } from "./matchEngine";

type Player = {
  id: number;
  gender: string | null;
  grade: string | null;
  isPaused: boolean;
  genderOverride?: string | null;
};

type MatchResult = {
  teamAPlayer1Id: number;
  teamAPlayer2Id: number | null;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number | null;
};

type MatchRecord = {
  id: number;
  status: string;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number | null;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number | null;
  scoreA?: number | null;
  scoreB?: number | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
};

type FixedPair = [number, number];

type MatchType = "MIXED" | "MEN_DOUBLES" | "WOMEN_DOUBLES" | "SINGLES";

type PlayerSessionMetrics = {
  playerId: number;
  matchesPlayed: number;
  mixedMatches: number;
  menDoublesMatches: number;
  womenDoublesMatches: number;
  lastMatchTypes: MatchType[];
  partnerHistory: Map<number, number>;
  opponentHistory: Map<number, number>;
  consecutiveMatches: number;
  lastPlayedRound: number;
  roundsSinceLastMatch: number;
  category: string;
  wins: number;
  losses: number;
};

type SessionIntelligenceMetrics = {
  fairnessScore: number;
  genderBalanceScore: number;
  matchQualityAverage: number;
  partnerDiversity: number;
  opponentDiversity: number;
  totalMatches: number;
  totalRounds: number;
  warnings: SessionWarning[];
  playerMetrics: PlayerSessionMetrics[];
};

type SessionWarning = {
  type: "REPEATED_MIXED" | "REPEATED_PARTNER" | "LONG_REST" | "REPEATED_OPPONENT" | "FATIGUE" | "IDLE_PLAYER" | "DOMINANCE";
  playerId: number;
  playerName?: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type SessionStage = "EARLY" | "MID" | "LATE";

type AIBrainOptions = {
  mode: "SOCIAL" | "COMPETITIVE";
  players: Player[];
  playersPerSide: 1 | 2;
  genderType: "MIXED" | "FEMALE" | "MALE";
  queueTarget: number;
  matchHistory: MatchRecord[];
  fixedPairs?: FixedPair[];
  priorityPlayerIds?: number[];
  sessionDurationMinutes?: number;
  elapsedMinutes?: number;
};

type AIGenerateResult = {
  matches: MatchResult[];
  pairConstraintBlocked?: boolean;
  pairConstraintMessage?: string;
  scoringLogs?: any[];
  validationErrors?: string[];
  aiMetrics?: SessionIntelligenceMetrics;
  matchQualities?: number[];
};

const QUALITY_THRESHOLD = 60;
const PARTNER_COOLDOWN_ROUNDS = 4;
const FATIGUE_CONSECUTIVE_LIMIT = 3;
const REST_BONUS_ROUNDS = 2;

function getEffectiveGender(p: Player): string {
  return p.genderOverride || p.gender || "MALE";
}

function getCategoryFromGrade(grade: string | null): string {
  if (!grade) return "D";
  if (grade.startsWith("A")) return "A";
  if (grade.startsWith("B")) return "B";
  if (grade.startsWith("C")) return "C";
  return "D";
}

function classifyMatchType(matchPlayers: { id: number; gender: string }[]): MatchType {
  const females = matchPlayers.filter(p => p.gender === "FEMALE").length;
  const males = matchPlayers.filter(p => p.gender !== "FEMALE").length;
  if (matchPlayers.length === 2) return "SINGLES";
  if (females === 4) return "WOMEN_DOUBLES";
  if (males === 4) return "MEN_DOUBLES";
  return "MIXED";
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function estimateRound(matchIndex: number, courtsAvailable: number): number {
  return Math.floor(matchIndex / Math.max(courtsAvailable, 1)) + 1;
}

export function computeSessionMetrics(
  matchHistory: MatchRecord[],
  players: Player[]
): SessionIntelligenceMetrics {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const completedMatches = matchHistory.filter(m => m.status === "COMPLETED" || m.status === "LIVE");
  const totalMatches = completedMatches.length;
  const courtsEstimate = 3;
  const totalRounds = Math.ceil(totalMatches / courtsEstimate);
  const warnings: SessionWarning[] = [];

  const metricsMap = new Map<number, PlayerSessionMetrics>();

  for (const p of players) {
    metricsMap.set(p.id, {
      playerId: p.id,
      matchesPlayed: 0,
      mixedMatches: 0,
      menDoublesMatches: 0,
      womenDoublesMatches: 0,
      lastMatchTypes: [],
      partnerHistory: new Map(),
      opponentHistory: new Map(),
      consecutiveMatches: 0,
      lastPlayedRound: 0,
      roundsSinceLastMatch: totalRounds,
      category: getCategoryFromGrade(p.grade),
      wins: 0,
      losses: 0,
    });
  }

  completedMatches.forEach((match, idx) => {
    const round = estimateRound(idx, courtsEstimate);
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
    const allIds = [...teamA, ...teamB];

    const matchPlayers = allIds.map(id => ({
      id,
      gender: getEffectiveGender(playerMap.get(id) || { id, gender: null, grade: null, isPaused: false }),
    }));
    const matchType = classifyMatchType(matchPlayers);

    const teamAWon = (match.scoreA || 0) > (match.scoreB || 0);

    for (const pid of allIds) {
      const pm = metricsMap.get(pid);
      if (!pm) continue;

      pm.matchesPlayed++;
      pm.lastPlayedRound = round;
      pm.roundsSinceLastMatch = totalRounds - round;
      pm.lastMatchTypes.push(matchType);

      if (matchType === "MIXED") pm.mixedMatches++;
      else if (matchType === "MEN_DOUBLES") pm.menDoublesMatches++;
      else if (matchType === "WOMEN_DOUBLES") pm.womenDoublesMatches++;

      const isTeamA = teamA.includes(pid);
      const partners = (isTeamA ? teamA : teamB).filter(id => id !== pid);
      const opponents = isTeamA ? teamB : teamA;

      for (const partnerId of partners) {
        pm.partnerHistory.set(partnerId, (pm.partnerHistory.get(partnerId) || 0) + 1);
      }
      for (const oppId of opponents) {
        pm.opponentHistory.set(oppId, (pm.opponentHistory.get(oppId) || 0) + 1);
      }

      const won = isTeamA ? teamAWon : !teamAWon;
      if (won) pm.wins++;
      else pm.losses++;
    }
  });

  for (const pm of metricsMap.values()) {
    let consecutive = 0;
    for (let i = completedMatches.length - 1; i >= 0; i--) {
      const m = completedMatches[i];
      const ids = [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
      if (ids.includes(pm.playerId)) {
        consecutive++;
      } else {
        break;
      }
    }
    pm.consecutiveMatches = consecutive;
  }

  const playerMetrics = Array.from(metricsMap.values());

  for (const pm of playerMetrics) {
    if (pm.consecutiveMatches >= FATIGUE_CONSECUTIVE_LIMIT) {
      warnings.push({
        type: "FATIGUE",
        playerId: pm.playerId,
        message: `Player has played ${pm.consecutiveMatches} consecutive matches`,
        severity: pm.consecutiveMatches >= 4 ? "HIGH" : "MEDIUM",
      });
    }

    if (pm.roundsSinceLastMatch >= REST_BONUS_ROUNDS && pm.matchesPlayed > 0) {
      warnings.push({
        type: "LONG_REST",
        playerId: pm.playerId,
        message: `Player has rested for ${pm.roundsSinceLastMatch} rounds`,
        severity: pm.roundsSinceLastMatch >= 3 ? "HIGH" : "MEDIUM",
      });
    }

    if (pm.matchesPlayed === 0 && totalMatches > 2) {
      warnings.push({
        type: "IDLE_PLAYER",
        playerId: pm.playerId,
        message: `Player has not played any matches yet`,
        severity: totalMatches >= 4 ? "HIGH" : "MEDIUM",
      });
    }

    const last3 = pm.lastMatchTypes.slice(-3);
    const mixedInLast3 = last3.filter(t => t === "MIXED").length;
    if (mixedInLast3 >= 2 && getEffectiveGender(playerMap.get(pm.playerId)!) !== "FEMALE") {
      warnings.push({
        type: "REPEATED_MIXED",
        playerId: pm.playerId,
        message: `Male player has played ${mixedInLast3} mixed matches in last 3`,
        severity: "MEDIUM",
      });
    }

    for (const [partnerId, count] of pm.partnerHistory) {
      if (count >= 3) {
        warnings.push({
          type: "REPEATED_PARTNER",
          playerId: pm.playerId,
          message: `Has partnered with player ${partnerId} ${count} times`,
          severity: count >= 4 ? "HIGH" : "MEDIUM",
        });
      }
    }

    for (const [oppId, count] of pm.opponentHistory) {
      if (count >= 3) {
        warnings.push({
          type: "REPEATED_OPPONENT",
          playerId: pm.playerId,
          message: `Has faced player ${oppId} ${count} times`,
          severity: count >= 4 ? "HIGH" : "MEDIUM",
        });
      }
    }
  }

  const pairWinCounts = new Map<string, number>();
  for (const match of completedMatches) {
    const teamAWon = (match.scoreA || 0) > (match.scoreB || 0);
    const winTeam = teamAWon
      ? [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[]
      : [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
    if (winTeam.length === 2) {
      const key = pairKey(winTeam[0], winTeam[1]);
      pairWinCounts.set(key, (pairWinCounts.get(key) || 0) + 1);
    }
  }
  for (const [key, count] of pairWinCounts) {
    if (count >= 3) {
      const [a, b] = key.split("-").map(Number);
      warnings.push({
        type: "DOMINANCE",
        playerId: a,
        message: `Pair ${a}+${b} has won ${count} matches together`,
        severity: count >= 4 ? "HIGH" : "MEDIUM",
      });
    }
  }

  const matchCounts = playerMetrics.map(pm => pm.matchesPlayed);
  const maxPlayed = Math.max(...matchCounts, 1);
  const minPlayed = Math.min(...matchCounts);
  const spread = maxPlayed - minPlayed;
  const fairnessScore = Math.max(0, 100 - spread * 15);

  let genderBalanceScore = 100;
  if (totalMatches > 0) {
    const totalMixed = playerMetrics.reduce((s, pm) => s + pm.mixedMatches, 0) / 2;
    const mixedRatio = totalMixed / totalMatches;
    const femaleCount = players.filter(p => getEffectiveGender(p) === "FEMALE").length;
    const maleCount = players.length - femaleCount;
    if (femaleCount > 0 && maleCount > 0) {
      const idealMixedRatio = Math.min(femaleCount, maleCount) / players.length;
      genderBalanceScore = Math.max(0, 100 - Math.abs(mixedRatio - idealMixedRatio) * 200);
    }
  }

  let totalPartnerPairs = 0;
  let uniquePartnerPairs = 0;
  for (const pm of playerMetrics) {
    totalPartnerPairs += pm.partnerHistory.size;
    for (const count of pm.partnerHistory.values()) {
      if (count === 1) uniquePartnerPairs++;
    }
  }
  const partnerDiversity = totalPartnerPairs > 0 ? Math.round((uniquePartnerPairs / totalPartnerPairs) * 100) : 100;

  let totalOpponentPairs = 0;
  let uniqueOpponentPairs = 0;
  for (const pm of playerMetrics) {
    totalOpponentPairs += pm.opponentHistory.size;
    for (const count of pm.opponentHistory.values()) {
      if (count === 1) uniqueOpponentPairs++;
    }
  }
  const opponentDiversity = totalOpponentPairs > 0 ? Math.round((uniqueOpponentPairs / totalOpponentPairs) * 100) : 100;

  const matchQualityAverage = totalMatches > 0
    ? Math.round((fairnessScore + genderBalanceScore + partnerDiversity + opponentDiversity) / 4)
    : 100;

  return {
    fairnessScore: Math.round(fairnessScore),
    genderBalanceScore: Math.round(genderBalanceScore),
    matchQualityAverage,
    partnerDiversity,
    opponentDiversity,
    totalMatches,
    totalRounds,
    warnings,
    playerMetrics,
  };
}

function determineSessionStage(
  elapsedMinutes?: number,
  sessionDurationMinutes?: number,
  totalMatches?: number
): SessionStage {
  if (elapsedMinutes != null && sessionDurationMinutes != null && sessionDurationMinutes > 0) {
    const progress = elapsedMinutes / sessionDurationMinutes;
    if (progress < 0.3) return "EARLY";
    if (progress < 0.7) return "MID";
    return "LATE";
  }
  if (totalMatches != null) {
    if (totalMatches < 4) return "EARLY";
    if (totalMatches < 10) return "MID";
    return "LATE";
  }
  return "MID";
}

function isStrictGenderUnfair(
  candidate: MatchResult,
  playerPool: Player[]
): boolean {
  if (!candidate.teamAPlayer2Id || !candidate.teamBPlayer2Id) return false;

  const getPlayer = (id: number) => playerPool.find(p => p.id === id);
  const p1 = getPlayer(candidate.teamAPlayer1Id);
  const p2 = getPlayer(candidate.teamAPlayer2Id);
  const p3 = getPlayer(candidate.teamBPlayer1Id);
  const p4 = getPlayer(candidate.teamBPlayer2Id);
  if (!p1 || !p2 || !p3 || !p4) return false;

  const teamAGenders = [getEffectiveGender(p1), getEffectiveGender(p2)];
  const teamBGenders = [getEffectiveGender(p3), getEffectiveGender(p4)];

  const teamAHasMale = teamAGenders.includes("MALE");
  const teamAHasFemale = teamAGenders.includes("FEMALE");
  const teamBHasMale = teamBGenders.includes("MALE");
  const teamBHasFemale = teamBGenders.includes("FEMALE");

  const teamAIsMixed = teamAHasMale && teamAHasFemale;
  const teamBIsMixed = teamBHasMale && teamBHasFemale;

  const teamAIsFF = !teamAHasMale && teamAHasFemale;
  const teamBIsFF = !teamBHasMale && teamBHasFemale;
  const teamAIsMM = teamAHasMale && !teamAHasFemale;
  const teamBIsMM = teamBHasMale && !teamBHasFemale;

  if (teamAIsMixed && teamBIsFF) {
    const maleInA = teamAGenders[0] === "MALE" ? p1 : p2;
    const femaleInA = teamAGenders[0] === "FEMALE" ? p1 : p2;
    if (getCategoryFromGrade(femaleInA.grade) === "A") return false;
    return true;
  }
  if (teamBIsMixed && teamAIsFF) {
    const femaleInB = teamBGenders[0] === "FEMALE" ? p3 : p4;
    if (getCategoryFromGrade(femaleInB.grade) === "A") return false;
    return true;
  }

  if (teamAIsMixed && teamBIsMM) {
    const femaleInA = teamAGenders[0] === "FEMALE" ? p1 : p2;
    if (getCategoryFromGrade(femaleInA.grade) === "A") return false;
    return true;
  }
  if (teamBIsMixed && teamAIsMM) {
    const femaleInB = teamBGenders[0] === "FEMALE" ? p3 : p4;
    if (getCategoryFromGrade(femaleInB.grade) === "A") return false;
    return true;
  }

  if (teamAIsFF && teamBIsMM) return true;
  if (teamAIsMM && teamBIsFF) return true;

  return false;
}

function shouldBlockMixedForMale(
  playerId: number,
  metrics: PlayerSessionMetrics
): boolean {
  const last3 = metrics.lastMatchTypes.slice(-3);
  const mixedInLast3 = last3.filter(t => t === "MIXED").length;
  if (mixedInLast3 < 2) return false;

  const recentMenDoubles = metrics.lastMatchTypes
    .slice(-3)
    .filter(t => t === "MEN_DOUBLES").length;
  return recentMenDoubles < 3;
}

function shouldPrioritizeMixedForFemale(
  playerId: number,
  metrics: PlayerSessionMetrics
): boolean {
  const last4 = metrics.lastMatchTypes.slice(-4);
  const womenDoublesInLast4 = last4.filter(t => t === "WOMEN_DOUBLES").length;
  return womenDoublesInLast4 >= 3;
}

function isPartnerOnCooldown(
  playerId: number,
  partnerId: number,
  metrics: PlayerSessionMetrics,
  currentRound: number,
  poolSize: number
): boolean {
  if (poolSize <= 6) return false;

  const partnerCount = metrics.partnerHistory.get(partnerId) || 0;
  if (partnerCount === 0) return false;

  const roundsSincePartner = currentRound - metrics.lastPlayedRound;
  return roundsSincePartner < PARTNER_COOLDOWN_ROUNDS;
}

function computeMatchQualityScore(
  candidate: MatchResult,
  playerPool: Player[],
  metricsMap: Map<number, PlayerSessionMetrics>,
  currentRound: number
): number {
  const getPlayer = (id: number) => playerPool.find(p => p.id === id);
  const teamA = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const allIds = [...teamA, ...teamB];

  let skillBalanceScore = 25;
  const grades = allIds.map(id => getGradeRank(getPlayer(id)?.grade || null));
  const teamAAvg = teamA.reduce((s, id) => s + getGradeRank(getPlayer(id)?.grade || null), 0) / teamA.length;
  const teamBAvg = teamB.reduce((s, id) => s + getGradeRank(getPlayer(id)?.grade || null), 0) / teamB.length;
  const gradeDiff = Math.abs(teamAAvg - teamBAvg);
  skillBalanceScore = Math.max(0, 25 - gradeDiff * 6);

  let categoryScore = 25;
  const categories = allIds.map(id => getCategoryFromGrade(getPlayer(id)?.grade || null));
  const uniqueCategories = new Set(categories).size;
  if (uniqueCategories === 1) categoryScore = 25;
  else if (uniqueCategories === 2) categoryScore = 18;
  else if (uniqueCategories === 3) categoryScore = 10;
  else categoryScore = 5;

  let genderFairnessScore = 25;
  if (candidate.teamAPlayer2Id && candidate.teamBPlayer2Id) {
    if (isStrictGenderUnfair(candidate, playerPool)) {
      genderFairnessScore = 0;
    } else {
      const teamAFemales = teamA.filter(id => getEffectiveGender(getPlayer(id)!) === "FEMALE").length;
      const teamBFemales = teamB.filter(id => getEffectiveGender(getPlayer(id)!) === "FEMALE").length;
      if (Math.abs(teamAFemales - teamBFemales) <= 1) genderFairnessScore = 25;
      else genderFairnessScore = 10;
    }
  }

  let diversityScore = 25;
  let partnerRepeats = 0;
  let opponentRepeats = 0;
  for (const pid of allIds) {
    const pm = metricsMap.get(pid);
    if (!pm) continue;
    const partners = (teamA.includes(pid) ? teamA : teamB).filter(id => id !== pid);
    for (const partnerId of partners) {
      const count = pm.partnerHistory.get(partnerId) || 0;
      if (count > 0) partnerRepeats += count;
    }
    const opponents = teamA.includes(pid) ? teamB : teamA;
    for (const oppId of opponents) {
      const count = pm.opponentHistory.get(oppId) || 0;
      if (count > 0) opponentRepeats += count;
    }
  }
  diversityScore = Math.max(0, 25 - partnerRepeats * 4 - opponentRepeats * 3);

  return Math.round(skillBalanceScore + categoryScore + genderFairnessScore + diversityScore);
}

function computeAIScore(
  candidate: MatchResult,
  playerPool: Player[],
  metricsMap: Map<number, PlayerSessionMetrics>,
  stage: SessionStage,
  currentRound: number,
  mode: "SOCIAL" | "COMPETITIVE",
  pairWinCounts: Map<string, number>,
  baseScore: number
): { score: number; factors: string[] } {
  let score = baseScore;
  const factors: string[] = [];

  const getPlayer = (id: number) => playerPool.find(p => p.id === id);
  const teamA = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const allIds = [...teamA, ...teamB];

  for (const pid of allIds) {
    const pm = metricsMap.get(pid);
    if (!pm) continue;

    if (pm.consecutiveMatches >= FATIGUE_CONSECUTIVE_LIMIT) {
      const penalty = -(pm.consecutiveMatches - FATIGUE_CONSECUTIVE_LIMIT + 1) * 30;
      score += penalty;
      factors.push(`fatigue(${pid}, ${pm.consecutiveMatches} consecutive): ${penalty}`);
    }

    if (pm.roundsSinceLastMatch >= REST_BONUS_ROUNDS) {
      const bonus = pm.roundsSinceLastMatch * 20;
      score += bonus;
      factors.push(`rest bonus(${pid}, ${pm.roundsSinceLastMatch} rounds): +${bonus}`);
    }

    if (pm.matchesPlayed === 0) {
      score += 40;
      factors.push(`idle player(${pid}): +40`);
    }
  }

  if (candidate.teamAPlayer2Id && candidate.teamBPlayer2Id) {
    const matchPlayers = allIds.map(id => ({
      id,
      gender: getEffectiveGender(getPlayer(id)!),
    }));
    const matchType = classifyMatchType(matchPlayers);

    for (const pid of allIds) {
      const pm = metricsMap.get(pid);
      if (!pm) continue;
      const player = getPlayer(pid);
      if (!player) continue;
      const isFemale = getEffectiveGender(player) === "FEMALE";

      if (!isFemale && matchType === "MIXED" && shouldBlockMixedForMale(pid, pm)) {
        score -= 60;
        factors.push(`mixed rotation block(male ${pid}): -60`);
      }

      if (isFemale && matchType === "MIXED" && shouldPrioritizeMixedForFemale(pid, pm)) {
        score += 25;
        factors.push(`mixed priority(female ${pid}): +25`);
      }
    }
  }

  for (const team of [teamA, teamB]) {
    if (team.length === 2) {
      const key = pairKey(team[0], team[1]);
      const wins = pairWinCounts.get(key) || 0;
      if (wins >= 2) {
        const penalty = -(wins - 1) * 20;
        score += penalty;
        factors.push(`anti-dominance(${team[0]}+${team[1]}, ${wins} wins): ${penalty}`);
      }
    }
  }

  for (const pid of allIds) {
    const pm = metricsMap.get(pid);
    if (!pm) continue;
    const partners = (teamA.includes(pid) ? teamA : teamB).filter(id => id !== pid);
    for (const partnerId of partners) {
      if (isPartnerOnCooldown(pid, partnerId, pm, currentRound, playerPool.length)) {
        score -= 35;
        factors.push(`partner cooldown(${pid}+${partnerId}): -35`);
      }
    }
  }

  if (mode === "COMPETITIVE") {
    const teamAGrades = teamA.map(id => getGradeRank(getPlayer(id)?.grade || null));
    const teamBGrades = teamB.map(id => getGradeRank(getPlayer(id)?.grade || null));
    const teamACats = teamA.map(id => getCategoryFromGrade(getPlayer(id)?.grade || null));
    const teamBCats = teamB.map(id => getCategoryFromGrade(getPlayer(id)?.grade || null));

    const allCats = [...teamACats, ...teamBCats];
    const catOrder: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
    const catValues = allCats.map(c => catOrder[c] || 1);
    const catMax = Math.max(...catValues);
    const catMin = Math.min(...catValues);
    const catDiff = catMax - catMin;

    if (catDiff === 0) {
      score += 30;
      factors.push(`same category competitive: +30`);
    } else if (catDiff === 1) {
      score += 10;
      factors.push(`adjacent category competitive: +10`);
    } else {
      const penalty = -catDiff * 25;
      score += penalty;
      factors.push(`category gap(${catDiff}): ${penalty}`);
    }
  }

  if (stage === "EARLY") {
    for (const pid of allIds) {
      const pm = metricsMap.get(pid);
      if (!pm) continue;
      const partners = (teamA.includes(pid) ? teamA : teamB).filter(id => id !== pid);
      for (const partnerId of partners) {
        if (!pm.partnerHistory.has(partnerId)) {
          score += 8;
          factors.push(`early diversity bonus(${pid}+${partnerId}): +8`);
        }
      }
      const opponents = teamA.includes(pid) ? teamB : teamA;
      for (const oppId of opponents) {
        if (!pm.opponentHistory.has(oppId)) {
          score += 5;
          factors.push(`early opp diversity(${pid} vs ${oppId}): +5`);
        }
      }
    }
  } else if (stage === "LATE") {
    for (const pid of allIds) {
      const pm = metricsMap.get(pid);
      if (!pm) continue;
      if (pm.matchesPlayed === 0) {
        score += 60;
        factors.push(`late idle priority(${pid}): +60`);
      }
      const avgPlayed = playerPool.length > 0
        ? Array.from(metricsMap.values()).reduce((s, m) => s + m.matchesPlayed, 0) / metricsMap.size
        : 0;
      if (pm.matchesPlayed < avgPlayed - 1) {
        score += 30;
        factors.push(`late balance(${pid}): +30`);
      }
    }
  }

  return { score, factors };
}

export function applyAIBrainLayer(opts: AIBrainOptions): AIGenerateResult {
  const {
    mode, players, playersPerSide, genderType, queueTarget,
    matchHistory, fixedPairs, priorityPlayerIds,
    sessionDurationMinutes, elapsedMinutes,
  } = opts;

  const completedMatches = matchHistory.filter(m => m.status === "COMPLETED" || m.status === "LIVE");
  const sessionMetrics = computeSessionMetrics(matchHistory, players);
  const metricsMap = new Map(sessionMetrics.playerMetrics.map(pm => [pm.playerId, pm]));

  const stage = determineSessionStage(elapsedMinutes, sessionDurationMinutes, completedMatches.length);
  const currentRound = sessionMetrics.totalRounds + 1;

  const pairWinCounts = new Map<string, number>();
  for (const match of completedMatches) {
    const teamAWon = (match.scoreA || 0) > (match.scoreB || 0);
    const winTeam = teamAWon
      ? [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[]
      : [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
    if (winTeam.length === 2) {
      const key = pairKey(winTeam[0], winTeam[1]);
      pairWinCounts.set(key, (pairWinCounts.get(key) || 0) + 1);
    }
  }

  const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
    matchHistory.map(m => ({
      teamAPlayer1Id: m.teamAPlayer1Id,
      teamAPlayer2Id: m.teamAPlayer2Id,
      teamBPlayer1Id: m.teamBPlayer1Id,
      teamBPlayer2Id: m.teamBPlayer2Id,
      status: m.status,
    }))
  );

  for (const p of players) {
    if (!playerMatchCounts.has(p.id)) {
      playerMatchCounts.set(p.id, 0);
    }
  }

  const aiPriorityIds = [...(priorityPlayerIds || [])];
  for (const pm of sessionMetrics.playerMetrics) {
    if (pm.consecutiveMatches >= FATIGUE_CONSECUTIVE_LIMIT) continue;
    if (pm.roundsSinceLastMatch >= REST_BONUS_ROUNDS && !aiPriorityIds.includes(pm.playerId)) {
      aiPriorityIds.push(pm.playerId);
    }
    if (pm.matchesPlayed === 0 && !aiPriorityIds.includes(pm.playerId)) {
      aiPriorityIds.push(pm.playerId);
    }
  }

  const standardResult = generateSmartMatches({
    mode,
    players,
    playersPerSide,
    genderType,
    queueTarget: Math.max(queueTarget, queueTarget + 2),
    recentPairings,
    recentOpponents,
    playerMatchCounts,
    priorityPlayerIds: aiPriorityIds,
    fixedPairs,
  });

  if (standardResult.pairConstraintBlocked) {
    return {
      ...standardResult,
      aiMetrics: sessionMetrics,
    };
  }

  const qualifiedMatches: MatchResult[] = [];
  const matchQualities: number[] = [];

  for (const candidate of standardResult.matches) {
    if (playersPerSide === 2 && genderType === "MIXED") {
      if (isStrictGenderUnfair(candidate, players)) {
        continue;
      }
    }

    const quality = computeMatchQualityScore(candidate, players, metricsMap, currentRound);

    if (quality < QUALITY_THRESHOLD && standardResult.matches.length > queueTarget) {
      continue;
    }

    const { score } = computeAIScore(
      candidate, players, metricsMap, stage, currentRound, mode, pairWinCounts, quality
    );

    qualifiedMatches.push(candidate);
    matchQualities.push(quality);
  }

  qualifiedMatches.sort((a, b) => {
    const idxA = qualifiedMatches.indexOf(a);
    const idxB = qualifiedMatches.indexOf(b);
    const qA = matchQualities[idxA] || 0;
    const qB = matchQualities[idxB] || 0;
    return qB - qA;
  });

  const finalMatches = qualifiedMatches.slice(0, queueTarget);
  const finalQualities = finalMatches.map((_, i) => {
    const origIdx = qualifiedMatches.indexOf(finalMatches[i]);
    return matchQualities[origIdx] || 0;
  });

  const usedIds = new Set<number>();
  const deduplicatedMatches: MatchResult[] = [];
  const deduplicatedQualities: number[] = [];

  for (let i = 0; i < finalMatches.length; i++) {
    const m = finalMatches[i];
    const ids = [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
    if (ids.some(id => usedIds.has(id))) continue;
    ids.forEach(id => usedIds.add(id));
    deduplicatedMatches.push(m);
    deduplicatedQualities.push(finalQualities[i]);
  }

  return {
    matches: deduplicatedMatches,
    scoringLogs: standardResult.scoringLogs,
    validationErrors: standardResult.validationErrors,
    aiMetrics: sessionMetrics,
    matchQualities: deduplicatedQualities,
  };
}
