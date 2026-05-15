// Simple Match Engine — single algorithm, five knobs.
//
// Algorithm (per match generated):
//   1. Filter eligible players by gender category (MD/WD/Mixed).
//   2. Sort by gamesPlayed asc → pick the top `candidatePoolSize` hungriest.
//   3. Enumerate every possible group of 4 from that pool (max ~495 combos).
//   4. Score each group: penalties for repeat foursomes, repeat partners,
//      repeat opponents, and grade spread. Lowest score wins.
//   5. Split the chosen 4 into balanced teams: top+bottom vs middle two.
//
// All five knobs are surfaced in the engine control panel and PRESETS below.

export type MatchEngineSettings = {
  // Penalty added when this exact 4-player group has already played together
  // earlier in the session. Multiplied by how many times it's already happened.
  groupRepeatPenalty: number;

  // Penalty per prior partner pairing inside the candidate group of 4.
  // (Up to 6 player-pairs are considered; only the chosen team-split actually
  // becomes partners but we score upfront to prefer groups with low repeat risk.)
  partnerRepeatPenalty: number;

  // Penalty per prior opponent pairing inside the candidate group of 4.
  opponentRepeatPenalty: number;

  // Penalty per grade-rank difference between the highest- and lowest-graded
  // player in the group. Keeps games competitive without hard-blocking.
  gradeSpreadWeight: number;

  // How many of the least-played players to consider for each match.
  // 8 is a good default (yields C(8,4)=70 candidate groups). Higher = more
  // variety but slower; lower = stricter rotation.
  candidatePoolSize: number;
};

export const DEFAULT_SETTINGS: MatchEngineSettings = {
  groupRepeatPenalty: 10,
  partnerRepeatPenalty: 3,
  opponentRepeatPenalty: 1,
  gradeSpreadWeight: 0.5,
  candidatePoolSize: 8,
};

export const PRESETS: Record<string, { label: string; description: string; settings: MatchEngineSettings }> = {
  casual: {
    label: "Casual",
    description: "Relaxed — prioritises variety and equal playing time. Lighter penalties so the engine has more freedom.",
    settings: {
      groupRepeatPenalty: 6,
      partnerRepeatPenalty: 2,
      opponentRepeatPenalty: 0.5,
      gradeSpreadWeight: 0.2,
      candidatePoolSize: 10,
    },
  },
  balanced: {
    label: "Balanced",
    description: "Default — good mix of fairness, variety, and skill matching for regular club nights.",
    settings: { ...DEFAULT_SETTINGS },
  },
  competitive: {
    label: "Competitive",
    description: "Tighter skill matching and stronger anti-repeat. Best for graded sessions or league nights.",
    settings: {
      groupRepeatPenalty: 15,
      partnerRepeatPenalty: 5,
      opponentRepeatPenalty: 2,
      gradeSpreadWeight: 1.5,
      candidatePoolSize: 6,
    },
  },
};

// Kept exported for backwards compatibility with existing call sites that
// reference the type. The engine no longer branches on mode — there is only
// one algorithm now. Callers can ignore this; persisted DB values are tolerated.
export type MatchmakingMode = "ADVANCED";

// Compatibility shapes used by older lab/preview code paths. Engine still
// returns these so the UI doesn't break.
export type ScoringBreakdown = {
  groupRepeat: number;
  partnerRepeat: number;
  opponentRepeat: number;
  gradeSpread: number;
  total: number;
};

export type MatchPreviewResult = {
  teamAPlayer1Id: number;
  teamAPlayer2Id: number | null;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number | null;
  qualityScore: number;
  breakdown: ScoringBreakdown;
  factors: string[];
  courtNumber: number;
};
