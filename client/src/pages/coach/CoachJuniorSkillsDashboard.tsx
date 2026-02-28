import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, AlertTriangle, Award, Users, Target,
  FileText, ChevronDown, ChevronUp, Loader2, Sparkles, Eye, X, Activity
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, Cell
} from "recharts";

const GOLD = "#D4AF37";
const GOLD_DARK = "#B8941E";
const CARD_BG = "#1A1A1A";
const PAGE_BG = "#111111";
const SQUAD_LEVELS = ["ALL", "BEGINNER", "IMPROVER", "PERFORMANCE", "SQUAD", "COMPETITION_READY"];
const SQUAD_COLORS: Record<string, string> = {
  BEGINNER: "#4CAF50", IMPROVER: "#2196F3", PERFORMANCE: "#FF9800",
  SQUAD: "#9C27B0", COMPETITION_READY: "#F44336"
};

function heatColor(val: number): string {
  if (val >= 75) return "#22c55e";
  if (val >= 50) return GOLD;
  if (val >= 25) return "#f59e0b";
  return "#ef4444";
}

function ShimmerCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl animate-pulse ${className}`} style={{ background: CARD_BG }}>
      <div className="p-6 space-y-3">
        <div className="h-4 bg-white/10 rounded w-1/3" />
        <div className="h-8 bg-white/10 rounded w-1/2" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub, color = GOLD }: { label: string; value: string | number; icon: any; sub?: string; color?: string }) {
  return (
    <div
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-white/5"
      style={{ background: CARD_BG }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function CoachJuniorSkillsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [squadLevel, setSquadLevel] = useState("ALL");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [skillDetailId, setSkillDetailId] = useState<number | null>(null);
  const [categoryDetailId, setCategoryDetailId] = useState<number | null>(null);
  const [playerDetailId, setPlayerDetailId] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(50);

  const { data: clubs = [] } = useQuery<any[]>({ queryKey: ["/api/clubs"] });

  const clubId = selectedClubId || (clubs.length > 0 ? clubs[0]?.id : null);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (clubId) p.set("clubId", String(clubId));
    if (squadLevel !== "ALL") p.set("squadLevel", squadLevel);
    return p.toString();
  }, [clubId, squadLevel]);

  async function fetchJson(url: string) {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  }

  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["/api/coach/juniors/skills/overview", clubId, squadLevel],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/overview?${queryParams}`),
    enabled: !!clubId,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<any[]>({
    queryKey: ["/api/coach/juniors/skills/trends", clubId, squadLevel],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/trends?${queryParams}`),
    enabled: !!clubId,
  });

  const { data: weakStrong, isLoading: weakStrongLoading } = useQuery<any>({
    queryKey: ["/api/coach/juniors/skills/weak-strong", clubId, squadLevel],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/weak-strong?${queryParams}`),
    enabled: !!clubId,
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<any[]>({
    queryKey: ["/api/coach/juniors/skills/heatmap", clubId],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/heatmap?clubId=${clubId}`),
    enabled: !!clubId,
  });

  const { data: belowThreshold, isLoading: belowLoading } = useQuery<any[]>({
    queryKey: ["/api/coach/juniors/players/below-threshold", clubId, squadLevel, threshold],
    queryFn: () => fetchJson(`/api/coach/juniors/players/below-threshold?${queryParams}&threshold=${threshold}`),
    enabled: !!clubId,
  });

  const { data: skillDetail } = useQuery<any>({
    queryKey: ["/api/coach/juniors/skills/detail", skillDetailId, clubId],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/detail/${skillDetailId}?clubId=${clubId}`),
    enabled: !!skillDetailId && !!clubId,
  });

  const { data: categorySkills } = useQuery<any>({
    queryKey: ["/api/coach/juniors/skills/category", categoryDetailId, clubId, squadLevel],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/category/${categoryDetailId}?${queryParams}`),
    enabled: !!categoryDetailId && !!clubId,
  });

  const { data: playerDetail } = useQuery<any>({
    queryKey: ["/api/coach/juniors/skills/player", playerDetailId, clubId],
    queryFn: () => fetchJson(`/api/coach/juniors/skills/player/${playerDetailId}?clubId=${clubId}`),
    enabled: !!playerDetailId && !!clubId,
  });

  const { data: pastReports = [] } = useQuery<any[]>({
    queryKey: ["/api/coach/juniors/reports", clubId],
    queryFn: () => fetchJson(`/api/coach/juniors/reports?clubId=${clubId}`),
    enabled: !!clubId,
  });

  const reportMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/coach/juniors/reports/generate", { clubId, squadLevel }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/coach/juniors/reports"] });
      toast({ title: "Report Generated", description: "AI analysis is ready." });
      setAiExpanded(true);
    },
    onError: () => toast({ title: "Error", description: "Failed to generate report", variant: "destructive" }),
  });

  const radarData = useMemo(() => {
    if (!overview?.categories) return [];
    return overview.categories.map((c: any) => ({
      category: c.categoryName.length > 12 ? c.categoryName.slice(0, 12) + "…" : c.categoryName,
      fullName: c.categoryName,
      score: c.avgScore,
      categoryId: c.categoryId,
    }));
  }, [overview]);

  const trendChartData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const weekSet = new Set<string>();
    trends.forEach((t: any) => t.weeks?.forEach((w: any) => weekSet.add(w.week)));
    const weeks = Array.from(weekSet).sort();
    return weeks.map(w => {
      const point: any = { week: w.slice(5) };
      trends.forEach((t: any) => {
        const match = t.weeks?.find((wk: any) => wk.week === w);
        point[t.categoryName] = match?.avgScore || null;
      });
      return point;
    });
  }, [trends]);

  const trendColors = ["#D4AF37", "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336", "#00BCD4", "#FF5722", "#8BC34A", "#E91E63", "#607D8B"];

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button data-testid="button-back" onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 size={24} style={{ color: GOLD }} />
              Junior Skills Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-1">Aggregate coaching insights across your junior players</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={String(clubId || "")} onValueChange={v => setSelectedClubId(Number(v))}>
              <SelectTrigger data-testid="select-club" className="w-[160px] border-white/10 text-white" style={{ background: CARD_BG }}>
                <SelectValue placeholder="Select Club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={squadLevel} onValueChange={setSquadLevel}>
              <SelectTrigger data-testid="select-squad-level" className="w-[160px] border-white/10 text-white" style={{ background: CARD_BG }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SQUAD_LEVELS.map(l => (
                  <SelectItem key={l} value={l}>{l === "ALL" ? "All Squads" : l.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              data-testid="button-generate-report"
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending || !clubId}
              className="text-black font-semibold"
              style={{ background: GOLD }}
            >
              {reportMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles size={16} className="mr-2" />}
              Generate AI Report
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <ShimmerCard key={i} />)}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Juniors" value={overview.totalJuniors} icon={Users} sub="Assessed players" />
            <StatCard label="Overall Average" value={`${overview.overallAvg}%`} icon={Target} sub="Skill proficiency" />
            <StatCard label="Categories" value={overview.categories?.length || 0} icon={BarChart3} sub="Skill categories" />
            <StatCard
              label="Below 50%"
              value={belowThreshold?.length || 0}
              icon={AlertTriangle}
              sub="Need attention"
              color="#ef4444"
            />
          </div>
        )}

        {/* AI Insights Card */}
        {pastReports.length > 0 && (
          <div
            data-testid="card-ai-insights"
            className="rounded-xl border border-white/10 overflow-hidden transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${CARD_BG}, #252525)` }}
          >
            <button
              data-testid="button-toggle-ai-insights"
              className="w-full p-5 flex items-center justify-between text-left"
              onClick={() => setAiExpanded(!aiExpanded)}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={20} style={{ color: GOLD }} />
                <span className="text-white font-semibold">AI Coaching Insights</span>
                <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                  {new Date(pastReports[0].createdAt).toLocaleDateString()}
                </Badge>
              </div>
              {aiExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {aiExpanded && (
              <div className="px-5 pb-5 border-t border-white/5 pt-4">
                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {pastReports[0].aiSummary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Target size={18} style={{ color: GOLD }} />
              Skills Overview by Category
            </h3>
            {overviewLoading ? (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "#999", fontSize: 11 }}
                    onClick={(e: any) => {
                      if (e?.payload) {
                        const cat = radarData.find((r: any) => r.category === e.payload.value);
                        if (cat) setCategoryDetailId(cat.categoryId);
                      }
                    }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                  <Radar name="Average Score" dataKey="score" stroke={GOLD} fill={GOLD} fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
            )}
          </div>

          {/* Bar Chart */}
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={18} style={{ color: GOLD }} />
              Category Performance
            </h3>
            {overviewLoading ? (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : overview?.categories?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overview.categories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#999", fontSize: 11 }} />
                  <YAxis dataKey="categoryName" type="category" width={90} tick={{ fill: "#999", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8, color: "#fff" }}
                    formatter={(v: any) => [`${v}%`, "Avg Score"]}
                  />
                  <Bar dataKey="avgScore" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => {
                    if (d?.categoryId) setCategoryDetailId(d.categoryId);
                  }}>
                    {overview.categories.map((c: any, i: number) => (
                      <Cell key={i} fill={c.avgScore >= 70 ? "#22c55e" : c.avgScore >= 40 ? GOLD : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
            )}
          </div>
        </div>

        {/* Weak/Strong Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weakest Skills */}
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingDown size={18} className="text-red-400" />
              Weakest Skills
              <span className="text-xs text-gray-500 ml-auto">Needs Improvement</span>
            </h3>
            {weakStrongLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : weakStrong?.weakest?.length > 0 ? (
              <div className="space-y-2">
                {weakStrong.weakest.map((s: any, i: number) => (
                  <button
                    key={s.skillId}
                    data-testid={`weak-skill-${s.skillId}`}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                    onClick={() => setSkillDetailId(s.skillId)}
                  >
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#ef4444", color: "#fff" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.skillName}</div>
                      <div className="text-xs text-gray-500">{s.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: s.avgScore < 30 ? "#ef4444" : "#f59e0b" }}>{s.avgScore}%</div>
                      <div className="text-xs text-gray-500">{s.playerCount} players</div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.avgScore}%`, background: s.avgScore < 30 ? "#ef4444" : "#f59e0b" }} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">No data</div>
            )}
          </div>

          {/* Strongest Skills */}
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-400" />
              Strongest Skills
              <span className="text-xs text-gray-500 ml-auto">Top Performers</span>
            </h3>
            {weakStrongLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : weakStrong?.strongest?.length > 0 ? (
              <div className="space-y-2">
                {weakStrong.strongest.map((s: any, i: number) => (
                  <button
                    key={s.skillId}
                    data-testid={`strong-skill-${s.skillId}`}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                    onClick={() => setSkillDetailId(s.skillId)}
                  >
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#22c55e", color: "#fff" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.skillName}</div>
                      <div className="text-xs text-gray-500">{s.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">{s.avgScore}%</div>
                      <div className="text-xs text-gray-500">{s.playerCount} players</div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${s.avgScore}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">No data</div>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} style={{ color: GOLD }} />
            Category × Squad Heatmap
          </h3>
          {heatmapLoading ? (
            <div className="h-[200px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
          ) : heatmap && heatmap.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 py-2 px-3 font-medium">Category</th>
                    {["BEGINNER", "IMPROVER", "PERFORMANCE", "SQUAD", "COMP READY"].map(s => (
                      <th key={s} className="text-center text-gray-400 py-2 px-2 font-medium text-xs">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row: any) => (
                    <tr key={row.categoryId} className="border-t border-white/5">
                      <td className="text-white py-2 px-3 text-xs">{row.categoryName}</td>
                      {row.squads.map((sq: any, i: number) => (
                        <td key={i} className="py-2 px-2 text-center">
                          <button
                            data-testid={`heatmap-cell-${row.categoryId}-${sq.squad}`}
                            className="w-full rounded-md py-1 px-2 text-xs font-bold transition-all hover:scale-110"
                            style={{
                              background: sq.playerCount > 0 ? heatColor(sq.avgScore) + "30" : "#ffffff08",
                              color: sq.playerCount > 0 ? heatColor(sq.avgScore) : "#555",
                              border: `1px solid ${sq.playerCount > 0 ? heatColor(sq.avgScore) + "40" : "transparent"}`,
                            }}
                            onClick={() => {
                              setSquadLevel(sq.squad);
                            }}
                            title={sq.playerCount > 0 ? `${sq.avgScore}% avg (${sq.playerCount} players)` : "No players"}
                          >
                            {sq.playerCount > 0 ? `${sq.avgScore}%` : "—"}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-4">No data available</div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: GOLD }} />
            Weekly Progress Trends
          </h3>
          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
          ) : trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="week" tick={{ fill: "#999", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#999", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8, color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#999", fontSize: 11 }} />
                {trends?.map((t: any, i: number) => (
                  <Line
                    key={t.categoryName}
                    type="monotone"
                    dataKey={t.categoryName}
                    stroke={trendColors[i % trendColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No trend data available yet</div>
          )}
        </div>

        {/* Players Below Threshold */}
        <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              Players Below Threshold
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Threshold:</span>
              <Select value={String(threshold)} onValueChange={v => setThreshold(Number(v))}>
                <SelectTrigger data-testid="select-threshold" className="w-[80px] h-8 border-white/10 text-white text-sm" style={{ background: "#222" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 40, 50, 60, 70].map(t => (
                    <SelectItem key={t} value={String(t)}>{t}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {belowLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}</div>
          ) : belowThreshold && belowThreshold.length > 0 ? (
            <div className="space-y-2">
              {belowThreshold.map((p: any) => (
                <button
                  key={p.userId}
                  data-testid={`player-below-${p.userId}`}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                  onClick={() => setPlayerDetailId(p.userId)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: GOLD + "30", color: GOLD }}>
                    {p.fullName?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.fullName}</div>
                    <div className="text-xs text-gray-500">{p.juniorLevel?.replace(/_/g, " ")} · Weakest: {p.weakestSkill} ({p.weakestScore}%)</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Overall</span>
                        <span className="font-bold" style={{ color: p.overallPercent < 30 ? "#ef4444" : "#f59e0b" }}>{p.overallPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.overallPercent}%`, background: p.overallPercent < 30 ? "#ef4444" : "#f59e0b" }} />
                      </div>
                    </div>
                    <Eye size={14} className="text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-4">
              {belowThreshold?.length === 0 ? "All players are above the threshold" : "No data available"}
            </div>
          )}
        </div>

        {/* Category Detail Modal */}
        <Dialog open={!!categoryDetailId} onOpenChange={() => setCategoryDetailId(null)}>
          <DialogContent className="max-w-lg border-white/10 text-white" style={{ background: "#1E1E1E" }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: GOLD }} />
                {categorySkills?.category?.name || "Category Detail"}
              </DialogTitle>
            </DialogHeader>
            {categorySkills ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: GOLD }}>{categorySkills.categoryAvg}%</div>
                    <div className="text-xs text-gray-500">Category Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{categorySkills.totalJuniors}</div>
                    <div className="text-xs text-gray-500">Total Juniors</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">Click a skill for per-player breakdown.</div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {categorySkills.skills?.length > 0 ? categorySkills.skills.map((s: any) => (
                    <button
                      key={s.skillId}
                      data-testid={`category-skill-${s.skillId}`}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                      onClick={() => { setCategoryDetailId(null); setSkillDetailId(s.skillId); }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: s.avgScore >= 70 ? "#22c55e" : s.avgScore >= 40 ? GOLD : "#ef4444" }} />
                      <div className="flex-1">
                        <div className="text-sm text-white">{s.skillName}</div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: s.avgScore >= 70 ? "#22c55e" : s.avgScore >= 40 ? GOLD : "#ef4444" }}>
                        {s.avgScore}%
                      </div>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.avgScore}%`, background: s.avgScore >= 70 ? "#22c55e" : s.avgScore >= 40 ? GOLD : "#ef4444" }} />
                      </div>
                    </button>
                  )) : (
                    <div className="text-gray-500 text-sm text-center py-4">No skill data for this category</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            )}
          </DialogContent>
        </Dialog>

        {/* Skill Detail Modal */}
        <Dialog open={!!skillDetailId} onOpenChange={() => setSkillDetailId(null)}>
          <DialogContent className="max-w-lg border-white/10 text-white" style={{ background: "#1E1E1E" }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target size={18} style={{ color: GOLD }} />
                {skillDetail?.skill?.name || "Skill Detail"}
                {skillDetail?.skill?.categoryName && (
                  <Badge variant="outline" className="text-xs border-white/20 text-gray-400 ml-2">{skillDetail.skill.categoryName}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {skillDetail ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: GOLD }}>{skillDetail.avgScore}%</div>
                    <div className="text-xs text-gray-500">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{skillDetail.players?.length || 0}</div>
                    <div className="text-xs text-gray-500">Players</div>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {skillDetail.players?.map((p: any) => (
                    <button
                      key={p.userId}
                      data-testid={`skill-player-${p.userId}`}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      onClick={() => { setSkillDetailId(null); setPlayerDetailId(p.userId); }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: GOLD + "30", color: GOLD }}>
                        {p.fullName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">{p.fullName}</div>
                        <div className="text-xs text-gray-500">{p.juniorLevel?.replace(/_/g, " ")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: p.score >= 70 ? "#22c55e" : p.score >= 40 ? GOLD : "#ef4444" }}>{p.score}%</span>
                        <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: p.score >= 70 ? "#22c55e" : p.score >= 40 ? GOLD : "#ef4444" }} />
                        </div>
                        {p.priority && <AlertTriangle size={12} className="text-amber-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            )}
          </DialogContent>
        </Dialog>

        {/* Player Detail Modal */}
        <Dialog open={!!playerDetailId} onOpenChange={() => setPlayerDetailId(null)}>
          <DialogContent className="max-w-2xl border-white/10 text-white max-h-[80vh] overflow-y-auto" style={{ background: "#1E1E1E" }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users size={18} style={{ color: GOLD }} />
                {playerDetail?.user?.fullName || "Player Detail"}
                {playerDetail?.profile?.juniorLevel && (
                  <Badge variant="outline" className="text-xs border-white/20 text-gray-400 ml-2">{playerDetail.profile.juniorLevel.replace(/_/g, " ")}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {playerDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ background: "#252525" }}>
                    <div className="text-lg font-bold" style={{ color: GOLD }}>{playerDetail.profile.overallSkillPercentage}%</div>
                    <div className="text-xs text-gray-500">Overall</div>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "#252525" }}>
                    <div className="text-lg font-bold text-blue-400">{playerDetail.profile.attendancePercentage}%</div>
                    <div className="text-xs text-gray-500">Attendance</div>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "#252525" }}>
                    <div className="text-lg font-bold text-green-400">{playerDetail.profile.effortRating}/10</div>
                    <div className="text-xs text-gray-500">Effort</div>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "#252525" }}>
                    <div className="text-lg font-bold text-purple-400">{playerDetail.profile.coachRating}/10</div>
                    <div className="text-xs text-gray-500">Coach Rating</div>
                  </div>
                </div>

                {playerDetail.categories?.length > 0 && (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={playerDetail.categories.map((c: any) => ({ category: c.categoryName.slice(0, 10), score: c.avgScore }))}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="category" tick={{ fill: "#999", fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#666", fontSize: 9 }} />
                      <Radar name="Score" dataKey="score" stroke={GOLD} fill={GOLD} fillOpacity={0.3} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}

                <div className="space-y-3">
                  {playerDetail.categories?.map((cat: any) => (
                    <div key={cat.categoryId} className="rounded-lg p-3" style={{ background: "#252525" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{cat.categoryName}</span>
                        <span className="text-sm font-bold" style={{ color: cat.avgScore >= 70 ? "#22c55e" : cat.avgScore >= 40 ? GOLD : "#ef4444" }}>
                          {cat.avgScore}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {cat.skills.map((sk: any) => (
                          <div key={sk.skillId} className="flex items-center gap-2 text-xs py-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: sk.percentage >= 70 ? "#22c55e" : sk.percentage >= 40 ? GOLD : "#ef4444" }} />
                            <span className="text-gray-400 flex-1 truncate">{sk.skillName}</span>
                            <span className="font-medium text-gray-300">{sk.percentage}%</span>
                            {sk.priority && <AlertTriangle size={10} className="text-amber-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
