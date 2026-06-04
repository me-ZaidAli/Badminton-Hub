/**
 * matchEngineV2 — simple fairness-first doubles match engine
 *
 * Algorithm (per match slot):
 *   1. Sort all free players by games played (ascending) — least played first
 *   2. Walk combinations of 4 from the front of that list; keep the first
 *      group that passes the legal validity check:
 *        • grade spread (max rank − min rank) ≤ GRADE_SPREAD_LIMIT
 *        • gender composition is acceptable (4M / 4F / 2M+2F / 3M+1F / 1M+3F)
 *        • all four players are free (not already on a court this call)
 *   3. From the three possible 2v2 splits of that group, pick the one whose
 *      team average grade ranks are closest to each other
 *
 * Repeat for each requested match slot (players used in slot N are excluded
 * from slot N+1 within the same call).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Player = {
  id: number;
  grade: string | null; // "A" | "B" | "C" | "D"  (or fine-grained "A+","B-",…)
  gender: string | null; // "MALE" | "FEMALE"
  isPaused: boolean;
  genderOverride?: string | null;
};

export type MatchResult = {
  teamAPlayer1Id: number;
  teamAPlayer2Id: number;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number;
};

export type GenerateOptions = {
  players: Player[];
  /** How many completed + live matches each player has played this session */
  gamesPlayed: Map<number, number>;
  /** How many match slots to fill in this call (usually = free courts) */
  slotsNeeded: number;
  /** Fixed pairs: both IDs must always end up on the same team */
  fixedPairs?: [number, number][];
  /** Grade spread limit (default 3) */
  gradeSpreadLimit?: number;
  /**
   * How many times each pair has been partners this session.
   * Key format: "min(id)-max(id)". Used to break ties in split selection
   * so the engine naturally rotates partners without sacrificing grade balance.
   */
  partnerHistory?: Map<string, number>;
};

export type GenerateResult = {
  matches: MatchResult[];
};

// ─── Grade ranking ────────────────────────────────────────────────────────────

/**
 * Map any grade string to a numeric rank (higher = stronger).
 * Supports both 4-tier ("A","B","C","D") and 8-tier ("A+","A-",…) grades.
 */
function gradeRank(grade: string | null): number {
  if (!grade) return 1;
  // 12-tier numeric sub-grades: A1=12 … D3=1
  const numericMatch = grade.match(/^([A-D])([123])$/);
  if (numericMatch) {
    const letterRank = { A: 3, B: 2, C: 1, D: 0 }[numericMatch[1]] ?? 0;
    const sub = parseInt(numericMatch[2], 10); // 1=best, 3=weakest within letter
    return letterRank * 3 + (4 - sub); // A1=12, A2=11, A3=10, B1=9 … D3=1
  }
  // 8-tier +/- grades
  const eightTier: Record<string, number> = {
    "A+": 8,
    "A-": 7,
    "B+": 6,
    "B-": 5,
    "C+": 4,
    "C-": 3,
    "D+": 2,
    "D-": 1,
  };
  if (eightTier[grade] !== undefined) return eightTier[grade];
  // 4-tier simplified grades
  const fourTier: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  return fourTier[grade] ?? 1;
}

function teamAvg(team: Player[]): number {
  return team.reduce((s, p) => s + gradeRank(p.grade), 0) / team.length;
}

// ─── Gender helpers ───────────────────────────────────────────────────────────

function gender(p: Player): string {
  return p.genderOverride ?? p.gender ?? "MALE";
}

/**
 * Acceptable group compositions:
 *   4M, 4F, 2M+2F, 3M+1F, 1M+3F
 */
function genderValid(group: Player[]): boolean {
  const females = group.filter((p) => gender(p) === "FEMALE").length;
  const males = group.length - females;
  return (
    males === 4 ||
    females === 4 ||
    (males === 2 && females === 2) ||
    (males === 3 && females === 1) ||
    (males === 1 && females === 3)
  );
}

// ─── Fixed-pair helpers ───────────────────────────────────────────────────────

function fixedPartner(
  playerId: number,
  fixedPairs: [number, number][],
): number | null {
  for (const [a, b] of fixedPairs) {
    if (a === playerId) return b;
    if (b === playerId) return a;
  }
  return null;
}

