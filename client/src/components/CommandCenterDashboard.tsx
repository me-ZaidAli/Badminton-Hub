import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, DollarSign, Calendar, Target, Activity, TrendingUp, TrendingDown,
  Search, Brain, Send, Zap, Eye, Star,
  ChevronRight, X, ArrowUpRight, ArrowDownRight, BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend
} from "recharts";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const NEON = {
  purple: "#a855f7",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  pink: "#ec4899",
  red: "#ef4444",
  indigo: "#6366f1",
};

const GRADIENT_COLORS = [NEON.purple, NEON.blue, NEON.cyan, NEON.green, NEON.amber, NEON.pink, NEON.indigo];

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
function formatPenceShort(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`;
  return `£${(pence / 100).toFixed(0)}`;
}

interface CommandCenterProps {
  data: any;
}

function GlassCard({ children, className = "", glow, onClick }: {
  children: React.ReactNode; className?: string; glow?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.08] overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        boxShadow: glow ? `0 0 30px ${glow}15, inset 0 1px 0 rgba(255,255,255,0.05)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function NeonKpiCard({ icon: Icon, label, value, subtitle, change, color, glow }: {
  icon: any; label: string; value: string | number; subtitle?: string;
  change?: number; color: string; glow: string;
}) {
  return (
    <GlassCard glow={glow} className="group hover:border-white/[0.15] transition-all duration-300">
      <div className="p-4 relative">
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: glow }} />
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl" style={{ background: `${glow}20` }}>
            <Icon className="h-4 w-4" style={{ color: glow }} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="flex items-center justify-between mt-2">
          {subtitle && <span className="text-[10px] text-white/30">{subtitle}</span>}
          {change !== undefined && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: any }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/10">
          <Icon className="h-4 w-4 text-purple-400" />
        </div>
      )}
      <div>
        <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
        {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function CommandCenterDashboard({ data }: CommandCenterProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerSort, setPlayerSort] = useState<"revenue" | "sessions" | "attendanceRate">("revenue");
  const [aiQuestion, setAiQuestion] = useState("");

  const aiMutation = useMutation({
    mutationFn: async (question?: string) => {
      const penceToGBP = (p: number) => +(p / 100).toFixed(2);
      const body: any = {
        kpis: data?.kpis ? {
          totalSessions: data.kpis.totalSessions, totalUniquePlayerSignups: data.kpis.totalPlayers,
          totalRevenue_GBP: penceToGBP(data.kpis.totalRevenue), fillRatePercent: data.kpis.fillRate,
          noShowRatePercent: data.kpis.noShowRate,
        } : null,
        clubStats: data?.clubStats?.map((c: any) => ({ name: c.name, sessions: c.sessions, playerSignups: c.players, revenue_GBP: penceToGBP(c.revenue) })),
        seasonality: data?.seasonalityData?.map((s: any) => ({ month: s.month, sessions: s.sessions, players: s.players, revenue_GBP: penceToGBP(s.revenue) })),
        alerts: data?.alerts,
      };
      if (question) body.question = question;
      const res = await apiRequest("POST", "/api/dashboard/analytics/ai-insights", body);
      return res.json();
    },
  });

  const kpis = data?.kpis;

  const seasonalData = useMemo(() => {
    return (data?.seasonalityData || []).map((s: any) => ({
      month: s.month?.slice(5) || s.month,
      revenue: s.revenue,
      players: s.players,
      sessions: s.sessions,
    }));
  }, [data]);

  const clubData = useMemo(() => {
    return (data?.clubStats || []).map((c: any, i: number) => ({
      ...c,
      fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
    }));
  }, [data]);

  const weekdayData = useMemo(() => {
    return (data?.weekdayStats || []).filter((w: any) => w.sessions > 0);
  }, [data]);

  const timeData = useMemo(() => {
    return (data?.timeOfDayStats || []).filter((t: any) => t.sessions > 0);
  }, [data]);

  const revenueBySource = useMemo(() => {
    if (!data?.sessionStats) return [];
    const map = new Map<string, number>();
    for (const s of data.sessionStats) {
      const key = s.title || "Other";
      map.set(key, (map.get(key) || 0) + s.revenue);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }));
  }, [data]);

  const capacityData = useMemo(() => {
    return (data?.capacityUtilization || []).map((c: any, i: number) => ({
      ...c,
      fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
    }));
  }, [data]);

  const sortedPlayers = useMemo(() => {
    let players = data?.playerStats || [];
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      players = players.filter((p: any) => p.name?.toLowerCase().includes(q));
    }
    return [...players].sort((a: any, b: any) => (b[playerSort] || 0) - (a[playerSort] || 0));
  }, [data, playerSearch, playerSort]);

  const topSpenders = useMemo(() => {
    return (data?.playerStats || [])
      .slice()
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [data]);

  const playerRadar = useMemo(() => {
    if (!selectedPlayer) return [];
    const maxRev = Math.max(...(data?.playerStats || []).map((p: any) => p.revenue || 0), 1);
    const maxSess = Math.max(...(data?.playerStats || []).map((p: any) => p.sessions || 0), 1);
    return [
      { metric: "Spend", value: Math.round((selectedPlayer.revenue / maxRev) * 100) },
      { metric: "Attendance", value: selectedPlayer.attendanceRate || 0 },
      { metric: "Sessions", value: Math.round((selectedPlayer.sessions / maxSess) * 100) },
      { metric: "Consistency", value: selectedPlayer.attendanceRate > 80 ? 85 : selectedPlayer.attendanceRate > 50 ? 60 : 30 },
      { metric: "Engagement", value: Math.min(100, Math.round((selectedPlayer.sessions / maxSess) * 120)) },
    ];
  }, [selectedPlayer, data]);

  const memberValueScore = useCallback((p: any) => {
    if (!p) return 0;
    const maxRev = Math.max(...(data?.playerStats || []).map((x: any) => x.revenue || 0), 1);
    const maxSess = Math.max(...(data?.playerStats || []).map((x: any) => x.sessions || 0), 1);
    const spendScore = (p.revenue / maxRev) * 30;
    const attendScore = (p.attendanceRate / 100) * 30;
    const sessScore = (p.sessions / maxSess) * 25;
    const loyaltyScore = p.sessions >= 5 ? 15 : (p.sessions / 5) * 15;
    return Math.round(spendScore + attendScore + sessScore + loyaltyScore);
  }, [data]);

  const tooltipStyle = {
    backgroundColor: "rgba(15,20,30,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "11px",
    color: "#fff",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="relative min-h-screen rounded-2xl overflow-hidden" style={{ background: "#0b0f14" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 0%, rgba(168,85,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.06) 0%, transparent 50%)",
      }} />

      <div className="relative z-10 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Command Center</h1>
            <p className="text-[10px] text-white/30 tracking-wider uppercase mt-0.5">Executive Analytics Dashboard</p>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px]">
            <Zap className="h-3 w-3 mr-1" /> LIVE
          </Badge>
        </div>

        <SectionHeader title="Global Performance" subtitle="Key performance indicators across all clubs" icon={BarChart3} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="cc-kpis">
          <NeonKpiCard icon={DollarSign} label="Total Revenue" value={formatPence(kpis?.totalRevenue || 0)} glow={NEON.green} color="green" subtitle="All clubs combined" />
          <NeonKpiCard icon={Calendar} label="Sessions" value={kpis?.totalSessions || 0} glow={NEON.blue} color="blue" subtitle="Completed sessions" />
          <NeonKpiCard icon={Users} label="Total Signups" value={kpis?.totalPlayers || 0} glow={NEON.purple} color="purple" subtitle="Confirmed attendance" />
          <NeonKpiCard icon={Target} label="Fill Rate" value={`${kpis?.fillRate || 0}%`} glow={NEON.cyan} color="cyan" subtitle="Capacity utilisation" />
          <NeonKpiCard icon={Activity} label="No-Show Rate" value={`${kpis?.noShowRate || 0}%`} glow={kpis?.noShowRate > 15 ? NEON.red : NEON.green} color={kpis?.noShowRate > 15 ? "red" : "green"} />
          <NeonKpiCard icon={DollarSign} label="Rev/Player" value={formatPence(kpis?.revenuePerPlayer || 0)} glow={NEON.amber} color="amber" subtitle="Average spend" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Revenue & Attendance Trend</h3>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonalData}>
                    <defs>
                      <linearGradient id="ccRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.green} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={NEON.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ccPlayerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.purple} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={NEON.purple} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickFormatter={(v: number) => formatPenceShort(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Revenue" ? formatPence(v) : v} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke={NEON.green} fill="url(#ccRevGrad)" strokeWidth={2} dot={{ r: 3, fill: NEON.green }} />
                    <Area yAxisId="right" type="monotone" dataKey="players" name="Players" stroke={NEON.purple} fill="url(#ccPlayerGrad)" strokeWidth={2} dot={{ r: 3, fill: NEON.purple }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Revenue by Session</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      label={({ name, percent }: any) => `${name?.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
                    >
                      {revenueBySource.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPence(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Attendance Analytics" subtitle="Session participation patterns and utilisation" icon={Users} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Weekday Performance</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="avgPlayers" name="Avg Players" radius={[6, 6, 0, 0]}>
                      {weekdayData.map((_: any, i: number) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Time of Day Analysis</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis dataKey="label" type="category" width={80} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false}
                      tickFormatter={(v: string) => v.replace(/ \(\d+-\d+\)/, "")} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]}>
                      {timeData.map((_: any, i: number) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Capacity Utilisation</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Sessions" radius={[6, 6, 0, 0]}>
                      {capacityData.map((_: any, i: number) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Financial Analytics" subtitle="Revenue breakdown and club performance" icon={DollarSign} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Club Performance Comparison</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clubData}>
                    <defs>
                      <linearGradient id="ccClubRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.blue} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={NEON.blue} stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="ccClubPlayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.purple} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={NEON.purple} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickFormatter={(v: number) => formatPenceShort(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Revenue" ? formatPence(v) : v} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#ccClubRevGrad)" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="players" name="Players" fill="url(#ccClubPlayGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Top Spenders</h3>
              <div className="space-y-3">
                {topSpenders.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedPlayer(p)} data-testid={`top-spender-${p.id}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${GRADIENT_COLORS[i]}40, ${GRADIENT_COLORS[i]}10)`,
                        border: `1px solid ${GRADIENT_COLORS[i]}40`,
                        color: GRADIENT_COLORS[i],
                      }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/80 truncate group-hover:text-white transition-colors">{p.name}</div>
                      <div className="text-[10px] text-white/30">{p.sessions} sessions</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: GRADIENT_COLORS[i] }}>
                      {formatPence(p.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Member Value Analytics" subtitle="Individual player performance and engagement scores" icon={Star} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Member Explorer</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                    <Input placeholder="Search members..." value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                      className="pl-7 h-7 text-[11px] w-32 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                      data-testid="cc-player-search" />
                  </div>
                  <div className="flex gap-1">
                    {(["revenue", "sessions", "attendanceRate"] as const).map(key => (
                      <Button key={key} size="sm" variant="ghost"
                        className={`h-6 text-[9px] px-2 ${playerSort === key ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
                        onClick={() => setPlayerSort(key)}>
                        {key === "revenue" ? "Spend" : key === "sessions" ? "Sessions" : "Attend."}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {sortedPlayers.map((p: any) => {
                  const vs = memberValueScore(p);
                  const isSelected = selectedPlayer?.id === p.id;
                  return (
                    <div key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected ? "bg-purple-500/15 border border-purple-500/30" : "hover:bg-white/[0.03] border border-transparent"
                      }`}
                      onClick={() => setSelectedPlayer(isSelected ? null : p)}
                      data-testid={`cc-player-${p.id}`}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: `conic-gradient(${vs > 70 ? NEON.green : vs > 40 ? NEON.amber : NEON.red} ${vs}%, transparent ${vs}%)`,
                          border: "2px solid rgba(255,255,255,0.1)",
                        }}>
                        <span className="text-[10px] text-white/80">{vs}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/80 truncate">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-white/30">{p.sessions} sessions</span>
                          <span className="text-[9px] text-white/30">{p.attendanceRate}% att.</span>
                          {p.clubs?.length > 0 && <span className="text-[9px] text-white/20">{p.clubs[0]}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white/80">{formatPence(p.revenue)}</div>
                        <div className="text-[9px] text-white/30">{p.noShows} no-shows</div>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 text-white/20 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>
                  );
                })}
                {sortedPlayers.length === 0 && (
                  <div className="text-center py-8 text-white/20 text-xs">No members found</div>
                )}
              </div>
            </div>
          </GlassCard>

          {selectedPlayer ? (
            <GlassCard glow={NEON.purple}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Member Profile</h3>
                  <button onClick={() => setSelectedPlayer(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <X className="h-3.5 w-3.5 text-white/40" />
                  </button>
                </div>

                <div className="text-center mb-4">
                  <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${NEON.purple}40, ${NEON.blue}20)`,
                      border: `2px solid ${NEON.purple}40`,
                      color: NEON.purple,
                    }}>
                    {selectedPlayer.name?.charAt(0) || "?"}
                  </div>
                  <div className="text-sm font-bold text-white">{selectedPlayer.name}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Badge className="text-[8px] bg-purple-500/20 text-purple-300 border-purple-500/20">
                      Value: {memberValueScore(selectedPlayer)}/100
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{formatPence(selectedPlayer.revenue)}</div>
                    <div className="text-[8px] text-white/30 uppercase">Spent</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{selectedPlayer.sessions}</div>
                    <div className="text-[8px] text-white/30 uppercase">Sessions</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{selectedPlayer.attendanceRate}%</div>
                    <div className="text-[8px] text-white/30 uppercase">Attend.</div>
                  </div>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={playerRadar} cx="50%" cy="50%">
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar name="Score" dataKey="value" stroke={NEON.purple} fill={NEON.purple} fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: NEON.purple }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {selectedPlayer.sessionTitles?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Sessions Played</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlayer.sessionTitles.map((t: string, i: number) => (
                        <Badge key={i} className="text-[8px] bg-white/5 text-white/50 border-white/10">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          ) : (
            <GlassCard>
              <div className="p-4 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <Eye className="h-6 w-6 text-purple-400/50" />
                </div>
                <p className="text-xs text-white/30 text-center">Select a member from the list to view their analytics profile</p>
              </div>
            </GlassCard>
          )}
        </div>

        <SectionHeader title="AI Insights" subtitle="Intelligent analysis of your club data" icon={Brain} />
        <GlassCard glow={NEON.cyan}>
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Brain className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50" />
                <Input placeholder="Ask anything about your club data..."
                  value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && aiQuestion.trim()) { aiMutation.mutate(aiQuestion); setAiQuestion(""); } }}
                  className="pl-9 h-9 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                  data-testid="cc-ai-input" />
              </div>
              <Button size="sm" className="h-9 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 border-0 text-white hover:from-purple-600 hover:to-blue-600"
                onClick={() => { if (aiQuestion.trim()) { aiMutation.mutate(aiQuestion); setAiQuestion(""); } else { aiMutation.mutate(undefined); } }}
                disabled={aiMutation.isPending} data-testid="cc-ai-generate">
                {aiMutation.isPending ? <span className="animate-pulse text-[10px]">Analysing...</span> : <><Send className="h-3.5 w-3.5 mr-1" /> Analyse</>}
              </Button>
            </div>

            {aiMutation.data?.report && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] max-h-[400px] overflow-y-auto custom-scrollbar">
                <AIReportDark content={aiMutation.data.report} />
              </div>
            )}

            {!aiMutation.data?.report && !aiMutation.isPending && (
              <div className="text-center py-6">
                <Brain className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] text-white/20">Click Analyse for an AI-generated report, or ask a specific question</p>
              </div>
            )}
          </div>
        </GlassCard>

        {data?.alerts?.length > 0 && (
          <>
            <SectionHeader title="Smart Alerts" subtitle="Automated performance warnings and insights" icon={Activity} />
            <GlassCard>
              <div className="p-4 space-y-2">
                {data.alerts.slice(0, 8).map((alert: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className={`p-1.5 rounded-lg ${alert.severity === "warning" ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
                      {alert.severity === "warning" ?
                        <TrendingDown className="h-3 w-3 text-amber-400" /> :
                        <TrendingUp className="h-3 w-3 text-blue-400" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/60">{alert.message}</p>
                    </div>
                    <Badge className={`text-[8px] ${alert.severity === "warning" ? "bg-amber-500/20 text-amber-300 border-amber-500/20" : "bg-blue-500/20 text-blue-300 border-blue-500/20"}`}>
                      {alert.severity === "warning" ? "Warning" : "Info"}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

function AIReportDark({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-[11px]">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-xs font-bold mt-3 mb-1 text-white/90">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold mt-2 mb-1 text-white/80">{line.slice(4)}</h4>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-sm font-bold mt-3 mb-1.5 text-white">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 text-white/60">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-white/60 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i} className="text-white/60">{line}</p>;
      })}
    </div>
  );
}
