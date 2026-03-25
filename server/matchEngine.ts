import { GRADE_ORDER } from "@shared/schema";
import { MatchEngineSettings, MatchmakingMode, DEFAULT_SETTINGS, ScoringBreakdown } from "@shared/matchEngineSettings";

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
  qualityScore?: number;
  breakdown?: ScoringBreakdown;
};

type FixedPair = [number, number];

type EngineSettings = {
  matchScoreHistory?: Map<string, number[]>;
  totalSessionMatches?: number;
  engineConfig?: MatchEngineSettings;
  existingMatchTypeCounts?: { maleOnly: number; femaleOnly: number; mixed: number };
};

type GenerateOptions = {
  mode: "SOCIAL" | "COMPETITIVE";
  players: Player[];
  playersPerSide: 1 | 2;
  genderType: "MIXED" | "FEMALE" | "MALE";
  queueTarget: number;
  recentPairings: Map<string, number>;
  recentOpponents: Map<string, number>;
  playerMatchCounts: Map<number, number>;
  priorityPlayerIds?: number[];
  fixedPairs?: FixedPair[];
  settings?: EngineSettings;
};

type ScoringLog = {
  matchIndex: number;
  candidatesEvaluated: number;
  winner: MatchResult;
  winnerScore: number;
  topFactors: string[];
};

type GenerateResult = {
  matches: MatchResult[];
  pairConstraintBlocked?: boolean;
  pairConstraintMessage?: string;
  scoringLogs?: ScoringLog[];
  validationErrors?: string[];
};

type PlayerState = "AVAILABLE" | "ASSIGNED";

type PlayerStateMap = Map<number, PlayerState>;

type SessionPhase = "EARLY" | "MID" | "LATE";

const gradeRankCache = new Map<string | null, number>();

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function getEffectiveGender(p: Player): string {
  return p.genderOverride || p.gender || "MALE";
}

function getGradeRank(grade: string | null): number {
  if (gradeRankCache.has(grade)) return gradeRankCache.get(grade)!;
  let rank: number;
  if (!grade) {
    rank = 1;
  } else {
    const idx = GRADE_ORDER.indexOf(grade as any);
    if (idx >= 0) {
      rank = idx + 1;
    } else {
      switch (grade) {
        case "A": rank = 8; break;
        case "B": rank = 5; break;
        case "C": rank = 2; break;
        case "D": rank = 1; break;
        default: rank = 1;
      }
    }
  }
  gradeRankCache.set(grade, rank);
  return rank;
}

function isStrongPlayer(grade: string | null): boolean {
  return getGradeRank(grade) >= 6;
}

function isWeakPlayer(grade: string | null): boolean {
  return getGradeRank(grade) <= 2;
}

function isHighGrade(grade: string | null): boolean {
  return getGradeRank(grade) >= 5;
}

function isLowGrade(grade: string | null): boolean {
  return getGradeRank(grade) <= 4;
}

function deterministicSort(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const gradeA = getGradeRank(a.grade);
    const gradeB = getGradeRank(b.grade);
    if (gradeA !== gradeB) return gradeB - gradeA;
    return a.id - b.id;
  });
}

function getFixedPartner(playerId: number, fixedPairs: FixedPair[]): number | null {
  for (const [a, b] of fixedPairs) {
    if (a === playerId) return b;
    if (b === playerId) return a;
  }
  return null;
}

function candidateRespectsFixedPairs(candidate: MatchResult, fixedPairs: FixedPair[]): boolean {
  if (!fixedPairs || fixedPairs.length === 0) return true;

  const teamA = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const allPlayers = [...teamA, ...teamB];

  for (const [p1, p2] of fixedPairs) {
    const p1InMatch = allPlayers.includes(p1);
    const p2InMatch = allPlayers.includes(p2);

    if (p1InMatch && p2InMatch) {
      const p1InA = teamA.includes(p1);
      const p2InA = teamA.includes(p2);
      const p1InB = teamB.includes(p1);
      const p2InB = teamB.includes(p2);

      if (!((p1InA && p2InA) || (p1InB && p2InB))) {
        return false;
      }
    }

    if (p1InMatch !== p2InMatch) {
      return false;
    }
  }

  return true;
}

function opponentPairKey(teamA: number[], teamB: number[]): string {
  const sortedA = [...teamA].sort((a, b) => a - b);
  const sortedB = [...teamB].sort((a, b) => a - b);
  return `${sortedA.join(",")}_vs_${sortedB.join(",")}`;
}

function initPlayerStates(players: Player[]): PlayerStateMap {
  const states: PlayerStateMap = new Map();
  for (const p of players) {
    states.set(p.id, "AVAILABLE");
  }
  return states;
}

function validatePreConditions(players: Player[], playersPerMatch: number): string[] {
  const errors: string[] = [];

  if (players.length < playersPerMatch) {
    errors.push(`Not enough players: have ${players.length}, need ${playersPerMatch}`);
  }

  const idSet = new Set<number>();
  for (const p of players) {
    if (idSet.has(p.id)) {
      errors.push(`Duplicate player ID in input: ${p.id}`);
    }
    idSet.add(p.id);
  }

  return errors;
}

// --- v2 UPGRADE #1: Capped diminishing deficit penalty (v3: configurable) ---
function getDeficitPenalty(deficit: number, cfg?: MatchEngineSettings): number {
  const c = cfg || DEFAULT_SETTINGS;
  if (deficit <= 0) return 0;
  if (deficit === 1) return c.deficitWeight;
  if (deficit === 2) return Math.round(c.deficitWeight * 1.7);
  return c.deficitCap;
}

// --- v2 UPGRADE #4: Strengthened partner variety (v3: configurable) ---
function getPartnerPenalty(repeats: number, cfg?: MatchEngineSettings): number {
  const c = cfg || DEFAULT_SETTINGS;
  if (repeats === 0) return 0;
  if (repeats === 1) return c.partnerRepeatWeight;
  if (repeats === 2) return Math.round(c.partnerRepeatWeight * 2.5);
  if (repeats === 3) return Math.round(c.partnerRepeatWeight * 4);
  return Math.round(c.partnerRepeatWeight * (2 + repeats * 1.5));
}

// --- v2 UPGRADE #6: Rebalanced priority weight (v3: configurable) ---
function getPriorityScore(deficit: number, cfg?: MatchEngineSettings): number {
  const c = cfg || DEFAULT_SETTINGS;
  if (deficit <= 0) return c.priorityHigh;
  return c.priorityLow;
}

// --- v2 UPGRADE #7: Match quality score ---
function getMatchQualityScore(avgRank: number, spread: number): number {
  let score = 0;
  if (spread <= 2) score += 60;
  else if (spread <= 4) score += 20;
  else score -= 40;

  if (avgRank >= 6 && spread <= 2) score += 40;
  if (avgRank <= 3 && spread <= 2) score += 20;

  return score;
}

// --- v2 UPGRADE #8: Session phase logic ---
function getSessionPhase(totalSessionMatches: number, totalPlayers: number): SessionPhase {
  if (totalPlayers <= 0) return "EARLY";
  if (totalSessionMatches < totalPlayers) return "EARLY";
  if (totalSessionMatches < totalPlayers * 2) return "MID";
  return "LATE";
}

function getPhaseWeights(phase: SessionPhase): { deficitMultiplier: number; qualityMultiplier: number; varietyMultiplier: number } {
  switch (phase) {
    case "EARLY": return { deficitMultiplier: 1.0, qualityMultiplier: 0.8, varietyMultiplier: 1.0 };
    case "MID": return { deficitMultiplier: 1.0, qualityMultiplier: 1.0, varietyMultiplier: 1.0 };
    case "LATE": return { deficitMultiplier: 0.7, qualityMultiplier: 1.3, varietyMultiplier: 0.8 };
  }
}

// --- v2 UPGRADE #3: Adaptive candidate limit (v3: configurable) ---
function getCandidateLimit(playerCount: number, cfg?: MatchEngineSettings): number {
  const c = cfg || DEFAULT_SETTINGS;
  const base = c.candidateLimitBase;
  const scaling = c.candidateLimitScaling;
  if (playerCount <= 8) return base;
  if (playerCount <= 12) return base + Math.round(scaling * 3);
  return base + Math.round(scaling * 6);
}

// --- v4: Match quality floor (hard filter with hardGradeSpreadLimit + teamAvgDiffLimit) ---
function passesQualityFloor(candidate: MatchResult, playerPool: Player[], isCompetitive: boolean, isSingles: boolean, cfg?: MatchEngineSettings): boolean {
  const c = cfg || DEFAULT_SETTINGS;
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const grades = ids.map(id => {
    const p = playerPool.find(pp => pp.id === id);
    return p ? getGradeRank(p.grade) : 1;
  });
  const gradeMin = Math.min(...grades);
  const gradeMax = Math.max(...grades);
  const spread = gradeMax - gradeMin;
  const avgRank = grades.reduce((a, b) => a + b, 0) / grades.length;

  if (spread > c.hardGradeSpreadLimit) return false;

  if (isSingles) {
    if (isCompetitive) {
      if (spread > Math.max(c.gradeSpreadLimit - 1, 2)) return false;
    } else {
      if (spread > c.gradeSpreadLimit + 1) return false;
    }
  } else {
    if (spread > c.gradeSpreadLimit) return false;
    if (avgRank >= 6 && spread > Math.max(c.gradeSpreadLimit - 1, 2)) return false;

    if (!isSingles && ids.length === 4) {
      const teamAGrades = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean).map(id => {
        const p = playerPool.find(pp => pp.id === id);
        return p ? getGradeRank(p.grade) : 1;
      });
      const teamBGrades = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean).map(id => {
        const p = playerPool.find(pp => pp.id === id);
        return p ? getGradeRank(p.grade) : 1;
      });
      if (teamAGrades.length === 2 && teamBGrades.length === 2) {
        const teamAAvg = (teamAGrades[0] + teamAGrades[1]) / 2;
        const teamBAvg = (teamBGrades[0] + teamBGrades[1]) / 2;
        const teamDiff = Math.abs(teamAAvg - teamBAvg);
        if (teamDiff > c.teamAvgDiffLimit) return false;
      }
    }
  }

  return true;
}

// --- v2 UPGRADE #10: Match closeness memory ---
function getClosenessBonus(team: number[], opponents: number[], matchScoreHistory?: Map<string, number[]>): { score: number; factors: string[] } {
  if (!matchScoreHistory || matchScoreHistory.size === 0) return { score: 0, factors: [] };
  let score = 0;
  const factors: string[] = [];
  for (const a of team) {
    for (const b of opponents) {
      const key = pairKey(a, b);
      const scores = matchScoreHistory.get(key);
      if (scores && scores.length > 0) {
        const lastDiff = scores[scores.length - 1];
        if (lastDiff <= 5) {
          score += 15;
          factors.push(`close recent match(${a} vs ${b}, diff ${lastDiff}): +15`);
        } else if (lastDiff >= 15) {
          score -= 20;
          factors.push(`one-sided recent(${a} vs ${b}, diff ${lastDiff}): -20`);
        }
      }
    }
  }
  return { score, factors };
}

function fairnessPreFilter(
  available: Player[],
  playerMatchCounts: Map<number, number>,
  playersPerMatch: number,
  states: PlayerStateMap
): Player[] {
  const selectable = available.filter(p => states.get(p.id) === "AVAILABLE");
  if (selectable.length <= playersPerMatch) return selectable;

  const sorted = [...selectable].sort((a, b) => {
    const ca = playerMatchCounts.get(a.id) || 0;
    const cb = playerMatchCounts.get(b.id) || 0;
    return ca - cb;
  });

  const minCount = playerMatchCounts.get(sorted[0].id) || 0;
  const maxCount = playerMatchCounts.get(sorted[sorted.length - 1].id) || 0;
  if (minCount >= maxCount) return selectable;

  const lowGamePlayers = sorted.filter(p => {
    const count = playerMatchCounts.get(p.id) || 0;
    return count < maxCount;
  });

  if (lowGamePlayers.length >= playersPerMatch) {
    return lowGamePlayers;
  }

  return selectable;
}

function validatePostConditions(matches: MatchResult[], states: PlayerStateMap): string[] {
  const errors: string[] = [];

  const assignedIds = new Set<number>();
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const ids = [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];

    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      errors.push(`Match ${i}: contains duplicate player within match`);
    }

    for (const id of ids) {
      if (assignedIds.has(id)) {
        errors.push(`State invariant violation: player ${id} appears in multiple matches`);
      }
      assignedIds.add(id);
    }
  }

  for (const [id, state] of states) {
    if (state === "ASSIGNED" && !assignedIds.has(id)) {
      errors.push(`State mismatch: player ${id} marked ASSIGNED but not found in any match`);
    }
  }

  return errors;
}

function atomicAssign(states: PlayerStateMap, playerIds: number[]): boolean {
  for (const id of playerIds) {
    if (states.get(id) !== "AVAILABLE") {
      return false;
    }
  }
  for (const id of playerIds) {
    states.set(id, "ASSIGNED");
  }
  return true;
}

// --- v2 UPGRADE #9: Anti-dominance tracking ---
type TopMatchTracker = Map<number, number>;

