import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp,
  Activity, Target, Zap, Info, Filter, BarChart3,
  X, Shield, ChevronRight, ChevronLeft, ArrowUpDown, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type MatchPlayer = {
  id: number;
  user: { fullName: string };
  category: string | null;
};

type MatchData = {
  id: number;
  status: "QUEUED" | "LIVE" | "COMPLETED";
  teamAPlayer1: MatchPlayer;
  teamAPlayer2: MatchPlayer | null;
  teamBPlayer1: MatchPlayer;
  teamBPlayer2: MatchPlayer | null;
  scoreA: number | null;
  scoreB: number | null;
  courtNumber?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

type PlayerInfo = {
  id: number;
  fullName: string;
  category: string | null;
  isPaused?: boolean;
};

type CrowdControlPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionMatchCounts: Record<number, number>;
  players: PlayerInfo[];
  liveCount: number;
  queuedCount: number;
  completedCount: number;
  matches?: MatchData[];
};

const PGS = {
  bg: "#0B1220",
  card: "#111827",
  cardBorder: "rgba(255,255,255,0.06)",
  heading: "#FFFFFF",
  secondary: "#D1D5DB",
  muted: "#6B7280",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#A855F7",
  cyan: "#06B6D4",
  dimBg: "#0F172A",
};

function normalizeGrade(category: string | null): number {
  if (!category) return 0;
  const letter = category.charAt(0).toUpperCase();
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  return map[letter] || 0;
}

function gradeLabel(val: number): string {
  if (val >= 3.5) return "A";
  if (val >= 2.5) return "B";
  if (val >= 1.5) return "C";
  if (val >= 0.5) return "D";
  return "?";
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
}

type PerMatchDetail = {
  matchId: number;
  opponentNames: string;
  partnerName: string | null;
  playerGrade: number;
  playerCategory: string;
  avgOpponentGrade: number;
  opponentCategories: string[];
  partnerGrade: number;
  partnerCategory: string | null;
  gradeDiff: number;
  rawDifficulty: number;
  adjustedDifficulty: number;
  won: boolean;
  scoreFor: number;
  scoreAgainst: number;
  margin: number;
  court: number | null;
  timestamp: string | null;
  pressureFactor: boolean;
  strengthFactor: boolean;
  supportAdjustment: boolean;
};

type PGSPlayerStats = {
  id: number;
  name: string;
  shortName: string;
  grade: string | null;
  gradeNum: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  challengeIndex: number;
  challengeCategory: string;
  challengeColor: string;
  avgOpponentGrade: number;
  pressureWinRate: number;
  fairnessContribution: number;
  performanceScore: number;
  matchDetails: PerMatchDetail[];
  courtBreakdown: Record<number, number>;
  difficultyTrend: { match: number; difficulty: number }[];
  isPaused: boolean;
  hasGradeData: boolean;
};

