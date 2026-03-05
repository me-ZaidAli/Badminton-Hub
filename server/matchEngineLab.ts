import { generateSmartMatches, buildPairingHistory, getGradeRank } from "./matchEngine";
import { applyAIBrainLayer, computeSessionMetrics } from "./adaptiveFairnessAI";
import { GRADE_ORDER } from "@shared/schema";

type Player = {
  id: number;
  gender: string | null;
  grade: string | null;
  isPaused: boolean;
  genderOverride?: string | null;
  name: string;
  rating: number;
};

type SimulationConfig = {
  totalMatches: number;
  playerCount: number;
  maleCount: number;
  femaleCount: number;
  mode: "SOCIAL" | "COMPETITIVE";
  genderType: "MIXED" | "FEMALE" | "MALE";
  playersPerSide: 1 | 2;
  courtsAvailable: number;
  useAIBrain: boolean;
  gradeDistribution: "uniform" | "weighted" | "custom";
  customGrades?: string[];
};

type MatchDetail = {
  round: number;
  matchIndex: number;
  teamA: { id: number; name: string; gender: string; grade: string; rating: number }[];
  teamB: { id: number; name: string; gender: string; grade: string; rating: number }[];
  teamAStrength: number;
  teamBStrength: number;
  balanceRating: number;
  difficultyScore: number;
  competitivenessLevel: "EASY" | "BALANCED" | "HARD";
  genderComposition: "MIXED" | "MEN_DOUBLES" | "WOMEN_DOUBLES" | "SINGLES";
};

type SimulationReport = {
  id: string;
  timestamp: string;
  config: SimulationConfig;
  sessionHealthScore: number;
  totalMatchesGenerated: number;
  totalRounds: number;
  matchesPerPlayer: Record<number, { name: string; count: number; gender: string; grade: string }>;
  fairnessScores: number[];
  challengeDistribution: { easy: number; balanced: number; hard: number };
  partnerHeatmap: { player1: number; player2: number; player1Name: string; player2Name: string; count: number }[];
  opponentHeatmap: { player1: number; player2: number; player1Name: string; player2Name: string; count: number }[];
  fatigueTimeline: Record<number, { name: string; rounds: number[] }>;
  rankingBalance: { matchIndex: number; strengthDiff: number }[];
  genderDistribution: { mixed: number; menDoubles: number; womenDoubles: number; singles: number };
  matchDetails: MatchDetail[];
  diagnosticWarnings: { type: string; severity: "LOW" | "MEDIUM" | "HIGH"; message: string; matchIndices?: number[] }[];
  aiMetrics?: {
    fairnessScore: number;
    genderBalanceScore: number;
    matchQualityAverage: number;
    partnerDiversity: number;
    opponentDiversity: number;
    warnings: { type: string; message: string; severity: string }[];
  };
};

const MALE_NAMES = [
  "James", "Oliver", "Harry", "George", "Noah", "Leo", "Arthur", "Oscar",
  "Charlie", "Jack", "Henry", "Freddie", "Thomas", "Finley", "Theo",
  "Archie", "Alfie", "Jacob", "Edward", "Alexander", "Max", "Lucas",
  "William", "Daniel", "Ethan", "Samuel"
];

const FEMALE_NAMES = [
  "Olivia", "Amelia", "Isla", "Ava", "Emily", "Sophia", "Grace",
  "Mia", "Poppy", "Ella", "Lily", "Evie", "Hannah", "Jessica",
  "Sophie", "Ruby", "Freya", "Alice", "Charlotte", "Isabella",
  "Daisy", "Florence", "Chloe", "Phoebe", "Lucy", "Harper"
];