function getAntiDominancePenalty(playerId: number, tracker: TopMatchTracker, threshold: number): number {
  const appearances = tracker.get(playerId) || 0;
  if (appearances > threshold) {
    return -30;
  }
  return 0;
}

function scorePairing(
  team: number[],
  opponents: number[],
  recentPairings: Map<string, number>,
  recentOpponents: Map<string, number>,
  playerMatchCounts: Map<number, number>,
  priorityPlayerIds?: number[],
  playerPool?: Player[],
  fixedPairs?: FixedPair[],
  phase?: SessionPhase,
  topMatchTracker?: TopMatchTracker,
  matchScoreHistory?: Map<string, number[]>,
  cfg?: MatchEngineSettings
): { score: number; factors: string[]; breakdown: ScoringBreakdown } {
  const c = cfg || DEFAULT_SETTINGS;
  let score = 0;
  const factors: string[] = [];
  const weights = (c.enablePhaseAdjustments) ? getPhaseWeights(phase || "MID") : { deficitMultiplier: 1.0, qualityMultiplier: 1.0, varietyMultiplier: 1.0 };
  let fairnessTotal = 0;
  let varietyTotal = 0;
  let qualityTotal = 0;
  let priorityTotal = 0;
  let genderTotal = 0;

  // --- Partner variety (v3: configurable penalties) ---
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const key = pairKey(team[i], team[j]);
      const isFixed = fixedPairs?.some(([a, b]) =>
        (a === team[i] && b === team[j]) || (a === team[j] && b === team[i])
      );
      if (!isFixed) {
        const count = recentPairings.get(key) || 0;
        if (count > 0) {
          const penalty = Math.round(getPartnerPenalty(count, c) * weights.varietyMultiplier);
          score += penalty;
          varietyTotal += penalty;
          factors.push(`teamA partner repeat(${team[i]},${team[j]})x${count}: ${penalty}`);
        }
      }
    }
  }

  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const key = pairKey(opponents[i], opponents[j]);
      const isFixed = fixedPairs?.some(([a, b]) =>
        (a === opponents[i] && b === opponents[j]) || (a === opponents[j] && b === opponents[i])
      );
      if (!isFixed) {
        const count = recentPairings.get(key) || 0;
        if (count > 0) {
          const penalty = Math.round(getPartnerPenalty(count, c) * weights.varietyMultiplier);
          score += penalty;
          varietyTotal += penalty;
          factors.push(`teamB partner repeat(${opponents[i]},${opponents[j]})x${count}: ${penalty}`);
        }
      }
    }
  }

  // --- Opponent variety (v3: configurable) ---
  for (const a of team) {
    for (const b of opponents) {
      const key = pairKey(a, b);
      const count = recentOpponents.get(key) || 0;
      if (count > 0) {
        const penalty = Math.round(-count * Math.abs(c.opponentRepeatWeight) * weights.varietyMultiplier);
        score += penalty;
        varietyTotal += penalty;
        factors.push(`opponent repeat(${a} vs ${b})x${count}: ${penalty}`);
      }
    }
  }

  // --- Equal playing time (v3: configurable deficit + games played weight) ---
  const allPlayers = [...team, ...opponents];

  const globalMin = playerMatchCounts.size > 0
    ? Math.min(...Array.from(playerMatchCounts.values()))
    : 0;

  for (const p of allPlayers) {
    const played = playerMatchCounts.get(p) || 0;
    const deficit = played - globalMin;
    const deficitPenalty = Math.round(getDeficitPenalty(deficit, c) * weights.deficitMultiplier);
    const playedPenalty = Math.round(played * c.gamesPlayedWeight * weights.deficitMultiplier);
    score += deficitPenalty + playedPenalty;
    fairnessTotal += deficitPenalty + playedPenalty;
    if (deficit > 0) {
      factors.push(`player ${p} deficit(${deficit}): ${deficitPenalty}`);
    }
  }

  const matchMin = Math.min(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const matchMax = Math.max(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const spread = matchMax - matchMin;
  if (spread > 0) {
    const spreadPenalty = Math.round(spread * c.spreadWeight * weights.deficitMultiplier);
    score += spreadPenalty;
    fairnessTotal += spreadPenalty;
    factors.push(`spread(${spread}): ${spreadPenalty}`);
  }

  // --- Priority players (v3: configurable) ---
  if (priorityPlayerIds && priorityPlayerIds.length > 0) {
    for (const p of allPlayers) {
      if (priorityPlayerIds.includes(p)) {
        const played = playerMatchCounts.get(p) || 0;
        const deficit = played - globalMin;
        const priorityBonus = getPriorityScore(deficit, c);
        score += priorityBonus;
        priorityTotal += priorityBonus;
        factors.push(`priority player ${p}: +${priorityBonus}`);
      }
    }
  }

  // --- v4: Soft opponent penalty for 1x repeat (hard block handled at filter level) ---
  for (const a of team) {
    for (const b of opponents) {
      const key = pairKey(a, b);
      const count = recentOpponents.get(key) || 0;
      if (count === 1) {
        const softPen = Math.round(c.softOpponentPenalty * weights.varietyMultiplier);
        score += softPen;
        varietyTotal += softPen;
        factors.push(`soft opponent repeat(${a} vs ${b})x1: ${softPen}`);
      }
    }
  }

  // --- Grade balance + Match quality ---
  if (playerPool && playerPool.length > 0) {
    const getPlayer = (id: number) => playerPool.find(p => p.id === id);

    // --- v4: Match quality score (configurable qualityWeight) ---
    const allMatchPlayers = [...team, ...opponents];
    const grades = allMatchPlayers.map(id => {
      const p = getPlayer(id);
      return p ? getGradeRank(p.grade) : 1;
    });
    const gradeMin = Math.min(...grades);
    const gradeMax = Math.max(...grades);
    const gradeSpread = gradeMax - gradeMin;
    const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;

    const qualityScore = Math.round(getMatchQualityScore(avgGrade, gradeSpread) * c.qualityWeight * weights.qualityMultiplier);
    score += qualityScore;
    qualityTotal += qualityScore;
    if (qualityScore !== 0) {
      factors.push(`match quality(avg ${avgGrade.toFixed(1)}, spread ${gradeSpread}): ${qualityScore > 0 ? "+" : ""}${qualityScore}`);
    }
  }

  // --- v2 UPGRADE #9: Anti-dominance penalty ---
  if (topMatchTracker) {
    const totalPlayers = playerPool ? playerPool.length : playerMatchCounts.size;
    const threshold = Math.max(2, Math.floor(totalPlayers * 0.3));
    for (const p of allPlayers) {
      const penalty = getAntiDominancePenalty(p, topMatchTracker, threshold);
      if (penalty < 0) {
        score += penalty;
        fairnessTotal += penalty;
        factors.push(`anti-dominance(${p}): ${penalty}`);
      }
    }
  }

  // --- v2 UPGRADE #10: Match closeness memory ---
  if (matchScoreHistory) {
    const { score: closenessScore, factors: closenessFactors } = getClosenessBonus(team, opponents, matchScoreHistory);
    score += closenessScore;
    qualityTotal += closenessScore;
    factors.push(...closenessFactors);
  }

  const breakdown: ScoringBreakdown = {
    fairness: fairnessTotal,
    variety: varietyTotal,
    quality: qualityTotal,
    priority: priorityTotal,
    gender: genderTotal,
    total: score,
  };

  return { score, factors, breakdown };
}

function removeUsedPlayers(pool: Player[], match: MatchResult): Player[] {
  const usedIds = new Set([match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[]);
  return pool.filter(p => !usedIds.has(p.id));
}

function generateDeterministicCandidateDoubles(
  eligible: Player[],
  fixedPairs: FixedPair[],
  states: PlayerStateMap,
  cfg?: MatchEngineSettings
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const maxCandidates = getCandidateLimit(eligible.length, cfg);

  const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
  const sorted = deterministicSort(available);

  const activePairs: FixedPair[] = fixedPairs.filter(([a, b]) =>
    sorted.some(p => p.id === a) && sorted.some(p => p.id === b)
  );

  const pairedPlayerIds = new Set<number>();
  for (const [a, b] of activePairs) {
    pairedPlayerIds.add(a);
    pairedPlayerIds.add(b);
  }
  const singles = sorted.filter(p => !pairedPlayerIds.has(p.id));

  type TeamUnit = { player1Id: number; player2Id: number };

  const pairUnits: TeamUnit[] = activePairs.map(([a, b]) => ({
    player1Id: Math.min(a, b),
    player2Id: Math.max(a, b),
  }));

  const singlePairUnits: TeamUnit[] = [];
  for (let i = 0; i + 1 < singles.length; i += 2) {
    singlePairUnits.push({
      player1Id: Math.min(singles[i].id, singles[i + 1].id),
      player2Id: Math.max(singles[i].id, singles[i + 1].id),
    });
  }

  const allTeamUnits = [...pairUnits, ...singlePairUnits];

  for (let i = 0; i < allTeamUnits.length && candidates.length < maxCandidates; i++) {
    for (let j = i + 1; j < allTeamUnits.length && candidates.length < maxCandidates; j++) {
      const teamA = allTeamUnits[i];
      const teamB = allTeamUnits[j];
      const ids = new Set([teamA.player1Id, teamA.player2Id, teamB.player1Id, teamB.player2Id]);
      if (ids.size === 4) {
        const candidate: MatchResult = {
          teamAPlayer1Id: teamA.player1Id,
          teamAPlayer2Id: teamA.player2Id,
          teamBPlayer1Id: teamB.player1Id,
          teamBPlayer2Id: teamB.player2Id,
        };
        if (candidateRespectsFixedPairs(candidate, fixedPairs)) {
          candidates.push(candidate);
        }
      }
    }
  }

  if (activePairs.length > 0 && singles.length >= 2) {
    for (const [pairA, pairB] of activePairs) {
      for (let a = 0; a < singles.length && candidates.length < maxCandidates; a++) {
        for (let b = a + 1; b < singles.length && candidates.length < maxCandidates; b++) {
          const ids = new Set([pairA, pairB, singles[a].id, singles[b].id]);
          if (ids.size === 4) {
            const candidate: MatchResult = {
              teamAPlayer1Id: Math.min(pairA, pairB),
              teamAPlayer2Id: Math.max(pairA, pairB),
              teamBPlayer1Id: Math.min(singles[a].id, singles[b].id),
              teamBPlayer2Id: Math.max(singles[a].id, singles[b].id),
            };
            if (candidateRespectsFixedPairs(candidate, fixedPairs)) {
              candidates.push(candidate);
            }
          }
        }
      }
    }
  }

  for (let a = 0; a < sorted.length && candidates.length < maxCandidates; a++) {
    for (let b = a + 1; b < sorted.length && candidates.length < maxCandidates; b++) {
      for (let c = b + 1; c < sorted.length && candidates.length < maxCandidates; c++) {
        for (let d = c + 1; d < sorted.length && candidates.length < maxCandidates; d++) {
          const p = [sorted[a], sorted[b], sorted[c], sorted[d]];
          const candidate: MatchResult = {
            teamAPlayer1Id: p[0].id,
            teamAPlayer2Id: p[3].id,
            teamBPlayer1Id: p[1].id,
            teamBPlayer2Id: p[2].id,
          };
          if (candidateRespectsFixedPairs(candidate, fixedPairs)) {
            const existing = candidates.some(c =>
              pairKey(c.teamAPlayer1Id, c.teamAPlayer2Id!) === pairKey(candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!) &&
              pairKey(c.teamBPlayer1Id, c.teamBPlayer2Id!) === pairKey(candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!)
            );
            if (!existing) {
              candidates.push(candidate);
            }
          }

          const candidate2: MatchResult = {
            teamAPlayer1Id: p[0].id,
            teamAPlayer2Id: p[2].id,
            teamBPlayer1Id: p[1].id,
            teamBPlayer2Id: p[3].id,
          };
          if (candidateRespectsFixedPairs(candidate2, fixedPairs) && candidates.length < maxCandidates) {
            candidates.push(candidate2);
          }

          const candidate3: MatchResult = {
            teamAPlayer1Id: p[0].id,
            teamAPlayer2Id: p[1].id,
            teamBPlayer1Id: p[2].id,
            teamBPlayer2Id: p[3].id,
          };
          if (candidateRespectsFixedPairs(candidate3, fixedPairs) && candidates.length < maxCandidates) {
            candidates.push(candidate3);
          }
        }
      }
    }
  }

  return candidates;
}

function generateMixedDoublesCandidates(
  eligible: Player[],
  fixedPairs: FixedPair[],
  states: PlayerStateMap,
  cfg?: MatchEngineSettings
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const maxCandidates = getCandidateLimit(eligible.length, cfg);

  const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
  const males = deterministicSort(available.filter(p => getEffectiveGender(p) !== "FEMALE"));
  const females = deterministicSort(available.filter(p => getEffectiveGender(p) === "FEMALE"));

  if (males.length < 2 || females.length < 2) return candidates;

  for (let fi = 0; fi < females.length && candidates.length < maxCandidates; fi++) {
    for (let fj = fi + 1; fj < females.length && candidates.length < maxCandidates; fj++) {
      for (let mi = 0; mi < males.length && candidates.length < maxCandidates; mi++) {
        for (let mj = mi + 1; mj < males.length && candidates.length < maxCandidates; mj++) {
          const f1 = females[fi], f2 = females[fj], m1 = males[mi], m2 = males[mj];

          const c1: MatchResult = {
            teamAPlayer1Id: Math.min(m1.id, f1.id),
            teamAPlayer2Id: Math.max(m1.id, f1.id),
            teamBPlayer1Id: Math.min(m2.id, f2.id),
            teamBPlayer2Id: Math.max(m2.id, f2.id),
          };
          if (candidateRespectsFixedPairs(c1, fixedPairs)) {
            candidates.push(c1);
          }

          if (candidates.length < maxCandidates) {
            const c2: MatchResult = {
              teamAPlayer1Id: Math.min(m1.id, f2.id),
              teamAPlayer2Id: Math.max(m1.id, f2.id),
              teamBPlayer1Id: Math.min(m2.id, f1.id),
              teamBPlayer2Id: Math.max(m2.id, f1.id),
            };
            if (candidateRespectsFixedPairs(c2, fixedPairs)) {
              candidates.push(c2);
            }
          }
        }
      }
    }
  }

  return candidates;
}

function generateFemaleOnlyCandidates(
  eligible: Player[],
  fixedPairs: FixedPair[],
  states: PlayerStateMap,
  cfg?: MatchEngineSettings
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const maxCandidates = getCandidateLimit(eligible.length, cfg);

  const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
  const females = deterministicSort(available.filter(p => getEffectiveGender(p) === "FEMALE"));

  if (females.length < 4) return candidates;

  for (let a = 0; a < females.length && candidates.length < maxCandidates; a++) {
    for (let b = a + 1; b < females.length && candidates.length < maxCandidates; b++) {
      for (let c = b + 1; c < females.length && candidates.length < maxCandidates; c++) {
        for (let d = c + 1; d < females.length && candidates.length < maxCandidates; d++) {
          const p = [females[a], females[b], females[c], females[d]];
          const candidate: MatchResult = {
            teamAPlayer1Id: p[0].id,
            teamAPlayer2Id: p[3].id,
            teamBPlayer1Id: p[1].id,
            teamBPlayer2Id: p[2].id,
          };
          if (candidateRespectsFixedPairs(candidate, fixedPairs)) {
            candidates.push(candidate);
          }
        }
      }
    }
  }

  return candidates;
}

function generateDeterministicCandidateSingles(
  eligible: Player[],
  states: PlayerStateMap
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
  const sorted = deterministicSort(available);

  for (let a = 0; a < sorted.length; a++) {
    for (let b = a + 1; b < sorted.length; b++) {
      candidates.push({
        teamAPlayer1Id: sorted[a].id,
        teamAPlayer2Id: null,
        teamBPlayer1Id: sorted[b].id,
        teamBPlayer2Id: null,
      });
    }
  }

  return candidates;
}

// --- v5: Match type classification for dynamic ratio system ---
type MatchType = "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";

function getMatchType(candidate: MatchResult, playerPool: Player[]): MatchType {
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const genders = ids.map(id => {
    const p = playerPool.find(pp => pp.id === id);
    return p ? getEffectiveGender(p) : "MALE";
  });
  const hasMale = genders.some(g => g !== "FEMALE");
  const hasFemale = genders.some(g => g === "FEMALE");
  if (hasMale && hasFemale) return "MIXED";
  if (hasFemale && !hasMale) return "FEMALE_ONLY";
  return "MALE_ONLY";
}

function isMaleOnlyMatch(candidate: MatchResult, playerPool: Player[]): boolean {
  return getMatchType(candidate, playerPool) === "MALE_ONLY";
}

// --- v6: Slot-based match type distribution ---
type MatchTypeCounts = { maleOnly: number; femaleOnly: number; mixed: number; total: number };

function computeMatchSlots(
  queueTarget: number,
  eligible: Player[],
  states: PlayerStateMap,
  cfg: MatchEngineSettings,
  existingCounts?: { maleOnly: number; femaleOnly: number; mixed: number }
): MatchType[] {
  const availableFemales = eligible.filter(p => states.get(p.id) === "AVAILABLE" && getEffectiveGender(p) === "FEMALE").length;
  const availableMales = eligible.filter(p => states.get(p.id) === "AVAILABLE" && getEffectiveGender(p) !== "FEMALE").length;

  if (availableFemales === 0 && availableMales === 0) return [];
  if (availableFemales === 0) {
    return Array(queueTarget).fill("MALE_ONLY" as MatchType);
  }
  if (availableMales === 0) {
    return Array(queueTarget).fill("FEMALE_ONLY" as MatchType);
  }

  const existFemale = existingCounts?.femaleOnly ?? 0;
  const existMixed = existingCounts?.mixed ?? 0;
  const existMale = existingCounts?.maleOnly ?? 0;
  const existTotal = existFemale + existMixed + existMale;

  const totalTarget = existTotal + queueTarget;

  const idealFemale = Math.round(totalTarget * cfg.femaleOnlyTargetRatio);
  const idealMixed = Math.round(totalTarget * cfg.mixedTargetRatio);
  const idealMale = totalTarget - idealFemale - idealMixed;

  let femaleSlots = Math.max(0, idealFemale - existFemale);
  let mixedSlots = Math.max(0, idealMixed - existMixed);
  let maleSlots = Math.max(0, idealMale - existMale);

  let total = femaleSlots + mixedSlots + maleSlots;
  if (total === 0) {
    const currentFemaleRatio = existTotal > 0 ? existFemale / existTotal : 0;
    const currentMixedRatio = existTotal > 0 ? existMixed / existTotal : 0;
    const currentMaleRatio = existTotal > 0 ? existMale / existTotal : 0;

    const femaleDef = cfg.femaleOnlyTargetRatio - currentFemaleRatio;
    const mixedDef = cfg.mixedTargetRatio - currentMixedRatio;
    const maleDef = cfg.maleOnlyTargetRatio - currentMaleRatio;

    for (let i = 0; i < queueTarget; i++) {
      if (femaleDef >= mixedDef && femaleDef >= maleDef) femaleSlots++;
      else if (mixedDef >= femaleDef && mixedDef >= maleDef) mixedSlots++;
      else maleSlots++;
    }
    total = femaleSlots + mixedSlots + maleSlots;
  }

  while (femaleSlots + mixedSlots + maleSlots > queueTarget) {
    if (maleSlots > 0 && maleSlots >= femaleSlots && maleSlots >= mixedSlots) maleSlots--;
    else if (femaleSlots > 0 && femaleSlots >= mixedSlots) femaleSlots--;
    else if (mixedSlots > 0) mixedSlots--;
    else break;
  }
  while (femaleSlots + mixedSlots + maleSlots < queueTarget) {
    const currentFR = (existFemale + femaleSlots) / (existTotal + femaleSlots + mixedSlots + maleSlots || 1);
    const currentMR = (existMixed + mixedSlots) / (existTotal + femaleSlots + mixedSlots + maleSlots || 1);
    const currentAR = (existMale + maleSlots) / (existTotal + femaleSlots + mixedSlots + maleSlots || 1);

    const fDef = cfg.femaleOnlyTargetRatio - currentFR;
    const mxDef = cfg.mixedTargetRatio - currentMR;
    const mDef = cfg.maleOnlyTargetRatio - currentAR;

    if (fDef >= mxDef && fDef >= mDef) femaleSlots++;
    else if (mxDef >= fDef && mxDef >= mDef) mixedSlots++;
    else maleSlots++;
  }

  const maxFemaleOnlyMatches = Math.floor(availableFemales / 4);
  if (femaleSlots > maxFemaleOnlyMatches) {
    const excess = femaleSlots - maxFemaleOnlyMatches;
    femaleSlots = maxFemaleOnlyMatches;
    mixedSlots += excess;
  }

  const femalesRemainingAfterFemaleOnly = availableFemales - (femaleSlots * 4);
  const maxMixedMatches = Math.min(
    Math.floor(Math.max(0, femalesRemainingAfterFemaleOnly) / 2),
    Math.floor(availableMales / 2)
  );
  if (mixedSlots > maxMixedMatches) {
    const excess = mixedSlots - maxMixedMatches;
    mixedSlots = maxMixedMatches;
    maleSlots += excess;
  }

  if (availableMales < 2 && mixedSlots > 0) {
    maleSlots += mixedSlots;
    mixedSlots = 0;
  }
  if (availableFemales < 2 && mixedSlots > 0) {
    maleSlots += mixedSlots;
    mixedSlots = 0;
  }

  const maxMaleOnlyMatches = Math.floor(availableMales / 4);
  if (maleSlots > maxMaleOnlyMatches) {
    const excess = maleSlots - maxMaleOnlyMatches;
    maleSlots = maxMaleOnlyMatches;
    femaleSlots += Math.min(excess, maxFemaleOnlyMatches - femaleSlots);
    mixedSlots += Math.max(0, excess - Math.max(0, maxFemaleOnlyMatches - femaleSlots));
  }

  if (maleSlots < 0) maleSlots = 0;
  if (femaleSlots < 0) femaleSlots = 0;
  if (mixedSlots < 0) mixedSlots = 0;

  const slots: MatchType[] = [];
  for (let i = 0; i < femaleSlots; i++) slots.push("FEMALE_ONLY");
  for (let i = 0; i < mixedSlots; i++) slots.push("MIXED");
  for (let i = 0; i < maleSlots; i++) slots.push("MALE_ONLY");

  while (slots.length < queueTarget) {
    if (availableMales >= 4) slots.push("MALE_ONLY");
    else if (availableFemales >= 2 && availableMales >= 2) slots.push("MIXED");
    else if (availableFemales >= 4) slots.push("FEMALE_ONLY");
    else slots.push("MALE_ONLY");
  }

  return slots;
}

// --- v6: Mixed match player hard limit ---
function exceedsMixedMatchLimit(
  candidate: MatchResult,
  playerPool: Player[],
  mixedPlayerCounts: Map<number, number>,
  cfg: MatchEngineSettings
): boolean {
  if (cfg.mixedMatchPlayerLimit <= 0) return false;
  const malesInMatch = getMalesInMatch(candidate, playerPool);
  for (const maleId of malesInMatch) {
    const count = mixedPlayerCounts.get(maleId) || 0;
    if (count >= cfg.mixedMatchPlayerLimit) return true;
  }
  return false;
}

// --- v6: Opponent cooldown with windowed history ---
type PlayerOpponentHistory = Map<number, number[]>;

function buildPlayerOpponentWindow(
  playerId: number,
  opponentHistory: PlayerOpponentHistory
): number[] {
  return opponentHistory.get(playerId) || [];
}

function hasOpponentCooldown(
  candidate: MatchResult,
  opponentHistory: PlayerOpponentHistory,
  cfg: MatchEngineSettings
): boolean {
  if (cfg.opponentCooldownWindow <= 0 || cfg.opponentCooldownThreshold <= 0) return false;
  const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id].filter(Boolean) as number[];
  const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];

  for (const a of team) {
    const recentA = buildPlayerOpponentWindow(a, opponentHistory);
    for (const b of opp) {
      const count = recentA.filter(id => id === b).length;
      if (count >= cfg.opponentCooldownThreshold) return true;
    }
  }
  for (const b of opp) {
    const recentB = buildPlayerOpponentWindow(b, opponentHistory);
    for (const a of team) {
      const count = recentB.filter(id => id === a).length;
      if (count >= cfg.opponentCooldownThreshold) return true;
    }
  }
  return false;
}

