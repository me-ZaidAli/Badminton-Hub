import { GRADE_ORDER } from "@shared/schema";

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

type FixedPair = [number, number];

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
    case "A": return 8; // A → A2 equivalent (rank 8/9)
    case "B": return 5; // B → B2 equivalent (rank 5/9)
    case "C": return 2; // C → C2 equivalent (rank 2/9)
    case "D": return 1; // D → C3 equivalent (rank 1/9)
    default: return 1;
  }
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

function scorePairing(
  team: number[],
  opponents: number[],
  recentPairings: Map<string, number>,
  recentOpponents: Map<string, number>,
  playerMatchCounts: Map<number, number>,
  priorityPlayerIds?: number[],
  playerPool?: Player[],
  fixedPairs?: FixedPair[]
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const key = pairKey(team[i], team[j]);
      const isFixed = fixedPairs?.some(([a, b]) =>
        (a === team[i] && b === team[j]) || (a === team[j] && b === team[i])
      );
      if (!isFixed) {
        const count = recentPairings.get(key) || 0;
        if (count > 0) {
          const penalty = -count * 10;
          score += penalty;
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
          const penalty = -count * 10;
          score += penalty;
          factors.push(`teamB partner repeat(${opponents[i]},${opponents[j]})x${count}: ${penalty}`);
        }
      }
    }
  }

  for (const a of team) {
    for (const b of opponents) {
      const key = pairKey(a, b);
      const count = recentOpponents.get(key) || 0;
      if (count > 0) {
        const penalty = -count * 8;
        score += penalty;
        factors.push(`opponent repeat(${a} vs ${b})x${count}: ${penalty}`);
      }
    }
  }

  const allPlayers = [...team, ...opponents];

  const globalMin = playerMatchCounts.size > 0
    ? Math.min(...Array.from(playerMatchCounts.values()))
    : 0;

  for (const p of allPlayers) {
    const played = playerMatchCounts.get(p) || 0;
    const deficit = played - globalMin;
    const deficitPenalty = -deficit * 100;
    const playedPenalty = -played * 20;
    score += deficitPenalty + playedPenalty;
    if (deficit > 0) {
      factors.push(`player ${p} deficit(${deficit}): ${deficitPenalty}`);
    }
  }

  const matchMin = Math.min(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const matchMax = Math.max(...allPlayers.map(p => playerMatchCounts.get(p) || 0));
  const spread = matchMax - matchMin;
  if (spread > 0) {
    const spreadPenalty = -spread * 80;
    score += spreadPenalty;
    factors.push(`spread(${spread}): ${spreadPenalty}`);
  }

  if (priorityPlayerIds && priorityPlayerIds.length > 0) {
    for (const p of allPlayers) {
      if (priorityPlayerIds.includes(p)) {
        score += 200;
        factors.push(`priority player ${p}: +200`);
      }
    }
  }

  if (playerPool && playerPool.length > 0) {
    const getPlayer = (id: number) => playerPool.find(p => p.id === id);

    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const p1 = getPlayer(team[i]);
        const p2 = getPlayer(team[j]);
        if (p1 && p2) {
          const p1Female = getEffectiveGender(p1) === "FEMALE";
          const p2Female = getEffectiveGender(p2) === "FEMALE";
          if (p1Female !== p2Female) {
            const male = p1Female ? p2 : p1;
            const female = p1Female ? p1 : p2;
            if (isStrongPlayer(male.grade)) {
              score += 12;
              factors.push(`strong male(${male.id}) + female(${female.id}): +12`);
            }
            if (isWeakPlayer(male.grade) && !isWeakPlayer(female.grade)) {
              score -= 8;
              factors.push(`weak male(${male.id}) + non-weak female(${female.id}): -8`);
            }
          }
        }
      }
    }

    for (let i = 0; i < opponents.length; i++) {
      for (let j = i + 1; j < opponents.length; j++) {
        const p1 = getPlayer(opponents[i]);
        const p2 = getPlayer(opponents[j]);
        if (p1 && p2) {
          const p1Female = getEffectiveGender(p1) === "FEMALE";
          const p2Female = getEffectiveGender(p2) === "FEMALE";
          if (p1Female !== p2Female) {
            const male = p1Female ? p2 : p1;
            const female = p1Female ? p1 : p2;
            if (isStrongPlayer(male.grade)) {
              score += 12;
              factors.push(`strong male(${male.id}) + female(${female.id}): +12`);
            }
            if (isWeakPlayer(male.grade) && !isWeakPlayer(female.grade)) {
              score -= 8;
              factors.push(`weak male(${male.id}) + non-weak female(${female.id}): -8`);
            }
          }
        }
      }
    }

    const teamPlayers = team.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const oppPlayers = opponents.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const teamFemales = teamPlayers.filter(p => getEffectiveGender(p) === "FEMALE").length;
    const oppFemales = oppPlayers.filter(p => getEffectiveGender(p) === "FEMALE").length;
    if (teamFemales >= 2 && oppFemales >= 2) {
      score += 15;
      factors.push(`both teams have 2+ females: +15`);
    } else if (teamFemales >= 1 && oppFemales >= 1) {
      score += 5;
      factors.push(`both teams have 1+ female: +5`);
    }
  }

  return { score, factors };
}

