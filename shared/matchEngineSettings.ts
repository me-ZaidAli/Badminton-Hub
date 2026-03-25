export type MatchmakingMode = "ADVANCED" | "HYBRID" | "ROTATION";

export type MatchEngineSettings = {
  matchmakingMode: MatchmakingMode;

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

  hybridGroupSize: number;
  hybridGroupCooldown: number;
  hybridGradeSpreadLimit: number;

  rotationWinnerStays: boolean;
};

export const DEFAULT_SETTINGS: MatchEngineSettings = {
  matchmakingMode: "ADVANCED",

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

  hybridGroupSize: 6,
  hybridGroupCooldown: 2,
  hybridGradeSpreadLimit: 5,

  rotationWinnerStays: false,
};

export const PRESETS: Record<string, { label: string; description: string; settings: Partial<MatchEngineSettings> }> = {
  casual: {
    label: "Casual Play",
    description: "Relaxed settings for social nights — focuses on variety and equal playing time over competitive balance",
    settings: {
      matchmakingMode: "HYBRID",
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
      hybridGroupSize: 6,
      hybridGroupCooldown: 2,
      hybridGradeSpreadLimit: 6,
      rotationWinnerStays: false,
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
      matchmakingMode: "ADVANCED",
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
      hybridGroupSize: 4,
      hybridGroupCooldown: 2,
      hybridGradeSpreadLimit: 4,
      rotationWinnerStays: false,
    },
  },
  rotation: {
    label: "Quick Rotation",
    description: "Fast queue-based rotation — minimal optimisation, maximum speed and equal playing time",
    settings: {
      matchmakingMode: "ROTATION",
      rotationWinnerStays: false,
      hybridGroupSize: 4,
      hybridGroupCooldown: 2,
      hybridGradeSpreadLimit: 7,
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