function trackOpponentHistory(
  match: MatchResult,
  opponentHistory: PlayerOpponentHistory,
  cfg: MatchEngineSettings
): void {
  const team = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
  const opp = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];

  for (const a of team) {
    const history = opponentHistory.get(a) || [];
    for (const b of opp) history.push(b);
    while (history.length > cfg.opponentCooldownWindow * 2) history.shift();
    opponentHistory.set(a, history);
  }
  for (const b of opp) {
    const history = opponentHistory.get(b) || [];
    for (const a of team) history.push(a);
    while (history.length > cfg.opponentCooldownWindow * 2) history.shift();
    opponentHistory.set(b, history);
  }
}

function isFemaleOnlyMatch(candidate: MatchResult, playerPool: Player[]): boolean {
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  return ids.every(id => {
    const p = playerPool.find(pp => pp.id === id);
    return p && getEffectiveGender(p) === "FEMALE";
  });
}

function isMixedMatch(candidate: MatchResult, playerPool: Player[]): boolean {
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  const genders = ids.map(id => {
    const p = playerPool.find(pp => pp.id === id);
    return p ? getEffectiveGender(p) : "MALE";
  });
  return genders.includes("FEMALE") && genders.includes("MALE");
}

function getMalesInMatch(candidate: MatchResult, playerPool: Player[]): number[] {
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  return ids.filter(id => {
    const p = playerPool.find(pp => pp.id === id);
    return p && getEffectiveGender(p) !== "FEMALE";
  });
}

