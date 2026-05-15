// Simple Match Engine
//
// One algorithm, five settings. See `shared/matchEngineSettings.ts` for the
// full description. This file replaces the previous v6.x scoring engine.
//
// Public API (kept stable for routes.ts / matchEngineLab.ts / adaptiveFairnessAI.ts):
//   - generateSmartMatches(opts) → { matches, scoringLogs?, validationErrors? }
//   - replacePlayerInQueuedMatches(...)
//   - buildPairingHistory(matches)
//   - countExistingMatchTypes(...)        // no-op stub, returns zeros
//   - buildPlayerLastMatchTypes(...)      // no-op stub, returns empty map
//   - getGradeRank, isHighGrade, isLowGrade

import { GRADE_ORDER } from "@shared/schema";
import { MatchEngineSettings, DEFAULT_SETTINGS, ScoringBreakdown } from "@shared/matchEngineSettings";

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
  // Kept for source compatibility with old call sites — the simple engine
  // ignores these but they're allowed to be passed in without errors.
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
  recentGroups?: Map<string, number>;
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

// ───────────────────────── helpers ─────────────────────────

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function groupKey(players: Player[]): string {
  return [...players].map(p => p.id).sort((x, y) => x - y).join("-");
}

function incPair(map: Map<string, number>, a: number, b: number): void {
  const k = pairKey(a, b);
  map.set(k, (map.get(k) ?? 0) + 1);
}

function getEffectiveGender(p: Player): string {
  return p.genderOverride || p.gender || "MALE";
}

export function getGradeRank(grade: string | null): number {
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

export function isHighGrade(grade: string | null): boolean {
  return getGradeRank(grade) >= 5;
}

export function isLowGrade(grade: string | null): boolean {
  return getGradeRank(grade) <= 4;
}

function filterByGender(players: Player[], genderType: string): Player[] {
  if (genderType === "FEMALE") return players.filter(p => getEffectiveGender(p) === "FEMALE");
  if (genderType === "MALE") return players.filter(p => getEffectiveGender(p) !== "FEMALE");
  return players;
}

function getFixedPartner(playerId: number, fixedPairs: FixedPair[]): number | null {
  for (const [a, b] of fixedPairs) {
    if (a === playerId) return b;
    if (b === playerId) return a;
  }
  return null;
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i;
  return Math.round(r);
}

// ───────────────────────── core scoring ─────────────────────────

function scoreGroup(
  group: Player[],
  ec: MatchEngineSettings,
  pairings: Map<string, number>,
  opponents: Map<string, number>,
  groups: Map<string, number>,
): { score: number; breakdown: ScoringBreakdown; factors: string[] } {
  const factors: string[] = [];

  // Group repeat
  const gPrior = groups.get(groupKey(group)) ?? 0;
  const groupRepeat = gPrior * ec.groupRepeatPenalty;
  if (gPrior > 0) factors.push(`group played ×${gPrior}: +${groupRepeat}`);

  // Partner & opponent reps across all 6 pairs in the group
  let partnerHits = 0;
  let oppHits = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const k = pairKey(group[i].id, group[j].id);
      partnerHits += pairings.get(k) ?? 0;
      oppHits += opponents.get(k) ?? 0;
    }
  }
  const partnerRepeat = partnerHits * ec.partnerRepeatPenalty;
  const opponentRepeat = oppHits * ec.opponentRepeatPenalty;
  if (partnerHits > 0) factors.push(`partner reps ${partnerHits}: +${partnerRepeat}`);
  if (oppHits > 0) factors.push(`opponent reps ${oppHits}: +${opponentRepeat}`);

  // Grade spread
  const ranks = group.map(p => getGradeRank(p.grade));
  const spread = Math.max(...ranks) - Math.min(...ranks);
  const gradeSpread = spread * ec.gradeSpreadWeight;
  if (spread > 0) factors.push(`grade spread ${spread}: +${gradeSpread.toFixed(1)}`);

  const total = groupRepeat + partnerRepeat + opponentRepeat + gradeSpread;
  return {
    score: total,
    breakdown: { groupRepeat, partnerRepeat, opponentRepeat, gradeSpread, total },
    factors,
  };
}