/**
 * If a group contains one player of a fixed pair but not the other, it's invalid.
 */
function fixedPairsRespected(
  group: Player[],
  fixedPairs: [number, number][],
): boolean {
  const ids = new Set(group.map((p) => p.id));
  for (const [a, b] of fixedPairs) {
    const hasA = ids.has(a);
    const hasB = ids.has(b);
    if (hasA !== hasB) return false; // one without the other
  }
  return true;
}

/**
 * If a fixed pair is in the group, they must be on the same team.
 */
function fixedPairsOnSameTeam(
  teamA: Player[],
  teamB: Player[],
  fixedPairs: [number, number][],
): boolean {
  for (const [a, b] of fixedPairs) {
    const aInA = teamA.some((p) => p.id === a);
    const bInA = teamA.some((p) => p.id === b);
    const aInB = teamB.some((p) => p.id === a);
    const bInB = teamB.some((p) => p.id === b);
    const bothPresent = (aInA || aInB) && (bInA || bInB);
    if (bothPresent && aInA !== bInA) return false; // split across teams
  }
  return true;
}

// ─── Core group validation ────────────────────────────────────────────────────

function isValidGroup(
  group: Player[],
  fixedPairs: [number, number][],
  gradeSpreadLimit: number,
): boolean {
  const ranks = group.map((p) => gradeRank(p.grade));
  const spread = Math.max(...ranks) - Math.min(...ranks);
  if (spread > gradeSpreadLimit) return false;
  if (!genderValid(group)) return false;
  if (!fixedPairsRespected(group, fixedPairs)) return false;
  return true;
}

// ─── Team split selection ─────────────────────────────────────────────────────

/**
 * The three ways to split 4 players [a,b,c,d] into two teams of 2.
 */