function generateDummyPlayers(config: SimulationConfig): Player[] {
  const players: Player[] = [];
  const grades = [...GRADE_ORDER];
  let maleIdx = 0;
  let femaleIdx = 0;

  for (let i = 0; i < config.playerCount; i++) {
    const isMale = i < config.maleCount;
    const gender = isMale ? "MALE" : "FEMALE";
    const name = isMale
      ? MALE_NAMES[maleIdx++ % MALE_NAMES.length]
      : FEMALE_NAMES[femaleIdx++ % FEMALE_NAMES.length];

    let grade: string;
    if (config.gradeDistribution === "custom" && config.customGrades && config.customGrades[i]) {
      grade = config.customGrades[i];
    } else if (config.gradeDistribution === "weighted") {
      const r = Math.random();
      if (r < 0.1) grade = grades[8];
      else if (r < 0.2) grade = grades[7];
      else if (r < 0.3) grade = grades[6];
      else if (r < 0.5) grade = grades[5];
      else if (r < 0.65) grade = grades[4];
      else if (r < 0.75) grade = grades[3];
      else if (r < 0.85) grade = grades[2];
      else if (r < 0.93) grade = grades[1];
      else grade = grades[0];
    } else {
      grade = grades[i % grades.length];
    }

    const rating = getGradeRank(grade);

    players.push({
      id: 1000 + i,
      gender,
      grade,
      isPaused: false,
      genderOverride: null,
      name: `${name} ${String.fromCharCode(65 + (i % 26))}`,
      rating,
    });
  }

  return players;
}

function classifyGenderComposition(
  teamA: { gender: string }[],
  teamB: { gender: string }[]
): "MIXED" | "MEN_DOUBLES" | "WOMEN_DOUBLES" | "SINGLES" {
  const all = [...teamA, ...teamB];
  if (all.length <= 2) return "SINGLES";
  const females = all.filter(p => p.gender === "FEMALE").length;
  const males = all.filter(p => p.gender !== "FEMALE").length;
  if (females === 4) return "WOMEN_DOUBLES";
  if (males === 4) return "MEN_DOUBLES";
  return "MIXED";
}

function computeBalanceRating(teamAStrength: number, teamBStrength: number): number {
  const maxS = Math.max(teamAStrength, teamBStrength);
  if (maxS === 0) return 100;
  const diff = Math.abs(teamAStrength - teamBStrength);
  return Math.max(0, Math.round(100 - (diff / maxS) * 100));
}

function computeDifficultyScore(teamAStrength: number, teamBStrength: number): number {
  const avgStrength = (teamAStrength + teamBStrength) / 2;
  return Math.round((avgStrength / 9) * 100);
}

function computeCompetitivenessLevel(balanceRating: number): "EASY" | "BALANCED" | "HARD" {
  if (balanceRating >= 80) return "BALANCED";
  if (balanceRating >= 50) return "HARD";
  return "EASY";
}