function splitTeams(group: Player[], fixedPairs: FixedPair[]): { teamA: Player[]; teamB: Player[] } {
  // Honour fixed pair if both members are in the chosen group.
  for (const [a, b] of fixedPairs) {
    const pa = group.find(p => p.id === a);
    const pb = group.find(p => p.id === b);
    if (pa && pb) {
      const others = group.filter(p => p.id !== a && p.id !== b);
      return { teamA: [pa, pb], teamB: others };
    }
  }
  // 1+4 vs 2+3 split by grade — pairs the strongest player with the weakest
  // (and the two middle players together) to balance combined skill across
  // the two teams. Works regardless of gender mix, so a strong male can be
  // partnered with a weaker female against two mid-grade males, etc.
  const sorted = [...group].sort((a, b) => getGradeRank(b.grade) - getGradeRank(a.grade));
  return { teamA: [sorted[0], sorted[3]], teamB: [sorted[1], sorted[2]] };
}

// ───────────────────────── doubles ─────────────────────────

function generateDoubles(opts: GenerateOptions): GenerateResult {
  const ec = opts.settings?.engineConfig ?? DEFAULT_SETTINGS;
  const eligible = filterByGender(opts.players.filter(p => !p.isPaused), opts.genderType);

  if (eligible.length < 4) {
    return { matches: [], validationErrors: ["Not enough eligible players for doubles"] };
  }

  const localPairings = new Map(opts.recentPairings);
  const localOpponents = new Map(opts.recentOpponents);
  const localCounts = new Map(opts.playerMatchCounts);
  const localGroups = new Map(opts.recentGroups ?? new Map<string, number>());
  const used = new Set<number>();
  const fixedPairs = opts.fixedPairs ?? [];
  const priorityIds = new Set(opts.priorityPlayerIds ?? []);

  // Pre-compute fixed-partner lookup for the whole call.
  const partnerMap = new Map<number, number>();
  for (const [a, b] of fixedPairs) {
    partnerMap.set(a, b);
    partnerMap.set(b, a);
  }

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];

  for (let q = 0; q < opts.queueTarget; q++) {
    const pool = eligible.filter(p => !used.has(p.id));
    if (pool.length < 4) break;

    // Sort by games played asc, with priority players nudged forward.
    // Tiebreak by grade rank desc so similar-skill players cluster.
    const sorted = [...pool].sort((a, b) => {
      const ca = (localCounts.get(a.id) ?? 0) - (priorityIds.has(a.id) ? 0.5 : 0);
      const cb = (localCounts.get(b.id) ?? 0) - (priorityIds.has(b.id) ? 0.5 : 0);
      if (ca !== cb) return ca - cb;
      return getGradeRank(b.grade) - getGradeRank(a.grade);
    });

    const poolN = Math.max(4, Math.min(ec.candidatePoolSize, sorted.length));
    const candidates = sorted.slice(0, poolN);

    let bestGroup: Player[] | null = null;
    let bestScore = Infinity;
    let bestBreakdown: ScoringBreakdown | null = null;
    let bestFactors: string[] = [];
    let evaluated = 0;

    for (let i = 0; i < candidates.length - 3; i++) {
      for (let j = i + 1; j < candidates.length - 2; j++) {
        for (let k = j + 1; k < candidates.length - 1; k++) {
          for (let l = k + 1; l < candidates.length; l++) {
            const grp = [candidates[i], candidates[j], candidates[k], candidates[l]];

            // Fixed-pair safety: every player with a fixed partner must have
            // that partner in the same group.
            let ok = true;
            for (const p of grp) {
              const partner = partnerMap.get(p.id);
              if (partner != null && !grp.find(g => g.id === partner)) { ok = false; break; }
            }
            if (!ok) continue;

            evaluated++;
            const { score, breakdown, factors } = scoreGroup(grp, ec, localPairings, localOpponents, localGroups);
            if (score < bestScore) {
              bestScore = score;
              bestGroup = grp;
              bestBreakdown = breakdown;
              bestFactors = factors;
            }
          }
        }
      }
    }

    if (!bestGroup) break;

    const { teamA, teamB } = splitTeams(bestGroup, fixedPairs);
    const match: MatchResult = {
      teamAPlayer1Id: teamA[0].id,
      teamAPlayer2Id: teamA[1].id,
      teamBPlayer1Id: teamB[0].id,
      teamBPlayer2Id: teamB[1].id,
      qualityScore: Math.max(0, Math.round(100 - bestScore)),
      breakdown: bestBreakdown ?? undefined,
    };
    results.push(match);
    scoringLogs.push({
      matchIndex: q,
      candidatesEvaluated: evaluated,
      winner: match,
      winnerScore: -bestScore,
      topFactors: bestFactors,
    });

    // Update local state so the next iteration sees the new pairings.
    for (const p of bestGroup) {
      used.add(p.id);
      localCounts.set(p.id, (localCounts.get(p.id) ?? 0) + 1);
    }
    incPair(localPairings, teamA[0].id, teamA[1].id);
    incPair(localPairings, teamB[0].id, teamB[1].id);
    for (const a of teamA) for (const b of teamB) incPair(localOpponents, a.id, b.id);
    const gKey = groupKey(bestGroup);
    localGroups.set(gKey, (localGroups.get(gKey) ?? 0) + 1);
  }

  return { matches: results, scoringLogs };
}