// --- v4: 4-player group repeat key + penalty ---
function groupKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

function scoreGroupRepeat(candidate: MatchResult, groupHistory: Map<string, number>, cfg?: MatchEngineSettings): { score: number; factors: string[] } {
  const c = cfg || DEFAULT_SETTINGS;
  const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
  if (ids.length < 4) return { score: 0, factors: [] };
  const key = groupKey(ids);
  const count = groupHistory.get(key) || 0;
  if (count > 0) {
    const penalty = count * c.groupRepeatPenalty;
    return { score: penalty, factors: [`group repeat(${key})x${count}: ${penalty}`] };
  }
  return { score: 0, factors: [] };
}

function trackGroupRepeat(match: MatchResult, groupHistory: Map<string, number>): void {
  const ids = [match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
  if (ids.length < 4) return;
  const key = groupKey(ids);
  groupHistory.set(key, (groupHistory.get(key) || 0) + 1);
}

// --- v6: Gender scoring — mixed match quality + rotation penalty ---
function scoreGenderFactors(
  candidate: MatchResult,
  playerPool: Player[],
  mixedMaleCounts: Map<number, number>,
  cfg?: MatchEngineSettings,
  recentPairings?: Map<string, number>,
  recentOpponents?: Map<string, number>
): { score: number; factors: string[] } {
  const c = cfg || DEFAULT_SETTINGS;
  let score = 0;
  const factors: string[] = [];

  const matchType = getMatchType(candidate, playerPool);

  if (matchType === "MIXED") {
    const allIds = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id].filter(Boolean) as number[];
    const allPlayers = allIds.map(id => playerPool.find(p => p.id === id)).filter(Boolean) as Player[];
    const males = allPlayers.filter(p => getEffectiveGender(p) !== "FEMALE");
    const females = allPlayers.filter(p => getEffectiveGender(p) === "FEMALE");

    const hasStrongMale = males.some(p => isStrongPlayer(p.grade));
    if (hasStrongMale) {
      score += c.strongMaleFemaleBonus;
      factors.push(`strong male + female bonus: +${c.strongMaleFemaleBonus}`);
    } else {
      score += c.noStrongMaleFemalePenalty;
      factors.push(`no strong male in mixed: ${c.noStrongMaleFemalePenalty}`);
    }

    const malesInMatch = getMalesInMatch(candidate, playerPool);
    for (const maleId of malesInMatch) {
      const maleUses = mixedMaleCounts.get(maleId) || 0;
      if (maleUses > 0) {
        const rotationPenalty = maleUses * c.maleRotationScaling;
        score += rotationPenalty;
        factors.push(`mixed male rotation(${maleId})x${maleUses}: ${rotationPenalty}`);
      }
    }

    for (const f of females) {
      const femaleUses = mixedMaleCounts.get(f.id) || 0;
      if (femaleUses > 0) {
        const rotationPenalty = femaleUses * c.maleRotationScaling;
        score += rotationPenalty;
        factors.push(`mixed female rotation(${f.id})x${femaleUses}: ${rotationPenalty}`);
      }
    }

    const totalFemales = playerPool.filter(p => getEffectiveGender(p) === "FEMALE").length;
    if (totalFemales <= 6 && recentPairings && recentOpponents) {
      const teamAPair = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const teamBPair = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      for (const pair of [teamAPair, teamBPair]) {
        const pk = pairKey(pair[0], pair[1]);
        const pairCount = recentPairings.get(pk) || 0;
        if (pairCount > 0) {
          const extraPenalty = Math.round(pairCount * c.partnerRepeatWeight * 1.5);
          score += extraPenalty;
          factors.push(`mixed small-group partner boost(${pair[0]},${pair[1]})x${pairCount}: ${extraPenalty}`);
        }
      }

      for (const a of teamAPair) {
        for (const b of teamBPair) {
          const ok = pairKey(a, b);
          const oppCount = recentOpponents.get(ok) || 0;
          if (oppCount > 0) {
            const extraPenalty = Math.round(-oppCount * Math.abs(c.opponentRepeatWeight) * 0.8);
            score += extraPenalty;
            factors.push(`mixed small-group opponent boost(${a} vs ${b})x${oppCount}: ${extraPenalty}`);
          }
        }
      }
    }
  }

  return { score, factors };
}

function generateSocialDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 4);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const topMatchTracker: TopMatchTracker = new Map();

  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;
  const totalSessionMatches = settings?.totalSessionMatches ?? 0;
  const matchScoreHistory = settings?.matchScoreHistory;

  const mixedMaleCounts = new Map<number, number>();
  const localGroupHistory = new Map<string, number>();
  const opponentHistory: PlayerOpponentHistory = new Map();

  const existingTypeCounts = settings?.existingMatchTypeCounts;
  const matchSlots = computeMatchSlots(queueTarget, eligible, states, cfg, existingTypeCounts);

  for (let q = 0; q < matchSlots.length; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 4) break;

    const slotType = matchSlots[q];
    const phase = getSessionPhase(totalSessionMatches + results.length, players.length);

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestBreakdown: ScoringBreakdown | undefined;

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 4, states);
    const candidatePool = fairnessPool.length >= 4 ? fairnessPool : eligible;
    let candidates: MatchResult[];
    if (slotType === "MIXED") {
      candidates = generateMixedDoublesCandidates(candidatePool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateMixedDoublesCandidates(eligible, fixedPairs || [], states, cfg);
    } else if (slotType === "FEMALE_ONLY") {
      candidates = generateFemaleOnlyCandidates(candidatePool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateFemaleOnlyCandidates(eligible, fixedPairs || [], states, cfg);
    } else {
      candidates = generateDeterministicCandidateDoubles(candidatePool, fixedPairs || [], states, cfg);
    }

    const evaluateCandidate = (candidate: MatchResult, pool: Player[]): boolean => {
      const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      if (ids.some(id => states.get(id) !== "AVAILABLE")) return false;

      if (isGenderUnfairDoubles(candidate, pool)) return false;
      if (!passesQualityFloor(candidate, pool, false, false, cfg)) return false;
      if (hasOpponentCooldown(candidate, opponentHistory, cfg)) return false;

      const candidateType = getMatchType(candidate, pool);
      if (candidateType !== slotType) return false;

      if (slotType === "MIXED" && !isProperMixedDoubles(candidate, pool)) return false;
      if (slotType === "MIXED" && exceedsMixedMatchLimit(candidate, pool, mixedMaleCounts, cfg)) return false;

      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let { score: s, factors, breakdown: bd } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, pool, fixedPairs, phase, topMatchTracker, matchScoreHistory, cfg);

      const genderScoring = scoreGenderFactors(candidate, pool, mixedMaleCounts, cfg, localPairings, localOpponents);
      s += genderScoring.score;
      factors.push(...genderScoring.factors);
      bd.gender += genderScoring.score;

      const groupPenalty = scoreGroupRepeat(candidate, localGroupHistory, cfg);
      if (groupPenalty.score !== 0) {
        s += groupPenalty.score;
        factors.push(...groupPenalty.factors);
        bd.variety += groupPenalty.score;
      }

      if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = s;
        bestMatch = candidate;
        bestFactors = factors;
        if (typeof bd !== "undefined") bestBreakdown = bd;
      }
      return true;
    };

    let candidatesEvaluated = 0;
    for (const candidate of candidates) {
      if (evaluateCandidate(candidate, eligible)) candidatesEvaluated++;
    }

    if (!bestMatch && candidatePool !== eligible) {
      const fallbackCandidates = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states, cfg);
      for (const candidate of fallbackCandidates) {
        if (evaluateCandidate(candidate, eligible)) candidatesEvaluated++;
      }
    }

    if (!bestMatch) {
      const anyTypeCandidates = candidatePool === eligible
        ? candidates
        : generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states, cfg);
      for (const candidate of anyTypeCandidates) {
        const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
        if (isGenderUnfairDoubles(candidate, eligible)) continue;
        const mt = getMatchType(candidate, eligible);
        if (mt === "MIXED" && !isProperMixedDoubles(candidate, eligible)) continue;
        if (!passesQualityFloor(candidate, eligible, false, false, cfg)) continue;
        if (hasOpponentCooldown(candidate, opponentHistory, cfg)) continue;

        candidatesEvaluated++;
        const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
        const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        let { score: s, factors, breakdown: bd } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs, phase, topMatchTracker, matchScoreHistory, cfg);
        const genderScoring = scoreGenderFactors(candidate, eligible, mixedMaleCounts, cfg, localPairings, localOpponents);
        s += genderScoring.score;
        factors.push(...genderScoring.factors);
        const groupPenalty = scoreGroupRepeat(candidate, localGroupHistory, cfg);
        s += groupPenalty.score;
        factors.push(...groupPenalty.factors);
        if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = s;
          bestMatch = candidate;
          bestFactors = factors;
          if (typeof bd !== "undefined") bestBreakdown = bd;
        }
      }
    }

    if (bestMatch) {
      if (hasFixedPairs) {
        const blocked = checkDuplicateMatchup(bestMatch, results);
        if (blocked) {
          const alternative = findAlternativeMatch(candidates, results, states, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs!, phase, topMatchTracker, matchScoreHistory, cfg);
          if (alternative) {
            bestMatch = alternative.match;
            bestScore = alternative.score;
            bestFactors = alternative.factors;
          } else {
            return {
              matches: results,
              pairConstraintBlocked: true,
              pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
              scoringLogs,
            };
          }
        }
      }

      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamAPlayer2Id, bestMatch.teamBPlayer1Id, bestMatch.teamBPlayer2Id].filter(Boolean) as number[];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      const bestMatchType = getMatchType(bestMatch, eligible);
      if (bestMatchType === "MIXED") {
        const malesInMatch = getMalesInMatch(bestMatch, eligible);
        for (const maleId of malesInMatch) {
          mixedMaleCounts.set(maleId, (mixedMaleCounts.get(maleId) || 0) + 1);
        }
        const femalesInMatch = ids.filter(id => {
          const p = eligible.find(pp => pp.id === id);
          return p && getEffectiveGender(p) === "FEMALE";
        });
        for (const fId of femalesInMatch) {
          mixedMaleCounts.set(fId, (mixedMaleCounts.get(fId) || 0) + 1);
        }
      }

      trackOpponentHistory(bestMatch, opponentHistory, cfg);

      bestMatch.qualityScore = bestScore;
      if (bestBreakdown) bestMatch.breakdown = bestBreakdown;

      for (const id of ids) {
        topMatchTracker.set(id, (topMatchTracker.get(id) || 0) + 1);
      }
      trackGroupRepeat(bestMatch, localGroupHistory);

      results.push(bestMatch);
      scoringLogs.push({
        matchIndex: q,
        candidatesEvaluated,
        winner: bestMatch,
        winnerScore: bestScore,
        topFactors: bestFactors.slice(0, 5),
      });
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      if (hasFixedPairs && results.length === 0) {
        return {
          matches: [],
          pairConstraintBlocked: true,
          pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
          scoringLogs,
        };
      }
      break;
    }
  }

  // --- v2 UPGRADE #11: Court assignment optimization (sort by quality) ---
  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);

  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateSocialSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const totalSessionMatches = settings?.totalSessionMatches ?? 0;
  const matchScoreHistory = settings?.matchScoreHistory;

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 2) break;

    const phase = getSessionPhase(totalSessionMatches + results.length, players.length);
    const weights = cfg.enablePhaseAdjustments ? getPhaseWeights(phase) : { deficitMultiplier: 1.0, qualityMultiplier: 1.0, varietyMultiplier: 1.0 };

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestBreakdown: ScoringBreakdown | undefined;

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 2, states);
    const candidatePool = fairnessPool.length >= 2 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateSingles(candidatePool, states);
    let candidatesEvaluated = 0;

    const globalMin = localCounts.size > 0
      ? Math.min(...Array.from(localCounts.values()))
      : 0;

    for (const candidate of candidates) {
      if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") continue;

      if (!passesQualityFloor(candidate, eligible, false, true, cfg)) continue;

      candidatesEvaluated++;
      const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
      const oppCount = localOpponents.get(key) || 0;
      const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
      const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
      const deficitA = countA - globalMin;
      const deficitB = countB - globalMin;

      let total = Math.round(-(oppCount * Math.abs(cfg.opponentRepeatWeight)) * weights.varietyMultiplier) +
        Math.round(getDeficitPenalty(deficitA, cfg) * weights.deficitMultiplier) +
        Math.round(getDeficitPenalty(deficitB, cfg) * weights.deficitMultiplier) +
        Math.round((countA + countB) * cfg.gamesPlayedWeight * weights.deficitMultiplier);

      const factors: string[] = [];

      if (oppCount > 0) factors.push(`opponent repeat(${candidate.teamAPlayer1Id} vs ${candidate.teamBPlayer1Id})x${oppCount}: ${Math.round(-(oppCount * Math.abs(cfg.opponentRepeatWeight)) * weights.varietyMultiplier)}`);
      if (deficitA > 0) factors.push(`player ${candidate.teamAPlayer1Id} deficit(${deficitA}): ${Math.round(getDeficitPenalty(deficitA, cfg) * weights.deficitMultiplier)}`);
      if (deficitB > 0) factors.push(`player ${candidate.teamBPlayer1Id} deficit(${deficitB}): ${Math.round(getDeficitPenalty(deficitB, cfg) * weights.deficitMultiplier)}`);

      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) {
          const bonus = getPriorityScore(deficitA, cfg);
          total += bonus;
          factors.push(`priority player ${candidate.teamAPlayer1Id}: +${bonus}`);
        }
        if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) {
          const bonus = getPriorityScore(deficitB, cfg);
          total += bonus;
          factors.push(`priority player ${candidate.teamBPlayer1Id}: +${bonus}`);
        }
      }

      if (matchScoreHistory) {
        const { score: cs, factors: cf } = getClosenessBonus([candidate.teamAPlayer1Id], [candidate.teamBPlayer1Id], matchScoreHistory);
        total += cs;
        factors.push(...cf);
      }

      if (total > bestScore || (total === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = total;
        bestMatch = candidate;
        bestFactors = factors;
      }
    }

    if (!bestMatch && candidatePool !== eligible) {
      const fallbackCandidates = generateDeterministicCandidateSingles(eligible, states);
      for (const candidate of fallbackCandidates) {
        if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") continue;
        if (!passesQualityFloor(candidate, eligible, false, true, cfg)) continue;
        candidatesEvaluated++;
        const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
        const oppCount = localOpponents.get(key) || 0;
        const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
        const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
        const deficitA = countA - globalMin;
        const deficitB = countB - globalMin;
        let total = Math.round(-(oppCount * Math.abs(cfg.opponentRepeatWeight)) * weights.varietyMultiplier) +
          Math.round(getDeficitPenalty(deficitA, cfg) * weights.deficitMultiplier) +
          Math.round(getDeficitPenalty(deficitB, cfg) * weights.deficitMultiplier) +
          Math.round((countA + countB) * cfg.gamesPlayedWeight * weights.deficitMultiplier);
        const factors: string[] = [];
        if (priorityPlayerIds && priorityPlayerIds.length > 0) {
          if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { const bonus = getPriorityScore(deficitA, cfg); total += bonus; factors.push(`priority player ${candidate.teamAPlayer1Id}: +${bonus}`); }
          if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { const bonus = getPriorityScore(deficitB, cfg); total += bonus; factors.push(`priority player ${candidate.teamBPlayer1Id}: +${bonus}`); }
        }
        if (total > bestScore || (total === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = total;
          bestMatch = candidate;
          bestFactors = factors;
        }
      }
    }

    if (bestMatch) {
      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      bestMatch.qualityScore = bestScore;
      if (bestBreakdown) bestMatch.breakdown = bestBreakdown;
      results.push(bestMatch);
      scoringLogs.push({
        matchIndex: q,
        candidatesEvaluated,
        winner: bestMatch,
        winnerScore: bestScore,
        topFactors: bestFactors.slice(0, 5),
      });
      const key = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
      localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
      localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
      localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }

  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateCompetitiveDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 4);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const topMatchTracker: TopMatchTracker = new Map();

  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;
  const totalSessionMatches = settings?.totalSessionMatches ?? 0;
  const matchScoreHistory = settings?.matchScoreHistory;

  const mixedMaleCounts = new Map<number, number>();
  const localGroupHistory = new Map<string, number>();
  const opponentHistory: PlayerOpponentHistory = new Map();

  const existingTypeCounts2 = settings?.existingMatchTypeCounts;
  const matchSlots = computeMatchSlots(queueTarget, eligible, states, cfg, existingTypeCounts2);

  for (let q = 0; q < matchSlots.length; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 4) break;

    const slotType = matchSlots[q];
    const phase = getSessionPhase(totalSessionMatches + results.length, players.length);

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestBreakdown: ScoringBreakdown | undefined;

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 4, states);
    const candidatePool = fairnessPool.length >= 4 ? fairnessPool : eligible;
    let candidates: MatchResult[];
    if (slotType === "MIXED") {
      candidates = generateMixedDoublesCandidates(candidatePool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateMixedDoublesCandidates(eligible, fixedPairs || [], states, cfg);
    } else if (slotType === "FEMALE_ONLY") {
      candidates = generateFemaleOnlyCandidates(candidatePool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateFemaleOnlyCandidates(eligible, fixedPairs || [], states, cfg);
    } else {
      candidates = generateDeterministicCandidateDoubles(candidatePool, fixedPairs || [], states, cfg);
    }
    let candidatesEvaluated = 0;

    const scoreCandidate = (candidate: MatchResult, requireSlot: boolean): { score: number; factors: string[]; breakdown?: ScoringBreakdown } | null => {
      const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      if (ids.some(id => states.get(id) !== "AVAILABLE")) return null;

      if (isGenderUnfairDoubles(candidate, eligible)) return null;
      if (!passesQualityFloor(candidate, eligible, true, false, cfg)) return null;
      if (hasOpponentCooldown(candidate, opponentHistory, cfg)) return null;

      if (requireSlot) {
        const candidateType = getMatchType(candidate, eligible);
        if (candidateType !== slotType) return null;
        if (slotType === "MIXED" && !isProperMixedDoubles(candidate, eligible)) return null;
        if (slotType === "MIXED" && exceedsMixedMatchLimit(candidate, eligible, mixedMaleCounts, cfg)) return null;
      }

      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let { score: s, factors, breakdown: bd } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs, phase, topMatchTracker, matchScoreHistory, cfg);

      const pA1 = eligible.find(p => p.id === candidate.teamAPlayer1Id);
      const pA2 = eligible.find(p => p.id === candidate.teamAPlayer2Id);
      const pB1 = eligible.find(p => p.id === candidate.teamBPlayer1Id);
      const pB2 = eligible.find(p => p.id === candidate.teamBPlayer2Id);

      if (!hasFixedPairs && pA1 && pA2 && pB1 && pB2) {
        const gradeA1 = getGradeRank(pA1.grade);
        const gradeA2 = getGradeRank(pA2.grade);
        const gradeB1 = getGradeRank(pB1.grade);
        const gradeB2 = getGradeRank(pB2.grade);
        const teamAAvg = (gradeA1 + gradeA2) / 2;
        const teamBAvg = (gradeB1 + gradeB2) / 2;
        const diff = Math.abs(teamAAvg - teamBAvg);
        if (diff > 0) {
          const balancePenalty = -diff * 15;
          s += balancePenalty;
          factors.push(`comp grade balance diff(${diff.toFixed(1)}): ${balancePenalty.toFixed(1)}`);
        }

        const catA1 = getCategoryFromGrade(pA1.grade);
        const catA2 = getCategoryFromGrade(pA2.grade);
        const catB1 = getCategoryFromGrade(pB1.grade);
        const catB2 = getCategoryFromGrade(pB2.grade);
        const allCats = [catA1, catA2, catB1, catB2];
        const uniqueCats = new Set(allCats);
        if (uniqueCats.size === 1) {
          s += 35;
          factors.push(`all same category(${catA1}): +35`);
        } else if (catA1 === catA2 && catB1 === catB2) {
          s += 15;
          factors.push(`teams same category(${catA1} vs ${catB1}): +15`);
        }

        const highCount = [gradeA1, gradeA2, gradeB1, gradeB2].filter(g => g >= 6).length;
        if (highCount === 4) {
          s += 30;
          factors.push(`all high ranked: +30`);
        } else if (highCount >= 3) {
          s += 8;
          factors.push(`mostly high ranked(${highCount}/4): +8`);
        }
      }

      const genderScoring = scoreGenderFactors(candidate, eligible, mixedMaleCounts, cfg, localPairings, localOpponents);
      s += genderScoring.score;
      factors.push(...genderScoring.factors);
      if (bd) bd.gender += genderScoring.score;

      const groupPenalty = scoreGroupRepeat(candidate, localGroupHistory, cfg);
      if (groupPenalty.score !== 0) {
        s += groupPenalty.score;
        factors.push(...groupPenalty.factors);
        if (bd) bd.variety += groupPenalty.score;
      }

      return { score: s, factors, breakdown: bd };
    };

    for (const candidate of candidates) {
      const result = scoreCandidate(candidate, true);
      if (!result) continue;

      candidatesEvaluated++;
      if (result.score > bestScore || (result.score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = result.score;
        bestMatch = candidate;
        bestFactors = result.factors;
        if (result.breakdown) bestBreakdown = result.breakdown;
      }
    }

    if (!bestMatch && candidatePool !== eligible) {
      const compFallback = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states, cfg);
      for (const candidate of compFallback) {
        const result = scoreCandidate(candidate, true);
        if (!result) continue;
        candidatesEvaluated++;
        if (result.score > bestScore || (result.score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = result.score;
          bestMatch = candidate;
          bestFactors = result.factors;
          if (result.breakdown) bestBreakdown = result.breakdown;
        }
      }
    }

    if (!bestMatch) {
      const anyTypeFallback = candidatePool === eligible
        ? candidates
        : generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states, cfg);
      for (const candidate of anyTypeFallback) {
        const result = scoreCandidate(candidate, false);
        if (!result) continue;
        candidatesEvaluated++;
        if (result.score > bestScore || (result.score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = result.score;
          bestMatch = candidate;
          bestFactors = result.factors;
          if (result.breakdown) bestBreakdown = result.breakdown;
        }
      }
    }

    if (bestMatch) {
      if (hasFixedPairs) {
        const blocked = checkDuplicateMatchup(bestMatch, results);
        if (blocked) {
          const alternative = findAlternativeMatch(candidates, results, states, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs!, phase, topMatchTracker, matchScoreHistory, cfg);
          if (alternative) {
            bestMatch = alternative.match;
            bestScore = alternative.score;
            bestFactors = alternative.factors;
          } else {
            return {
              matches: results,
              pairConstraintBlocked: true,
              pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
              scoringLogs,
            };
          }
        }
      }

      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamAPlayer2Id, bestMatch.teamBPlayer1Id, bestMatch.teamBPlayer2Id].filter(Boolean) as number[];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      const bestMatchType = getMatchType(bestMatch, eligible);
      if (bestMatchType === "MIXED") {
        const malesInMatch = getMalesInMatch(bestMatch, eligible);
        for (const maleId of malesInMatch) {
          mixedMaleCounts.set(maleId, (mixedMaleCounts.get(maleId) || 0) + 1);
        }
        const femalesInMatch = ids.filter(id => {
          const p = eligible.find(pp => pp.id === id);
          return p && getEffectiveGender(p) === "FEMALE";
        });
        for (const fId of femalesInMatch) {
          mixedMaleCounts.set(fId, (mixedMaleCounts.get(fId) || 0) + 1);
        }
      }

      trackOpponentHistory(bestMatch, opponentHistory, cfg);

      bestMatch.qualityScore = bestScore;
      if (bestBreakdown) bestMatch.breakdown = bestBreakdown;
      for (const id of ids) {
        topMatchTracker.set(id, (topMatchTracker.get(id) || 0) + 1);
      }
      trackGroupRepeat(bestMatch, localGroupHistory);

      results.push(bestMatch);
      scoringLogs.push({
        matchIndex: q,
        candidatesEvaluated,
        winner: bestMatch,
        winnerScore: bestScore,
        topFactors: bestFactors.slice(0, 5),
      });
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      if (hasFixedPairs && results.length === 0) {
        return {
          matches: [],
          pairConstraintBlocked: true,
          pairConstraintMessage: "Not enough available players to create a different opponent pairing. Waiting for a current match to finish to allow new combinations.",
          scoringLogs,
        };
      }
      break;
    }
  }

  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateCompetitiveSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
  const totalSessionMatches = settings?.totalSessionMatches ?? 0;
  const matchScoreHistory = settings?.matchScoreHistory;

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 2) break;

    const phase = getSessionPhase(totalSessionMatches + results.length, players.length);
    const weights = cfg.enablePhaseAdjustments ? getPhaseWeights(phase) : { deficitMultiplier: 1.0, qualityMultiplier: 1.0, varietyMultiplier: 1.0 };

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 2, states);
    const candidatePool = fairnessPool.length >= 2 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateSingles(candidatePool, states);
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestBreakdown: ScoringBreakdown | undefined;
    let candidatesEvaluated = 0;

    const scoreCompSinglesCandidate = (candidate: MatchResult): { total: number; factors: string[] } | null => {
      if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") return null;
      const pA = eligible.find(p => p.id === candidate.teamAPlayer1Id);
      const pB = eligible.find(p => p.id === candidate.teamBPlayer1Id);
      if (!pA || !pB) return null;
      const gradeDiff = Math.abs(getGradeRank(pA.grade) - getGradeRank(pB.grade));
      if (gradeDiff > Math.max(cfg.gradeSpreadLimit - 1, 2)) return null;
      const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
      const oppCount = localOpponents.get(key) || 0;
      const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
      const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
      const deficitA = countA - globalMin;
      const deficitB = countB - globalMin;

      const factors: string[] = [];

      const avgRank = (getGradeRank(pA.grade) + getGradeRank(pB.grade)) / 2;
      const qualityScore = Math.round(getMatchQualityScore(avgRank, gradeDiff) * cfg.qualityWeight * weights.qualityMultiplier);

      const gradeBalancePenalty = -gradeDiff * 15;
      let total = Math.round(-(oppCount * Math.abs(cfg.opponentRepeatWeight)) * weights.varietyMultiplier) +
        Math.round(getDeficitPenalty(deficitA, cfg) * weights.deficitMultiplier) +
        Math.round(getDeficitPenalty(deficitB, cfg) * weights.deficitMultiplier) +
        Math.round((countA + countB) * cfg.gamesPlayedWeight * weights.deficitMultiplier) +
        gradeBalancePenalty + qualityScore;

      if (oppCount > 0) factors.push(`opponent repeat x${oppCount}: ${Math.round(-(oppCount * Math.abs(cfg.opponentRepeatWeight)) * weights.varietyMultiplier)}`);
      if (gradeDiff > 0) factors.push(`grade diff(${gradeDiff}): ${gradeBalancePenalty}`);
      if (deficitA > 0 || deficitB > 0) factors.push(`deficit(${deficitA}+${deficitB}): ${Math.round(getDeficitPenalty(deficitA, cfg) * weights.deficitMultiplier) + Math.round(getDeficitPenalty(deficitB, cfg) * weights.deficitMultiplier)}`);
      if (qualityScore !== 0) factors.push(`quality(avg ${avgRank.toFixed(1)}, spread ${gradeDiff}): ${qualityScore > 0 ? "+" : ""}${qualityScore}`);

      const catA = getCategoryFromGrade(pA.grade);
      const catB = getCategoryFromGrade(pB.grade);
      if (catA === catB) { total += 25; factors.push(`same category(${catA}): +25`); }
      const gA = getGradeRank(pA.grade);
      const gB = getGradeRank(pB.grade);
      if (gA >= 6 && gB >= 6 && gradeDiff <= 2) { total += 40; factors.push(`high-level quality: +40`); }
      else if (gA >= 4 && gB >= 4 && gradeDiff <= 2) { total += 20; factors.push(`mid-level quality: +20`); }
      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { const bonus = getPriorityScore(deficitA, cfg); total += bonus; factors.push(`priority: +${bonus}`); }
        if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { const bonus = getPriorityScore(deficitB, cfg); total += bonus; factors.push(`priority: +${bonus}`); }
      }

      if (matchScoreHistory) {
        const { score: cs, factors: cf } = getClosenessBonus([candidate.teamAPlayer1Id], [candidate.teamBPlayer1Id], matchScoreHistory);
        total += cs;
        factors.push(...cf);
      }

      return { total, factors };
    };

    for (const candidate of candidates) {
      const result = scoreCompSinglesCandidate(candidate);
      if (!result) continue;
      candidatesEvaluated++;
      if (result.total > bestScore || (result.total === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = result.total;
        bestMatch = candidate;
        bestFactors = result.factors;
      }
    }

    if (!bestMatch && candidatePool !== eligible) {
      const compSinglesFallback = generateDeterministicCandidateSingles(eligible, states);
      for (const candidate of compSinglesFallback) {
        const result = scoreCompSinglesCandidate(candidate);
        if (!result) continue;
        candidatesEvaluated++;
        if (result.total > bestScore || (result.total === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = result.total;
          bestMatch = candidate;
          bestFactors = result.factors;
        }
      }
    }

    if (bestMatch) {
      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      bestMatch.qualityScore = bestScore;
      if (bestBreakdown) bestMatch.breakdown = bestBreakdown;
      results.push(bestMatch);
      scoringLogs.push({
        matchIndex: q,
        candidatesEvaluated,
        winner: bestMatch,
        winnerScore: bestScore,
        topFactors: bestFactors.slice(0, 5),
      });
      const key = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
      localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
      localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
      localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }

  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function deterministicTiebreak(a: MatchResult, b: MatchResult): boolean {
  if (!b) return true;
  const aIds = [a.teamAPlayer1Id, a.teamAPlayer2Id, a.teamBPlayer1Id, a.teamBPlayer2Id].filter(Boolean) as number[];
  const bIds = [b.teamAPlayer1Id, b.teamAPlayer2Id, b.teamBPlayer1Id, b.teamBPlayer2Id].filter(Boolean) as number[];
  const aSum = aIds.reduce((s, id) => s + id, 0);
  const bSum = bIds.reduce((s, id) => s + id, 0);
  if (aSum !== bSum) return aSum < bSum;
  const aMin = Math.min(...aIds);
  const bMin = Math.min(...bIds);
  return aMin < bMin;
}

function checkDuplicateMatchup(match: MatchResult, existingResults: MatchResult[]): boolean {
  const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id!].sort((a, b) => a - b);
  const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id!].sort((a, b) => a - b);
  const matchupKey = opponentPairKey(teamA, teamB);
  const reverseKey = opponentPairKey(teamB, teamA);

  for (const prev of existingResults) {
    const prevA = [prev.teamAPlayer1Id, prev.teamAPlayer2Id!].sort((a, b) => a - b);
    const prevB = [prev.teamBPlayer1Id, prev.teamBPlayer2Id!].sort((a, b) => a - b);
    const prevKey = opponentPairKey(prevA, prevB);
    const prevRevKey = opponentPairKey(prevB, prevA);
    if (matchupKey === prevKey || matchupKey === prevRevKey || reverseKey === prevKey || reverseKey === prevRevKey) {
      return true;
    }
  }
  return false;
}

