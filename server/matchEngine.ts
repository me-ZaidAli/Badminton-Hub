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

type MatchType = "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";

type EngineSettings = {
  matchScoreHistory?: Map<string, number[]>;
  totalSessionMatches?: number;
  engineConfig?: MatchEngineSettings;
  existingMatchTypeCounts?: { maleOnly: number; femaleOnly: number; mixed: number };
  playerLastMatchTypes?: Map<number, MatchType>;
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

type QualityTag = "HIGH" | "MEDIUM" | "LOW";

type SelectionUnit = {
  type: "PAIR" | "SINGLE";
  players: Player[];
  effectiveGames: number;
  pairId?: string;
  pairWait?: number;
};

type GenderMode = "FEMALE_ONLY" | "MIXED_ROTATION" | "OPEN";

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function getEffectiveGender(p: Player): string {
  return p.genderOverride || p.gender || "MALE";
}

function getGradeRank(grade: string | null): number {
  if (!grade) return 1;
  const idx = GRADE_ORDER.indexOf(grade as any);
  if (idx >= 0) return idx + 1;
  switch (grade) {
    case "A": return 8;
    case "B": return 5;
    case "C": return 2;
    case "D": return 1;
    default: return 1;
  }
}

function isHighGrade(grade: string | null): boolean {
  return getGradeRank(grade) >= 5;
}

function isLowGrade(grade: string | null): boolean {
  return getGradeRank(grade) <= 4;
}

function filterByGender(players: Player[], genderType: string): Player[] {
  if (genderType === "FEMALE") return players.filter(p => getEffectiveGender(p) === "FEMALE");
  if (genderType === "MALE") return players.filter(p => getEffectiveGender(p) !== "FEMALE");
  return players;
}

function getQualityTag(teamDiff: number, isFallback: boolean): QualityTag {
  if (isFallback) return "LOW";
  if (teamDiff <= 0.5) return "HIGH";
  return "MEDIUM";
}

function getFixedPartner(playerId: number, fixedPairs: FixedPair[]): number | null {
  for (const [a, b] of fixedPairs) {
    if (a === playerId) return b;
    if (b === playerId) return a;
  }
  return null;
}

function teamAvgRank(team: Player[]): number {
  return team.reduce((sum, p) => sum + getGradeRank(p.grade), 0) / team.length;
}

function buildUnits(
  eligible: Player[],
  fixedPairs: FixedPair[],
  playerMatchCounts: Map<number, number>,
  matchIndex: number,
  playerLastPlayedRound: Map<number, number>,
  pairWaitTracker: Map<string, number>
): SelectionUnit[] {
  const units: SelectionUnit[] = [];
  const assignedIds = new Set<number>();

  for (const [p1Id, p2Id] of fixedPairs) {
    const p1 = eligible.find(p => p.id === p1Id);
    const p2 = eligible.find(p => p.id === p2Id);
    if (!p1 || !p2) continue;
    if (assignedIds.has(p1Id) || assignedIds.has(p2Id)) continue;

    assignedIds.add(p1Id);
    assignedIds.add(p2Id);

    const pid = pairKey(p1Id, p2Id);
    const gamesPlayed = Math.max(
      playerMatchCounts.get(p1Id) || 0,
      playerMatchCounts.get(p2Id) || 0
    );

    const lastP1 = playerLastPlayedRound.get(p1Id) ?? -1;
    const lastP2 = playerLastPlayedRound.get(p2Id) ?? -1;
    const pairWait = matchIndex - Math.max(lastP1, lastP2);

    pairWaitTracker.set(pid, pairWait);

    const effectiveGames = gamesPlayed - (pairWait * 0.5);

    units.push({
      type: "PAIR",
      players: [p1, p2],
      effectiveGames,
      pairId: pid,
      pairWait,
    });
  }

  for (const p of eligible) {
    if (assignedIds.has(p.id)) continue;
    const gamesPlayed = playerMatchCounts.get(p.id) || 0;
    units.push({
      type: "SINGLE",
      players: [p],
      effectiveGames: gamesPlayed,
    });
  }

  return units;
}

function selectUnits(sortedUnits: SelectionUnit[]): Player[][] {
  const groups: Player[][] = [];
  const pairs = sortedUnits.filter(u => u.type === "PAIR");
  const singles = sortedUnits.filter(u => u.type === "SINGLE");

  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      groups.push([...pairs[i].players, ...pairs[j].players]);
    }
  }

  for (const pair of pairs) {
    for (let i = 0; i < singles.length; i++) {
      for (let j = i + 1; j < singles.length; j++) {
        groups.push([...pair.players, ...singles[i].players, ...singles[j].players]);
      }
    }
  }

  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      for (let k = j + 1; k < singles.length; k++) {
        for (let l = k + 1; l < singles.length; l++) {
          groups.push([
            ...singles[i].players,
            ...singles[j].players,
            ...singles[k].players,
            ...singles[l].players,
          ]);
        }
      }
    }
  }

  return groups;
}