// ───────────────────────── singles ─────────────────────────

function generateSingles(opts: GenerateOptions): GenerateResult {
  const ec = opts.settings?.engineConfig ?? DEFAULT_SETTINGS;
  const eligible = filterByGender(opts.players.filter(p => !p.isPaused), opts.genderType);

  if (eligible.length < 2) {
    return { matches: [], validationErrors: ["Not enough eligible players for singles"] };
  }

  const localOpponents = new Map(opts.recentOpponents);
  const localCounts = new Map(opts.playerMatchCounts);
  const used = new Set<number>();
  const priorityIds = new Set(opts.priorityPlayerIds ?? []);

  const results: MatchResult[] = [];
  const scoringLogs: ScoringLog[] = [];

  for (let q = 0; q < opts.queueTarget; q++) {
    const pool = eligible.filter(p => !used.has(p.id));
    if (pool.length < 2) break;

    const sorted = [...pool].sort((a, b) => {
      const ca = (localCounts.get(a.id) ?? 0) - (priorityIds.has(a.id) ? 0.5 : 0);
      const cb = (localCounts.get(b.id) ?? 0) - (priorityIds.has(b.id) ? 0.5 : 0);
      if (ca !== cb) return ca - cb;
      return getGradeRank(b.grade) - getGradeRank(a.grade);
    });

    const poolN = Math.max(2, Math.min(ec.candidatePoolSize, sorted.length));
    const candidates = sorted.slice(0, poolN);

    let bestPair: [Player, Player] | null = null;
    let bestScore = Infinity;
    let bestFactors: string[] = [];
    let evaluated = 0;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        evaluated++;
        const a = candidates[i];
        const b = candidates[j];
        const oppCount = localOpponents.get(pairKey(a.id, b.id)) ?? 0;
        const spread = Math.abs(getGradeRank(a.grade) - getGradeRank(b.grade));
        const score = oppCount * ec.opponentRepeatPenalty + spread * ec.gradeSpreadWeight;
        if (score < bestScore) {
          bestScore = score;
          bestPair = [a, b];
          const f: string[] = [];
          if (oppCount > 0) f.push(`opponent reps ${oppCount}: +${oppCount * ec.opponentRepeatPenalty}`);
          if (spread > 0) f.push(`grade spread ${spread}: +${(spread * ec.gradeSpreadWeight).toFixed(1)}`);
          bestFactors = f;
        }
      }
    }

    if (!bestPair) break;

    const match: MatchResult = {
      teamAPlayer1Id: bestPair[0].id,
      teamAPlayer2Id: null,
      teamBPlayer1Id: bestPair[1].id,
      teamBPlayer2Id: null,
      qualityScore: Math.max(0, Math.round(100 - bestScore)),
    };
    results.push(match);
    scoringLogs.push({
      matchIndex: q,
      candidatesEvaluated: evaluated,
      winner: match,
      winnerScore: -bestScore,
      topFactors: bestFactors,
    });

    used.add(bestPair[0].id);
    used.add(bestPair[1].id);
    localCounts.set(bestPair[0].id, (localCounts.get(bestPair[0].id) ?? 0) + 1);
    localCounts.set(bestPair[1].id, (localCounts.get(bestPair[1].id) ?? 0) + 1);
    incPair(localOpponents, bestPair[0].id, bestPair[1].id);
  }

  return { matches: results, scoringLogs };
}