const SPLITS: [number[], number[]][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Among all valid 2v2 splits of a 4-player group, return the split with
 * the best combined score:
 *   score = teamDiff + partnerRepeats * REPEAT_PENALTY
 *
 * This keeps grade balance as the primary criterion while naturally rotating
 * partners — a split where both teams are repeating known pairings scores
 * worse than an equally-balanced split with fresh partners.
 */
const REPEAT_PENALTY = 1000; // effectively infinite — a repeat split is only chosen when all splits are repeats

/**
 * Returns true if at least one valid 2v2 split of the group has no partner repeats.
 */
function hasRepeatFreeSplit(
  group: Player[],
  fixedPairs: [number, number][],
  partnerHistory: Map<string, number>,
): boolean {
  for (const [idxA, idxB] of SPLITS) {
    const teamA = idxA.map((i) => group[i]);
    const teamB = idxB.map((i) => group[i]);
    if (!fixedPairsOnSameTeam(teamA, teamB, fixedPairs)) continue;
    if (!splitGenderAllowed(teamA, teamB)) continue;
    const repeats =
      (partnerHistory.get(pairKey(teamA[0].id, teamA[1].id)) ?? 0) +
      (partnerHistory.get(pairKey(teamB[0].id, teamB[1].id)) ?? 0);
    if (repeats === 0) return true;
  }
  return false;
}

/**
 * Returns true if a team is entirely one gender.
 * "all male vs all female" splits are the only forbidden matchup.
 */
function isAllMale(team: Player[]): boolean {
  return team.every((p) => gender(p) === "MALE");
}

function isAllFemale(team: Player[]): boolean {
  return team.every((p) => gender(p) === "FEMALE");
}

function isMixed(team: Player[]): boolean {
  const f = team.filter((p) => gender(p) === "FEMALE").length;
  return f > 0 && f < team.length;
}

function splitGenderAllowed(teamA: Player[], teamB: Player[]): boolean {
  // Block: all-male vs all-female (either side)
  if (
    (isAllMale(teamA) && isAllFemale(teamB)) ||
    (isAllFemale(teamA) && isAllMale(teamB))
  )
    return false;
  // Block: mixed pair vs all-female pair (either side)
  if (
    (isMixed(teamA) && isAllFemale(teamB)) ||
    (isAllFemale(teamA) && isMixed(teamB))
  )
    return false;
  return true;
}

function bestSplit(
  group: Player[],
  fixedPairs: [number, number][],
  partnerHistory?: Map<string, number>,
): [Player[], Player[]] | null {
  let best: [Player[], Player[]] | null = null;
  let bestScore = Infinity;

  for (const [idxA, idxB] of SPLITS) {
    const teamA = idxA.map((i) => group[i]);
    const teamB = idxB.map((i) => group[i]);
    if (!fixedPairsOnSameTeam(teamA, teamB, fixedPairs)) continue;
    if (!splitGenderAllowed(teamA, teamB)) continue;

    const diff = Math.abs(teamAvg(teamA) - teamAvg(teamB));

    let repeats = 0;
    if (partnerHistory) {
      if (teamA.length === 2)
        repeats += partnerHistory.get(pairKey(teamA[0].id, teamA[1].id)) ?? 0;
      if (teamB.length === 2)
        repeats += partnerHistory.get(pairKey(teamB[0].id, teamB[1].id)) ?? 0;
    }

    const score = diff + repeats * REPEAT_PENALTY;
    if (score < bestScore) {
      bestScore = score;
      best = [teamA, teamB];
    }
  }

  return best;
}

// ─── Combination search ─────────────────────────────────────────────────────

function groupKey(group: Player[]): string {
  return group
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join("-");
}

/**
 * Find the first combination of 4 players from `pool` that is grade-valid,
 * gender-valid, and fixed-pair-respecting.
 *
 * `femaleSpreadLimit` allows a looser grade spread for all-female groups so
 * that 2F vs 2F matches can form even when female players span more grade
 * tiers than the general limit allows. Pruning during recursion uses
 * max(spreadLimit, femaleSpreadLimit) to avoid cutting off all-female branches
 * prematurely; the tighter per-composition check happens at the leaf.
 *
 * When `groupHistory` is provided, groups that have already played together
 * are skipped in favour of fresh groups. The first seen-group is held as a
 * fallback and returned only if no unseen group exists.
 */
function findFirstValidGroup(
  pool: Player[],
  poolRanks: number[],
  fixedPairs: [number, number][],
  spreadLimit: number,
  femaleSpreadLimit: number,
  partnerHistory?: Map<string, number>,
  groupHistory?: Map<string, number>,
): Player[] | null {
  const pruneLimit = Math.max(spreadLimit, femaleSpreadLimit);
  let fallback: Player[] | null = null;

  function pick(
    start: number,
    chosen: Player[],
    minR: number,
    maxR: number,
  ): Player[] | null {
    if (chosen.length === 4) {
      const spread = maxR - minR;
      const allF = chosen.every((p) => gender(p) === "FEMALE");
      const limit = allF ? femaleSpreadLimit : spreadLimit;
      if (spread > limit) return null;
      if (!genderValid(chosen) || !fixedPairsRespected(chosen, fixedPairs))
        return null;

      // Prefer groups that have at least one repeat-free partner split
      if (
        partnerHistory &&
        !hasRepeatFreeSplit(chosen, fixedPairs, partnerHistory)
      ) {
        if (!fallback) fallback = [...chosen];
        return null;
      }

      // Prefer groups that haven’t been together before
      if (groupHistory && (groupHistory.get(groupKey(chosen)) ?? 0) > 0) {
        if (!fallback) fallback = [...chosen];
        return null;
      }
      return [...chosen];
    }
    const need = 4 - chosen.length;
    for (let i = start; i <= pool.length - need; i++) {
      const r = poolRanks[i];
      const lo = Math.min(minR, r);
      const hi = Math.max(maxR, r);
      if (hi - lo > pruneLimit) continue; // prune whole sub-tree
      const result = pick(i + 1, [...chosen, pool[i]], lo, hi);
      if (result) return result;
    }
    return null;
  }

  // First attempt: force pool[0] (least-played player) into the group so the
  // engine never skips a player who has been waiting the longest.
  const anchored = pick(1, [pool[0]], poolRanks[0], poolRanks[0]);
  if (anchored) return anchored;

  // Fallback: open search (pool[0] may genuinely be unplaceable this round)
  return pick(0, [], Infinity, -Infinity) ?? fallback;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build the per-session history the engine needs from a list of matches.
 * Counts only matches that actually happened (COMPLETED or LIVE):
 *   - playerMatchCounts: how many matches each player has played this session
 *   - partnerHistory: how many times each pair partnered (key "min-max")
 */
export function buildSessionHistory(
  matches: {
    status: string;
    teamAPlayer1Id: number | null;
    teamAPlayer2Id: number | null;
    teamBPlayer1Id: number | null;
    teamBPlayer2Id: number | null;
  }[],
): { playerMatchCounts: Map<number, number>; partnerHistory: Map<string, number> } {
  const playerMatchCounts = new Map<number, number>();
  const partnerHistory = new Map<string, number>();

  for (const match of matches) {
    if (match.status !== "COMPLETED" && match.status !== "LIVE") continue;
    const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter((id): id is number => id != null);
    const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter((id): id is number => id != null);

    for (const id of [...teamA, ...teamB]) {
      playerMatchCounts.set(id, (playerMatchCounts.get(id) ?? 0) + 1);
    }
    if (teamA.length === 2) {
      const k = pairKey(teamA[0], teamA[1]);
      partnerHistory.set(k, (partnerHistory.get(k) ?? 0) + 1);
    }
    if (teamB.length === 2) {
      const k = pairKey(teamB[0], teamB[1]);
      partnerHistory.set(k, (partnerHistory.get(k) ?? 0) + 1);
    }
  }

  return { playerMatchCounts, partnerHistory };
}

export function generateMatches(opts: GenerateOptions): GenerateResult {
  const {
    players,
    gamesPlayed,
    slotsNeeded,
    fixedPairs = [],
    gradeSpreadLimit = 3,
    partnerHistory,
  } = opts;

  // Only free, unpaused players are candidates
  const free = players.filter((p) => !p.isPaused);

  const matches: MatchResult[] = [];
  // Track which players are already committed to a match this call
  const used = new Set<number>();

  for (let slot = 0; slot < slotsNeeded; slot++) {
    // ── Step 1: sort free, unused players by games played (ascending) ─────────
    const available = free
      .filter((p) => !used.has(p.id))
      .sort((a, b) => {
        const ga = gamesPlayed.get(a.id) ?? 0;
        const gb = gamesPlayed.get(b.id) ?? 0;
        if (ga !== gb) return ga - gb; // fewest games first
        return Math.random() - 0.5; // random tie-break → varied groupings
      });

    if (available.length < 4) break;

    // ── Step 2: find the first valid group of 4 from the front of the list ────
    //
    // Strategy: prefer groups built from the least-played players.
    // We scan combinations of 4 starting from index 0 so the earliest
    // (least-played) players are always tried first.
    //
    // To keep the search bounded, we only look at the first WINDOW players.
    // WINDOW grows if the initial search fails, giving a graceful fallback.

    let chosenGroup: Player[] | null = null;
    let relaxedSpread = gradeSpreadLimit;
    // All-female groups get one extra tier of spread to help 2F vs 2F form
    const femaleSpread = gradeSpreadLimit + 1;

    for (let pass = 0; pass < 2 && chosenGroup === null; pass++) {
      // Pass 0: tight grade spread; Pass 1: allow any grade spread
      if (pass === 1) relaxedSpread = 8;

      const window = Math.min(
        available.length,
        pass === 0 ? 12 : available.length,
      );
      const pool = available.slice(0, window);
      const poolRanks = pool.map((p) => gradeRank(p.grade));

      chosenGroup = findFirstValidGroup(
        pool,
        poolRanks,
        fixedPairs,
        relaxedSpread,
        pass === 0 ? femaleSpread : 8,
        partnerHistory,
      );
    }

    if (!chosenGroup) break; // not enough valid players for this slot

    // ── Step 3: pick the split with the most balanced team averages ───────────
    //    (partner history used as tiebreaker to rotate partners)
    const split = bestSplit(chosenGroup, fixedPairs, partnerHistory);
    if (!split) break; // fixed-pair constraints made every split illegal

    const [teamA, teamB] = split;

    matches.push({
      teamAPlayer1Id: teamA[0].id,
      teamAPlayer2Id: teamA[1].id,
      teamBPlayer1Id: teamB[0].id,
      teamBPlayer2Id: teamB[1].id,
    });

    for (const p of chosenGroup) used.add(p.id);
  }

  return { matches };
}