export function runSimulation(config: SimulationConfig): SimulationReport {
  const players = generateDummyPlayers(config);
  const playerMap = new Map(players.map(p => [p.id, p]));

  const matchHistory: {
    id: number;
    status: string;
    teamAPlayer1Id: number;
    teamAPlayer2Id: number | null;
    teamBPlayer1Id: number;
    teamBPlayer2Id: number | null;
    scoreA: number | null;
    scoreB: number | null;
    startedAt: string | null;
    completedAt: string | null;
  }[] = [];

  const allMatchDetails: MatchDetail[] = [];
  const allFairnessScores: number[] = [];
  const roundFatigueTracker: Record<number, number[]> = {};
  const rankingBalanceLog: { matchIndex: number; strengthDiff: number }[] = [];
  let globalMatchIndex = 0;

  for (const p of players) {
    roundFatigueTracker[p.id] = [];
  }

  const matchesPerRound = config.courtsAvailable;
  const totalRounds = Math.ceil(config.totalMatches / matchesPerRound);

  for (let round = 1; round <= totalRounds; round++) {
    const busyIds = new Set<number>();
    const liveMatches = matchHistory.filter(m => m.status === "LIVE");
    for (const m of liveMatches) {
      [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id]
        .filter(Boolean)
        .forEach(id => busyIds.add(id!));
    }

    const availablePlayers = players.filter(p => !busyIds.has(p.id) && !p.isPaused);

    if (availablePlayers.length < (config.playersPerSide === 2 ? 4 : 2)) {
      for (const m of matchHistory) {
        if (m.status === "LIVE") {
          m.status = "COMPLETED";
          m.completedAt = new Date().toISOString();
          m.scoreA = Math.floor(Math.random() * 11) + 15;
          m.scoreB = Math.floor(Math.random() * 11) + 15;
          if (m.scoreA === m.scoreB) m.scoreA += 2;
        }
      }
      continue;
    }

    let generatedMatches;

    if (config.useAIBrain) {
      const result = applyAIBrainLayer({
        mode: config.mode,
        players: availablePlayers,
        playersPerSide: config.playersPerSide,
        genderType: config.genderType,
        queueTarget: matchesPerRound,
        matchHistory,
        sessionDurationMinutes: 120,
        elapsedMinutes: Math.round((round / totalRounds) * 120),
      });
      generatedMatches = result.matches;
    } else {
      const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
        matchHistory.map(m => ({
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          status: m.status,
        }))
      );

      const result = generateSmartMatches({
        mode: config.mode,
        players: availablePlayers,
        playersPerSide: config.playersPerSide,
        genderType: config.genderType,
        queueTarget: matchesPerRound,
        recentPairings,
        recentOpponents,
        playerMatchCounts,
      });
      generatedMatches = result.matches;
    }

    for (const m of matchHistory) {
      if (m.status === "LIVE") {
        m.status = "COMPLETED";
        m.completedAt = new Date().toISOString();
        m.scoreA = Math.floor(Math.random() * 11) + 15;
        m.scoreB = Math.floor(Math.random() * 11) + 15;
        if (m.scoreA === m.scoreB) m.scoreA += 2;
      }
    }

    for (const match of generatedMatches) {
      if (globalMatchIndex >= config.totalMatches) break;

      const matchId = globalMatchIndex + 1;
      matchHistory.push({
        id: matchId,
        status: "LIVE",
        teamAPlayer1Id: match.teamAPlayer1Id,
        teamAPlayer2Id: match.teamAPlayer2Id,
        teamBPlayer1Id: match.teamBPlayer1Id,
        teamBPlayer2Id: match.teamBPlayer2Id,
        scoreA: null,
        scoreB: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
      });

      const ids = [match.teamAPlayer1Id, match.teamAPlayer2Id, match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean) as number[];
      for (const pid of ids) {
        if (roundFatigueTracker[pid]) {
          roundFatigueTracker[pid].push(round);
        }
      }

      const teamAPlayers = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean).map(id => {
        const p = playerMap.get(id!);
        return {
          id: id!,
          name: p?.name || `Player ${id}`,
          gender: p?.gender || "MALE",
          grade: p?.grade || "C3",
          rating: p?.rating || 1,
        };
      });

      const teamBPlayers = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean).map(id => {
        const p = playerMap.get(id!);
        return {
          id: id!,
          name: p?.name || `Player ${id}`,
          gender: p?.gender || "MALE",
          grade: p?.grade || "C3",
          rating: p?.rating || 1,
        };
      });

      const teamAStrength = teamAPlayers.reduce((s, p) => s + p.rating, 0) / teamAPlayers.length;
      const teamBStrength = teamBPlayers.reduce((s, p) => s + p.rating, 0) / teamBPlayers.length;
      const balanceRating = computeBalanceRating(teamAStrength, teamBStrength);
      const difficultyScore = computeDifficultyScore(teamAStrength, teamBStrength);
      const competitivenessLevel = computeCompetitivenessLevel(balanceRating);
      const genderComposition = classifyGenderComposition(teamAPlayers, teamBPlayers);

      allFairnessScores.push(balanceRating);
      rankingBalanceLog.push({ matchIndex: globalMatchIndex, strengthDiff: Math.abs(teamAStrength - teamBStrength) });

      allMatchDetails.push({
        round,
        matchIndex: globalMatchIndex,
        teamA: teamAPlayers,
        teamB: teamBPlayers,
        teamAStrength: Math.round(teamAStrength * 10) / 10,
        teamBStrength: Math.round(teamBStrength * 10) / 10,
        balanceRating,
        difficultyScore,
        competitivenessLevel,
        genderComposition,
      });

      globalMatchIndex++;
    }
  }

  for (const m of matchHistory) {
    if (m.status === "LIVE") {
      m.status = "COMPLETED";
      m.completedAt = new Date().toISOString();
      m.scoreA = Math.floor(Math.random() * 11) + 15;
      m.scoreB = Math.floor(Math.random() * 11) + 15;
      if (m.scoreA === m.scoreB) m.scoreA += 2;
    }
  }

  const matchesPerPlayer: Record<number, { name: string; count: number; gender: string; grade: string }> = {};
  for (const p of players) {
    matchesPerPlayer[p.id] = { name: p.name, count: 0, gender: p.gender || "MALE", grade: p.grade || "C3" };
  }
  for (const m of matchHistory) {
    for (const pid of [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id]) {
      if (pid && matchesPerPlayer[pid]) matchesPerPlayer[pid].count++;
    }
  }

  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  for (const m of matchHistory) {
    const teamA = [m.teamAPlayer1Id, m.teamAPlayer2Id].filter(Boolean) as number[];
    const teamB = [m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
    if (teamA.length === 2) {
      const key = teamA[0] < teamA[1] ? `${teamA[0]}-${teamA[1]}` : `${teamA[1]}-${teamA[0]}`;
      partnerCounts.set(key, (partnerCounts.get(key) || 0) + 1);
    }
    if (teamB.length === 2) {
      const key = teamB[0] < teamB[1] ? `${teamB[0]}-${teamB[1]}` : `${teamB[1]}-${teamB[0]}`;
      partnerCounts.set(key, (partnerCounts.get(key) || 0) + 1);
    }
    for (const a of teamA) {
      for (const b of teamB) {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        opponentCounts.set(key, (opponentCounts.get(key) || 0) + 1);
      }
    }
  }

  const partnerHeatmap = Array.from(partnerCounts.entries()).map(([key, count]) => {
    const [id1, id2] = key.split("-").map(Number);
    return {
      player1: id1,
      player2: id2,
      player1Name: playerMap.get(id1)?.name || `P${id1}`,
      player2Name: playerMap.get(id2)?.name || `P${id2}`,
      count,
    };
  }).sort((a, b) => b.count - a.count);

  const opponentHeatmap = Array.from(opponentCounts.entries()).map(([key, count]) => {
    const [id1, id2] = key.split("-").map(Number);
    return {
      player1: id1,
      player2: id2,
      player1Name: playerMap.get(id1)?.name || `P${id1}`,
      player2Name: playerMap.get(id2)?.name || `P${id2}`,
      count,
    };
  }).sort((a, b) => b.count - a.count);

  const fatigueTimeline: Record<number, { name: string; rounds: number[] }> = {};
  for (const p of players) {
    fatigueTimeline[p.id] = { name: p.name, rounds: roundFatigueTracker[p.id] || [] };
  }

  const genderDistribution = {
    mixed: allMatchDetails.filter(m => m.genderComposition === "MIXED").length,
    menDoubles: allMatchDetails.filter(m => m.genderComposition === "MEN_DOUBLES").length,
    womenDoubles: allMatchDetails.filter(m => m.genderComposition === "WOMEN_DOUBLES").length,
    singles: allMatchDetails.filter(m => m.genderComposition === "SINGLES").length,
  };

  const challengeDistribution = {
    easy: allMatchDetails.filter(m => m.competitivenessLevel === "EASY").length,
    balanced: allMatchDetails.filter(m => m.competitivenessLevel === "BALANCED").length,
    hard: allMatchDetails.filter(m => m.competitivenessLevel === "HARD").length,
  };

  const diagnosticWarnings: SimulationReport["diagnosticWarnings"] = [];

  const counts = Object.values(matchesPerPlayer).map(p => p.count);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  if (maxCount - minCount > 3) {
    const overPlayed = Object.entries(matchesPerPlayer)
      .filter(([_, p]) => p.count === maxCount)
      .map(([_, p]) => p.name);
    diagnosticWarnings.push({
      type: "UNEVEN_DISTRIBUTION",
      severity: "HIGH",
      message: `Match distribution uneven: ${maxCount - minCount} match gap. Most played: ${overPlayed.join(", ")}`,
    });
  }

  const repeatedPartners = partnerHeatmap.filter(p => p.count >= 3);
  for (const rp of repeatedPartners.slice(0, 5)) {
    diagnosticWarnings.push({
      type: "REPEATED_PARTNER",
      severity: "MEDIUM",
      message: `${rp.player1Name} and ${rp.player2Name} partnered ${rp.count} times`,
    });
  }

  const totalGender = genderDistribution.mixed + genderDistribution.menDoubles + genderDistribution.womenDoubles;
  if (totalGender > 0 && config.genderType === "MIXED") {
    const mixedPct = genderDistribution.mixed / totalGender;
    if (mixedPct < 0.2) {
      diagnosticWarnings.push({
        type: "LOW_MIXED",
        severity: "HIGH",
        message: `Only ${Math.round(mixedPct * 100)}% mixed doubles - expected higher for MIXED mode`,
      });
    }
  }

  const lowBalanceMatches = allMatchDetails.filter(m => m.balanceRating < 50);
  if (lowBalanceMatches.length > allMatchDetails.length * 0.3) {
    diagnosticWarnings.push({
      type: "POOR_BALANCE",
      severity: "HIGH",
      message: `${lowBalanceMatches.length} of ${allMatchDetails.length} matches (${Math.round(lowBalanceMatches.length / allMatchDetails.length * 100)}%) have poor balance (< 50)`,
      matchIndices: lowBalanceMatches.map(m => m.matchIndex),
    });
  }

  const avgFairness = allFairnessScores.length > 0
    ? allFairnessScores.reduce((s, v) => s + v, 0) / allFairnessScores.length : 0;
  const matchCountSpread = maxCount - minCount;
  const fairnessComponent = Math.max(0, 100 - matchCountSpread * 10);
  const balanceComponent = avgFairness;
  const diversityPartner = partnerHeatmap.length > 0
    ? Math.min(100, Math.round((partnerHeatmap.filter(p => p.count <= 2).length / partnerHeatmap.length) * 100)) : 100;
  const diversityOpponent = opponentHeatmap.length > 0
    ? Math.min(100, Math.round((opponentHeatmap.filter(p => p.count <= 2).length / opponentHeatmap.length) * 100)) : 100;

  let genderComponent = 100;
  if (config.genderType === "MIXED" && totalGender > 0) {
    const mixedRatio = genderDistribution.mixed / totalGender;
    genderComponent = Math.min(100, Math.round(mixedRatio * 200));
  }

  const sessionHealthScore = Math.round(
    (fairnessComponent * 0.25) +
    (balanceComponent * 0.25) +
    (diversityPartner * 0.15) +
    (diversityOpponent * 0.15) +
    (genderComponent * 0.1) +
    (Math.min(100, challengeDistribution.balanced / Math.max(1, allMatchDetails.length) * 100) * 0.1)
  );

  let aiMetrics;
  if (config.useAIBrain) {
    const metrics = computeSessionMetrics(matchHistory, players);
    aiMetrics = {
      fairnessScore: metrics.fairnessScore,
      genderBalanceScore: metrics.genderBalanceScore,
      matchQualityAverage: metrics.matchQualityAverage,
      partnerDiversity: metrics.partnerDiversity,
      opponentDiversity: metrics.opponentDiversity,
      warnings: metrics.warnings.map(w => ({ type: w.type, message: w.message, severity: w.severity })),
    };
  }

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    config,
    sessionHealthScore: Math.min(100, Math.max(0, sessionHealthScore)),
    totalMatchesGenerated: allMatchDetails.length,
    totalRounds,
    matchesPerPlayer,
    fairnessScores: allFairnessScores,
    challengeDistribution,
    partnerHeatmap: partnerHeatmap.slice(0, 100),
    opponentHeatmap: opponentHeatmap.slice(0, 100),
    fatigueTimeline,
    rankingBalance: rankingBalanceLog,
    genderDistribution,
    matchDetails: allMatchDetails,
    diagnosticWarnings,
    aiMetrics,
  };
}