// ───────────────────────── public API ─────────────────────────

export function generateSmartMatches(opts: GenerateOptions): GenerateResult {
  if (opts.playersPerSide === 1) return generateSingles(opts);
  return generateDoubles(opts);
}

export function replacePlayerInQueuedMatches(
  queuedMatches: { id: number; teamAPlayer1Id: number; teamAPlayer2Id: number | null; teamBPlayer1Id: number; teamBPlayer2Id: number | null }[],
  pausedPlayerId: number,
  availablePlayers: Player[],
  fixedPairs?: FixedPair[]
): { matchId: number; position: string; newPlayerId: number }[] {
  const replacements: { matchId: number; position: string; newPlayerId: number }[] = [];
  const usedReplacements = new Set<number>();
  const fp = fixedPairs ?? [];
  const partnerId = getFixedPartner(pausedPlayerId, fp);

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
): { recentPairings: Map<string, number>; recentOpponents: Map<string, number>; playerMatchCounts: Map<number, number>; recentGroups: Map<string, number> } {
  const recentPairings = new Map<string, number>();
  const recentOpponents = new Map<string, number>();
  const playerMatchCounts = new Map<number, number>();
  const recentGroups = new Map<string, number>();

  for (const match of matches) {
    if (match.status !== "COMPLETED" && match.status !== "LIVE") continue;
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];

    for (const id of [...teamA, ...teamB]) {
      playerMatchCounts.set(id, (playerMatchCounts.get(id) ?? 0) + 1);
    }
    if (teamA.length === 2) incPair(recentPairings, teamA[0], teamA[1]);
    if (teamB.length === 2) incPair(recentPairings, teamB[0], teamB[1]);
    for (const a of teamA) for (const b of teamB) incPair(recentOpponents, a, b);
    if (teamA.length === 2 && teamB.length === 2) {
      const key = [...teamA, ...teamB].sort((x, y) => x - y).join("-");
      recentGroups.set(key, (recentGroups.get(key) ?? 0) + 1);
    }
  }

  return { recentPairings, recentOpponents, playerMatchCounts, recentGroups };
}

// Kept as no-op stubs so existing call sites in routes.ts continue to compile
// without changes. The simple engine no longer uses match-type counters.
export function countExistingMatchTypes(
  _matches: any[],
  _playerGenderMap?: Map<number, string>
): { maleOnly: number; femaleOnly: number; mixed: number } {
  return { maleOnly: 0, femaleOnly: 0, mixed: 0 };
}

export function buildPlayerLastMatchTypes(
  _matches: any[],
  _playerGenderMap?: Map<number, string>
): Map<number, MatchType> {
  return new Map();
}
