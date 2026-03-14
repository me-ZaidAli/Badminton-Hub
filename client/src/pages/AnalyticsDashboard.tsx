import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, Users, DollarSign, Calendar, BarChart3, AlertTriangle, Brain, Search, Download, Send, Clock, Building2, Target, Activity, Zap, PieChart, ArrowUpRight, ArrowDownRight, Minus, LayoutDashboard } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import InteractiveDashboard from "@/components/InteractiveDashboard";
import CommandCenterDashboard from "@/components/CommandCenterDashboard";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatPenceShort(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`;
  return `£${(pence / 100).toFixed(0)}`;
}

type DatePreset = "7d" | "30d" | "thisMonth" | "thisYear" | "all" | "custom";

export default function AnalyticsDashboard() {
  const { data: user } = useUser();
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [timeOfDayFilter, setTimeOfDayFilter] = useState("all");
  const [weekdayFilter, setWeekdayFilter] = useState("all");
  const [activeChartTab, setActiveChartTab] = useState("attendance");
  const [revenueView, setRevenueView] = useState("daily");
  const [aiQuestion, setAiQuestion] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(0);
  const [sessionSort, setSessionSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });
  const [dashboardView, setDashboardView] = useState<"classic" | "interactive" | "command">("interactive");

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "7d": return { from: new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "30d": return { from: new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "thisMonth": return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: now.toISOString().split("T")[0] };
      case "thisYear": return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().split("T")[0] };
      case "custom": return { from: customFrom, to: customTo };
      default: return { from: "", to: "" };
    }
  }, [datePreset, customFrom, customTo]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    if (clubFilter !== "all") params.set("clubId", clubFilter);
    if (sessionFilter !== "all") params.set("sessionId", sessionFilter);
    if (timeOfDayFilter !== "all") params.set("timeOfDay", timeOfDayFilter);
    if (weekdayFilter !== "all") params.set("weekday", weekdayFilter);
    return params.toString();
  }, [dateRange, clubFilter, sessionFilter, timeOfDayFilter, weekdayFilter]);

  const { data, isLoading, isError, error } = useQuery<any>({
    queryKey: ["/api/dashboard/analytics", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/analytics?${queryParams}`, { credentials: "include" });
      if (res.status === 403) throw new Error("Access denied. Admin access with a Premium plan is required.");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const aiMutation = useMutation({
    mutationFn: async (question?: string) => {
      const penceToGBP = (p: number) => +(p / 100).toFixed(2);
      const kpisForAI = data?.kpis ? {
        totalSessions: data.kpis.totalSessions,
        totalUniquePlayerSignups: data.kpis.totalPlayers,
        totalRevenue_GBP: penceToGBP(data.kpis.totalRevenue),
        paidRevenue_GBP: penceToGBP(data.kpis.paidRevenue),
        avgPlayersPerSession: data.kpis.avgPlayersPerSession,
        revenuePerSession_GBP: penceToGBP(data.kpis.revenuePerSession),
        revenuePerPlayer_GBP: penceToGBP(data.kpis.revenuePerPlayer),
        fillRatePercent: data.kpis.fillRate,
        noShowRatePercent: data.kpis.noShowRate,
        totalNoShows: data.kpis.noShows,
        mostPopularClub: data.kpis.mostPopularClub,
        mostProfitableSession: data.kpis.mostProfitableSession ? { title: data.kpis.mostProfitableSession.title, revenue_GBP: penceToGBP(data.kpis.mostProfitableSession.revenue) } : null,
      } : null;
      const topForAI = data?.sessionRankings?.slice(0, 5).map((s: any) => ({ title: s.title, avgPlayers: s.avgPlayers, totalRevenue_GBP: penceToGBP(s.totalRevenue), avgFillRatePercent: s.avgFillRate, sessionsHeld: s.count }));
      const bottomForAI = data?.sessionRankings?.slice(-5).map((s: any) => ({ title: s.title, avgPlayers: s.avgPlayers, totalRevenue_GBP: penceToGBP(s.totalRevenue), avgFillRatePercent: s.avgFillRate, sessionsHeld: s.count }));
      const clubsForAI = data?.clubStats?.map((c: any) => ({ name: c.name, sessions: c.sessions, playerSignups: c.players, revenue_GBP: penceToGBP(c.revenue), fillRatePercent: c.fillRate }));
      const weekdayForAI = data?.weekdayStats?.map((w: any) => ({ day: w.dayName, sessions: w.sessions, avgPlayers: w.avgPlayers, totalRevenue_GBP: penceToGBP(w.totalRevenue) }));
      const timeForAI = data?.timeOfDayStats?.map((t: any) => ({ slot: t.label, sessions: t.sessions, avgPlayers: t.avgPlayers, totalRevenue_GBP: penceToGBP(t.totalRevenue) }));
      const seasonForAI = data?.seasonalityData?.map((s: any) => ({ month: s.month, sessions: s.sessions, players: s.players, revenue_GBP: penceToGBP(s.revenue) }));
      const body: any = {
        kpis: kpisForAI,
        topSessions: topForAI,
        bottomSessions: bottomForAI,
        weekdayStats: weekdayForAI,
        timeOfDayStats: timeForAI,
        clubStats: clubsForAI,
        alerts: data?.alerts,
        seasonality: seasonForAI,
        churn: data?.churn,
      };
      if (question) body.question = question;
      const res = await apiRequest("POST", "/api/dashboard/analytics/ai-insights", body);
      return res.json();
    },
  });

  const sortedSessionStats = useMemo(() => {
    if (!data?.sessionStats) return [];
    let items = [...data.sessionStats];
    if (sessionSearch) {
      const q = sessionSearch.toLowerCase();
      items = items.filter((s: any) => s.title?.toLowerCase().includes(q) || s.clubName?.toLowerCase().includes(q));
    }
    items.sort((a: any, b: any) => {
      const aVal = a[sessionSort.key] ?? 0;
      const bVal = b[sessionSort.key] ?? 0;
      return sessionSort.dir === "asc" ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
    return items;
  }, [data?.sessionStats, sessionSearch, sessionSort]);

  const revenueChartData = useMemo(() => {
    if (!data?.attendanceTrend) return [];
    if (revenueView === "daily") return data.attendanceTrend;
    if (revenueView === "weekly") {
      const weeks = new Map<string, { week: string; revenue: number; players: number; sessions: number }>();
      for (const d of data.attendanceTrend) {
        const dt = new Date(d.date);
        const weekStart = new Date(dt.getTime() - dt.getDay() * 86400000);
        const key = weekStart.toISOString().split("T")[0];
        if (!weeks.has(key)) weeks.set(key, { week: key, revenue: 0, players: 0, sessions: 0 });
        const entry = weeks.get(key)!;
        entry.revenue += d.revenue;
        entry.players += d.players;
        entry.sessions += d.sessions;
      }
      return [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)).map(w => ({ date: w.week, ...w }));
    }
    return data.seasonalityData?.map((d: any) => ({ date: d.month, revenue: d.revenue, players: d.players, sessions: d.sessions })) || [];
  }, [data, revenueView]);

  const handleExportCSV = () => {
    if (!data?.sessionStats) return;
    const headers = ["Session,Club,Date,Players,Max Players,Fill Rate,Revenue,Revenue/Player,No Shows"];
    const rows = data.sessionStats.map((s: any) =>
      `"${s.title}","${s.clubName}",${new Date(s.date).toLocaleDateString()},${s.players},${s.maxPlayers},${s.fillRate}%,${formatPence(s.revenue)},${formatPence(s.revenuePerPlayer)},${s.noShows}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!user) return null;

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 pb-12" data-testid="analytics-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Business intelligence and performance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant={dashboardView === "interactive" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5 rounded-md"
              onClick={() => setDashboardView("interactive")}
              data-testid="button-view-interactive"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Interactive
            </Button>
            <Button
              variant={dashboardView === "command" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5 rounded-md"
              onClick={() => setDashboardView("command")}
              data-testid="button-view-command"
            >
              <Zap className="h-3.5 w-3.5" />
              Command Center
            </Button>
            <Button
              variant={dashboardView === "classic" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5 rounded-md"
              onClick={() => setDashboardView("classic")}
              data-testid="button-view-classic"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Classic
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card data-testid="filter-panel">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger data-testid="select-date-range"><SelectValue placeholder="Date range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger data-testid="select-club"><SelectValue placeholder="Club" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {data?.clubs?.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeOfDayFilter} onValueChange={setTimeOfDayFilter}>
              <SelectTrigger data-testid="select-time"><SelectValue placeholder="Time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>

            <Select value={weekdayFilter} onValueChange={setWeekdayFilter}>
              <SelectTrigger data-testid="select-weekday"><SelectValue placeholder="Day" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
                <SelectItem value="0">Sunday</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger data-testid="select-session"><SelectValue placeholder="Session" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {data?.sessionList?.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {datePreset === "custom" && (
              <div className="flex gap-2 col-span-2 sm:col-span-1">
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="text-xs" data-testid="input-from-date" />
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="text-xs" data-testid="input-to-date" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </div>
      ) : isError ? (
        <Card className="border-red-500/30">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">{(error as Error)?.message || "Failed to load analytics"}</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure you have admin access and the club has a Premium plan.</p>
          </CardContent>
        </Card>
      ) : !data ? (
        <div className="text-center py-20 text-muted-foreground">No data available</div>
      ) : dashboardView === "interactive" ? (
        <InteractiveDashboard data={data} />
      ) : dashboardView === "command" ? (
        <CommandCenterDashboard data={data} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="kpi-cards">
            <KpiCard icon={Calendar} label="Sessions" value={kpis?.totalSessions || 0} color="blue" />
            <KpiCard icon={Users} label="Confirmed Signups" value={kpis?.totalPlayers || 0} color="green" />
            <KpiCard icon={DollarSign} label="Revenue" value={formatPence(kpis?.totalRevenue || 0)} color="emerald" />
            <KpiCard icon={Users} label="Avg Players/Session" value={kpis?.avgPlayersPerSession || 0} color="violet" />
            <KpiCard icon={DollarSign} label="Rev/Session" value={formatPence(kpis?.revenuePerSession || 0)} color="amber" />
            <KpiCard icon={DollarSign} label="Rev/Player" value={formatPence(kpis?.revenuePerPlayer || 0)} color="orange" />
            <KpiCard icon={Target} label="Fill Rate" value={`${kpis?.fillRate || 0}%`} color={kpis?.fillRate > 70 ? "green" : "amber"} />
            <KpiCard icon={AlertTriangle} label="No-Show Rate" value={`${kpis?.noShowRate || 0}%`} color={kpis?.noShowRate > 20 ? "red" : "green"} />
            <KpiCard icon={Building2} label="Top Club" value={kpis?.mostPopularClub?.name || "N/A"} subtitle={kpis?.mostPopularClub ? `${kpis.mostPopularClub.players} players` : undefined} color="blue" />
            <KpiCard icon={Zap} label="Top Session" value={kpis?.mostProfitableSession?.title || "N/A"} subtitle={kpis?.mostProfitableSession ? formatPence(kpis.mostProfitableSession.revenue) : undefined} color="emerald" />
          </div>

          {data.alerts?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" data-testid="alerts-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Smart Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {data.alerts.map((alert: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant={alert.severity === "warning" ? "destructive" : "secondary"} className="text-[10px] mt-0.5 shrink-0">
                      {alert.severity === "warning" ? "Warning" : "Info"}
                    </Badge>
                    <span className="text-foreground/80">{alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-attendance">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Attendance & Revenue Trends</CardTitle>
                  <Tabs value={activeChartTab} onValueChange={setActiveChartTab}>
                    <TabsList className="h-7">
                      <TabsTrigger value="attendance" className="text-xs px-2 h-6">Players</TabsTrigger>
                      <TabsTrigger value="revenue" className="text-xs px-2 h-6">Revenue</TabsTrigger>
                      <TabsTrigger value="sessions" className="text-xs px-2 h-6">Sessions</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.attendanceTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={activeChartTab === "revenue" ? (v: number) => formatPenceShort(v) : undefined} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                        formatter={(value: number) => activeChartTab === "revenue" ? formatPence(value) : value}
                      />
                      <Area
                        type="monotone"
                        dataKey={activeChartTab === "attendance" ? "players" : activeChartTab === "revenue" ? "revenue" : "sessions"}
                        stroke={activeChartTab === "revenue" ? "#10b981" : "#3b82f6"}
                        fill={activeChartTab === "revenue" ? "#10b98120" : "#3b82f620"}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-revenue-view">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Revenue Over Time</CardTitle>
                  <Select value={revenueView} onValueChange={setRevenueView}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatPenceShort(v)} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatPence(v)} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-popular-sessions">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Most Popular Sessions</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.sessionRankings || []).sort((a: any, b: any) => b.avgPlayers - a.avgPlayers).slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="avgPlayers" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Avg Players" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-profitable-sessions">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Most Profitable Sessions</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.sessionRankings || []).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatPenceShort(v)} />
                      <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatPence(v)} />
                      <Bar dataKey="totalRevenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card data-testid="chart-time-of-day">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance by Time of Day</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeOfDayStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="avgPlayers" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Players" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-weekday">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Weekday Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.weekdayStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatPenceShort(v)} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar yAxisId="left" dataKey="avgPlayers" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Players" />
                      <Line yAxisId="right" type="monotone" dataKey="totalRevenue" stroke="#10b981" strokeWidth={2} name="Revenue" dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-capacity">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Capacity Utilization</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.capacityUtilization || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-club-comparison">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Club Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {(data.clubStats?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.clubStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="players" fill="#10b981" name="Players" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No club data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-player-retention">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Player Retention & Frequency</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 h-[260px]">
                  <div className="h-full">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Retention</p>
                    <ResponsiveContainer width="100%" height="85%">
                      <RPieChart>
                        <Pie
                          data={[
                            { name: "New", value: data.playerRetention?.newPlayers || 0 },
                            { name: "Returning", value: data.playerRetention?.returningPlayers || 0 },
                            { name: "Frequent", value: data.playerRetention?.frequentPlayers || 0 },
                          ]}
                          cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={2} dataKey="value"
                        >
                          {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-full">
                    <p className="text-xs text-muted-foreground mb-2 text-center">Attendance Frequency</p>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={[
                        { range: "1", count: data.playerFrequency?.one || 0 },
                        { range: "2-5", count: data.playerFrequency?.twoToFive || 0 },
                        { range: "5-10", count: data.playerFrequency?.fiveToTen || 0 },
                        { range: "10+", count: data.playerFrequency?.tenPlus || 0 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Players" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card data-testid="chart-noshow-weekday">
              <CardHeader className="pb-2"><CardTitle className="text-sm">No-Shows by Weekday</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.noShowByWeekday || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="noShows" fill="#ef4444" radius={[4, 4, 0, 0]} name="No-Shows" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-seasonality">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Seasonality (Monthly Trends)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.seasonalityData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="players" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Players" />
                      <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Sessions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-churn">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Player Churn & Loyalty</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  <ChurnBar label="Loyal Players" value={data.churn?.loyalPlayers || 0} max={Math.max(data.churn?.loyalPlayers || 0, data.churn?.decliningPlayers || 0, data.churn?.churnedPlayers || 0, 1)} color="bg-emerald-500" />
                  <ChurnBar label="Declining" value={data.churn?.decliningPlayers || 0} max={Math.max(data.churn?.loyalPlayers || 0, data.churn?.decliningPlayers || 0, data.churn?.churnedPlayers || 0, 1)} color="bg-amber-500" />
                  <ChurnBar label="Churned (60d+)" value={data.churn?.churnedPlayers || 0} max={Math.max(data.churn?.loyalPlayers || 0, data.churn?.decliningPlayers || 0, data.churn?.churnedPlayers || 0, 1)} color="bg-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {data.demandSuggestions?.length > 0 && (
            <Card data-testid="demand-suggestions">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Demand & Scheduling Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.demandSuggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowUpRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <span className="text-foreground/80">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card data-testid="session-table">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm">Session Performance Table</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search sessions..."
                      value={sessionSearch}
                      onChange={e => { setSessionSearch(e.target.value); setSessionPage(0); }}
                      className="pl-8 h-8 text-xs w-48"
                      data-testid="input-session-search"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="table-sessions">
                  <thead>
                    <tr className="border-b border-border/50">
                      {[
                        { key: "title", label: "Session" },
                        { key: "clubName", label: "Club" },
                        { key: "date", label: "Date" },
                        { key: "players", label: "Players" },
                        { key: "fillRate", label: "Fill Rate" },
                        { key: "revenue", label: "Revenue" },
                        { key: "revenuePerPlayer", label: "Rev/Player" },
                        { key: "noShows", label: "No-Shows" },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="text-left py-2 px-2 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => setSessionSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "desc" ? "asc" : "desc" }))}
                          data-testid={`th-${col.key}`}
                        >
                          {col.label}
                          {sessionSort.key === col.key && (
                            <span className="ml-1">{sessionSort.dir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSessionStats.slice(sessionPage * 20, (sessionPage + 1) * 20).map((s: any) => (
                      <tr key={`${s.id}-${s.date}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2 font-medium max-w-[160px] truncate">{s.title}</td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[100px] truncate">{s.clubName}</td>
                        <td className="py-2 px-2 text-muted-foreground tabular-nums">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="py-2 px-2 tabular-nums">{s.players}/{s.maxPlayers}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${s.fillRate > 80 ? "bg-emerald-500" : s.fillRate > 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, s.fillRate)}%` }} />
                            </div>
                            <span className="tabular-nums">{s.fillRate}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 tabular-nums font-medium">{formatPence(s.revenue)}</td>
                        <td className="py-2 px-2 tabular-nums">{formatPence(s.revenuePerPlayer)}</td>
                        <td className="py-2 px-2 tabular-nums">{s.noShows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedSessionStats.length > 20 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    Showing {sessionPage * 20 + 1}-{Math.min((sessionPage + 1) * 20, sortedSessionStats.length)} of {sortedSessionStats.length}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={sessionPage === 0} onClick={() => setSessionPage(p => p - 1)} data-testid="button-prev-page">Prev</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(sessionPage + 1) * 20 >= sortedSessionStats.length} onClick={() => setSessionPage(p => p + 1)} data-testid="button-next-page">Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="ai-insights">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  AI Insights & Analysis
                </CardTitle>
                <Button
                  variant="default" size="sm" className="h-7 text-xs"
                  onClick={() => aiMutation.mutate(undefined)}
                  disabled={aiMutation.isPending}
                  data-testid="button-generate-report"
                >
                  {aiMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Brain className="h-3 w-3 mr-1.5" />}
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Ask a question about your data..."
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && aiQuestion.trim() && aiMutation.mutate(aiQuestion.trim())}
                  className="text-sm"
                  data-testid="input-ai-question"
                />
                <Button
                  variant="outline" size="sm"
                  onClick={() => aiQuestion.trim() && aiMutation.mutate(aiQuestion.trim())}
                  disabled={aiMutation.isPending || !aiQuestion.trim()}
                  data-testid="button-ask-ai"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {aiMutation.isPending && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                  <span className="ml-2 text-sm text-muted-foreground">Analyzing your data...</span>
                </div>
              )}

              {aiMutation.data?.report && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <AIReportRenderer content={aiMutation.data.report} />
                </div>
              )}

              {!aiMutation.data && !aiMutation.isPending && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Click "Generate Report" for a comprehensive AI analysis, or ask a specific question about your data.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, color }: { icon: any; label: string; value: string | number; subtitle?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-emerald-500 bg-emerald-500/10",
    emerald: "text-emerald-600 bg-emerald-600/10",
    violet: "text-violet-500 bg-violet-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    red: "text-red-500 bg-red-500/10",
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className="overflow-hidden" data-testid={`kpi-${label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`p-1.5 rounded-md ${c}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-lg font-bold text-foreground truncate" title={String(value)}>{value}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function ChurnBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AIReportRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold mt-4 mb-1 text-foreground">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.slice(4)}</h4>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 text-foreground/80">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-foreground/80 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-foreground/80">{line}</p>;
      })}
    </div>
  );
}