function findAlternativeMatch(
  candidates: MatchResult[],
  existingResults: MatchResult[],
  states: PlayerStateMap,
  localPairings: Map<string, number>,
  localOpponents: Map<string, number>,
  localCounts: Map<number, number>,
  priorityPlayerIds: number[] | undefined,
  eligible: Player[],
  fixedPairs: FixedPair[],
  phase?: SessionPhase,
  topMatchTracker?: TopMatchTracker,
  matchScoreHistory?: Map<string, number[]>,
  cfg?: MatchEngineSettings
): { match: MatchResult; score: number; factors: string[] } | null {
  const c = cfg || DEFAULT_SETTINGS;
  let altBest: MatchResult | null = null;
  let altBestScore = -Infinity;
  let altBestFactors: string[] = [];
  const emptyMaleCounts = new Map<number, number>();

  for (const candidate of candidates) {
    const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
    if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
    if (checkDuplicateMatchup(candidate, existingResults)) continue;
    if (isGenderUnfairDoubles(candidate, eligible)) continue;
    const mt = getMatchType(candidate, eligible);
    if (mt === "MIXED" && !isProperMixedDoubles(candidate, eligible)) continue;

    const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
    const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
    let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs, phase, topMatchTracker, matchScoreHistory, c);

    const genderScoring = scoreGenderFactors(candidate, eligible, emptyMaleCounts, c, localPairings, localOpponents);
    s += genderScoring.score;
    factors.push(...genderScoring.factors);

    if (s > altBestScore) {
      altBestScore = s;
      altBest = candidate;
      altBestFactors = factors;
    }
  }

  if (altBest) {
    return { match: altBest, score: altBestScore, factors: altBestFactors };
  }
  return null;
}

function filterByGender(players: Player[], genderType: string): Player[] {
  if (genderType === "FEMALE") return players.filter(p => getEffectiveGender(p) === "FEMALE");
  if (genderType === "MALE") return players.filter(p => getEffectiveGender(p) !== "FEMALE");
  return players;
}

function isGenderUnfairDoubles(candidate: MatchResult, playerPool: Player[]): boolean {
  const getPlayer = (id: number) => playerPool.find(p => p.id === id);
  const p1 = getPlayer(candidate.teamAPlayer1Id);
  const p2 = candidate.teamAPlayer2Id ? getPlayer(candidate.teamAPlayer2Id) : null;
  const p3 = getPlayer(candidate.teamBPlayer1Id);
  const p4 = candidate.teamBPlayer2Id ? getPlayer(candidate.teamBPlayer2Id) : null;
  if (!p1 || !p2 || !p3 || !p4) return false;

  const allPlayers = [p1, p2, p3, p4];
  const hasMale = allPlayers.some(p => getEffectiveGender(p) !== "FEMALE");
  const hasFemale = allPlayers.some(p => getEffectiveGender(p) === "FEMALE");

  if (hasMale && hasFemale) {
    const teamAFemales = [p1, p2].filter(p => getEffectiveGender(p) === "FEMALE").length;
    const teamBFemales = [p3, p4].filter(p => getEffectiveGender(p) === "FEMALE").length;
    if (teamAFemales !== 1 || teamBFemales !== 1) return true;
  }

  return false;
}

function isProperMixedDoubles(candidate: MatchResult, playerPool: Player[]): boolean {
  const getPlayer = (id: number) => playerPool.find(p => p.id === id);
  const p1 = getPlayer(candidate.teamAPlayer1Id);
  const p2 = candidate.teamAPlayer2Id ? getPlayer(candidate.teamAPlayer2Id) : null;
  const p3 = getPlayer(candidate.teamBPlayer1Id);
  const p4 = candidate.teamBPlayer2Id ? getPlayer(candidate.teamBPlayer2Id) : null;
  if (!p1 || !p2 || !p3 || !p4) return false;

  const teamAFemales = [p1, p2].filter(p => getEffectiveGender(p) === "FEMALE").length;
  const teamBFemales = [p3, p4].filter(p => getEffectiveGender(p) === "FEMALE").length;

  return teamAFemales === 1 && teamBFemales === 1;
}

function getCategoryFromGrade(grade: string | null): string {
  if (!grade) return "D";
  if (grade.startsWith("A")) return "A";
  if (grade.startsWith("B")) return "B";
  if (grade.startsWith("C")) return "C";
  return "D";
}

function updateTrackingMaps(
  match: MatchResult,
  pairings: Map<string, number>,
  opponents: Map<string, number>,
  counts: Map<number, number>
) {
  if (match.teamAPlayer2Id) {
    const teamAKey = pairKey(match.teamAPlayer1Id, match.teamAPlayer2Id);
    pairings.set(teamAKey, (pairings.get(teamAKey) || 0) + 1);
  }
  if (match.teamBPlayer2Id) {
    const teamBKey = pairKey(match.teamBPlayer1Id, match.teamBPlayer2Id);
    pairings.set(teamBKey, (pairings.get(teamBKey) || 0) + 1);
  }

  const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
  const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
  for (const a of teamA) {
    for (const b of teamB) {
      const key = pairKey(a, b);
      opponents.set(key, (opponents.get(key) || 0) + 1);
    }
  }

  for (const pid of [...teamA, ...teamB]) {
    counts.set(pid, (counts.get(pid) || 0) + 1);
  }
}

export function replacePlayerInQueuedMatches(
  queuedMatches: { id: number; teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null }[],
  pausedPlayerId: number,
  availablePlayers: Player[],
  fixedPairs?: FixedPair[]
): { matchId: number; position: string; newPlayerId: number }[] {
  const replacements: { matchId: number; position: string; newPlayerId: number }[] = [];
  const usedReplacements = new Set<number>();

  const partnerId = fixedPairs ? getFixedPartner(pausedPlayerId, fixedPairs) : null;

  for (const match of queuedMatches) {
    const positions = [
      { field: "teamAPlayer1Id" as const, id: match.teamAPlayer1Id },
      { field: "teamAPlayer2Id" as const, id: match.teamAPlayer2Id },
      { field: "teamBPlayer1Id" as const, id: match.teamBPlayer1Id },
      { field: "teamBPlayer2Id" as const, id: match.teamBPlayer2Id },
    ];

    const playersToReplace = [pausedPlayerId];
    if (partnerId) playersToReplace.push(partnerId);

    for (const pos of positions) {
      if (pos.id !== null && playersToReplace.includes(pos.id)) {
        const matchPlayerIds = new Set(positions.map(p => p.id).filter(Boolean));
        const sorted = deterministicSort(availablePlayers);
        const replacement = sorted.find(p =>
          !p.isPaused &&
          p.id !== pausedPlayerId &&
          (partnerId === null || p.id !== partnerId) &&
          !matchPlayerIds.has(p.id) &&
          !usedReplacements.has(p.id)
        );

        if (replacement) {
          replacements.push({ matchId: match.id, position: pos.field, newPlayerId: replacement.id });
          usedReplacements.add(replacement.id);
        }
      }
    }
  }

  return replacements;
}

export function buildPairingHistory(
  matches: { teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null; status: string }[]
): { recentPairings: Map<string, number>; recentOpponents: Map<string, number>; playerMatchCounts: Map<number, number> } {
  const recentPairings = new Map<string, number>();
  const recentOpponents = new Map<string, number>();
  const playerMatchCounts = new Map<number, number>();

  for (const match of matches) {
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];

    if (teamA.length === 2) {
      const key = pairKey(teamA[0], teamA[1]);
      recentPairings.set(key, (recentPairings.get(key) || 0) + 1);
    }
    if (teamB.length === 2) {
      const key = pairKey(teamB[0], teamB[1]);
      recentPairings.set(key, (recentPairings.get(key) || 0) + 1);
    }

    for (const a of teamA) {
      for (const b of teamB) {
        const key = pairKey(a, b);
        recentOpponents.set(key, (recentOpponents.get(key) || 0) + 1);
      }
    }

    for (const pid of [...teamA, ...teamB]) {
      playerMatchCounts.set(pid, (playerMatchCounts.get(pid) || 0) + 1);
    }
  }

  return { recentPairings, recentOpponents, playerMatchCounts };
}

