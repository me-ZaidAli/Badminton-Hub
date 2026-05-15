// AI Brain layer — DEPRECATED.
//
// The previous adaptive-fairness "AI brain" (slot distribution, gender
// steering, fatigue/rest priorities, win-rate damping, session-stage tuning)
// has been removed in favour of the simple engine in `matchEngine.ts`.
//
// This file remains as a thin compatibility shim so existing call sites
// (routes.ts, matchEngineLab.ts) continue to work unchanged. `applyAIBrainLayer`
// now just forwards to `generateSmartMatches`. `computeSessionMetrics` keeps
// its previous shape (used by lab simulator + a few admin endpoints) but is
// computed straightforwardly with no scoring/AI overlays.

import { generateSmartMatches, buildPairingHistory, getGradeRank } from "./matchEngine";

type Player = {
  id: number;
  gender: string | null;
  grade: string | null;
  isPaused: boolean;
  genderOverride?: string | null;
};

type Match = {
  id?: number;
  teamAPlayer1Id: number;
  teamAPlayer2Id: number | null;
  teamBPlayer1Id: number;
  teamBPlayer2Id: number | null;
  status: string;
  scoreA?: number | null;
  scoreB?: number | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
};

type AIBrainOptions = {
  mode: "SOCIAL" | "COMPETITIVE";
  players: Player[];
  playersPerSide: 1 | 2;
  genderType: "MIXED" | "FEMALE" | "MALE";
  queueTarget: number;
  matchHistory: Match[];
  sessionDurationMinutes: number;
  elapsedMinutes: number;
  fixedPairs?: [number, number][];
  priorityPlayerIds?: number[];
};

export type PlayerMetric = {
  playerId: number;
  matchesPlayed: number;
  consecutiveMatches: number;
  roundsSinceLastMatch: number;
  lastPartners: number[];
  lastOpponents: number[];
  winCount: number;
  lossCount: number;
  wins: number;
  losses: number;
};

export type SessionWarning = {
  type: "IDLE_PLAYER" | "LONG_REST" | "FATIGUE" | "INFO";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  playerId: number;
};

export type SessionMetrics = {
  totalMatches: number;
  totalRounds: number;
  playerMetrics: PlayerMetric[];
  averageMatchesPerPlayer: number;
  fairnessScore: number;
  warnings: SessionWarning[];
  partnerDiversity: number;
  opponentDiversity: number;
  genderBalanceScore: number;
  matchQualityAverage: number;
};

type AIGenerateResult = ReturnType<typeof generateSmartMatches> & {
  aiMetrics?: SessionMetrics;
  aiFactors?: string[];
};

