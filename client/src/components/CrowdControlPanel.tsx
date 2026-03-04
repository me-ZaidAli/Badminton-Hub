import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie } from "recharts";
import {
  Users, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown, ChevronUp,
  Activity, Target, Timer, Zap, Info, ArrowUpDown, Filter, Eye, BarChart3, Gauge,
  X, Award, Shield, Flame, Star, Crosshair, ChevronRight
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

const COLORS = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  muted: "#3f3f46",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
  amber: "#f59e0b",
};

const GRADE_MAP: Record<string, number> = {
  "A1": 9, "A2": 8, "A3": 7,
  "B1": 6, "B2": 5, "B3": 4,
  "C1": 3, "C2": 2, "C3": 1,
};

function gradeToScore(grade: string | null): number {
  if (!grade) return 0;
  return GRADE_MAP[grade.toUpperCase()] || 0;
}

function FairnessGauge({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? COLORS.green : score >= 50 ? COLORS.yellow : COLORS.red;
  const label = score >= 80 ? "Balanced" : score >= 50 ? "Uneven" : "Imbalanced";

  return (
    <div className="flex flex-col items-center" data-testid="fairness-gauge">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path
          d={`M 10 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 10 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 6}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.3s" }}
          filter={`drop-shadow(0 0 6px ${color}60)`}
        />
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ transition: "fill 0.3s" }}
        >
          {Math.round(score)}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="11"
          fontWeight="600"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

function CircularProgress({ value, size = 80, strokeWidth = 6, color, label }: {
  value: number; size?: number; strokeWidth?: number; color: string; label?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - value) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={progress}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.3s" }}
          filter={`drop-shadow(0 0 4px ${color}50)`}
        />
        <text
          x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size * 0.22} fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && <span className="text-[10px] text-zinc-500 font-medium">{label}</span>}
    </div>
  );
}

function getPlayerBarColor(games: number, avg: number): string {
  if (games === 0) return COLORS.muted;
  const diff = games - avg;
  if (diff <= -2) return COLORS.red;
  if (diff < 0) return COLORS.yellow;
  if (diff <= 1) return COLORS.green;
  return COLORS.blue;
}

function getPlayerBarLabel(games: number, avg: number): string {
  if (games === 0) return "No games";
  const diff = games - avg;
  if (diff <= -2) return "2+ below avg";
  if (diff < 0) return "Below avg";
  if (diff <= 1) return "On target";
  return "Above avg";
}

type ChallengeBreakdown = { high: number; ideal: number; low: number; total: number };

function computePlayerIntel(playerId: number, matches: MatchData[]) {
  const completed = matches.filter(m => m.status === "COMPLETED");
  let totalMatches = 0;
  let wins = 0;
  const challengeBreakdown: ChallengeBreakdown = { high: 0, ideal: 0, low: 0, total: 0 };

  for (const m of completed) {
    const allPlayers = [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[];
    const isInMatch = allPlayers.some(p => p.id === playerId);
    if (!isInMatch) continue;
    totalMatches++;

    const onTeamA = m.teamAPlayer1?.id === playerId || m.teamAPlayer2?.id === playerId;
    const teamAWon = (m.scoreA ?? 0) > (m.scoreB ?? 0);
    if ((onTeamA && teamAWon) || (!onTeamA && !teamAWon && (m.scoreA ?? 0) !== (m.scoreB ?? 0))) {
      wins++;
    }

    const playerGrade = allPlayers.find(p => p.id === playerId)?.category;
    const playerScore = gradeToScore(playerGrade);
    if (playerScore === 0) continue;

    const opponents = onTeamA
      ? [m.teamBPlayer1, m.teamBPlayer2].filter(Boolean) as MatchPlayer[]
      : [m.teamAPlayer1, m.teamAPlayer2].filter(Boolean) as MatchPlayer[];

    const oppScores = opponents.map(o => gradeToScore(o.category)).filter(s => s > 0);
    if (oppScores.length === 0) continue;
    const avgOppScore = oppScores.reduce((a, b) => a + b, 0) / oppScores.length;

    const diff = avgOppScore - playerScore;
    challengeBreakdown.total++;
    if (diff >= 2) challengeBreakdown.high++;
    else if (diff <= -2) challengeBreakdown.low++;
    else challengeBreakdown.ideal++;
  }

  const hasGradeData = challengeBreakdown.total > 0;
  const rawWeighted = hasGradeData
    ? (challengeBreakdown.high * 1.2 + challengeBreakdown.ideal * 1.0 + challengeBreakdown.low * 0.6) / challengeBreakdown.total
    : 0;
  const challengePct = hasGradeData
    ? Math.min(100, Math.max(0, ((rawWeighted - 0.6) / (1.2 - 0.6)) * 100))
    : 0;

  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const balancePct = totalMatches > 0 ? Math.min(100, (1 - Math.abs(wins / totalMatches - 0.5) * 2) * 100) : 0;

  const performanceScore = hasGradeData ? (winRate * 0.6 + challengePct * 0.4) : winRate;

  let promotionStatus: "promotion" | "stable" | "struggling" | "under-challenged" = "stable";
  if (!hasGradeData) {
    if (winRate < 40 && totalMatches >= 3) promotionStatus = "struggling";
  } else {
    if (winRate >= 70 && challengePct >= 75 && totalMatches >= 4) promotionStatus = "promotion";
    else if (winRate >= 60 && challengePct < 40) promotionStatus = "under-challenged";
    else if (winRate < 40 && totalMatches >= 3) promotionStatus = "struggling";
  }

  let challengeLabel = "No Grade Data";
  let challengeColor = COLORS.muted;
  if (hasGradeData) {
    if (challengePct >= 85) { challengeLabel = "Highly Competitive"; challengeColor = COLORS.purple; }
    else if (challengePct >= 70) { challengeLabel = "Balanced"; challengeColor = COLORS.green; }
    else if (challengePct < 30) { challengeLabel = "Under-Challenged"; challengeColor = COLORS.orange; }
    else if (challengeBreakdown.high > challengeBreakdown.ideal + challengeBreakdown.low) { challengeLabel = "Over-Challenged"; challengeColor = COLORS.red; }
    else { challengeLabel = "Needs Adjustment"; challengeColor = COLORS.amber; }
  }

  return {
    totalMatches, wins, winRate, balancePct, challengeBreakdown, challengePct,
    challengeLabel, challengeColor, performanceScore, promotionStatus,
  };
}

function PlayerIntelligenceModal({ player, matches, open, onClose }: {
  player: PlayerInfo; matches: MatchData[]; open: boolean; onClose: () => void;
}) {
  const intel = useMemo(() => computePlayerIntel(player.id, matches), [player.id, matches]);

  const promotionConfig = {
    promotion: { label: "Promotion Candidate", color: COLORS.green, icon: TrendingUp, bg: "bg-emerald-500/15", text: "text-emerald-400", suggestion: "Strong candidate for grade upgrade based on consistent wins against higher opponents." },
    stable: { label: "Stable", color: COLORS.blue, icon: Minus, bg: "bg-blue-500/15", text: "text-blue-400", suggestion: "Performing at expected level. Continue monitoring for trends." },
    struggling: { label: "Struggling", color: COLORS.red, icon: TrendingDown, bg: "bg-red-500/15", text: "text-red-400", suggestion: "May need softer matchups or coaching support. Consider grade review." },
    "under-challenged": { label: "Under-Challenged Winner", color: COLORS.amber, icon: AlertTriangle, bg: "bg-amber-500/15", text: "text-amber-400", suggestion: "Winning frequently but mostly against lower-grade opponents. Needs tougher matchups." },
  };

  const pc = promotionConfig[intel.promotionStatus];
  const PromotionIcon = pc.icon;

  const barTotal = intel.challengeBreakdown.total || 1;
  const highPct = (intel.challengeBreakdown.high / barTotal) * 100;
  const idealPct = (intel.challengeBreakdown.ideal / barTotal) * 100;
  const lowPct = (intel.challengeBreakdown.low / barTotal) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-[95vw] max-w-[520px] max-h-[90vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border-zinc-800/60 p-0 rounded-2xl"
        style={{ borderRadius: 16 }}
        data-testid="player-intel-modal"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/20">
                <Crosshair className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white" data-testid="intel-player-name">{player.fullName}</h3>
                <div className="flex items-center gap-2">
                  {player.category && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400 h-4">
                      Grade {player.category}
                    </Badge>
                  )}
                  <span className="text-[10px] text-zinc-600">Player Intelligence</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center">
              <CircularProgress
                value={intel.balancePct}
                size={72}
                strokeWidth={5}
                color={intel.balancePct >= 70 ? COLORS.green : intel.balancePct >= 40 ? COLORS.yellow : COLORS.red}
                label="Balance"
              />
            </div>
            <div className="flex flex-col items-center">
              <CircularProgress
                value={intel.challengePct}
                size={72}
                strokeWidth={5}
                color={intel.challengeColor}
                label="Challenge"
              />
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-2xl font-extrabold text-white tabular-nums" data-testid="intel-total-matches">
                {intel.totalMatches}
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">Matches</span>
              <span className="text-[10px] text-zinc-600">{intel.wins}W / {intel.totalMatches - intel.wins}L</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 p-3 space-y-2.5" data-testid="challenge-index-section">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Challenge Index</span>
              <Badge className={cn("ml-auto text-[9px] border-0 h-4 px-1.5", intel.challengeColor === COLORS.purple ? "bg-purple-500/20 text-purple-300" : intel.challengeColor === COLORS.green ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300")}>
                {intel.challengeLabel}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-5 rounded-lg overflow-hidden flex bg-zinc-800/60" data-testid="challenge-bar">
                {intel.challengeBreakdown.total > 0 ? (
                  <>
                    {highPct > 0 && (
                      <div className="h-full flex items-center justify-center" style={{ width: `${highPct}%`, backgroundColor: COLORS.purple }} data-testid="challenge-bar-high">
                        {highPct > 15 && <span className="text-[8px] font-bold text-white">{Math.round(highPct)}%</span>}
                      </div>
                    )}
                    {idealPct > 0 && (
                      <div className="h-full flex items-center justify-center" style={{ width: `${idealPct}%`, backgroundColor: COLORS.green }} data-testid="challenge-bar-ideal">
                        {idealPct > 15 && <span className="text-[8px] font-bold text-white">{Math.round(idealPct)}%</span>}
                      </div>
                    )}
                    {lowPct > 0 && (
                      <div className="h-full flex items-center justify-center" style={{ width: `${lowPct}%`, backgroundColor: COLORS.orange }} data-testid="challenge-bar-low">
                        {lowPct > 15 && <span className="text-[8px] font-bold text-white">{Math.round(lowPct)}%</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex-1 flex items-center justify-center">
                    <span className="text-[9px] text-zinc-600">No grade data</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.purple }} />
                  <span className="text-[9px] text-zinc-500">High ({intel.challengeBreakdown.high})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.green }} />
                  <span className="text-[9px] text-zinc-500">Ideal ({intel.challengeBreakdown.ideal})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.orange }} />
                  <span className="text-[9px] text-zinc-500">Low ({intel.challengeBreakdown.low})</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn("rounded-xl border p-3 space-y-2", pc.bg, "border-zinc-800/40")} data-testid="promotion-watch">
            <div className="flex items-center gap-2">
              <PromotionIcon className={cn("h-4 w-4", pc.text)} />
              <span className={cn("text-xs font-bold", pc.text)}>{pc.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/40 rounded-lg p-2">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Win Rate</p>
                <p className="text-sm font-bold text-white tabular-nums">{intel.winRate.toFixed(0)}%</p>
              </div>
              <div className="bg-zinc-900/40 rounded-lg p-2">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Performance</p>
                <p className="text-sm font-bold text-white tabular-nums">{intel.performanceScore.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">{pc.suggestion}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CrowdControlPanel({
  open,
  onOpenChange,
  sessionMatchCounts,
  players,
  liveCount,
  queuedCount,
  completedCount,
  matches = [],
}: CrowdControlPanelProps) {
  const [sortMode, setSortMode] = useState<string>("lowest");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterPromotion, setFilterPromotion] = useState<string>("all");

  useEffect(() => {
    if (open) {
      intervalRef.current = setInterval(() => setRefreshKey(k => k + 1), 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open]);

  const stats = useMemo(() => {
    void refreshKey;
    const data = players.map(p => ({
      id: p.id,
      name: p.fullName,
      shortName: p.fullName.length > 14
        ? p.fullName.split(" ").map((n, i) => i === 0 ? n : n[0] + ".").join(" ")
        : p.fullName,
      category: p.category,
      games: sessionMatchCounts[p.id] || 0,
      isPaused: p.isPaused || false,
    }));

    const totalGames = data.reduce((sum, d) => sum + d.games, 0);
    const activePlayers = data.filter(d => !d.isPaused);
    const playersWithGames = data.filter(d => d.games > 0).length;
    const avg = activePlayers.length > 0 ? totalGames / activePlayers.length : 0;
    const max = Math.max(...data.map(d => d.games), 0);
    const min = playersWithGames > 0 ? Math.min(...data.filter(d => d.games > 0).map(d => d.games)) : 0;
    const playersNoGames = data.filter(d => d.games === 0 && !d.isPaused);

    const variance = activePlayers.length > 1
      ? activePlayers.reduce((sum, d) => sum + Math.pow(d.games - avg, 2), 0) / activePlayers.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0;
    const fairnessScore = activePlayers.length > 1
      ? Math.max(0, Math.min(100, 100 - (cv * 100)))
      : 100;

    const alerts: { message: string; severity: "high" | "medium" | "low" }[] = [];
    for (const p of data) {
      if (p.isPaused) continue;
      const diff = p.games - avg;
      if (diff <= -2 && avg >= 2) {
        alerts.push({ message: `${p.shortName} is ${Math.abs(Math.round(diff))} matches below average`, severity: "high" });
      } else if (p.games === 0 && avg >= 1) {
        alerts.push({ message: `${p.shortName} has no games yet`, severity: "high" });
      }
    }

    let sorted: typeof data;
    switch (sortMode) {
      case "highest":
        sorted = [...data].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
        break;
      case "name":
        sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "lowest":
      default:
        sorted = [...data].sort((a, b) => a.games - b.games || a.name.localeCompare(b.name));
        break;
    }

    return { data: sorted, totalGames, avg, max, min, playersWithGames, playersNoGames, fairnessScore, stdDev, variance, cv, alerts, activePlayers: activePlayers.length };
  }, [players, sessionMatchCounts, sortMode, refreshKey]);

  const playerIntels = useMemo(() => {
    const intels: Record<number, ReturnType<typeof computePlayerIntel>> = {};
    for (const p of players) {
      intels[p.id] = computePlayerIntel(p.id, matches);
    }
    return intels;
  }, [players, matches, refreshKey]);

  const distributionStats = useMemo(() => {
    const allIntels = Object.values(playerIntels);
    const withData = allIntels.filter(i => i.totalMatches > 0);
    if (withData.length === 0) return null;

    const withGradeData = withData.filter(i => i.challengeBreakdown.total > 0);
    const avgChallenge = withGradeData.length > 0
      ? withGradeData.reduce((s, i) => s + i.challengePct, 0) / withGradeData.length : 0;
    const avgBalance = withData.reduce((s, i) => s + i.balancePct, 0) / withData.length;
    const sessionFairness = withGradeData.length > 0
      ? (avgBalance * 0.5 + avgChallenge * 0.5) : avgBalance;

    const gradeGroups: Record<string, number> = {};
    for (const p of players) {
      const g = p.category || "Ungraded";
      gradeGroups[g] = (gradeGroups[g] || 0) + 1;
    }
    const gradeDistribution = Object.entries(gradeGroups).map(([name, value]) => ({ name, value }));

    const underChallenged = withGradeData.filter(i => i.challengePct < 40).length;
    const overChallenged = withGradeData.filter(i => i.challengePct >= 90).length;

    return {
      avgChallenge, avgBalance, sessionFairness,
      gradeDistribution, underChallenged, overChallenged,
      totalWithData: withData.length,
    };
  }, [playerIntels, players]);

  const filteredPlayerList = useMemo(() => {
    let list = stats.data;
    if (filterGrade !== "all") {
      list = list.filter(p => (p.category || "Ungraded") === filterGrade);
    }
    if (filterPromotion !== "all") {
      list = list.filter(p => {
        const intel = playerIntels[p.id];
        return intel && intel.promotionStatus === filterPromotion;
      });
    }
    return list;
  }, [stats.data, filterGrade, filterPromotion, playerIntels]);

  const chartData = useMemo(() => {
    const base = showAllPlayers ? filteredPlayerList : filteredPlayerList.slice(0, 25);
    return base;
  }, [filteredPlayerList, showAllPlayers]);

  const chartHeight = useMemo(() => {
    const playerCount = chartData.length;
    const barSpace = Math.max(28, Math.min(36, 420 / playerCount));
    const computed = playerCount * barSpace;
    const minHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 320 : 420;
    return Math.max(minHeight, Math.min(computed, 700));
  }, [chartData.length]);

  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    for (const p of players) {
      grades.add(p.category || "Ungraded");
    }
    return Array.from(grades).sort();
  }, [players]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return players.find(p => p.id === selectedPlayerId) || null;
  }, [selectedPlayerId, players]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const color = getPlayerBarColor(d.games, stats.avg);
    const label = getPlayerBarLabel(d.games, stats.avg);
    const intel = playerIntels[d.id];
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl min-w-[180px]">
        <p className="text-sm font-bold text-white mb-1">{d.name}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Matches</span>
            <span className="font-bold text-white">{d.games}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Status</span>
            <span style={{ color }} className="font-semibold">{label}</span>
          </div>
          {intel && intel.totalMatches > 0 && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Win Rate</span>
                <span className="text-zinc-200 font-semibold">{intel.winRate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Challenge</span>
                <span style={{ color: intel.challengeColor }} className="font-semibold">{intel.challengePct.toFixed(0)}%</span>
              </div>
            </>
          )}
          {d.category && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Grade</span>
              <span className="text-zinc-300">{d.category}</span>
            </div>
          )}
          {d.isPaused && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Status</span>
              <span className="text-amber-400 font-semibold">Paused</span>
            </div>
          )}
        </div>
        <p className="text-[9px] text-zinc-600 mt-1.5 pt-1 border-t border-zinc-800">Tap name for full intel</p>
      </div>
    );
  }, [stats.avg, playerIntels]);

  const CustomBarLabel = useCallback(({ x, y, width, height, value }: any) => {
    if (!value || value === 0) return null;
    return (
      <text
        x={x + width + 6}
        y={y + height / 2}
        fill="#e4e4e7"
        fontSize={13}
        fontWeight={700}
        dominantBaseline="central"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {value}
      </text>
    );
  }, []);

  const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.orange, COLORS.amber, COLORS.red, COLORS.yellow];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-0" data-testid="crowd-control-dialog">
          <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" data-testid="crowd-control-title">
              <div className="p-1.5 bg-emerald-500/15 rounded-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              Session Fairness Command Center
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs sm:text-sm">
              Real-time match distribution, fairness analytics &amp; player intelligence
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="summary-bar">
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-total-matches">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 mb-1 font-medium">Total Matches</p>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">{liveCount + completedCount}</p>
                <p className="text-[10px] text-zinc-600">{liveCount} live · {queuedCount} queued</p>
              </div>
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-avg-games">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 mb-1 font-medium">Avg per Player</p>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">{stats.avg.toFixed(1)}</p>
                <p className="text-[10px] text-zinc-600">{stats.activePlayers} active players</p>
              </div>
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-range">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 mb-1 font-medium">Range</p>
                <p className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">{stats.min}–{stats.max}</p>
                <p className="text-[10px] text-zinc-600">spread: {stats.max - stats.min}</p>
              </div>
              <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50 flex flex-col items-center justify-center" data-testid="stat-fairness-gauge">
                <FairnessGauge score={stats.fairnessScore} size={110} />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="lg:w-[70%] space-y-3">
                <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden">
                  <div className="sticky top-0 z-10 bg-zinc-900 px-3 py-2.5 border-b border-zinc-800/50 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-[11px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">Match Distribution</span>
                    </div>
                    <div className="flex-1" />
                    <Select value={sortMode} onValueChange={setSortMode}>
                      <SelectTrigger className="h-8 w-[140px] sm:w-[160px] text-xs bg-zinc-800/50 border-zinc-700/50" data-testid="sort-select">
                        <Filter className="h-3 w-3 mr-1 text-zinc-500" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="lowest">Lowest Matches</SelectItem>
                        <SelectItem value="highest">Highest Matches</SelectItem>
                        <SelectItem value="name">By Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3" style={{ minHeight: typeof window !== "undefined" && window.innerWidth < 640 ? 320 : 420 }}>
                    <div style={{ height: chartHeight }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
                          barCategoryGap={Math.max(4, Math.min(16, 420 / chartData.length - 20))}
                        >
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#71717a", fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, "auto"]}
                          />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            width={85}
                            tick={{ fontSize: 11, fill: "#d4d4d8", fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          />
                          <ReferenceLine
                            x={stats.avg}
                            stroke={COLORS.green}
                            strokeDasharray="4 4"
                            strokeOpacity={0.6}
                            strokeWidth={1.5}
                            label={{
                              value: `Avg ${stats.avg.toFixed(1)}`,
                              position: "top",
                              style: { fontSize: 10, fill: COLORS.green, fontWeight: 700 },
                            }}
                          />
                          <Bar
                            dataKey="games"
                            radius={[0, 6, 6, 0]}
                            maxBarSize={28}
                            minPointSize={3}
                            label={<CustomBarLabel />}
                            animationDuration={250}
                            animationEasing="ease-out"
                          >
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.id}
                                fill={getPlayerBarColor(entry.games, stats.avg)}
                                fillOpacity={entry.isPaused ? 0.35 : 0.9}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {filteredPlayerList.length > 25 && !showAllPlayers && (
                      <div className="text-center mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-xs text-zinc-400 hover:text-white"
                          onClick={() => setShowAllPlayers(true)}
                          data-testid="show-all-chart"
                        >
                          <ChevronDown className="w-3.5 h-3.5 mr-1" />
                          Show all {filteredPlayerList.length} players
                        </Button>
                      </div>
                    )}
                    {showAllPlayers && filteredPlayerList.length > 25 && (
                      <div className="text-center mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-xs text-zinc-400 hover:text-white"
                          onClick={() => setShowAllPlayers(false)}
                          data-testid="collapse-chart"
                        >
                          <ChevronUp className="w-3.5 h-3.5 mr-1" />
                          Show top 25
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 sm:gap-5 px-3 py-2.5 border-t border-zinc-800/40 bg-zinc-900/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.red }} />
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">2+ below</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.yellow }} />
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">1 below</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.green }} />
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">On target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.blue }} />
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">Above avg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.muted }} />
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">No games</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-[30%] space-y-3">
                {stats.alerts.length > 0 && (
                  <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden" data-testid="alerts-panel">
                    <div className="px-3 py-2.5 border-b border-zinc-800/50 flex items-center gap-2 bg-zinc-900">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Live Alerts</span>
                      <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-0 text-[10px] h-5 tabular-nums">
                        {stats.alerts.length}
                      </Badge>
                    </div>
                    <div className="divide-y divide-zinc-800/30 max-h-[200px] overflow-y-auto">
                      {stats.alerts.map((alert, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 px-3 py-2.5"
                          data-testid={`alert-${i}`}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            alert.severity === "high" ? "bg-red-500 animate-pulse" : "bg-amber-500"
                          )} />
                          <p className="text-xs text-zinc-300 leading-relaxed">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden" data-testid="player-list-panel">
                  <div className="px-3 py-2.5 border-b border-zinc-800/50 bg-zinc-900 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Player Intelligence</span>
                      <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{filteredPlayerList.length} players</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Select value={filterGrade} onValueChange={setFilterGrade}>
                        <SelectTrigger className="h-7 text-[10px] bg-zinc-800/50 border-zinc-700/50 flex-1" data-testid="filter-grade">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="all">All Grades</SelectItem>
                          {gradeOptions.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterPromotion} onValueChange={setFilterPromotion}>
                        <SelectTrigger className="h-7 text-[10px] bg-zinc-800/50 border-zinc-700/50 flex-1" data-testid="filter-promotion">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="stable">Stable</SelectItem>
                          <SelectItem value="struggling">Struggling</SelectItem>
                          <SelectItem value="under-challenged">Under-Challenged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/20 max-h-[350px] overflow-y-auto">
                    {filteredPlayerList.map((p, i) => {
                      const barColor = getPlayerBarColor(p.games, stats.avg);
                      const intel = playerIntels[p.id];
                      const promColors: Record<string, string> = {
                        promotion: "text-emerald-400",
                        stable: "text-blue-400",
                        struggling: "text-red-400",
                        "under-challenged": "text-amber-400",
                      };
                      const promIcons: Record<string, string> = {
                        promotion: "↑",
                        stable: "—",
                        struggling: "↓",
                        "under-challenged": "⚡",
                      };

                      return (
                        <button
                          type="button"
                          key={p.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 min-h-[44px] transition-colors w-full text-left hover:bg-zinc-800/30",
                            p.isPaused && "opacity-50",
                            p.games === 0 && !p.isPaused && "bg-red-950/10"
                          )}
                          onClick={() => setSelectedPlayerId(p.id)}
                          data-testid={`crowd-player-${p.id}`}
                        >
                          <span className="text-[10px] text-zinc-600 w-4 text-right font-mono tabular-nums shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-[13px] text-zinc-200 truncate font-medium">{p.name}</span>
                              {p.category && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-700 text-zinc-500 h-4 shrink-0">
                                  {p.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${stats.max > 0 ? (p.games / stats.max) * 100 : 0}%`,
                                    backgroundColor: barColor,
                                    transition: "width 0.25s ease-out",
                                  }}
                                />
                              </div>
                              {intel && intel.totalMatches > 0 && (
                                <span className={cn("text-[8px] font-bold tabular-nums shrink-0", promColors[intel.promotionStatus])}>
                                  {promIcons[intel.promotionStatus]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {p.isPaused && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-600/30 text-amber-500 h-4">
                                Paused
                              </Badge>
                            )}
                            <span className={cn(
                              "text-sm font-bold tabular-nums min-w-[20px] text-right",
                              p.games === 0 ? "text-zinc-600" : "text-white"
                            )}>
                              {p.games}
                            </span>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden" data-testid="competitive-distribution">
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-left min-h-[44px]"
                    onClick={() => setShowDistribution(!showDistribution)}
                    data-testid="toggle-distribution"
                  >
                    <Target className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Competitive Overview</span>
                    {showDistribution ? (
                      <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </button>
                  {showDistribution && distributionStats && (
                    <div className="px-3 pb-3 space-y-3 border-t border-zinc-800/40 pt-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-800/40 rounded-lg p-2">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Avg Challenge</p>
                          <p className="text-sm font-bold text-white tabular-nums">{distributionStats.avgChallenge.toFixed(0)}%</p>
                        </div>
                        <div className="bg-zinc-800/40 rounded-lg p-2">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Session Fairness</p>
                          <p className={cn("text-sm font-bold tabular-nums", distributionStats.sessionFairness >= 70 ? "text-emerald-400" : distributionStats.sessionFairness >= 50 ? "text-yellow-400" : "text-red-400")}>
                            {distributionStats.sessionFairness.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {distributionStats.gradeDistribution.length > 0 && (
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Grade Distribution</p>
                          <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={distributionStats.gradeDistribution}
                                  cx="50%" cy="50%"
                                  innerRadius={25} outerRadius={45}
                                  paddingAngle={3}
                                  dataKey="value"
                                  animationDuration={300}
                                >
                                  {distributionStats.gradeDistribution.map((_, idx) => (
                                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.8} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  content={({ active, payload }: any) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs">
                                        <span className="text-zinc-300">{payload[0].name}: </span>
                                        <span className="font-bold text-white">{payload[0].value}</span>
                                      </div>
                                    );
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {distributionStats.gradeDistribution.map((g, idx) => (
                              <div key={g.name} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                <span className="text-[9px] text-zinc-500">{g.name} ({g.value})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/10">
                          <p className="text-[9px] text-amber-400/80 uppercase tracking-wider">Under-Challenged</p>
                          <p className="text-sm font-bold text-amber-300 tabular-nums">
                            {distributionStats.totalWithData > 0 ? ((distributionStats.underChallenged / distributionStats.totalWithData) * 100).toFixed(0) : 0}%
                          </p>
                          <p className="text-[9px] text-zinc-600">{distributionStats.underChallenged} player{distributionStats.underChallenged !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/10">
                          <p className="text-[9px] text-purple-400/80 uppercase tracking-wider">Over-Challenged</p>
                          <p className="text-sm font-bold text-purple-300 tabular-nums">
                            {distributionStats.totalWithData > 0 ? ((distributionStats.overChallenged / distributionStats.totalWithData) * 100).toFixed(0) : 0}%
                          </p>
                          <p className="text-[9px] text-zinc-600">{distributionStats.overChallenged} player{distributionStats.overChallenged !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden" data-testid="fairness-breakdown">
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-left min-h-[44px]"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    data-testid="toggle-fairness-breakdown"
                  >
                    <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Fairness Breakdown</span>
                    {showBreakdown ? (
                      <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                  </button>
                  {showBreakdown && (
                    <div className="px-3 pb-3 space-y-2.5 border-t border-zinc-800/40 pt-2.5">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Fairness is calculated using a <span className="text-zinc-200 font-semibold">variance-based model</span>. 
                        The coefficient of variation (CV) measures how spread out match counts are relative to the average.
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Mean matches</span>
                          <span className="text-zinc-200 font-semibold tabular-nums">{stats.avg.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Variance (σ²)</span>
                          <span className="text-zinc-200 font-semibold tabular-nums">{stats.variance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Std deviation (σ)</span>
                          <span className="text-zinc-200 font-semibold tabular-nums">{stats.stdDev.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">CV (σ/μ)</span>
                          <span className="text-zinc-200 font-semibold tabular-nums">{stats.cv.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-zinc-800/40">
                          <span className="text-zinc-400 font-medium">Fairness Index</span>
                          <span className={cn(
                            "font-bold tabular-nums",
                            stats.fairnessScore >= 80 ? "text-green-400" : stats.fairnessScore >= 50 ? "text-yellow-400" : "text-red-400"
                          )}>
                            {Math.round(stats.fairnessScore)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-relaxed">
                        Score = max(0, 100 − CV×100). A score of 100% means all active players have equal matches. Lower scores indicate greater imbalance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {stats.playersNoGames.length > 0 && (
              <div className="bg-red-950/20 rounded-xl p-3 border border-red-900/20" data-testid="no-games-alert">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-xs font-bold text-red-400">
                    {stats.playersNoGames.length} player{stats.playersNoGames.length > 1 ? "s" : ""} with no games
                  </p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {stats.playersNoGames.map(p => p.name).join(", ")}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-zinc-600">Auto-refreshing every 5 seconds</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlayer && (
        <PlayerIntelligenceModal
          player={selectedPlayer}
          matches={matches}
          open={!!selectedPlayer}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </>
  );
}
