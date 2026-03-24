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
};

export const DEFAULT_SETTINGS: MatchEngineSettings = {
  deficitWeight: -100,
  deficitCap: -210,
  gamesPlayedWeight: -20,
  spreadWeight: -80,

  partnerRepeatWeight: -25,
  opponentRepeatWeight: -8,

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
      opponentRepeatWeight: -10,
      gradeSpreadLimit: 7,
      qualityWeight: 0.5,
      priorityHigh: 180,
      priorityLow: 100,
      enablePhaseAdjustments: false,
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
      opponentRepeatWeight: -6,
      gradeSpreadLimit: 3,
      qualityWeight: 1.5,
      priorityHigh: 120,
      priorityLow: 60,
      enablePhaseAdjustments: true,
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
