import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, DollarSign, Calendar, BarChart3, Target, Activity, Zap, X, Maximize2, Minimize2, Search, Brain, Send, TrendingUp, Building2, Clock, User, Filter } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area, AreaChart, PieChart as RPieChart, Pie, Cell } from "recharts";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#a855f7"];

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
function formatPenceShort(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`;
  return `£${(pence / 100).toFixed(0)}`;
}

type DrillLevel = "year" | "month" | "week" | "day";
type ActiveFilter = {
  playerId?: number;
  playerName?: string;
  sessionTitle?: string;
  clubId?: number;
  clubName?: string;
  month?: string;
  weekday?: number;
  weekdayName?: string;
  timeOfDay?: string;
};

interface InteractiveDashboardProps {
  data: any;
}

export default function InteractiveDashboard({ data }: InteractiveDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({});
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("month");
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(new Set(["players", "revenue"]));
  const [playerSearch, setPlayerSearch] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");

  const hasFilter = Object.keys(activeFilter).length > 0;

  const clearFilter = useCallback(() => {
    setActiveFilter({});
    setDrillPath([]);
  }, []);

  const removeFilterKey = useCallback((key: keyof ActiveFilter) => {
    setActiveFilter(prev => {
      const next = { ...prev };
      delete next[key];
      if (key === "playerId") delete next.playerName;
      if (key === "clubId") delete next.clubName;
      if (key === "weekday") delete next.weekdayName;
      return next;
    });
  }, []);

  const filteredSignups = useMemo(() => {
    if (!data?.signupsRaw) return [];
    let sigs = data.signupsRaw;
    if (activeFilter.playerId) sigs = sigs.filter((s: any) => s.playerId === activeFilter.playerId);
    if (activeFilter.sessionTitle) {
      const sessIds = new Set((data.sessionStats || []).filter((s: any) => s.title === activeFilter.sessionTitle).map((s: any) => s.id));
      sigs = sigs.filter((s: any) => sessIds.has(s.sessionId));
    }
    if (activeFilter.clubId) sigs = sigs.filter((s: any) => s.clubId === activeFilter.clubId);
    if (activeFilter.month) sigs = sigs.filter((s: any) => s.date?.startsWith(activeFilter.month));
    if (activeFilter.weekday !== undefined) sigs = sigs.filter((s: any) => new Date(s.date).getDay() === activeFilter.weekday);
    if (activeFilter.timeOfDay) {
      const sessionMap = new Map((data.sessionStats || []).map((s: any) => [s.id, s]));
      sigs = sigs.filter((s: any) => {
        const sess: any = sessionMap.get(s.sessionId);
        if (!sess?.startTime) return false;
        const hour = parseInt(sess.startTime.split(":")[0]);
        if (activeFilter.timeOfDay === "morning") return hour >= 6 && hour < 12;
        if (activeFilter.timeOfDay === "afternoon") return hour >= 12 && hour < 17;
        if (activeFilter.timeOfDay === "evening") return hour >= 17 && hour < 21;
        return hour >= 21 || hour < 6;
      });
    }
    return sigs;
  }, [data, activeFilter]);

  const filteredSessionStats = useMemo(() => {
    if (!data?.sessionStats) return [];
    let stats = data.sessionStats;
    const sigSessionIds = new Set(filteredSignups.map((s: any) => s.sessionId));
    if (hasFilter) stats = stats.filter((s: any) => sigSessionIds.has(s.id));
    return stats;
  }, [data, filteredSignups, hasFilter]);

  const kpis = useMemo(() => {
    if (!hasFilter) return data?.kpis;
    const sessions = filteredSessionStats.length;
    const signups = filteredSignups.length;
    const revenue = filteredSignups.reduce((s: number, sg: any) => s + sg.fee, 0);
    const paid = filteredSignups.filter((s: any) => s.payment === "PAID").reduce((s: number, sg: any) => s + sg.fee, 0);
    const noShows = filteredSignups.filter((s: any) => s.attendance === "NOT_ATTENDED").length;
    const tracked = filteredSignups.filter((s: any) => ["ATTENDED", "NOT_ATTENDED", "PARTIAL_ATTENDANCE", "JUSTIFIED_CANCELLATION"].includes(s.attendance)).length;
    const totalCap = filteredSessionStats.reduce((s: number, ss: any) => s + (ss.maxPlayers || 0), 0);
    return {
      totalSessions: sessions,
      totalPlayers: signups,
      totalRevenue: revenue,
      paidRevenue: paid,
      avgPlayersPerSession: sessions > 0 ? Math.round((signups / sessions) * 10) / 10 : 0,
      revenuePerSession: sessions > 0 ? Math.round(revenue / sessions) : 0,
      revenuePerPlayer: signups > 0 ? Math.round(revenue / signups) : 0,
      fillRate: totalCap > 0 ? Math.round((signups / totalCap) * 1000) / 10 : 0,
      noShowRate: tracked > 0 ? Math.round((noShows / tracked) * 1000) / 10 : 0,
      noShows,
    };
  }, [data, hasFilter, filteredSignups, filteredSessionStats]);

  const masterChartData = useMemo(() => {
    const source = hasFilter ? filteredSessionStats : data?.sessionStats || [];
    const groupBy = (items: any[], level: DrillLevel) => {
      const map = new Map<string, { label: string; players: number; revenue: number; sessions: number; fillRate: number; noShows: number; count: number }>();
      for (const s of items) {
        const d = new Date(s.date);
        let key: string;
        if (level === "day") key = d.toISOString().split("T")[0];
        else if (level === "week") {
          const weekStart = new Date(d.getTime() - d.getDay() * 86400000);
          key = weekStart.toISOString().split("T")[0];
        } else if (level === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        else key = `${d.getFullYear()}`;
        if (!map.has(key)) map.set(key, { label: key, players: 0, revenue: 0, sessions: 0, fillRate: 0, noShows: 0, count: 0 });
        const e = map.get(key)!;
        e.players += s.players;
        e.revenue += s.revenue;
        e.sessions += 1;
        e.fillRate += s.fillRate;
        e.noShows += s.noShows;
        e.count++;
      }
      return [...map.entries()].map(([, v]) => ({
        ...v,
        fillRate: v.count > 0 ? Math.round((v.fillRate / v.count) * 10) / 10 : 0,
        revenuePerPlayer: v.players > 0 ? Math.round(v.revenue / v.players) : 0,
      })).sort((a, b) => a.label.localeCompare(b.label));
    };
    return groupBy(source, drillLevel);
  }, [data, hasFilter, filteredSessionStats, drillLevel]);

  const clubBreakdown = useMemo(() => {
    if (!data?.clubStats) return [];
    if (!hasFilter) return data.clubStats;
    const clubRevMap = new Map<number, { id: number; name: string; sessions: number; players: number; revenue: number }>();
    for (const s of filteredSessionStats) {
      if (!clubRevMap.has(s.clubId)) clubRevMap.set(s.clubId, { id: s.clubId, name: s.clubName, sessions: 0, players: 0, revenue: 0 });
      const e = clubRevMap.get(s.clubId)!;
      e.sessions++;
      e.players += s.players;
      e.revenue += s.revenue;
    }
    return [...clubRevMap.values()];
  }, [data, hasFilter, filteredSessionStats]);

  const weekdayBreakdown = useMemo(() => {
    const source = hasFilter ? filteredSessionStats : data?.sessionStats || [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((name, i) => {
      const daySess = source.filter((s: any) => new Date(s.date).getDay() === i);
      return {
        day: i, dayName: name,
        sessions: daySess.length,
        players: daySess.reduce((s: number, ss: any) => s + ss.players, 0),
        revenue: daySess.reduce((s: number, ss: any) => s + ss.revenue, 0),
        avgPlayers: daySess.length > 0 ? Math.round((daySess.reduce((s: number, ss: any) => s + ss.players, 0) / daySess.length) * 10) / 10 : 0,
      };
    });
  }, [data, hasFilter, filteredSessionStats]);

  const sessionBreakdown = useMemo(() => {
    const source = hasFilter ? filteredSessionStats : data?.sessionStats || [];
    const titleMap = new Map<string, { title: string; sessions: number; players: number; revenue: number; avgFillRate: number }>();
    for (const s of source) {
      const key = s.title || "Untitled";
      if (!titleMap.has(key)) titleMap.set(key, { title: key, sessions: 0, players: 0, revenue: 0, avgFillRate: 0 });
      const e = titleMap.get(key)!;
      e.sessions++;
      e.players += s.players;
      e.revenue += s.revenue;
      e.avgFillRate += s.fillRate;
    }
    return [...titleMap.values()].map(v => ({ ...v, avgFillRate: v.sessions > 0 ? Math.round((v.avgFillRate / v.sessions) * 10) / 10 : 0 })).sort((a, b) => b.revenue - a.revenue);
  }, [data, hasFilter, filteredSessionStats]);

  const filteredPlayers = useMemo(() => {
    if (!data?.playerStats) return [];
    let players = data.playerStats;
    if (hasFilter && activeFilter.playerId) {
      players = players.filter((p: any) => p.id === activeFilter.playerId);
    } else if (hasFilter) {
      const playerIds = new Set(filteredSignups.map((s: any) => s.playerId));
      players = players.filter((p: any) => playerIds.has(p.id));
    }
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      players = players.filter((p: any) => p.name?.toLowerCase().includes(q));
    }
    return players.slice(0, 50);
  }, [data, hasFilter, activeFilter, filteredSignups, playerSearch]);

  const handleDrillDown = useCallback((label: string) => {
    if (drillLevel === "year") {
      setDrillPath(prev => [...prev, label]);
      setDrillLevel("month");
      setActiveFilter(prev => ({ ...prev, month: label }));
    } else if (drillLevel === "month") {
      setDrillPath(prev => [...prev, label]);
      setDrillLevel("week");
      setActiveFilter(prev => ({ ...prev, month: label }));
    } else if (drillLevel === "week") {
      setDrillPath(prev => [...prev, label]);
      setDrillLevel("day");
    }
  }, [drillLevel]);

  const handleDrillUp = useCallback(() => {
    const levels: DrillLevel[] = ["year", "month", "week", "day"];
    const idx = levels.indexOf(drillLevel);
    if (idx > 0) {
      setDrillLevel(levels[idx - 1]);
      setDrillPath(prev => prev.slice(0, -1));
      if (drillLevel === "month" || drillLevel === "week") {
        setActiveFilter(prev => {
          const next = { ...prev };
          delete next.month;
          return next;
        });
      }
    }
  }, [drillLevel]);

  const toggleMetric = useCallback((metric: string) => {
    setEnabledMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) { if (next.size > 1) next.delete(metric); }
      else next.add(metric);
      return next;
    });
  }, []);

  const penceToGBP = (p: number) => +(p / 100).toFixed(2);
  const aiMutation = useMutation({
    mutationFn: async (question?: string) => {
      const kpisForAI = kpis ? {
        totalSessions: kpis.totalSessions, totalSignups: kpis.totalPlayers,
        totalRevenue_GBP: penceToGBP(kpis.totalRevenue), paidRevenue_GBP: penceToGBP(kpis.paidRevenue),
        avgPlayersPerSession: kpis.avgPlayersPerSession, fillRatePercent: kpis.fillRate, noShowRatePercent: kpis.noShowRate,
      } : null;
      const filterContext = hasFilter ? `Active filters: ${JSON.stringify(activeFilter)}` : "No filters active (showing all data)";
      const body: any = {
        kpis: kpisForAI,
        topSessions: sessionBreakdown.slice(0, 5).map(s => ({ title: s.title, sessions: s.sessions, revenue_GBP: penceToGBP(s.revenue), avgFillRate: s.avgFillRate })),
        bottomSessions: sessionBreakdown.slice(-5).map(s => ({ title: s.title, sessions: s.sessions, revenue_GBP: penceToGBP(s.revenue), avgFillRate: s.avgFillRate })),
        clubStats: clubBreakdown.map((c: any) => ({ name: c.name, sessions: c.sessions, players: c.players, revenue_GBP: penceToGBP(c.revenue) })),
        weekdayStats: weekdayBreakdown.filter(w => w.sessions > 0).map(w => ({ day: w.dayName, sessions: w.sessions, avgPlayers: w.avgPlayers, revenue_GBP: penceToGBP(w.revenue) })),
        filterContext,
      };
      if (question) body.question = question;
      const res = await apiRequest("POST", "/api/dashboard/analytics/ai-insights", body);
      return res.json();
    },
  });

  const tooltipStyle = { fontSize: 11, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 };

  const metricConfig: Record<string, { color: string; label: string; yAxisId: string; formatter?: (v: number) => string }> = {
    players: { color: "#3b82f6", label: "Players", yAxisId: "left" },
    revenue: { color: "#10b981", label: "Revenue", yAxisId: "right", formatter: formatPence },
    sessions: { color: "#f59e0b", label: "Sessions", yAxisId: "left" },
    fillRate: { color: "#8b5cf6", label: "Fill Rate %", yAxisId: "left" },
    noShows: { color: "#ef4444", label: "No-Shows", yAxisId: "left" },
    revenuePerPlayer: { color: "#06b6d4", label: "Rev/Player", yAxisId: "right", formatter: formatPence },
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-background overflow-auto p-4"
    : "space-y-4";

  return (
    <div className={containerClass} data-testid="interactive-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-foreground">Interactive Performance Dashboard</h2>
          {hasFilter && (
            <div className="flex items-center gap-1 flex-wrap">
              {activeFilter.playerName && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-player">
                  <User className="h-3 w-3" /> {activeFilter.playerName}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("playerId")} />
                </Badge>
              )}
              {activeFilter.sessionTitle && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-session">
                  <Calendar className="h-3 w-3" /> {activeFilter.sessionTitle}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("sessionTitle")} />
                </Badge>
              )}
              {activeFilter.clubName && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-club">
                  <Building2 className="h-3 w-3" /> {activeFilter.clubName}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("clubId")} />
                </Badge>
              )}
              {activeFilter.month && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-month">
                  <Calendar className="h-3 w-3" /> {activeFilter.month}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("month")} />
                </Badge>
              )}
              {activeFilter.weekdayName && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-weekday">
                  <Clock className="h-3 w-3" /> {activeFilter.weekdayName}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("weekday")} />
                </Badge>
              )}
              {activeFilter.timeOfDay && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="filter-badge-time">
                  <Clock className="h-3 w-3" /> {activeFilter.timeOfDay}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilterKey("timeOfDay")} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-500" onClick={clearFilter} data-testid="button-clear-filters">
                Clear All
              </Button>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setIsFullscreen(!isFullscreen)} data-testid="button-fullscreen">
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" data-testid="interactive-kpis">
        <MiniKpi label="Sessions" value={kpis?.totalSessions || 0} icon={Calendar} />
        <MiniKpi label="Signups" value={kpis?.totalPlayers || 0} icon={Users} />
        <MiniKpi label="Revenue" value={formatPence(kpis?.totalRevenue || 0)} icon={DollarSign} />
        <MiniKpi label="Rev/Session" value={formatPence(kpis?.revenuePerSession || 0)} icon={DollarSign} />
        <MiniKpi label="Avg Players" value={kpis?.avgPlayersPerSession || 0} icon={Users} />
        <MiniKpi label="Fill Rate" value={`${kpis?.fillRate || 0}%`} icon={Target} />
        <MiniKpi label="No-Show" value={`${kpis?.noShowRate || 0}%`} icon={Activity} />
      </div>

      <Card data-testid="master-chart">
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Multi-Metric Analysis</CardTitle>
              <div className="flex items-center gap-1">
                {drillPath.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleDrillUp} data-testid="button-drill-up">
                    ← Back
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px]">{drillLevel}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {(["year", "month", "week", "day"] as DrillLevel[]).map(level => (
                <Button
                  key={level}
                  variant={drillLevel === level ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => { setDrillLevel(level); setDrillPath([]); }}
                  data-testid={`button-drill-${level}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              {Object.entries(metricConfig).map(([key, cfg]) => (
                <Button
                  key={key}
                  variant={enabledMetrics.has(key) ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  style={enabledMetrics.has(key) ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
                  onClick={() => toggleMetric(key)}
                  data-testid={`toggle-metric-${key}`}
                >
                  {cfg.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={masterChartData} onClick={(e: any) => { if (e?.activeLabel && drillLevel !== "day") handleDrillDown(e.activeLabel); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.length > 7 ? v.slice(5) : v} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={(v: number) => formatPenceShort(v)} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    const cfg = Object.values(metricConfig).find(c => c.label === name);
                    return cfg?.formatter ? cfg.formatter(value) : value;
                  }}
                  labelFormatter={(label: string) => `Period: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {enabledMetrics.has("players") && <Bar yAxisId="left" dataKey="players" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Players" opacity={0.8} />}
                {enabledMetrics.has("sessions") && <Bar yAxisId="left" dataKey="sessions" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Sessions" opacity={0.8} />}
                {enabledMetrics.has("noShows") && <Bar yAxisId="left" dataKey="noShows" fill="#ef4444" radius={[3, 3, 0, 0]} name="No-Shows" opacity={0.8} />}
                {enabledMetrics.has("revenue") && <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />}
                {enabledMetrics.has("fillRate") && <Line yAxisId="left" type="monotone" dataKey="fillRate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Fill Rate %" />}
                {enabledMetrics.has("revenuePerPlayer") && <Line yAxisId="right" type="monotone" dataKey="revenuePerPlayer" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Rev/Player" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {drillLevel !== "day" && (
            <p className="text-[10px] text-muted-foreground text-center mt-1">Click a bar to drill down into that period</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card data-testid="chart-club-interactive">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs">Club Performance</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clubBreakdown} onClick={(e: any) => {
                  if (e?.activePayload?.[0]?.payload) {
                    const club = e.activePayload[0].payload;
                    setActiveFilter(prev => ({ ...prev, clubId: club.id, clubName: club.name }));
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Revenue" ? formatPence(v) : v} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="players" fill="#3b82f6" name="Players" radius={[3, 3, 0, 0]} cursor="pointer" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[3, 3, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-weekday-interactive">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs">Weekday Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayBreakdown} onClick={(e: any) => {
                  if (e?.activePayload?.[0]?.payload) {
                    const wd = e.activePayload[0].payload;
                    setActiveFilter(prev => ({ ...prev, weekday: wd.day, weekdayName: wd.dayName }));
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="dayName" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="avgPlayers" fill="#8b5cf6" name="Avg Players" radius={[3, 3, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-session-interactive">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs">Session Rankings</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionBreakdown.slice(0, 6)} layout="vertical" onClick={(e: any) => {
                  if (e?.activePayload?.[0]?.payload) {
                    const sess = e.activePayload[0].payload;
                    setActiveFilter(prev => ({ ...prev, sessionTitle: sess.title }));
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v: number) => formatPenceShort(v)} />
                  <YAxis dataKey="title" type="category" width={90} tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPence(v)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 3, 3, 0]} name="Revenue" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card data-testid="player-list-interactive">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs">Player Analysis</CardTitle>
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="pl-7 h-7 text-[11px] w-36"
                  data-testid="input-player-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Player</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Sessions</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Attend%</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">No-Show</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p: any) => (
                    <tr
                      key={p.id}
                      className={`border-b border-border/20 cursor-pointer transition-colors ${activeFilter.playerId === p.id ? "bg-primary/10" : "hover:bg-muted/40"}`}
                      onClick={() => setActiveFilter(prev => prev.playerId === p.id ? (() => { const n = { ...prev }; delete n.playerId; delete n.playerName; return n; })() : { ...prev, playerId: p.id, playerName: p.name })}
                      data-testid={`player-row-${p.id}`}
                    >
                      <td className="py-1.5 px-2 font-medium truncate max-w-[120px]">{p.name}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{p.sessions}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{formatPence(p.revenue)}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{p.attendanceRate}%</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{p.noShows}</td>
                    </tr>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No players found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="session-detail-interactive">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Session</th>
                    <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground">Club</th>
                    <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground">Date</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Players</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-muted-foreground">Fill%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessionStats.slice(0, 30).map((s: any) => (
                    <tr
                      key={`${s.id}-${s.date}`}
                      className={`border-b border-border/20 cursor-pointer transition-colors ${activeFilter.sessionTitle === s.title ? "bg-primary/10" : "hover:bg-muted/40"}`}
                      onClick={() => setActiveFilter(prev => prev.sessionTitle === s.title ? (() => { const n = { ...prev }; delete n.sessionTitle; return n; })() : { ...prev, sessionTitle: s.title })}
                      data-testid={`session-row-${s.id}`}
                    >
                      <td className="py-1.5 px-2 font-medium truncate max-w-[110px]">{s.title}</td>
                      <td className="py-1.5 px-1 text-muted-foreground truncate max-w-[80px]">{s.clubName}</td>
                      <td className="py-1.5 px-1 text-muted-foreground tabular-nums">{new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{s.players}/{s.maxPlayers}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{formatPence(s.revenue)}</td>
                      <td className="py-1.5 px-1 text-right tabular-nums">{s.fillRate}%</td>
                    </tr>
                  ))}
                  {filteredSessionStats.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-muted-foreground text-xs">No sessions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeFilter.playerId && (
        <Card className="border-blue-500/30" data-testid="player-detail-card">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-blue-500" />
              Player Profile: {activeFilter.playerName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const p = data?.playerStats?.find((ps: any) => ps.id === activeFilter.playerId);
              if (!p) return <p className="text-xs text-muted-foreground">No data</p>;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{p.sessions}</div>
                    <div className="text-[10px] text-muted-foreground">Sessions</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{formatPence(p.revenue)}</div>
                    <div className="text-[10px] text-muted-foreground">Total Spent</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{p.attendanceRate}%</div>
                    <div className="text-[10px] text-muted-foreground">Attendance</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{p.noShows}</div>
                    <div className="text-[10px] text-muted-foreground">No-Shows</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{p.clubs.length}</div>
                    <div className="text-[10px] text-muted-foreground">Clubs</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold">{p.sessionTitles.length}</div>
                    <div className="text-[10px] text-muted-foreground">Session Types</div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <Card data-testid="ai-insights-interactive">
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-violet-500" />
              AI Insights {hasFilter && <Badge variant="outline" className="text-[9px]">Filtered View</Badge>}
            </CardTitle>
            <Button
              variant="default" size="sm" className="h-6 text-[10px]"
              onClick={() => aiMutation.mutate(undefined)}
              disabled={aiMutation.isPending}
              data-testid="button-ai-report-interactive"
            >
              {aiMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
              Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Ask about the filtered data..."
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && aiQuestion.trim() && aiMutation.mutate(aiQuestion.trim())}
              className="text-xs h-8"
              data-testid="input-ai-question-interactive"
            />
            <Button variant="outline" size="sm" className="h-8" onClick={() => aiQuestion.trim() && aiMutation.mutate(aiQuestion.trim())} disabled={aiMutation.isPending || !aiQuestion.trim()} data-testid="button-ask-ai-interactive">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          {aiMutation.isPending && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span className="ml-2 text-xs text-muted-foreground">Analyzing...</span>
            </div>
          )}
          {aiMutation.data?.report && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-[300px] overflow-y-auto">
              <AIReportRenderer content={aiMutation.data.report} />
            </div>
          )}
          {!aiMutation.data && !aiMutation.isPending && (
            <div className="text-center py-4 text-muted-foreground text-xs">
              Generate a report based on {hasFilter ? "your current filters" : "all data"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniKpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="bg-card border rounded-lg p-2.5 text-center" data-testid={`mini-kpi-${label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
      <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
      <div className="text-sm font-bold text-foreground truncate">{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function AIReportRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-xs font-bold mt-3 mb-1 text-foreground">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold mt-2 mb-1 text-foreground">{line.slice(4)}</h4>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-sm font-bold mt-3 mb-1.5 text-foreground">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 text-foreground/80">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-foreground/80 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i} className="text-foreground/80">{line}</p>;
      })}
    </div>
  );
}