function removeUsedPlayers(pool: Player[], match: MatchResult): Player[] {
  const usedIds = new Set([match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[]);
  return pool.filter(p => !usedIds.has(p.id));
}

function generateDeterministicCandidateDoubles(
  eligible: Player[],
  fixedPairs: FixedPair[],
  states: PlayerStateMap
): MatchResult[] {
  const candidates: MatchResult[] = [];
  const maxCandidates = 120;

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

function computeGenderSlots(
  eligible: Player[],
  states: PlayerStateMap,
  queueTarget: number
): { femaleOnlySlots: number; mixedSlots: number; hasFemaleQuota: boolean } {
  const availableFemales = eligible.filter(p => states.get(p.id) === "AVAILABLE" && getEffectiveGender(p) === "FEMALE").length;
  const availableMales = eligible.filter(p => states.get(p.id) === "AVAILABLE" && getEffectiveGender(p) !== "FEMALE").length;

  if (availableFemales >= 4 && availableMales >= 2) {
    const maxFemaleMatches = Math.floor(availableFemales / 4);
    const femaleOnlySlots = Math.min(maxFemaleMatches, Math.ceil(queueTarget * 0.8));
    const mixedSlots = queueTarget - femaleOnlySlots;
    return { femaleOnlySlots, mixedSlots, hasFemaleQuota: true };
  }

  return { femaleOnlySlots: 0, mixedSlots: queueTarget, hasFemaleQuota: false };
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

function generateSocialDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs } = opts;
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

  const { femaleOnlySlots, hasFemaleQuota } = genderType === "MIXED"
    ? computeGenderSlots(eligible, states, queueTarget)
    : { femaleOnlySlots: 0, hasFemaleQuota: false };

  let femaleMatchesGenerated = 0;
  let mixedMatchesGenerated = 0;
  const mixedMaleCounts = new Map<number, number>();

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 4) break;

    const wantFemaleOnly = hasFemaleQuota && femaleMatchesGenerated < femaleOnlySlots;

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 4, states);
    const candidatePool = fairnessPool.length >= 4 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateDoubles(candidatePool, fixedPairs || [], states);

    let candidatesEvaluated = 0;
    for (const candidate of candidates) {
      const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;

      if (genderType === "MIXED" && isGenderUnfairDoubles(candidate, eligible)) continue;

      if (hasFemaleQuota) {
        const allFemale = isFemaleOnlyMatch(candidate, eligible);
        const mixed = isMixedMatch(candidate, eligible);

        if (wantFemaleOnly && !allFemale) continue;
        if (!wantFemaleOnly) {
          if (!mixed && !allFemale) continue;
        }
      }

      candidatesEvaluated++;
      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);

      if (hasFemaleQuota && !wantFemaleOnly) {
        if (isMixedMatch(candidate, eligible)) {
          s += 30;
          factors.push(`mixed slot preference: +30`);
          const malesInMatch = getMalesInMatch(candidate, eligible);
          for (const maleId of malesInMatch) {
            const maleUses = mixedMaleCounts.get(maleId) || 0;
            if (maleUses > 0) {
              const rotationPenalty = -maleUses * 25;
              s += rotationPenalty;
              factors.push(`mixed male repeat(${maleId})x${maleUses}: ${rotationPenalty}`);
            }
          }
        }
      }

      if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = s;
        bestMatch = candidate;
        bestFactors = factors;
      }
    }

    if (!bestMatch && candidatePool !== eligible) {
      const fallbackCandidates = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states);
      for (const candidate of fallbackCandidates) {
        const fbIds = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        if (fbIds.some(id => states.get(id) !== "AVAILABLE")) continue;
        if (genderType === "MIXED" && isGenderUnfairDoubles(candidate, eligible)) continue;
        if (hasFemaleQuota) {
          const allFemale = isFemaleOnlyMatch(candidate, eligible);
          const mixed = isMixedMatch(candidate, eligible);
          if (wantFemaleOnly && !allFemale) continue;
          if (!wantFemaleOnly && !mixed && !allFemale) continue;
        }
        candidatesEvaluated++;
        const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
        const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
        if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = s;
          bestMatch = candidate;
          bestFactors = factors;
        }
      }
    }

    if (!bestMatch && hasFemaleQuota && wantFemaleOnly) {
      femaleMatchesGenerated = femaleOnlySlots;
      const genderFallbackCandidates = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states);
      for (const candidate of genderFallbackCandidates) {
        const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
        if (genderType === "MIXED" && isGenderUnfairDoubles(candidate, eligible)) continue;

        candidatesEvaluated++;
        const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
        const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);

        if (isMixedMatch(candidate, eligible)) {
          const malesInMatch = getMalesInMatch(candidate, eligible);
          for (const maleId of malesInMatch) {
            const maleUses = mixedMaleCounts.get(maleId) || 0;
            if (maleUses > 0) {
              const rotationPenalty = -maleUses * 25;
              s += rotationPenalty;
              factors.push(`mixed male repeat(${maleId})x${maleUses}: ${rotationPenalty}`);
            }
          }
        }

        if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = s;
          bestMatch = candidate;
          bestFactors = factors;
        }
      }
    }

    if (bestMatch) {
      if (hasFixedPairs) {
        const blocked = checkDuplicateMatchup(bestMatch, results);
        if (blocked) {
          const alternative = findAlternativeMatch(candidates, results, states, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs!);
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
      if (!assigned) {
        continue;
      }

      if (hasFemaleQuota) {
        if (isFemaleOnlyMatch(bestMatch, eligible)) {
          femaleMatchesGenerated++;
        } else {
          mixedMatchesGenerated++;
          const malesInMatch = getMalesInMatch(bestMatch, eligible);
          for (const maleId of malesInMatch) {
            mixedMaleCounts.set(maleId, (mixedMaleCounts.get(maleId) || 0) + 1);
          }
        }
      }

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

  const postErrors = validatePostConditions(results, states);

  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateSocialSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 2) break;

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 2, states);
    const candidatePool = fairnessPool.length >= 2 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateSingles(candidatePool, states);
    let candidatesEvaluated = 0;

    const globalMin = localCounts.size > 0
      ? Math.min(...Array.from(localCounts.values()))
      : 0;

    for (const candidate of candidates) {
      if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") continue;

      candidatesEvaluated++;
      const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
      const oppCount = localOpponents.get(key) || 0;
      const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
      const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
      const deficitA = countA - globalMin;
      const deficitB = countB - globalMin;

      let total = -(oppCount * 10) - ((deficitA + deficitB) * 100) - ((countA + countB) * 20);
      const factors: string[] = [];

      if (oppCount > 0) factors.push(`opponent repeat(${candidate.teamAPlayer1Id} vs ${candidate.teamBPlayer1Id})x${oppCount}: ${-oppCount * 10}`);
      if (deficitA > 0) factors.push(`player ${candidate.teamAPlayer1Id} deficit(${deficitA}): ${-deficitA * 100}`);
      if (deficitB > 0) factors.push(`player ${candidate.teamBPlayer1Id} deficit(${deficitB}): ${-deficitB * 100}`);

      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { total += 200; factors.push(`priority player ${candidate.teamAPlayer1Id}: +200`); }
        if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { total += 200; factors.push(`priority player ${candidate.teamBPlayer1Id}: +200`); }
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
        candidatesEvaluated++;
        const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
        const oppCount = localOpponents.get(key) || 0;
        const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
        const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
        const deficitA = countA - globalMin;
        const deficitB = countB - globalMin;
        let total = -(oppCount * 10) - ((deficitA + deficitB) * 100) - ((countA + countB) * 20);
        const factors: string[] = [];
        if (priorityPlayerIds && priorityPlayerIds.length > 0) {
          if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { total += 200; factors.push(`priority player ${candidate.teamAPlayer1Id}: +200`); }
          if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { total += 200; factors.push(`priority player ${candidate.teamBPlayer1Id}: +200`); }
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

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateCompetitiveDoubles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentPairings, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds, fixedPairs } = opts;
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

  const { femaleOnlySlots, hasFemaleQuota } = genderType === "MIXED"
    ? computeGenderSlots(eligible, states, queueTarget)
    : { femaleOnlySlots: 0, hasFemaleQuota: false };

  let femaleMatchesGenerated = 0;
  let mixedMatchesGenerated = 0;
  const mixedMaleCounts = new Map<number, number>();

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 4) break;

    const wantFemaleOnly = hasFemaleQuota && femaleMatchesGenerated < femaleOnlySlots;

    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 4, states);
    const candidatePool = fairnessPool.length >= 4 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateDoubles(candidatePool, fixedPairs || [], states);
    let candidatesEvaluated = 0;

    const scoreCandidate = (candidate: MatchResult): { score: number; factors: string[] } | null => {
      const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      if (ids.some(id => states.get(id) !== "AVAILABLE")) return null;

      if (genderType === "MIXED" && isGenderUnfairDoubles(candidate, eligible)) return null;

      if (hasFemaleQuota) {
        const allFemale = isFemaleOnlyMatch(candidate, eligible);
        const mixed = isMixedMatch(candidate, eligible);
        if (wantFemaleOnly && !allFemale) return null;
        if (!wantFemaleOnly) {
          if (!mixed && !allFemale) return null;
        }
      }

      const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
      const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
      let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);

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
          const balancePenalty = -diff * 5;
          s += balancePenalty;
          factors.push(`grade balance diff(${diff.toFixed(1)}): ${balancePenalty.toFixed(1)}`);
        }

        const catA1 = getCategoryFromGrade(pA1.grade);
        const catA2 = getCategoryFromGrade(pA2.grade);
        const catB1 = getCategoryFromGrade(pB1.grade);
        const catB2 = getCategoryFromGrade(pB2.grade);
        const allCats = [catA1, catA2, catB1, catB2];
        const uniqueCats = new Set(allCats);
        if (uniqueCats.size === 1) {
          s += 20;
          factors.push(`all same category(${catA1}): +20`);
        } else if (catA1 === catA2 && catB1 === catB2) {
          s += 10;
          factors.push(`teams same category(${catA1} vs ${catB1}): +10`);
        }

        const highCount = [gradeA1, gradeA2, gradeB1, gradeB2].filter(g => g >= 6).length;
        if (highCount === 4) {
          s += 15;
          factors.push(`all high ranked: +15`);
        } else if (highCount >= 3) {
          s += 8;
          factors.push(`mostly high ranked(${highCount}/4): +8`);
        }
      }

      if (hasFemaleQuota && !wantFemaleOnly) {
        if (isMixedMatch(candidate, eligible)) {
          s += 30;
          factors.push(`mixed slot preference: +30`);
          const malesInMatch = getMalesInMatch(candidate, eligible);
          for (const maleId of malesInMatch) {
            const maleUses = mixedMaleCounts.get(maleId) || 0;
            if (maleUses > 0) {
              const rotationPenalty = -maleUses * 25;
              s += rotationPenalty;
              factors.push(`mixed male repeat(${maleId})x${maleUses}: ${rotationPenalty}`);
            }
          }
        }
      }

      return { score: s, factors };
    };

    for (const candidate of candidates) {
      const result = scoreCandidate(candidate);
      if (!result) continue;

      candidatesEvaluated++;
      if (result.score > bestScore || (result.score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
        bestScore = result.score;
        bestMatch = candidate;
        bestFactors = result.factors;
      }
    }

    if (!bestMatch && candidatePool !== eligible) {
      const compFallback = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states);
      for (const candidate of compFallback) {
        const result = scoreCandidate(candidate);
        if (!result) continue;
        candidatesEvaluated++;
        if (result.score > bestScore || (result.score === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = result.score;
          bestMatch = candidate;
          bestFactors = result.factors;
        }
      }
    }

    if (!bestMatch && hasFemaleQuota && wantFemaleOnly) {
      femaleMatchesGenerated = femaleOnlySlots;
      const compGenderFallback = generateDeterministicCandidateDoubles(eligible, fixedPairs || [], states);
      for (const candidate of compGenderFallback) {
        const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
        if (genderType === "MIXED" && isGenderUnfairDoubles(candidate, eligible)) continue;

        const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
        const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
        let { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);

        if (isMixedMatch(candidate, eligible)) {
          const malesInMatch = getMalesInMatch(candidate, eligible);
          for (const maleId of malesInMatch) {
            const maleUses = mixedMaleCounts.get(maleId) || 0;
            if (maleUses > 0) {
              const rotationPenalty = -maleUses * 25;
              s += rotationPenalty;
              factors.push(`mixed male repeat(${maleId})x${maleUses}: ${rotationPenalty}`);
            }
          }
        }

        candidatesEvaluated++;
        if (s > bestScore || (s === bestScore && deterministicTiebreak(candidate, bestMatch!))) {
          bestScore = s;
          bestMatch = candidate;
          bestFactors = factors;
        }
      }
    }

    if (bestMatch) {
      if (hasFixedPairs) {
        const blocked = checkDuplicateMatchup(bestMatch, results);
        if (blocked) {
          const alternative = findAlternativeMatch(candidates, results, states, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs!);
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

      if (hasFemaleQuota) {
        if (isFemaleOnlyMatch(bestMatch, eligible)) {
          femaleMatchesGenerated++;
        } else {
          mixedMatchesGenerated++;
          const malesInMatch = getMalesInMatch(bestMatch, eligible);
          for (const maleId of malesInMatch) {
            mixedMaleCounts.set(maleId, (mixedMaleCounts.get(maleId) || 0) + 1);
          }
        }
      }

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

  const postErrors = validatePostConditions(results, states);
  return { matches: results, scoringLogs, validationErrors: postErrors.length > 0 ? postErrors : undefined };
}

function generateCompetitiveSingles(opts: GenerateOptions): GenerateResult {
  const { players, queueTarget, recentOpponents, playerMatchCounts, genderType, priorityPlayerIds } = opts;
  let eligible = filterByGender(players, genderType);

  const preErrors = validatePreConditions(eligible, 2);
  if (preErrors.length > 0) return { matches: [], validationErrors: preErrors };

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];
  const localOpponents = new Map(recentOpponents);
  const localCounts = new Map(playerMatchCounts);
  const states = initPlayerStates(eligible);
  const globalMin = localCounts.size > 0 ? Math.min(...Array.from(localCounts.values())) : 0;

  for (let q = 0; q < queueTarget; q++) {
    const availableCount = Array.from(states.values()).filter(s => s === "AVAILABLE").length;
    if (availableCount < 2) break;

    const fairnessPool = fairnessPreFilter(eligible, localCounts, 2, states);
    const candidatePool = fairnessPool.length >= 2 ? fairnessPool : eligible;
    const candidates = generateDeterministicCandidateSingles(candidatePool, states);
    let bestMatch: MatchResult | null = null;
    let bestScore = -Infinity;
    let bestFactors: string[] = [];
    let candidatesEvaluated = 0;

    const scoreCompSinglesCandidate = (candidate: MatchResult): { total: number; factors: string[] } | null => {
      if (states.get(candidate.teamAPlayer1Id) !== "AVAILABLE" || states.get(candidate.teamBPlayer1Id) !== "AVAILABLE") return null;
      const pA = eligible.find(p => p.id === candidate.teamAPlayer1Id);
      const pB = eligible.find(p => p.id === candidate.teamBPlayer1Id);
      if (!pA || !pB) return null;
      const gradeDiff = Math.abs(getGradeRank(pA.grade) - getGradeRank(pB.grade));
      if (gradeDiff > 4) return null;
      const key = pairKey(candidate.teamAPlayer1Id, candidate.teamBPlayer1Id);
      const oppCount = localOpponents.get(key) || 0;
      const countA = localCounts.get(candidate.teamAPlayer1Id) || 0;
      const countB = localCounts.get(candidate.teamBPlayer1Id) || 0;
      const deficitA = countA - globalMin;
      const deficitB = countB - globalMin;
      const gradeBalancePenalty = -gradeDiff * 5;
      let total = -(oppCount * 10) - ((deficitA + deficitB) * 100) - ((countA + countB) * 20) + gradeBalancePenalty;
      const factors: string[] = [];
      if (oppCount > 0) factors.push(`opponent repeat x${oppCount}: ${-oppCount * 10}`);
      if (gradeDiff > 0) factors.push(`grade diff(${gradeDiff}): ${gradeBalancePenalty}`);
      if (deficitA > 0 || deficitB > 0) factors.push(`deficit(${deficitA}+${deficitB}): ${-(deficitA + deficitB) * 100}`);
      const catA = getCategoryFromGrade(pA.grade);
      const catB = getCategoryFromGrade(pB.grade);
      if (catA === catB) { total += 15; factors.push(`same category(${catA}): +15`); }
      if (getGradeRank(pA.grade) >= 6 && getGradeRank(pB.grade) >= 6) { total += 10; factors.push(`both high ranked: +10`); }
      if (priorityPlayerIds && priorityPlayerIds.length > 0) {
        if (priorityPlayerIds.includes(candidate.teamAPlayer1Id)) { total += 200; factors.push(`priority: +200`); }
        if (priorityPlayerIds.includes(candidate.teamBPlayer1Id)) { total += 200; factors.push(`priority: +200`); }
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
  fixedPairs: FixedPair[]
): { match: MatchResult; score: number; factors: string[] } | null {
  let altBest: MatchResult | null = null;
  let altBestScore = -Infinity;
  let altBestFactors: string[] = [];

  for (const candidate of candidates) {
    const ids = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!, candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
    if (ids.some(id => states.get(id) !== "AVAILABLE")) continue;
    if (checkDuplicateMatchup(candidate, existingResults)) continue;

    const team = [candidate.teamAPlayer1Id, candidate.teamAPlayer2Id!];
    const opp = [candidate.teamBPlayer1Id, candidate.teamBPlayer2Id!];
    const { score: s, factors } = scorePairing(team, opp, localPairings, localOpponents, localCounts, priorityPlayerIds, eligible, fixedPairs);
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

  const teamAFemales = [p1, p2].filter(p => getEffectiveGender(p) === "FEMALE").length;
  const teamBFemales = [p3, p4].filter(p => getEffectiveGender(p) === "FEMALE").length;
  const teamAMales = 2 - teamAFemales;
  const teamBMales = 2 - teamBFemales;

  if (teamAFemales === 2 && teamBMales === 2) return true;
  if (teamBFemales === 2 && teamAMales === 2) return true;

  return false;
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

export { getGradeRank, isHighGrade, isLowGrade };

export function generateSmartMatches(opts: GenerateOptions): GenerateResult {
  const { mode, playersPerSide } = opts;

  if (mode === "SOCIAL") {
    if (playersPerSide === 1) return generateSocialSingles(opts);
    return generateSocialDoubles(opts);
  } else {
    if (playersPerSide === 1) return generateCompetitiveSingles(opts);
    return generateCompetitiveDoubles(opts);
  }
}