function determineGenderMode(eligible: Player[], matchIndex: number): GenderMode {
  const femaleCount = eligible.filter(p => getEffectiveGender(p) === "FEMALE").length;

  if (femaleCount >= 4) {
    if (matchIndex % 2 === 0) return "FEMALE_ONLY";
    return "MIXED_ROTATION";
  }

  return "OPEN";
}

function groupHasFixedMixedPair(group: Player[], fixedPairs: FixedPair[]): boolean {
  for (const [p1Id, p2Id] of fixedPairs) {
    const p1 = group.find(p => p.id === p1Id);
    const p2 = group.find(p => p.id === p2Id);
    if (p1 && p2) {
      const g1 = getEffectiveGender(p1);
      const g2 = getEffectiveGender(p2);
      if (g1 !== g2) return true;
    }
  }
  return false;
}

function applyGenderRules(group: Player[], mode: GenderMode, fixedPairs?: FixedPair[]): boolean {
  const males = group.filter(p => getEffectiveGender(p) !== "FEMALE");
  const females = group.filter(p => getEffectiveGender(p) === "FEMALE");
  const hasFixedMixed = fixedPairs ? groupHasFixedMixedPair(group, fixedPairs) : false;

  if (mode === "FEMALE_ONLY") {
    if (hasFixedMixed) return true;
    return females.length === 4;
  }

  if (mode === "MIXED_ROTATION") {
    if (hasFixedMixed) return true;
    return males.length === 2 && females.length === 2;
  }

  if (males.length === 4 || females.length === 4) return true;
  if (males.length === 2 && females.length === 2) return true;

  if (hasFixedMixed) {
    if (males.length === 3 && females.length === 1) return true;
    if (males.length === 1 && females.length === 3) return true;
  }

  return false;
}

function generateTeams(
  group: Player[],
  fixedPairs: FixedPair[]
): [Player[], Player[]][] {
  const pairSets: Set<string> = new Set();
  for (const [a, b] of fixedPairs) {
    pairSets.add(pairKey(a, b));
  }

  const hasPair = (p1: Player, p2: Player): boolean => {
    return pairSets.has(pairKey(p1.id, p2.id));
  };

  const pairsInGroup: Player[][] = [];
  for (const [p1Id, p2Id] of fixedPairs) {
    const p1 = group.find(p => p.id === p1Id);
    const p2 = group.find(p => p.id === p2Id);
    if (p1 && p2) {
      pairsInGroup.push([p1, p2]);
    }
  }

  if (pairsInGroup.length === 2) {
    return [[pairsInGroup[0], pairsInGroup[1]]];
  }

  if (pairsInGroup.length === 1) {
    const fixedTeam = pairsInGroup[0];
    const others = group.filter(p => !fixedTeam.some(fp => fp.id === p.id));
    if (others.length === 2) {
      return [[fixedTeam, others]];
    }
    return buildAllSplits(group).filter(([teamA, teamB]) => {
      for (const pair of pairsInGroup) {
        const p1InA = teamA.some(p => p.id === pair[0].id);
        const p2InA = teamA.some(p => p.id === pair[1].id);
        if (p1InA !== p2InA) return false;
      }
      return true;
    });
  }

  return buildAllSplits(group);
}

