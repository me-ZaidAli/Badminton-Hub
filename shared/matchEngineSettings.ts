export type MatchEngineSettings = {
  deficitWeight: number;
  deficitCap: number;
  gamesPlayedWeight: number;
  spreadWeight: number;

  partnerRepeatWeight: number;
  opponentRepeatWeight: number;

  gradeSpreadLimit: number;
  qualityWeight: number;

  priorityHigh: number;
  priorityLow: number;

  femaleQuotaRatio: number;
  mixedPreferenceBonus: number;
  maleRotationPenalty: number;

  candidateLimitBase: number;
  candidateLimitScaling: number;

  enablePhaseAdjustments: boolean;

  femaleOnlyMaxRatio: number;
  mixedMinRatio: number;
  strongMaleFemaleBonus: number;
  noStrongMaleFemalePenalty: number;
  mixedMatchBonus: number;
  sameGenderMatchPenalty: number;
  maleRotationScaling: number;

  consecutiveOpponentBlock: number;
  softOpponentPenalty: number;
  groupRepeatPenalty: number;

  hardGradeSpreadLimit: number;
  teamAvgDiffLimit: number;
};

export const DEFAULT_SETTINGS: MatchEngineSettings = {
  deficitWeight: -100,
  deficitCap: -210,
  gamesPlayedWeight: -20,
  spreadWeight: -80,

  partnerRepeatWeight: -25,
  opponentRepeatWeight: -15,

  gradeSpreadLimit: 5,
  qualityWeight: 1,

  priorityHigh: 150,
  priorityLow: 80,

  femaleQuotaRatio: 0.7,
  mixedPreferenceBonus: 30,
  maleRotationPenalty: -25,

  candidateLimitBase: 120,
  candidateLimitScaling: 20,

  enablePhaseAdjustments: true,

  femaleOnlyMaxRatio: 0.4,
  mixedMinRatio: 0.6,
  strongMaleFemaleBonus: 25,
  noStrongMaleFemalePenalty: -40,
  mixedMatchBonus: 20,
  sameGenderMatchPenalty: -10,
  maleRotationScaling: -15,

  consecutiveOpponentBlock: 2,
  softOpponentPenalty: -25,
  groupRepeatPenalty: -50,

  hardGradeSpreadLimit: 4,
  teamAvgDiffLimit: 3,
};

export const PRESETS: Record<string, { label: string; description: string; settings: Partial<MatchEngineSettings> }> = {
  casual: {
    label: "Casual Play",
    description: "Relaxed settings for social nights — focuses on variety and equal playing time over competitive balance",
    settings: {
      deficitWeight: -120,
      deficitCap: -250,
      gamesPlayedWeight: -25,
      spreadWeight: -100,
      partnerRepeatWeight: -30,
      opponentRepeatWeight: -18,
      gradeSpreadLimit: 7,
      qualityWeight: 0.5,
      priorityHigh: 180,
      priorityLow: 100,
      enablePhaseAdjustments: false,
      femaleOnlyMaxRatio: 0.5,
      mixedMinRatio: 0.5,
      strongMaleFemaleBonus: 15,
      noStrongMaleFemalePenalty: -20,
      mixedMatchBonus: 10,
      sameGenderMatchPenalty: -5,
      maleRotationScaling: -10,
      consecutiveOpponentBlock: 3,
      softOpponentPenalty: -15,
      groupRepeatPenalty: -30,
      hardGradeSpreadLimit: 6,
      teamAvgDiffLimit: 4,
    },
  },
  balanced: {
    label: "Balanced Club",
    description: "Default balanced settings — good mix of fairness, quality, and variety for regular club sessions",
    settings: { ...DEFAULT_SETTINGS },
  },
  competitive: {
    label: "Competitive Night",
    description: "Tight skill matching and quality-focused — best for competitive sessions and graded play",
    settings: {
      deficitWeight: -80,
      deficitCap: -170,
      gamesPlayedWeight: -15,
      spreadWeight: -60,
      partnerRepeatWeight: -20,
      opponentRepeatWeight: -12,
      gradeSpreadLimit: 3,
      qualityWeight: 1.5,
      priorityHigh: 120,
      priorityLow: 60,
      enablePhaseAdjustments: true,
      femaleOnlyMaxRatio: 0.3,
      mixedMinRatio: 0.7,
      strongMaleFemaleBonus: 30,
      noStrongMaleFemalePenalty: -50,
      mixedMatchBonus: 25,
      sameGenderMatchPenalty: -15,
      maleRotationScaling: -20,
      consecutiveOpponentBlock: 2,
      softOpponentPenalty: -35,
      groupRepeatPenalty: -60,
      hardGradeSpreadLimit: 3,
      teamAvgDiffLimit: 2,
    },
  },
};

export type ScoringBreakdown = {
  fairness: number;
  variety: number;
  quality: number;
  priority: number;
  gender: number;
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