function computePGSEngine(players: PlayerInfo[], matches: MatchData[], sessionMatchCounts: Record<number, number>) {
  const completed = matches.filter(m => m.status === "COMPLETED" || m.status === "LIVE");
  const hasData = completed.length > 0 && players.length > 0;
  const hasGrades = players.some(p => normalizeGrade(p.category) > 0);

  if (!hasData) {
    return {
      hasData: false, hasGrades: false, fairnessIndex: 0, avgChallenge: 0,
      underChallenged: 0, overChallenged: 0, balanced: 0, challenged: 0,
      playerStats: [] as PGSPlayerStats[], gradeDistribution: [],
      matchCountVariance: 0, challengeVariance: 0,
    };
  }

  const basicWinRates: Record<number, { wins: number; total: number }> = {};
  for (const m of completed) {
    if (m.status !== "COMPLETED") continue;
    const allP = [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[];
    const teamAWon = (m.scoreA ?? 0) > (m.scoreB ?? 0);
    for (const p of allP) {
      if (!basicWinRates[p.id]) basicWinRates[p.id] = { wins: 0, total: 0 };
      basicWinRates[p.id].total++;
      const onA = p.id === m.teamAPlayer1?.id || p.id === m.teamAPlayer2?.id;
      if ((onA && teamAWon) || (!onA && !teamAWon && (m.scoreA ?? 0) !== (m.scoreB ?? 0))) {
        basicWinRates[p.id].wins++;
      }
    }
  }
  const allWinRates = Object.values(basicWinRates).filter(w => w.total > 0).map(w => w.wins / w.total);
  const sessionAvgWinRate = allWinRates.length > 0 ? allWinRates.reduce((a, b) => a + b, 0) / allWinRates.length : 0.5;

  const playerStats: PGSPlayerStats[] = players.map(player => {
    const pGrade = normalizeGrade(player.category);
    const matchDetails: PerMatchDetail[] = [];
    let wins = 0;
    let pressureGames = 0;
    let pressureWins = 0;
    const courtCounts: Record<number, number> = {};

    for (const m of completed) {
      const allP = [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[];
      if (!allP.some(p => p.id === player.id)) continue;

      const onTeamA = m.teamAPlayer1?.id === player.id || m.teamAPlayer2?.id === player.id;
      const teammates = onTeamA
        ? [m.teamAPlayer1, m.teamAPlayer2].filter(Boolean) as MatchPlayer[]
        : [m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[];
      const opponents = onTeamA
        ? [m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[]
        : [m.teamAPlayer1, m.teamAPlayer2].filter(Boolean) as MatchPlayer[];

      const partner = teammates.find(t => t.id !== player.id);
      const partnerGrade = partner ? normalizeGrade(partner.category) : 0;
      const oppGrades = opponents.map(o => normalizeGrade(o.category)).filter(g => g > 0);
      const avgOppGrade = oppGrades.length > 0 ? oppGrades.reduce((a, b) => a + b, 0) / oppGrades.length : 0;

      const scoreFor = onTeamA ? (m.scoreA ?? 0) : (m.scoreB ?? 0);
      const scoreAgainst = onTeamA ? (m.scoreB ?? 0) : (m.scoreA ?? 0);
      const won = scoreFor > scoreAgainst;
      const margin = Math.abs(scoreFor - scoreAgainst);

      if (won && m.status === "COMPLETED") wins++;

      const gradeDiff = pGrade > 0 && avgOppGrade > 0 ? avgOppGrade - pGrade : 0;
      let rawDifficulty = pGrade > 0 && avgOppGrade > 0 ? clamp(50 + gradeDiff * 15, 0, 100) : 50;

      let pressureFactor = false;
      let strengthFactor = false;
      let supportAdjustment = false;
      let adjusted = rawDifficulty;

      if (margin <= 3 && m.status === "COMPLETED") {
        adjusted *= 1.1;
        pressureFactor = true;
        pressureGames++;
        if (won) pressureWins++;
      }

      const oppWinRates = opponents.map(o => {
        const wr = basicWinRates[o.id];
        return wr && wr.total > 0 ? wr.wins / wr.total : 0.5;
      });
      const avgOppWinRate = oppWinRates.length > 0 ? oppWinRates.reduce((a, b) => a + b, 0) / oppWinRates.length : 0.5;
      if (avgOppWinRate > sessionAvgWinRate) {
        adjusted *= 1.05;
        strengthFactor = true;
      }

      if (partnerGrade > pGrade && pGrade > 0) {
        adjusted *= 0.95;
        supportAdjustment = true;
      }

      adjusted = clamp(adjusted, 0, 100);

      if (m.courtNumber) courtCounts[m.courtNumber] = (courtCounts[m.courtNumber] || 0) + 1;

      matchDetails.push({
        matchId: m.id,
        opponentNames: opponents.map(o => o.user?.fullName || "Unknown").join(" & "),
        partnerName: partner?.user?.fullName || null,
        playerGrade: pGrade,
        playerCategory: player.category || "?",
        avgOpponentGrade: avgOppGrade,
        opponentCategories: opponents.map(o => o.category || "?"),
        partnerGrade,
        partnerCategory: partner?.category || null,
        gradeDiff,
        rawDifficulty,
        adjustedDifficulty: adjusted,
        won,
        scoreFor,
        scoreAgainst,
        margin,
        court: (m as any).courtNumber ?? null,
        timestamp: (m as any).startedAt ?? (m as any).completedAt ?? null,
        pressureFactor,
        strengthFactor,
        supportAdjustment,
      });
    }

    const totalMatches = matchDetails.length;
    const diffScores = matchDetails.map(d => d.adjustedDifficulty);
    const oppGradeValues = matchDetails.map(d => d.avgOpponentGrade).filter(g => g > 0);
    const oppConsistencyFactor = oppGradeValues.length > 1 ? clamp(1 - variance(oppGradeValues), 0, 1) : 1;

    const weightedAvg = diffScores.length > 0
      ? diffScores.reduce((a, b) => a + b, 0) / diffScores.length
      : 0;
    const challengeIndex = diffScores.length > 0 ? clamp(weightedAvg * oppConsistencyFactor, 0, 100) : 0;

    let challengeCategory = "No Data";
    let challengeColor = PGS.muted;
    const hasGradeData = pGrade > 0 && oppGradeValues.length > 0;

    if (hasGradeData) {
      if (challengeIndex <= 40) { challengeCategory = "Under-Challenged"; challengeColor = PGS.amber; }
      else if (challengeIndex <= 60) { challengeCategory = "Balanced"; challengeColor = PGS.green; }
      else if (challengeIndex <= 75) { challengeCategory = "Challenged"; challengeColor = PGS.blue; }
      else { challengeCategory = "Over-Challenged"; challengeColor = PGS.red; }
    } else if (totalMatches > 0) {
      challengeCategory = "Grade Needed";
      challengeColor = PGS.muted;
    }

    const winRate = totalMatches > 0 ? wins / totalMatches : 0;
    const avgOpponentGrade = oppGradeValues.length > 0 ? oppGradeValues.reduce((a, b) => a + b, 0) / oppGradeValues.length : 0;
    const pressureWinRate = pressureGames > 0 ? pressureWins / pressureGames : 0;

    const difficultyTrend = matchDetails.map((d, i) => ({
      match: i + 1,
      difficulty: Math.round(d.adjustedDifficulty),
    }));

    return {
      id: player.id,
      name: player.fullName,
      shortName: player.fullName.length > 16
        ? player.fullName.split(" ").map((n, i) => i === 0 ? n : n[0] + ".").join(" ")
        : player.fullName,
      grade: player.category,
      gradeNum: pGrade,
      totalMatches,
      wins,
      losses: totalMatches - wins,
      winRate,
      challengeIndex,
      challengeCategory,
      challengeColor,
      avgOpponentGrade,
      pressureWinRate,
      fairnessContribution: 0,
      performanceScore: clamp((winRate * 60) + (challengeIndex * 0.4), 0, 100),
      matchDetails,
      courtBreakdown: courtCounts,
      difficultyTrend,
      isPaused: player.isPaused || false,
      hasGradeData,
    };
  });

  const activePlayers = playerStats.filter(p => !p.isPaused);
  const matchCounts = activePlayers.map(p => p.totalMatches);
  const mcMean = matchCounts.length > 0 ? matchCounts.reduce((a, b) => a + b, 0) / matchCounts.length : 0;
  const mcStdDev = matchCounts.length > 1 ? Math.sqrt(variance(matchCounts)) : 0;
  const mcCV = mcMean > 0 ? mcStdDev / mcMean : 0;

  const challengeValues = activePlayers.filter(p => p.hasGradeData).map(p => p.challengeIndex);
  const challengeVar = challengeValues.length > 1 ? variance(challengeValues) / 100 : 0;

  const gradeNums = activePlayers.map(p => p.gradeNum).filter(g => g > 0);
  const gradeImbalance = gradeNums.length > 1 ? variance(gradeNums) / 4 : 0;

  const fairnessIndex = clamp(
    100 - ((mcCV * 100 * 0.4) + (challengeVar * 0.3 * 100) + (gradeImbalance * 0.3 * 100)),
    0, 100
  );

  const totalFairness = activePlayers.reduce((s, p) => s + Math.abs(p.challengeIndex - 50), 0) || 1;
  for (const p of playerStats) {
    p.fairnessContribution = clamp(100 - (Math.abs(p.challengeIndex - 50) / totalFairness) * 100, 0, 100);
  }

  const withGrade = playerStats.filter(p => p.hasGradeData);
  const underChallenged = withGrade.filter(p => p.challengeIndex <= 40).length;
  const overChallenged = withGrade.filter(p => p.challengeIndex > 75).length;
  const balanced = withGrade.filter(p => p.challengeIndex > 40 && p.challengeIndex <= 60).length;
  const challenged = withGrade.filter(p => p.challengeIndex > 60 && p.challengeIndex <= 75).length;

  const avgChallenge = challengeValues.length > 0
    ? challengeValues.reduce((a, b) => a + b, 0) / challengeValues.length : 0;

  const gradeGroups: Record<string, number> = {};
  for (const p of players) {
    gradeGroups[p.category || "Ungraded"] = (gradeGroups[p.category || "Ungraded"] || 0) + 1;
  }
  const gradeDistribution = Object.entries(gradeGroups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    hasData: true,
    hasGrades,
    fairnessIndex,
    avgChallenge,
    underChallenged,
    overChallenged,
    balanced,
    challenged,
    playerStats,
    gradeDistribution,
    matchCountVariance: mcCV * 100,
    challengeVariance: challengeVar * 100,
  };
}

function PGSRadialGauge({ value, size = 160, label, sublabel, color }: {
  value: number; size?: number; label: string; sublabel?: string; color?: string;
}) {
  const radius = (size - 24) / 2;
  const circumference = Math.PI * radius;
  const progress = (clamp(value, 0, 100) / 100) * circumference;
  const gaugeColor = color || (value >= 70 ? PGS.green : value >= 45 ? PGS.amber : PGS.red);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        <defs>
          <filter id={`glow-${label.replace(/\s/g, "")}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M 12 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2 + 8}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"
        />
        <path
          d={`M 12 ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2 + 8}`}
          fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke 0.4s" }}
          filter={`url(#glow-${label.replace(/\s/g, "")})`}
        />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fill={gaugeColor}
          fontSize={size * 0.2} fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif"
          style={{ transition: "fill 0.4s" }}>
          {Math.round(value)}%
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fill={PGS.secondary}
          fontSize="11" fontWeight="600">
          {label}
        </text>
      </svg>
      {sublabel && <span className="text-[10px] font-medium mt-0.5" style={{ color: PGS.muted }}>{sublabel}</span>}
    </div>
  );
}

function MiniRadialGauge({ value, size = 64, color }: { value: number; size?: number; color: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - clamp(value, 0, 100)) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={progress}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.24} fontWeight="800"
        fontFamily="system-ui" transform={`rotate(90, ${size / 2}, ${size / 2})`}>
        {Math.round(value)}
      </text>
    </svg>
  );
}

function PGSInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-[560px] max-h-[88vh] overflow-y-auto p-0 border-0" style={{ background: PGS.bg, borderRadius: 20 }} data-testid="pgs-info-modal">
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PGS.green}30, ${PGS.blue}30)` }}>
              <Shield className="w-5 h-5" style={{ color: PGS.green }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: PGS.heading }}>What is the PGS Competitive Balance Engine™?</h2>
              <p className="text-xs" style={{ color: PGS.muted }}>Badminton Performance Group · Proprietary Model</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-2" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">⚖️</span>
              <h3 className="text-sm font-bold" style={{ color: PGS.heading }}>Why Fairness Matters</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: PGS.secondary }}>
              Balanced matches help everyone improve. The Engine ensures you face opponents that challenge you fairly — not too easy, not too hard.
            </p>
            <div className="flex items-center gap-1 mt-2 h-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full flex items-center justify-center text-[9px] font-bold text-white rounded-l-full" style={{ width: "30%", background: PGS.amber }}>Under</div>
              <div className="h-full flex items-center justify-center text-[9px] font-bold text-white flex-1 pgs-balanced-pulse" style={{ background: PGS.green }}>Balanced</div>
              <div className="h-full flex items-center justify-center text-[9px] font-bold text-white rounded-r-full" style={{ width: "30%", background: PGS.red }}>Over</div>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-2" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎯</span>
              <h3 className="text-sm font-bold" style={{ color: PGS.heading }}>How Challenge Is Calculated</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: PGS.secondary }}>
              Each match is scored based on your skill vs your opponent, pressure factor (close games), and partner support level. Higher challenge = more growth opportunity.
            </p>
            <div className="flex items-end gap-1 h-12 mt-2">
              {[35, 48, 52, 61, 58, 72, 65, 70].map((v, i) => (
                <div key={i} className="flex-1 rounded-t" style={{
                  height: `${v}%`, background: v <= 40 ? PGS.amber : v <= 60 ? PGS.green : v <= 75 ? PGS.blue : PGS.red,
                  opacity: 0.8, animation: `pgs-bar-grow 0.6s ${i * 0.08}s ease-out both`,
                }} />
              ))}
            </div>
            <p className="text-[9px] text-center" style={{ color: PGS.muted }}>Match difficulty over session →</p>
          </div>

          <div className="rounded-2xl p-4 space-y-2" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">📊</span>
              <h3 className="text-sm font-bold" style={{ color: PGS.heading }}>How Session Fairness Is Measured</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: PGS.secondary }}>
              The Engine measures fairness across the entire session: match count distribution (40%), challenge difficulty spread (30%), and grade balance integrity (30%).
            </p>
            <div className="flex items-center justify-center mt-2">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                <circle cx="50" cy="50" r="35" fill="none" stroke={PGS.green} strokeWidth="12"
                  strokeDasharray="88 220" strokeDashoffset="-55" strokeLinecap="round"
                  style={{ animation: "pgs-donut-spin 1s ease-out forwards" }} />
                <circle cx="50" cy="50" r="35" fill="none" stroke={PGS.amber} strokeWidth="12"
                  strokeDasharray="66 220" strokeDashoffset="-143" strokeLinecap="round" />
                <circle cx="50" cy="50" r="35" fill="none" stroke={PGS.blue} strokeWidth="12"
                  strokeDasharray="66 220" strokeDashoffset="-209" strokeLinecap="round" />
                <text x="50" y="48" textAnchor="middle" fill={PGS.heading} fontSize="14" fontWeight="800">PGS</text>
                <text x="50" y="60" textAnchor="middle" fill={PGS.muted} fontSize="8">Fairness</text>
              </svg>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-2" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🚀</span>
              <h3 className="text-sm font-bold" style={{ color: PGS.heading }}>What This Means for You</h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: PGS.secondary }}>
              See where you're under, over, or properly challenged. Track progress, focus improvement, and enjoy fair competition every session.
            </p>
          </div>

          <div className="rounded-2xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${PGS.green}15, ${PGS.blue}15)`, border: `1px solid ${PGS.green}20` }}>
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: PGS.secondary }}>
              This is your unique competitive advantage at the club. Track progress, stay challenged, and grow smarter every session!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlayerSidePanel({ player, onClose }: { player: PGSPlayerStats | null; onClose: () => void }) {
  const [showMatchTable, setShowMatchTable] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

  useEffect(() => {
    setShowMatchTable(false);
    setExpandedMatchId(null);
  }, [player?.id]);

  if (!player) return null;

  const courtData = Object.entries(player.courtBreakdown).map(([court, count]) => ({
    name: `Court ${court}`, value: count,
  }));

  const DONUT_COLORS = [PGS.green, PGS.blue, PGS.purple, PGS.cyan, PGS.amber];

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      data-testid="player-side-panel-overlay"
    >
      <div
        className="w-[95vw] max-w-[520px] h-full overflow-y-auto"
        style={{ background: PGS.bg, animation: "pgs-slide-in 0.3s cubic-bezier(0.4,0,0.2,1)" }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        data-testid="player-side-panel"
      >
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b" style={{ background: PGS.bg, borderColor: PGS.cardBorder }}>
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/5 cursor-pointer"
            data-testid="close-side-panel"
          >
            <ChevronLeft className="w-5 h-5" style={{ color: PGS.secondary }} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: PGS.heading }} data-testid="panel-player-name">{player.name}</h3>
            <div className="flex items-center gap-2">
              {player.grade && <Badge className="text-[9px] px-1.5 h-4 border-0" style={{ background: `${player.challengeColor}20`, color: player.challengeColor }}>{player.grade}</Badge>}
              <span className="text-[10px]" style={{ color: PGS.muted }}>Player Intelligence</span>
            </div>
          </div>
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
            data-testid="close-side-panel-x"
          >
            <X className="w-5 h-5" style={{ color: PGS.secondary }} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-3 text-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-2xl font-extrabold" style={{ color: PGS.heading }}>{player.totalMatches}</p>
              <p className="text-[9px] font-medium" style={{ color: PGS.muted }}>Matches</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-2xl font-extrabold" style={{ color: player.winRate >= 0.5 ? PGS.green : PGS.red }}>
                {player.wins}/{player.losses}
              </p>
              <p className="text-[9px] font-medium" style={{ color: PGS.muted }}>W/L Ratio</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-2xl font-extrabold" style={{ color: PGS.heading }}>
                {(player.winRate * 100).toFixed(0)}%
              </p>
              <p className="text-[9px] font-medium" style={{ color: PGS.muted }}>Win Rate</p>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PGS.secondary }}>PGS Challenge Index</span>
              <Badge className="text-[9px] h-4 px-2 border-0" style={{ background: `${player.challengeColor}20`, color: player.challengeColor }}>
                {player.challengeCategory}
              </Badge>
            </div>
            <div className="flex items-center justify-center">
              <MiniRadialGauge value={player.challengeIndex} size={100} color={player.challengeColor} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PGS.muted }}>Pressure Win %</p>
              <p className="text-lg font-extrabold" style={{ color: PGS.heading }}>{(player.pressureWinRate * 100).toFixed(0)}%</p>
              <p className="text-[9px]" style={{ color: PGS.muted }}>Close games (≤3 pts)</p>
            </div>
            <div className="rounded-2xl p-3" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PGS.muted }}>Avg Opp. Grade</p>
              <p className="text-lg font-extrabold" style={{ color: PGS.heading }}>
                {player.avgOpponentGrade > 0 ? gradeLabel(player.avgOpponentGrade) : "—"}
              </p>
              <p className="text-[9px]" style={{ color: PGS.muted }}>{player.avgOpponentGrade > 0 ? player.avgOpponentGrade.toFixed(1) : "No data"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PGS.muted }}>Fairness Contrib.</p>
              <p className="text-lg font-extrabold" style={{ color: PGS.green }}>{player.fairnessContribution.toFixed(0)}%</p>
            </div>
            <div className="rounded-2xl p-3" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PGS.muted }}>Performance</p>
              <p className="text-lg font-extrabold" style={{ color: PGS.heading }}>{player.performanceScore.toFixed(0)}</p>
            </div>
          </div>

          {player.difficultyTrend.length > 1 && (
            <div className="rounded-2xl p-4" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: PGS.secondary }}>Difficulty Trend</p>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={player.difficultyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="match" tick={{ fontSize: 10, fill: PGS.muted }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: PGS.muted }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, borderRadius: 12, fontSize: 11, color: PGS.heading }} />
                    <Line type="monotone" dataKey="difficulty" stroke={PGS.blue} strokeWidth={2} dot={{ fill: PGS.blue, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {courtData.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: PGS.secondary }}>Court Allocation</p>
              <div className="flex gap-2 flex-wrap">
                {courtData.map((c, i) => (
                  <div key={c.name} className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs font-medium" style={{ color: PGS.secondary }}>{c.name}</span>
                    <span className="text-xs font-bold" style={{ color: PGS.heading }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {player.matchDetails.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center gap-2 text-left min-h-[44px] cursor-pointer"
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMatchTable(!showMatchTable); if (showMatchTable) setExpandedMatchId(null); }}
                data-testid="toggle-match-table"
              >
                <BarChart3 className="h-3.5 w-3.5" style={{ color: PGS.muted }} />
                <span className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: PGS.secondary }}>
                  Per-Match Breakdown ({player.matchDetails.length})
                </span>
                {showMatchTable ? <ChevronUp className="h-3.5 w-3.5" style={{ color: PGS.muted }} /> : <ChevronDown className="h-3.5 w-3.5" style={{ color: PGS.muted }} />}
              </button>
              {showMatchTable && (
                <div className="border-t" style={{ borderColor: PGS.cardBorder }}>
                  {player.matchDetails.map((md, idx) => {
                    const isExpanded = expandedMatchId === md.matchId;
                    const diffColor = md.adjustedDifficulty <= 40 ? PGS.amber : md.adjustedDifficulty <= 60 ? PGS.green : md.adjustedDifficulty <= 75 ? PGS.blue : PGS.red;
                    const challengeLabel = md.adjustedDifficulty <= 40 ? "Under-Challenged" : md.adjustedDifficulty <= 60 ? "Balanced" : md.adjustedDifficulty <= 75 ? "Challenged" : "Over-Challenged";
                    return (
                      <div key={md.matchId} className={idx > 0 ? "border-t" : ""} style={{ borderColor: PGS.cardBorder }}>
                        <button
                          type="button"
                          className="w-full px-3 py-2.5 flex items-center gap-2 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedMatchId(isExpanded ? null : md.matchId); }}
                          data-testid={`toggle-match-${md.matchId}`}
                        >
                          <span className="text-[10px] font-mono w-4 shrink-0" style={{ color: PGS.muted }}>{idx + 1}</span>
                          <span className="text-[11px] font-bold w-8 shrink-0" style={{ color: md.won ? PGS.green : PGS.red }}>{md.won ? "W" : "L"}</span>
                          <span className="text-[10px] font-mono shrink-0" style={{ color: PGS.secondary }}>{md.scoreFor}–{md.scoreAgainst}</span>
                          <span className="text-[10px] truncate flex-1 mx-1" style={{ color: PGS.muted }}>vs {md.opponentCategories.join(" & ")}</span>
                          <span className="text-[11px] font-bold font-mono shrink-0 mr-1" style={{ color: diffColor }}>{md.adjustedDifficulty.toFixed(0)}</span>
                          {md.pressureFactor && <span className="text-[9px]">🔥</span>}
                          {md.strengthFactor && <span className="text-[9px]">💪</span>}
                          {md.supportAdjustment && <span className="text-[9px]">🤝</span>}
                          {isExpanded
                            ? <ChevronUp className="h-3 w-3 shrink-0" style={{ color: PGS.muted }} />
                            : <ChevronDown className="h-3 w-3 shrink-0" style={{ color: PGS.muted }} />
                          }
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <div className="flex items-center gap-3 justify-center py-2">
                              <div className="text-center">
                                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: PGS.muted }}>You</div>
                                <div className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: `${PGS.blue}15`, color: PGS.blue }}>{md.playerCategory}</div>
                              </div>
                              <div className="text-[11px] font-bold" style={{ color: PGS.muted }}>vs</div>
                              {md.opponentCategories.map((cat, ci) => (
                                <div key={ci} className="text-center">
                                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: PGS.muted }}>Opp {md.opponentCategories.length > 1 ? ci + 1 : ""}</div>
                                  <div className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: `${PGS.red}15`, color: PGS.red }}>{cat}</div>
                                </div>
                              ))}
                              {md.partnerCategory && (
                                <>
                                  <div className="text-[11px] font-bold" style={{ color: PGS.muted }}>+</div>
                                  <div className="text-center">
                                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: PGS.muted }}>Partner</div>
                                    <div className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: `${PGS.green}15`, color: PGS.green }}>{md.partnerCategory}</div>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${PGS.cardBorder}` }}>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px]" style={{ color: PGS.muted }}>Challenge Rating</span>
                                <span className="text-xs font-bold" style={{ color: diffColor }}>{challengeLabel}</span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${md.adjustedDifficulty}%`, background: diffColor }} />
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="flex justify-between">
                                  <span className="text-[10px]" style={{ color: PGS.muted }}>Grade Diff</span>
                                  <span className="text-[10px] font-bold font-mono" style={{ color: md.gradeDiff > 0 ? PGS.red : md.gradeDiff < 0 ? PGS.green : PGS.secondary }}>
                                    {md.playerGrade > 0 ? (md.gradeDiff > 0 ? `+${md.gradeDiff.toFixed(1)}` : md.gradeDiff.toFixed(1)) : "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px]" style={{ color: PGS.muted }}>Raw Score</span>
                                  <span className="text-[10px] font-bold font-mono" style={{ color: PGS.secondary }}>{md.rawDifficulty.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px]" style={{ color: PGS.muted }}>Adjusted</span>
                                  <span className="text-[10px] font-bold font-mono" style={{ color: diffColor }}>{md.adjustedDifficulty.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px]" style={{ color: PGS.muted }}>Result</span>
                                  <span className="text-[10px] font-bold" style={{ color: md.won ? PGS.green : PGS.red }}>{md.won ? "Won" : "Lost"} {md.scoreFor}–{md.scoreAgainst}</span>
                                </div>
                              </div>
                              {(md.pressureFactor || md.strengthFactor || md.supportAdjustment) && (
                                <div className="flex flex-wrap gap-1.5 pt-1 border-t" style={{ borderColor: PGS.cardBorder }}>
                                  {md.pressureFactor && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${PGS.red}15`, color: PGS.red }}>🔥 Close margin (×1.1)</span>
                                  )}
                                  {md.strengthFactor && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${PGS.purple}15`, color: PGS.purple }}>💪 Strong opponents (×1.05)</span>
                                  )}
                                  {md.supportAdjustment && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${PGS.green}15`, color: PGS.green }}>🤝 Stronger partner (×0.95)</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {md.court && (
                              <div className="flex justify-between text-[10px]">
                                <span style={{ color: PGS.muted }}>Court</span>
                                <span style={{ color: PGS.secondary }}>Court {md.court}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CrowdControlPanel({
  open, onOpenChange, sessionMatchCounts, players,
  liveCount, queuedCount, completedCount, matches = [],
}: CrowdControlPanelProps) {
  const [sortColumn, setSortColumn] = useState<string>("challenge");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterChallenge, setFilterChallenge] = useState("all");
  const [filterMatches, setFilterMatches] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      intervalRef.current = setInterval(() => setRefreshKey(k => k + 1), 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open]);

  const pgs = useMemo(() => {
    void refreshKey;
    return computePGSEngine(players, matches, sessionMatchCounts);
  }, [players, matches, sessionMatchCounts, refreshKey]);

  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    for (const p of players) grades.add(p.category || "Ungraded");
    return Array.from(grades).sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    let list = pgs.playerStats;
    if (filterGrade !== "all") list = list.filter(p => (p.grade || "Ungraded") === filterGrade);
    if (filterChallenge !== "all") {
      const ranges: Record<string, [number, number]> = {
        under: [0, 40], balanced: [41, 60], challenged: [61, 75], over: [76, 100],
      };
      const [min, max] = ranges[filterChallenge] || [0, 100];
      list = list.filter(p => p.challengeIndex >= min && p.challengeIndex <= max);
    }
    if (filterMatches !== "all") {
      if (filterMatches === "0") list = list.filter(p => p.totalMatches === 0);
      else if (filterMatches === "1-3") list = list.filter(p => p.totalMatches >= 1 && p.totalMatches <= 3);
      else if (filterMatches === "4+") list = list.filter(p => p.totalMatches >= 4);
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      let va = 0, vb = 0;
      switch (sortColumn) {
        case "name": return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case "matches": va = a.totalMatches; vb = b.totalMatches; break;
        case "winrate": va = a.winRate; vb = b.winRate; break;
        case "challenge": va = a.challengeIndex; vb = b.challengeIndex; break;
        case "performance": va = a.performanceScore; vb = b.performanceScore; break;
        default: va = a.challengeIndex; vb = b.challengeIndex;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return sorted;
  }, [pgs.playerStats, filterGrade, filterChallenge, filterMatches, sortColumn, sortDir]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return pgs.playerStats.find(p => p.id === selectedPlayerId) || null;
  }, [selectedPlayerId, pgs.playerStats]);

  const handleSort = useCallback((col: string) => {
    if (sortColumn === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDir("desc"); }
  }, [sortColumn]);

  const matchCountChartData = useMemo(() => {
    return filteredPlayers.map(p => ({
      name: p.shortName,
      matches: p.totalMatches,
      color: p.isPaused ? PGS.muted : p.totalMatches === 0 ? PGS.muted : PGS.blue,
    })).slice(0, 30);
  }, [filteredPlayers]);

  const challengeSpreadData = useMemo(() => {
    return filteredPlayers.filter(p => p.hasGradeData).map(p => ({
      name: p.shortName,
      challenge: Math.round(p.challengeIndex),
      color: p.challengeColor,
    })).slice(0, 30);
  }, [filteredPlayers]);

  const DONUT_COLORS = [PGS.green, PGS.blue, PGS.purple, PGS.cyan, PGS.amber, PGS.red];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-0 border-0"
          style={{ background: PGS.bg, borderRadius: 20, boxShadow: `0 24px 80px rgba(0,0,0,0.6)` }}
          data-testid="crowd-control-dialog"
        >
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg" data-testid="crowd-control-title">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PGS.green}30, ${PGS.blue}20)` }}>
                  <Activity className="w-4.5 h-4.5" style={{ color: PGS.green }} />
                </div>
                <div>
                  <span style={{ color: PGS.heading }}>PGS Competitive Balance Engine</span>
                  <span className="text-[10px] align-top" style={{ color: PGS.muted }}>™</span>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInfo(true)}
                  className="p-2.5 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  data-testid="pgs-info-button"
                  title="What is the PGS Engine?"
                >
                  <Info className="w-5 h-5" style={{ color: PGS.secondary }} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-2.5 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  data-testid="pgs-close-button"
                  title="Close"
                >
                  <X className="w-5 h-5" style={{ color: PGS.secondary }} />
                </button>
              </div>
            </div>
            <DialogDescription className="text-xs mt-1" style={{ color: PGS.muted }}>
              Badminton Performance Group · Real-time session fairness &amp; player intelligence
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 mt-3">
            {!pgs.hasData && (
              <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: `${PGS.amber}15`, border: `1px solid ${PGS.amber}30` }} data-testid="pgs-no-data-warning">
                <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: PGS.amber }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: PGS.amber }}>PGS Engine Not Receiving Session Data</p>
                  <p className="text-xs mt-0.5" style={{ color: PGS.secondary }}>No completed matches found. Start playing to activate the analysis engine.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="pgs-top-row">
              <div className="sm:col-span-1 rounded-2xl p-4 flex flex-col items-center justify-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="pgs-fairness-gauge">
                <PGSRadialGauge value={pgs.fairnessIndex} size={140} label="PGS Fairness" sublabel={`${liveCount + completedCount} matches`} />
              </div>
              <div className="rounded-2xl p-4 flex flex-col justify-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="pgs-avg-challenge">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: PGS.muted }}>Avg Challenge</p>
                <p className="text-3xl font-extrabold tabular-nums" style={{ color: pgs.avgChallenge > 60 ? PGS.blue : pgs.avgChallenge > 40 ? PGS.green : PGS.amber }}>
                  {pgs.avgChallenge.toFixed(0)}%
                </p>
                <p className="text-[10px] mt-1" style={{ color: PGS.muted }}>{players.length} players tracked</p>
              </div>
              <div className="rounded-2xl p-4 flex flex-col justify-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="pgs-under-count">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: PGS.muted }}>Under-Challenged</p>
                <p className="text-3xl font-extrabold tabular-nums" style={{ color: PGS.amber }}>{pgs.underChallenged}</p>
                <p className="text-[10px] mt-1" style={{ color: PGS.muted }}>Challenge ≤40</p>
              </div>
              <div className="rounded-2xl p-4 flex flex-col justify-center" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="pgs-over-count">
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: PGS.muted }}>Over-Challenged</p>
                <p className="text-3xl font-extrabold tabular-nums" style={{ color: PGS.red }}>{pgs.overChallenged}</p>
                <p className="text-[10px] mt-1" style={{ color: PGS.muted }}>Challenge &gt;75</p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="pgs-player-table">
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: PGS.cardBorder }}>
                <Users className="h-4 w-4" style={{ color: PGS.green }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PGS.heading }}>Player Intelligence</span>
                <span className="text-[10px] tabular-nums ml-auto mr-2" style={{ color: PGS.muted }}>{filteredPlayers.length} players</span>
              </div>
              <div className="px-4 py-2 flex flex-wrap gap-2 border-b" style={{ borderColor: PGS.cardBorder, background: "rgba(255,255,255,0.02)" }}>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="h-7 w-[100px] text-[10px] border-0" style={{ background: "rgba(255,255,255,0.05)", color: PGS.secondary }} data-testid="filter-grade">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent style={{ background: PGS.card, borderColor: PGS.cardBorder }}>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterChallenge} onValueChange={setFilterChallenge}>
                  <SelectTrigger className="h-7 w-[110px] text-[10px] border-0" style={{ background: "rgba(255,255,255,0.05)", color: PGS.secondary }} data-testid="filter-challenge">
                    <SelectValue placeholder="Challenge" />
                  </SelectTrigger>
                  <SelectContent style={{ background: PGS.card, borderColor: PGS.cardBorder }}>
                    <SelectItem value="all">All Challenge</SelectItem>
                    <SelectItem value="under">Under (0-40)</SelectItem>
                    <SelectItem value="balanced">Balanced (41-60)</SelectItem>
                    <SelectItem value="challenged">Challenged (61-75)</SelectItem>
                    <SelectItem value="over">Over (76-100)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMatches} onValueChange={setFilterMatches}>
                  <SelectTrigger className="h-7 w-[100px] text-[10px] border-0" style={{ background: "rgba(255,255,255,0.05)", color: PGS.secondary }} data-testid="filter-matches">
                    <SelectValue placeholder="Matches" />
                  </SelectTrigger>
                  <SelectContent style={{ background: PGS.card, borderColor: PGS.cardBorder }}>
                    <SelectItem value="all">All Matches</SelectItem>
                    <SelectItem value="0">0 matches</SelectItem>
                    <SelectItem value="1-3">1-3 matches</SelectItem>
                    <SelectItem value="4+">4+ matches</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                      {[
                        { key: "name", label: "Player", align: "text-left" },
                        { key: "matches", label: "M", align: "text-center" },
                        { key: "winrate", label: "Win%", align: "text-center" },
                        { key: "challenge", label: "Challenge", align: "text-center" },
                        { key: "performance", label: "Perf", align: "text-center" },
                      ].map(col => (
                        <th key={col.key}
                          className={cn("px-3 py-2.5 font-bold cursor-pointer select-none min-h-[44px]", col.align)}
                          style={{ color: sortColumn === col.key ? PGS.green : PGS.muted }}
                          onClick={() => handleSort(col.key)}
                          data-testid={`sort-${col.key}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortColumn === col.key && <ArrowUpDown className="w-2.5 h-2.5" />}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-center font-bold" style={{ color: PGS.muted }}>Status</th>
                      <th className="px-1 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(p => (
                      <tr
                        key={p.id}
                        className="border-t cursor-pointer transition-colors"
                        style={{ borderColor: PGS.cardBorder }}
                        onClick={() => setSelectedPlayerId(p.id)}
                        data-testid={`player-row-${p.id}`}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className="font-medium truncate max-w-[120px]" style={{ color: PGS.heading }}>{p.shortName}</span>
                            {p.grade && <Badge className="text-[8px] px-1 h-4 border-0 shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: PGS.muted }}>{p.grade}</Badge>}
                            {p.isPaused && <Badge className="text-[8px] px-1 h-4 border-0 shrink-0" style={{ background: `${PGS.amber}20`, color: PGS.amber }}>P</Badge>}
                          </div>
                        </td>
                        <td className="text-center px-3 py-2.5 tabular-nums font-bold" style={{ color: p.totalMatches === 0 ? PGS.muted : PGS.heading }}>{p.totalMatches}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums font-bold" style={{ color: p.totalMatches === 0 ? PGS.muted : p.winRate >= 0.6 ? PGS.green : p.winRate >= 0.4 ? PGS.secondary : PGS.red }}>
                          {p.totalMatches > 0 ? `${(p.winRate * 100).toFixed(0)}%` : "—"}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{
                                width: `${p.challengeIndex}%`,
                                background: p.hasGradeData ? p.challengeColor : PGS.muted,
                              }} />
                            </div>
                            <span className="tabular-nums font-bold text-[10px] min-w-[28px]" style={{ color: p.hasGradeData ? p.challengeColor : PGS.muted }}>
                              {p.hasGradeData ? p.challengeIndex.toFixed(0) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-2.5 tabular-nums font-bold" style={{ color: p.totalMatches > 0 ? PGS.heading : PGS.muted }}>
                          {p.totalMatches > 0 ? p.performanceScore.toFixed(0) : "—"}
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <Badge className="text-[8px] px-1.5 h-4 border-0" style={{ background: `${p.challengeColor}20`, color: p.challengeColor }}>
                            {p.hasGradeData ? p.challengeCategory : p.totalMatches > 0 ? "No Grade" : "—"}
                          </Badge>
                        </td>
                        <td className="px-1 py-2.5">
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: PGS.muted }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(() => {
              const promotionCandidates = pgs.playerStats.filter(p => p.totalMatches >= 3 && p.winRate >= 0.65 && p.performanceScore >= 55 && p.hasGradeData);
              const struggling = pgs.playerStats.filter(p => p.totalMatches >= 3 && p.winRate < 0.3 && p.hasGradeData);
              const underChallengedPlayers = pgs.playerStats.filter(p => p.totalMatches >= 2 && p.challengeIndex <= 40 && p.hasGradeData);
              const hasFlags = promotionCandidates.length > 0 || struggling.length > 0 || underChallengedPlayers.length > 0;
              if (!hasFlags) return null;
              return (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} data-testid="promotion-watch">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: PGS.green }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PGS.heading }}>Promotion Watch</span>
                  </div>
                  {promotionCandidates.length > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: `${PGS.green}08`, border: `1px solid ${PGS.green}20` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PGS.green }}>
                        Ready for Promotion ({promotionCandidates.length})
                      </p>
                      <p className="text-[9px]" style={{ color: PGS.muted }}>High win rate + strong performance — consider moving up a grade</p>
                      <div className="space-y-1.5">
                        {promotionCandidates.map(p => (
                          <div key={p.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition-colors" onClick={() => setSelectedPlayerId(p.id)} data-testid={`promo-player-${p.id}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: PGS.green }} />
                            <span className="text-[11px] font-medium flex-1 truncate" style={{ color: PGS.heading }}>{p.shortName}</span>
                            <Badge className="text-[8px] px-1 h-4 border-0 shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: PGS.muted }}>{p.grade}</Badge>
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: PGS.green }}>{(p.winRate * 100).toFixed(0)}% W</span>
                            <span className="text-[10px] tabular-nums" style={{ color: PGS.muted }}>{p.totalMatches}M</span>
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: PGS.heading }}>Perf {p.performanceScore.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {struggling.length > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: `${PGS.red}08`, border: `1px solid ${PGS.red}20` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PGS.red }}>
                        Struggling ({struggling.length})
                      </p>
                      <p className="text-[9px]" style={{ color: PGS.muted }}>Low win rate — may need grade reassessment or easier opponents</p>
                      <div className="space-y-1.5">
                        {struggling.map(p => (
                          <div key={p.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition-colors" onClick={() => setSelectedPlayerId(p.id)} data-testid={`struggling-player-${p.id}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: PGS.red }} />
                            <span className="text-[11px] font-medium flex-1 truncate" style={{ color: PGS.heading }}>{p.shortName}</span>
                            <Badge className="text-[8px] px-1 h-4 border-0 shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: PGS.muted }}>{p.grade}</Badge>
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: PGS.red }}>{(p.winRate * 100).toFixed(0)}% W</span>
                            <span className="text-[10px] tabular-nums" style={{ color: PGS.muted }}>{p.totalMatches}M</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {underChallengedPlayers.length > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: `${PGS.amber}08`, border: `1px solid ${PGS.amber}20` }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PGS.amber }}>
                        Under-Challenged ({underChallengedPlayers.length})
                      </p>
                      <p className="text-[9px]" style={{ color: PGS.muted }}>Challenge index below 40 — need tougher opponents to grow</p>
                      <div className="space-y-1.5">
                        {underChallengedPlayers.map(p => (
                          <div key={p.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition-colors" onClick={() => setSelectedPlayerId(p.id)} data-testid={`under-player-${p.id}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: PGS.amber }} />
                            <span className="text-[11px] font-medium flex-1 truncate" style={{ color: PGS.heading }}>{p.shortName}</span>
                            <Badge className="text-[8px] px-1 h-4 border-0 shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: PGS.muted }}>{p.grade}</Badge>
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: PGS.amber }}>CI {p.challengeIndex.toFixed(0)}</span>
                            <span className="text-[10px] tabular-nums" style={{ color: PGS.muted }}>{p.totalMatches}M</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="rounded-2xl overflow-hidden" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center gap-2 text-left min-h-[44px]"
                onClick={() => setShowDistribution(!showDistribution)}
                data-testid="toggle-distribution"
              >
                <Target className="h-4 w-4" style={{ color: PGS.cyan }} />
                <span className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: PGS.heading }}>Analytics &amp; Distribution</span>
                {showDistribution ? <ChevronUp className="h-4 w-4" style={{ color: PGS.muted }} /> : <ChevronDown className="h-4 w-4" style={{ color: PGS.muted }} />}
              </button>
              {showDistribution && (
                <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: PGS.cardBorder }}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    {pgs.gradeDistribution.length > 0 && (
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PGS.cardBorder}` }}>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: PGS.secondary }}>Grade Distribution</p>
                        <div className="h-[160px] sm:h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pgs.gradeDistribution} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%"
                                paddingAngle={3} dataKey="value" animationDuration={400}>
                                {pgs.gradeDistribution.map((_, i) => (
                                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} fillOpacity={0.85} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, borderRadius: 12, fontSize: 11, color: PGS.heading }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {pgs.gradeDistribution.map((g, i) => (
                            <div key={g.name} className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                              <span className="text-[9px]" style={{ color: PGS.muted }}>{g.name} ({g.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PGS.cardBorder}` }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: PGS.secondary }}>Match Count Variance</p>
                      <div className="h-[160px] sm:h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={matchCountChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: PGS.muted }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={50} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: PGS.muted }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, borderRadius: 12, fontSize: 11, color: PGS.heading }} />
                            <Bar dataKey="matches" radius={[4, 4, 0, 0]} animationDuration={300}>
                              {matchCountChartData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.8} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {challengeSpreadData.length > 0 && (
                      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${PGS.cardBorder}` }}>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: PGS.secondary }}>Challenge Spread</p>
                        <div className="h-[160px] sm:h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={challengeSpreadData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 8, fill: PGS.muted }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={50} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: PGS.muted }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}`, borderRadius: 12, fontSize: 11, color: PGS.heading }} />
                              <Bar dataKey="challenge" radius={[4, 4, 0, 0]} animationDuration={300}>
                                {challengeSpreadData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.8} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: PGS.card, border: `1px solid ${PGS.cardBorder}` }}>
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center gap-2 text-left min-h-[44px]"
                onClick={() => setShowBreakdown(!showBreakdown)}
                data-testid="toggle-fairness-breakdown"
              >
                <HelpCircle className="h-3.5 w-3.5" style={{ color: PGS.muted }} />
                <span className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: PGS.secondary }}>PGS Fairness Breakdown</span>
                {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" style={{ color: PGS.muted }} /> : <ChevronDown className="h-3.5 w-3.5" style={{ color: PGS.muted }} />}
              </button>
              {showBreakdown && (
                <div className="px-4 pb-4 space-y-2.5 border-t pt-3" style={{ borderColor: PGS.cardBorder }}>
                  <p className="text-xs leading-relaxed" style={{ color: PGS.secondary }}>
                    The PGS Fairness Index combines three weighted components to measure session balance:
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: PGS.muted }}>Match Count CV (40% weight)</span>
                      <span className="font-bold tabular-nums" style={{ color: PGS.heading }}>{pgs.matchCountVariance.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: PGS.muted }}>Challenge Variance (30% weight)</span>
                      <span className="font-bold tabular-nums" style={{ color: PGS.heading }}>{pgs.challengeVariance.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: PGS.muted }}>Balanced / Challenged / Under / Over</span>
                      <span className="font-bold tabular-nums" style={{ color: PGS.heading }}>{pgs.balanced} / {pgs.challenged} / {pgs.underChallenged} / {pgs.overChallenged}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t" style={{ borderColor: PGS.cardBorder }}>
                      <span className="font-medium" style={{ color: PGS.secondary }}>PGS Fairness Index</span>
                      <span className="font-extrabold tabular-nums" style={{ color: pgs.fairnessIndex >= 70 ? PGS.green : pgs.fairnessIndex >= 45 ? PGS.amber : PGS.red }}>
                        {pgs.fairnessIndex.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: PGS.muted }}>
                    Formula: 100 − [(CV×100×0.4) + (ChallengeVar×0.3) + (GradeImbalance×0.3)]. Higher = fairer session.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: PGS.green }} />
              <p className="text-[10px]" style={{ color: PGS.muted }}>PGS Engine auto-refreshing every 5 seconds</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlayer && createPortal(
        <PlayerSidePanel player={selectedPlayer} onClose={() => setSelectedPlayerId(null)} />,
        document.body
      )}

      <PGSInfoModal open={showInfo} onClose={() => setShowInfo(false)} />

      <style>{`
        @keyframes pgs-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pgs-bar-grow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes pgs-donut-spin {
          from { stroke-dashoffset: 220; }
        }
        .pgs-balanced-pulse {
          animation: pgs-pulse 2s ease-in-out infinite;
        }
        @keyframes pgs-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