function buildAllSplits(group: Player[]): [Player[], Player[]][] {
  const [a, b, c, d] = group;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

function scoreMatch(
  teamA: Player[],
  teamB: Player[],
  pairHistory: Map<string, number>,
  oppHistory: Map<string, number>,
  pairUnits?: SelectionUnit[]
): { score: number; teamDiff: number; factors: string[] } {
  const teamDiff = Math.abs(teamAvgRank(teamA) - teamAvgRank(teamB));

  let partnerRepeat = 0;
  if (teamA.length === 2) {
    const k = pairKey(teamA[0].id, teamA[1].id);
    partnerRepeat += pairHistory.get(k) || 0;
  }
  if (teamB.length === 2) {
    const k = pairKey(teamB[0].id, teamB[1].id);
    partnerRepeat += pairHistory.get(k) || 0;
  }

  let opponentRepeat = 0;
  for (const a of teamA) {
    for (const b of teamB) {
      opponentRepeat += oppHistory.get(pairKey(a.id, b.id)) || 0;
    }
  }

  const penalty = (teamDiff * 50) + (partnerRepeat * 10) + (opponentRepeat * 5);
  let score = -penalty;

  const factors: string[] = [];
  if (teamDiff > 0) factors.push(`teamDiff(${teamDiff.toFixed(1)}): -${(teamDiff * 50).toFixed(0)}`);
  if (partnerRepeat > 0) factors.push(`partnerRepeat(${partnerRepeat}): -${partnerRepeat * 10}`);
  if (opponentRepeat > 0) factors.push(`opponentRepeat(${opponentRepeat}): -${opponentRepeat * 5}`);

  if (pairUnits && pairUnits.length > 0) {
    const allIds = [...teamA, ...teamB].map(p => p.id);
    for (const unit of pairUnits) {
      if (unit.type === "PAIR" && unit.pairWait && unit.pairWait > 0) {
        const pairInMatch = unit.players.every(p => allIds.includes(p.id));
        if (pairInMatch) {
          const boost = unit.pairWait * 5;
          score += boost;
          factors.push(`pairBoost(wait:${unit.pairWait}): +${boost}`);
        }
      }
    }
  }

  const allPlayers = [...teamA, ...teamB];
  const strongPlayers = allPlayers.filter(p => getGradeRank(p.grade) >= 6);
  const weakPlayers = allPlayers.filter(p => getGradeRank(p.grade) <= 3);
  if (strongPlayers.length > 0 && weakPlayers.length > 0) {
    for (const team of [teamA, teamB]) {
      if (team.length === 2) {
        const hasStrong = team.some(p => getGradeRank(p.grade) >= 6);
        const hasWeak = team.some(p => getGradeRank(p.grade) <= 3);
        if (hasStrong && hasWeak) {
          score += 15;
          factors.push(`strongWeakPair: +15`);
        }
      }
    }
  }

  return { score, teamDiff, factors };
}

function applyMixedTeamFilter(teamA: Player[], teamB: Player[], fixedPairs?: FixedPair[]): boolean {
  const males = [...teamA, ...teamB].filter(p => getEffectiveGender(p) !== "FEMALE");
  const females = [...teamA, ...teamB].filter(p => getEffectiveGender(p) === "FEMALE");

  if (males.length === 2 && females.length === 2) {
    const teamAMales = teamA.filter(p => getEffectiveGender(p) !== "FEMALE").length;
    const teamBMales = teamB.filter(p => getEffectiveGender(p) !== "FEMALE").length;
    if (teamAMales === 1 && teamBMales === 1) return true;

    if (fixedPairs && fixedPairs.length > 0) {
      const hasFixedMixed = groupHasFixedMixedPair([...teamA, ...teamB], fixedPairs);
      if (hasFixedMixed) return true;
    }
    return false;
  }

  if ((males.length === 3 && females.length === 1) || (males.length === 1 && females.length === 3)) {
    if (fixedPairs && fixedPairs.length > 0) {
      for (const [p1Id, p2Id] of fixedPairs) {
        const teamAHas1 = teamA.some(p => p.id === p1Id);
        const teamAHas2 = teamA.some(p => p.id === p2Id);
        const teamBHas1 = teamB.some(p => p.id === p1Id);
        const teamBHas2 = teamB.some(p => p.id === p2Id);
        if ((teamAHas1 && teamAHas2) || (teamBHas1 && teamBHas2)) return true;
      }
    }
    return false;
  }

  return true;
}

function generateNextMatch(
  eligible: Player[],
  matchIndex: number,
  fixedPairs: FixedPair[],
  playerMatchCounts: Map<number, number>,
  pairHistory: Map<string, number>,
  oppHistory: Map<string, number>,
  usedPlayerIds: Set<number>,
  priorityPlayerIds?: number[],
  playerLastPlayedRound?: Map<number, number>,
  pairWaitTracker?: Map<string, number>
): { match: MatchResult; score: number; teamDiff: number; factors: string[]; isFallback: boolean } | null {
  const pool = eligible.filter(p => !usedPlayerIds.has(p.id));
  if (pool.length < 4) return null;

  const lastPlayed = playerLastPlayedRound || new Map<number, number>();
  const waitTracker = pairWaitTracker || new Map<string, number>();

  const units = buildUnits(pool, fixedPairs, playerMatchCounts, matchIndex, lastPlayed, waitTracker);
  const sorted = [...units].sort((a, b) => a.effectiveGames - b.effectiveGames);

  const maxWindow = Math.min(sorted.length, 10);
  const windowUnits = sorted.slice(0, maxWindow);

  const candidateGroups = selectUnits(windowUnits);
  if (candidateGroups.length === 0) {
    return null;
  }

  const genderMode = determineGenderMode(pool, matchIndex);

  const pairUnits = windowUnits.filter(u => u.type === "PAIR");

  function tryGenerate(rankSpreadLimit: number, teamDiffLimit: number): { match: MatchResult; score: number; teamDiff: number; factors: string[] } | null {
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestTeamDiff = Infinity;
    let bestFactors: string[] = [];

    for (const group of candidateGroups) {
      const ranks = group.map(p => getGradeRank(p.grade));
      const spread = Math.max(...ranks) - Math.min(...ranks);

      const groupHasFixed = fixedPairs.length > 0 && fixedPairs.some(([a, b]) =>
        group.some(p => p.id === a) && group.some(p => p.id === b)
      );
      const effectiveSpreadLimit = groupHasFixed ? Math.max(rankSpreadLimit, 8) : rankSpreadLimit;
      if (spread > effectiveSpreadLimit) continue;

      if (!applyGenderRules(group, genderMode, fixedPairs)) continue;

      const teamCombos = generateTeams(group, fixedPairs);

      for (const [teamA, teamB] of teamCombos) {
        const diff = Math.abs(teamAvgRank(teamA) - teamAvgRank(teamB));
        const effectiveDiffLimit = groupHasFixed ? Math.max(teamDiffLimit, 3.5) : teamDiffLimit;
        if (diff > effectiveDiffLimit) continue;

        if (!applyMixedTeamFilter(teamA, teamB, fixedPairs)) continue;

        const candidate: MatchResult = {
          teamAPlayer1Id: teamA[0].id,
          teamAPlayer2Id: teamA.length > 1 ? teamA[1].id : null,
          teamBPlayer1Id: teamB[0].id,
          teamBPlayer2Id: teamB.length > 1 ? teamB[1].id : null,
        };

        const { score: baseScore, teamDiff, factors } = scoreMatch(teamA, teamB, pairHistory, oppHistory, pairUnits);

        let score = baseScore;
        if (priorityPlayerIds && priorityPlayerIds.length > 0) {
          const ids = group.map(p => p.id);
          const priorityCount = ids.filter(id => priorityPlayerIds.includes(id)).length;
          if (priorityCount > 0) {
            const bonus = priorityCount * 20;
            score += bonus;
            factors.push(`priority(${priorityCount}): +${bonus}`);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
          bestTeamDiff = teamDiff;
          bestFactors = [...factors];
        }
      }
    }

    if (bestMatch) {
      return { match: bestMatch, score: bestScore, teamDiff: bestTeamDiff, factors: bestFactors };
    }
    return null;
  }

  const primary = tryGenerate(3, 1.5);
  if (primary) return { ...primary, isFallback: false };

  const fallback = tryGenerate(4, 2.0);
  if (fallback) return { ...fallback, isFallback: true };

  return null;
}

function generateDoublesMatches(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, fixedPairs, priorityPlayerIds } = opts;
  const eligible = filterByGender(players.filter(p => !p.isPaused), genderType);
  const hasFixedPairs = fixedPairs && fixedPairs.length > 0;

  if (eligible.length < 4) {
    return { matches: [], validationErrors: ["Not enough eligible players for doubles"] };
  }

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localPairings = new Map(recentPairings);
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const usedPlayerIds = new Set<number>();
  const playerLastPlayedRound = new Map<number, number>();
  const pairWaitTracker = new Map<string, number>();

  for (const [pid, count] of localCounts) {
    playerLastPlayedRound.set(pid, count > 0 ? 0 : -1);
  }

  for (let q = 0; q < queueTarget; q++) {
    const result = generateNextMatch(
      eligible, q, fixedPairs || [], localCounts,
      localPairings, localOpponents, usedPlayerIds,
      priorityPlayerIds, playerLastPlayedRound, pairWaitTracker
    );

    if (!result) break;

    const { match, score, teamDiff, factors, isFallback } = result;
    const ids = [match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];

    let conflict = false;
    for (const id of ids) {
      if (usedPlayerIds.has(id)) { conflict = true; break; }
    }
    if (conflict) continue;

    for (const id of ids) usedPlayerIds.add(id);

    const tag = getQualityTag(teamDiff, isFallback);
    const tagFactors = [...factors, `quality:${tag}`];
    if (isFallback) tagFactors.push("fallback");

    match.qualityScore = score;
    match.breakdown = {
      fairness: 0,
      variety: 0,
      quality: Math.round(-teamDiff * 50),
      priority: 0,
      gender: 0,
      total: score,
    };

    results.push(match);
    scoringLogs.push({
      matchIndex: q,
      candidatesEvaluated: 1,
      winner: match,
      winnerScore: score,
      topFactors: tagFactors.slice(0, 5),
    });

    if (match.teamAPlayer2Id) {
      const pk = pairKey(match.teamAPlayer1Id, match.teamAPlayer2Id);
      localPairings.set(pk, (localPairings.get(pk) || 0) + 1);
    }
    if (match.teamBPlayer2Id) {
      const pk = pairKey(match.teamBPlayer1Id, match.teamBPlayer2Id);
      localPairings.set(pk, (localPairings.get(pk) || 0) + 1);
    }
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
    for (const a of teamA) {
      for (const b of teamB) {
        const ok = pairKey(a, b);
        localOpponents.set(ok, (localOpponents.get(ok) || 0) + 1);
      }
    }
    for (const id of ids) {
      localCounts.set(id, (localCounts.get(id) || 0) + 1);
      playerLastPlayedRound.set(id, q);
    }
  }

  return { matches: results, scoringLogs };
}

function generateSinglesMatches(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType } = opts;
  const eligible = filterByGender(players.filter(p => !p.isPaused), genderType);

  if (eligible.length < 2) {
    return { matches: [], validationErrors: ["Not enough eligible players for singles"] };
  }

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const usedPlayerIds = new Set<number>();

  for (let q = 0; q < queueTarget; q++) {
    const pool = eligible.filter(p => !usedPlayerIds.has(p.id));
    if (pool.length < 2) break;

    const sorted = [...pool].sort((a, b) => {
      const ca = localCounts.get(a.id) || 0;
      const cb = localCounts.get(b.id) || 0;
      if (ca !== cb) return ca - cb;
      return getGradeRank(b.grade) - getGradeRank(a.grade);
    });

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let bestTeamDiff = Infinity;
    let isFallback = false;

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const pA = sorted[i];
        const pB = sorted[j];
        const gradeDiff = Math.abs(getGradeRank(pA.grade) - getGradeRank(pB.grade));
        if (gradeDiff > 3) continue;

        const oppKey = pairKey(pA.id, pB.id);
        const oppCount = localOpponents.get(oppKey) || 0;
        const penalty = (gradeDiff * 50) + (oppCount * 5);
        const score = -penalty;

        const factors: string[] = [];
        if (gradeDiff > 0) factors.push(`gradeDiff(${gradeDiff}): -${gradeDiff * 50}`);
        if (oppCount > 0) factors.push(`opponentRepeat(${oppCount}): -${oppCount * 5}`);

        if (score > bestScore) {
          bestScore = score;
          bestTeamDiff = gradeDiff;
          bestFactors = factors;
          bestMatch = {
            teamAPlayer1Id: pA.id,
            teamAPlayer2Id: null,
            teamBPlayer1Id: pB.id,
            teamBPlayer2Id: null,
          };
        }
      }
    }

    if (!bestMatch) {
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const pA = sorted[i];
          const pB = sorted[j];
          const gradeDiff = Math.abs(getGradeRank(pA.grade) - getGradeRank(pB.grade));
          if (gradeDiff > 4) continue;

          isFallback = true;
          const oppKey = pairKey(pA.id, pB.id);
          const oppCount = localOpponents.get(oppKey) || 0;
          const penalty = (gradeDiff * 50) + (oppCount * 5);
          const score = -penalty;

          if (score > bestScore) {
            bestScore = score;
            bestTeamDiff = gradeDiff;
            bestFactors = [`gradeDiff(${gradeDiff}): -${gradeDiff * 50}`, "fallback"];
            bestMatch = {
              teamAPlayer1Id: pA.id,
              teamAPlayer2Id: null,
              teamBPlayer1Id: pB.id,
              teamBPlayer2Id: null,
            };
          }
        }
      }
    }

    if (!bestMatch) break;

    const tag = getQualityTag(bestTeamDiff, isFallback);
    bestFactors.push(`quality:${tag}`);

    bestMatch.qualityScore = bestScore;
    bestMatch.breakdown = {
      fairness: 0,
      variety: 0,
      quality: Math.round(-bestTeamDiff * 50),
      priority: 0,
      gender: 0,
      total: bestScore,
    };

    results.push(bestMatch);
    usedPlayerIds.add(bestMatch.teamAPlayer1Id);
    usedPlayerIds.add(bestMatch.teamBPlayer1Id);

    scoringLogs.push({
      matchIndex: q,
      candidatesEvaluated: 1,
      winner: bestMatch,
      winnerScore: bestScore,
      topFactors: bestFactors.slice(0, 5),
    });

    const oppKey = pairKey(bestMatch.teamAPlayer1Id, bestMatch.teamBPlayer1Id);
    localOpponents.set(oppKey, (localOpponents.get(oppKey) || 0) + 1);
    localCounts.set(bestMatch.teamAPlayer1Id, (localCounts.get(bestMatch.teamAPlayer1Id) || 0) + 1);
    localCounts.set(bestMatch.teamBPlayer1Id, (localCounts.get(bestMatch.teamBPlayer1Id) || 0) + 1);
  }

  return { matches: results, scoringLogs };
}

