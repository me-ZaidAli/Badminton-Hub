import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import {
  Users, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown, ChevronUp,
  Activity, Target, Timer, Zap, Info, ArrowUpDown, Filter, Eye, BarChart3, Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

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
};

const COLORS = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  muted: "#3f3f46",
};

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

export function CrowdControlPanel({
  open,
  onOpenChange,
  sessionMatchCounts,
  players,
  liveCount,
  queuedCount,
  completedCount,
}: CrowdControlPanelProps) {
  const [sortMode, setSortMode] = useState<string>("lowest");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const chartData = useMemo(() => {
    return showAllPlayers ? stats.data : stats.data.slice(0, 25);
  }, [stats.data, showAllPlayers]);

  const chartHeight = useMemo(() => {
    const playerCount = chartData.length;
    const barSpace = Math.max(28, Math.min(36, 420 / playerCount));
    const computed = playerCount * barSpace;
    const minHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 320 : 420;
    return Math.max(minHeight, Math.min(computed, 700));
  }, [chartData.length]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const color = getPlayerBarColor(d.games, stats.avg);
    const label = getPlayerBarLabel(d.games, stats.avg);
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
          {d.category && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Category</span>
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
      </div>
    );
  }, [stats.avg]);

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

  return (
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
            Real-time match distribution, fairness analytics &amp; player balance
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

                  {stats.data.length > 25 && !showAllPlayers && (
                    <div className="text-center mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-zinc-400 hover:text-white"
                        onClick={() => setShowAllPlayers(true)}
                        data-testid="show-all-chart"
                      >
                        <ChevronDown className="w-3.5 h-3.5 mr-1" />
                        Show all {stats.data.length} players
                      </Button>
                    </div>
                  )}
                  {showAllPlayers && stats.data.length > 25 && (
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
                <div className="px-3 py-2.5 border-b border-zinc-800/50 flex items-center gap-2 bg-zinc-900">
                  <Users className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Player Details</span>
                  <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{stats.data.length} players</span>
                </div>
                <div className="divide-y divide-zinc-800/20 max-h-[350px] overflow-y-auto">
                  {stats.data.map((p, i) => {
                    const barColor = getPlayerBarColor(p.games, stats.avg);
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 min-h-[44px] transition-colors",
                          p.isPaused && "opacity-50",
                          p.games === 0 && !p.isPaused && "bg-red-950/10"
                        )}
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
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${stats.max > 0 ? (p.games / stats.max) * 100 : 0}%`,
                                backgroundColor: barColor,
                                transition: "width 0.25s ease-out",
                              }}
                            />
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
                        </div>
                      </div>
                    );
                  })}
                </div>
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
  );
}