export function computeSessionMetrics(matches: Match[], players: Player[]): SessionMetrics {
  const completed = matches.filter(m => m.status === "COMPLETED" || m.status === "LIVE");
  const counts = new Map<number, number>();
  const lastSeenIdx = new Map<number, number>();
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();
  const lastPartners = new Map<number, number[]>();
  const lastOpponents = new Map<number, number[]>();

  completed.forEach((m, idx) => {
    const teamA = [m.teamAPlayer1Id, m.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
    const all = [...teamA, ...teamB];
    for (const id of all) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      lastSeenIdx.set(id, idx);
    }
    if (teamA.length === 2) {
      lastPartners.set(teamA[0], [...(lastPartners.get(teamA[0]) ?? []), teamA[1]]);
      lastPartners.set(teamA[1], [...(lastPartners.get(teamA[1]) ?? []), teamA[0]]);
    }
    if (teamB.length === 2) {
      lastPartners.set(teamB[0], [...(lastPartners.get(teamB[0]) ?? []), teamB[1]]);
      lastPartners.set(teamB[1], [...(lastPartners.get(teamB[1]) ?? []), teamB[0]]);
    }
    for (const a of teamA) for (const b of teamB) {
      lastOpponents.set(a, [...(lastOpponents.get(a) ?? []), b]);
      lastOpponents.set(b, [...(lastOpponents.get(b) ?? []), a]);
    }
    const aWon = (m.scoreA ?? 0) > (m.scoreB ?? 0);
    if (m.status === "COMPLETED" && (m.scoreA != null || m.scoreB != null)) {
      for (const id of teamA) (aWon ? wins : losses).set(id, ((aWon ? wins : losses).get(id) ?? 0) + 1);
      for (const id of teamB) (aWon ? losses : wins).set(id, ((aWon ? losses : wins).get(id) ?? 0) + 1);
    }
  });

  const totalRounds = Math.ceil(completed.length / Math.max(1, Math.floor(players.length / 4)));

  const playerMetrics: PlayerMetric[] = players.map(p => {
    const lastIdx = lastSeenIdx.get(p.id);
    const roundsSince = lastIdx == null ? totalRounds : Math.max(0, totalRounds - 1 - Math.floor(lastIdx / Math.max(1, Math.floor(players.length / 4))));
    const w = wins.get(p.id) ?? 0;
    const l = losses.get(p.id) ?? 0;
    return {
      playerId: p.id,
      matchesPlayed: counts.get(p.id) ?? 0,
      consecutiveMatches: 0,
      roundsSinceLastMatch: roundsSince,
      lastPartners: (lastPartners.get(p.id) ?? []).slice(-3),
      lastOpponents: (lastOpponents.get(p.id) ?? []).slice(-3),
      winCount: w,
      lossCount: l,
      wins: w,
      losses: l,
    };
  });

  const totals = playerMetrics.map(pm => pm.matchesPlayed);
  const avg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const variance = totals.length > 0 ? totals.reduce((s, t) => s + (t - avg) ** 2, 0) / totals.length : 0;
  const fairnessScore = Math.max(0, Math.round(100 - variance * 10));

  // Simple diversity metrics: ratio of unique partners/opponents to total exposures.
  const partnerDiversity = (() => {
    const ratios: number[] = [];
    for (const [, list] of lastPartners) {
      if (list.length === 0) continue;
      ratios.push(new Set(list).size / list.length);
    }
    return ratios.length === 0 ? 100 : Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100);
  })();
  const opponentDiversity = (() => {
    const ratios: number[] = [];
    for (const [, list] of lastOpponents) {
      if (list.length === 0) continue;
      ratios.push(new Set(list).size / list.length);
    }
    return ratios.length === 0 ? 100 : Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100);
  })();

  // Idle / long-rest warnings — used by smart-generate to bump priority IDs.
  const warnings: SessionWarning[] = [];
  for (const pm of playerMetrics) {
    if (pm.matchesPlayed === 0 && completed.length > 0) {
      warnings.push({ type: "IDLE_PLAYER", message: "Player has not played yet", severity: "MEDIUM", playerId: pm.playerId });
    } else if (pm.roundsSinceLastMatch >= 3) {
      warnings.push({ type: "LONG_REST", message: `Player rested ${pm.roundsSinceLastMatch} rounds`, severity: "LOW", playerId: pm.playerId });
    }
  }

  return {
    totalMatches: completed.length,
    totalRounds,
    playerMetrics,
    averageMatchesPerPlayer: avg,
    fairnessScore,
    warnings,
    partnerDiversity,
    opponentDiversity,
    genderBalanceScore: 100,
    matchQualityAverage: fairnessScore,
  };
}

// Compatibility shim — forwards directly to generateSmartMatches.
export function applyAIBrainLayer(opts: AIBrainOptions): AIGenerateResult {
  const { recentPairings, recentOpponents, playerMatchCounts, recentGroups } = buildPairingHistory(opts.matchHistory);
  const aiMetrics = computeSessionMetrics(opts.matchHistory, opts.players);

  const result = generateSmartMatches({
    mode: opts.mode,
    players: opts.players,
    playersPerSide: opts.playersPerSide,
    genderType: opts.genderType,
    queueTarget: opts.queueTarget,
    recentPairings,
    recentOpponents,
    recentGroups,
    playerMatchCounts,
    fixedPairs: opts.fixedPairs,
    priorityPlayerIds: opts.priorityPlayerIds,
  });

  return { ...result, aiMetrics, aiFactors: [] };
}

// Re-export for convenience
export { getGradeRank };