export function generateSmartMatches(opts: GenerateOptions): GenerateResult {
  if (opts.playersPerSide === 1) return generateSinglesMatches(opts);
  return generateDoublesMatches(opts);
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
        const sorted = [...availablePlayers].sort((a, b) => {
          const ga = getGradeRank(a.grade);
          const gb = getGradeRank(b.grade);
          if (ga !== gb) return gb - ga;
          return a.id - b.id;
        });
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

type MatchTypeLabel = "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";

export function buildPlayerLastMatchTypes(
  matches: { teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null; status: string; id?: number; createdAt?: string | Date | null }[],
  playerGenders: Map<number, string>
): Map<number, MatchTypeLabel> {
  const result = new Map<number, MatchTypeLabel>();
  const sorted = [...matches].sort((a, b) => {
    if (a.id && b.id) return a.id - b.id;
    return 0;
  });
  for (const m of sorted) {
    const ids = [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
    const genders = ids.map(id => playerGenders.get(id) || "MALE");
    const hasMale = genders.some(g => g !== "FEMALE");
    const hasFemale = genders.some(g => g === "FEMALE");
    let mt: MatchTypeLabel = "MALE_ONLY";
    if (hasMale && hasFemale) mt = "MIXED";
    else if (hasFemale) mt = "FEMALE_ONLY";
    for (const id of ids) {
      result.set(id, mt);
    }
  }
  return result;
}

export { getGradeRank, isHighGrade, isLowGrade };