export function countExistingMatchTypes(
  matches: { teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null; status: string }[],
  playerGenders: Map<number, string>
): { maleOnly: number; femaleOnly: number; mixed: number } {
  let maleOnly = 0, femaleOnly = 0, mixed = 0;
  for (const m of matches) {
    const ids = [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
    const genders = ids.map(id => playerGenders.get(id) || "MALE");
    const hasMale = genders.some(g => g !== "FEMALE");
    const hasFemale = genders.some(g => g === "FEMALE");
    if (hasMale && hasFemale) mixed++;
    else if (hasFemale) femaleOnly++;
    else maleOnly++;
  }
  return { maleOnly, femaleOnly, mixed };
}

export { getGradeRank, isHighGrade, isLowGrade };

function generateHybridDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 4);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const localGroupHistory = new Map<string, number>();
  const mixedMaleCounts = new Map<number, number>();
  const opponentHistory: PlayerOpponentHistory = new Map();

  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;
  const groupSize = Math.max(4, Math.min(cfg.hybridGroupSize, 8));

  const hybridExistingCounts = settings?.existingMatchTypeCounts;
  const hybridSlots = computeMatchSlots(queueTarget, eligible, states, cfg, hybridExistingCounts);

  for (let q = 0; q < queueTarget; q++) {
    const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
    if (available.length < 4) break;

    const sorted = [...available].sort((a, b) => {
      const ca = localCounts.get(a.id) || 0;
      const cb = localCounts.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return a.id - b.id;
    });

    const groupPool = sorted.slice(0, Math.min(groupSize, sorted.length));
    if (groupPool.length < 4) break;

    if (hasFixedPairs) {
      for (const [a, b] of fixedPairs!) {
        const aInGroup = groupPool.some(p => p.id === a);
        const bInGroup = groupPool.some(p => p.id === b);
        if (aInGroup && !bInGroup) {
          const partner = sorted.find(p => p.id === b);
          if (partner && states.get(b) === "AVAILABLE") {
            const extra = groupPool.find(pp => pp.id !== a && !fixedPairs!.some(([x, y]) => x === pp.id || y === pp.id));
            if (extra) {
              const idx = groupPool.indexOf(extra);
              if (idx >= 0) groupPool[idx] = partner;
              else groupPool.push(partner);
            } else {
              groupPool.push(partner);
            }
          }
        } else if (bInGroup && !aInGroup) {
          const partner = sorted.find(p => p.id === a);
          if (partner && states.get(a) === "AVAILABLE") {
            const extra = groupPool.find(pp => pp.id !== b && !fixedPairs!.some(([x, y]) => x === pp.id || y === pp.id));
            if (extra) {
              const idx = groupPool.indexOf(extra);
              if (idx >= 0) groupPool[idx] = partner;
              else groupPool.push(partner);
            } else {
              groupPool.push(partner);
            }
          }
        }
      }
    }

    const slotType = hybridSlots[q];

    let candidates: MatchResult[];
    if (slotType === "MIXED") {
      candidates = generateMixedDoublesCandidates(groupPool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateMixedDoublesCandidates(eligible, fixedPairs || [], states, cfg);
    } else if (slotType === "FEMALE_ONLY") {
      candidates = generateFemaleOnlyCandidates(groupPool, fixedPairs || [], states, cfg);
      if (candidates.length === 0) candidates = generateFemaleOnlyCandidates(eligible, fixedPairs || [], states, cfg);
    } else {
      candidates = generateDeterministicCandidateDoubles(groupPool, fixedPairs || [], states, cfg);
    }
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestBreakdown: ScoringBreakdown | undefined;
    let candidatesEvaluated = 0;

    for (const candidate of candidates) {
      const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;

      if (isGenderUnfairDoubles(candidate, groupPool)) continue;

      const mt = getMatchType(candidate, groupPool);
      if (mt === "MIXED" && !isProperMixedDoubles(candidate, groupPool)) continue;
      if (mt !== slotType) continue;

      const allIds = ids;
      const grades = allIds.map(id => {
        const p = groupPool.find(pp => pp.id === id);
        return p ? getGradeRank(p.grade) : 1;
      });
      const spread = Math.max(...grades) - Math.min(...grades);
      if (spread > cfg.hybridGradeSpreadLimit) continue;

      const gk = groupKey(allIds);
      const groupCount = localGroupHistory.get(gk) || 0;
      if (groupCount >= cfg.hybridGroupCooldown) continue;

      if (hasOpponentCooldown(candidate, opponentHistory, cfg)) continue;

      candidatesEvaluated++;

      let score = 0;
      const factors: string[] = [];
      let fairnessTotal = 0;
      let varietyTotal = 0;
      let qualityTotal = 0;

      const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
      for (const id of allIds) {
        const played = localCounts.get(id) || 0;
        const deficit = played - globalMin;
        const pen = getDeficitPenalty(deficit, cfg);
        score += pen;
        fairnessTotal += pen;
        if (deficit > 0) factors.push(`deficit(${id})=${deficit}: ${pen}`);
      }

      for (const a of [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!]) {
        for (const b of [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!]) {
          const oppKey = pairKey(a, b);
          const oppCount = localOpponents.get(oppKey) || 0;
          if (oppCount > 0) {
            const pen = Math.round(-oppCount * Math.abs(cfg.opponentRepeatWeight));
            score += pen;
            varietyTotal += pen;
            factors.push(`opp repeat(${a}v${b})x${oppCount}: ${pen}`);
          }
        }
      }

      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      for (const pair of [team, opp]) {
        const pk = pairKey(pair[0], pair[1]);
        const pairCount = localPairings.get(pk) || 0;
        if (pairCount > 0) {
          const pen = getPartnerPenalty(pairCount, cfg);
          score += pen;
          varietyTotal += pen;
          factors.push(`partner repeat(${pair[0]},${pair[1]})x${pairCount}: ${pen}`);
        }
      }

      if (groupCount > 0) {
        const pen = Math.round(groupCount * (cfg.groupRepeatPenalty * 0.5));
        score += pen;
        varietyTotal += pen;
        factors.push(`group repeat x${groupCount}: ${pen}`);
      }

      {
        const matchType = getMatchType(candidate, groupPool);
        if (matchType === "MIXED") {
          const malesInMatch = getMalesInMatch(candidate, groupPool);
          for (const maleId of malesInMatch) {
            const maleUses = mixedMaleCounts.get(maleId) || 0;
            if (maleUses > 0) {
              const rotPen = maleUses * cfg.maleRotationScaling;
              score += rotPen;
              factors.push(`mixed rotation(${maleId})x${maleUses}: ${rotPen}`);
            }
          }
        }
      }

      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
      const qualityScore = Math.round(getMatchQualityScore(avgGrade, spread) * cfg.qualityWeight * 0.5);
      score += qualityScore;
      qualityTotal += qualityScore;
      if (qualityScore !== 0) factors.push(`quality(avg${avgGrade.toFixed(1)},spread${spread}): ${qualityScore}`);

      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        for (const id of allIds) {
          if (priorityPlayerIds.includes(id)) {
            const played = localCounts.get(id) || 0;
            const deficit = played - globalMin;
            const bonus = getPriorityScore(deficit, cfg);
            score += bonus;
            factors.push(`priority(${id}): +${bonus}`);
          }
        }
      }

      const bd: ScoringBreakdown = { fairness: fairnessTotal, variety: varietyTotal, quality: qualityTotal, priority: 0, gender: 0, total: score };

      if (score > bestScore || (score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = score;
        bestMatch = candidate;
        bestFactors = factors;
        bestBreakdown = bd;
      }
    }

    if (!bestMatch) {
      const fallbackCandidates = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states, cfg);
      for (const candidate of fallbackCandidates) {
        const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
        if (isGenderUnfairDoubles(candidate, eligible)) continue;
        const mt = getMatchType(candidate, eligible);
        if (mt === "MIXED" && !isProperMixedDoubles(candidate, eligible)) continue;
        candidatesEvaluated++;

        let score = 0;
        const factors: string[] = ["fallback"];
        const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
        for (const id of ids) {
          const played = localCounts.get(id) || 0;
          const deficit = played - globalMin;
          score += getDeficitPenalty(deficit, cfg);
        }

        const bd: ScoringBreakdown = { fairness: score, variety: 0, quality: 0, priority: 0, gender: 0, total: score };
        if (score > bestScore || (score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = score;
          bestMatch = candidate;
          bestFactors = factors;
          bestBreakdown = bd;
        }
      }
    }

    if (bestMatch) {
      if (hasFixedPairs) {
        const blocked = checkDuplicateMatchup(bestMatch, results);
        if (blocked) {
          const alternative = findAlternativeMatch(candidates, results, states, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs!, undefined, undefined, undefined, cfg);
          if (alternative) {
            bestMatch = alternative.match;
            bestScore = alternative.score;
            bestFactors = alternative.factors;
          } else {
            break;
          }
        }
      }

      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamAPlayer2Id, bestMatch.teamBPlayer1Id, bestMatch.teamBPlayer2Id].filter(Boolean) as number[];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      {
        const matchType = getMatchType(bestMatch, eligible);
        if (matchType === "MIXED") {
          const malesInMatch = getMalesInMatch(bestMatch, eligible);
          for (const maleId of malesInMatch) {
            mixedMaleCounts.set(maleId, (mixedMaleCounts.get(maleId) || 0) + 1);
          }
          const femalesInMatch = ids.filter(id => {
            const p = eligible.find(pp => pp.id === id);
            return p && getEffectiveGender(p) === "FEMALE";
          });
          for (const fId of femalesInMatch) {
            mixedMaleCounts.set(fId, (mixedMaleCounts.get(fId) || 0) + 1);
          }
        }
      }

      trackGroupRepeat(bestMatch, localGroupHistory);
      trackOpponentHistory(bestMatch, opponentHistory, cfg);
      bestMatch.qualityScore = bestScore;
      if (bestBreakdown) bestMatch.breakdown = bestBreakdown;

      results.push(bestMatch);
      scoringLogs.push({ matchIndex: q, candidatesEvaluated, winner: bestMatch, winnerScore: bestScore, topFactors: bestFactors.slice(0, 5) });
      updateTrackingMaps(bestMatch, localPairings, localOpponents, localCounts);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }

  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateHybridSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const groupSize = Math.max(4, Math.min(cfg.hybridGroupSize, 8));

  for (let q = 0; q < queueTarget; q++) {
    const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
    if (available.length < 2) break;

    const sorted = [...available].sort((a, b) => {
      const ca = localCounts.get(a.id) || 0;
      const cb = localCounts.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return a.id - b.id;
    });

    const groupPool = sorted.slice(0, Math.min(groupSize, sorted.length));
    if (groupPool.length < 2) break;

    const candidates = generateDeterministicCandidateSingles(groupPool, states);
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let candidatesEvaluated = 0;

    const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;

    for (const candidate of candidates) {
      if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") continue;

      const pA = groupPool.find(p => p.id === candidate.teamAPlayer1Id);
      const pB = groupPool.find(p => p.id === candidate.teamBPlayer1Id);
      if (!pA || !pB) continue;

      const gradeDiff = Math.abs(getGradeRank(pA.grade) - getGradeRank(pB.grade));
      if (gradeDiff > cfg.hybridGradeSpreadLimit) continue;

      const oppKey = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
      const oppCount = localOpponents.get(oppKey) || 0;
      if (oppCount >= 2) continue;

      candidatesEvaluated++;
      let score = 0;
      const factors: string[] = [];

      const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
      const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
      score += getDeficitPenalty(countA - globalMin, cfg);
      score += getDeficitPenalty(countB - globalMin, cfg);

      if (oppCount > 0) {
        const pen = Math.round(-oppCount * Math.abs(cfg.opponentRepeatWeight));
        score += pen;
        factors.push(`opp repeat x${oppCount}: ${pen}`);
      }

      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { const b = getPriorityScore(countA - globalMin, cfg); score += b; factors.push(`priority: +${b}`); }
        if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { const b = getPriorityScore(countB - globalMin, cfg); score += b; factors.push(`priority: +${b}`); }
      }

      if (score > bestScore || (score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = score;
        bestMatch = candidate;
        bestFactors = factors;
      }
    }

    if (!bestMatch) {
      const fallbackCandidates = generateDeterministicCandidateSingles(eligible, states);
      for (const candidate of fallbackCandidates) {
        if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") continue;
        candidatesEvaluated++;
        const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
        const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
        let score = getDeficitPenalty(countA - globalMin, cfg) + getDeficitPenalty(countB - globalMin, cfg);
        if (score > bestScore || (score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = score;
          bestMatch = candidate;
          bestFactors = ["fallback"];
        }
      }
    }

    if (bestMatch) {
      const ids = [bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id];
      const assigned = atomicAssign(states, ids);
      if (!assigned) continue;

      bestMatch.qualityScore = bestScore;
      results.push(bestMatch);
      scoringLogs.push({ matchIndex: q, candidatesEvaluated, winner: bestMatch, winnerScore: bestScore, topFactors: bestFactors.slice(0, 5) });
      const key = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
      localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
      localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
      localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
      eligible = removeUsedPlayers(eligible, bestMatch);
    } else {
      break;
    }
  }

  if (results.length > 1) {
    results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function buildGenderAwareTeams(group: Player[], fixedPairs: [number, number][], localPairings: Map<string, number>): MatchResult | null {
  if (group.length < 4) return null;
  const males = group.filter(p => getEffectiveGender(p) !== "FEMALE");
  const females = group.filter(p => getEffectiveGender(p) === "FEMALE");

  const hasMale = males.length > 0;
  const hasFemale = females.length > 0;

  if (hasMale && hasFemale) {
    if (males.length >= 2 && females.length >= 2) {
      const m1 = males[0], m2 = males[1], f1 = females[0], f2 = females[1];
      const opt1: MatchResult = { teamAPlayer1Id: m1.id, teamAPlayer2Id: f1.id, teamBPlayer1Id: m2.id, teamBPlayer2Id: f2.id };
      const opt2: MatchResult = { teamAPlayer1Id: m1.id, teamAPlayer2Id: f2.id, teamBPlayer1Id: m2.id, teamBPlayer2Id: f1.id };

      const pk1a = pairKey(opt1.teamAPlayer1Id, opt1.teamAPlayer2Id!);
      const pk1b = pairKey(opt1.teamBPlayer1Id, opt1.teamBPlayer2Id!);
      const pk2a = pairKey(opt2.teamAPlayer1Id, opt2.teamAPlayer2Id!);
      const pk2b = pairKey(opt2.teamBPlayer1Id, opt2.teamBPlayer2Id!);
      const rep1 = (localPairings.get(pk1a) || 0) + (localPairings.get(pk1b) || 0);
      const rep2 = (localPairings.get(pk2a) || 0) + (localPairings.get(pk2b) || 0);

      return rep1 <= rep2 ? opt1 : opt2;
    } else if (females.length >= 1 && males.length >= 1) {
      return null;
    }
  }

  const [p1, p2, p3, p4] = group;
  const candidate: MatchResult = { teamAPlayer1Id: p1.id, teamAPlayer2Id: p4.id, teamBPlayer1Id: p2.id, teamBPlayer2Id: p3.id };

  const pk1 = pairKey(candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!);
  const pk2 = pairKey(candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!);
  if ((localPairings.get(pk1) || 0) > 0 || (localPairings.get(pk2) || 0) > 0) {
    return { teamAPlayer1Id: p1.id, teamAPlayer2Id: p3.id, teamBPlayer1Id: p2.id, teamBPlayer2Id: p4.id };
  }
  return candidate;
}

function generateRotationDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, fixedPairs, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 4);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);

  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;

  const rotExistingCounts = settings?.existingMatchTypeCounts;
  const matchSlots = computeMatchSlots(queueTarget, eligible, states, cfg, rotExistingCounts);

  for (let q = 0; q < matchSlots.length; q++) {
    const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
    if (available.length < 4) break;

    const slotType = matchSlots[q];
    const factors: string[] = ["rotation", `slot:${slotType}`];

    const sorted = [...available].sort((a, b) => {
      const ca = localCounts.get(a.id) || 0;
      const cb = localCounts.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return a.id - b.id;
    });

    let group: Player[];
    if (slotType === "FEMALE_ONLY") {
      const femaleSorted = sorted.filter(p => getEffectiveGender(p) === "FEMALE");
      if (femaleSorted.length < 4) {
        group = sorted.slice(0, 4);
      } else {
        group = femaleSorted.slice(0, 4);
      }
    } else if (slotType === "MIXED") {
      const femaleSorted = sorted.filter(p => getEffectiveGender(p) === "FEMALE");
      const maleSorted = sorted.filter(p => getEffectiveGender(p) !== "FEMALE");
      if (femaleSorted.length >= 2 && maleSorted.length >= 2) {
        group = [maleSorted[0], maleSorted[1], femaleSorted[0], femaleSorted[1]];
      } else {
        group = sorted.slice(0, 4);
      }
    } else {
      const maleSorted = sorted.filter(p => getEffectiveGender(p) !== "FEMALE");
      if (maleSorted.length >= 4) {
        group = maleSorted.slice(0, 4);
      } else {
        group = sorted.slice(0, 4);
      }
    }

    if (hasFixedPairs) {
      for (const [a, b] of fixedPairs!) {
        const groupIds = group.map(p => p.id);
        const aInGroup = groupIds.includes(a);
        const bInGroup = groupIds.includes(b);
        if (aInGroup && !bInGroup) {
          const partner = sorted.find(p => p.id === b && states.get(p.id) === "AVAILABLE");
          if (partner) {
            const replaceIdx = group.findIndex(p => p.id !== a && !fixedPairs!.some(([x, y]) => x === p.id || y === p.id));
            if (replaceIdx >= 0) group[replaceIdx] = partner;
            else if (group.length < 5) group.push(partner);
          }
        } else if (bInGroup && !aInGroup) {
          const partner = sorted.find(p => p.id === a && states.get(p.id) === "AVAILABLE");
          if (partner) {
            const replaceIdx = group.findIndex(p => p.id !== b && !fixedPairs!.some(([x, y]) => x === p.id || y === p.id));
            if (replaceIdx >= 0) group[replaceIdx] = partner;
            else if (group.length < 5) group.push(partner);
          }
        }
      }
    }

    if (group.length < 4) break;

    let usedCandidate: MatchResult | null = null;

    if (slotType === "MIXED") {
      usedCandidate = buildGenderAwareTeams(group, fixedPairs || [], localPairings);
      if (usedCandidate) {
        factors.push("gender-aware mixed");
      }
    }

    if (!usedCandidate) {
      let [p1, p2, p3, p4] = group;

      if (hasFixedPairs) {
        for (const [a, b] of fixedPairs!) {
          const fourIds = [p1.id, p2.id, p3.id, p4.id];
          const aIdx = fourIds.indexOf(a);
          const bIdx = fourIds.indexOf(b);
          if (aIdx >= 0 && bIdx >= 0 && ((aIdx < 2) !== (bIdx < 2))) {
            const fourPlayers = [p1, p2, p3, p4];
            if (aIdx < 2) {
              const targetIdx = aIdx === 0 ? 1 : 0;
              [fourPlayers[targetIdx], fourPlayers[bIdx]] = [fourPlayers[bIdx], fourPlayers[targetIdx]];
            } else {
              const targetIdx = bIdx < 2 ? (bIdx === 0 ? 1 : 0) : (bIdx === 2 ? 3 : 2);
              [fourPlayers[targetIdx], fourPlayers[aIdx]] = [fourPlayers[aIdx], fourPlayers[targetIdx]];
            }
            [p1, p2, p3, p4] = fourPlayers;
          }
        }
      }

      const candidate: MatchResult = {
        teamAPlayer1Id: p1.id,
        teamAPlayer2Id: p4.id,
        teamBPlayer1Id: p2.id,
        teamBPlayer2Id: p3.id,
      };

      usedCandidate = candidate;

      const pk1 = pairKey(candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!);
      const pk2 = pairKey(candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!);
      const recentPartnerA = (localPairings.get(pk1) || 0) > 0;
      const recentPartnerB = (localPairings.get(pk2) || 0) > 0;

      if (recentPartnerA || recentPartnerB) {
        const alt: MatchResult = {
          teamAPlayer1Id: p1.id,
          teamAPlayer2Id: p3.id,
          teamBPlayer1Id: p2.id,
          teamBPlayer2Id: p4.id,
        };
        if (hasFixedPairs && !candidateRespectsFixedPairs(alt, fixedPairs!)) {
          const alt2: MatchResult = {
            teamAPlayer1Id: p1.id,
            teamAPlayer2Id: p2.id,
            teamBPlayer1Id: p3.id,
            teamBPlayer2Id: p4.id,
          };
          if (candidateRespectsFixedPairs(alt2, fixedPairs!)) {
            usedCandidate = alt2;
            factors.push("partner swap alt2");
          }
        } else {
          usedCandidate = alt;
          factors.push("partner swap");
        }
      }
    }

    if (isGenderUnfairDoubles(usedCandidate, eligible)) {
      const altCandidate = buildGenderAwareTeams(group, fixedPairs || [], localPairings);
      if (altCandidate && !isGenderUnfairDoubles(altCandidate, eligible)) {
        usedCandidate = altCandidate;
        factors.push("gender-corrected");
      } else {
        continue;
      }
    }

    if (hasFixedPairs && !candidateRespectsFixedPairs(usedCandidate, fixedPairs!)) {
      continue;
    }

    if (hasFixedPairs && checkDuplicateMatchup(usedCandidate, results)) {
      continue;
    }

    const ids = [usedCandidate.teamAPlayer1Id, usedCandidate.teamAPlayer2Id, usedCandidate.teamBPlayer1Id, usedCandidate.teamBPlayer2Id].filter(Boolean) as number[];
    const assigned = atomicAssign(states, ids);
    if (!assigned) continue;

    const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
    let score = 0;
    for (const id of ids) {
      const deficit = (localCounts.get(id) || 0) - globalMin;
      score += getDeficitPenalty(deficit, cfg);
    }
    usedCandidate.qualityScore = score;
    usedCandidate.breakdown = { fairness: score, variety: 0, quality: 0, priority: 0, gender: 0, total: score };

    results.push(usedCandidate);
    scoringLogs.push({ matchIndex: q, candidatesEvaluated: 1, winner: usedCandidate, winnerScore: score, topFactors: factors });
    updateTrackingMaps(usedCandidate, localPairings, localOpponents, localCounts);
    eligible = removeUsedPlayers(eligible, usedCandidate);
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateRotationSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, settings } = opts;
  const cfg = settings?.engineConfig || DEFAULT_SETTINGS;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);

  for (let q = 0; q < queueTarget; q++) {
    const available = eligible.filter(p => states.get(p.id) === "AVAILABLE");
    if (available.length < 2) break;

    const sorted = [...available].sort((a, b) => {
      const ca = localCounts.get(a.id) || 0;
      const cb = localCounts.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return a.id - b.id;
    });

    let chosen: [Player, Player] = [sorted[0], sorted[1]];

    const oppKey = pairKey(sorted[0].id, sorted[1].id);
    const recentOpp = (localOpponents.get(oppKey) || 0) > 0;
    if (recentOpp && sorted.length >= 3) {
      const altKey = pairKey(sorted[0].id, sorted[2].id);
      const altRecentOpp = (localOpponents.get(altKey) || 0) > 0;
      if (!altRecentOpp) {
        chosen = [sorted[0], sorted[2]];
      }
    }

    const candidate: MatchResult = {
      teamAPlayer1Id: chosen[0].id,
      teamAPlayer2Id: null,
      teamBPlayer1Id: chosen[1].id,
      teamBPlayer2Id: null,
    };

    const ids = [candidate.teamAPlayer1Id, candidate.teamBPlayer1Id];
    const assigned = atomicAssign(states, ids);
    if (!assigned) continue;

    const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;
    let score = 0;
    for (const id of ids) {
      const deficit = (localCounts.get(id) || 0) - globalMin;
      score += getDeficitPenalty(deficit, cfg);
    }
    candidate.qualityScore = score;
    candidate.breakdown = { fairness: score, variety: 0, quality: 0, priority: 0, gender: 0, total: score };

    results.push(candidate);
    scoringLogs.push({ matchIndex: q, candidatesEvaluated: 1, winner: candidate, winnerScore: score, topFactors: ["rotation"] });
    const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
    localOpponents.set(key, (localOpponents.get(key) || 0) + 1);
    localCounts.set(candidate.teamAPlayer1Id, (localCounts.get(candidate.teamAPlayer1Id) || 0) + 1);
    localCounts.set(candidate.teamBPlayer1Id, (localCounts.get(candidate.teamBPlayer1Id) || 0) + 1);
    eligible = removeUsedPlayers(eligible, candidate);
  }

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

export function generateSmartMatches(opts: GenerateOptions): GenerateResult {
  const { mode, playersPerSide, settings } = opts;
  const matchmakingMode: MatchmakingMode = settings?.engineConfig?.matchmakingMode || "ADVANCED";

  if (matchmakingMode === "ROTATION") {
    if (playersPerSide === 1) return generateRotationSingles(opts);
    return generateRotationDoubles(opts);
  }

  if (matchmakingMode === "HYBRID") {
    if (playersPerSide === 1) return generateHybridSingles(opts);
    return generateHybridDoubles(opts);
  }

  if (mode === "SOCIAL") {
    if (playersPerSide === 1) return generateSocialSingles(opts);
    return generateSocialDoubles(opts);
  } else {
    if (playersPerSide === 1) return generateCompetitiveSingles(opts);
    return generateCompetitiveDoubles(opts);
  }
}
