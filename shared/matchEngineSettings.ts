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

  candidateLimitBase: number;
  candidateLimitScaling: number;

  enablePhaseAdjustments: boolean;

  maleOnlyTargetRatio: number;
  femaleOnlyTargetRatio: number;
  mixedTargetRatio: number;

  strongMaleFemaleBonus: number;
  noStrongMaleFemalePenalty: number;
  maleRotationScaling: number;

  mixedMatchPlayerLimit: number;
  mixedMatchPlayerWindow: number;

  opponentCooldownWindow: number;
  opponentCooldownThreshold: number;
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

  candidateLimitBase: 120,
  candidateLimitScaling: 20,

  enablePhaseAdjustments: true,

  maleOnlyTargetRatio: 0.5,
  femaleOnlyTargetRatio: 0.3,
  mixedTargetRatio: 0.2,

  strongMaleFemaleBonus: 25,
  noStrongMaleFemalePenalty: -40,
  maleRotationScaling: -20,

  mixedMatchPlayerLimit: 2,
  mixedMatchPlayerWindow: 5,

  opponentCooldownWindow: 3,
  opponentCooldownThreshold: 2,
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
      maleOnlyTargetRatio: 0.4,
      femaleOnlyTargetRatio: 0.3,
      mixedTargetRatio: 0.3,
      strongMaleFemaleBonus: 15,
      noStrongMaleFemalePenalty: -20,
      maleRotationScaling: -10,
      mixedMatchPlayerLimit: 3,
      mixedMatchPlayerWindow: 5,
      opponentCooldownWindow: 3,
      opponentCooldownThreshold: 3,
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
      maleOnlyTargetRatio: 0.5,
      femaleOnlyTargetRatio: 0.2,
      mixedTargetRatio: 0.3,
      strongMaleFemaleBonus: 30,
      noStrongMaleFemalePenalty: -50,
      maleRotationScaling: -25,
      mixedMatchPlayerLimit: 2,
      mixedMatchPlayerWindow: 4,
      opponentCooldownWindow: 3,
      opponentCooldownThreshold: 2,
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
