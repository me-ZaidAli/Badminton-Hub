import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Users, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
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

export function CrowdControlPanel({
  open,
  onOpenChange,
  sessionMatchCounts,
  players,
  liveCount,
  queuedCount,
  completedCount,
}: CrowdControlPanelProps) {
  const [sortBy, setSortBy] = useState<"games" | "name">("games");
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    const data = players.map(p => ({
      id: p.id,
      name: p.fullName,
      shortName: p.fullName.split(" ").map((n, i) => i === 0 ? n : n[0] + ".").join(" "),
      category: p.category,
      games: sessionMatchCounts[p.id] || 0,
      isPaused: p.isPaused || false,
    }));

    const sorted = sortBy === "games"
      ? data.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
      : data.sort((a, b) => a.name.localeCompare(b.name));

    const totalGames = data.reduce((sum, d) => sum + d.games, 0);
    const playersWithGames = data.filter(d => d.games > 0).length;
    const avg = playersWithGames > 0 ? totalGames / playersWithGames : 0;
    const max = Math.max(...data.map(d => d.games), 0);
    const min = playersWithGames > 0 ? Math.min(...data.filter(d => d.games > 0).map(d => d.games)) : 0;
    const playersNoGames = data.filter(d => d.games === 0);

    const fairnessScore = playersWithGames > 1
      ? Math.max(0, 100 - (((max - min) / Math.max(avg, 1)) * 25))
      : 100;

    return { data: sorted, totalGames, avg, max, min, playersWithGames, playersNoGames, fairnessScore };
  }, [players, sessionMatchCounts, sortBy]);

  const getBarColor = (games: number) => {
    if (games === 0) return "#3f3f46";
    const diff = games - stats.avg;
    const ratio = Math.abs(diff) / Math.max(stats.avg, 1);
    if (ratio < 0.25) return "#22c55e";
    if (diff > 0) return ratio > 0.5 ? "#f59e0b" : "#84cc16";
    return ratio > 0.5 ? "#ef4444" : "#fb923c";
  };

  const getStatusIcon = (games: number) => {
    if (games === 0) return <AlertTriangle className="w-3 h-3 text-red-400" />;
    const diff = games - stats.avg;
    const ratio = Math.abs(diff) / Math.max(stats.avg, 1);
    if (ratio < 0.25) return <Minus className="w-3 h-3 text-green-400" />;
    if (diff > 0) return <TrendingUp className="w-3 h-3 text-amber-400" />;
    return <TrendingDown className="w-3 h-3 text-orange-400" />;
  };

  const fairnessColor = stats.fairnessScore >= 80 ? "text-green-400" : stats.fairnessScore >= 50 ? "text-amber-400" : "text-red-400";
  const fairnessLabel = stats.fairnessScore >= 80 ? "Balanced" : stats.fairnessScore >= 50 ? "Uneven" : "Imbalanced";

  const displayData = showAll ? stats.data : stats.data.slice(0, 15);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-0" data-testid="crowd-control-dialog">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg" data-testid="crowd-control-title">
            <Users className="w-5 h-5 text-emerald-400" />
            Crowd Control
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-sm">
            Session match distribution and fairness overview
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-total-matches">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Matches</p>
              <p className="text-2xl font-bold text-white tabular-nums">{stats.totalGames}</p>
              <p className="text-[10px] text-zinc-600">{liveCount} live · {queuedCount} queued</p>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-avg-games">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Avg per Player</p>
              <p className="text-2xl font-bold text-white tabular-nums">{stats.avg.toFixed(1)}</p>
              <p className="text-[10px] text-zinc-600">{stats.playersWithGames} active</p>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-range">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Range</p>
              <p className="text-2xl font-bold text-white tabular-nums">{stats.min}–{stats.max}</p>
              <p className="text-[10px] text-zinc-600">min – max</p>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/50" data-testid="stat-fairness">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Fairness</p>
              <p className={cn("text-2xl font-bold tabular-nums", fairnessColor)}>{Math.round(stats.fairnessScore)}%</p>
              <p className={cn("text-[10px]", fairnessColor)}>{fairnessLabel}</p>
            </div>
          </div>

          {stats.data.length > 0 && (
            <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/40">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold">Match Distribution</p>
              <div style={{ height: Math.max(180, Math.min(stats.data.length * 28, 350)) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.data}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    barCategoryGap="15%"
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      width={90}
                      tick={{ fontSize: 10, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#e4e4e7",
                        padding: "8px 12px",
                      }}
                      formatter={(value: number) => [`${value} games`, "Matches"]}
                      labelFormatter={(label: string) => label}
                    />
                    <ReferenceLine
                      x={stats.avg}
                      stroke="#22c55e"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                      label={{
                        value: `Avg ${stats.avg.toFixed(1)}`,
                        position: "top",
                        style: { fontSize: 9, fill: "#22c55e" },
                      }}
                    />
                    <Bar dataKey="games" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {stats.data.map((entry) => (
                        <Cell key={entry.id} fill={getBarColor(entry.games)} fillOpacity={entry.isPaused ? 0.4 : 0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[9px] text-zinc-500">On target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] text-zinc-500">Above avg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-[9px] text-zinc-500">Below avg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] text-zinc-500">No games</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900/60 rounded-xl border border-zinc-800/40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Player Details</p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-6 px-2 text-[10px]", sortBy === "games" && "bg-zinc-800 text-white")}
                  onClick={() => setSortBy("games")}
                  data-testid="sort-by-games"
                >
                  By Games
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-6 px-2 text-[10px]", sortBy === "name" && "bg-zinc-800 text-white")}
                  onClick={() => setSortBy("name")}
                  data-testid="sort-by-name"
                >
                  By Name
                </Button>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/30">
              {displayData.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    p.isPaused && "opacity-50",
                    p.games === 0 && "bg-red-950/10"
                  )}
                  data-testid={`crowd-player-${p.id}`}
                >
                  <span className="text-[10px] text-zinc-600 w-5 text-right font-mono tabular-nums">{i + 1}</span>
                  {getStatusIcon(p.games)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-200 truncate">{p.name}</span>
                      {p.category && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-700 text-zinc-500 h-4 shrink-0">
                          {p.category}
                        </Badge>
                      )}
                      {p.isPaused && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-600/30 text-amber-500 h-4 shrink-0">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stats.max > 0 ? (p.games / stats.max) * 100 : 0}%`,
                          backgroundColor: getBarColor(p.games),
                        }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-bold tabular-nums min-w-[24px] text-right",
                      p.games === 0 ? "text-zinc-600" : "text-white"
                    )}>
                      {p.games}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {stats.data.length > 15 && (
              <div className="px-3 py-2 border-t border-zinc-800/40 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-zinc-400"
                  onClick={() => setShowAll(!showAll)}
                  data-testid="toggle-show-all"
                >
                  {showAll ? (
                    <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3 mr-1" /> Show All ({stats.data.length})</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {stats.playersNoGames.length > 0 && (
            <div className="bg-red-950/20 rounded-xl p-3 border border-red-900/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                  {stats.playersNoGames.length} player{stats.playersNoGames.length > 1 ? "s" : ""} with no games
                </p>
              </div>
              <p className="text-[11px] text-zinc-400">
                {stats.playersNoGames.map(p => p.name).join(", ")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
